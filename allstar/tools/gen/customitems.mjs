// Custom items: every Allstar-Scape item id >= 7956 the game uses (allstar/spec/custom_items.md).
//
// Writes content/scripts/allstar/customitems/configs/:
//   customitems.obj    one obj per item, debugname allstar_item_<id>, obj id = the Allstar id
//   customitems.enum   allstar_items: Allstar id (incl. pack-1 aliases) -> obj
//   customitems.param  the allstar_* params below
//
// Server data is read from allstar/legacy exactly as Allstar-Scape loaded it:
//   item.cfg        name/desc/bonuses from the FIRST line of an id, shop value from the LAST line
//                   (ItemHandler.loadItemList + client.GetItemName/GetItemShopValue); undefined ids
//                   are "!! NOT EXISTING ITEM !!! - ID:<id>", 0 bonuses, 1 gp
//   Item4.java      equip slot (client.itemType list order), arms/head hiding (Player.appendPlayerAppearance)
//   Item.java       itemSellable overrides (sellable.dat stops at id 6799)
//   client.java     twoHanderz, GetCL* wear requirements (id tables parsed, name rules ported below),
//                   GetWepAnim/GetStandAnim/GetWalkAnim/GetRunAnim/GetBlockAnim (if-chains parsed)
// Client data (name, examine, models, icon, recolours) comes from customitems.data.mjs and
// allstar/tools/models/customitems.json (allstar/tools/models/convert.mjs).
//
// Params other systems read (all objs here; values match the Java):
//   allstar_name            item.cfg name the server used for name rules, messages and the weapon tab
//   allstar_sellable        Item.itemSellable
//   allstar_blocks_shield   in client.twoHanderz (cannot be wielded while a shield is worn)
//   allstar_req_<skill>     GetCL<Skill>: level needed to wear (1 = none), for attack, defence,
//                           strength, hitpoints, ranged, prayer, magic, cooking, woodcutting,
//                           fletching, fishing, thieving, farming, slayer (the checks in client.wear)
// plus the Lost City bonus params (stabattack ... prayerbonus) and, for weapon-slot items, the
// attack/defend/stand/walk/run animations.
import fs from 'fs';
import path from 'path';

import { CUSTOM_ITEMS, PACK1_ALIASES } from './customitems.data.mjs';

const OUT = 'content/scripts/allstar/customitems/configs';

// ---------------------------------------------------------------- legacy parsing

// ItemHandler.loadItemList: trim, split at '=', collapse tab runs (5 passes), split on tabs.
function readItemCfg(file) {
    const first = new Map();
    const last = new Map();
    for (const raw of fs.readFileSync(file, 'latin1').split(/\r?\n/)) {
        const line = raw.trim();
        const spot = line.indexOf('=');
        if (spot === -1) {
            if (line === '[ENDOFITEMLIST]') break;
            continue;
        }
        if (line.substring(0, spot).trim() !== 'item') continue;
        let value = line.substring(spot + 1).trim();
        for (let i = 0; i < 5; i++) value = value.replaceAll('\t\t', '\t');
        const t = value.split('\t');
        const id = parseInt(t[0]);
        const entry = {
            id,
            name: t[1].replaceAll('_', ' '),
            desc: t[2].replaceAll('_', ' '),
            shopValue: parseFloat(t[4]),
            bonuses: t.slice(6, 18).map(v => parseInt(v))
        };
        if (!first.has(id)) first.set(id, entry);
        last.set(id, entry);
    }
    return { first, last };
}

function javaIntArray(src, decl) {
    const m = src.match(new RegExp(`${decl}\\s*=\\s*\\{([^}]*)\\}`));
    if (!m) throw new Error(`array not found: ${decl}`);
    return m[1].split(',').map(s => s.trim()).filter(Boolean).map(Number);
}

// Body of `public int <name>(...) {` with balanced braces, comments removed.
function javaMethod(src, name) {
    const start = src.indexOf(`public int ${name}(`);
    if (start === -1) throw new Error(`method not found: ${name}`);
    let i = src.indexOf('{', start);
    let depth = 0;
    const from = i;
    for (; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}' && --depth === 0) break;
    }
    return src.slice(from + 1, i).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

const num = s => (s.startsWith('0x') ? parseInt(s, 16) : parseInt(s));

// First-match id rules of an if-chain: `if (<v> == a || <v> == b) { return n; }`. Conditions on
// anything but the id variable (FightType, playerFeet) are skipped.
function idRules(body, variable) {
    const rules = [];
    const re = /if\s*\(([^{};]*?)\)\s*\{\s*return\s+(-?0x[0-9a-fA-F]+|-?\d+)\s*;\s*\}/g;
    for (const m of body.matchAll(re)) {
        const terms = m[1].split('||').map(t => t.trim().match(/^(.+?)\s*==\s*(-?\d+)$/));
        if (terms.some(t => !t || t[1].trim() !== variable)) continue;
        rules.push({ ids: terms.map(t => Number(t[2])), value: num(m[2]) });
    }
    const def = [...body.matchAll(/(?:else\s*\{\s*)?return\s+(-?0x[0-9a-fA-F]+|-?\d+)\s*;\s*\}?\s*$/g)].pop();
    return { rules, fallback: def ? num(def[1]) : null };
}

function lookup(table, id) {
    for (const r of table.rules) if (r.ids.includes(id)) return r.value;
    return table.fallback;
}

// GetCL<Skill>: the `if (ItemID == n) { return m; }` table before the name rules.
function reqIdTable(src, skill) {
    const body = javaMethod(src, `GetCL${skill}`);
    const idPart = body.slice(0, body.indexOf('if (ItemID == -1)'));
    return idRules(idPart, 'ItemID').rules;
}

// ---------------------------------------------------------------- GetCL* name rules (client.java)

const WEAPON_WORDS = ['claws', 'dagger', 'sword', 'scimitar', 'mace', 'longsword', 'battleaxe', 'warhammer', '2h sword', 'harlberd'];
const strip = (name, words) => words.reduce((s, w) => s.replaceAll(w, ''), name).trim();

// client.java 33127 GetCLAttack
function attackByName(id, name) {
    const n2 = strip(name, ['Bronze', 'Iron', 'Steel', 'Black', 'Mithril', 'Adamant', 'Rune', 'Granite', 'Dragon', 'Crystal']);
    if (WEAPON_WORDS.some(w => n2.startsWith(w))) {
        for (const [prefix, level] of [['Bronze', 1], ['Iron', 1], ['Attack Cape', 100], ['Steel', 5], ['Black', 10], ['Mithril', 20], ['Adamant', 30], ['Rune', 40], ['Dragon', 60], ['White', 10]]) {
            if (name.startsWith(prefix)) return level;
        }
        if (id === 10705) return 1;
    } else if (name.startsWith('Granite')) {
        return 50;
    } else if (['whip', 'Ahrims staff', 'Torags hammers', 'Veracs flail', 'Guthans warspear', 'Dharoks greataxe'].some(s => name.endsWith(s))) {
        return 70;
    }
    return 1;
}

// client.java 33481 GetCLDefence
function defenceByName(id, name) {
    const n2 = strip(name, ['Bronze', 'Iron', 'Steel', 'Mithril', 'Adamant', 'Rune', 'Granite', 'Dragon', 'White', 'Crystal']);
    if (WEAPON_WORDS.some(w => n2.startsWith(w))) {
        return 1;
    }
    if (['Ahrims', 'Karil', 'Torag', 'Verac', 'Guthans'].some(s => name.startsWith(s)) || name.endsWith('Dharok')) {
        return ['staff', 'crossbow', 'hammers', 'flail', 'warspear', 'greataxe'].some(s => name.endsWith(s)) ? 1 : 70;
    }
    const starts = [['Bronze', 1], ['Iron', 1], ['Defence Cape', 100], ['Steel', 5], ['Mithril', 20], ['Adamant', 30], ['Rune full helm', 40], ['Rune Platelegs', 40], ['Rune Platebody', 40], ['Rune Plateskirt', 40], ['Rune Kite Shield', 40], ['Dragon', 60], ['dragon', 60], ['dragon Boots', 99], ['White', 1], ['Initiate', 20], ['initiate', 20]];
    for (const [prefix, level] of starts) if (name.startsWith(prefix)) return level;
    if (name.endsWith('Cavalier')) return 1;
    for (const prefix of ['steel axe', 'black axe', 'mithril axe', 'adamant axe', 'rune axe', 'dragon axe']) if (name.startsWith(prefix)) return 1;
    if (name.startsWith('Berserker_helm')) return 45;
    if (name.endsWith('2h sword') || name.endsWith('halberd') || name.endsWith('spear(s)')) return 1;
    if (name.endsWith('guthix')) return 40;
    return 1;
}

const startsRule = rules => (id, name) => {
    for (const [prefix, level] of rules) if (name.startsWith(prefix)) return level;
    return 1;
};

// [skill, java name suffix, name rules]; order = the checks in client.wear (14977-15002)
const REQUIREMENTS = [
    ['attack', 'Attack', attackByName],
    ['prayer', 'Prayer', startsRule([['Prayer cape', 99], ['Prayer hood', 99]])],
    ['fletching', 'Fletching', startsRule([['Fletching cape', 99], ['Fletching hood', 99]])],
    ['woodcutting', 'Woodcutting', startsRule([['Woodcut. cape', 100], ['Woodcutting hood', 100]])],
    ['cooking', 'Cooking', startsRule([['Cooking cape', 100], ['Cooking hood', 100]])],
    ['fishing', 'Fishing', startsRule([['Fishing cape', 100], ['Fishing hood', 100]])],
    ['thieving', 'Thieving', startsRule([['Thieving cape', 100], ['Thieving hood', 100]])],
    ['hitpoints', 'Hitpoints', startsRule([['Hitpoints cape', 100], ['Hitpoints hood', 100]])],
    ['farming', 'Farming', startsRule([['Farming cape', 99], ['Farming hood', 99]])],
    ['slayer', 'Slayer', startsRule([['Slayer cape', 100], ['Slayer hood', 100]])],
    ['defence', 'Defence', defenceByName],
    ['strength', 'Strength', (id, name) => (name.startsWith('Granite') ? 50 : name.startsWith('Torags hammers') || name.endsWith('Dharoks greataxe') ? 70 : name.startsWith('Strength Cape') ? 99 : 1)],
    ['magic', 'Magic', startsRule([['Ahrim', 70], ['Magic Cape', 99]])],
    ['ranged', 'Ranged', (id, name) => {
        for (const [prefix, level] of [['Karil', 70], ['Range Cape', 99], ['Dark Bow', 99], ['Crystal', 75], ['Seercull', 70], ['Dharoks', 99]]) if (name.startsWith(prefix)) return level;
        return id === 2497 ? 70 : 1;
    }]
];

// ---------------------------------------------------------------- the step

const BONUS_PARAMS = ['stabattack', 'slashattack', 'crushattack', 'magicattack', 'rangeattack', 'stabdefence', 'slashdefence', 'crushdefence', 'magicdefence', 'rangedefence', 'strengthbonus', 'prayerbonus'];
const SLOT_LISTS = [['capes', 'back'], ['hats', 'hat'], ['boots', 'feet'], ['gloves', 'hands'], ['shields', 'lefthand'], ['amulets', 'front'], ['arrows', 'quiver'], ['rings', 'ring'], ['body', 'torso'], ['legs', 'legs']];

export default function customitems({ root, content, legacy, packs, report }) {
    const legacyFile = name => fs.readFileSync(legacy.file(name), 'latin1');
    const item4 = legacyFile('Item4.java');
    const itemJava = legacyFile('Item.java');
    const client = legacyFile('client.java');
    const cfg = readItemCfg(legacy.file('item.cfg'));
    const lists = Object.fromEntries(['capes', 'hats', 'boots', 'gloves', 'shields', 'amulets', 'arrows', 'rings', 'body', 'legs', 'platebody', 'fullHelm', 'fullMask'].map(n => [n, new Set(javaIntArray(item4, `public static int ${n}\\[\\]`))]));
    const sellable = new Set([...itemJava.matchAll(/itemSellable\[(\d+)\]\s*=\s*true;/g)].map(m => Number(m[1])));
    const twoHanderz = new Set(javaIntArray(client, 'public int\\[\\] twoHanderz'));
    const reqTables = Object.fromEntries(REQUIREMENTS.map(([skill, java]) => [skill, reqIdTable(client, java)]));
    const wepAnim = idRules(javaMethod(client, 'GetWepAnim').replace(/if \(playerEquipment\[playerWeapon\] == -1\)[\s\S]*?return 422;\s*\}\s*\}/, ''), 'playerEquipment[playerWeapon]');
    const standAnim = idRules(javaMethod(client, 'GetStandAnim'), 'id');
    const walkAnim = idRules(javaMethod(client, 'GetWalkAnim'), 'id');
    const runAnim = idRules(javaMethod(client, 'GetRunAnim'), 'id');
    const blockAnim = idRules(javaMethod(client, 'GetBlockAnim'), 'id');

    const models = JSON.parse(fs.readFileSync(path.join(root, 'allstar/tools/models/customitems.json'), 'utf8')).items;
    const seqNames = new Map();
    for (const line of fs.readFileSync(path.join(content, 'pack/seq.pack'), 'utf8').split(/\r?\n/)) {
        const eq = line.indexOf('=');
        if (eq > 0) seqNames.set(Number(line.slice(0, eq)), line.slice(eq + 1));
    }
    const seq = id => {
        const name = seqNames.get(id);
        if (!name) throw new Error(`seq ${id} missing`);
        return name;
    };

    const objLines = ['// Generated by allstar/tools/generate.mjs (gen/customitems.mjs) - do not edit.', '// Allstar-Scape custom items (ids >= 7956): client look from RS2 2007/08, server data from allstar/legacy.'];
    const rows = [];
    for (const item of CUSTOM_ITEMS) {
        const id = item.id;
        const def = cfg.first.get(id);
        const serverName = def ? def.name : `!! NOT EXISTING ITEM !!! - ID:${id}`;
        const price = cfg.last.has(id) ? Math.floor(cfg.last.get(id).shopValue) : 1;
        const bonuses = def ? def.bonuses : new Array(12).fill(0);
        let slot = 'righthand';
        for (const [list, wearpos] of SLOT_LISTS) {
            if (lists[list].has(id)) {
                slot = wearpos;
                break;
            }
        }
        const reqs = {};
        for (const [skill, , byName] of REQUIREMENTS) {
            const fromId = reqTables[skill].find(r => r.ids.includes(id));
            reqs[skill] = fromId ? fromId.value : byName(id, serverName);
        }
        const look = models[id];
        if (!look) throw new Error(`item ${id} missing from allstar/tools/models/customitems.json (run convert.mjs)`);

        // a 317 client cache (convert.mjs --317) supplies the client's own name, examine and options
        const name = look.name ?? item.name;
        const desc = look.desc ?? item.desc;
        const iops = look.iop ?? [item.iop1 ?? null, item.op ?? null];

        const o = [];
        o.push('', `[allstar_item_${id}]`);
        if (item.note) o.push(`// ${item.note}`);
        o.push(`name=${name}`);
        if (desc) o.push(`desc=${desc}`);
        o.push(`model=${look.model}`);
        for (const k of ['2dzoom', '2dxan', '2dyan', '2dzan', '2dxof', '2dyof', 'resizex', 'resizey', 'resizez', 'ambient', 'contrast']) {
            if (look[k] !== undefined) o.push(`${k}=${look[k]}`);
        }
        iops.forEach((op, i) => op && o.push(`iop${i + 1}=${op}`));
        for (const k of ['manwear', 'manwear2', 'manwear3', 'womanwear', 'womanwear2', 'womanwear3', 'manhead', 'manhead2', 'womanhead', 'womanhead2']) {
            if (look[k] !== undefined) o.push(`${k}=${Array.isArray(look[k]) ? look[k].join(',') : look[k]}`);
        }
        (look.recol ?? []).forEach(([s, d], i) => o.push(`recol${i + 1}s=${s}`, `recol${i + 1}d=${d}`));
        if (look.members) o.push('members=yes');
        o.push(`cost=${price}`);
        o.push(`wearpos=${slot}`);
        // Player.appendPlayerAppearance: arms hidden only by a chest item in Item4.platebody, head
        // (and beard, which Allstar never drew) only by a hat in Item4.fullHelm/fullMask
        if (slot === 'torso' && lists.platebody.has(id)) o.push('wearpos2=arms');
        if (slot === 'hat' && (lists.fullHelm.has(id) || lists.fullMask.has(id))) o.push('wearpos2=head', 'wearpos3=jaw');
        o.push(`param=allstar_name,${serverName}`);
        o.push(`param=allstar_sellable,${sellable.has(id) ? 'yes' : 'no'}`);
        if (twoHanderz.has(id)) o.push('param=allstar_blocks_shield,yes');
        for (const [skill] of REQUIREMENTS) if (reqs[skill] !== 1) o.push(`param=allstar_req_${skill},${reqs[skill]}`);
        bonuses.forEach((b, i) => b !== 0 && o.push(`param=${BONUS_PARAMS[i]},${b}`));
        let anims = null;
        if (slot === 'righthand') {
            anims = { attack: lookup(wepAnim, id), stand: lookup(standAnim, id), walk: lookup(walkAnim, id), run: lookup(runAnim, id), block: lookup(blockAnim, id) };
            // GetWepAnim: one animation for every attack style
            for (const p of ['stabattack_anim', 'slashattack_anim', 'crushattack_anim']) o.push(`param=${p},${seq(anims.attack)}`);
            if (slot === 'righthand' && anims.attack === 426) o.push(`param=rangeattack_anim,${seq(anims.attack)}`);
            o.push(`param=defend_anim,${seq(anims.block)}`);
            // turn and side/back walk animations were always 823/820/821/822 (Lost City defaults)
            if (anims.stand !== 808) o.push(`param=ready_baseanim,${seq(anims.stand)}`);
            if (anims.walk !== 819) o.push(`param=walk_f_baseanim,${seq(anims.walk)}`);
            if (anims.run !== 824) o.push(`param=running_baseanim,${seq(anims.run)}`);
        }
        objLines.push(...o);
        rows.push({ id, name, serverName, price, slot, bonuses, reqs, sellable: sellable.has(id), blocksShield: twoHanderz.has(id), plate: slot === 'torso' && lists.platebody.has(id), head: slot === 'hat' && (lists.fullHelm.has(id) || lists.fullMask.has(id)), anims, standin: look.standin });
    }

    // obj ids = Allstar ids, so the client sees the same ids Allstar-Scape sent
    for (const item of CUSTOM_ITEMS) {
        const name = `allstar_item_${item.id}`;
        const holder = packs.obj.name(item.id);
        if (holder !== undefined && holder !== name) throw new Error(`obj id ${item.id} already used by ${holder}`);
        const other = packs.obj.id(name);
        if (other !== undefined && other !== item.id) throw new Error(`${name} already has obj id ${other}`);
        if (holder === undefined) {
            packs.obj.byId.set(item.id, name);
            packs.obj.byName.set(name, item.id);
            packs.obj.added.push(item.id);
        }
    }

    const ids = new Set(CUSTOM_ITEMS.map(i => i.id));
    const enumLines = ['// Generated by allstar/tools/generate.mjs (gen/customitems.mjs) - do not edit.', '// Allstar-Scape item id (>= 7956) -> obj, for ::pickup, rewards and drops. Pack-1 ids (an older copy', '// of the same RS2 items that some code uses) resolve to their pack-2 twin.', '[allstar_items]', 'inputtype=int', 'outputtype=namedobj'];
    const entries = [...CUSTOM_ITEMS.map(i => [i.id, i.id]), ...Object.entries(PACK1_ALIASES).map(([a, b]) => [Number(a), b])].sort((a, b) => a[0] - b[0]);
    for (const [from, to] of entries) {
        if (!ids.has(to)) throw new Error(`alias ${from} -> ${to}: no such custom item`);
        enumLines.push(`val=${from},allstar_item_${to}`);
    }

    const paramLines = [
        '// Allstar-Scape item data read by other systems (set on custom items here; see gen/customitems.mjs).',
        '',
        '// item.cfg name: what the server used for name-based rules, messages and the weapon tab',
        '[allstar_name]',
        'type=string',
        'default=null',
        '',
        '// Item.itemSellable',
        '[allstar_sellable]',
        'type=boolean',
        'default=no',
        '',
        '// client.twoHanderz: cannot be wielded while a shield is worn',
        '[allstar_blocks_shield]',
        'type=boolean',
        'default=no',
        ''
    ];
    for (const [skill, java] of REQUIREMENTS) {
        paramLines.push(`// client.GetCL${java}: level needed to wear`, `[allstar_req_${skill}]`, 'type=int', 'default=1', '');
    }

    const outDir = path.join(root, OUT);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'customitems.obj'), objLines.join('\n') + '\n');
    fs.writeFileSync(path.join(outDir, 'customitems.enum'), enumLines.join('\n') + '\n');
    fs.writeFileSync(path.join(outDir, 'customitems.param'), paramLines.join('\n'));

    // cross-check against the spec tables (allstar/spec/allstar_items.csv)
    const problems = verifyAgainstSpec(root, rows);
    report(`Custom items: ${rows.length} objs (${rows.filter(r => r.standin).length} with stand-in models), ${entries.length} allstar_items entries`, ...problems.map(p => `  - spec mismatch: ${p}`));
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"' && text[i + 1] === '"') {
                cur += '"';
                i++;
            } else if (c === '"') quoted = false;
            else cur += c;
        } else if (c === '"') quoted = true;
        else if (c === ',') {
            row.push(cur);
            cur = '';
        } else if (c === '\n') {
            row.push(cur.replace(/\r$/, ''));
            rows.push(row);
            row = [];
            cur = '';
        } else cur += c;
    }
    if (cur || row.length) rows.push([...row, cur]);
    return rows;
}

function verifyAgainstSpec(root, rows) {
    const [header, ...data] = parseCsv(fs.readFileSync(path.join(root, 'allstar/spec/allstar_items.csv'), 'utf8'));
    const col = Object.fromEntries(header.map((h, i) => [h, i]));
    const spec = new Map(data.filter(r => r.length > 10).map(r => [Number(r[0]), r]));
    const slotName = { weapon: 'righthand', cape: 'back', hat: 'hat', feet: 'feet', hands: 'hands', shield: 'lefthand', amulet: 'front', arrows: 'quiver', ring: 'ring', chest: 'torso', legs: 'legs' };
    const problems = [];
    for (const r of rows) {
        const s = spec.get(r.id);
        if (!s) {
            problems.push(`${r.id} not in allstar_items.csv`);
            continue;
        }
        const check = (what, ours, theirs) => String(ours) !== String(theirs) && problems.push(`${r.id} ${what}: ours ${ours}, spec ${theirs}`);
        check('name', r.serverName.trim(), s[col.name].trim());
        check('price', r.price, s[col.shop_price]);
        check('slot', r.slot, slotName[s[col.slot]]);
        check('sellable', r.sellable ? 1 : 0, s[col.sellable]);
        check('blocks_shield', r.blocksShield ? 1 : 0, s[col.blocks_shield]);
        check('hides arms', r.plate ? 1 : 0, r.slot === 'torso' ? s[col.is_plate] : 0);
        check('hides head', r.head ? 1 : 0, r.slot === 'hat' ? (s[col.is_fullhelm] === '1' || s[col.is_fullmask] === '1' ? 1 : 0) : 0);
        ['atk_stab', 'atk_slash', 'atk_crush', 'atk_magic', 'atk_range', 'def_stab', 'def_slash', 'def_crush', 'def_magic', 'def_range', 'str', 'pray'].forEach((c, i) => check(c, r.bonuses[i], s[col[c]]));
        for (const skill of Object.keys(r.reqs)) check(`req_${skill}`, r.reqs[skill], s[col[`req_${skill}`]]);
        if (r.anims) {
            check('anim_attack', r.anims.attack, s[col.anim_attack]);
            check('anim_stand', r.anims.stand, s[col.anim_stand]);
            check('anim_walk', r.anims.walk, s[col.anim_walk]);
            check('anim_run', r.anims.run, s[col.anim_run]);
            check('anim_block', r.anims.block, s[col.anim_block_as_def_weapon]);
        }
    }
    return problems;
}
