// Reader for a 317-era client cache (main_file_cache.dat + main_file_cache.idx0-4), the layout the
// 317 clients Allstar-Scape players used (Silabsoft's 317 client with 508-era items) and the 377
// client share. Models (index 1) are already in the format the 377 client reads; obj configs live
// in obj.dat/obj.idx of the "config" archive (index 0, file 2).
//
// Used by convert.mjs --317 <dir>: when such a cache is available its item definitions (keyed by
// the same ids Allstar-Scape used) and models are taken as-is, instead of converting OSRS models.
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const SECTOR = 520;
let bzip2 = null;

async function bunzip(data, size) {
    if (!bzip2) {
        const BZip2 = (await import('../../../engine/src/3rdparty/bzip2-wasm/bzip2-wasm.js')).default;
        bzip2 = new BZip2();
        await bzip2.init();
    }
    return Buffer.from(bzip2.decompress(data, size, true));
}

export class Cache317 {
    constructor(dir) {
        this.dir = dir;
        this.dat = fs.openSync(path.join(dir, 'main_file_cache.dat'), 'r');
        this.indexes = new Map();
    }

    index(id) {
        if (!this.indexes.has(id)) {
            const file = path.join(this.dir, `main_file_cache.idx${id}`);
            this.indexes.set(id, fs.existsSync(file) ? fs.readFileSync(file) : Buffer.alloc(0));
        }
        return this.indexes.get(id);
    }

    count(index) {
        return Math.floor(this.index(index).length / 6);
    }

    // Stored bytes of one file (sector headers: file u16, chunk u16, next sector u24, store u8).
    read(index, file) {
        const idx = this.index(index);
        const pos = file * 6;
        if (pos + 6 > idx.length) return null;
        const size = (idx[pos] << 16) | (idx[pos + 1] << 8) | idx[pos + 2];
        let sector = (idx[pos + 3] << 16) | (idx[pos + 4] << 8) | idx[pos + 5];
        if (size <= 0 || sector <= 0) return null;
        const out = Buffer.alloc(size);
        const buf = Buffer.alloc(SECTOR);
        let off = 0;
        let chunk = 0;
        while (off < size) {
            fs.readSync(this.dat, buf, 0, SECTOR, sector * SECTOR);
            if (buf.readUInt16BE(0) !== file || buf.readUInt16BE(2) !== chunk) {
                throw new Error(`317 cache: index ${index} file ${file} has a corrupt sector ${sector}`);
            }
            const n = Math.min(SECTOR - 8, size - off);
            buf.copy(out, off, 8, 8 + n);
            off += n;
            sector = (buf[4] << 16) | (buf[5] << 8) | buf[6];
            chunk++;
        }
        return out;
    }

    // Raw model data (index 1 files are gzipped).
    model(id) {
        const data = this.read(1, id);
        if (!data) return null;
        return data[0] === 0x1f && data[1] === 0x8b ? zlib.gunzipSync(data) : data;
    }

    async archive(id) {
        const data = this.read(0, id);
        return data ? await Jagfile.load(data) : null;
    }
}

export function jagHash(name) {
    let hash = 0;
    for (const c of name.toUpperCase()) hash = (hash * 61 + c.charCodeAt(0) - 32) | 0;
    return hash;
}

export class Jagfile {
    static async load(src) {
        const f = new Jagfile();
        const unpacked = src.readUIntBE(0, 3);
        const packed = src.readUIntBE(3, 3);
        let data = src;
        let pos = 6;
        f.whole = unpacked !== packed;
        if (f.whole) {
            data = await bunzip(src.subarray(6, 6 + packed), unpacked);
            pos = 0;
        }
        const count = data.readUInt16BE(pos);
        pos += 2;
        let filePos = pos + count * 10;
        f.files = new Map();
        for (let i = 0; i < count; i++) {
            const hash = data.readInt32BE(pos);
            const size = data.readUIntBE(pos + 4, 3);
            const stored = data.readUIntBE(pos + 7, 3);
            pos += 10;
            f.files.set(hash, { data, pos: filePos, size, stored });
            filePos += stored;
        }
        return f;
    }

    async get(name) {
        const e = this.files.get(jagHash(name));
        if (!e) return null;
        const raw = e.data.subarray(e.pos, e.pos + e.stored);
        return this.whole || e.size === e.stored ? Buffer.from(raw) : await bunzip(raw, e.size);
    }
}

// 317/377 obj config (ObjType.decode): strings end with '\n'. Same field names as cache.mjs decodeObj.
export function decodeObj317(data, pos) {
    const u8 = () => data[pos++];
    const i8 = () => data.readInt8(pos++);
    const u16 = () => {
        const v = data.readUInt16BE(pos);
        pos += 2;
        return v;
    };
    const s16 = () => {
        const v = u16();
        return v > 32767 ? v - 65536 : v;
    };
    const i32 = () => {
        const v = data.readInt32BE(pos);
        pos += 4;
        return v;
    };
    const str = () => {
        const end = data.indexOf(10, pos);
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
        else if (op === 7) d.xof2d = s16();
        else if (op === 8) d.yof2d = s16();
        else if (op === 10) u16();
        else if (op === 11) d.stackable = true;
        else if (op === 12) d.cost = i32();
        else if (op === 16) d.members = true;
        else if (op === 23) {
            d.manwear = u16();
            d.manwearOff = i8();
        } else if (op === 24) d.manwear2 = u16();
        else if (op === 25) {
            d.womanwear = u16();
            d.womanwearOff = i8();
        } else if (op === 26) d.womanwear2 = u16();
        else if (op >= 30 && op < 35) (d.op ??= [])[op - 30] = str();
        else if (op >= 35 && op < 40) (d.iop ??= [])[op - 35] = str();
        else if (op === 40) {
            const n = u8();
            d.recol = [];
            for (let i = 0; i < n; i++) d.recol.push([u16(), u16()]);
        } else if (op === 78) d.manwear3 = u16();
        else if (op === 79) d.womanwear3 = u16();
        else if (op === 90) d.manhead = u16();
        else if (op === 91) d.womanhead = u16();
        else if (op === 92) d.manhead2 = u16();
        else if (op === 93) d.womanhead2 = u16();
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
        else throw new Error(`unknown 317 obj opcode ${op}`);
    }
    return d;
}

// Map(itemId -> def) from the config archive's obj.idx/obj.dat.
export async function loadObjs317(cache) {
    const config = await cache.archive(2);
    const dat = await config.get('obj.dat');
    const idx = await config.get('obj.idx');
    const count = idx.readUInt16BE(0);
    const objs = new Map();
    let pos = 2;
    for (let id = 0; id < count; id++) {
        const size = idx.readUInt16BE(2 + id * 2);
        try {
            objs.set(id, decodeObj317(dat, pos));
        } catch (e) {
            throw new Error(`317 obj ${id}: ${e.message}`);
        }
        pos += size;
    }
    return objs;
}
