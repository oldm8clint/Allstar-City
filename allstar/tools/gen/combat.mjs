// Combat data from the original Allstar-Scape v2 sources:
// - NPC hitpoints from npc.cfg (NPCHandler.loadNPCList; the engine applies them, see
//   engine/src/engine/AllstarCombat.ts)
// - per-spawn random walk boxes from autospawn.cfg (NPCHandler.process / IsInRange)
// - drop tables: every Item*.random<Name>() array used by NPCHandler.MonsterDropItem and friends
// - the nonWild() safe rectangles (client.java)
//
// Items that do not exist yet (Allstar ids >= 7956 are added later as allstar_item_<id> by the
// custom items work, and a few ids Allstar-Scape never defined) keep their slot in a table as
// "nothing" so the odds of every other entry stay exact; rerunning the generator fills them in.
import fs from 'fs';
import path from 'path';

// ---- helpers ----

const LINES = /\r?\n/;
const TABS = /\t+/;

function javaArrays(file) {
    const text = fs.readFileSync(file, 'latin1').replace(/\/\/.*$/gm, '');
    const arrays = new Map();
    const re = /public\s+static\s+int\s+(\w+)\s*\[\]\s*=\s*\{([^}]*)\}/g;
    for (let m; (m = re.exec(text)); ) {
        const values = m[2]
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .map(Number);
        arrays.set(m[1], values);
    }
    const randoms = new Map();
    const fre = /public\s+static\s+int\s+(random\w*)\s*\(\s*\)\s*\{\s*return\s+(\w+)\s*\[/g;
    for (let m; (m = fre.exec(text)); ) {
        randoms.set(m[1], m[2]);
    }
    return { arrays, randoms };
}

function coordLiteral(level, x, z) {
    return `${level}_${x >> 6}_${z >> 6}_${x & 63}_${z & 63}`;
}

// ---- drop tables ----

// Item class + random function used for NPC drops (NPCHandler.MonsterDropItem) and the Chaos
// Elemental / wishing well style tables other systems may reuse.
const DROP_TABLES = [
    ['Item3', 'randomguard'],
    ['Item3', 'randomhero'],
    ['Item3', 'randomguardz'],
    ['Item2', 'randomSilvchest'],
    ['Item2', 'randomKQ'],
    ['Item2', 'randomtroll'],
    ['Item2', 'randomchicken'],
    ['Item2', 'randomskeleton'],
    ['Item2', 'randomcrawlinghand'],
    ['Item2', 'randomcavebug'],
    ['Item2', 'randomjelly'],
    ['Item2', 'randomaberrantspecter'],
    ['Item2', 'randomabyssaldemon'],
    ['Item2', 'randomdarkbeast'],
    ['Item2', 'randomunicorn'],
    ['Item2', 'randombattlemagesara'],
    ['Item2', 'randombattlemagezammy'],
    ['Item2', 'randombattlemageguthix'],
    ['Item2', 'randomrat'],
    ['Item2', 'randomsoldier'],
    ['Item2', 'randomogre'],
    ['Item2', 'randombarbarian'],
    ['Item2', 'randomFlambeed'],
    ['Item2', 'randomJogre'],
    ['Item2', 'randomArzinian_Being_of_Bordanzan'],
    ['Item2', 'randomSkeleton_Hellhound'],
    ['Item2', 'randomBlack_Demon'],
    ['Item2', 'randomIce_giant'],
    ['Item2', 'randomAgrith_Naar'],
    ['Item2', 'randomDagannoth_Supreme'],
    ['Item2', 'randomDagannoth_Prime'],
    ['Item2', 'randomDagannoth_Rex'],
    ['Item2', 'randomKBD'],
    ['Item2', 'randomDharok'],
    ['Item2', 'randomVerac'],
    ['Item2', 'randomTorag'],
    ['Item2', 'randomKaril'],
    ['Item2', 'randomGuthan'],
    ['Item2', 'randomAhrim'],
    ['Item2', 'randomwell'],
    ['Item', 'randomSlayeritem65'],
    ['Item', 'randomSlayeritem75'],
    ['Item', 'randomSlayer99item']
];

// Allstar item ids the combat scripts test (weapons, armour sets, rings, ammo, runes, staves). Scripts
// turn a worn/held obj into its Allstar id with ~allstar_objid and switch on the numbers used by
// client.java; custom items (>= 7956) resolve once allstar_item_<id> exists.
const COMBAT_OBJ_IDS = [
    // GetWepAnim / GetBlockAnim / GetPlrBlockAnim
    4151, 8447, 868, 6527, 6541, 15156, 1305, 15334, 15336, 14915, 6739, 1321, 1323, 1325, 1327, 1329, 1333, 4587, 746, 3204, 6818,
    3202, 15333, 15335, 4214, 859, 861, 6724, 4153, 6528, 5018, 3101, 7449, 1377, 1373, 1434, 5730, 4718, 4726, 4747, 4755, 4734,
    837, 10431, 1215, 1231, 5680, 5698, 6609, 1307, 1309, 1311, 1313, 1315, 1317, 1319, 7158, 1419, 4566, 10229, 1171, 1185, 1187,
    1191, 1201, 2659, 2667, 2675, 3122, 3488, 4156, 6524,
    // bows and ammo (CheckArrows 880..892)
    839, 841, 843, 845, 847, 849, 851, 853, 855, 857, 880, 882, 884, 886, 888, 890, 892,
    // specials, Dharok set, one-hit weapons (QUIRKS Q4/Q5), rings, staves
    47, 282, 4716, 4720, 4722, 747, 2570, 1381, 1397, 1405, 4675, 2415
];

export default function combat({ legacy, packs, report, writeGenerated }) {
    // ---- npc.cfg hitpoints ----
    // NPCHandler.GetNpcListHP returns the first row for an id; 0 or missing means 3000 (newNPC).
    const hp = [];
    const seen = new Set();
    const text = fs.readFileSync(legacy.file('npc.cfg'), 'latin1');
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line.startsWith('npc') || line.indexOf('=') === -1 || line.slice(0, line.indexOf('=')).trim() !== 'npc') {
            continue;
        }
        const tokens = line.slice(line.indexOf('=') + 1).trim().split(/\s+/);
        const id = Number(tokens[0]);
        const health = Number(tokens[tokens.length - 1]);
        if (seen.has(id)) {
            continue;
        }
        seen.add(id);
        const name = packs.npc.name(id);
        if (name === undefined || !(health > 0)) {
            continue;
        }
        hp.push(`val=${name},${health}`);
    }
    writeGenerated('combat/configs/npc_hp.enum', [
        '// npc.cfg health (NPCHandler.newNPC: 0 or missing = 3000); read by the engine (NODE_ALLSTAR_COMBAT)',
        '[allstar_npc_hp]',
        'inputtype=npc',
        'outputtype=int',
        'default=3000',
        ...hp
    ]);

    // ---- autospawn.cfg random walk boxes ----
    // NPCHandler.process: random walk only if all four range values are > 0; IsInRange accepts a step
    // onto [X2..X1]x[Y2..Y1] (walk type 1, or 2 = also never onto the Lumbridge fence list, which no
    // wandering spawn is near). Spawns that can never take a step from their spawn tile are left out.
    const min = [];
    const max = [];
    const boxes = new Map();
    let wanderers = 0;
    for (const s of legacy.spawns()) {
        if (!(s.rx1 > 0 && s.rz1 > 0 && s.rx2 > 0 && s.rz2 > 0) || (s.walk !== 1 && s.walk !== 2)) {
            continue;
        }
        let canStep = false;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const nx = s.x + dx;
                const nz = s.z + dz;
                if ((dx !== 0 || dz !== 0) && nx <= s.rx1 && nx >= s.rx2 && nz <= s.rz1 && nz >= s.rz2) {
                    canStep = true;
                }
            }
        }
        if (!canStep) {
            continue;
        }
        const key = coordLiteral(s.level, s.x, s.z);
        const box = `${s.rx2},${s.rz2},${s.rx1},${s.rz1}`;
        if (boxes.has(key)) {
            if (boxes.get(key) !== box) {
                report(`  - combat: autospawn.cfg:${s.line} shares its spawn tile with a different box; first box kept`);
            }
            continue;
        }
        boxes.set(key, box);
        wanderers++;
        min.push(`val=${key},${coordLiteral(0, s.rx2, s.rz2)}`);
        max.push(`val=${key},${coordLiteral(0, s.rx1, s.rz1)}`);
    }
    writeGenerated('combat/configs/npc_wander.enum', [
        '// autospawn.cfg random walk box per spawn tile (level 0 of the corners is unused)',
        '[allstar_npc_wander_min]',
        'inputtype=coord',
        'outputtype=coord',
        'default=null',
        ...min,
        '',
        '[allstar_npc_wander_max]',
        'inputtype=coord',
        'outputtype=coord',
        'default=null',
        ...max
    ]);

    // ---- NPCHandler.getLevelForXP (authentic curve, up to 135; ring of life against NPC hits) ----
    const xp = [];
    let points = 0;
    for (let lvl = 1; lvl <= 135; lvl++) {
        points = Math.trunc(points + Math.floor(lvl + 300.0 * Math.pow(2.0, lvl / 7.0)));
        xp.push(`val=${lvl},${Math.floor(points / 4)}`);
    }
    writeGenerated('combat/configs/rs_xp.enum', [
        '// NPCHandler.getLevelForXP thresholds: level L while xp <= value (authentic curve, not the half curve of players)',
        '[allstar_rs_xp]',
        'inputtype=int',
        'outputtype=int',
        ...xp
    ]);

    // ---- Allstar item ids for the combat scripts ----
    const objIds = [];
    for (const id of [...new Set(COMBAT_OBJ_IDS)].sort((a, b) => a - b)) {
        const name = id < 7956 ? packs.obj.name(id) : packs.obj.id(`allstar_item_${id}`) !== undefined ? `allstar_item_${id}` : undefined;
        if (name) {
            objIds.push(`val=${name},${id}`);
        } else {
            report(`  - combat: item ${id} not defined yet (allstar_item_${id}); ~allstar_objid cannot see it`);
        }
    }
    writeGenerated('combat/configs/obj_id.enum', [
        '// Allstar-Scape item ids of the objs the combat scripts test (~allstar_objid)',
        '[allstar_obj_id]',
        'inputtype=obj',
        'outputtype=int',
        'default=-2',
        ...objIds
    ]);

    // ---- item.cfg shop values below 1 (client.keepItem1-3 only keep items worth > 0) ----
    // GetItemShopValue: the last item.cfg line for the id wins; ids missing from item.cfg are worth 1.
    // item.cfg columns are tab separated (runs of tabs collapse): id, name, desc, col3, col4 (value), ...
    const values = new Map();
    for (const raw of fs.readFileSync(legacy.file('item.cfg'), 'latin1').split(LINES)) {
        const eq = raw.indexOf('=');
        if (!raw.trim().startsWith('item') || eq === -1 || raw.slice(0, eq).trim() !== 'item') {
            continue;
        }
        const cols = raw.slice(eq + 1).trim().split(TABS);
        values.set(Number(cols[0]), Number(cols[4]));
    }
    const worthless = [];
    for (const [id, value] of values) {
        if (Math.floor(value) >= 1) {
            continue;
        }
        const name = id < 7956 ? packs.obj.name(id) : packs.obj.id(`allstar_item_${id}`) !== undefined ? `allstar_item_${id}` : undefined;
        if (name) {
            worthless.push(`val=${name},1`);
        }
    }
    writeGenerated('combat/configs/worthless.enum', [
        '// items with an item.cfg shop value below 1: never kept on death (client.keepItem1-3)',
        '[allstar_item_worthless]',
        'inputtype=obj',
        'outputtype=int',
        'default=0',
        ...worthless
    ]);

    // ---- drop tables ----
    const classes = new Map();
    const missing = new Map();
    const objName = id => {
        if (id < 7956) {
            return packs.obj.name(id);
        }
        const custom = `allstar_item_${id}`;
        return packs.obj.id(custom) !== undefined ? custom : undefined;
    };
    const lines = [
        '// Allstar-Scape drop tables (Item*.java random<Name>(): one uniformly random array element).',
        '// "nothing" entries are items not defined yet; they keep their share of the odds.',
        ''
    ];
    for (const [cls, fn] of DROP_TABLES) {
        if (!classes.has(cls)) {
            classes.set(cls, javaArrays(legacy.file(`${cls}.java`)));
        }
        const { arrays, randoms } = classes.get(cls);
        const arrayName = randoms.get(fn);
        const values = arrays.get(arrayName);
        if (!arrayName || !values) {
            throw new Error(`combat: ${cls}.${fn} not found`);
        }
        // group equal ids (uniform pick over the array = count/length each)
        const counts = new Map();
        for (const id of values) {
            counts.set(id, (counts.get(id) ?? 0) + 1);
        }
        const proc = `allstar_droptable_${fn.slice('random'.length).toLowerCase()}`;
        lines.push(`// ${cls}.${fn}() = ${arrayName}[${values.length}]`);
        lines.push(`[proc,${proc}]()(namedobj)`);
        lines.push(`def_int $roll = random(${values.length});`);
        let upto = 0;
        const entries = [...counts.entries()];
        for (let i = 0; i < entries.length; i++) {
            const [id, count] = entries[i];
            upto += count;
            const name = objName(id);
            const target = name ?? 'null';
            if (!name) {
                missing.set(id, [...(missing.get(id) ?? []), fn]);
            }
            const comment = name ? '' : ` // ${id} not defined yet (allstar_item_${id})`;
            if (i === entries.length - 1) {
                lines.push(`return(${target});${comment}`);
            } else {
                lines.push(`if ($roll < ${upto}) {`);
                lines.push(`    return(${target});${comment}`);
                lines.push('}');
            }
        }
        lines.push('');
    }
    writeGenerated('combat/scripts/drop_tables.rs2', lines);

    // ---- safe zones: client.nonWild() ----
    const client = fs.readFileSync(legacy.file('client.java'), 'latin1');
    const start = client.indexOf('public boolean nonWild()');
    const body = client.slice(start, client.indexOf('return true;', start));
    const rects = [];
    const rre = /absX\s*>=\s*(\d+)\s*&&\s*absX\s*<=\s*(\d+)\s*&&\s*absY\s*>=\s*(\d+)\s*&&\s*absY\s*<=\s*(\d+)/g;
    for (let m; (m = rre.exec(body)); ) {
        rects.push(m.slice(1, 5).map(Number));
    }
    const safe = [
        '// client.nonWild(): 67 rectangles (on every level) and all of level 1. Rectangles with min > max',
        '// never matched in Allstar-Scape either and are kept for reference.',
        '[proc,allstar_nonwild](coord $coord)(boolean)',
        'if (coordy($coord) = 1) {',
        '    return(true);',
        '}',
        'def_int $x = coordx($coord);',
        'def_int $z = coordz($coord);'
    ];
    for (const [x1, x2, z1, z2] of rects) {
        const dead = x1 > x2 || z1 > z2 ? ' // never true' : '';
        safe.push(`if ($x >= ${x1} & $x <= ${x2} & $z >= ${z1} & $z <= ${z2}) {${dead}`);
        safe.push('    return(true);');
        safe.push('}');
    }
    safe.push('return(false);');
    writeGenerated('combat/scripts/safe_zones.rs2', safe);

    report(
        `Combat: ${hp.length} npc.cfg hitpoints, ${wanderers} wandering spawn tiles, ${DROP_TABLES.length} drop tables, ${rects.length} safe rectangles`,
        ...[...missing.entries()].map(([id, fns]) => `  - drop item ${id} not defined yet (${[...new Set(fns)].join(', ')})`)
    );
}
