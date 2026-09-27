// Jagex model codec. decode() reads every OSRS model format (the original 2004-era format and the
// newer "type 1/2/3" formats, ported from RuneLite's ModelLoader); encode377() writes the original
// format, the only one the revision 377 client reads (.ob2 files in content/models).
//
// Model fields (arrays have one entry per vertex or per face):
//   vertexCount, faceCount, vx, vy, vz, vlabels (vertex skins, or null)
//   fa, fb, fc (vertex indices), colours (HSL16), renderTypes (or null), priorities (or null),
//   priority (used when priorities is null), alphas (or null), flabels (face skins, or null),
//   textures (OSRS texture id per face, -1 = none, or null)

class Reader {
    constructor(data, pos = 0) {
        this.data = data;
        this.pos = pos;
    }
    u8() {
        return this.data[this.pos++];
    }
    i8() {
        return (this.data[this.pos++] << 24) >> 24;
    }
    u16() {
        const v = (this.data[this.pos] << 8) | this.data[this.pos + 1];
        this.pos += 2;
        return v;
    }
    i32() {
        const v = (this.data[this.pos] << 24) | (this.data[this.pos + 1] << 16) | (this.data[this.pos + 2] << 8) | this.data[this.pos + 3];
        this.pos += 4;
        return v;
    }
    // signed "short smart": 1 byte -64..63 or 2 bytes -16384..16383
    smart() {
        return this.data[this.pos] < 128 ? this.u8() - 64 : this.u16() - 0xc000;
    }
}

function empty(vertexCount, faceCount) {
    return {
        vertexCount,
        faceCount,
        vx: new Int32Array(vertexCount),
        vy: new Int32Array(vertexCount),
        vz: new Int32Array(vertexCount),
        vlabels: null,
        fa: new Int32Array(faceCount),
        fb: new Int32Array(faceCount),
        fc: new Int32Array(faceCount),
        colours: new Int32Array(faceCount),
        renderTypes: null,
        priorities: null,
        priority: 0,
        alphas: null,
        flabels: null,
        textures: null
    };
}

function readVertices(m, flags, xs, ys, zs, labels) {
    let x = 0;
    let y = 0;
    let z = 0;
    for (let i = 0; i < m.vertexCount; i++) {
        const f = flags.u8();
        x += f & 1 ? xs.smart() : 0;
        y += f & 2 ? ys.smart() : 0;
        z += f & 4 ? zs.smart() : 0;
        m.vx[i] = x;
        m.vy[i] = y;
        m.vz[i] = z;
        if (labels) {
            m.vlabels[i] = labels.u8();
        }
    }
}

function readFaces(m, data, types) {
    let a = 0;
    let b = 0;
    let c = 0;
    let last = 0;
    for (let i = 0; i < m.faceCount; i++) {
        const type = types.u8();
        if (type === 1) {
            a = data.smart() + last;
            b = data.smart() + a;
            c = data.smart() + b;
        } else if (type === 2) {
            b = c;
            c = data.smart() + last;
        } else if (type === 3) {
            a = c;
            c = data.smart() + last;
        } else if (type === 4) {
            const t = a;
            a = b;
            b = t;
            c = data.smart() + last;
        }
        last = c;
        m.fa[i] = a;
        m.fb[i] = b;
        m.fc[i] = c;
    }
}

// Faces flagged textured in the original format store the texture id in the colour.
function readOldTexturedInfo(m, info) {
    let textured = false;
    for (let i = 0; i < m.faceCount; i++) {
        const v = info[i];
        m.renderTypes[i] = v & 1;
        if (v & 2) {
            m.textures[i] = m.colours[i];
            m.colours[i] = 127;
            textured = true;
        }
    }
    if (!textured) {
        m.textures = null;
    }
}

function decodeOld(data) {
    const f = new Reader(data, data.length - 18);
    const vertexCount = f.u16();
    const faceCount = f.u16();
    const texCount = f.u8();
    const hasInfo = f.u8();
    const priority = f.u8();
    const hasAlpha = f.u8();
    const hasFaceLabels = f.u8();
    const hasVertexLabels = f.u8();
    const xLen = f.u16();
    const yLen = f.u16();
    const zLen = f.u16();
    const indexLen = f.u16();

    let pos = vertexCount;
    const faceTypesPos = pos;
    pos += faceCount;
    const priPos = pos;
    if (priority === 255) pos += faceCount;
    const faceLabelsPos = pos;
    if (hasFaceLabels === 1) pos += faceCount;
    const infoPos = pos;
    if (hasInfo === 1) pos += faceCount;
    const vertexLabelsPos = pos;
    if (hasVertexLabels === 1) pos += vertexCount;
    const alphaPos = pos;
    if (hasAlpha === 1) pos += faceCount;
    const indexPos = pos;
    pos += indexLen;
    const colourPos = pos;
    pos += faceCount * 2;
    pos += texCount * 6;
    const xPos = pos;
    pos += xLen;
    const yPos = pos;
    pos += yLen;
    const zPos = pos;

    const m = empty(vertexCount, faceCount);
    if (hasVertexLabels === 1) m.vlabels = new Int32Array(vertexCount);
    readVertices(m, new Reader(data, 0), new Reader(data, xPos), new Reader(data, yPos), new Reader(data, zPos), hasVertexLabels === 1 ? new Reader(data, vertexLabelsPos) : null);

    const colours = new Reader(data, colourPos);
    const info = [];
    const pri = new Reader(data, priPos);
    const alpha = new Reader(data, alphaPos);
    const flab = new Reader(data, faceLabelsPos);
    const inf = new Reader(data, infoPos);
    if (priority === 255) m.priorities = new Int32Array(faceCount);
    else m.priority = priority;
    if (hasAlpha === 1) m.alphas = new Int32Array(faceCount);
    if (hasFaceLabels === 1) m.flabels = new Int32Array(faceCount);
    for (let i = 0; i < faceCount; i++) {
        m.colours[i] = colours.u16();
        if (hasInfo === 1) info.push(inf.u8());
        if (priority === 255) m.priorities[i] = pri.i8();
        if (hasAlpha === 1) m.alphas[i] = alpha.u8();
        if (hasFaceLabels === 1) m.flabels[i] = flab.u8();
    }
    if (hasInfo === 1) {
        m.renderTypes = new Int32Array(faceCount);
        m.textures = new Int32Array(faceCount).fill(-1);
        readOldTexturedInfo(m, info);
    }
    readFaces(m, new Reader(data, indexPos), new Reader(data, faceTypesPos));
    return m;
}

// "Type 1" (0xff 0xff footer) and "type 3" (0xff 0xfd) share a layout apart from the animaya data.
function decodeType13(data, type3) {
    const f = new Reader(data, data.length - (type3 ? 26 : 23));
    const vertexCount = f.u16();
    const faceCount = f.u16();
    const texCount = f.u8();
    const hasRenderTypes = f.u8();
    const priority = f.u8();
    const hasAlpha = f.u8();
    const hasFaceLabels = f.u8();
    const hasTextures = f.u8();
    const hasVertexLabels = f.u8();
    const hasAnimaya = type3 ? f.u8() : 0;
    const xLen = f.u16();
    const yLen = f.u16();
    const zLen = f.u16();
    const indexLen = f.u16();
    const texIndexLen = f.u16();
    const vertexLabelsLen = type3 ? f.u16() : hasVertexLabels === 1 ? vertexCount : 0;

    let simpleTex = 0;
    let complexTex = 0;
    let cubeTex = 0;
    const texTypes = [];
    for (let i = 0; i < texCount; i++) {
        const t = (data[i] << 24) >> 24;
        texTypes.push(t);
        if (t === 0) simpleTex++;
        if (t >= 1 && t <= 3) complexTex++;
        if (t === 2) cubeTex++;
    }

    let pos = texCount + vertexCount;
    const renderTypesPos = pos;
    if (hasRenderTypes === 1) pos += faceCount;
    const faceTypesPos = pos;
    pos += faceCount;
    const priPos = pos;
    if (priority === 255) pos += faceCount;
    const faceLabelsPos = pos;
    if (hasFaceLabels === 1) pos += faceCount;
    const vertexLabelsPos = pos;
    pos += vertexLabelsLen;
    const alphaPos = pos;
    if (hasAlpha === 1) pos += faceCount;
    const indexPos = pos;
    pos += indexLen;
    const texPos = pos;
    if (hasTextures === 1) pos += faceCount * 2;
    const texCoordPos = pos;
    pos += texIndexLen;
    const colourPos = pos;
    pos += faceCount * 2;
    const xPos = pos;
    pos += xLen;
    const yPos = pos;
    pos += yLen;
    const zPos = pos;

    const m = empty(vertexCount, faceCount);
    if (hasVertexLabels === 1) m.vlabels = new Int32Array(vertexCount);
    readVertices(m, new Reader(data, texCount), new Reader(data, xPos), new Reader(data, yPos), new Reader(data, zPos), hasVertexLabels === 1 ? new Reader(data, vertexLabelsPos) : null);
    // (type 3 animaya groups follow the vertex labels; they are not needed)

    const colours = new Reader(data, colourPos);
    const rt = new Reader(data, renderTypesPos);
    const pri = new Reader(data, priPos);
    const alpha = new Reader(data, alphaPos);
    const flab = new Reader(data, faceLabelsPos);
    const tex = new Reader(data, texPos);
    const texCoord = new Reader(data, texCoordPos);
    if (hasRenderTypes === 1) m.renderTypes = new Int32Array(faceCount);
    if (priority === 255) m.priorities = new Int32Array(faceCount);
    else m.priority = priority;
    if (hasAlpha === 1) m.alphas = new Int32Array(faceCount);
    if (hasFaceLabels === 1) m.flabels = new Int32Array(faceCount);
    if (hasTextures === 1) m.textures = new Int32Array(faceCount);
    for (let i = 0; i < faceCount; i++) {
        m.colours[i] = colours.u16();
        if (hasRenderTypes === 1) m.renderTypes[i] = rt.i8();
        if (priority === 255) m.priorities[i] = pri.i8();
        if (hasAlpha === 1) m.alphas[i] = alpha.u8();
        if (hasFaceLabels === 1) m.flabels[i] = flab.u8();
        if (hasTextures === 1) {
            m.textures[i] = tex.u16() - 1;
            if (texCount > 0 && m.textures[i] !== -1) {
                texCoord.u8();
            }
        }
    }
    readFaces(m, new Reader(data, indexPos), new Reader(data, faceTypesPos));
    return m;
}

// "Type 2" (0xff 0xfe footer): the original layout plus vertex label/animaya extensions.
function decodeType2(data) {
    const f = new Reader(data, data.length - 23);
    const vertexCount = f.u16();
    const faceCount = f.u16();
    const texCount = f.u8();
    const hasInfo = f.u8();
    const priority = f.u8();
    const hasAlpha = f.u8();
    const hasFaceLabels = f.u8();
    const hasVertexLabels = f.u8();
    f.u8(); // animaya
    const xLen = f.u16();
    const yLen = f.u16();
    const zLen = f.u16();
    const indexLen = f.u16();
    const vertexLabelsLen = f.u16();

    let pos = vertexCount;
    const faceTypesPos = pos;
    pos += faceCount;
    const priPos = pos;
    if (priority === 255) pos += faceCount;
    const faceLabelsPos = pos;
    if (hasFaceLabels === 1) pos += faceCount;
    const infoPos = pos;
    if (hasInfo === 1) pos += faceCount;
    const vertexLabelsPos = pos;
    pos += vertexLabelsLen;
    const alphaPos = pos;
    if (hasAlpha === 1) pos += faceCount;
    const indexPos = pos;
    pos += indexLen;
    const colourPos = pos;
    pos += faceCount * 2;
    pos += texCount * 6;
    const xPos = pos;
    pos += xLen;
    const yPos = pos;
    pos += yLen;
    const zPos = pos;

    const m = empty(vertexCount, faceCount);
    if (hasVertexLabels === 1) m.vlabels = new Int32Array(vertexCount);
    readVertices(m, new Reader(data, 0), new Reader(data, xPos), new Reader(data, yPos), new Reader(data, zPos), hasVertexLabels === 1 ? new Reader(data, vertexLabelsPos) : null);

    const colours = new Reader(data, colourPos);
    const info = [];
    const pri = new Reader(data, priPos);
    const alpha = new Reader(data, alphaPos);
    const flab = new Reader(data, faceLabelsPos);
    const inf = new Reader(data, infoPos);
    if (priority === 255) m.priorities = new Int32Array(faceCount);
    else m.priority = priority;
    if (hasAlpha === 1) m.alphas = new Int32Array(faceCount);
    if (hasFaceLabels === 1) m.flabels = new Int32Array(faceCount);
    for (let i = 0; i < faceCount; i++) {
        m.colours[i] = colours.u16();
        if (hasInfo === 1) info.push(inf.u8());
        if (priority === 255) m.priorities[i] = pri.i8();
        if (hasAlpha === 1) m.alphas[i] = alpha.u8();
        if (hasFaceLabels === 1) m.flabels[i] = flab.u8();
    }
    if (hasInfo === 1) {
        m.renderTypes = new Int32Array(faceCount);
        m.textures = new Int32Array(faceCount).fill(-1);
        readOldTexturedInfo(m, info);
    }
    readFaces(m, new Reader(data, indexPos), new Reader(data, faceTypesPos));
    return m;
}

export function formatOf(data) {
    const a = data[data.length - 2];
    const b = data[data.length - 1];
    if (a === 0xff && b === 0xfd) return 3;
    if (a === 0xff && b === 0xfe) return 2;
    if (a === 0xff && b === 0xff) return 1;
    return 0;
}

export function decode(data) {
    switch (formatOf(data)) {
        case 3:
            return decodeType13(data, true);
        case 2:
            return decodeType2(data);
        case 1:
            return decodeType13(data, false);
        default:
            return decodeOld(data);
    }
}

class Writer {
    constructor() {
        this.bytes = [];
    }
    u8(v) {
        this.bytes.push(v & 0xff);
    }
    u16(v) {
        this.bytes.push((v >> 8) & 0xff, v & 0xff);
    }
    smart(v) {
        if (v >= -64 && v < 64) {
            this.u8(v + 64);
        } else if (v >= -16384 && v < 16384) {
            this.u16(v + 0xc000);
        } else {
            throw new Error(`smart out of range: ${v}`);
        }
    }
    get length() {
        return this.bytes.length;
    }
}

// Writes the original (rev 377) model format. Faces must already be untextured
// (renderTypes 0 = gouraud, 1 = flat); the 377 client has no hidden-face or texture support here.
export function encode377(m) {
    if (m.vertexCount > 0xffff || m.faceCount > 0xffff) {
        throw new Error('model too large');
    }
    const vflags = new Writer();
    const xs = new Writer();
    const ys = new Writer();
    const zs = new Writer();
    let px = 0;
    let py = 0;
    let pz = 0;
    for (let i = 0; i < m.vertexCount; i++) {
        const dx = m.vx[i] - px;
        const dy = m.vy[i] - py;
        const dz = m.vz[i] - pz;
        let flag = 0;
        if (dx !== 0) {
            xs.smart(dx);
            flag |= 1;
        }
        if (dy !== 0) {
            ys.smart(dy);
            flag |= 2;
        }
        if (dz !== 0) {
            zs.smart(dz);
            flag |= 4;
        }
        vflags.u8(flag);
        px = m.vx[i];
        py = m.vy[i];
        pz = m.vz[i];
    }

    const ftypes = new Writer();
    const indices = new Writer();
    let a = 0;
    let b = 0;
    let c = 0;
    for (let i = 0; i < m.faceCount; i++) {
        const na = m.fa[i];
        const nb = m.fb[i];
        const nc = m.fc[i];
        if (na === a && nb === c) {
            ftypes.u8(2);
            indices.smart(nc - c);
        } else if (na === c && nb === b) {
            ftypes.u8(3);
            indices.smart(nc - c);
        } else if (na === b && nb === a) {
            ftypes.u8(4);
            indices.smart(nc - c);
        } else {
            ftypes.u8(1);
            indices.smart(na - c);
            indices.smart(nb - na);
            indices.smart(nc - nb);
        }
        a = na;
        b = nb;
        c = nc;
    }

    const hasInfo = m.renderTypes !== null && m.renderTypes.some(t => t !== 0);
    let perFacePriority = false;
    let priority = m.priority;
    if (m.priorities) {
        priority = m.priorities[0] ?? 0;
        perFacePriority = m.priorities.some(p => p !== priority);
    }
    const hasAlpha = m.alphas !== null && m.alphas.some(v => v !== 0);
    const hasFaceLabels = m.flabels !== null;
    const hasVertexLabels = m.vlabels !== null;

    const out = [];
    out.push(...vflags.bytes);
    out.push(...ftypes.bytes);
    if (perFacePriority) for (let i = 0; i < m.faceCount; i++) out.push(m.priorities[i] & 0xff);
    if (hasFaceLabels) for (let i = 0; i < m.faceCount; i++) out.push(m.flabels[i] & 0xff);
    if (hasInfo) for (let i = 0; i < m.faceCount; i++) out.push(m.renderTypes[i] & 1);
    if (hasVertexLabels) for (let i = 0; i < m.vertexCount; i++) out.push(m.vlabels[i] & 0xff);
    if (hasAlpha) for (let i = 0; i < m.faceCount; i++) out.push(m.alphas[i] & 0xff);
    out.push(...indices.bytes);
    for (let i = 0; i < m.faceCount; i++) out.push((m.colours[i] >> 8) & 0xff, m.colours[i] & 0xff);
    out.push(...xs.bytes, ...ys.bytes, ...zs.bytes);

    const footer = new Writer();
    footer.u16(m.vertexCount);
    footer.u16(m.faceCount);
    footer.u8(0); // textured triangles
    footer.u8(hasInfo ? 1 : 0);
    footer.u8(perFacePriority ? 255 : priority & 0xff);
    footer.u8(hasAlpha ? 1 : 0);
    footer.u8(hasFaceLabels ? 1 : 0);
    footer.u8(hasVertexLabels ? 1 : 0);
    footer.u16(xs.length);
    footer.u16(ys.length);
    footer.u16(zs.length);
    footer.u16(indices.length);
    out.push(...footer.bytes);
    return Buffer.from(out);
}

// Keeps only the faces for which keep(i) is true (unused vertices stay; they are harmless).
export function filterFaces(m, keep) {
    const idx = [];
    for (let i = 0; i < m.faceCount; i++) {
        if (keep(i)) idx.push(i);
    }
    const pick = arr => (arr ? Int32Array.from(idx, i => arr[i]) : null);
    return {
        ...m,
        faceCount: idx.length,
        fa: pick(m.fa),
        fb: pick(m.fb),
        fc: pick(m.fc),
        colours: pick(m.colours),
        renderTypes: pick(m.renderTypes),
        priorities: pick(m.priorities),
        alphas: pick(m.alphas),
        flabels: pick(m.flabels),
        textures: pick(m.textures)
    };
}
