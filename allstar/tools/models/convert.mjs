// Ports the models of Allstar-Scape's custom items (allstar/tools/gen/customitems.data.mjs) to the
// revision 377 client.
//
//   node allstar/tools/models/convert.mjs [--osrs <dir>] [--317 <dir> [--317-items <file.json>]]
//
// Model sources, in order of preference:
//   --317 <dir>   a 317-format client cache (main_file_cache.dat/.idx0-4) whose item ids are
//                 Allstar-Scape's, i.e. the client players used (Silabsoft's 317 client with
//                 508-era items). Its obj definitions (names, examines, options, icon params,
//                 recolours) and models are the exact data players saw and are taken as-is.
//                 Clients that defined extra items in code (ItemDef.forID) rather than obj.dat can
//                 supply them with --317-items: {"<item id>": {name, desc, model, zoom2d, xan2d,
//                 yan2d, zan2d, xof2d, yof2d, manwear, manwearOff, manwear2, womanwear,
//                 womanwearOff, womanwear2, manhead, womanhead, recol: [[from, to]], iop: [...]}},
//                 overriding obj.dat entries; model ids refer to the 317 cache's index 1.
//   --osrs <dir>  an OSRS cache (default %USERPROFILE%/jagexcache/oldschool/LIVE, Dec 2021): the
//                 same RS2 2007 items under their OSRS ids (customitems.data.mjs `osrs`), with the
//                 models converted to the original format. Used for items the 317 cache lacks.
//
// Writes content/models/allstar/<name>.ob2, registers new names in content/pack/model.pack, and
// writes allstar/tools/models/customitems.json: per item the obj fields (model names, icon params,
// wear offsets, recolours as the obj packer expects them) that allstar/tools/gen/customitems.mjs
// turns into obj configs. A model identical to the 377 model with the same id reuses that model.
//
// OSRS conversion: textured faces become flat colours (the texture's average colour), hidden faces
// (render type 2 / alpha 255) are dropped, render type 3 becomes flat, priorities are clamped to
// 0-11, and newer-format extras (texture coordinates, animaya skeletons, face z-offsets) are
// dropped. Vertex and face skins (animation labels) are kept.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import { FlatCache, loadObjs, loadTextureColours } from './cache.mjs';
import { Cache317, loadObjs317 } from './cache317.mjs';
import { decode, encode377, filterFaces } from './model.mjs';
import { isReachable, nearestReachable, toRgb15 } from './colour.mjs';
import { CUSTOM_ITEMS, STANDIN_RECOLOURS } from '../gen/customitems.data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CONTENT = path.join(ROOT, 'content');
const OUT_DIR = path.join(CONTENT, 'models/allstar');
const MODEL_PACK = path.join(CONTENT, 'pack/model.pack');
const MANIFEST = path.join(ROOT, 'allstar/tools/models/customitems.json');

const args = process.argv.slice(2);
const opt = name => {
    const i = args.indexOf(name);
    return i === -1 ? null : args[i + 1];
};
const OSRS_DIR = opt('--osrs') ?? path.join(os.homedir(), 'jagexcache/oldschool/LIVE');
const C317_DIR = opt('--317');

// ---- 377 models already in content (for reuse) and model.pack
const pack = new Map(); // id -> name
for (const line of fs.readFileSync(MODEL_PACK, 'utf8').split(/\r?\n/)) {
    const eq = line.indexOf('=');
    if (eq > 0) pack.set(Number(line.slice(0, eq)), line.slice(eq + 1));
}
const packNames = new Map([...pack].map(([id, name]) => [name, id]));
const lcFiles = new Map();
(function walk(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) walk(p);
        else if (p.endsWith('.ob2')) lcFiles.set(path.basename(p, '.ob2'), p);
    }
})(path.join(CONTENT, 'models'));
const inOutDir = file => path.resolve(file).startsWith(path.resolve(OUT_DIR));

// names this tool created last time (the previous manifest) are ours; anything else is foreign
const previous = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { models: {} };
const owned = new Set(Object.entries(previous.models).filter(([, m]) => !m.reused377).map(([name]) => name));
const isForeign = name => (lcFiles.has(name) && !inOutDir(lcFiles.get(name))) || (packNames.has(name) && !owned.has(name));

// ---- sources
const sources = [];
if (C317_DIR) {
    const cache = new Cache317(C317_DIR);
    const objs = await loadObjs317(cache);
    const extra = opt('--317-items');
    if (extra) {
        for (const [id, def] of Object.entries(JSON.parse(fs.readFileSync(extra, 'utf8')))) objs.set(Number(id), { ...objs.get(Number(id)), ...def });
    }
    sources.push({ kind: '317', label: C317_DIR, objs, raw: async id => cache.model(id) });
}
const osrsCache = fs.existsSync(path.join(OSRS_DIR, 'main_file_cache.dat2')) ? new FlatCache(OSRS_DIR) : null;
if (osrsCache) {
    sources.push({ kind: 'osrs', label: OSRS_DIR, objs: await loadObjs(osrsCache), raw: async id => osrsCache.read(7, id) });
}
if (!sources.length) throw new Error('no model source: pass --317 <dir> and/or --osrs <dir>');

const decoded = new Map(); // `${kind}:${id}` -> { model, raw }
async function sourceModel(source, id) {
    const key = `${source.kind}:${id}`;
    if (!decoded.has(key)) {
        const raw = await source.raw(id);
        if (!raw) throw new Error(`${source.kind} cache lacks model ${id}`);
        decoded.set(key, { model: decode(raw), raw });
    }
    return decoded.get(key).model;
}

const sameArr = (a, b) => (!a && !b) || (a && b && a.length === b.length && a.every((v, i) => v === b[i]));
function identical(a, b) {
    return a.vertexCount === b.vertexCount && a.faceCount === b.faceCount && a.priority === b.priority &&
        ['vx', 'vy', 'vz', 'vlabels', 'fa', 'fb', 'fc', 'colours', 'renderTypes', 'priorities', 'alphas', 'flabels', 'textures'].every(k => sameArr(a[k], b[k]));
}

// ---- animation labels. Worn models move with the player skeleton through their vertex labels. The
// 377 player skeleton (the animset holding human_ready's frames) knows labels 0-156; OSRS added more.
// A vertex with a label 377 lacks would never move, so it takes the label of its nearest vertex
// that has a known label, or, when the model has none (e.g. the dragonfire shield, all label 161),
// the known label that shares the most OSRS player-skeleton groups (skeleton index 1, group 0).
function readBase(file) {
    const b = fs.readFileSync(file);
    const p = b.length - 8;
    const headLen = b.readUInt16BE(p);
    let q = headLen + 2 + b.readUInt16BE(p + 2) + b.readUInt16BE(p + 4) + b.readUInt16BE(p + 6);
    const count = b[q++];
    const types = [...b.subarray(q, q + count)];
    q += count;
    const groups = [];
    for (let i = 0; i < count; i++) {
        const n = b[q++];
        groups.push([...b.subarray(q, q + n)]);
        q += n;
    }
    const frames = [];
    for (let i = 0, r = 2, total = b.readUInt16BE(0); i < total; i++, r += 3) frames.push(b.readUInt16BE(r));
    return { types, groups, frames };
}
function playerBase377() {
    const seq = fs.readFileSync(path.join(CONTENT, 'scripts/_unpack/377/all.seq'), 'utf8');
    const frame = Number(seq.match(/\[human_ready\]\s*\nframe1=anim_(\d+)/)[1]);
    for (const f of fs.readdirSync(path.join(CONTENT, 'models')).filter(f => f.endsWith('.anim'))) {
        const base = readBase(path.join(CONTENT, 'models', f));
        if (base.frames.includes(frame)) return base;
    }
    throw new Error('377 player skeleton not found');
}
let labelMap = null; // osrs-only label -> 377 label (by skeleton groups)
let known377 = null;
async function osrsLabelMap() {
    if (labelMap) return labelMap;
    const base = playerBase377();
    known377 = new Set([...base.groups.flat(), 255]); // 377 worn models use 255 for parts that never move
    const data = await osrsCache.read(1, 0);
    let r = 0;
    const count = data[r++];
    const types = [...data.subarray(r, r + count)];
    r += count;
    const sizes = [...data.subarray(r, r + count)];
    r += count;
    const groups = sizes.map(n => {
        const g = [...data.subarray(r, r + n)];
        r += n;
        return g;
    });
    const groupsOf = label => new Set(groups.map((g, i) => (types[i] !== 0 && g.includes(label) ? i : -1)).filter(i => i >= 0));
    labelMap = new Map();
    for (const label of new Set(groups.flat())) {
        if (known377.has(label)) continue;
        const mine = groupsOf(label);
        let best = -1;
        let bestScore = -1;
        for (const k of [...known377].sort((a, b) => a - b)) {
            const theirs = groupsOf(k);
            let inter = 0;
            for (const g of mine) if (theirs.has(g)) inter++;
            const score = inter / (mine.size + theirs.size - inter || 1);
            if (score > bestScore) {
                bestScore = score;
                best = k;
            }
        }
        labelMap.set(label, best);
    }
    return labelMap;
}
async function remapLabels(m) {
    if (!m.vlabels) return 0;
    const map = await osrsLabelMap();
    const known = [];
    for (let i = 0; i < m.vertexCount; i++) if (known377.has(m.vlabels[i])) known.push(i);
    let changed = 0;
    const labels = Int32Array.from(m.vlabels);
    for (let i = 0; i < m.vertexCount; i++) {
        if (known377.has(m.vlabels[i])) continue;
        let label = map.get(m.vlabels[i]) ?? 0;
        let bestDist = Infinity;
        for (const j of known) {
            const d = (m.vx[i] - m.vx[j]) ** 2 + (m.vy[i] - m.vy[j]) ** 2 + (m.vz[i] - m.vz[j]) ** 2;
            if (d < bestDist) {
                bestDist = d;
                label = m.vlabels[j];
            }
        }
        labels[i] = label;
        changed++;
    }
    m.vlabels = labels;
    return changed;
}

let textureColours = null;
async function convertOsrs(m, worn) {
    const relabelled = worn ? await remapLabels(m) : 0;
    if (m.textures && m.textures.some(t => t !== -1)) {
        textureColours ??= await loadTextureColours(osrsCache);
        m.renderTypes ??= new Int32Array(m.faceCount);
        for (let i = 0; i < m.faceCount; i++) {
            if (m.textures[i] !== -1) {
                m.colours[i] = textureColours.get(m.textures[i]) ?? m.colours[i];
                m.renderTypes[i] = m.renderTypes[i] === 0 ? 0 : 1;
            }
        }
    }
    const textured = i => m.textures && m.textures[i] !== -1;
    // OSRS: untextured render type 2 (or alpha 255) is not drawn; type 3 (or alpha 254) is flat
    const hidden = i => !textured(i) && ((m.renderTypes && m.renderTypes[i] === 2) || (m.alphas && m.alphas[i] === 255));
    const out = filterFaces(m, i => !hidden(i));
    out.textures = null;
    if (out.renderTypes) out.renderTypes = out.renderTypes.map(t => (t === 3 || t === 1 ? 1 : 0));
    if (out.priorities) out.priorities = out.priorities.map(p => Math.max(0, Math.min(11, p)));
    out.priority = Math.max(0, Math.min(11, out.priority));
    return { data: encode377(out), model: out, dropped: m.faceCount - out.faceCount, relabelled };
}

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const ROLES = ['model', 'manwear', 'manwear2', 'manwear3', 'womanwear', 'womanwear2', 'womanwear3', 'manhead', 'manhead2', 'womanhead', 'womanhead2'];
const SUFFIX = { model: '', manwear: '_manwear', manwear2: '_manwear2', manwear3: '_manwear3', womanwear: '_womanwear', womanwear2: '_womanwear2', womanwear3: '_womanwear3', manhead: '_manhead', manhead2: '_manhead2', womanhead: '_womanhead', womanhead2: '_womanhead2' };

// ---- per item: source, def, and which models fill which obj fields
const plans = [];
for (const item of CUSTOM_ITEMS) {
    let source = null;
    let def = null;
    let sourceId = null;
    for (const s of sources) {
        const id = s.kind === '317' ? item.id : (item.looks ?? item.osrs);
        const d = id === undefined || id === null ? null : s.objs.get(id);
        if (d && d.model !== undefined && d.name && d.name !== 'null') {
            source = s;
            def = d;
            sourceId = id;
            break;
        }
    }
    if (!source) throw new Error(`item ${item.id}: no source defines it`);
    const roles = Object.fromEntries(ROLES.map(r => [r, def[r]]));
    let manOff = def.manwearOff ?? 0;
    let womanOff = def.womanwearOff ?? 0;
    let recol = def.recol ?? [];
    if (source.kind === 'osrs') {
        // corrections towards the RS2 2007/08 look (customitems.data.mjs)
        if (item.womanwear === 'manwear') {
            roles.womanwear = roles.manwear;
            roles.womanwear2 = roles.manwear2;
            roles.womanwear3 = roles.manwear3;
            womanOff = item.womanwearOff;
        }
        if (item.norecol) recol = [];
        if (item.recol) recol = STANDIN_RECOLOURS[item.recol];
    }
    // empty placeholder models (e.g. 596 under the BA icons) add nothing: drop them
    for (const group of [['manwear', 'manwear2', 'manwear3'], ['womanwear', 'womanwear2', 'womanwear3'], ['manhead', 'manhead2'], ['womanhead', 'womanhead2']]) {
        const kept = [];
        for (const role of group) {
            if (roles[role] !== undefined && (await sourceModel(source, roles[role])).faceCount > 0) kept.push(roles[role]);
        }
        group.forEach((role, i) => (roles[role] = kept[i]));
    }
    for (const id of Object.values(roles)) if (id !== undefined) await sourceModel(source, id);
    plans.push({ item, source, sourceId, def, roles, manOff, womanOff, recol });
}

// ---- model names: first use (in source item order) names each model
const modelNames = new Map(); // `${kind}:${id}` -> name
const modelInfo = {};
const written = new Set();
fs.mkdirSync(OUT_DIR, { recursive: true });
// models some item wears (their animation labels matter)
const wornKeys = new Set(plans.flatMap(p => ROLES.filter(r => r.includes('wear') && p.roles[r] !== undefined).map(r => `${p.source.kind}:${p.roles[r]}`)));
const ordered = [...plans].sort((a, b) => a.source.kind.localeCompare(b.source.kind) || a.sourceId - b.sourceId || a.item.id - b.item.id);
for (const plan of ordered) {
    for (const role of ROLES) {
        const id = plan.roles[role];
        const key = `${plan.source.kind}:${id}`;
        if (id === undefined || modelNames.has(key)) continue;
        const m = await sourceModel(plan.source, id);
        // reuse the 377 model when the source model with the same id is identical
        const lcName = pack.get(id);
        if (lcName && lcFiles.has(lcName) && !inOutDir(lcFiles.get(lcName))) {
            const data = fs.readFileSync(lcFiles.get(lcName));
            if (data.length && identical(decode(data), m)) {
                modelNames.set(key, lcName);
                modelInfo[lcName] = { from: key, reused377: true };
                continue;
            }
        }
        let name = `obj_${slug(plan.def.name)}${SUFFIX[role]}`;
        if (isForeign(name) || written.has(name)) name = `${name}_${plan.source.kind}${id}`;
        modelNames.set(key, name);
        let out;
        if (plan.source.kind === '317' && !(m.textures && m.textures.some(t => t >= 50))) {
            out = { data: decoded.get(key).raw, model: m, dropped: 0 }; // already the 377 format, as players saw it
        } else {
            out = await convertOsrs(structuredClone(m), wornKeys.has(key));
        }
        fs.writeFileSync(path.join(OUT_DIR, `${name}.ob2`), out.data);
        written.add(name);
        modelInfo[name] = { from: key, vertices: out.model.vertexCount, faces: out.model.faceCount, ...(out.dropped ? { droppedFaces: out.dropped } : {}), ...(out.relabelled ? { relabelledVertices: out.relabelled } : {}) };
    }
}

// remove stale converted models
for (const f of fs.readdirSync(OUT_DIR)) {
    if (f.endsWith('.ob2') && !written.has(path.basename(f, '.ob2'))) {
        fs.unlinkSync(path.join(OUT_DIR, f));
        console.log(`removed stale ${f}`);
    }
}

// register new model names
let next = Math.max(...pack.keys()) + 1;
let added = 0;
for (const name of written) {
    if (!packNames.has(name)) {
        pack.set(next, name);
        packNames.set(name, next);
        next++;
        added++;
    }
}
if (added) {
    fs.writeFileSync(MODEL_PACK, [...pack.keys()].sort((a, b) => a - b).map(id => `${id}=${pack.get(id)}`).join('\n') + '\n');
}

// ---- recolours as obj configs write them (rgb15 unless both values are < 100)
function recolours(pairs, keys) {
    const present = new Set();
    for (const key of keys) for (const c of decoded.get(key).model.colours) present.add(c);
    const out = [];
    for (const [s, d] of pairs) {
        if (!present.has(s)) continue; // a recolour of a colour the models lack does nothing
        if (s < 100 && d < 100) {
            out.push([s, d]);
            continue;
        }
        if (!isReachable(s)) throw new Error(`recolour source ${s} cannot be written as rgb15`);
        out.push([toRgb15(s), toRgb15(isReachable(d) ? d : nearestReachable(d))]);
    }
    return out;
}

const items = {};
for (const plan of plans) {
    const { item, def, roles, source } = plan;
    const e = { source: `${source.kind}:${plan.sourceId}`, standin: source.kind === 'osrs' && item.looks !== undefined };
    if (source.kind === '317') {
        // the client's own text
        e.name = def.name;
        if (def.desc) e.desc = def.desc;
        if (def.iop) e.iop = [...def.iop].map(v => v ?? null);
    }
    const name = role => modelNames.get(`${source.kind}:${roles[role]}`);
    e.model = name('model');
    for (const [k, v] of [['2dzoom', def.zoom2d], ['2dxan', def.xan2d], ['2dyan', def.yan2d], ['2dzan', def.zan2d], ['2dxof', def.xof2d], ['2dyof', def.yof2d], ['resizex', def.resizex], ['resizey', def.resizey], ['resizez', def.resizez], ['ambient', def.ambient], ['contrast', def.contrast]]) {
        if (v !== undefined) e[k] = v;
    }
    if (roles.manwear !== undefined) e.manwear = [name('manwear'), plan.manOff];
    for (const k of ['manwear2', 'manwear3']) if (roles[k] !== undefined) e[k] = name(k);
    if (roles.womanwear !== undefined) e.womanwear = [name('womanwear'), plan.womanOff];
    for (const k of ['womanwear2', 'womanwear3', 'manhead', 'manhead2', 'womanhead', 'womanhead2']) if (roles[k] !== undefined) e[k] = name(k);
    const recol = recolours(plan.recol, Object.values(roles).filter(v => v !== undefined).map(id => `${source.kind}:${id}`));
    if (recol.length) e.recol = recol;
    e.members = def.members === true;
    items[item.id] = e;
}

const used = sources.filter(s => plans.some(p => p.source === s)).map(s => `${s.kind} ${s.label}`);
fs.writeFileSync(MANIFEST, JSON.stringify({ sources: used, items, models: modelInfo }, null, 2) + '\n');
const reused = Object.values(modelInfo).filter(m => m.reused377).length;
const by = kind => plans.filter(p => p.source.kind === kind).length;
console.log(`${plans.length} items (${by('317')} from the 317 cache, ${by('osrs')} from OSRS), ${written.size} models written (${added} new model.pack ids), ${reused} reused from 377`);
