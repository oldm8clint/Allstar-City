// Items workstream: equipment, consumables, bones, item on item, bank, drop/pickup, item options.
// Run against a server with engine/.env ports: cd engine && npx tsx ../allstar/tests/items.test.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Bot from './Bot.js';
import ClientGameProt from '../../engine/src/network/game/client/ClientGameProt.js';

const PORT = Number(process.env.ITEMS_PORT ?? 43614);
const WEB = Number(process.env.ITEMS_WEB ?? 8114);
const INV = 3214; // inventory:inv
const WORN = 1688; // wornitems:worn
const BANK_SIDE = 2006; // bank_side:inv
const BANK = 5382; // bank_main:bank
const SPEC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../spec/allstar_items.csv');

// stat ids in UPDATE_STAT
const ATTACK = 0, DEFENCE = 1, STRENGTH = 2, HITPOINTS = 3, PRAYER = 5, MAGIC = 6, FLETCHING = 9;

let passed = 0;
let failed = 0;
function check(ok: boolean, what: string) {
    if (ok) passed++;
    else failed++;
    console.log(ok ? 'PASS' : 'FAIL', what);
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const cycles = (n: number) => sleep(n * 500 + 250);

// ---- allstar_items.csv: bonuses of every defined id ----
function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (quoted) {
            if (c === '"') {
                if (line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else quoted = false;
            } else cur += c;
        } else if (c === '"') quoted = true;
        else if (c === ',') {
            out.push(cur);
            cur = '';
        } else cur += c;
    }
    out.push(cur);
    return out;
}
const csv = fs.readFileSync(SPEC, 'utf8').split(/\r?\n/);
const header = parseCsvLine(csv[0]);
const bonusCols = ['atk_stab', 'atk_slash', 'atk_crush', 'atk_magic', 'atk_range', 'def_stab', 'def_slash', 'def_crush', 'def_magic', 'def_range', 'str', 'pray'].map(c => header.indexOf(c));
const bonusesOf = new Map<number, number[]>();
for (const line of csv.slice(1)) {
    if (!line) continue;
    const cols = parseCsvLine(line);
    bonusesOf.set(Number(cols[0]), bonusCols.map(i => Number(cols[i])));
}
bonusesOf.set(773, new Array(12).fill(10000)); // allstar/QUIRKS.md Q6

// ---- bot helpers ----
async function login(tag: string): Promise<Bot> {
    const bot = await Bot.connect({ username: `it${tag}${Date.now() % 100000}`, port: PORT, webPort: WEB });
    await bot.until(() => (bot.invs.get(WORN)?.length ?? 0) > 0 && bot.stats.length > 5, 10000, 'login state');
    await cycles(2);
    await closeModals(bot);
    await closeModals(bot);
    return bot;
}
function send(bot: Bot, prot: ClientGameProt, write: (buf: any) => void = () => {}) {
    (bot as any).send(prot, write);
}
const inv = (bot: Bot) => bot.invs.get(INV) ?? [];
const worn = (bot: Bot) => bot.invs.get(WORN) ?? [];
const slotOf = (bot: Bot, id: number) => inv(bot).findIndex(o => o?.id === id);
const countOf = (bot: Bot, id: number) => inv(bot).reduce((n, o) => n + (o?.id === id ? o.count : 0), 0);
const level = (bot: Bot, stat: number) => bot.stats[stat]?.level ?? -1;
const xp = (bot: Bot, stat: number) => bot.stats[stat]?.xp ?? -1;
const since = (bot: Bot, from: number) => bot.messages.slice(from);
const countMessages = (bot: Bot, from: number, text: string) => since(bot, from).filter(m => m === text).length;

async function cheat(bot: Bot, text: string) {
    bot.cheat(text);
    await cycles(1);
    // level-ups open a chat interface
    if (text.startsWith('setstat')) await closeModals(bot);
}
async function closeModals(bot: Bot) {
    send(bot, ClientGameProt.CLOSE_MODAL);
    await cycles(1);
}
async function give(bot: Bot, name: string, count = 1) {
    await cheat(bot, `give ${name} ${count}`);
}
async function clearInv(bot: Bot) {
    await cheat(bot, '~clearinv inv');
}
// packet 41 etc. on the item in `slot` (or the first slot holding it)
async function held(bot: Bot, op: number, id: number, slot = slotOf(bot, id), wait = 1) {
    if (slot < 0) throw new Error(`item ${id} not in inventory`);
    bot.opHeld(op, id, slot, INV);
    await cycles(wait);
}
// "Use" `used` on `target` (packet 53: itemUsed / useWith)
async function useOn(bot: Bot, used: number, target: number) {
    const useSlot = slotOf(bot, used);
    const slot = slotOf(bot, target);
    if (useSlot < 0 || slot < 0) throw new Error(`items ${used}/${target} not both in inventory`);
    send(bot, ClientGameProt.OPHELDU, buf => {
        buf.p2(target);
        buf.p2_alt1(useSlot);
        buf.p2_alt1(used);
        buf.p2_alt3(INV);
        buf.p2_alt2(slot);
        buf.p2_alt2(INV);
    });
    await cycles(1);
}
async function countDialog(bot: Bot, value: number) {
    send(bot, ClientGameProt.RESUME_P_COUNTDIALOG, buf => buf.p4(value));
    await cycles(1);
}
async function getvar(bot: Bot, varp: string): Promise<number> {
    const from = bot.messages.length;
    bot.cheat(`getvar ${varp}`);
    const text = await bot.waitForMessage(new RegExp(`^get ${varp}: `), 5000, from);
    return Number(text.split(': ')[1].split(' ')[0]);
}

// equipment screen texts (WriteBonus)
function expectedBonusTexts(bot: Bot): Map<number, string> {
    const sums = new Array(12).fill(0);
    for (const o of worn(bot)) {
        if (!o) continue;
        const b = bonusesOf.get(o.id) ?? new Array(12).fill(0);
        b.forEach((v, i) => (sums[i] += v));
    }
    const names = ['Stab', 'Slash', 'Crush', 'Magic', 'Range', 'Stab', 'Slash', 'Crush', 'Magic', 'Range', 'Strength', 'Prayer'];
    const coms = [1675, 1676, 1677, 1678, 1679, 1680, 1681, 1682, 1683, 1684, 1686, 1687];
    const out = new Map<number, string>();
    sums.forEach((v, i) => out.set(coms[i], `${names[i]}: ${v >= 0 ? '+' : ''}${v}`));
    return out;
}
function bonusTextsMatch(bot: Bot): boolean {
    for (const [com, text] of expectedBonusTexts(bot)) {
        if (bot.texts.get(com) !== text) {
            console.log(`   bonus text ${com}: got "${bot.texts.get(com)}", want "${text}"`);
            return false;
        }
    }
    return true;
}

// ---------------------------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------------------------
{
    const bot = await login('eq');

    // wear requirements: every unmet GetCL* rule, printed once per twoHanderz entry (4 times)
    await cheat(bot, 'setstat attack 1');
    await clearInv(bot);
    await give(bot, 'rune_scimitar');
    let from = bot.messages.length;
    await held(bot, 2, 1333);
    check(countMessages(bot, from, 'You need 40 attack to equip this item.') === 4, 'rune scimitar at Attack 1: "You need 40 attack to equip this item." x4');
    check(slotOf(bot, 1333) === 0 && worn(bot)[3]?.id === 4587, 'rune scimitar stays in the inventory');

    // several unmet requirements are all printed (dragon 2h: attack 60 by id, defence 60 by name)
    await cheat(bot, 'setstat defence 1');
    await give(bot, 'dragon_2h_sword');
    from = bot.messages.length;
    await held(bot, 2, 7158);
    const msgs = since(bot, from);
    // with the (unholy book) shield worn, the twoHanderz entry for 7158 prints the 2h message instead
    check(msgs.filter(m => m === 'You need 60 attack to equip this item.').length === 3 && msgs.filter(m => m === 'You need 60 defence to equip this item.').length === 3 && msgs.filter(m => m === 'You cant equip a 2hander with a shield').length === 1, 'dragon 2h: attack and defence 60 messages x3 + the 2h message');

    // wear with the requirement met: the old weapon goes to the first free slot
    await cheat(bot, 'setstat attack 40');
    await held(bot, 2, 1333);
    check(worn(bot)[3]?.id === 1333, 'rune scimitar wielded at Attack 40');
    check(inv(bot)[0]?.id === 4587, 'dragon scimitar swapped into the first free slot');
    check(bonusTextsMatch(bot), 'equipment bonus texts = sum of item.cfg bonuses');

    // two-hander with a shield worn (twoHanderz 7158): message, equipped anyway, shield kept
    await cheat(bot, 'setstat attack 60');
    await cheat(bot, 'setstat defence 60');
    check(worn(bot)[5]?.id === 3842, 'new player wears the unholy book (shield slot)');
    from = bot.messages.length;
    await held(bot, 2, 7158);
    check(countMessages(bot, from, 'You cant equip a 2hander with a shield') === 1, 'dragon 2h + shield: "You cant equip a 2hander with a shield"');
    check(worn(bot)[3]?.id === 7158 && worn(bot)[5]?.id === 3842, 'dragon 2h equipped and the shield kept');

    // is2Hander() with inventory slot 5: nothing from slot 5 can be worn while wielding 7158
    await clearInv(bot);
    await give(bot, 'bronze_dagger', 6);
    from = bot.messages.length;
    await held(bot, 2, 1205, 5);
    check(countMessages(bot, from, 'Two handed item = You cant equip a 2hander with a shield') === 4 && worn(bot)[3]?.id === 7158, 'inventory slot 5 with dragon 2h wielded: refused x4');
    await held(bot, 2, 1205, 4);
    check(worn(bot)[3]?.id === 1205 && inv(bot)[4]?.id === 7158, 'slot 4 bronze dagger wielded, dragon 2h back in slot 4');

    // twohanded.dat (granite maul) with a full inventory: the shield cannot come off and stays
    await cheat(bot, 'setstat strength 50');
    await clearInv(bot);
    await give(bot, 'granite_maul');
    await give(bot, 'logs', 27);
    check(inv(bot).filter(o => o).length === 28, 'inventory full (maul + 27 logs)');
    from = bot.messages.length;
    await held(bot, 2, 4153, 0);
    check(worn(bot)[3]?.id === 4153 && worn(bot)[5]?.id === 3842, 'granite maul wielded with a full inventory, shield kept');
    check(since(bot, from).includes('Not enough space in your inventory.'), 'shield removal: "Not enough space in your inventory."');
    check(inv(bot)[0]?.id === 1205, 'old weapon took the maul\'s slot');

    // with room, the maul takes the shield off
    await clearInv(bot);
    await give(bot, 'bronze_dagger');
    await held(bot, 2, 1205, 0);
    await held(bot, 2, 4153);
    check(worn(bot)[3]?.id === 4153 && worn(bot)[5] === null && slotOf(bot, 3842) >= 0, 'granite maul with room: shield moved to the inventory');

    // no check at all when a shield is put on while a two-hander is wielded
    await held(bot, 2, 3842);
    check(worn(bot)[3]?.id === 4153 && worn(bot)[5]?.id === 3842, 'shield worn together with the granite maul');

    // remove (packet 145 on 1688) needs a free slot
    await clearInv(bot);
    await give(bot, 'logs', 28);
    from = bot.messages.length;
    bot.invButton(1, 4153, 3, WORN);
    await cycles(1);
    check(worn(bot)[3]?.id === 4153 && since(bot, from).includes('Not enough space in your inventory.'), 'remove with a full inventory: refused');
    await clearInv(bot);
    bot.invButton(1, 4153, 3, WORN);
    await cycles(1);
    check(worn(bot)[3] === null && slotOf(bot, 4153) === 0, 'remove weapon');

    // Q6: 'perfect' ring +10000 in every bonus
    await give(bot, 'perfect_ruby_ring');
    await held(bot, 2, 773);
    check(worn(bot)[12]?.id === 773 && bot.texts.get(1675)?.startsWith('Stab: +100') === true && bonusTextsMatch(bot), `'perfect' ring bonuses (${bot.texts.get(1675)})`);

    // mourner cloak: wearing it is refused? no - it has no requirement; it disguises the wearer
    await give(bot, 'mourning_mourner_cloak');
    await held(bot, 2, 6070);
    check(worn(bot)[1]?.id === 6070, 'mourner cloak worn (cape slot)');

    bot.close();
}

// ---------------------------------------------------------------------------------------------
// Food, potions and the boosted-stat decay
// ---------------------------------------------------------------------------------------------
{
    const bot = await login('food');

    // Allstar new players have 98/14 hitpoints; a bite brings a level above base down to base
    check(level(bot, HITPOINTS) > 14, `new player hitpoints above base (${level(bot, HITPOINTS)})`);
    await clearInv(bot);
    await give(bot, 'shrimp');
    let from = bot.messages.length;
    await held(bot, 1, 315);
    check(since(bot, from).includes('You eat the Shrimps.') && level(bot, HITPOINTS) === 14, `shrimp at 98/14 -> ${level(bot, HITPOINTS)} hitpoints`);

    // heal amounts
    await cheat(bot, 'setstat hitpoints 50');
    await cheat(bot, '~allstar_hurt 30');
    await give(bot, 'lobster');
    await held(bot, 1, 379);
    check(level(bot, HITPOINTS) === 32, `lobster heals 12 (20 -> ${level(bot, HITPOINTS)})`);
    await give(bot, 'cake');
    await held(bot, 1, 1891);
    check(level(bot, HITPOINTS) === 36 && slotOf(bot, 1893) >= 0 && slotOf(bot, 1891) < 0, 'cake heals 4 and leaves 2/3 cake');

    // no weapon: the bite waits until one is wielded (the new player's dragon scimitar needs Attack 60)
    await cheat(bot, 'setstat attack 60');
    const weapon = worn(bot)[3]!.id;
    await closeModals(bot); // a level-up chat blocks the equipment tab
    bot.invButton(1, weapon, 3, WORN);
    await cycles(1);
    await give(bot, 'lobster');
    from = bot.messages.length;
    await held(bot, 1, 379, undefined, 2);
    check(slotOf(bot, 379) >= 0 && level(bot, HITPOINTS) === 36 && !since(bot, from).some(m => m.startsWith('You eat')), 'no weapon: lobster not eaten');
    await held(bot, 2, weapon, undefined, 2);
    check(slotOf(bot, 379) < 0 && level(bot, HITPOINTS) === 48 && since(bot, from).includes('You eat the Lobster.'), 'weapon wielded: the waiting lobster is eaten');

    // potions: level reset to base + boost; Strength decays every cycle (timer bug)
    await cheat(bot, 'setstat strength 99');
    await give(bot, '4dose2strength');
    bot.opHeld(1, 2440, slotOf(bot, 2440), INV);
    await bot.until(() => level(bot, STRENGTH) > 99, 3000, 'strength boost');
    check(level(bot, STRENGTH) === 137, `super strength at 99: ${level(bot, STRENGTH)} (137)`);
    await cycles(1);
    check(slotOf(bot, 157) >= 0 && slotOf(bot, 2440) < 0, 'super strength(4) -> (3)');
    await cycles(5);
    const str = level(bot, STRENGTH);
    check(str < 134 && str > 99, `boosted strength drops every cycle (${str} after ~3 s)`);

    await cheat(bot, 'setstat defence 99');
    await give(bot, '4dose2defense');
    bot.opHeld(1, 2442, slotOf(bot, 2442), INV);
    await bot.until(() => level(bot, DEFENCE) > 99, 3000, 'defence boost');
    check(level(bot, DEFENCE) === 117, `super defence at 99: ${level(bot, DEFENCE)} (117)`);
    await cycles(6);
    // BUG: every Strength drop (still boosted) adds 250 cycles to the Defence timer
    check(level(bot, DEFENCE) === 117, `defence does not decay while boosted strength drops (${level(bot, DEFENCE)})`);

    // a new dose resets to base first (boosts do not stack)
    await give(bot, '4dose1magic');
    await cheat(bot, 'setstat magic 50');
    bot.opHeld(1, 3040, slotOf(bot, 3040), INV);
    await bot.until(() => level(bot, MAGIC) > 50, 3000, 'magic boost');
    check(level(bot, MAGIC) === 54, `magic potion +4 (${level(bot, MAGIC)})`);
    await cycles(2);
    check(level(bot, MAGIC) === 53, `first decay one cycle after the dose (${level(bot, MAGIC)})`);
    await held(bot, 1, 3042, undefined, 2);
    check(level(bot, MAGIC) === 54 && slotOf(bot, 3044) >= 0, 'second dose resets to base + 4 and waits for the timer');

    // attack potion 1/10 + half, minimum 2
    await cheat(bot, 'setstat attack 5');
    await give(bot, '3dose1attack');
    bot.opHeld(1, 121, slotOf(bot, 121), INV);
    await bot.until(() => level(bot, ATTACK) > 5, 3000, 'attack boost');
    check(level(bot, ATTACK) === 7, `attack potion at 5 gives the +2 minimum (${level(bot, ATTACK)})`);

    // antipoison
    await give(bot, '4doseantipoison');
    from = bot.messages.length;
    await held(bot, 1, 2446);
    check(since(bot, from).includes('You drink a dose of the antipoison.') && slotOf(bot, 175) >= 0, 'antipoison(4) -> (3)');

    // beer: drunk for 80 cycles, no glass back
    await give(bot, 'beer');
    from = bot.messages.length;
    await held(bot, 1, 1917);
    const drunk = await getvar(bot, 'allstar_drunk_timer');
    check(since(bot, from).includes('You drink the beer, and feel a bit drunk!') && slotOf(bot, 1917) < 0 && drunk > 70 && drunk <= 80, `beer (drunk timer ${drunk})`);

    // unhandled first click
    await give(bot, 'casket');
    from = bot.messages.length;
    await held(bot, 1, 405);
    check(since(bot, from).includes('Nothing interesting is happening.'), 'casket: "Nothing interesting is happening."');

    bot.close();
}

// ---------------------------------------------------------------------------------------------
// Bones: path P (process, needs a weapon) + path B (buryBones, immediate)
// ---------------------------------------------------------------------------------------------
{
    const bot = await login('bone');
    await clearInv(bot);
    let before = xp(bot, PRAYER);
    await give(bot, 'bones');
    let from = bot.messages.length;
    await held(bot, 1, 526, undefined, 2);
    let gained = xp(bot, PRAYER) - before;
    check((gained === 4 || gained === 5) && since(bot, from).includes('You bury the bones.') && slotOf(bot, 526) < 0, `bones: ${gained} xp`);

    before = xp(bot, PRAYER);
    await give(bot, 'dragon_bones');
    from = bot.messages.length;
    await held(bot, 1, 536, undefined, 2);
    check(xp(bot, PRAYER) - before === 144 && countMessages(bot, from, 'You bury the bones.') === 1, `dragon bones with a weapon: ${xp(bot, PRAYER) - before} xp (72 + 72)`);

    before = xp(bot, PRAYER);
    await give(bot, 'zogre_ancestral_bones_ourg');
    await held(bot, 1, 4834, undefined, 2);
    check(xp(bot, PRAYER) - before === 13000, `ourg bones: ${xp(bot, PRAYER) - before} xp (8000 + 5000)`);

    // without a weapon only path B happens; path P fires once a weapon is wielded
    await cheat(bot, 'setstat attack 60'); // to wield the new player's dragon scimitar again
    const weapon = worn(bot)[3]!.id;
    await cycles(1);
    await closeModals(bot); // a level-up chat blocks the equipment tab
    await closeModals(bot);
    bot.invButton(1, weapon, 3, WORN);
    await cycles(1);
    before = xp(bot, PRAYER);
    await give(bot, 'dragon_bones');
    from = bot.messages.length;
    await held(bot, 1, 536, undefined, 2);
    check(xp(bot, PRAYER) - before === 72 && slotOf(bot, 536) < 0 && !since(bot, from).includes('You bury the bones.'), 'no weapon: 72 xp now, bone gone, no message');
    await held(bot, 2, weapon, undefined, 2);
    check(xp(bot, PRAYER) - before === 144 && since(bot, from).includes('You bury the bones.'), 'weapon wielded: the pending bury gives the other 72');

    // big bones: path P 15, path B deletes for 0
    before = xp(bot, PRAYER);
    await give(bot, 'big_bones');
    await held(bot, 1, 532, undefined, 2);
    check(xp(bot, PRAYER) - before === 15 && slotOf(bot, 532) < 0, `big bones: ${xp(bot, PRAYER) - before} xp`);

    bot.close();
}

// ---------------------------------------------------------------------------------------------
// Item on item: fletching (only the listed direction), leather crafting, gem dye
// ---------------------------------------------------------------------------------------------
{
    const bot = await login('fl');
    await clearInv(bot);
    await cheat(bot, 'setstat fletching 1');
    await give(bot, 'knife');
    await give(bot, 'logs');
    let before = xp(bot, FLETCHING);
    await useOn(bot, 1511, 946); // logs on knife: not a combination
    check(slotOf(bot, 1511) >= 0 && slotOf(bot, 48) < 0, 'logs used on a knife: nothing');
    await useOn(bot, 946, 1511); // knife on logs
    check(slotOf(bot, 48) >= 0 && slotOf(bot, 1511) < 0 && xp(bot, FLETCHING) - before === 40, `knife on logs: longbow (u), ${xp(bot, FLETCHING) - before} xp (40 x level 1)`);

    await give(bot, 'bow_string');
    before = xp(bot, FLETCHING);
    await useOn(bot, 48, 1777);
    check(slotOf(bot, 839) >= 0 && slotOf(bot, 48) < 0 && slotOf(bot, 1777) < 0 && xp(bot, FLETCHING) - before === 15, 'string longbow: 15 xp');

    await give(bot, 'yew_logs');
    let from = bot.messages.length;
    await useOn(bot, 946, 1515);
    check(since(bot, from).includes('You need a fletching level of 60 to make this bow.') && slotOf(bot, 1515) >= 0, 'yew logs need 60');

    // leather crafting: the interface opens either way round, gloves need only thread (BUG)
    await give(bot, 'needle');
    await give(bot, 'leather');
    await useOn(bot, 1741, 1733);
    check(bot.main === 2311, `needle/leather opens the leather interface (${bot.main})`);
    await clearInv(bot);
    await give(bot, 'thread', 5);
    from = bot.messages.length;
    bot.ifButton(8638); // leather_crafting:com_116 (gloves)
    await cycles(1);
    check(slotOf(bot, 1059) >= 0 && countOf(bot, 1734) === 4 && since(bot, from).includes('You make some gloves!'), 'gloves made from thread alone');

    // gem on robe
    await give(bot, 'ruby');
    await give(bot, 'gnome_hat_pink');
    await useOn(bot, 1603, 656);
    check(slotOf(bot, 2910) >= 0 && slotOf(bot, 1603) < 0 && slotOf(bot, 656) < 0, 'ruby on pink hat: red hat');

    bot.close();
}

// ---------------------------------------------------------------------------------------------
// Bank: deposit, withdraw, withdraw as note, notes bank as id - 1
// ---------------------------------------------------------------------------------------------
{
    const bot = await login('bank');
    await clearInv(bot);
    await cheat(bot, '~allstar_bank');
    check(bot.main === 5292, `bank open (${bot.main})`);
    const bank = () => bot.invs.get(BANK) ?? [];
    const bankCount = (id: number) => bank().reduce((n, o) => n + (o?.id === id ? o.count : 0), 0);

    await give(bot, 'lobster', 5);
    bot.invButton(1, 379, slotOf(bot, 379), BANK_SIDE);
    await cycles(1);
    check(bankCount(379) === 1 && countOf(bot, 379) === 4, 'deposit 1 lobster');
    bot.invButton(4, 379, slotOf(bot, 379), BANK_SIDE);
    await cycles(1);
    check(bankCount(379) === 5 && countOf(bot, 379) === 0, 'deposit all lobsters');

    // withdraw as note (21010): id + 1 is a note
    bot.ifButton(5386); // bank_main:com_93
    await cycles(1);
    bot.invButton(3, 379, bank().findIndex(o => o?.id === 379), BANK);
    await cycles(1);
    check(countOf(bot, 380) === 5 && bankCount(379) === 0, 'withdraw 10 as notes: 5 noted lobsters');

    // a note deposits as id - 1
    bot.invButton(1, 380, slotOf(bot, 380), BANK_SIDE);
    await cycles(1);
    check(bankCount(379) === 1 && countOf(bot, 380) === 4, 'noted lobster banks as a lobster');

    // coins: id + 1 is not a note -> "Item can't be drawn as note." and the coins come out as coins
    await give(bot, 'coins', 1000);
    bot.invButton(4, 995, slotOf(bot, 995), BANK_SIDE);
    await cycles(1);
    let from = bot.messages.length;
    bot.invButton(5, 995, bank().findIndex(o => o?.id === 995), BANK);
    await cycles(1);
    await countDialog(bot, 300);
    check(since(bot, from).includes("Item can't be drawn as note.") && countOf(bot, 995) === 300 && bankCount(995) === 700, 'withdraw X coins in note mode');

    // withdraw normally (21011)
    bot.ifButton(5387); // bank_main:com_94
    await cycles(1);
    bot.invButton(2, 379, bank().findIndex(o => o?.id === 379), BANK);
    await cycles(1);
    check(countOf(bot, 379) === 1 && bankCount(379) === 0, 'withdraw 5 lobsters from a stack of 1');

    // fromBank BUG: magic shortbow (861) is withdrawn through the id + 2 (iron knife) stackable path
    await clearInv(bot);
    await give(bot, 'magic_shortbow', 10);
    bot.invButton(4, 861, slotOf(bot, 861), BANK_SIDE);
    await cycles(1);
    check(bankCount(861) === 10, 'deposit all 10 magic shortbows');
    bot.invButton(2, 861, bank().findIndex(o => o?.id === 861), BANK);
    await cycles(1);
    check(countOf(bot, 861) === 1 && bankCount(861) === 5, `withdraw 5 magic shortbows: 1 comes out, the bank loses 5 (${countOf(bot, 861)} / ${bankCount(861)})`);

    // deposit box: title, deposit, re-opened
    await clearInv(bot);
    await give(bot, 'lobster');
    await closeModals(bot); // the bank screen is open
    await cheat(bot, '~allstar_depositbox');
    check(bot.main === 4465 && bot.texts.get(7421)?.toLowerCase() === `@whi@the official deposit box of ${bot.username}`.toLowerCase(), `deposit box (${bot.main}, ${bot.texts.get(7421)})`);
    bot.invButton(1, 379, slotOf(bot, 379), 7423);
    await cycles(1);
    check(countOf(bot, 379) === 0 && bot.main === 4465, 'deposit box deposit');
    await closeModals(bot);
    await cheat(bot, '~allstar_bank');
    check(bankCount(379) === 1, 'the deposit box banked the lobster');

    bot.close();
}

// ---------------------------------------------------------------------------------------------
// Drop / pickup, glory, untradeable
// ---------------------------------------------------------------------------------------------
{
    const bot = await login('drop');
    await clearInv(bot);
    await give(bot, 'roguetrader_carpetsller_top'); // 6384 Fighter Torso
    let from = bot.messages.length;
    await held(bot, 5, 6384);
    check(since(bot, from).includes('You drop the Fighter Torso, it vanishes into the ground.') && slotOf(bot, 6384) < 0, '6384 vanishes when dropped');

    await give(bot, 'lobster');
    await held(bot, 5, 379);
    check(slotOf(bot, 379) < 0, 'lobster dropped');
    const here = await bot.coord();
    send(bot, ClientGameProt.OPOBJ3, buf => {
        buf.p2_alt3(379);
        buf.p2_alt3(here.x);
        buf.p2_alt2(here.z);
    });
    await cycles(2);
    check(slotOf(bot, 379) >= 0, 'lobster picked up while standing on it');

    await give(bot, 'amulet_of_glory_4');
    from = bot.messages.length;
    await held(bot, 4, 1712, undefined, 3);
    const c = await bot.coord();
    check(since(bot, from).includes('Home, sweet home') && c.x === 2852 && c.z === 3863 && c.level === 0, `glory rub -> ${c.x},${c.z},${c.level}`);

    bot.close();
}

// ---------------------------------------------------------------------------------------------
// Pickup needs the player on the tile, ring of dueling, god book
// ---------------------------------------------------------------------------------------------
{
    const bot = await login('ring');
    await clearInv(bot);

    // pickup: the first Take walks onto the item, the second picks it up
    await give(bot, 'lobster');
    const spot = await bot.coord();
    await held(bot, 5, 379);
    await cheat(bot, `tele ${spot.level},${spot.x >> 6},${spot.z >> 6},${(spot.x & 63) + 1},${spot.z & 63}`);
    const take = () =>
        send(bot, ClientGameProt.OPOBJ3, buf => {
            buf.p2_alt3(379);
            buf.p2_alt3(spot.x);
            buf.p2_alt2(spot.z);
        });
    take();
    await cycles(3);
    const c0 = await bot.coord();
    check(c0.x === spot.x && c0.z === spot.z && slotOf(bot, 379) < 0, `first Take walks onto the item without picking it up (${c0.x},${c0.z})`);
    take();
    await cycles(2);
    check(slotOf(bot, 379) >= 0, 'second Take picks it up');

    await give(bot, 'ring_of_dueling_8');
    await held(bot, 4, 2552);
    check(bot.chat === 2459 && bot.texts.get(2460) === 'Where would you like to go?', `ring rub menu (${bot.chat}, ${bot.texts.get(2460)})`);
    let from = bot.messages.length;
    bot.ifButton(2462); // Runecraft
    await cycles(2);
    let c = await bot.coord();
    check(c.x === 3040 && c.z === 4840 && since(bot, from).includes('You teleport to the abyssal rift') && since(bot, from).includes('You can feel the magical aura in the air'), `Runecraft -> ${c.x},${c.z}`);
    check((await getvar(bot, 'allstar_duelring')) === 1, 'duelring left set after the rift (BUG)');
    await held(bot, 4, 2552);
    bot.ifButton(2461); // Jad: Hans' menu opens first
    await cycles(1);
    check(bot.chat === 2459 && bot.texts.get(2461) === 'Yea i wanna go own n00bs!', "Jad opens Hans' menu");
    from = bot.messages.length;
    bot.ifButton(2461);
    await cycles(2);
    c = await bot.coord();
    check(c.x === 2837 && c.z === 9581 && since(bot, from).includes("You teleport to the TzTok-Jad's lair") && (await getvar(bot, 'allstar_duelring')) === 0, `Hans option 1 -> Jad ${c.x},${c.z}`);
    check(slotOf(bot, 2552) >= 0, 'ring of dueling(8) keeps its charges');

    // holy book: "Preach" menu, three lines 7 cycles apart, then the sermon resets
    await give(bot, 'saradominbook_complete');
    await held(bot, 3, 3840);
    check(bot.chat === 2480 && bot.texts.get(2481) === 'Select an Option' && bot.texts.get(2482) === 'Wedding rights', 'holy book menu');
    bot.ifButton(2482);
    await cycles(1);
    check((await getvar(bot, 'allstar_sermons')) === 1 && (await getvar(bot, 'allstar_books')) === 1, 'wedding sermon started');
    await cycles(16);
    check((await getvar(bot, 'allstar_sermons')) === 0 && (await getvar(bot, 'allstar_books')) === 0, 'sermon finished and reset after ~15 cycles');


    bot.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
