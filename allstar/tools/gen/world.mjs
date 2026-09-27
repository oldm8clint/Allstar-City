// World population. Allstar-Scape's world held only the NPCs in autospawn.cfg
// (NPCHandler.loadAutoSpawn) and no static ground items (drops.cfg loading is commented out in
// ItemHandler), so Allstar-City owns every map square's NPC and OBJ section.
export default function world({ legacy, packs, maps, report }) {
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

    report(`NPC spawns: ${placed} placed, ${skipped.length} skipped`, ...skipped.map(s => `  - ${s}`));
}
