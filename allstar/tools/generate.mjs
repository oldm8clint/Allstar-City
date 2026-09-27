// Generates Allstar-City content from the original Allstar-Scape v2 sources in allstar/legacy.
//
//   node allstar/tools/generate.mjs
//
// Re-runnable: map edits are tracked in allstar/generated/maps-manifest.json and generated
// config/script files are rewritten on every run.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { Legacy } from './lib/legacy.mjs';
import { MapEditor } from './lib/mapedit.mjs';
import { Pack } from './lib/pack.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CONTENT = path.join(ROOT, 'content');
const GENERATED = path.join(ROOT, 'allstar/generated');

const legacy = new Legacy(path.join(ROOT, 'allstar/legacy'));
const packs = {
    npc: new Pack(path.join(CONTENT, 'pack/npc.pack')),
    obj: new Pack(path.join(CONTENT, 'pack/obj.pack')),
    loc: new Pack(path.join(CONTENT, 'pack/loc.pack')),
    inv: new Pack(path.join(CONTENT, 'pack/inv.pack'))
};

fs.mkdirSync(GENERATED, { recursive: true });
const report = [];

// ---- world population ------------------------------------------------------------------------
// Allstar-Scape's world held only the NPCs in autospawn.cfg (NPCHandler.loadAutoSpawn) and no
// static ground items (drops.cfg loading is commented out in ItemHandler), so Allstar-City owns
// every map square's NPC and OBJ section.
function populateWorld(maps) {
    maps.clear('NPC');
    maps.clear('OBJ');

    let placed = 0;
    const skipped = [];
    for (const spawn of legacy.spawns()) {
        if (packs.npc.name(spawn.npc) === undefined) {
            skipped.push(`autospawn.cfg:${spawn.line} npc ${spawn.npc} does not exist`);
            continue;
        }
        if (!maps.has(spawn.x, spawn.z)) {
            skipped.push(`autospawn.cfg:${spawn.line} npc ${spawn.npc} at ${spawn.x},${spawn.z} is outside the map`);
            continue;
        }
        maps.add('NPC', spawn.level, spawn.x, spawn.z, String(spawn.npc), false);
        placed++;
    }

    // itemspawnpoints.java: god capes that reappear under the Wilderness
    for (const [obj, x] of [[2414, 3118], [2412, 3119], [2413, 3120]]) {
        maps.add('OBJ', 0, x, 9848, `${obj} 1`, false);
    }

    report.push(`NPC spawns: ${placed} placed, ${skipped.length} skipped`, ...skipped.map(s => `  - ${s}`));
}

const maps = new MapEditor(path.join(CONTENT, 'maps'), path.join(GENERATED, 'maps-manifest.json'));
populateWorld(maps);
maps.save();

for (const pack of Object.values(packs)) {
    pack.save();
}

fs.writeFileSync(path.join(GENERATED, 'report.txt'), report.join('\n') + '\n');
console.log(report.join('\n'));
