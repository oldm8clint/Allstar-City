// Headless client for testing Allstar-City against a running server.
//
// It logs in like the web client (Client-TS, revision 289 protocol), records game messages,
// interfaces, inventories and stats, and can send the client packets our tests need. Run test
// files with the engine's tsx:
//   cd engine && npx tsx ../allstar/tests/<file>.ts
// The server address defaults to this checkout's engine/.env (NODE_PORT, WEB_PORT); BOT_HOST,
// BOT_PORT and BOT_WEB_PORT or the connect() options override it.
import crypto from 'crypto';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

import Isaac from '../../engine/src/io/Isaac.js';
import Packet from '../../engine/src/io/Packet.js';
import ClientGameProt from '../../engine/src/network/game/client/ClientGameProt.js';
import ServerGameProt from '../../engine/src/network/game/server/ServerGameProt.js';
import ServerGameZoneProt from '../../engine/src/network/game/server/ServerGameZoneProt.js';

const ENGINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../engine');
const REVISION = 289;

// NODE_PORT and WEB_PORT from engine/.env, so tests reach the server of the checkout they run in
function engineEnv(): Record<string, string> {
    const env: Record<string, string> = {};
    try {
        for (const line of fs.readFileSync(path.join(ENGINE, '.env'), 'utf8').split(/\r?\n/)) {
            const match = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
            if (match) {
                env[match[1]] = match[2];
            }
        }
    } catch {
        // no .env: engine defaults
    }
    return env;
}

const ENV = engineEnv();
const DEFAULT_HOST = process.env.BOT_HOST ?? '127.0.0.1';
const DEFAULT_PORT = Number(process.env.BOT_PORT ?? ENV.NODE_PORT ?? 43594);
const DEFAULT_WEB_PORT = Number(process.env.BOT_WEB_PORT ?? ENV.WEB_PORT ?? 80);

const serverProts = new Map<number, ServerGameProt>();
// zone packets (OBJ_ADD, LOC_ADD_CHANGE, MAP_ANIM ...) can also arrive on their own after
// UPDATE_ZONE_PARTIAL_FOLLOWS
for (const value of [...Object.values(ServerGameProt), ...Object.values(ServerGameZoneProt)]) {
    if (value instanceof ServerGameProt) {
        serverProts.set(value.id, value);
    }
}
// Allstar-City combat tests: zone packets inside UPDATE_ZONE_PARTIAL_ENCLOSED
const zoneProts = new Map<number, ServerGameZoneProt>();
for (const value of Object.values(ServerGameZoneProt)) {
    if (value instanceof ServerGameZoneProt) {
        zoneProts.set(value.id, value);
    }
}

type Obj = { id: number; count: number } | null;

// Allstar-City combat tests: what the client knows about an NPC (NPC_INFO)
export interface BotNpc {
    nid: number;
    type: number;
    x: number;
    z: number;
    level: number;
    hp: number;
    maxHp: number;
    hits: { damage: number; type: number; hp: number; maxHp: number; at: number }[];
    anims: { anim: number; at: number }[];
    says: string[];
}

// another player in view (PLAYER_INFO), with the name from its appearance
export interface BotPlayer {
    pid: number;
    name: string;
    x: number;
    z: number;
}

// client direction deltas (0 = north-west ... 7 = south-east)
const DIR_X = [-1, 0, 1, -1, 1, -1, 0, 1];
const DIR_Z = [1, 1, 1, 0, 0, -1, -1, -1];

function fromBase37(value: bigint): string {
    const chars = '_abcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    while (value !== 0n) {
        out = chars[Number(value % 37n)] + out;
        value /= 37n;
    }
    return out.replace(/_/g, ' ');
}

export interface BotOptions {
    host?: string;
    port?: number;
    webPort?: number;
    username: string;
    password?: string;
}

// base37 username hash, as the client computes it for the login handshake
function toBase37(name: string): bigint {
    let hash = 0n;
    for (const c of name.toLowerCase().slice(0, 12)) {
        hash *= 37n;
        if (c >= 'a' && c <= 'z') {
            hash += BigInt(c.charCodeAt(0) - 97 + 1);
        } else if (c >= '0' && c <= '9') {
            hash += BigInt(c.charCodeAt(0) - 48 + 27);
        }
    }
    return hash;
}

function rsaEncrypt(block: Uint8Array): Uint8Array {
    const pem = fs.readFileSync(path.join(ENGINE, 'data/config/private.pem'), 'ascii');
    const jwk = crypto.createPublicKey(pem).export({ format: 'jwk' }) as { n: string; e: string };
    const big = (b64: string) => BigInt('0x' + Buffer.from(b64, 'base64url').toString('hex'));
    const n = big(jwk.n);
    const e = big(jwk.e);

    let base = BigInt('0x' + (Buffer.from(block).toString('hex') || '0'));
    let exp = e;
    let result = 1n;
    base %= n;
    while (exp > 0n) {
        if (exp & 1n) {
            result = (result * base) % n;
        }
        base = (base * base) % n;
        exp >>= 1n;
    }

    let hex = result.toString(16);
    if (hex.length % 2) {
        hex = '0' + hex;
    }
    const bytes = Buffer.from(hex, 'hex');
    // java BigInteger.toByteArray() keeps a sign byte when the top bit is set
    return bytes[0] & 0x80 ? Uint8Array.from([0, ...bytes]) : Uint8Array.from(bytes);
}

export default class Bot {
    readonly username: string;
    messages: string[] = [];
    texts = new Map<number, string>();
    invs = new Map<number, Obj[]>();
    stats: { level: number; xp: number }[] = [];
    staffModLevel = -1;
    main = -1;
    side = -1;
    chat = -1;
    overlay = -1;
    pid = -1; // this player's slot, for opPlayer on it
    tutorial = -1;
    rebootTimer = -1;
    region = { x: -1, z: -1 };
    closed = false;

    // Allstar-City combat tests
    zone = { x: -1, z: -1 };
    self = { x: -1, z: -1, level: 0 };
    npcs = new Map<number, BotNpc>();
    players = new Map<number, BotPlayer>();
    myHits: { damage: number; type: number; hp: number; at: number }[] = [];
    myAnims: { anim: number; at: number }[] = [];
    groundObjs: { id: number; count: number; x: number; z: number; at: number }[] = [];
    private zoneBase = { x: 0, z: 0 };
    private npcList: number[] = [];
    private playerList: number[] = [];
    private playerNames = new Map<number, string>();

    private socket!: net.Socket;
    private buffer = Buffer.alloc(0);
    private encryptor!: Isaac;
    private decryptor!: Isaac;
    private waiters: (() => void)[] = [];

    private constructor(username: string) {
        this.username = username;
    }

    static async connect(options: BotOptions): Promise<Bot> {
        const bot = new Bot(options.username);
        await bot.login(options);
        return bot;
    }

    private async login({ host = DEFAULT_HOST, port = DEFAULT_PORT, webPort = DEFAULT_WEB_PORT, username, password = 'test' }: BotOptions) {
        const crcs = new Uint8Array(await (await fetch(`http://${host}:${webPort}/crc${Date.now()}`)).arrayBuffer()).slice(0, 36);

        this.socket = net.connect({ host, port });
        this.socket.setNoDelay(true);
        await new Promise<void>((resolve, reject) => {
            this.socket.once('connect', resolve);
            this.socket.once('error', reject);
        });
        this.socket.on('data', data => {
            this.buffer = Buffer.concat([this.buffer, data]);
            this.wake();
        });
        this.socket.on('close', () => {
            this.closed = true;
            this.wake();
        });

        const nameHash = Number((toBase37(username) >> 16n) & 0x1fn);
        this.socket.write(Uint8Array.from([14, nameHash]));

        const hello = await this.readBytes(9);
        if (hello[8] !== 0) {
            throw new Error(`handshake refused: ${hello[8]}`);
        }
        const serverSeed = await this.readBytes(8);
        const ss = new Packet(serverSeed);
        const seedHigh = ss.g4();
        const seedLow = ss.g4();
        const seed = [Math.floor(Math.random() * 99999999), Math.floor(Math.random() * 99999999), seedHigh | 0, seedLow | 0];

        const rsa = Packet.alloc(1);
        rsa.p1(10);
        for (const s of seed) {
            rsa.p4(s);
        }
        rsa.p4(0); // uid
        rsa.pjstr(username);
        rsa.pjstr(password);
        const encrypted = rsaEncrypt(rsa.data.subarray(0, rsa.pos));

        const login = Packet.alloc(1);
        login.p1(16);
        login.p1(encrypted.length + 1 + 36 + 1 + 1 + 2);
        login.p1(255);
        login.p2(REVISION);
        login.p1(0); // high memory
        login.pdata(crcs, 0, crcs.length);
        login.p1(encrypted.length);
        login.pdata(encrypted, 0, encrypted.length);
        this.socket.write(login.data.subarray(0, login.pos));

        this.encryptor = new Isaac(seed);
        this.decryptor = new Isaac(seed.map(s => s + 50));

        const [response] = await this.readBytes(1);
        if (response !== 2) {
            throw new Error(`login failed with response ${response}`);
        }
        const [staff] = await this.readBytes(2);
        this.staffModLevel = staff;
        void this.readLoop();
    }

    // ---- inbound ----

    private wake() {
        const waiters = this.waiters;
        this.waiters = [];
        for (const wake of waiters) {
            wake();
        }
    }

    private async readBytes(count: number): Promise<Uint8Array> {
        while (this.buffer.length < count) {
            if (this.closed) {
                throw new Error('connection closed');
            }
            await new Promise<void>(resolve => this.waiters.push(resolve));
        }
        const out = Uint8Array.from(this.buffer.subarray(0, count));
        this.buffer = this.buffer.subarray(count);
        return out;
    }

    private recentProts: string[] = [];

    private async readLoop() {
        try {
            while (!this.closed) {
                const [raw] = await this.readBytes(1);
                const opcode = (raw - this.decryptor.nextInt()) & 0xff;
                const prot = serverProts.get(opcode);
                if (!prot) {
                    throw new Error(`unknown server opcode ${opcode} (after ${this.recentProts.join(' ')})`);
                }
                let length = prot.length;
                if (length === -1) {
                    length = (await this.readBytes(1))[0];
                } else if (length === -2) {
                    const b = await this.readBytes(2);
                    length = (b[0] << 8) | b[1];
                }
                this.recentProts.push(`${prot.id}:${length}`);
                if (this.recentProts.length > 8) {
                    this.recentProts.shift();
                }
                this.handle(prot, new Packet(await this.readBytes(length)), length);
                this.wake();
            }
        } catch (err) {
            if (!this.closed) {
                console.error(`[${this.username}]`, err);
                this.close();
            }
        }
    }

    private handle(prot: ServerGameProt, buf: Packet, length: number) {
        if (prot instanceof ServerGameZoneProt) {
            this.handleZone(prot, buf);
            return;
        }
        switch (prot) {
            case ServerGameProt.MESSAGE_GAME:
                this.messages.push(buf.gjstr());
                break;
            case ServerGameProt.IF_SETTEXT: {
                const com = buf.g2();
                this.texts.set(com, buf.gjstr());
                break;
            }
            case ServerGameProt.IF_OPENMAIN:
                this.main = buf.g2();
                this.side = -1;
                break;
            case ServerGameProt.IF_OPENMAIN_SIDE:
                this.main = buf.g2();
                this.side = buf.g2();
                break;
            case ServerGameProt.IF_OPENOVERLAY: {
                const com = buf.g2();
                this.overlay = com === 65535 ? -1 : com;
                break;
            }
            case ServerGameProt.UPDATE_REBOOT_TIMER:
                this.rebootTimer = buf.g2();
                break;
            case ServerGameProt.TUT_OPEN: {
                const com = buf.g2();
                this.tutorial = com === 65535 ? -1 : com;
                break;
            }
            case ServerGameProt.IF_OPENCHAT:
                this.chat = buf.g2();
                break;
            case ServerGameProt.IF_CLOSE:
                this.main = this.side = this.chat = -1;
                break;
            case ServerGameProt.UPDATE_INV_FULL: {
                if (process.env.BOT_DEBUG) console.log('full', length, Buffer.from(buf.data.subarray(0, 12)).toString('hex'));
                const com = buf.g2();
                const size = buf.g2();
                const objs: Obj[] = [];
                for (let slot = 0; slot < size; slot++) {
                    const id = buf.g2();
                    let count = buf.g1();
                    if (count === 255) {
                        count = buf.g4();
                    }
                    objs.push(id === 0 ? null : { id: id - 1, count });
                }
                this.invs.set(com, objs);
                break;
            }
            case ServerGameProt.UPDATE_INV_PARTIAL: {
                if (process.env.BOT_DEBUG) console.log('partial', length, Buffer.from(buf.data.subarray(0, length)).toString('hex'));
                const com = buf.g2();
                const objs = this.invs.get(com) ?? [];
                while (buf.pos < length) {
                    const slot = buf.gsmarts();
                    const id = buf.g2();
                    let count = buf.g1();
                    if (count === 255) {
                        count = buf.g4();
                    }
                    objs[slot] = id === 0 ? null : { id: id - 1, count };
                }
                this.invs.set(com, objs);
                break;
            }
            case ServerGameProt.UPDATE_STAT: {
                const stat = buf.g1();
                const xp = buf.g4();
                const level = buf.g1();
                this.stats[stat] = { level, xp };
                break;
            }
            case ServerGameProt.REBUILD_NORMAL: {
                // RebuildNormalEncoder: p2(zoneX), p2(zoneZ), the centre zone of the 13x13-zone build area
                const x = buf.g2();
                const z = buf.g2();
                this.region = { x, z };
                this.zone = { x, z };
                break;
            }
            case ServerGameProt.PLAYER_INFO:
                this.handlePlayerInfo(buf, length);
                break;
            case ServerGameProt.NPC_INFO:
                this.handleNpcInfo(buf, length);
                break;
            // UpdateZone*Encoder: p1(zone x), p1(zone z), relative to the build area's south-west corner
            case ServerGameProt.UPDATE_ZONE_PARTIAL_FOLLOWS: {
                const x = buf.g1();
                const z = buf.g1();
                this.setZoneBase(x, z);
                break;
            }
            case ServerGameProt.UPDATE_ZONE_FULL_FOLLOWS: {
                const x = buf.g1();
                const z = buf.g1();
                this.setZoneBase(x, z);
                const { x: bx, z: bz } = this.zoneBase;
                this.groundObjs = this.groundObjs.filter(o => o.x < bx || o.x >= bx + 8 || o.z < bz || o.z >= bz + 8);
                break;
            }
            case ServerGameProt.UPDATE_ZONE_PARTIAL_ENCLOSED: {
                const x = buf.g1();
                const z = buf.g1();
                this.setZoneBase(x, z);
                while (buf.pos < length) {
                    const zoneProt = zoneProts.get(buf.g1());
                    if (!zoneProt) {
                        break;
                    }
                    const start = buf.pos;
                    this.handleZone(zoneProt, new Packet(Uint8Array.from(buf.data.subarray(start, start + zoneProt.length))));
                    buf.pos = start + zoneProt.length;
                }
                break;
            }
            case ServerGameProt.UPDATE_PID:
                this.pid = buf.g2();
                break;
            case ServerGameProt.LOGOUT:
                this.close();
                break;
        }
    }

    // ---- zone updates: ground objects (engine/src/network/game/server/codec/Obj*Encoder.ts) ----

    private setZoneBase(localX: number, localZ: number) {
        this.zoneBase = { x: ((this.zone.x - 6) << 3) + localX, z: ((this.zone.z - 6) << 3) + localZ };
    }

    private zoneTile(coord: number) {
        return { x: this.zoneBase.x + ((coord >> 4) & 0x7), z: this.zoneBase.z + (coord & 0x7) };
    }

    // Every 289 zone packet starts with p1(coord in the zone) followed by plain p2 fields.
    private handleZone(prot: ServerGameProt, buf: Packet) {
        if (prot === ServerGameZoneProt.OBJ_ADD) {
            const tile = this.zoneTile(buf.g1());
            const id = buf.g2();
            const count = buf.g2();
            this.groundObjs.push({ id, count, ...tile, at: Date.now() });
        } else if (prot === ServerGameZoneProt.OBJ_REVEAL) {
            const tile = this.zoneTile(buf.g1());
            const id = buf.g2();
            const count = buf.g2();
            const receiver = buf.g2();
            // like the client: the player it was dropped for already has it (OBJ_ADD)
            if (receiver !== this.pid) {
                this.groundObjs.push({ id, count, ...tile, at: Date.now() });
            }
        } else if (prot === ServerGameZoneProt.OBJ_DEL) {
            const tile = this.zoneTile(buf.g1());
            const id = buf.g2();
            const i = this.groundObjs.findIndex(o => o.id === id && o.x === tile.x && o.z === tile.z);
            if (i !== -1) {
                this.groundObjs.splice(i, 1);
            }
        } else if (prot === ServerGameZoneProt.OBJ_COUNT) {
            const tile = this.zoneTile(buf.g1());
            const id = buf.g2();
            const oldCount = buf.g2();
            const newCount = buf.g2();
            const obj = this.groundObjs.find(o => o.id === id && o.x === tile.x && o.z === tile.z && o.count === oldCount);
            if (obj) {
                obj.count = newCount;
            }
        }
    }

    // ---- PLAYER_INFO / NPC_INFO (engine/src/network/rsbuf/info.ts, the web client's getPlayerPos/getNpcPos) ----

    // Entities that left the list (op 3, or past the new count after a rebuild) are forgotten unless the
    // same packet adds them again; a re-added entity keeps its object, as in the client.
    private static forget<T>(map: Map<number, T>, dropped: number[], list: number[]) {
        for (const id of dropped) {
            if (!list.includes(id)) {
                map.delete(id);
            }
        }
    }

    private handlePlayerInfo(buf: Packet, length: number) {
        buf.bitStart();
        const updates: number[] = [];
        // local player: op 0 extended info only, 1 walk, 2 run, 3 teleport (level, local x, local z, jump)
        if (buf.gBit(1) === 1) {
            const kind = buf.gBit(2);
            if (kind === 0) {
                updates.push(-1);
            } else if (kind === 1) {
                const dir = buf.gBit(3);
                this.self.x += DIR_X[dir];
                this.self.z += DIR_Z[dir];
                if (buf.gBit(1) === 1) updates.push(-1);
            } else if (kind === 2) {
                const dir1 = buf.gBit(3);
                const dir2 = buf.gBit(3);
                this.self.x += DIR_X[dir1] + DIR_X[dir2];
                this.self.z += DIR_Z[dir1] + DIR_Z[dir2];
                if (buf.gBit(1) === 1) updates.push(-1);
            } else {
                this.self.level = buf.gBit(2);
                const lx = buf.gBit(7);
                const lz = buf.gBit(7);
                buf.gBit(1); // jump
                this.self.x = ((this.zone.x - 6) << 3) + lx;
                this.self.z = ((this.zone.z - 6) << 3) + lz;
                if (buf.gBit(1) === 1) updates.push(-1);
            }
        }
        // other players already in view
        const count = buf.gBit(8);
        const list: number[] = [];
        const dropped = this.playerList.slice(count);
        for (let i = 0; i < count; i++) {
            const pid = this.playerList[i];
            const other = this.players.get(pid);
            if (buf.gBit(1) === 0) {
                list.push(pid);
                continue;
            }
            const kind = buf.gBit(2);
            if (kind === 3) {
                dropped.push(pid);
                continue;
            }
            list.push(pid);
            if (kind === 0) {
                updates.push(pid);
            } else {
                const dir1 = buf.gBit(3);
                if (other) {
                    other.x += DIR_X[dir1];
                    other.z += DIR_Z[dir1];
                }
                if (kind === 2) {
                    const dir2 = buf.gBit(3);
                    if (other) {
                        other.x += DIR_X[dir2];
                        other.z += DIR_Z[dir2];
                    }
                }
                if (buf.gBit(1) === 1) updates.push(pid);
            }
        }
        // players coming into view: pid (11), dx (5), dz (5) from this player, jump, extended info
        while (buf.bitPos + 10 < length * 8) {
            const pid = buf.gBit(11);
            if (pid === 2047) {
                break;
            }
            let dx = buf.gBit(5);
            if (dx > 15) dx -= 32;
            let dz = buf.gBit(5);
            if (dz > 15) dz -= 32;
            buf.gBit(1); // jump
            const update = buf.gBit(1);
            const other = this.players.get(pid) ?? { pid, name: this.playerNames.get(pid) ?? '', x: 0, z: 0 };
            other.x = this.self.x + dx;
            other.z = this.self.z + dz;
            this.players.set(pid, other);
            list.push(pid);
            if (update === 1) updates.push(pid);
        }
        buf.bitEnd();
        this.playerList = list;
        Bot.forget(this.players, dropped, list);

        // extended info, blocks in PlayerInfoEncoder.writeBlocks order (masks above 0xff add a byte, 0x80)
        for (const pid of updates) {
            let mask = buf.g1();
            if ((mask & 0x80) !== 0) {
                mask += buf.g1() << 8;
            }
            if (mask & 0x1) {
                // appearance: ... p8(name), p1(combat level), p2(skill level)
                const len = buf.g1();
                const bytes = Uint8Array.from(buf.data.subarray(buf.pos, buf.pos + len));
                buf.pos += len;
                if (pid !== -1 && len >= 11) {
                    const name = fromBase37(new Packet(bytes.slice(len - 11, len - 3)).g8());
                    const other = this.players.get(pid);
                    if (other) other.name = name;
                    // the engine only resends an appearance that changed: remember it like the client
                    this.playerNames.set(pid, name);
                }
            }
            if (mask & 0x2) {
                const anim = buf.g2();
                buf.g1(); // delay
                if (pid === -1) this.myAnims.push({ anim, at: Date.now() });
            }
            if (mask & 0x4) buf.pos += 2; // face entity
            if (mask & 0x8) buf.gjstr(); // say
            if (mask & 0x10) {
                const damage = buf.g1();
                const type = buf.g1();
                const hp = buf.g1();
                buf.g1(); // base hitpoints
                if (pid === -1) this.myHits.push({ damage, type, hp, at: Date.now() });
            }
            if (mask & 0x20) buf.pos += 4; // face coord
            if (mask & 0x40) {
                // chat: colour, effect, type, length, packed text
                buf.pos += 3;
                const len = buf.g1();
                buf.pos += len;
            }
            if (mask & 0x100) buf.pos += 6; // spotanim
            if (mask & 0x200) buf.pos += 9; // exact move
            if (mask & 0x400) {
                const damage = buf.g1();
                const type = buf.g1();
                const hp = buf.g1();
                buf.g1(); // base hitpoints
                if (pid === -1) this.myHits.push({ damage, type, hp, at: Date.now() });
            }
        }
    }

    private handleNpcInfo(buf: Packet, length: number) {
        buf.bitStart();
        const updates: number[] = [];
        // npcs already in view
        const count = buf.gBit(8);
        const list: number[] = [];
        const dropped = this.npcList.slice(count);
        for (let i = 0; i < count; i++) {
            const nid = this.npcList[i];
            const npc = this.npcs.get(nid);
            if (buf.gBit(1) === 0) {
                list.push(nid);
                continue;
            }
            const kind = buf.gBit(2);
            if (kind === 3) {
                dropped.push(nid);
                continue;
            }
            list.push(nid);
            if (kind === 0) {
                updates.push(nid);
            } else {
                const dir1 = buf.gBit(3);
                if (npc) {
                    npc.x += DIR_X[dir1];
                    npc.z += DIR_Z[dir1];
                }
                if (kind === 2) {
                    const dir2 = buf.gBit(3);
                    if (npc) {
                        npc.x += DIR_X[dir2];
                        npc.z += DIR_Z[dir2];
                    }
                }
                if (buf.gBit(1) === 1) updates.push(nid);
            }
        }
        // npcs coming into view: nid (14), type (13, Allstar-City), dx (5), dz (5), jump, extended info
        while (buf.bitPos + 21 < length * 8) {
            const nid = buf.gBit(14);
            if (nid === 16383) {
                break;
            }
            const type = buf.gBit(13);
            let dx = buf.gBit(5);
            if (dx > 15) dx -= 32;
            let dz = buf.gBit(5);
            if (dz > 15) dz -= 32;
            buf.gBit(1); // jump
            const update = buf.gBit(1);
            const npc = this.npcs.get(nid) ?? { nid, type, x: 0, z: 0, level: 0, hp: -1, maxHp: -1, hits: [], anims: [], says: [] };
            npc.type = type;
            npc.x = this.self.x + dx;
            npc.z = this.self.z + dz;
            npc.level = this.self.level;
            this.npcs.set(nid, npc);
            list.push(nid);
            if (update === 1) updates.push(nid);
        }
        buf.bitEnd();
        this.npcList = list;
        Bot.forget(this.npcs, dropped, list);

        // extended info, blocks in NpcInfoEncoder.writeBlocks order; hitsplats are p2 damage, p1 type,
        // p2 hitpoints, p2 max hitpoints (Allstar-City, NPCs with more than 255 hitpoints)
        for (const nid of updates) {
            const npc = this.npcs.get(nid);
            const mask = buf.g1();
            if (mask & 0x1) this.npcHit(buf, npc); // damage 2
            if (mask & 0x2) {
                const anim = buf.g2();
                buf.g1(); // delay
                npc?.anims.push({ anim, at: Date.now() });
            }
            if (mask & 0x4) buf.pos += 2; // face entity
            if (mask & 0x8) {
                const say = buf.gjstr();
                npc?.says.push(say);
            }
            if (mask & 0x10) this.npcHit(buf, npc); // damage
            if (mask & 0x20) {
                const type = buf.g2(); // change type
                if (npc) npc.type = type;
            }
            if (mask & 0x40) buf.pos += 6; // spotanim
            if (mask & 0x80) buf.pos += 4; // face coord
        }
    }

    private npcHit(buf: Packet, npc: BotNpc | undefined) {
        const damage = buf.g2();
        const type = buf.g1();
        const hp = buf.g2();
        const maxHp = buf.g2();
        if (npc) {
            npc.hp = hp;
            npc.maxHp = maxHp;
            npc.hits.push({ damage, type, hp, maxHp, at: Date.now() });
        }
    }

    // ---- outbound ----

    private send(prot: ClientGameProt, write: (buf: Packet) => void = () => {}) {
        const body = Packet.alloc(1);
        write(body);
        const out = Packet.alloc(1);
        out.p1(prot.id + this.encryptor.nextInt());
        if (prot.length === -1) {
            out.p1(body.pos);
        } else if (prot.length === -2) {
            out.p2(body.pos);
        }
        out.pdata(body.data, 0, body.pos);
        this.socket.write(out.data.subarray(0, out.pos));
    }

    cheat(input: string) {
        this.send(ClientGameProt.CLIENT_CHEAT, buf => buf.pjstr(input));
    }

    ifButton(com: number) {
        this.send(ClientGameProt.IF_BUTTON, buf => buf.p2(com));
    }

    // what the client sends when the player closes an interface or walks
    closeModal() {
        this.send(ClientGameProt.CLOSE_MODAL);
        this.main = this.side = this.chat = -1;
    }

    resumePauseButton(com: number) {
        this.send(ClientGameProt.RESUME_PAUSEBUTTON, buf => buf.p2(com));
    }

    // The 289 protocol writes every field as a plain big-endian short, in the same order for all five ops.
    opNpc(op: number, nid: number) {
        const prot = [ClientGameProt.OPNPC1, ClientGameProt.OPNPC2, ClientGameProt.OPNPC3, ClientGameProt.OPNPC4, ClientGameProt.OPNPC5][op - 1];
        this.send(prot, buf => buf.p2(nid));
    }

    opLoc(op: number, x: number, z: number, loc: number) {
        const prot = [ClientGameProt.OPLOC1, ClientGameProt.OPLOC2, ClientGameProt.OPLOC3, ClientGameProt.OPLOC4, ClientGameProt.OPLOC5][op - 1];
        this.send(prot, buf => {
            buf.p2(x);
            buf.p2(z);
            buf.p2(loc);
        });
    }

    opHeld(op: number, obj: number, slot: number, com: number) {
        const prot = [ClientGameProt.OPHELD1, ClientGameProt.OPHELD2, ClientGameProt.OPHELD3, ClientGameProt.OPHELD4, ClientGameProt.OPHELD5][op - 1];
        this.send(prot, buf => {
            buf.p2(obj);
            buf.p2(slot);
            buf.p2(com);
        });
    }

    invButton(op: number, obj: number, slot: number, com: number) {
        const prot = [ClientGameProt.INV_BUTTON1, ClientGameProt.INV_BUTTON2, ClientGameProt.INV_BUTTON3, ClientGameProt.INV_BUTTON4, ClientGameProt.INV_BUTTON5][op - 1];
        this.send(prot, buf => {
            buf.p2(obj);
            buf.p2(slot);
            buf.p2(com);
        });
    }

    // "Use" useObj (useSlot of useCom) on obj (slot of com)
    opHeldU(obj: number, slot: number, com: number, useObj: number, useSlot: number, useCom: number) {
        this.send(ClientGameProt.OPHELDU, buf => {
            buf.p2(obj);
            buf.p2(slot);
            buf.p2(com);
            buf.p2(useObj);
            buf.p2(useSlot);
            buf.p2(useCom);
        });
    }

    opObj(op: number, x: number, z: number, obj: number) {
        const prot = [ClientGameProt.OPOBJ1, ClientGameProt.OPOBJ2, ClientGameProt.OPOBJ3, ClientGameProt.OPOBJ4, ClientGameProt.OPOBJ5][op - 1];
        this.send(prot, buf => {
            buf.p2(x);
            buf.p2(z);
            buf.p2(obj);
        });
    }

    // playerSlot: the target's pid (UPDATE_PID)
    opPlayer(op: number, playerSlot: number) {
        const prot = [ClientGameProt.OPPLAYER1, ClientGameProt.OPPLAYER2, ClientGameProt.OPPLAYER3, ClientGameProt.OPPLAYER4, ClientGameProt.OPPLAYER5][op - 1];
        this.send(prot, buf => buf.p2(playerSlot));
    }

    // "Use" useObj (useSlot of useCom) on a loc
    opLocU(x: number, z: number, loc: number, useObj: number, useSlot: number, useCom: number) {
        this.send(ClientGameProt.OPLOCU, buf => {
            buf.p2(x);
            buf.p2(z);
            buf.p2(loc);
            buf.p2(useObj);
            buf.p2(useSlot);
            buf.p2(useCom);
        });
    }

    // Allstar-City combat tests: walk to a tile (MOVE_GAMECLICK: p1(ctrl held), p2(x), p2(z), then the
    // waypoints as byte offsets; the destination alone is a one-tile path)
    walk(x: number, z: number, run = false) {
        // the client closes any open dialog (level-up etc.) before walking
        if (this.main !== -1 || this.chat !== -1) {
            this.send(ClientGameProt.CLOSE_MODAL);
            this.main = this.chat = -1;
        }
        this.send(ClientGameProt.MOVE_GAMECLICK, buf => {
            buf.p1(run ? 1 : 0);
            buf.p2(x);
            buf.p2(z);
        });
    }

    // spell (interface component) on an npc / player / held item / ground item: the target's fields as in
    // the plain op, then p2(spellCom) (engine/src/network/game/client/codec/Op*TDecoder.ts)
    opNpcT(nid: number, spellCom: number) {
        this.send(ClientGameProt.OPNPCT, buf => {
            buf.p2(nid);
            buf.p2(spellCom);
        });
    }

    opPlayerT(pid: number, spellCom: number) {
        this.send(ClientGameProt.OPPLAYERT, buf => {
            buf.p2(pid);
            buf.p2(spellCom);
        });
    }

    opHeldT(obj: number, slot: number, com: number, spellCom: number) {
        this.send(ClientGameProt.OPHELDT, buf => {
            buf.p2(obj);
            buf.p2(slot);
            buf.p2(com);
            buf.p2(spellCom);
        });
    }

    opObjT(x: number, z: number, obj: number, spellCom: number) {
        this.send(ClientGameProt.OPOBJT, buf => {
            buf.p2(x);
            buf.p2(z);
            buf.p2(obj);
            buf.p2(spellCom);
        });
    }

    // nearest tracked npc of a type
    nearestNpc(type: number): BotNpc | undefined {
        let best: BotNpc | undefined;
        let bestDist = Infinity;
        for (const npc of this.npcs.values()) {
            if (npc.type !== type) continue;
            const d = Math.max(Math.abs(npc.x - this.self.x), Math.abs(npc.z - this.self.z));
            if (d < bestDist) {
                best = npc;
                bestDist = d;
            }
        }
        return best;
    }

    // click the logout button (logout:try_logout) and wait for the server to close the connection
    async logout(timeout = 10000) {
        const deadline = Date.now() + timeout;
        while (!this.closed && Date.now() < deadline) {
            this.ifButton(2458);
            await new Promise(resolve => setTimeout(resolve, 600));
        }
        this.close();
    }

    playerByName(name: string): BotPlayer | undefined {
        for (const p of this.players.values()) {
            if (p.name.toLowerCase() === name.toLowerCase()) return p;
        }
        return undefined;
    }

    // ---- helpers ----

    // Resolves with the first game message (after `since`) matching the pattern.
    async waitForMessage(pattern: RegExp, timeout = 5000, since = 0): Promise<string> {
        const deadline = Date.now() + timeout;
        for (;;) {
            const found = this.messages.slice(since).find(m => pattern.test(m));
            if (found !== undefined) {
                return found;
            }
            if (this.closed || Date.now() > deadline) {
                throw new Error(`[${this.username}] no message matching ${pattern}; got: ${JSON.stringify(this.messages.slice(since))}`);
            }
            await new Promise<void>(resolve => {
                const timer = setTimeout(resolve, 100);
                this.waiters.push(() => {
                    clearTimeout(timer);
                    resolve();
                });
            });
        }
    }

    async until(check: () => boolean, timeout = 5000, what = 'condition') {
        const deadline = Date.now() + timeout;
        while (!check()) {
            if (this.closed || Date.now() > deadline) {
                throw new Error(`[${this.username}] timed out waiting for ${what}`);
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    // Current coordinate via the engine's staff ::getcoord (dev worlds give every player staff 4).
    async coord(): Promise<{ level: number; x: number; z: number }> {
        const since = this.messages.length;
        this.cheat('getcoord');
        const text = await this.waitForMessage(/^\d+,\d+,\d+,\d+,\d+$/, 5000, since);
        const [level, mx, mz, lx, lz] = text.split(',').map(Number);
        return { level, x: (mx << 6) + lx, z: (mz << 6) + lz };
    }

    close() {
        if (!this.closed) {
            this.closed = true;
            this.socket?.destroy();
            this.wake();
        }
    }
}
