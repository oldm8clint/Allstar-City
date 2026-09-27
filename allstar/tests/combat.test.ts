// Combat workstream bot tests (run against a server with NODE_ALLSTAR_COMBAT=true):
//   cd engine && npx tsx ../allstar/tests/combat.test.ts
// Each scenario logs in fresh bots and logs them out again, because Allstar-Scape NPCs stop
// fighting as soon as ANY online player is 5+ tiles away (NPCHandler.process, reproduced).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// interface component ids by name (content/pack/interface.pack)
const COMS = new Map<string, number>();
const PACK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../content/pack/interface.pack');
for (const line of fs.readFileSync(PACK, 'utf8').split(/\r?\n/)) {
    const eq = line.indexOf('=');
    if (eq > 0) {
        COMS.set(line.slice(eq + 1), Number(line.slice(0, eq)));
    }
}
function com(name: string): number {
    const id = COMS.get(name);
    if (id === undefined) {
        throw new Error(`no component ${name}`);
    }
    return id;
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
    await bot.until(() => bot.nearestNpc(2745) !== undefined, 800, 'Jad in view');
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

// ---- PvP: Attack (option 3) every 6 cycles outside the safe zones, stopped by a protection prayer,
// by walking away, and not possible in a safe zone; option 2 only prints "You are now following" ----
async function pvp() {
    const a = await login('pvpa');
    const b = await login('pvpb');
    // Lumbridge, outside every nonWild() rectangle
    await tele(a, 3222, 3219);
    await tele(b, 3222, 3220);
    const target = a.playerByName(b.username);
    check(target !== undefined, `the attacker sees the target (${[...a.players.values()].map(p => p.name)})`);
    if (!target) {
        await a.logout();
        await b.logout();
        return;
    }
    let since = a.messages.length;
    a.opPlayer(2, target.pid);
    const follow = await a.waitForMessage(/^You are now following /, 3000, since).catch(() => '');
    check(follow.toLowerCase() === `you are now following ${b.username}`, `option 2 prints the follow message (${follow})`);

    const max = await maxHit(a);
    const hpXp = a.stats[3]?.xp ?? 0;
    const hitsBefore = b.myHits.length;
    a.opPlayer(3, target.pid);
    await sleep(13000);
    const hits = b.myHits.slice(hitsBefore);
    check(hits.length >= 4 && hits.length <= 5, `a player hit every 6 cycles (${hits.length} hits in 13 s)`);
    for (let i = 1; i < hits.length; i++) {
        const gap = hits[i].at - hits[i - 1].at;
        check(gap > 2700 && gap < 3300, `PvP attack interval ~3.0 s (${gap} ms)`);
    }
    check(hits.every(h => h.damage >= 0 && h.damage <= max), `PvP hits within 0..${max}: ${hits.map(h => h.damage)}`);
    const dealt = hits.reduce((sum, h) => sum + h.damage, 0);
    await sleep(600);
    check((a.stats[3]?.xp ?? 0) - hpXp === dealt, `1 Hitpoints xp per damage (${(a.stats[3]?.xp ?? 0) - hpXp} for ${dealt})`);

    // Protect from Melee: the swings stop landing, the attack stays on
    b.ifButton(com('prayer:prayer_protectfrommelee'));
    await sleep(1500);
    const protectedFrom = b.myHits.length;
    await sleep(7000);
    check(b.myHits.length === protectedFrom, `no hits while Protect from Melee is on (${b.myHits.length - protectedFrom})`);
    b.ifButton(com('prayer:prayer_protectfrommelee'));
    await sleep(7000);
    check(b.myHits.length > protectedFrom, `hits again once the prayer is off (${b.myHits.length - protectedFrom})`);

    // walking away resets the attack
    await walkTo(a, 3222, 3217);
    const walked = b.myHits.length;
    await walkTo(a, 3222, 3219);
    await sleep(7000);
    check(b.myHits.length === walked, `walking away stopped the attack (${b.myHits.length - walked} hits)`);

    // a safe zone (home): the click does not start an attack
    since = a.messages.length;
    await tele(a, 2855, 3591);
    await tele(b, 2855, 3592);
    await a.until(() => a.playerByName(b.username) !== undefined, 5000, 'the target at home').catch(err => {
        console.log('players seen:', JSON.stringify([...a.players.values()]), 'self', JSON.stringify(a.self), 'b', JSON.stringify(b.self));
        throw err;
    });
    const home = a.playerByName(b.username)!;
    const safe = b.myHits.length;
    a.opPlayer(3, home.pid);
    await sleep(7000);
    check(b.myHits.length === safe, `no attack in a safe zone (${b.myHits.length - safe} hits)`);
    await a.logout();
    await b.logout();
}

// ---- PvP death: the loser keeps the last 3 valuable stacks, drops the rest for the killer, respawns
// at home; the killer gets pk points (2 for an equal combat level) and a world message ----
async function pvpDeath() {
    const a = await login('pkra');
    const b = await login('pkrb');
    for (const item of ['bronze_sword 1', 'iron_sword 1', 'steel_sword 1', 'coins 100']) {
        b.cheat(`give ${item}`);
        await sleep(600);
    }
    a.cheat('give deathdaggerdone 1');
    await sleep(1000);
    const inv = a.invs.get(3214) ?? [];
    a.opHeld(2, 747, inv.findIndex(o => o?.id === 747), 3214);
    await sleep(1200);
    await tele(a, 3222, 3219);
    await tele(b, 3222, 3220);
    const target = a.playerByName(b.username)!;
    const since = a.messages.length;
    const objs = a.groundObjs.length;
    a.opPlayer(3, target.pid);
    await b.until(() => b.self.x === 2853 && b.self.z === 3591, 10000, 'respawn at home');
    check(true, 'the glowing dagger killed the player; they respawned at 2853,3591');
    const points = await a.waitForMessage(/^You recieve \d+ player-kill/, 3000, since).catch(() => '');
    check(points === 'You recieve 2 player-kill, you now have 2 player-kill points.', `pk points for an equal combat level (${points})`);
    // (the engine's world broadcast wraps long lines: join the pieces)
    await a.waitForMessage(/has FUCKEN OWNED/, 3000, since).catch(() => '');
    await sleep(600);
    const start = a.messages.findIndex((m, i) => i >= since && /has FUCKEN OWNED/.test(m));
    const world = start === -1 ? '' : a.messages.slice(start, start + 2).join(' ').replace(/\s+/g, ' ');
    check(new RegExp(`^${a.username} has FUCKEN OWNED ${b.username}, ${a.username} now has 2 pk points and \\d+ kills!`, 'i').test(world), `world message (${world})`);
    await sleep(1000);
    // worn items and everything but the kept stacks drop on the death tile, owned by the killer
    const drop = a.groundObjs.slice(objs).filter(o => o.x === 3222 && o.z === 3220).map(o => o.id);
    check(drop.includes(1277) && !drop.some(id => [995, 1279, 1281].includes(id)), `the other stacks drop for the killer (${drop})`);
    check((b.invs.get(1688) ?? []).every(o => !o), 'nothing stays worn');
    const kept = (b.invs.get(3214) ?? []).filter(o => o).map(o => o!.id).sort((x, y) => x - y);
    check(JSON.stringify(kept) === JSON.stringify([995, 1279, 1281]), `the last 3 valuable stacks are kept (${kept})`);
    await a.logout();
    await b.logout();
}

const count = (bot: Bot, id: number) => (bot.invs.get(3214) ?? []).reduce((sum, o) => sum + (o?.id === id ? o.count : 0), 0);
const slotOf = (bot: Bot, id: number) => (bot.invs.get(3214) ?? []).findIndex(o => o?.id === id);
const xp = (bot: Bot, stat: number) => bot.stats[stat]?.xp ?? 0;
const RUNES = { fire: 554, water: 555, air: 556, earth: 557, mind: 558, death: 560, nature: 561, chaos: 562, law: 563, blood: 565, soul: 566 };

// ---- magic: spells on an NPC from a distance, the rune bugs, alchemy, telegrab (and its dupe) ----
async function magic() {
    const bot = await login('mage');
    for (const rune of ['firerune', 'waterrune', 'airrune', 'earthrune', 'mindrune', 'deathrune', 'naturerune', 'chaosrune', 'lawrune', 'bloodrune', 'soulrune']) {
        bot.cheat(`give ${rune} 1000`);
        await sleep(300);
    }
    bot.cheat('give rune_platebody 1');
    bot.cheat('give bronze_sword 1');
    await sleep(1000);
    bot.cheat('train');
    await bot.until(() => bot.self.x === 3209 && bot.self.z === 2801, 5000, '::train');
    await sleep(1500);
    const soldier = [...bot.npcs.values()].filter(n => n.type === 35).sort((a, b) => b.z - a.z || a.x - b.x)[0];
    await walkTo(bot, soldier.x + 3, soldier.z);
    const castAt = `${bot.self.x},${bot.self.z}`;

    // Wind strike: 1 + r(6), 1 air + 1 mind, 15 xp per Magic level plus 1000 per damage
    let hits = soldier.hits.length;
    let magicXp = xp(bot, 6);
    let air = count(bot, RUNES.air);
    let mind = count(bot, RUNES.mind);
    bot.opNpcT(soldier.nid, 1152);
    await bot.until(() => soldier.hits.length > hits, 3000, 'wind strike hit');
    let hit = soldier.hits[hits].damage;
    await sleep(700);
    check(hit >= 1 && hit <= 7, `wind strike from 3 tiles hits 1..7 (${hit})`);
    check(air - count(bot, RUNES.air) === 1 && mind - count(bot, RUNES.mind) === 1, 'wind strike takes 1 air and 1 mind rune');
    check(xp(bot, 6) - magicXp === 15 * 99 + 1000 * hit, `wind strike xp 15 x level + 1000 x damage (${xp(bot, 6) - magicXp})`);
    check(`${bot.self.x},${bot.self.z}` === castAt, `the caster stays where they cast (${bot.self.x},${bot.self.z})`);

    // Water blast: 0..26, the water runes are never taken
    hits = soldier.hits.length;
    const water = count(bot, RUNES.water);
    air = count(bot, RUNES.air);
    const death = count(bot, RUNES.death);
    bot.opNpcT(soldier.nid, 1175);
    await bot.until(() => soldier.hits.length > hits, 3000, 'water blast hit');
    hit = soldier.hits[hits].damage;
    await sleep(700);
    check(hit >= 0 && hit <= 26, `water blast hits 0..26 (${hit})`);
    check(count(bot, RUNES.water) === water && air - count(bot, RUNES.air) === 3 && death - count(bot, RUNES.death) === 1, 'water blast takes 3 air and 1 death, no water (BUG)');

    // High alchemy: the item's shop value in coins, 1 nature rune, the 5 fire runes stay
    const coins = count(bot, 995);
    const fire = count(bot, RUNES.fire);
    const nature = count(bot, RUNES.nature);
    magicXp = xp(bot, 6);
    bot.opHeldT(1127, slotOf(bot, 1127), 3214, 1178);
    await bot.until(() => count(bot, 995) > coins, 3000, 'alchemy coins');
    await sleep(600);
    check(count(bot, 995) - coins === 40777 && count(bot, 1127) === 0, `high alchemy gives the shop value (${count(bot, 995) - coins})`);
    check(nature - count(bot, RUNES.nature) === 1 && count(bot, RUNES.fire) === fire, 'high alchemy takes the nature rune only (BUG)');
    check(xp(bot, 6) - magicXp === 65 * 99, `high alchemy xp 65 x level (${xp(bot, 6) - magicXp})`);

    // Telekinetic Grab: from a distance, and again after the item is gone (QUIRKS Q2)
    const sword = slotOf(bot, 1277);
    bot.opHeld(5, 1277, sword, 3214);
    await sleep(1200);
    const x = bot.self.x;
    const z = bot.self.z;
    await walkTo(bot, x + 2, z);
    const law = count(bot, RUNES.law);
    air = count(bot, RUNES.air);
    bot.opObjT(x, z, 1277, 1168);
    await bot.until(() => count(bot, 1277) === 1, 3000, 'telegrab');
    await sleep(600);
    check(count(bot, 1277) === 1 && !bot.groundObjs.some(o => o.id === 1277 && o.x === x && o.z === z), 'telegrab brings the sword back from 2 tiles');
    check(law - count(bot, RUNES.law) === 1 && air - count(bot, RUNES.air) === 1, 'telegrab takes 1 law and 1 air rune');
    bot.opObjT(x, z, 1277, 1168);
    await bot.until(() => count(bot, 1277) === 2, 3000, 'second telegrab');
    check(count(bot, 1277) === 2, 'a telegrab on the item that is already gone still gives one (dupe)');
    await bot.logout();
}

// ---- PvP magic: Tele Block, the 20-cycle cast delay, safe zones ----
async function pvpMagic() {
    const a = await login('mpa');
    const b = await login('mpb');
    for (const rune of ['deathrune', 'bloodrune', 'waterrune']) {
        a.cheat(`give ${rune} 1000`);
        await sleep(300);
    }
    await tele(a, 3222, 3219);
    await tele(b, 3222, 3223);
    const target = a.playerByName(b.username)!;
    let since = b.messages.length;
    const hits = b.myHits.length;
    a.opPlayerT(target.pid, 12445);
    const blocked = await b.waitForMessage(/^A teleblock has been cast on you!$/, 3000, since).catch(() => '');
    check(blocked !== '', 'Tele Block tells the target');
    await sleep(600);
    check(b.myHits.length === hits + 1 && b.myHits[hits].damage === 0, `a spell without damage still hits for 0 (${b.myHits.slice(hits).map(h => h.damage)})`);
    // Ice blitz (ancient spellbook; the Ancient staff would switch to it) within 20 cycles: nothing
    a.cheat('~asancient');
    await sleep(600);
    const deaths = count(a, RUNES.death);
    a.opPlayerT(target.pid, 12871);
    await sleep(2000);
    check(count(a, RUNES.death) === deaths && b.myHits.length === hits + 1, 'no second cast within 20 cycles');
    await sleep(8500);
    since = b.messages.length;
    a.opPlayerT(target.pid, 12871);
    const frozen = await b.waitForMessage(/^You are frozen!$/, 3000, since).catch(() => '');
    await sleep(600);
    check(frozen !== '' && deaths - count(a, RUNES.death) === 20, `Ice blitz after 10 s (${deaths - count(a, RUNES.death)} death runes)`);
    // frozen: walking is refused
    since = b.messages.length;
    const bx = b.self.x;
    const bz = b.self.z;
    b.walk(bx + 2, bz);
    const stuck = await b.waitForMessage(/^A magical force stops you from moving!$/, 3000, since).catch(() => '');
    await sleep(1500);
    check(stuck !== '' && b.self.x === bx && b.self.z === bz, `the frozen player cannot walk (${stuck})`);
    // a safe zone: the message, nothing cast
    await tele(a, 2855, 3591);
    await tele(b, 2855, 3593);
    since = a.messages.length;
    await a.until(() => a.playerByName(b.username) !== undefined, 5000, 'the target at home');
    a.opPlayerT(a.playerByName(b.username)!.pid, 12861);
    const safe = await a.waitForMessage(/^This player is in a safe zone and cannot be attacked$/, 3000, since).catch(() => '');
    check(safe !== '', 'no spells in a safe zone');
    await a.logout();
    await b.logout();
}

async function wield(bot: Bot, name: string, id: number) {
    bot.cheat(`give ${name} 1`);
    await bot.until(() => slotOf(bot, id) !== -1, 3000, `give ${name}`);
    bot.opHeld(2, id, slotOf(bot, id), 3214);
    await bot.until(() => (bot.invs.get(1688) ?? [])[3]?.id === id, 3000, `wield ${name}`);
    await sleep(600);
}

async function specState(bot: Bot): Promise<{ special: number; using: number }> {
    const [line] = await debug(bot, '~asme', /^asme clock/);
    const [line2] = bot.messages.slice(-3).filter(m => m.startsWith('asme2'));
    return { special: Number(/special=(-?\d+)/.exec(line ?? '')?.[1] ?? -1), using: Number(/usespec=(\d+)/.exec(line2 ?? '')?.[1] ?? -1) };
}

// ---- special attacks on an NPC: the whip's 20..30 for 50 energy, the DDS's second hit 2 cycles later ----
async function specials() {
    const bot = await login('spec');
    await wield(bot, 'abyssal_whip', 4151);
    bot.cheat('train');
    await bot.until(() => bot.self.x === 3209 && bot.self.z === 2801, 5000, '::train');
    await sleep(1500);
    const soldiers = [...bot.npcs.values()].filter(n => n.type === 35).sort((a, b) => b.z - a.z || a.x - b.x);
    const soldier = soldiers[0];
    await walkTo(bot, soldier.x + 1, soldier.z);
    bot.ifButton(com('combat_whip:specbar'));
    await sleep(600);
    let state = await specState(bot);
    check(state.using === 1, 'the whip special bar toggles usingSpecial');
    const hits = soldier.hits.length;
    bot.opNpc(2, soldier.nid);
    await bot.until(() => soldier.hits.length > hits, 4000, 'whip special hit');
    const hit = soldier.hits[hits].damage;
    await sleep(600);
    state = await specState(bot);
    check(hit >= 20 && hit <= 30, `the whip special hits 20..30 (${hit})`);
    // (+1 energy every 4 cycles since)
    check(state.special >= 50 && state.special <= 51 && state.using === 0, `it costs 50 energy and turns itself off (${state.special}, ${state.using})`);
    await walkTo(bot, soldier.x + 1, soldier.z + 1);

    // DDS: the special hit is the normal roll, plus r(25) two cycles later
    await wield(bot, 'dragon_dagger_p++', 5698);
    await sleep(3000);
    const second = soldiers[1];
    await walkTo(bot, second.x + 1, second.z);
    bot.ifButton(com('combat_stabsword:specbar'));
    await sleep(600);
    const before = second.hits.length;
    bot.opNpc(2, second.nid);
    await bot.until(() => second.hits.length >= before + 2, 5000, 'DDS special hits');
    const [first, extra] = second.hits.slice(before, before + 2);
    check(extra.at - first.at > 700 && extra.at - first.at < 1300, `the second hit comes 2 cycles later (${extra.at - first.at} ms)`);
    check(extra.damage <= 25, `the second hit is r(25) (${extra.damage})`);
    await bot.logout();
}

// ---- FightType from the Allstar-Scape tab buttons: max hit (Str + bonus) / 6.83 accurate, / 6.66 aggressive ----
async function styles() {
    const bot = await login('style');
    await wield(bot, 'dragon_scimitar', 4587);
    const fight = async () => {
        const [line] = await debug(bot, '~asme', /^asme clock/);
        return { type: Number(/fight=(\d+)/.exec(line ?? '')?.[1] ?? -1), max: Number(/maxhit=(\d+)/.exec(line ?? '')?.[1] ?? -1) };
    };
    bot.ifButton(com('combat_hacksword:hack0'));
    await sleep(600);
    const accurate = await fight();
    bot.ifButton(com('combat_hacksword:hack1'));
    await sleep(600);
    const aggressive = await fight();
    bot.ifButton(com('combat_hacksword:hack2'));
    await sleep(600);
    const controlled = await fight();
    bot.ifButton(com('combat_hacksword:hack3'));
    await sleep(600);
    const defensive = await fight();
    check(accurate.type === 1 && aggressive.type === 2 && controlled.type === 3 && defensive.type === 4, `the sword tab buttons set FightType 1/2/3/4 (${accurate.type}/${aggressive.type}/${controlled.type}/${defensive.type})`);
    check(aggressive.max >= accurate.max && accurate.max === defensive.max, `aggressive hits at least as hard (${accurate.max}/${aggressive.max}/${controlled.max}/${defensive.max})`);
    await bot.logout();
}

// ---- rock crabs: a dead Rock Crab comes back as Rocks, which wake up (Rock Crab again) 2 cycles after a
// player comes within 2 tiles ----
async function rockCrab() {
    const bot = await login('crab');
    await wield(bot, 'deathdaggerdone', 747);
    await tele(bot, 2680, 3718);
    const crab = [...bot.npcs.values()].filter(n => n.type === 1265).sort((a, b) => a.x - b.x || a.z - b.z)[0];
    check(crab !== undefined, `Rock Crabs spawn awake at the Rellekka crab area (${[...bot.npcs.values()].map(n => n.type).join(',')})`);
    if (!crab) {
        await bot.logout();
        return;
    }
    const nid = crab.nid;
    const spawn = { x: crab.x, z: crab.z };
    await tele(bot, crab.x, crab.z - 1);
    const hits = crab.hits.length;
    bot.opNpc(2, nid);
    await bot.until(() => crab.hits.slice(hits).some(h => h.hp === 0), 5000, 'kill the crab');
    check(crab.hits[crab.hits.length - 1].maxHp === 5000, `Rock Crabs have 5000 hitpoints (${crab.hits[crab.hits.length - 1].maxHp})`);
    // stay more than 2 tiles away while it respawns
    await tele(bot, spawn.x, spawn.z - 5);
    await bot.until(() => !bot.npcs.has(nid), 12000, 'crab gone');
    await bot.until(() => bot.npcs.has(nid), 40000, 'crab respawn');
    const rocks = bot.npcs.get(nid)!;
    check(rocks.type === 1266, `it comes back as Rocks (${rocks.type})`);
    await sleep(2000);
    check(rocks.type === 1266, 'the Rocks sleep while nobody is within 2 tiles');
    await tele(bot, spawn.x, spawn.z - 2);
    await bot.until(() => bot.npcs.get(nid)?.type === 1265, 3000, 'rocks wake up');
    check(bot.npcs.get(nid)?.type === 1265, 'a player within 2 tiles wakes the Rocks into a Rock Crab');
    await bot.logout();
}

// ---- prayers: Protect from Melee drains a point at once, then one every 14 cycles; turning it off stops it ----
async function prayer() {
    const bot = await login('pray');
    await sleep(600);
    const start = bot.stats[5]?.level ?? 0;
    const t0 = Date.now();
    bot.ifButton(com('prayer:prayer_protectfrommelee'));
    await bot.until(() => (bot.stats[5]?.level ?? 0) === start - 1, 2000, 'first prayer point');
    const first = Date.now() - t0;
    await bot.until(() => (bot.stats[5]?.level ?? 0) === start - 2, 9000, 'second prayer point');
    const second = Date.now() - t0;
    check(first < 1300, `the first point drains at once (${first} ms)`);
    check(second - first > 6600 && second - first < 7600, `then one every 14 cycles (${second - first} ms)`);
    bot.ifButton(com('prayer:prayer_protectfrommelee'));
    await sleep(8000);
    check((bot.stats[5]?.level ?? 0) === start - 2, `no drain once it is off (${bot.stats[5]?.level})`);
    await bot.logout();
}

// ---- poison: a DDS hit poisons; 39 cycles later 1..6 with the poison splat and the message ----
async function poison() {
    const a = await login('psna');
    const b = await login('psnb');
    await wield(a, 'dragon_dagger_p++', 5698);
    await tele(a, 3222, 3219);
    await tele(b, 3222, 3220);
    await a.until(() => a.playerByName(b.username) !== undefined, 5000, 'target');
    const hits = b.myHits.length;
    a.opPlayer(3, a.playerByName(b.username)!.pid);
    await b.until(() => b.myHits.length > hits, 5000, 'DDS hit');
    const poisoned = b.myHits[hits].at;
    await walkTo(a, 3222, 3217);
    const since = b.messages.length;
    await b.waitForMessage(/^You start to die of poison$/, 25000, since);
    await sleep(600);
    const hit = b.myHits.filter(h => h.at > poisoned + 1000).pop();
    check(hit !== undefined && hit.type === 2 && hit.damage >= 1 && hit.damage <= 6, `a poison splat of 1..6 (${hit?.damage}, type ${hit?.type})`);
    check(hit !== undefined && hit.at - poisoned > 18800 && hit.at - poisoned < 20300, `39 cycles after the poisoning hit (${hit ? hit.at - poisoned : -1} ms)`);
    await a.logout();
    await b.logout();
}

const scenarios: [string, () => Promise<void>][] = [
    ['train', trainingArea],
    ['moving', movingPlayer],
    ['death', deathAndRespawn],
    ['pvp', pvp],
    ['pvpdeath', pvpDeath],
    ['magic', magic],
    ['pvpmagic', pvpMagic],
    ['specials', specials],
    ['styles', styles],
    ['rockcrab', rockCrab],
    ['prayer', prayer],
    ['poison', poison]
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
