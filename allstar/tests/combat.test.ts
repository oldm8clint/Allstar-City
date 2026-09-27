// Combat workstream bot tests (run against a server with NODE_ALLSTAR_COMBAT=true):
//   cd engine && npx tsx ../allstar/tests/combat.test.ts
// Each scenario logs in fresh bots and logs them out again, because Allstar-Scape NPCs stop
// fighting as soon as ANY online player is 5+ tiles away (NPCHandler.process, reproduced).
import Bot, { BotNpc } from './Bot.js';

const PORT = Number(process.env.COMBAT_PORT ?? 43615);
const WEB_PORT = Number(process.env.COMBAT_WEB_PORT ?? 8115);
const only = process.argv[2];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const failures: string[] = [];
function check(ok: boolean, what: string) {
    console.log(ok ? 'PASS' : 'FAIL', what);
    if (!ok) failures.push(what);
}

async function login(prefix: string): Promise<Bot> {
    const bot = await Bot.connect({ username: `${prefix}${Date.now() % 100000}`, port: PORT, webPort: WEB_PORT });
    await sleep(1500);
    // 99 combat stats: no level-up dialogs (Lost City's p_pausebutton ones block walking while
    // another level-up waits in the queue) and enough hitpoints to survive the NPCs under test
    for (const stat of ['attack', 'strength', 'defence', 'hitpoints', 'ranged', 'prayer', 'magic']) {
        bot.cheat(`setstat ${stat} 99`);
    }
    await sleep(1200);
    return bot;
}

async function debug(bot: Bot, cmd: string, pattern: RegExp): Promise<string[]> {
    const since = bot.messages.length;
    bot.cheat(cmd);
    await sleep(800);
    return bot.messages.slice(since).filter(m => pattern.test(m));
}

async function maxHit(bot: Bot): Promise<number> {
    const [line] = await debug(bot, '~asme', /^asme clock/);
    return Number(/maxhit=(\d+)/.exec(line ?? '')?.[1] ?? -1);
}

async function tele(bot: Bot, x: number, z: number) {
    bot.cheat(`~astele ${x} ${z}`);
    await bot.until(() => bot.self.x === x && bot.self.z === z, 5000, `tele ${x},${z}`);
    await sleep(1200);
}

async function walkTo(bot: Bot, x: number, z: number) {
    bot.walk(x, z);
    await bot.until(() => bot.self.x === x && bot.self.z === z, 15000, `walk to ${x},${z}`);
    await sleep(1200);
}

const positions = (npcs: BotNpc[]) => npcs.map(n => `${n.nid}@${n.x},${n.z}`).join(' ');

// ---- ::train: nothing wanders, a soldier fights back only while the player stands next to it ----
async function trainingArea() {
    const bot = await login('train');
    bot.cheat('train');
    await bot.until(() => bot.self.x === 3209 && bot.self.z === 2801, 5000, '::train');
    await sleep(2000);

    // autospawn.cfg: KBD x2, Jogre x8, Soldier x8, Barbarian woman x12, King Roald, all with range 0 0 0 0
    const types = [50, 113, 35, 17, 648];
    const zone = [...bot.npcs.values()].filter(n => types.includes(n.type));
    const spawn = new Map(zone.map(n => [n.nid, `${n.x},${n.z}`]));
    check(zone.length === 31, `::train has the 31 autospawn NPCs (${zone.length})`);

    const soldier = [...bot.npcs.values()].filter(n => n.type === 35).sort((a, b) => b.z - a.z || a.x - b.x)[0];
    const home = `${soldier.x},${soldier.z}`;

    // stand next to it first: an attack clicked from 5+ tiles away is leashed at once (spec 2.3 step 5)
    await walkTo(bot, soldier.x + 1, soldier.z);
    const max = await maxHit(bot);
    const hitsBefore = soldier.hits.length;
    const myBefore = bot.myHits.length;
    bot.opNpc(2, soldier.nid);
    await sleep(12000);
    const mine = soldier.hits.slice(hitsBefore);
    const theirs = bot.myHits.slice(myBefore);
    check(mine.length >= 4 && mine.length <= 6, `player hits the soldier every 5 cycles (${mine.length} hits in 12 s)`);
    check(mine.every(h => h.damage >= 0 && h.damage <= max), `player hits within 0..${max}: ${mine.map(h => h.damage)}`);
    check(mine.every(h => h.maxHp === 400), 'soldier has npc.cfg hitpoints 400');
    check(theirs.length >= 2 && theirs.length <= 4, `soldier fights back every 7 cycles (${theirs.length} hits in 12 s)`);
    check(theirs.every(h => h.damage >= 0 && h.damage <= 4), `soldier hits within 0..floor(400/100): ${theirs.map(h => h.damage)}`);
    for (let i = 1; i < theirs.length; i++) {
        const gap = theirs[i].at - theirs[i - 1].at;
        check(gap > 3200 && gap < 3800, `soldier attack interval ~3.5 s (${gap} ms)`);
    }

    // walk away: the attack resets, the soldier stays on its tile and stops hitting
    await walkTo(bot, soldier.x + 1, soldier.z + 7);
    const afterWalk = bot.myHits.length;
    await sleep(8000);
    check(bot.myHits.length === afterWalk, 'no hits after walking away');
    check(`${soldier.x},${soldier.z}` === home, `soldier stayed on its tile (${soldier.x},${soldier.z})`);

    // idle for a while: every ::train NPC keeps its spawn tile
    await sleep(16000);
    const moved = zone.filter(n => `${n.x},${n.z}` !== spawn.get(n.nid));
    check(moved.length === 0, `no ::train NPC moved in ~40 s (${positions(moved)})`);
    await bot.logout();
}

// ---- a player that keeps moving is neither chased nor hit (TzTok-Jad, aggressive, Varrock square) ----
async function movingPlayer() {
    const bot = await login('moving');
    // Jad spawns at 3210,3423 but stays wherever its last fight left it: look it up from outside
    // its 20-tile aggression range, then arrive 4 tiles east of it and start stepping at once
    // (a teleport leaves DirectionCount alone, so standing still for 2 cycles would get us hit)
    await tele(bot, 3240, 3423);
    const [line] = await debug(bot, '~asnpc 40', /^asnpc .*jad/i);
    const at = /(\d+),(\d+) hp=/.exec(line ?? '');
    check(at !== null, `TzTok-Jad near Varrock square (${line})`);
    if (!at) {
        await bot.logout();
        return;
    }
    const x = Number(at[1]) + 4;
    const z = Number(at[2]);
    bot.cheat(`~astele ${x} ${z}`);
    await bot.until(() => bot.self.x === x && bot.self.z === z, 5000, `tele ${x},${z}`);
    const since = bot.myHits.length;
    bot.walk(x + 1, z);
    const jad = bot.nearestNpc(2745)!;
    const start = `${jad.x},${jad.z}`;
    // keep stepping between two tiles (a step at least every 2 cycles) for ~11 s
    for (let i = 0; i < 12; i++) {
        await sleep(900);
        bot.walk(x + (i % 2), z);
    }
    await sleep(400);
    check(bot.myHits.length === since, `Jad never hits a player that keeps moving (${bot.myHits.length - since} hits)`);
    check(`${jad.x},${jad.z}` === start, `Jad did not follow (${jad.x},${jad.z})`);

    // stand still: Jad (aggressive within 20 tiles) steps next to the player and attacks every 7 cycles
    await sleep(9000);
    const hits = bot.myHits.slice(since);
    check(hits.length >= 1, `Jad attacks once the player stands still (${hits.length} hits)`);
    check(hits.every(h => h.damage <= 39), `Jad hits within 4 + r(35): ${hits.map(h => h.damage)}`);
    await bot.logout();
}

// ---- death: animation, drop 10 cycles later, back 60 cycles after that (glowing dagger kills at once) ----
async function deathAndRespawn() {
    const bot = await login('death');
    bot.cheat('give deathdaggerdone 1');
    await sleep(1000);
    const inv = bot.invs.get(3214) ?? [];
    const slot = inv.findIndex(o => o?.id === 747);
    bot.opHeld(2, 747, slot, 3214);
    await sleep(1200);
    bot.cheat('train');
    await bot.until(() => bot.self.x === 3209 && bot.self.z === 2801, 5000, '::train');
    await sleep(1500);
    const woman = [...bot.npcs.values()].filter(n => n.type === 17).sort((a, b) => a.x - b.x || a.z - b.z)[0];
    const nid = woman.nid;
    const tile = `${woman.x},${woman.z}`;
    await walkTo(bot, woman.x, woman.z - 1);
    bot.opNpc(2, nid);
    await bot.until(() => woman.hits.some(h => h.hp === 0), 8000, 'one-hit kill');
    const killed = woman.hits.find(h => h.hp === 0)!;
    check(killed.damage === 80, `glowing dagger hit for the woman's full 80 hitpoints (${killed.damage})`);
    // the death animation waits for the NPC's actionTimer: if the woman fought back (anim 806) in the
    // cycle before, that is 7 cycles after her attack, otherwise the next cycle
    await bot.until(() => woman.anims.some(a => a.anim === 2304 && a.at >= killed.at), 5000, 'death anim');
    const anim = woman.anims.find(a => a.anim === 2304 && a.at >= killed.at)!;
    const attack = woman.anims.filter(a => a.anim === 806 && a.at <= killed.at && killed.at - a.at < 3500).pop();
    const expected = attack ? attack.at + 3500 : killed.at + 500;
    check(Math.abs(anim.at - expected) <= 600, `death animation once the attack timer is 0 (${anim.at - killed.at} ms after the kill${attack ? `, ${killed.at - attack.at} ms after her attack` : ''})`);
    const objsBefore = bot.groundObjs.length;
    await bot.until(() => !bot.npcs.has(nid), 8000, 'npc gone');
    const gone = Date.now();
    check(gone - anim.at > 4300 && gone - anim.at < 5800, `drop and despawn 10 cycles after the death animation (${gone - anim.at} ms)`);
    // Item2.barbarian: one of 12 items, amount 1, on the woman's tile, visible to the killer
    await sleep(600);
    const drop = bot.groundObjs.slice(objsBefore).find(o => `${o.x},${o.z}` === tile);
    const barbarian = [1725, 1704, 1038, 3105, 1305, 5698, 4587, 4726, 7386, 7394, 7390, 995];
    check(drop !== undefined && barbarian.includes(drop.id) && drop.count === 1, `dropped one Item2.barbarian item on her tile (${drop ? `${drop.id} x${drop.count}` : 'nothing'})`);
    await bot.until(() => bot.npcs.has(nid), 35000, 'respawn');
    const back = Date.now();
    check(back - gone > 29000 && back - gone < 31500, `respawn 60 cycles after the drop (${back - gone} ms)`);
    const again = bot.npcs.get(nid)!;
    check(`${again.x},${again.z}` === tile, `respawned on its spawn tile (${again.x},${again.z})`);
    await bot.logout();
}

const scenarios: [string, () => Promise<void>][] = [
    ['train', trainingArea],
    ['moving', movingPlayer],
    ['death', deathAndRespawn]
];
for (const [name, run] of scenarios) {
    if (only && only !== name) {
        continue;
    }
    console.log(`--- ${name}`);
    try {
        await run();
    } catch (err) {
        check(false, `${name}: ${(err as Error).message}`);
    }
    await sleep(1500);
}
console.log(failures.length === 0 ? 'ALL PASSED' : `${failures.length} FAILED`);
process.exit(failures.length === 0 ? 0 : 1);
