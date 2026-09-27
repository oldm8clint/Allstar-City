// Objects: world edits, object clicks and item-on-object (allstar/spec/objects_buttons.md).
//   cd engine && npx tsx ../allstar/tests/objects.test.ts
// The bot sends no movement, so every click is made from a tile already within reach.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import ClientGameProt from '../../engine/src/network/game/client/ClientGameProt.js';
import Packet from '../../engine/src/io/Packet.js';

import Bot from './Bot.js';

const PORT = Number(process.env.BOT_PORT ?? 43613);
const WEB_PORT = Number(process.env.BOT_WEB_PORT ?? 8113);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const INV = 3214;

let failures = 0;
const check = (ok: boolean, what: string) => {
    console.log(ok ? 'PASS' : 'FAIL', what);
    if (!ok) {
        failures++;
    }
};
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ---- map data ----

function locsAt(x: number, z: number, level: number): { id: number; shape: number; angle: number }[] {
    const file = path.join(ROOT, `content/maps/m${x >> 6}_${z >> 6}.jm2`);
    const out = [];
    let section = '';
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const s = /^==== (\w+) ====$/.exec(line);
        if (s) {
            section = s[1];
            continue;
        }
        if (section !== 'LOC' || !line) {
            continue;
        }
        const colon = line.indexOf(': ');
        const [l, lx, lz] = line.slice(0, colon).split(' ').map(Number);
        if (l === level && lx === (x & 63) && lz === (z & 63)) {
            const [id, shape = 10, angle = 0] = line.slice(colon + 2).split(' ').map(Number);
            out.push({ id, shape, angle });
        }
    }
    return out;
}

// ---- bot helpers ----

// use an inventory item on a loc (OPLOCU)
function useOnLoc(bot: Bot, obj: number, slot: number, x: number, z: number, loc: number) {
    (bot as unknown as { send(prot: ClientGameProt, write: (buf: Packet) => void): void }).send(ClientGameProt.OPLOCU, buf => {
        buf.p2_alt1(loc);
        buf.p2_alt1(INV);
        buf.p2_alt1(obj);
        buf.p2_alt1(z);
        buf.p2(slot);
        buf.p2_alt3(x);
    });
}

async function coordIs(bot: Bot, x: number, z: number, level = 0, timeout = 4000) {
    const deadline = Date.now() + timeout;
    let c = await bot.coord();
    while (!(c.x === x && c.z === z && c.level === level) && Date.now() < deadline) {
        await sleep(250);
        c = await bot.coord();
    }
    return c;
}

// ::tele level,mx,mz,lx,lz from absolute coordinates
async function at(bot: Bot, x: number, z: number, level = 0) {
    bot.cheat(`tele ${level},${x >> 6},${z >> 6},${x & 63},${z & 63}`);
    const c = await coordIs(bot, x, z, level, 6000);
    if (c.x !== x || c.z !== z || c.level !== level) {
        throw new Error(`could not teleport to ${level},${x},${z}: ${JSON.stringify(c)}`);
    }
    await sleep(600);
}

const inv = (bot: Bot) => bot.invs.get(INV) ?? [];
const count = (bot: Bot, id: number) => inv(bot).reduce((n, o) => n + (o?.id === id ? o.count : 0), 0);
const slotOf = (bot: Bot, id: number) => inv(bot).findIndex(o => o?.id === id);
const xp = (bot: Bot, stat: number) => bot.stats[stat]?.xp ?? 0;
// Bot reads IF_OPENMAIN with g2, but the id arrives as p2_alt2 (low byte + 128, then high byte)
const main = (bot: Bot) => (bot.main === -1 ? -1 : (((bot.main >> 8) - 128) & 0xff) | ((bot.main & 0xff) << 8));

async function empty(bot: Bot) {
    bot.cheat('empty');
    await bot.until(() => inv(bot).every(o => o === null), 4000, 'empty inventory');
}

async function give(bot: Bot, name: string, id: number, n = 1) {
    const before = count(bot, id);
    bot.cheat(`give ${name} ${n}`);
    await bot.until(() => count(bot, id) >= before + Math.min(n, 1), 4000, `give ${name}`);
}

async function level(bot: Bot, stat: string, index: number, value: number) {
    bot.cheat(`setstat ${stat} ${value}`);
    await bot.until(() => bot.stats[index]?.level === value, 4000, `${stat} ${value}`);
}

async function expect(bot: Bot, pattern: RegExp, since: number, timeout = 5000): Promise<boolean> {
    try {
        await bot.waitForMessage(pattern, timeout, since);
        return true;
    } catch {
        return false;
    }
}

// ---- tests ----

const bot = await Bot.connect({ username: `obj${Date.now() % 100000}`, port: PORT, webPort: WEB_PORT });
await sleep(1500);

// world edits (client.NewObjects / Deleteobjects / Deletewalls)
check(locsAt(2856, 3598, 0).some(l => l.id === 7324), 'home fishing portal 7324 placed at 2856,3598');
check([1, 2, 3].every(level => locsAt(3285, 2770, level).some(l => l.id === 10687 && l.shape === 10 && l.angle === 3)), 'mod zone party box 10687 on levels 1-3 (face -1 -> angle 3)');
check(locsAt(3101, 3513, 0).some(l => l.id === 6472) && !locsAt(3101, 3513, 0).some(l => l.id === 6477), '3101,3513: later 6472 overwrites 6477');
check(locsAt(2892, 9907, 0).some(l => l.id === 4626) && !locsAt(2892, 9907, 0).some(l => l.id === 1757), 'heroes basement ladder replaced by stairs 4626');
check(!locsAt(2891, 3511, 0).some(l => l.id === 1516), 'heroes guild door 1516 removed');
check(!locsAt(2895, 3513, 0).some(l => l.id === 1738), 'heroes guild stairs 1738 removed');
check(!locsAt(2816, 3183, 0).some(l => l.id === 1597), 'brimhaven member gate removed');
check(locsAt(2383, 3427, 0).some(l => l.id === 3816 && l.angle === 1), 'skill area drawers 3816 (face 1 -> angle 1)');

// portals (objectClick)
await at(bot, 2856, 3596);
let since = bot.messages.length;
bot.opLoc(1, 2856, 3598, 7324);
check(await expect(bot, /^You teleport to the Fishing area\.$/, since), 'fishing portal message');
let c = await coordIs(bot, 2572, 3852);
check(c.x === 2572 && c.z === 3852 && c.level === 0, `fishing portal -> ${JSON.stringify(c)}`);

// rank-gated portal (2472): players are refused
await at(bot, 2864, 3597);
since = bot.messages.length;
bot.opLoc(1, 2864, 3599, 2472);
check(await expect(bot, /^Sorry You Are Not A Mod Or Admin$/, since) && (await expect(bot, /^You May Have Luck If You Work For It$/, since)), 'mod portal refuses players');

// guild portal level checks (7315 needs 99 strength)
await level(bot, 'strength', 2, 50);
await at(bot, 2756, 3496);
since = bot.messages.length;
bot.opLoc(1, 2756, 3498, 7315);
check(await expect(bot, /^You need 99 strength in order to enter this portal\.$/, since), 'strength guild portal needs 99');

// skill chest 2193: 1700 x firemaking xp, 1m coins, 100 rune arrows, actionTimer 15
await empty(bot);
await level(bot, 'firemaking', 11, 10);
await at(bot, 2380, 3438);
let xp0 = xp(bot, 11);
since = bot.messages.length;
bot.opLoc(1, 2380, 3440, 2193);
check(await expect(bot, /^You Gain Some FireMaking, and get some Cash, and Arrows!\.$/, since), 'fm chest message');
await bot.until(() => count(bot, 995) === 1000000, 3000, 'chest coins').catch(() => {});
check(count(bot, 995) === 1000000 && count(bot, 892) === 100, `fm chest gives 1m coins and 100 rune arrows (${count(bot, 995)}, ${count(bot, 892)})`);
check(xp(bot, 11) - xp0 === 17000, `fm chest xp 1700 x 10 (${xp(bot, 11) - xp0})`);
since = bot.messages.length;
bot.opLoc(1, 2380, 3440, 2193);
check(!(await expect(bot, /You Gain Some FireMaking/, since, 2000)), 'fm chest blocked by actionTimer');

// gem rock 2111 in the skill area (uses the same actionTimer: wait it out)
await sleep(7600);
await level(bot, 'mining', 14, 1);
await at(bot, 2375, 3429);
xp0 = xp(bot, 14);
since = bot.messages.length;
bot.opLoc(1, 2375, 3431, 2111);
check(await expect(bot, /^You Gain Some Mining, and get some Cash!!$/, since), 'gem rock message');
await sleep(600);
check(xp(bot, 14) - xp0 === 1700, `gem rock xp 1700 x 1 (${xp(bot, 14) - xp0})`);

// stalls (objectClick2): no failure, theifTimer 15 for the general stall
await empty(bot);
await level(bot, 'thieving', 17, 1);
await at(bot, 2375, 3432);
xp0 = xp(bot, 17);
since = bot.messages.length;
bot.opLoc(2, 2373, 3432, 4876);
check(await expect(bot, /^You steal from the general stall$/, since) && (await expect(bot, /^and recieve 500k$/, since)), 'general stall messages');
await bot.until(() => count(bot, 995) === 500000, 3000, 'stall coins').catch(() => {});
check(count(bot, 995) === 500000, `general stall 500k coins (${count(bot, 995)})`);
check(xp(bot, 17) - xp0 === 70, `general stall xp 70 x 1 (${xp(bot, 17) - xp0})`);
since = bot.messages.length;
bot.opLoc(2, 2373, 3432, 4876);
check(!(await expect(bot, /You steal from/, since, 1500)), 'stall blocked by theifTimer');
await sleep(6500);
since = bot.messages.length;
bot.opLoc(2, 2373, 3432, 4876);
check(await expect(bot, /^You steal from the general stall$/, since), 'stall again after 15 cycles');
await sleep(7600);
await at(bot, 2375, 3435);
since = bot.messages.length;
bot.opLoc(2, 2373, 3435, 2562);
check(await expect(bot, /^You need a theiving level of 60 to theif from this stall\.$/, since), 'gem stall level check');

// runecrafting on the placed water altar 2480: 5 essence at level 99 -> x5
await empty(bot);
await level(bot, 'runecraft', 20, 99);
await give(bot, 'blankrune', 1436, 5);
await at(bot, 2377, 3432);
xp0 = xp(bot, 20);
since = bot.messages.length;
bot.opLoc(1, 2377, 3434, 2480);
check(await expect(bot, /^You craft 25 Water rune!$/, since), 'water altar crafts 25 water runes');
await sleep(600);
check(count(bot, 555) === 25 && count(bot, 1436) === 0, `runes ${count(bot, 555)}, essence left ${count(bot, 1436)}`);
check(xp(bot, 20) - xp0 === 297000, `runecraft xp 3000 x 99 (${xp(bot, 20) - xp0})`);

// woodcutting pays coins, stump after 20 chops
await empty(bot);
await level(bot, 'woodcutting', 8, 1);
await at(bot, 2978, 3402);
since = bot.messages.length;
bot.opLoc(1, 2978, 3404, 1309);
check(await expect(bot, /^You need a woodcutting level of 60 to chop down this tree\.$/, since), 'yew needs 60 woodcutting');
await level(bot, 'woodcutting', 8, 99);
since = bot.messages.length;
bot.opLoc(1, 2976, 3402, 1276);
check(await expect(bot, /^You begin to cut the tree tree\.$/, since), 'normal tree start message');
check(await expect(bot, /^You need an axe to chop down this tree\.$/, since), 'no axe');
await give(bot, 'bronze_axe', 1351);
xp0 = xp(bot, 8);
since = bot.messages.length;
bot.opLoc(1, 2976, 3402, 1276);
check(await expect(bot, /^You cut and tree, and get some money!$/, since), 'chop message');
check(await expect(bot, /^This tree has run out of logs$/, since, 20000), 'stump after 20 chops');
await sleep(600);
check(count(bot, 995) === 20 * 15000, `20 chops x 15,000 coins (${count(bot, 995)})`);
check(xp(bot, 8) - xp0 === 20 * 500 * 99, `20 chops x 500 x 99 xp (${xp(bot, 8) - xp0})`);

// Slayer Tower spiky chains change height; command teleports keep it (QUIRKS Q3)
await at(bot, 3422, 3549);
bot.opLoc(1, 3422, 3550, 9319);
c = await coordIs(bot, 3422, 3549, 1);
check(c.level === 1 && c.x === 3422 && c.z === 3549, `spiky chain up -> ${JSON.stringify(c)}`);
since = bot.messages.length;
bot.cheat('train');
await bot.waitForMessage(/You teleport to the Training Area!/, 5000, since).catch(() => {});
c = await coordIs(bot, 3209, 2801, 1);
check(c.level === 1 && c.x === 3209 && c.z === 2801, `::train keeps height 1 -> ${JSON.stringify(c)}`);
await empty(bot);
// the crate's tile has walls on its west and south sides: click from the east
await at(bot, 3286, 2770, 1);
since = bot.messages.length;
bot.opLoc(1, 3285, 2770, 10687);
check(await expect(bot, /^Give any of this away and you will be DEMOTED\+BANNED!$/, since), 'party box on level 1 (Q3)');
await sleep(600);
check([1039, 1041, 1043, 1045, 1047, 1049, 1051, 1054, 1056, 1058].every(id => count(bot, id) === 10), 'party box gives 10 of each noted rare');
bot.cheat('slayer');
c = await coordIs(bot, 3428, 3536, 1);
check(c.level === 1, `::slayer keeps height 1 -> ${JSON.stringify(c)}`);
await at(bot, 3422, 3549, 1);
bot.opLoc(1, 3422, 3550, 9320);
c = await coordIs(bot, 3422, 3549, 0);
check(c.level === 0, `spiky chain down -> ${JSON.stringify(c)}`);

// spellbook altar at home: the first click from next to it converts to normal magic
await at(bot, 2855, 3596);
since = bot.messages.length;
bot.opLoc(1, 2854, 3595, 6552);
check(await expect(bot, /^You convert to normal magic\.$/, since), 'altar 1st click: normal magic');
await sleep(600);
since = bot.messages.length;
bot.opLoc(1, 2854, 3595, 6552);
check(await expect(bot, /^You convert to ancient magic\.$/, since), 'altar 2nd click: ancient magic');

// item on object: iron ore on the Abyss furnace
await empty(bot);
await level(bot, 'smithing', 13, 10);
await give(bot, 'iron_ore', 440, 2);
await at(bot, 3041, 4843);
xp0 = xp(bot, 13);
since = bot.messages.length;
useOnLoc(bot, 440, slotOf(bot, 440), 3042, 4843, 2781);
check(await expect(bot, /^You make an iron bar\.$/, since), 'iron ore on furnace');
await sleep(600);
check(count(bot, 2351) === 1 && count(bot, 440) === 1, `iron bar made, one ore left (${count(bot, 2351)}, ${count(bot, 440)})`);
check(xp(bot, 13) - xp0 === 100, `smelting xp 10 x 10 (${xp(bot, 13) - xp0})`);

// copper ore makes a bronze bar but deletes tin ore (none carried -> copper is kept)
await sleep(5000);
await give(bot, 'copper_ore', 436, 1);
since = bot.messages.length;
useOnLoc(bot, 436, slotOf(bot, 436), 3042, 4843, 2781);
check(await expect(bot, /^You make a Bronze bar\.$/, since), 'copper ore on furnace');
await sleep(600);
check(count(bot, 2349) === 1 && count(bot, 436) === 1, `bronze bar made, copper ore kept (${count(bot, 2349)}, ${count(bot, 436)})`);

// wishing well: under 70m
await empty(bot);
await give(bot, 'coins', 995, 1000);
await at(bot, 2860, 3589);
await sleep(5000);
since = bot.messages.length;
useOnLoc(bot, 995, slotOf(bot, 995), 2860, 3591, 884);
check(await expect(bot, /^You Need 70m to drop in the well$/, since), 'well needs 70m');

// key on the godsword minigame chest: brass key -> 10m coins and back to the air altar
await empty(bot);
await give(bot, 'edgevilledungeonkey', 983, 1);
await at(bot, 2465, 4815);
since = bot.messages.length;
useOnLoc(bot, 983, slotOf(bot, 983), 2465, 4817, 4126);
check(await expect(bot, /^Well done, you have just finished your mini game, here's your reward :\)$/, since), 'key chest message');
c = await coordIs(bot, 2845, 4832);
check(c.x === 2845 && c.z === 4832, `key chest teleport -> ${JSON.stringify(c)}`);
check(count(bot, 995) === 10000000 && count(bot, 983) === 0, `brass key: 10m coins, key taken (${count(bot, 995)})`);

// anvil: bars open the smithing frame; Make 1 bronze dagger
await empty(bot);
await level(bot, 'smithing', 13, 1);
await give(bot, 'hammer', 2347, 1);
await give(bot, 'bronze_bar', 2349, 2);
await at(bot, 2378, 3440);
since = bot.messages.length;
useOnLoc(bot, 2349, slotOf(bot, 2349), 2378, 3442, 2783);
await bot.until(() => main(bot) === 994, 4000, 'smithing interface').catch(() => {});
check(main(bot) === 994, `bars on anvil open the smithing interface (${main(bot)})`);
xp0 = xp(bot, 13);
bot.invButton(1, 1205, 0, 1119);
await bot.until(() => count(bot, 1205) === 1, 4000, 'dagger').catch(() => {});
check(count(bot, 1205) === 1 && count(bot, 2349) === 1, `bronze dagger made from 1 bar (${count(bot, 1205)}, ${count(bot, 2349)})`);
check(xp(bot, 13) - xp0 === 500, `smithing xp 500 per bronze bar (${xp(bot, 13) - xp0})`);

bot.close();
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
