// Minimal reader for an OSRS "flat file" cache (main_file_cache.dat2 + .idxN), e.g. the client's
// jagexcache/oldschool/LIVE folder. Only what the model converter needs: raw archive reads,
// container decompression (none/bzip2/gzip), reference tables, multi-file groups and obj configs.
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const SECTOR = 520;

export class FlatCache {
    constructor(dir) {
        this.dir = dir;
        this.dat = fs.openSync(path.join(dir, 'main_file_cache.dat2'), 'r');
        this.indexes = new Map();
    }

    index(id) {
        if (!this.indexes.has(id)) {
            this.indexes.set(id, fs.readFileSync(path.join(this.dir, `main_file_cache.idx${id}`)));
        }
        return this.indexes.get(id);
    }

    // Raw (still compressed) container bytes of one group, or null when the cache lacks it.
    readRaw(index, group) {
        const idx = this.index(index);
        const pos = group * 6;
        if (pos + 6 > idx.length) {
            return null;
        }
        const size = (idx[pos] << 16) | (idx[pos + 1] << 8) | idx[pos + 2];
        let sector = (idx[pos + 3] << 16) | (idx[pos + 4] << 8) | idx[pos + 5];
        if (size <= 0 || sector <= 0) {
            return null;
        }

        const big = group > 0xffff;
        const header = big ? 10 : 8;
        const out = Buffer.alloc(size);
        const buf = Buffer.alloc(SECTOR);
        let off = 0;
        let chunk = 0;
        while (off < size) {
            if (sector === 0) {
                throw new Error(`index ${index} group ${group}: sector chain ends early`);
            }
            fs.readSync(this.dat, buf, 0, SECTOR, sector * SECTOR);
            const g = big ? buf.readUInt32BE(0) : buf.readUInt16BE(0);
            const c = big ? buf.readUInt16BE(4) : buf.readUInt16BE(2);
            const next = big ? (buf[6] << 16) | (buf[7] << 8) | buf[8] : (buf[4] << 16) | (buf[5] << 8) | buf[6];
            const ix = big ? buf[9] : buf[7];
            if (g !== group || c !== chunk || ix !== index) {
                throw new Error(`index ${index} group ${group}: corrupt sector ${sector}`);
            }
            const n = Math.min(SECTOR - header, size - off);
            buf.copy(out, off, header, header + n);
            off += n;
            sector = next;
            chunk++;
        }
        return out;
    }

    async read(index, group) {
        const raw = this.readRaw(index, group);
        return raw ? await decompress(raw) : null;
    }

    async referenceTable(index) {
        return parseReferenceTable(await this.read(255, index));
    }

    // Returns Map(fileId -> Buffer) for a (possibly multi-file) group.
    async groupFiles(index, group, fileIds) {
        const data = await this.read(index, group);
        if (fileIds.length === 1) {
            return new Map([[fileIds[0], data]]);
        }
        const count = fileIds.length;
        const chunks = data[data.length - 1];
        let pos = data.length - 1 - chunks * count * 4;
        const parts = fileIds.map(() => []);
        let off = 0;
        for (let c = 0; c < chunks; c++) {
            let size = 0;
            for (let f = 0; f < count; f++) {
                size += data.readInt32BE(pos);
                pos += 4;
                parts[f].push(data.subarray(off, off + size));
                off += size;
            }
        }
        return new Map(fileIds.map((id, i) => [id, Buffer.concat(parts[i])]));
    }
}

let bzip2 = null;

export async function decompress(data) {
    const type = data[0];
    const length = data.readUInt32BE(1);
    if (type === 0) {
        return data.subarray(5, 5 + length);
    }
    const body = data.subarray(9, 9 + length);
    if (type === 2) {
        return zlib.gunzipSync(body);
    }
    if (type === 1) {
        if (!bzip2) {
            // the engine ships a bzip2 wasm build (Node has no bzip2)
            bzip2 = (await import('../../../engine/src/3rdparty/bzip2-wasm/bzip2-wasm.js')).default;
            bzip2 = new bzip2();
            await bzip2.init();
        }
        return Buffer.from(bzip2.decompress(body, data.readUInt32BE(5), true));
    }
    throw new Error(`unsupported container compression ${type}`);
}

function parseReferenceTable(data) {
    let pos = 0;
    const u8 = () => data[pos++];
    const u16 = () => {
        const v = data.readUInt16BE(pos);
        pos += 2;
        return v;
    };
    const i32 = () => {
        const v = data.readInt32BE(pos);
        pos += 4;
        return v;
    };
    const protocol = u8();
    if (protocol >= 6) {
        i32();
    }
    const flags = u8();
    const smart = protocol >= 7 ? () => (data[pos] >= 128 ? i32() & 0x7fffffff : u16()) : u16;
    const count = smart();
    const groups = [];
    let last = 0;
    for (let i = 0; i < count; i++) {
        last += smart();
        groups.push(last);
    }
    const skip = n => {
        pos += n;
    };
    if (flags & 1) skip(4 * count); // name hashes
    skip(4 * count); // crcs
    if (flags & 8) skip(4 * count); // hashes
    if (flags & 2) skip(64 * count); // whirlpool
    if (flags & 4) skip(8 * count); // sizes
    skip(4 * count); // versions
    const fileCounts = groups.map(() => smart());
    const files = new Map();
    for (let i = 0; i < count; i++) {
        const ids = [];
        let f = 0;
        for (let j = 0; j < fileCounts[i]; j++) {
            f += smart();
            ids.push(f);
        }
        files.set(groups[i], ids);
    }
    return files;
}

// OSRS obj config (index 2, group 10). Only the fields the converter uses are kept.
export function decodeObj(data) {
    let pos = 0;
    const u8 = () => data[pos++];
    const i8 = () => data.readInt8(pos++);
    const u16 = () => {
        const v = data.readUInt16BE(pos);
        pos += 2;
        return v;
    };
    const i16 = () => {
        const v = data.readInt16BE(pos);
        pos += 2;
        return v;
    };
    const u24 = () => {
        const v = (data[pos] << 16) | (data[pos + 1] << 8) | data[pos + 2];
        pos += 3;
        return v;
    };
    const i32 = () => {
        const v = data.readInt32BE(pos);
        pos += 4;
        return v;
    };
    const str = () => {
        const end = data.indexOf(0, pos);
        const s = data.toString('latin1', pos, end);
        pos = end + 1;
        return s;
    };
    const d = {};
    for (;;) {
        const op = u8();
        if (op === 0) break;
        if (op === 1) d.model = u16();
        else if (op === 2) d.name = str();
        else if (op === 3) d.desc = str();
        else if (op === 4) d.zoom2d = u16();
        else if (op === 5) d.xan2d = u16();
        else if (op === 6) d.yan2d = u16();
        else if (op === 7) d.xof2d = i16();
        else if (op === 8) d.yof2d = i16();
        else if (op === 9) str();
        else if (op === 11) d.stackable = true;
        else if (op === 12) d.cost = i32();
        else if (op === 13) d.wearpos = u8();
        else if (op === 14) d.wearpos2 = u8();
        else if (op === 16) d.members = true;
        else if (op === 23) {
            d.manwear = u16();
            d.manwearOff = u8();
        } else if (op === 24) d.manwear2 = u16();
        else if (op === 25) {
            d.womanwear = u16();
            d.womanwearOff = u8();
        } else if (op === 26) d.womanwear2 = u16();
        else if (op === 27) d.wearpos3 = u8();
        else if (op >= 30 && op < 35) (d.op ??= [])[op - 30] = str();
        else if (op >= 35 && op < 40) (d.iop ??= [])[op - 35] = str();
        else if (op === 40) {
            const n = u8();
            d.recol = [];
            for (let i = 0; i < n; i++) d.recol.push([u16(), u16()]);
        } else if (op === 41) {
            const n = u8();
            d.retex = [];
            for (let i = 0; i < n; i++) d.retex.push([u16(), u16()]);
        } else if (op === 42) i8();
        else if (op === 65) d.tradeable = true;
        else if (op === 75) d.weight = i16();
        else if (op === 78) d.manwear3 = u16();
        else if (op === 79) d.womanwear3 = u16();
        else if (op === 90) d.manhead = u16();
        else if (op === 91) d.womanhead = u16();
        else if (op === 92) d.manhead2 = u16();
        else if (op === 93) d.womanhead2 = u16();
        else if (op === 94) d.category = u16();
        else if (op === 95) d.zan2d = u16();
        else if (op === 97) d.certlink = u16();
        else if (op === 98) d.certtemplate = u16();
        else if (op >= 100 && op < 110) (d.count ??= []).push([u16(), u16()]);
        else if (op === 110) d.resizex = u16();
        else if (op === 111) d.resizey = u16();
        else if (op === 112) d.resizez = u16();
        else if (op === 113) d.ambient = i8();
        else if (op === 114) d.contrast = i8();
        else if (op === 115) d.team = u8();
        else if (op === 139 || op === 140 || op === 148 || op === 149) u16();
        else if (op === 249) {
            const n = u8();
            for (let i = 0; i < n; i++) {
                const isString = u8() === 1;
                u24();
                if (isString) str();
                else i32();
            }
        } else {
            throw new Error(`unknown obj opcode ${op}`);
        }
    }
    return d;
}

export async function loadObjs(cache) {
    const table = await cache.referenceTable(2);
    const files = await cache.groupFiles(2, 10, table.get(10));
    const objs = new Map();
    for (const [id, data] of files) {
        objs.set(id, decodeObj(data));
    }
    return objs;
}

// OSRS texture average colours (index 9 group 0): the colour a texture shows at low detail.
export async function loadTextureColours(cache) {
    const table = await cache.referenceTable(9);
    const files = await cache.groupFiles(9, 0, table.get(0));
    const colours = new Map();
    for (const [id, data] of files) {
        colours.set(id, data.readUInt16BE(0));
    }
    return colours;
}
