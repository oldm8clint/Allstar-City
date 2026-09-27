// World object edits from client.NewObjects, client.Deleteobjects and client.Deletewalls
// (allstar/spec/objects_buttons.md section 1, appendices A and B).
//
// Allstar-Scape sent these edits to a player's client after every map region load. The 317 client
// applied them on the plane the player stood on, so Allstar-City applies them on all four levels
// (allstar/QUIRKS.md Q3 relies on the custom objects existing on upper floors).
//
// makeGlobalObject(x, y, id, face, type) -> createNewTileObject: type 10, rotation face & 3
// (0 -> 0, -1 -> 3, -2 -> 2, -3 -> 1). The 317 client replaces the loc of the same class on the
// tile (class 0 = shapes 0-3 walls, 1 = 4-8 wall decoration, 2 = 9-21 scenery and roofs,
// 3 = 22 ground decoration), so a placement removes the Lost City loc of that class first.
// deletethatobject(x, y) / deletethatwall(x, y) remove the class 2 / class 0 loc of the tile and put
// the invisible loc 6951 there; only the removal is reproduced (6951 has no model and no handler).
// Removals ran after the placements, so a removal also cancels a placement of its class.
//
// Roofs (shapes 12-21, class 2 in the 317 client) are never removed: a player standing on level 0
// never lost the roof above, and roofs only exist on levels 1-3.
import fs from 'fs';
import path from 'path';

import { Pack } from '../lib/pack.mjs';

const LEVELS = [0, 1, 2, 3];

const isRoof = shape => shape >= 12 && shape <= 21;

function shapeClass(shape) {
    if (shape <= 3) {
        return 0;
    }
    if (shape <= 8) {
        return 1;
    }
    if (shape <= 21) {
        return 2;
    }
    return 3;
}

// Lines of a Java method body, from its declaration to its closing brace.
function methodBody(lines, name) {
    const declaration = new RegExp('^\\s*public \\w+ ' + name + '\\(');
    const start = lines.findIndex(line => declaration.test(line));
    if (start === -1) {
        throw new Error(`client.java: method ${name} not found`);
    }
    const body = [];
    let depth = 0;
    let opened = false;
    for (let i = start; i < lines.length; i++) {
        const line = lines[i];
        for (const c of line) {
            if (c === '{') {
                depth++;
                opened = true;
            } else if (c === '}') {
                depth--;
            }
        }
        body.push({ line: i + 1, text: line });
        if (opened && depth === 0) {
            break;
        }
    }
    return body;
}

const code = text => text.replace(/\/\/.*$/, '');

export default function objects(ctx) {
    const lines = fs.readFileSync(ctx.legacy.file('client.java'), 'latin1').split(/\r?\n/);
    worldEdits(ctx, lines);
    smithing(ctx, lines);
}

function worldEdits({ packs, maps, report }, lines) {
    const placements = [];
    for (const { line, text } of methodBody(lines, 'NewObjects')) {
        const match = /makeGlobalObject\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/.exec(code(text));
        if (match) {
            const [x, z, id, face, type] = match.slice(1).map(Number);
            placements.push({ line, x, z, id, face, type, angle: face & 3, cls: shapeClass(type) });
        }
    }

    const removals = [];
    for (const name of ['Deleteobjects', 'Deletewalls']) {
        for (const { line, text } of methodBody(lines, name)) {
            const match = /deletethat(object|wall)\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/.exec(code(text));
            if (match) {
                const type = match[1] === 'object' ? 10 : 0;
                removals.push({ line, fn: name, x: Number(match[2]), z: Number(match[3]), type, cls: shapeClass(type) });
            }
        }
    }

    // Final client-side state per tile and class: later placements overwrite earlier ones,
    // removals (sent after NewObjects) clear their class.
    const tiles = new Map();
    const key = (x, z, cls) => `${x},${z},${cls}`;
    let duplicates = 0;
    const overwritten = [];
    for (const p of placements) {
        const k = key(p.x, p.z, p.cls);
        const previous = tiles.get(k);
        if (previous) {
            if (previous.id === p.id && previous.angle === p.angle && previous.type === p.type) {
                duplicates++;
            } else {
                overwritten.push(`client.java:${previous.line} ${previous.id} at ${p.x},${p.z} replaced by client.java:${p.line} ${p.id}`);
            }
        }
        tiles.set(k, { ...p, remove: false });
    }
    const cancelled = [];
    for (const r of removals) {
        const k = key(r.x, r.z, r.cls);
        const previous = tiles.get(k);
        if (previous && !previous.remove) {
            cancelled.push(`client.java:${previous.line} ${previous.id} at ${r.x},${r.z} removed again by client.java:${r.line}`);
        }
        tiles.set(k, { ...r, remove: true });
    }

    const skipped = [];
    const replaced = [];
    const deleted = [];
    const missed = [];
    let placed = 0;
    for (const t of tiles.values()) {
        if (!maps.has(t.x, t.z)) {
            skipped.push(`client.java:${t.line} ${t.remove ? `${t.fn} type ${t.type}` : `loc ${t.id}`} at ${t.x},${t.z}: no map square`);
            continue;
        }
        let removedHere = 0;
        const affected = data => {
            const shape = Number(data.split(' ')[1] ?? 10);
            return shapeClass(shape) === t.cls && !isRoof(shape);
        };
        for (const level of LEVELS) {
            for (const e of maps.entries('LOC', level, t.x, t.z).filter(e => affected(e.data))) {
                const [id, shape = '10'] = e.data.split(' ');
                const label = `${level} ${t.x},${t.z} ${id} ${packs.loc.name(Number(id)) ?? '?'} shape ${shape}`;
                (t.remove ? deleted : replaced).push(t.remove ? label : `${label} -> ${t.id}`);
            }
            removedHere += maps.remove('LOC', level, t.x, t.z, affected);
            if (!t.remove) {
                if (packs.loc.name(t.id) === undefined) {
                    throw new Error(`client.java:${t.line} loc ${t.id} does not exist`);
                }
                maps.add('LOC', level, t.x, t.z, t.angle === 0 ? `${t.id} ${t.type}` : `${t.id} ${t.type} ${t.angle}`);
            }
        }
        if (t.remove && removedHere === 0) {
            missed.push(`client.java:${t.line} ${t.fn} type ${t.type} at ${t.x},${t.z}: no loc of that class on any level`);
        }
        if (!t.remove) {
            placed++;
        }
    }

    report(
        `World objects: ${placements.length} placements (${duplicates} exact duplicates, ${overwritten.length} overwritten, ${cancelled.length} removed again), ${removals.length} removals`,
        `  ${placed} tiles placed on levels 0-3, ${skipped.length} skipped`,
        ...skipped.map(s => `  - skipped ${s}`),
        ...overwritten.map(s => `  - overwritten ${s}`),
        ...cancelled.map(s => `  - cancelled ${s}`),
        `  Lost City locs replaced by placements (${replaced.length}):`,
        ...replaced.map(s => `    ${s}`),
        `  Lost City locs removed by Deleteobjects/Deletewalls (${deleted.length}):`,
        ...deleted.map(s => `    ${s}`),
        ...missed.map(s => `  - no effect: ${s}`)
    );
}

// ---- Anvil smithing (client.initSmithing, removeBar, canSmith: allstar/spec/objects_buttons.md 5) ----
//
// initSmithing(bar) is a long list of sendQuest(text, child) calls under level and bar-count
// conditions, plus addItemToSmith(item, slot, column, amount) for the five item columns. It is
// translated line by line into [proc,allstar_smithing_frame] (component names from interface.pack) and
// one static inventory per bar and column. Every addItemToSmith frame also emptied slot 4 of its
// column (a malformed frame 34), so slot 4 only holds an item when a call sets it explicitly.
// removeBar(item) and canSmith(item) become enums; canSmith's `a || b && level >= n` conditions let
// every item but the last of a line through at any level.
function smithing({ content, packs, report, writeGenerated }, lines) {
    const components = new Pack(path.join(content, 'pack/interface.pack'));
    const obj = id => {
        const name = packs.obj.name(id);
        if (name === undefined) {
            throw new Error(`smithing: obj ${id} does not exist`);
        }
        return name;
    };
    const component = child => {
        const name = components.name(child);
        if (name === undefined || !name.startsWith('smithing:')) {
            throw new Error(`smithing: component ${child} is not part of the smithing interface`);
        }
        return name;
    };

    const out = ['// client.initSmithing(barType) (client.java L6983)', '[proc,allstar_smithing_frame](obj $bar)'];
    const invs = new Map(); // bar name -> column -> slot -> [item, amount]
    let indent = 0;
    let bar = null;
    let barDepth = -1;
    let depth = 0;
    const emit = s => out.push('    '.repeat(indent) + s);
    const body = methodBody(lines, 'initSmithing').slice(1, -1);
    for (const { line, text } of body) {
        const src = code(text).trim();
        if (src === '' || src.startsWith('outStream.')) {
            continue;
        }
        let m;
        if ((m = /^if \(barType == (\d+)\) \{$/.exec(src))) {
            bar = obj(Number(m[1]));
            barDepth = depth;
            emit(`if ($bar = ${bar}) {`);
            indent++;
            depth++;
        } else if ((m = /^if \(amountOfItem\(barType\) < (\d+)\) \{$/.exec(src))) {
            emit(`if (inv_total(inv, $bar) < ${m[1]}) {`);
            indent++;
            depth++;
        } else if ((m = /^if \(playerLevel\[13\] < (\d+)\) \{$/.exec(src))) {
            emit(`if (stat(smithing) < ${m[1]}) {`);
            indent++;
            depth++;
        } else if (src === '} else {') {
            indent--;
            emit('} else {');
            indent++;
        } else if (src === '}') {
            indent--;
            depth--;
            emit('}');
            if (depth === barDepth) {
                bar = null;
                barDepth = -1;
            }
        } else if ((m = /^sendQuest\("(.*)", (\d+)\);$/.exec(src))) {
            emit(`if_settext(${component(Number(m[2]))}, "${m[1]}");`);
        } else if ((m = /^addItemToSmith\((\d+), (\d+), (\d+), (\d+)\);$/.exec(src))) {
            if (bar === null) {
                throw new Error(`client.java:${line} addItemToSmith outside a bar block`);
            }
            const column = Number(m[3]) - 1118;
            const columns = invs.get(bar) ?? new Map();
            invs.set(bar, columns);
            const slots = columns.get(column) ?? new Map();
            columns.set(column, slots);
            slots.set(Number(m[2]), [obj(Number(m[1])), Number(m[4])]);
        } else {
            throw new Error(`client.java:${line} initSmithing: cannot translate "${src}"`);
        }
    }
    if (depth !== 0) {
        throw new Error(`initSmithing: unbalanced braces (${depth})`);
    }

    // the item columns, then the interface itself
    for (const [name] of invs) {
        out.push(`if ($bar = ${name}) {`);
        for (let column = 1; column <= 5; column++) {
            out.push(`    inv_transmit(allstar_smith_${name}_${column}, smithing:column${column});`);
        }
        out.push('}');
    }

    const inv = [];
    for (const [name, columns] of invs) {
        for (let column = 1; column <= 5; column++) {
            inv.push(`[allstar_smith_${name}_${column}]`, 'size=5');
            const slots = columns.get(column) ?? new Map();
            for (const [slot, [item, amount]] of [...slots].sort((a, b) => a[0] - b[0])) {
                inv.push(`stock${slot + 1}=${item},${amount}`);
            }
            inv.push('');
        }
    }

    // removeBar(item): the first matching line wins
    const removeBar = new Map();
    const barText = methodBody(lines, 'removeBar').map(l => code(l.text)).join(' ');
    for (const m of barText.matchAll(/if\s*\(([^{]*?)\)\s*\{\s*return (\d+);/g)) {
        for (const id of [...m[1].matchAll(/removeID == (\d+)/g)].map(x => Number(x[1]))) {
            if (!removeBar.has(id)) {
                removeBar.set(id, Number(m[2]));
            }
        }
    }
    // canSmith(item): lowest level of any line naming the item; 0 = no level check
    const canSmith = new Map();
    const smithText = methodBody(lines, 'canSmith').map(l => code(l.text)).join(' ');
    for (const m of smithText.matchAll(/if\s*\(([^{]*?)\)\s*\{\s*return true;/g)) {
        const level = /playerLevel\[13\] >= (\d+)/.exec(m[1]);
        const ids = [...m[1].matchAll(/item == (\d+)/g)].map(x => Number(x[1]));
        ids.forEach((id, i) => {
            const needs = level && i === ids.length - 1 ? Number(level[1]) : 0;
            canSmith.set(id, Math.min(canSmith.get(id) ?? Infinity, needs));
        });
    }

    const enums = ['[allstar_smith_bar]', 'inputtype=obj', 'outputtype=obj', 'default=null'];
    const skipped = [];
    for (const [item, barId] of removeBar) {
        if (packs.obj.name(item) === undefined || packs.obj.name(barId) === undefined) {
            skipped.push(`removeBar ${item} -> ${barId}`);
            continue;
        }
        enums.push(`val=${obj(item)},${obj(barId)}`);
    }
    enums.push('', '[allstar_smith_level]', 'inputtype=obj', 'outputtype=int', 'default=1000');
    for (const [item, level] of canSmith) {
        if (packs.obj.name(item) === undefined) {
            skipped.push(`canSmith ${item} (level ${level})`);
            continue;
        }
        enums.push(`val=${obj(item)},${level}`);
    }
    // the columns hold obj; inv_add wants namedobj
    enums.push('', '[allstar_smith_product]', 'inputtype=obj', 'outputtype=namedobj', 'default=null');
    const products = new Set();
    for (const columns of invs.values()) {
        for (const slots of columns.values()) {
            for (const [item] of slots.values()) {
                products.add(item);
            }
        }
    }
    for (const item of products) {
        enums.push(`val=${item},${item}`);
    }

    writeGenerated('objects/scripts/smithing_frame.rs2', out);
    writeGenerated('objects/configs/smithing.inv', inv);
    writeGenerated('objects/configs/smithing.enum', enums);
    report(
        `Smithing: ${invs.size} bars, ${products.size} column items, ${removeBar.size} removeBar and ${canSmith.size} canSmith entries`,
        ...skipped.map(s => `  - skipped (custom item) ${s}`)
    );
}
