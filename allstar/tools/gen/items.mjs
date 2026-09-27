// Allstar-Scape item data for ids below 7956 (the 377 cache range), written into the Lost City obj
// configs in place.
//
// Sources (allstar/legacy): item.cfg (read exactly like ItemHandler.loadItemList), data/*.dat
// (Item.java static block), Item4.java slot/appearance lists (client.itemType, Player
// appearance), client.GetCL* wear requirements. See allstar/spec/custom_items.md sections 1 and 6.
//
// Why in place: the packer refuses duplicate configs, so an overlay file is impossible, and moving
// every obj config into one generated file would take the other obj edits (quests, combat params)
// hostage to this generator. Instead, every config block of an id < 7956 has the keys this step
// owns removed and regenerated at the end of the block after a marker comment. Keys it does not
// own are never touched, so the step is idempotent and other workstreams can keep editing the
// same blocks. Re-run after merges: node allstar/tools/generate.mjs
//
// Owned keys: cost, stackable, tradeable, wearpos, wearpos2, wearpos3, the 12 Lost City bonus
// params (+ rangebonus, which Allstar-Scape did not have) and the allstar_* item params in
// content/scripts/allstar/items/configs/items.param.
import fs from 'fs';
import path from 'path';

import { Pack } from '../lib/pack.mjs';

const MAX_ID = 7956; // ids >= 7956 belong to the custom item workstream
const MARKER = '// allstar item data (allstar/tools/gen/items.mjs)';

const BONUS_PARAMS = ['stabattack', 'slashattack', 'crushattack', 'magicattack', 'rangeattack', 'stabdefence', 'slashdefence', 'crushdefence', 'magicdefence', 'rangedefence', 'strengthbonus', 'prayerbonus'];

// wear() checks the requirements in this order (client.java L15053-15136)
const REQ_SKILLS = ['attack', 'prayer', 'fletching', 'woodcutting', 'cooking', 'fishing', 'thieving', 'hitpoints', 'farming', 'slayer', 'defence', 'strength', 'magic', 'ranged'];

const OWNED_PARAMS = new Set([
    ...BONUS_PARAMS,
    'rangebonus',
    'allstar_value',
    'allstar_name',
    'allstar_sellable',
    'allstar_untradeable',
    'allstar_is_note',
    'allstar_note',
    'allstar_unnote',
    'allstar_withdraw_stackable',
    'allstar_twohanded',
    'allstar_twohanderz',
    'allstar_weapon_tab',
    'allstar_id',
    'allstar_stand_anim',
    'allstar_walk_anim',
    'allstar_run_anim',
    'allstar_walk_sled_exempt',
    'allstar_wield_walk_anim',
    'allstar_wield_run_anim',
    'allstar_login_stand_anim',
    'allstar_login_walk_anim',
    'allstar_login_run_anim',
    ...REQ_SKILLS.map(s => `allstar_req_${s}`)
]);

// client.twoHanderz (packet 41 loop): index of the id in {7158, 1319, 6528, 14915}
const TWO_HANDERZ = [7158, 1319, 6528, 14915];

// client.GetStandAnim / GetWalkAnim / GetRunAnim (L27584-27720), seq ids.
// Walk: 4718 and the "staves" list are decided before the sled check (feet 4084 -> 755).
const STAVES_WALK = [4039, 4037, 1379, 3204, 3202, 1381, 1383, 1385, 1387, 1389, 1391, 1393, 1395, 1397, 1399, 1401, 1403, 145, 1407, 1409, 3053, 3054, 4170, 4675, 4710, 6526, 4726, 6562, 6563, 6914, 5730];
const STAVES_STAND = [1305, 1379, 1381, 1383, 1385, 1387, 1389, 1391, 1393, 1395, 1397, 1399, 1401, 1403, 145, 1407, 1409, 3053, 3054, 4170, 4675, 4710, 6526, 4726, 6562, 6563, 5730];

function standAnim(id) {
    if (id === 4718) return 2065;
    if (id === 4755) return 2061;
    if (id === 4734 || id === 837) return 2074;
    if ([4153, 15334, 15336, 1419].includes(id)) return 1662;
    if (id === 7449) return 1662;
    if (id === 4565) return 1836;
    if (STAVES_STAND.includes(id)) return 809;
    if ([7158, 1319, 6528, 14915].includes(id)) return 2065;
    if (id === 3204 || id === 3202) return 809;
    return 808;
}

// without the sled check; sledExempt tells whether the id is decided before it
function walkAnim(id) {
    if (id === 4718) return 2064;
    if (STAVES_WALK.includes(id)) return 1146;
    if (id === 4565) return 1836;
    if (id === 4755) return 2060;
    if (id === 4734 || id === 837) return 2076;
    if (id === 4153 || id === 1419) return 1663;
    if (id === 15334 || id === 15336) return 1663;
    if ([7158, 4718, 1319, 6528, 14915].includes(id)) return 2064;
    if (id === 7449) return 1663;
    if (id === 4151) return 1661;
    if (id === 8447) return 1661;
    return 819;
}
const sledExempt = id => id === 4718 || STAVES_WALK.includes(id);

function runAnim(id) {
    if (id === 4151 || id === 8447) return 1661;
    if (id === 6818) return 744;
    if (id === 4734 || id === 837) return 2077;
    if (id === 4153 || id === 1419 || id === 7449) return 1664;
    return 824;
}

// client.SendWeapon (L14554): the attack style tab (317 interface id) chosen from the item.cfg name
function weaponTab(name) {
    const stripped = stripWords(name, ['Bronze', 'Iron', 'Steel', 'Black', 'Mithril', 'Adamant', 'Rune', 'Granite', 'Dragon', 'Crystal']);
    if (name.endsWith('whip')) return 12290;
    if (name.endsWith('bow') || name.endsWith('Bow') || name.startsWith('crystal_bow') || name.startsWith('seercull')) return 1764;
    if (name.startsWith('Staff') || name.endsWith('staff')) return 328;
    if (stripped.startsWith('dart')) return 4446;
    if (stripped.startsWith('dagger')) return 2276;
    if (stripped.startsWith('pickaxe')) return 5570;
    if (stripped.startsWith('axe') || stripped.startsWith('battleaxe')) return 1698;
    if (stripped.startsWith('halberd')) return 8460;
    if (stripped.startsWith('spear')) return 4679;
    if (stripped.startsWith('claws')) return 7762;
    return 2423;
}

// wear() and setEquipment() overrides after the Get*Anim calls
const WIELD_OVERRIDES = { 4151: { walk: 1660, run: 1661 }, 8447: { walk: 1660, run: 1661 } };
const LOGIN_OVERRIDES = { 4153: { stand: 2065, walk: 2064, run: 2064 }, 6528: { stand: 2065, walk: 2064, run: 2064 }, 1215: { walk: 1660, run: 1661 } };
const OWNED_KEYS = new Set(['cost', 'stackable', 'tradeable', 'wearpos', 'wearpos2', 'wearpos3']);

// Player.java slot numbers = Lost City wearpos ids
const WEARPOS = { 0: 'hat', 1: 'back', 2: 'front', 3: 'righthand', 4: 'torso', 5: 'lefthand', 7: 'legs', 9: 'hands', 10: 'feet', 12: 'ring', 13: 'quiver' };

// ---- item.cfg, exactly as ItemHandler.loadItemList reads it ----

function javaTrim(s) {
    let a = 0;
    let b = s.length;
    while (a < b && s.charCodeAt(a) <= 32) a++;
    while (b > a && s.charCodeAt(b - 1) <= 32) b--;
    return s.slice(a, b);
}

// String.split("\t") drops trailing empty strings
function javaSplitTab(s) {
    const parts = s.split('\t');
    while (parts.length > 0 && parts[parts.length - 1] === '') {
        parts.pop();
    }
    return parts;
}

function javaInt(token, where) {
    if (!/^[-+]?\d+$/.test(token)) {
        throw new Error(`${where}: Integer.parseInt("${token}") would throw`);
    }
    return parseInt(token, 10);
}

// (int) Math.floor(double) with Java's saturating cast
function javaFloorInt(value) {
    if (Number.isNaN(value)) return 0;
    const f = Math.floor(value);
    if (f > 2147483647) return 2147483647;
    if (f < -2147483648) return -2147483648;
    return f;
}

function readItemCfg(file) {
    const entries = [];
    const text = fs.readFileSync(file, 'latin1');
    let lineNo = 0;
    for (const raw of text.split(/\r?\n/)) {
        lineNo++;
        const line = javaTrim(raw);
        const spot = line.indexOf('=');
        if (spot > -1) {
            const token = javaTrim(line.substring(0, spot));
            const token2 = javaTrim(line.substring(spot + 1));
            let collapsed = token2;
            for (let i = 0; i < 5; i++) {
                collapsed = collapsed.replaceAll('\t\t', '\t');
            }
            const token3 = javaSplitTab(collapsed);
            if (token === 'item') {
                const where = `item.cfg:${lineNo}`;
                const bonuses = [];
                for (let i = 0; i < 12; i++) {
                    if (token3[6 + i] === undefined) {
                        throw new Error(`${where}: missing bonus column ${i} (ArrayIndexOutOfBounds in the loader)`);
                    }
                    bonuses.push(javaInt(token3[6 + i], where));
                }
                entries.push({
                    id: javaInt(token3[0], where),
                    name: token3[1].replaceAll('_', ' '),
                    shopValue: Number(token3[4]),
                    bonuses,
                    line: lineNo
                });
            }
        } else if (line === '[ENDOFITEMLIST]') {
            break;
        }
    }
    return entries;
}

// ---- Item4.java lists ----

function readItem4(file) {
    const text = fs.readFileSync(file, 'latin1');
    const lists = {};
    for (const m of text.matchAll(/public static int (\w+)\[\]\s*=\s*\{([^}]*)\};/g)) {
        lists[m[1]] = new Set(
            m[2]
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0)
                .map(Number)
        );
    }
    return lists;
}

// ---- client.GetCL* (L33127-33855), on the item.cfg name from GetItemName ----

function stripWords(name, words) {
    let out = name;
    for (const w of words) {
        out = out.split(w).join('');
    }
    return javaTrim(out);
}

const WEAPON_WORDS = ['claws', 'dagger', 'sword', 'scimitar', 'mace', 'longsword', 'battleaxe', 'warhammer', '2h sword', 'harlberd'];
const isWeaponName = stripped => WEAPON_WORDS.some(w => stripped.startsWith(w));

function reqAttack(id, name) {
    const ids = { 10704: 100, 10705: 100, 10706: 100, 15334: 80, 15336: 80, 14915: 60, 14073: 99, 14074: 99, 14075: 99, 3202: 40, 7158: 60, 3101: 40 };
    if (ids[id] !== undefined) return ids[id];
    const stripped = stripWords(name, ['Bronze', 'Iron', 'Steel', 'Black', 'Mithril', 'Adamant', 'Rune', 'Granite', 'Dragon', 'Crystal']);
    if (isWeaponName(stripped)) {
        for (const [prefix, req] of [['Bronze', 1], ['Iron', 1], ['Attack Cape', 100], ['Steel', 5], ['Black', 10], ['Mithril', 20], ['Adamant', 30], ['Rune', 40], ['Dragon', 60], ['White', 10]]) {
            if (name.startsWith(prefix)) return req;
        }
        if (id === 10705) return 1;
    } else if (name.startsWith('Granite')) {
        return 50;
    } else if (['whip', 'Ahrims staff', 'Torags hammers', 'Veracs flail', 'Guthans warspear', 'Dharoks greataxe'].some(s => name.endsWith(s))) {
        return 70;
    }
    return 1;
}

function reqByIdsThenNames(id, name, ids, names) {
    if (ids[id] !== undefined) return ids[id];
    for (const [prefix, req] of names) {
        if (name.startsWith(prefix)) return req;
    }
    return 1;
}

const reqPrayer = (id, name) => reqByIdsThenNames(id, name, { 14087: 99, 14085: 99, 14086: 99 }, [['Prayer cape', 99], ['Prayer hood', 99]]);
const reqFletching = (id, name) => reqByIdsThenNames(id, name, { 14111: 99, 14109: 99, 14110: 99 }, [['Fletching cape', 99], ['Fletching hood', 99]]);
const reqWoodcutting = (id, name) => reqByIdsThenNames(id, name, { 14133: 99, 14135: 99, 14134: 99 }, [['Woodcut. cape', 100], ['Woodcutting hood', 100]]);
const reqCooking = (id, name) => reqByIdsThenNames(id, name, { 14129: 99, 14127: 99, 14128: 99 }, [['Cooking cape', 100], ['Cooking hood', 100]]);
const reqFishing = (id, name) => reqByIdsThenNames(id, name, { 14124: 99, 14126: 99, 14125: 99 }, [['Fishing cape', 100], ['Fishing hood', 100]]);
const reqThieving = (id, name) =>
    reqByIdsThenNames(id, name, { 14105: 99, 14103: 99, 14104: 99, 14013: 99, 140103: 99, 5554: 100, 5555: 100, 5556: 100, 5557: 100, 5553: 100 }, [
        ['Thieving cape', 100],
        ['Thieving hood', 100]
    ]);
const reqHitpoints = (id, name) => reqByIdsThenNames(id, name, { 14094: 99, 14095: 99, 14096: 99 }, [['Hitpoints cape', 100], ['Hitpoints hood', 100]]);
const reqFarming = (id, name) => reqByIdsThenNames(id, name, { 14136: 99, 14137: 99, 14138: 99 }, [['Farming cape', 99], ['Farming hood', 99]]);
const reqSlayer = (id, name) => reqByIdsThenNames(id, name, { 14114: 99, 14112: 99, 14113: 99, 4170: 80, 4156: 60, 4166: 70, 7053: 60, 4164: 55, 10271: 100 }, [['Slayer cape', 100], ['Slayer hood', 100]]);
const reqMagic = (id, name) => reqByIdsThenNames(id, name, { 14090: 99, 14088: 99, 6918: 70, 6916: 70, 6924: 70, 6920: 70, 6922: 70, 2412: 60, 2414: 60, 2413: 60, 10721: 99 }, [['Ahrim', 70], ['Magic Cape', 99]]);

function reqStrength(id, name) {
    const ids = { 10707: 100, 7449: 80, 6528: 60, 10709: 66, 14077: 99, 14076: 99, 14078: 99 };
    if (ids[id] !== undefined) return ids[id];
    if (name.startsWith('Granite')) return 50;
    if (name.startsWith('Torags hammers') || name.endsWith('Dharoks greataxe')) return 70;
    if (name.startsWith('Strength Cape')) return 99;
    return 1;
}

function reqRanged(id, name) {
    // 11154 appears twice (80, then an unreachable 99)
    const ids = { 14082: 99, 11154: 80, 14083: 99, 859: 50, 861: 1, 1135: 40, 1099: 40, 1065: 40, 2501: 60, 2495: 60, 2577: 40, 2581: 40, 10431: 65, 2489: 60, 11153: 80, 15156: 80, 10713: 99, 14084: 99 };
    if (ids[id] !== undefined) return ids[id];
    for (const [prefix, req] of [['Karil', 70], ['Range Cape', 99], ['Dark Bow', 99], ['Crystal', 75], ['Seercull', 70], ['Dharoks', 99]]) {
        if (name.startsWith(prefix)) return req;
    }
    if (id === 2497) return 70;
    return 1;
}

function reqDefence(id, name) {
    const ids = {
        2497: 1, 11154: 40, 2491: 1, 2503: 40, 1065: 1, 1099: 1, 2489: 1, 2495: 1, 2493: 1, 2487: 1, 14080: 99, 14079: 99, 14081: 99, 1135: 40, 2501: 40, 1163: 40,
        10228: 5, 10229: 10, 10230: 20, 10231: 30, 10232: 40, 1127: 40, 1079: 40, 1093: 40, 1201: 40, 1185: 40, 4131: 40, 4716: 70, 4720: 70, 4722: 70, 11981: 60, 11824: 60, 10712: 100
    };
    if (ids[id] !== undefined) return ids[id];
    const stripped = stripWords(name, ['Bronze', 'Iron', 'Steel', 'Mithril', 'Adamant', 'Rune', 'Granite', 'Dragon', 'White', 'Crystal']);
    if (isWeaponName(stripped)) {
        return 1; // "It's a weapon, weapons don't required defence !"
    }
    if (name.startsWith('Ahrims') || name.startsWith('Karil') || name.startsWith('Torag') || name.startsWith('Verac') || name.startsWith('Guthans') || name.endsWith('Dharok')) {
        if (['staff', 'crossbow', 'hammers', 'flail', 'warspear', 'greataxe'].some(s => name.endsWith(s))) {
            return 1;
        }
        return 70;
    }
    const prefixes = [
        ['Bronze', 1], ['Iron', 1], ['Defence Cape', 100], ['Steel', 5], ['Mithril', 20], ['Adamant', 30], ['Rune full helm', 40], ['Rune Platelegs', 40], ['Rune Platebody', 40],
        ['Rune Plateskirt', 40], ['Rune Kite Shield', 40], ['Dragon', 60], ['dragon', 60], ['dragon Boots', 99], ['White', 1], ['Initiate', 20], ['initiate', 20]
    ];
    for (const [prefix, req] of prefixes) {
        if (name.startsWith(prefix)) return req;
    }
    if (name.endsWith('Cavalier')) return 1;
    for (const prefix of ['steel axe', 'black axe', 'mithril axe', 'adamant axe', 'rune axe', 'dragon axe']) {
        if (name.startsWith(prefix)) return 1;
    }
    if (name.startsWith('Berserker_helm')) return 45;
    if (name.endsWith('2h sword') || name.endsWith('halberd') || name.endsWith('spear(s)')) return 1;
    if (name.endsWith('guthix')) return 40;
    return 1;
}

const REQ_FUNCS = {
    attack: reqAttack,
    prayer: reqPrayer,
    fletching: reqFletching,
    woodcutting: reqWoodcutting,
    cooking: reqCooking,
    fishing: reqFishing,
    thieving: reqThieving,
    hitpoints: reqHitpoints,
    farming: reqFarming,
    slayer: reqSlayer,
    defence: reqDefence,
    strength: reqStrength,
    magic: reqMagic,
    ranged: reqRanged
};

// ---- the data model ----

export { weaponTab, standAnim, walkAnim, runAnim, TWO_HANDERZ };

export function loadAllstarItems(legacyDir) {
    const entries = readItemCfg(path.join(legacyDir, 'item.cfg'));
    const first = new Map();
    const last = new Map();
    for (const e of entries) {
        if (!first.has(e.id)) first.set(e.id, e);
        last.set(e.id, e);
    }

    const dat = name => fs.readFileSync(path.join(legacyDir, 'data', name));
    const stackable = dat('stackable.dat');
    const notes = dat('notes.dat');
    const twohanded = dat('twohanded.dat');
    const sellable = dat('sellable.dat');
    const item4 = readItem4(path.join(legacyDir, 'Item4.java'));
    // Item.java 398-561: itemSellable[id] = true after the .dat loop (all ids >= 7956)
    const sellableOverrides = new Set([...fs.readFileSync(path.join(legacyDir, 'Item.java'), 'latin1').matchAll(/itemSellable\[(\d+)\]\s*=\s*true;/g)].map(m => Number(m[1])));

    // Item.java: arrays of 20000, ids beyond the .dat files keep Java's default false
    const inDat = (buf, id) => id >= 0 && id < buf.length;
    const flags = {
        stackable: id => inDat(stackable, id) && stackable[id] !== 0,
        note: id => inDat(notes, id) && notes[id] === 0,
        twohanded: id => inDat(twohanded, id) && twohanded[id] !== 0,
        sellable: id => (inDat(sellable, id) && sellable[id] === 0) || sellableOverrides.has(id)
    };

    const name = id => first.get(id)?.name ?? `!! NOT EXISTING ITEM !!! - ID:${id}`;
    const value = id => (last.has(id) ? javaFloorInt(last.get(id).shopValue) : 1);
    let bonuses = id => first.get(id)?.bonuses ?? new Array(12).fill(0);

    // allstar/QUIRKS.md Q6: the 'perfect' ring keeps the older data/item.cfg bonuses (+10000 in each)
    const q6 = new Array(12).fill(10000);
    const baseBonuses = bonuses;
    bonuses = id => (id === 773 ? q6 : baseBonuses(id));

    function slot(id) {
        const order = [['capes', 1], ['hats', 0], ['boots', 10], ['gloves', 9], ['shields', 5], ['amulets', 2], ['arrows', 13], ['rings', 12], ['body', 4], ['legs', 7]];
        for (const [list, s] of order) {
            if (item4[list].has(id)) return s;
        }
        return 3;
    }

    function reqs(id) {
        const out = {};
        for (const skill of REQ_SKILLS) {
            out[skill] = REQ_FUNCS[skill](id, name(id));
        }
        return out;
    }

    return {
        entries,
        defined: id => first.has(id),
        name,
        value,
        bonuses,
        slot,
        isPlate: id => item4.platebody.has(id),
        isFullHelm: id => item4.fullHelm.has(id),
        isFullMask: id => item4.fullMask.has(id),
        reqs,
        flags
    };
}

// ---- params, as obj config lines (also used by gen/customitems.mjs for ids >= 7956) ----

// Bonuses, wear requirements and the wield data of an item that is not a note. seq(id) gives a
// seq debugname.
export function wornParams(data, id, seq) {
    const lines = [];
    const bonuses = data.bonuses(id);
    BONUS_PARAMS.forEach((param, i) => {
        if (bonuses[i] !== 0) {
            lines.push(`param=${param},${bonuses[i]}`);
        }
    });
    const reqs = data.reqs(id);
    for (const skill of REQ_SKILLS) {
        if (reqs[skill] !== 1) {
            lines.push(`param=allstar_req_${skill},${reqs[skill]}`);
        }
    }
    if (data.flags.twohanded(id)) {
        lines.push('param=allstar_twohanded,yes');
    }
    if (data.slot(id) === 3 && weaponTab(data.name(id)) !== 2423) {
        lines.push(`param=allstar_weapon_tab,${weaponTab(data.name(id))}`);
    }
    if (TWO_HANDERZ.includes(id)) {
        lines.push(`param=allstar_twohanderz,${TWO_HANDERZ.indexOf(id)}`);
    }
    // stand/walk/run anims set when the item is wielded (only read for the weapon slot)
    if (standAnim(id) !== 808) lines.push(`param=allstar_stand_anim,${seq(standAnim(id))}`);
    if (walkAnim(id) !== 819) lines.push(`param=allstar_walk_anim,${seq(walkAnim(id))}`);
    if (runAnim(id) !== 824) lines.push(`param=allstar_run_anim,${seq(runAnim(id))}`);
    if (sledExempt(id)) lines.push('param=allstar_walk_sled_exempt,yes');
    const wield = WIELD_OVERRIDES[id];
    if (wield) {
        lines.push(`param=allstar_wield_walk_anim,${seq(wield.walk)}`, `param=allstar_wield_run_anim,${seq(wield.run)}`);
    }
    const login = LOGIN_OVERRIDES[id];
    if (login) {
        if (login.stand) lines.push(`param=allstar_login_stand_anim,${seq(login.stand)}`);
        lines.push(`param=allstar_login_walk_anim,${seq(login.walk)}`, `param=allstar_login_run_anim,${seq(login.run)}`);
    }
    return lines;
}

// Shop value, server name (only where it differs from shownName, the name the client shows),
// sellable and untradeable: every item, notes too.
export function itemParams(data, id, shownName) {
    const lines = [];
    if (data.value(id) !== 1) {
        lines.push(`param=allstar_value,${data.value(id)}`);
    }
    if (data.name(id) !== shownName) {
        lines.push(`param=allstar_name,${data.name(id)}`);
    }
    if (data.flags.sellable(id)) {
        lines.push('param=allstar_sellable,yes');
    }
    if (id === 6384) {
        lines.push('param=allstar_untradeable,yes');
    }
    return lines;
}

// ---- obj config rewriting ----

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else out.push(p);
    }
    return out;
}

function isHeader(line) {
    return line.startsWith('[') && line.endsWith(']');
}

function keyOf(line) {
    const eq = line.indexOf('=');
    return eq === -1 ? null : line.slice(0, eq);
}

function paramNameOf(line) {
    if (!line.startsWith('param=')) return null;
    const rest = line.slice('param='.length);
    const comma = rest.indexOf(',');
    return comma === -1 ? rest : rest.slice(0, comma);
}

function isOwned(line) {
    if (line === MARKER) return true;
    const key = keyOf(line);
    if (key === null) return false;
    if (OWNED_KEYS.has(key)) return true;
    const param = paramNameOf(line);
    return param !== null && OWNED_PARAMS.has(param);
}

export default function items({ root, content, packs, report }) {
    const legacyDir = path.join(root, 'allstar/legacy');
    const data = loadAllstarItems(legacyDir);
    const pack = packs.obj;
    const seqs = new Pack(path.join(content, 'pack/seq.pack'));
    const seq = id => {
        const name = seqs.name(id);
        if (name === undefined) throw new Error(`seq ${id} is not in seq.pack`);
        return name;
    };

    // first pass: read every obj config so certs can see their link's name
    const files = walk(path.join(content, 'scripts')).filter(f => f.endsWith('.obj'));
    const blocks = new Map(); // debugname -> body lines
    for (const file of files) {
        const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
        let name = null;
        for (const line of lines) {
            if (isHeader(line)) {
                name = line.slice(1, -1);
                blocks.set(name, []);
            } else if (name !== null) {
                blocks.get(name).push(line);
            }
        }
    }
    const get = (body, key) => {
        const line = body.find(l => keyOf(l) === key);
        return line === undefined ? undefined : line.slice(key.length + 1);
    };

    const stats = { blocks: 0, wearable: 0, stackable: 0, notes: 0, renamed: 0, reqs: 0 };

    function generated(debugname, body) {
        const id = pack.id(debugname);
        const certlink = get(body, 'certlink');
        const lines = [];

        if (certlink === undefined) {
            lines.push(`cost=${data.value(id)}`);
            if (data.flags.stackable(id)) {
                lines.push('stackable=yes');
                stats.stackable++;
            }
            // client.wear accepts any item whose second option was clicked (packet 41)
            if (get(body, 'iop2') !== undefined) {
                const slot = data.slot(id);
                lines.push(`wearpos=${WEARPOS[slot]}`);
                if (slot === 4 && data.isPlate(id)) {
                    lines.push('wearpos2=arms');
                } else if (slot === 0 && (data.isFullHelm(id) || data.isFullMask(id))) {
                    lines.push('wearpos2=head');
                }
                stats.wearable++;
            }
            const worn = wornParams(data, id, seq);
            stats.reqs += worn.filter(l => l.startsWith('param=allstar_req_')).length;
            lines.push(...worn);
        }

        const shownName = certlink === undefined ? get(body, 'name') : get(blocks.get(certlink) ?? [], 'name');
        if (data.name(id) !== shownName) {
            stats.renamed++;
        }
        lines.push(...itemParams(data, id, shownName));
        if (data.flags.note(id)) {
            lines.push('param=allstar_is_note,yes');
            stats.notes++;
            if (id > 0) {
                lines.push(`param=allstar_unnote,${pack.name(id - 1)}`);
            }
            // bankItem prints the id when a note's id - 1 is a note too ("Item not supported <id>")
            if (id === 0 || data.flags.note(id - 1)) {
                lines.push(`param=allstar_id,${id}`);
            }
        }
        if (data.flags.note(id + 1) && pack.name(id + 1) !== undefined) {
            lines.push(`param=allstar_note,${pack.name(id + 1)}`);
        }
        if (data.flags.stackable(id + 2)) {
            lines.push('param=allstar_withdraw_stackable,yes');
        }
        return lines;
    }

    let changedFiles = 0;
    for (const file of files) {
        const text = fs.readFileSync(file, 'utf8');
        const eol = text.includes('\r\n') ? '\r\n' : '\n';
        const lines = text.split(/\r?\n/);
        const out = [];
        let i = 0;
        while (i < lines.length) {
            if (!isHeader(lines[i])) {
                out.push(lines[i]);
                i++;
                continue;
            }
            const debugname = lines[i].slice(1, -1);
            let j = i + 1;
            while (j < lines.length && !isHeader(lines[j])) j++;
            const body = lines.slice(i + 1, j);
            out.push(lines[i]);

            const id = pack.id(debugname);
            if (id === undefined || id >= MAX_ID) {
                out.push(...body);
            } else {
                stats.blocks++;
                const kept = body.filter(l => !isOwned(l));
                let end = kept.length;
                while (end > 0 && kept[end - 1].trim() === '') end--;
                out.push(...kept.slice(0, end), MARKER, ...generated(debugname, body), ...kept.slice(end));
            }
            i = j;
        }
        const next = out.join(eol);
        if (next !== text) {
            fs.writeFileSync(file, next);
            changedFiles++;
        }
    }

    // every id below 7956 must have exactly one config block
    const missing = [];
    for (let id = 0; id < MAX_ID; id++) {
        if (!blocks.has(pack.name(id))) missing.push(id);
    }

    report(
        `Items (< ${MAX_ID}): ${stats.blocks} obj configs, ${stats.wearable} wearable, ${stats.stackable} stackable, ${stats.notes} notes, ` +
            `${stats.renamed} with an Allstar server name, ${stats.reqs} wear requirements`,
        ...missing.map(id => `  - obj ${id} has no config block`)
    );
    // console only, so report.txt stays the same when nothing changed
    console.log(`items: ${changedFiles} obj files rewritten`);
}
