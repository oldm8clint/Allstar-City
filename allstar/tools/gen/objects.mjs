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

// Lines of a Java method body, from `public void name()` to its closing brace.
function methodBody(lines, name) {
    const start = lines.findIndex(line => line.includes(`public void ${name}()`));
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

export default function objects({ legacy, packs, maps, report }) {
    const lines = fs.readFileSync(legacy.file('client.java'), 'latin1').split(/\r?\n/);

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
