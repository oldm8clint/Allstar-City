// Custom items (Allstar ids >= 7956): packed configs, models and in-game handling.
//
//   cd engine && npm run build
//   npx tsx ../allstar/tests/customitems.test.ts            (static checks of engine/data/pack)
//   npx tsx ../allstar/tests/customitems.test.ts --server   (also ::give/wield with the bot; needs
//                                                             the server running: npx tsx src/app.ts)
// Server ports come from BOT_PORT/BOT_WEB_PORT (default 43617/8117, the customitems worktree).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import EnumType from '../../engine/src/cache/config/EnumType.js';
import ObjType from '../../engine/src/cache/config/ObjType.js';
import ParamType from '../../engine/src/cache/config/ParamType.js';
import ColorConversion from '../../engine/src/util/ColorConversion.js';
import { Cache317 } from '../tools/models/cache317.mjs';
import { decode } from '../tools/models/model.mjs';
import { CUSTOM_ITEMS, PACK1_ALIASES } from '../tools/gen/customitems.data.mjs';
import Bot from './Bot.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PACK = path.join(ROOT, 'engine/data/pack');
let failures = 0;
const check = (ok: boolean, what: string) => {
    if (!ok) failures++;
    console.log(ok ? 'PASS' : 'FAIL', what);
};

ParamType.load(PACK);
ObjType.load(PACK);
EnumType.load(PACK);
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'allstar/tools/models/customitems.json'), 'utf8')).items;
const modelPack = new Map<string, number>();
for (const line of fs.readFileSync(path.join(ROOT, 'content/pack/model.pack'), 'utf8').split(/\r?\n/)) {
    const eq = line.indexOf('=');
    if (eq > 0) modelPack.set(line.slice(eq + 1), Number(line.slice(0, eq)));
}
const cache = new Cache317(PACK);
const param = (obj: ObjType, name: string) => obj.params.get(ParamType.getId(name));

// ---- every custom item is packed under its Allstar id with the planned look
let bad: string[] = [];
const modelsChecked = new Set<number>();
for (const item of CUSTOM_ITEMS) {
    const obj = ObjType.get(item.id);
    const look = manifest[item.id];
    if (!obj || obj.debugname !== `allstar_item_${item.id}`) {
        bad.push(`${item.id}: obj missing`);
        continue;
    }
    if (obj.name !== (look.name ?? item.name)) bad.push(`${item.id}: name ${obj.name}`);
    if (obj.stackable) bad.push(`${item.id}: stackable`);
    if (obj.wearpos === -1) bad.push(`${item.id}: no wearpos`);
    if (obj.model !== modelPack.get(look.model)) bad.push(`${item.id}: model ${obj.model}`);
    // recolours reach the client as the planned HSL16 colours
    const want = (look.recol ?? []).map(([s, d]: number[]) => (s < 100 && d < 100 ? [s, d] : [ColorConversion.rgb15toHsl16(s), ColorConversion.rgb15toHsl16(d)]));
    const got = obj.recol_s ? Array.from(obj.recol_s, (s, i) => [s, obj.recol_d![i]]) : [];
    if (JSON.stringify(want) !== JSON.stringify(got)) bad.push(`${item.id}: recol ${JSON.stringify(got)} != ${JSON.stringify(want)}`);
    for (const id of [obj.model, obj.manwear, obj.manwear2, obj.manwear3, obj.womanwear, obj.womanwear2, obj.womanwear3, obj.manhead, obj.manhead2, obj.womanhead, obj.womanhead2]) {
        if (id === -1 || modelsChecked.has(id)) continue;
        modelsChecked.add(id);
        const data = cache.model(id);
        const m = data ? decode(data) : null;
        if (!m || m.faceCount === 0) bad.push(`${item.id}: model ${id} missing from the built cache`);
    }
}
check(bad.length === 0, `${CUSTOM_ITEMS.length} custom objs packed with names, models and recolours (${modelsChecked.size} models load)${bad.length ? ': ' + bad.slice(0, 5).join('; ') : ''}`);

// ---- server data spot checks against allstar/legacy (custom_items.md)
const byId = (id: number) => ObjType.get(id);
const wearpos = (id: number) => byId(id).wearpos;
check(byId(14073).name === 'Attack cape' && param(byId(14073), 'allstar_name') === 'Att Cape', '14073 Attack cape (item.cfg "Att Cape")');
check(byId(14073).cost === 100000 && param(byId(14073), 'stabattack') === 7 && param(byId(14073), 'strengthbonus') === 4 && param(byId(14073), 'allstar_req_attack') === 99, '14073 price 100000, 7/7/7 str 4, Attack 99');
check(byId(14121).cost === 200000 && byId(14124).cost === 200000, 'duplicate item.cfg ids take the last line price (14121, 14124)');
check(byId(15352).cost === 162362 && param(byId(15352), 'slashattack') === 90 && param(byId(15352), 'allstar_req_defence') === 60, '15352 dragon boots: floor(col4), bonuses, Defence 60');
check(wearpos(14575) === 3 && byId(14575).name === 'Zamorak stole' && param(byId(14575), 'allstar_name') === 'Guthix Mitre', '14575 "Guthix Mitre" is the Zamorak stole in the weapon slot');
check(wearpos(10717) === 3 && wearpos(11139) === 3 && wearpos(11138) === 3 && byId(11138).wearpos2 === -1, '10717, 11138, 11139 wield in the weapon slot (weapon slot never hides arms)');
check(byId(15346).wearpos2 === 6 && byId(15348).wearpos2 === -1 && byId(14512).wearpos2 === -1, 'arms hidden by Armadyl chestplate only (Bandos chestplate, 3rd age platebody show arms)');
check(byId(15195).wearpos2 === 8 && byId(14505).wearpos2 === -1 && byId(14513).wearpos2 === -1, 'head hidden by dragon full helm, not by 3rd age coif/full helmet');
check(param(byId(13597), 'allstar_req_defence') === 5 && param(byId(13599), 'allstar_req_defence') === 20 && param(byId(13600), 'allstar_req_defence') === undefined && param(byId(13601), 'allstar_req_defence') === undefined, 'defender Defence reqs: steel 5, mithril 20, "Adament"/rune none');
check(param(byId(15145), 'allstar_req_defence') === 60 && !byId(15145).stackable && wearpos(15145) === 13, 'dragon arrows: Defence 60 ("Dragon" name rule), not stackable, quiver');
check(param(byId(15156), 'allstar_req_ranged') === 80 && param(byId(15156), 'slashdefence') === 150, 'dark bow: Ranged 80, slash defence 150');
check(param(byId(14915), 'allstar_blocks_shield') === 1 && param(byId(15334), 'allstar_blocks_shield') === undefined && byId(15334).wearpos2 === -1, 'only the anchor is in twoHanderz; godswords are one-handed');
check(param(byId(15334), 'allstar_req_attack') === 80 && param(byId(15333), 'allstar_req_attack') === undefined, 'godsword Attack reqs: BGS/ZGS 80, AGS none');
const seq = (id: number, name: string) => param(byId(id), name);
check(seq(15334, 'ready_baseanim') === 1662 && seq(15334, 'walk_f_baseanim') === 1663 && seq(15334, 'slashattack_anim') === 407, 'BGS anims: stand 1662, walk 1663, attack 407');
check(seq(15336, 'slashattack_anim') === 407 && seq(15333, 'slashattack_anim') === 406 && seq(15333, 'ready_baseanim') === undefined, 'ZGS attack 407, AGS 406 with default stand');
check(seq(14915, 'ready_baseanim') === 2065 && seq(14915, 'walk_f_baseanim') === 2064 && seq(14915, 'crushattack_anim') === 406, 'anchor anims: stand 2065, walk 2064, attack 406');
check(seq(15156, 'rangeattack_anim') === 426 && seq(10717, 'stabattack_anim') === 806, 'dark bow attack 426; other weapon-slot items 806');
check(param(byId(14643), 'allstar_name') === '!! NOT EXISTING ITEM !!! - ID:14643' && byId(14643).cost === 1 && wearpos(14643) === 5, 'BA icons are undefined in item.cfg (1 gp) and go in the shield slot');
check(param(byId(15195), 'allstar_sellable') === 1 && param(byId(14562), 'allstar_sellable') === 0, 'itemSellable overrides (15195 yes, 14562 no)');

// ---- allstar_items enum
const e = EnumType.getByName('allstar_items');
bad = [];
if (!e) bad.push('enum missing');
else {
    for (const item of CUSTOM_ITEMS) if (e.values.get(item.id) !== item.id) bad.push(`${item.id} -> ${e.values.get(item.id)}`);
    for (const [from, to] of Object.entries(PACK1_ALIASES)) if (e.values.get(Number(from)) !== to) bad.push(`${from} -> ${e.values.get(Number(from))}`);
}
check(bad.length === 0, `allstar_items maps ${CUSTOM_ITEMS.length} ids and ${Object.keys(PACK1_ALIASES).length} pack-1 aliases${bad.length ? ': ' + bad.slice(0, 5).join('; ') : ''}`);
check(e?.values.get(10228) === 13597 && e?.values.get(11193) === 14562, 'aliases: 10228 -> steel defender, 11193 -> Guthix cloak');
check(e?.values.get(11192) === 11192 && byId(11192).name === 'Saradomin cloak' && byId(11192).cost === 1 && wearpos(11192) === 1 && param(byId(11192), 'magicattack') === undefined, '11192 (dark beast drop) is a Saradomin cloak with its own undefined item.cfg data (0 bonuses, 1 gp)');

// ---- in game: ::give and wield
if (process.argv.includes('--server')) {
    const port = Number(process.env.BOT_PORT ?? 43617);
    const webPort = Number(process.env.BOT_WEB_PORT ?? 8117);
    const bot = await Bot.connect({ username: `ci${Date.now() % 100000}`, port, webPort });
    await new Promise(r => setTimeout(r, 1500));
    const invOf = (com = 3214) => bot.invs.get(com) ?? [];
    const give = [14073, 15334, 15195, 13601, 15352, 14575, 15713];
    for (const id of give) bot.cheat(`give allstar_item_${id}`);
    await bot.until(() => give.every(id => invOf().some(o => o?.id === id)), 8000, 'given items').catch(() => {});
    check(give.every(id => invOf().some(o => o?.id === id)), `::give puts ${give.join(', ')} in the inventory under the Allstar ids`);

    const wield = async (id: number) => {
        const slot = invOf().findIndex(o => o?.id === id);
        bot.opHeld(2, id, slot, 3214);
        await bot.until(() => !invOf().some(o => o?.id === id), 5000, `wield ${id}`).catch(() => {});
    };
    for (const id of [15334, 15195, 13601, 14073]) await wield(id);
    const worn = [...bot.invs.entries()].find(([com]) => com !== 3214)?.[1] ?? [];
    check([15334, 15195, 13601, 14073].every(id => worn.some(o => o?.id === id)), 'godsword + dragon full helm + rune defender + attack cape worn together');
    check(worn[3]?.id === 15334 && worn[0]?.id === 15195 && worn[5]?.id === 13601 && worn[1]?.id === 14073, 'worn slots: weapon, hat, shield, cape');
    await wield(14575);
    check(worn.length > 0 && (bot.invs.get([...bot.invs.keys()].find(c => c !== 3214)!) ?? [])[3]?.id === 14575, '14575 replaces the godsword in the weapon slot');
    bot.close();
}

console.log(failures ? `${failures} FAILED` : 'all passed');
process.exit(failures ? 1 : 0);
