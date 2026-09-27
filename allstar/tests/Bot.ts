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

type Obj = { id: number; count: number } | null;

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

    private async readLoop() {
        try {
            while (!this.closed) {
                const [raw] = await this.readBytes(1);
                const opcode = (raw - this.decryptor.nextInt()) & 0xff;
                const prot = serverProts.get(opcode);
                if (!prot) {
                    throw new Error(`unknown server opcode ${opcode}`);
                }
                let length = prot.length;
                if (length === -1) {
                    length = (await this.readBytes(1))[0];
                } else if (length === -2) {
                    const b = await this.readBytes(2);
                    length = (b[0] << 8) | b[1];
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
                const x = buf.g2();
                const z = buf.g2();
                this.region = { x, z };
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
