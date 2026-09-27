// NPC dialogue and clue scroll data (npcs workstream).
//
// - allstar_npc_name: client.GetNpcName, the raw npc.cfg name (underscores kept) used in chat headers.
// - allstar_clue_item_name: client.GetItemName for every clue reward, as listed on the reward scroll.
// - allstar_clue_<pool>: Clues.java reward arrays; duplicates are kept because they weight the rolls.
import fs from 'fs';

// Moparscape cfg rows: "key = a<TAB>b<TAB>..." with runs of tabs collapsed, split on tabs.
function rows(file, key) {
    const out = [];
    for (const raw of fs.readFileSync(file, 'latin1').split(/\r?\n/)) {
        const line = raw.trim();
        const eq = line.indexOf('=');
        if (eq === -1 || line.slice(0, eq).trim() !== key) {
            continue;
        }
        out.push(line.slice(eq + 1).trim().replace(/\t+/g, '\t').split('\t'));
    }
    return out;
}

// First entry wins, as the Java lookups scan their lists in file order.
function firstNames(file, key, transform) {
    const names = new Map();
    for (const tokens of rows(file, key)) {
        const id = Number(tokens[0]);
        if (!names.has(id) && tokens[1] !== undefined) {
            names.set(id, transform(tokens[1]));
        }
    }
    return names;
}

function clueArrays(file) {
    const text = fs.readFileSync(file, 'latin1');
    const arrays = new Map();
    for (const match of text.matchAll(/public static int (\w+)\[\]\s*=\s*\{([^}]*)\}/g)) {
        arrays.set(match[1], match[2].split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n)));
    }
    return arrays;
}

export default function npcs({ legacy, packs, writeGenerated, report }) {
    const lines = [];

    const npcNames = firstNames(legacy.file('npc.cfg'), 'npc', name => name);
    lines.push('[allstar_npc_name]', 'inputtype=npc', 'outputtype=string');
    let named = 0;
    for (const [id, name] of [...npcNames].sort((a, b) => a[0] - b[0])) {
        const debugname = packs.npc.name(id);
        if (debugname === undefined) {
            continue;
        }
        lines.push(`val=${debugname},${name}`);
        named++;
    }
    lines.push('');

    const itemNames = firstNames(legacy.file('item.cfg'), 'item', name => name.replace(/_/g, ' '));
    const arrays = clueArrays(legacy.file('Clues.java'));
    const pools = ['clue1', 'clue2', 'clue3', 'nonclue1', 'nonclue2', 'nonclue3', 'runes1', 'runes2', 'runes3'];
    const rewardIds = new Set();
    for (const pool of pools) {
        const ids = arrays.get(pool);
        if (!ids) {
            throw new Error(`Clues.java has no ${pool} array`);
        }
        lines.push(`[allstar_clue_${pool}]`, 'inputtype=autoint', 'outputtype=namedobj');
        for (const id of ids) {
            const debugname = packs.obj.name(id);
            if (debugname === undefined) {
                throw new Error(`clue reward ${id} (${pool}) is not in the obj pack`);
            }
            lines.push(`val=${debugname}`);
            rewardIds.add(id);
        }
        lines.push('');
    }

    lines.push('[allstar_clue_item_name]', 'inputtype=namedobj', 'outputtype=string');
    for (const id of [...rewardIds].sort((a, b) => a - b)) {
        const name = itemNames.get(id) ?? `!! NOT EXISTING ITEM !!! - ID:${id}`;
        lines.push(`val=${packs.obj.name(id)},${name}`);
    }

    writeGenerated('configs/npcs.enum', lines);
    report(`NPC names: ${named} npc.cfg names; clue rewards: ${rewardIds.size} items in ${pools.length} pools`);
}
