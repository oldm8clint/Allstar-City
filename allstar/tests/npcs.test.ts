// NPC interactions: dialogues, option chain, bankers, pickpocketing, click-fishing, teleport npcs,
// boats, make-over, quests and clue scrolls. Run against a server on NODE_PORT 43612 / WEB_PORT 8112:
//   cd engine && npx tsx ../allstar/tests/npcs.test.ts
import Bot from './Bot.js';

const PORT = Number(process.env.BOT_PORT ?? 43612);
const WEB = Number(process.env.BOT_WEB ?? 8112);

// 317/377 component ids used by Allstar-Scape's chatbox
const NPCCHAT1 = 4882; // head 4883, name 4884, line 4885, continue 4886
const NPCCHAT4 = 4900; // name 4902, lines 4903-4906, continue 4907
const CHAT2 = 973; // name 975, lines 976-977, continue 978
const MULTI2 = 2459; // title 2460, options 2461/2462
const INV = 3214;

let failures = 0;
const check = (ok: boolean, what: string) => {
    if (!ok) failures++;
    console.log(ok ? 'PASS' : 'FAIL', what);
};
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function connect(prefix: string): Promise<Bot> {
    return Bot.connect({ username: `${prefix}${Date.now() % 10000}`, port: PORT, webPort: WEB });
}

async function command(bot: Bot, text: string, pause = 700) {
    bot.cheat(text);
    await sleep(pause);
}

async function tele(bot: Bot, x: number, z: number, level = 0) {
    await command(bot, `tele ${level},${x >> 6},${z >> 6},${x & 63},${z & 63}`, 1200);
}

async function getvar(bot: Bot, name: string): Promise<number> {
    const since = bot.messages.length;
    bot.cheat(`getvar ${name}`);
    const text = await bot.waitForMessage(new RegExp(`^get ${name}: `), 5000, since);
    await sleep(300);
    return Number(text.split(': ')[1]);
}

async function setvar(bot: Bot, name: string, value: number) {
    const since = bot.messages.length;
    bot.cheat(`setvar ${name} ${value}`);
    await bot.waitForMessage(new RegExp(`^set ${name}: `), 5000, since);
    await sleep(300);
}

// the nearest such npc, found with the ::~npcnid debugproc: its index (sent with npc options) and tile
async function find(bot: Bot, npc: string): Promise<{ id: number; x: number; z: number }> {
    const since = bot.messages.length;
    bot.cheat(`~npcnid ${npc}`);
    const found = await bot.waitForMessage(/^npcnid /, 5000, since);
    if (found === 'npcnid none') {
        throw new Error(`no ${npc} nearby`);
    }
    await sleep(300);
    const [x, z] = found.slice('npcnid '.length).split(',').map(Number);
    return { id: (await getvar(bot, 'allstar_debug_npc')) & 0xffff, x, z };
}

async function nid(bot: Bot, npc: string): Promise<number> {
    return (await find(bot, npc)).id;
}

// Bots send no client path, so the server walks them naively and can stop diagonally next to an
// npc. Stand on the npc's column first (dialogues open on its row or column within 2 tiles).
async function approach(bot: Bot, npc: string, dx = 0, dz = -1): Promise<number> {
    const at = await find(bot, npc);
    await tele(bot, at.x + dx, at.z + dz);
    return nid(bot, npc);
}

// op on the npc from each side in turn until the expected message arrives (a side can be a wall)
async function act(bot: Bot, npc: string, op: number, expect: RegExp): Promise<number> {
    for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const id = await approach(bot, npc, dx, dz);
        const since = bot.messages.length;
        bot.opNpc(op, id);
        try {
            await bot.waitForMessage(expect, 3000, since);
            return id;
        } catch {
            // try the next side
        }
    }
    throw new Error(`no ${expect} from ${npc}`);
}

async function give(bot: Bot, name: string, obj: number, n = 1) {
    const before = count(bot, obj);
    bot.cheat(`give ${name} ${n}`);
    try {
        await bot.until(() => count(bot, obj) > before, 5000, `::give ${name}`);
    } catch (err) {
        console.log('inventory', JSON.stringify(inv(bot)), JSON.stringify(bot.messages.slice(-5)), bot.chat, bot.main);
        throw err;
    }
    await sleep(300);
}

async function spawn(bot: Bot, npc: string): Promise<number> {
    await command(bot, `npcadd ${npc}`, 900);
    return approach(bot, npc);
}

// op1 on the npc until the chatbox opens (npcs wander between finding and clicking)
async function talk(bot: Bot, npc: string, com: number, line: number, text: string, what: string, spawned = false) {
    for (let attempt = 0; attempt < 4; attempt++) {
        const id = spawned && attempt === 0 ? await spawn(bot, npc) : await approach(bot, npc);
        bot.opNpc(1, id);
        try {
            await bot.until(() => bot.chat === com && bot.texts.get(line) === text, 4000, what);
            check(true, what);
            return;
        } catch {
            await sleep(300);
        }
    }
    check(false, `${what} (chat ${bot.chat}, ${line}=${JSON.stringify(bot.texts.get(line))})`);
}

const inv = (bot: Bot) => bot.invs.get(INV) ?? [];
const count = (bot: Bot, obj: number) => inv(bot).reduce((n, o) => n + (o?.id === obj ? o.count : 0), 0);
const slotOf = (bot: Bot, obj: number) => inv(bot).findIndex(o => o?.id === obj);

async function chat(bot: Bot, com: number, line: number, text: string, what: string) {
    try {
        await bot.until(() => bot.chat === com && bot.texts.get(line) === text, 6000, what);
        check(true, what);
    } catch {
        check(false, `${what} (chat ${bot.chat}, ${line}=${JSON.stringify(bot.texts.get(line))})`);
    }
}

async function closed(bot: Bot, what: string) {
    try {
        await bot.until(() => bot.chat === -1, 4000, what);
        check(true, what);
    } catch {
        check(false, `${what} (chat ${bot.chat}, 4885=${JSON.stringify(bot.texts.get(4885))}, last messages ${JSON.stringify(bot.messages.slice(-4))})`);
    }
}

async function nothingFor(bot: Bot, ms: number, since: number): Promise<string[]> {
    await sleep(ms);
    return bot.messages.slice(since);
}

async function coord(bot: Bot) {
    const c = await bot.coord();
    await sleep(300);
    return c;
}

// ---------------------------------------------------------------------------------------------

async function quests(bot: Bot) {
    // loadquestinterface at login
    check(bot.texts.get(640) === '@red@Allstar-Scape', 'quest tab title');
    check(bot.texts.get(663) === '@whi@Info', 'quest tab Info');
    check(bot.texts.get(7332) === '@whi@Thank you for choosing', 'quest tab line 1');
    check(bot.texts.get(7333) === '@yel@Allstar-Scape', 'quest tab line 2');
    check(bot.texts.get(7334) === '@whi@We hope you have a great', 'quest tab line 3');
    check(bot.texts.get(7336) === '@whi@Good time on our server =)', 'quest tab line 4');
    check(bot.texts.get(7339) === '          - Mod Allstar', 'quest tab signature');
    check(bot.texts.get(7353) === '' && bot.texts.get(7383) === '', 'stock quest names blanked');
}

async function hans(bot: Bot) {
    await tele(bot, 2737, 3466);
    await talk(bot, 'hans', NPCCHAT1, 4885, 'Welcome To Mod Allstarscape !!', 'Hans 1339 line');
    check(bot.texts.get(4886) === 'Click here to Get shot by Hans' && bot.texts.get(4884) === 'Hans', 'Hans continue line + header');
    bot.resumePauseButton(4886);
    await chat(bot, MULTI2, 2461, 'Yea i wanna go own n00bs!', 'Hans 1340 menu');
    check(bot.texts.get(2460) === 'Select an Option' && bot.texts.get(2462) === 'Nah im really scared!', 'Hans menu texts');
    bot.ifButton(2461);
    await sleep(1500);
    check(bot.chat === MULTI2, 'Hans option 1 does nothing (menu stays)');
    bot.ifButton(2462);
    await closed(bot, 'Hans option 2 closes');
    check(bot.texts.get(4885) === 'Fine, you suck!', '"Fine, you suck!" written to 4885');
}

async function hijack(bot: Bot) {
    // Juna's menu (object 6657) opens while NpcDialogue == 0: option 1 opens Hans' menu first
    // ("Mmk thanks for reading!"); option 1 there reaches the JunaTele branch
    await tele(bot, 2737, 3466);
    await command(bot, '~npcsjuna', 900);
    await chat(bot, MULTI2, 2460, 'Hello what do you want?', 'Juna menu via selectoption');
    bot.ifButton(2461);
    await chat(bot, MULTI2, 2461, 'Yea i wanna go own n00bs!', 'option 1 hijacked into Hans menu');
    check(bot.texts.get(4885) === 'Mmk thanks for reading!', '"Mmk thanks for reading!" written');
    bot.ifButton(2461);
    await closed(bot, "Hans' option 1 with JunaTele closes");
    await sleep(900);
    const c = await coord(bot);
    check(c.x === 3253 && c.z === 3466 && c.level === 0, `JunaTele 1 -> ${JSON.stringify(c)}`);
    check((await getvar(bot, 'allstar_junatele')) === 0, 'JunaTele reset');
    // option 2: the player says "Ya ma."
    await command(bot, '~npcsjuna', 900);
    await chat(bot, MULTI2, 2460, 'Hello what do you want?', 'Juna menu again');
    bot.ifButton(2462);
    await chat(bot, CHAT2, 976, 'Ya ma.', 'Juna option 2: "Ya ma."');
    check((await getvar(bot, 'allstar_junatele')) === 0, 'JunaTele reset after "Ya ma."');
    bot.resumePauseButton(978);
    await closed(bot, '"Ya ma." closes');
}

async function ring(bot: Bot) {
    // the Ring of dueling (items) leaves duelring set after the rift (BUG): Hans' option 1 then
    // takes the player to TzTok-Jad's lair
    await give(bot, 'ring_of_dueling_8', 2552);
    bot.opHeld(4, 2552, slotOf(bot, 2552), INV);
    await chat(bot, MULTI2, 2460, 'Where would you like to go?', 'Ring of dueling menu (items)');
    let since = bot.messages.length;
    bot.ifButton(2462);
    await bot.waitForMessage(/^You teleport to the abyssal rift$/, 5000, since);
    await sleep(900);
    check((await getvar(bot, 'allstar_duelring')) === 1, 'duelring left set after the rift');
    await tele(bot, 2737, 3466);
    await talk(bot, 'hans', NPCCHAT1, 4885, 'Welcome To Mod Allstarscape !!', 'Hans after the rift');
    bot.resumePauseButton(4886);
    await chat(bot, MULTI2, 2461, 'Yea i wanna go own n00bs!', 'Hans menu after the rift');
    since = bot.messages.length;
    bot.ifButton(2461);
    await bot.waitForMessage(/^You teleport to the TzTok-Jad's lair$/, 5000, since);
    await bot.waitForMessage(/^As you materialize, you feel the air around you grow hot$/, 5000, since);
    await sleep(900);
    const c = await coord(bot);
    check(c.x === 2837 && c.z === 9581 && c.level === 0, `Hans option 1 with duelring -> Jad ${JSON.stringify(c)}`);
    check((await getvar(bot, 'allstar_duelring')) === 0, 'duelring reset after Jad');
    check(bot.chat === -1, 'chatbox closed after Jad');
}

async function bankers(bot: Bot) {
    await tele(bot, 3094, 3491);
    await talk(bot, 'banker2', NPCCHAT1, 4885, 'Good day, how can I help you?', 'banker dialogue 1');
    check(bot.texts.get(4884) === 'Banker', 'banker header');
    bot.resumePauseButton(4886);
    await chat(bot, MULTI2, 2460, 'What would you like to say?', 'banker menu 2');
    check(bot.texts.get(2461) === "I'd like to access my bank account, please." && bot.texts.get(2462) === "I'd like to check my PIN settings.", 'banker menu options');
    bot.ifButton(2461);
    try {
        await bot.until(() => bot.main === 5292, 4000, 'bank');
        check(true, 'banker option 1 opens the bank');
    } catch {
        check(false, `banker option 1 opens the bank (main ${bot.main})`);
    }
    await talk(bot, 'banker2', NPCCHAT1, 4885, 'Good day, how can I help you?', 'banker dialogue again');
    bot.resumePauseButton(4886);
    await chat(bot, MULTI2, 2460, 'What would you like to say?', 'banker menu again');
    bot.ifButton(2462);
    try {
        await bot.until(() => bot.main === 14924, 4000, 'pin');
        check(bot.texts.get(15038) === 'Customers are reminded' && bot.texts.get(15107) === '3 days', 'banker option 2 opens PIN settings');
    } catch {
        check(false, `banker option 2 opens PIN settings (main ${bot.main})`);
    }
    bot.opNpc(3, await approach(bot, 'banker1'));
    try {
        await bot.until(() => bot.main === 5292, 5000, 'bank op3');
        check(true, 'banker Bank option opens the bank');
    } catch {
        check(false, `banker Bank option (main ${bot.main})`);
    }
}

async function aubury(bot: Bot) {
    await tele(bot, 2743, 3468);
    await talk(bot, 'aubury', NPCCHAT1, 4885, 'Do you want to buy some runes?', 'Aubury 3');
    bot.resumePauseButton(4886);
    await chat(bot, MULTI2, 2462, "Oh it's a rune shop. No thank you, then.", 'Aubury menu 4');
    bot.ifButton(2462);
    await chat(bot, CHAT2, 976, "Oh it's a rune shop. No thank you, then.", 'Aubury player line 5');
    bot.resumePauseButton(978);
    await chat(bot, NPCCHAT1, 4885, 'Well, if you find somone who does want runes, please', 'Aubury 6');
    check(bot.texts.get(4886) === 'send them my way.', 'Aubury 6 continue line');
    bot.resumePauseButton(4886);
    await closed(bot, 'Aubury 6 closes');
    // "Yes please!" opens shop 2
    await talk(bot, 'aubury', NPCCHAT1, 4885, 'Do you want to buy some runes?', 'Aubury 3 again');
    bot.resumePauseButton(4886);
    await chat(bot, MULTI2, 2461, 'Yes please!', 'Aubury menu 4 again');
    bot.ifButton(2461);
    try {
        await bot.until(() => bot.main === 3824 && bot.texts.get(3901) === 'Gold & Trimmed Armor', 5000, 'shop 2');
        check(true, 'Aubury "Yes please!" opens shop 2 Gold & Trimmed Armor');
    } catch {
        check(false, `Aubury shop 2 (main ${bot.main}, title ${bot.texts.get(3901)})`);
    }
}

async function lowe(bot: Bot) {
    await tele(bot, 2823, 3441);
    await talk(bot, 'lowe', CHAT2, 977, 'Ok, where can I find the Consecration seed?', 'Lowe 550 (line on 977)');
    check(bot.texts.get(976) === '', 'Lowe 976 blanked');
    bot.resumePauseButton(978);
    await sleep(1500);
    check(bot.chat === CHAT2, '551 renders nothing, the chat stays');
    bot.resumePauseButton(978);
    await closed(bot, 'second continue closes');
}

async function darkMage(bot: Bot) {
    await tele(bot, 3302, 3198);
    await talk(bot, 'upassmage', NPCCHAT1, 4885, 'Welcome to the Thieving Area :)', 'Dark mage 4444');
    check(bot.texts.get(4884) === 'Dark_mage', 'npc.cfg name keeps underscores');
    bot.resumePauseButton(4886);
    await closed(bot, 'Dark mage closes');
}

async function pickpocket(bot: Bot) {
    await tele(bot, 3291, 3175);
    const id = await act(bot, 'al_kharid_warrior', 3, /^You need 25 theiving to pickpocket warriors\.$/);
    check(true, 'warrior level check');
    await command(bot, 'setstat thieving 25');
    const coins = count(bot, 995);
    let since = bot.messages.length;
    bot.opNpc(3, id);
    await bot.waitForMessage(/^You pickpocket the warrior\.$/, 5000, since);
    await sleep(600);
    check(count(bot, 995) === coins + 1800, `warrior gives 1800 coins (${count(bot, 995) - coins})`);
    since = bot.messages.length;
    bot.opNpc(3, id);
    const extra = await nothingFor(bot, 1500, since);
    check(!extra.some(m => /pickpocket/.test(m)) && count(bot, 995) === coins + 1800, 'actionTimer (10 cycles) blocks the next pickpocket');
}

async function paladin(bot: Bot) {
    await tele(bot, 3300, 3177);
    await command(bot, 'setstat thieving 50');
    await sleep(4000); // the warrior's actionTimer
    const coins = count(bot, 995);
    await act(bot, 'paladin2', 3, /^You pickpocket the paladin\.$/);
    await sleep(600);
    check(count(bot, 995) === coins + 8000, 'paladin gives 8000 coins');
}

async function fishing(bot: Bot) {
    await tele(bot, 2576, 3880);
    const shrimps = count(bot, 317);
    await act(bot, '0_41_53_bigdavefishspot', 1, /^You fish a shrimp$/);
    await sleep(600);
    check(count(bot, 317) === shrimps + 1, 'click-fishing gives a shrimp');
    await tele(bot, 2560, 3890);
    await act(bot, '0_41_53_compofishspot', 1, /^You need a fishing level of 90 to fish manta ray\.$/);
    check(true, 'manta ray level message');
}

async function teleports(bot: Bot) {
    await tele(bot, 2851, 3591);
    const id = await approach(bot, 'fairy');
    bot.opNpc(1, id);
    await sleep(2000);
    let c = await coord(bot);
    check(c.x === 2438 && c.z === 5169 && c.level === 0, `Fairy teleport -> ${JSON.stringify(c)}`);
    const monkey = await spawn(bot, 'magic_carpet_monkey');
    bot.opNpc(1, monkey);
    await sleep(2000);
    c = await coord(bot);
    check(c.x === 2715 && c.z === 9161 && c.level === 1, `Monkey teleport -> ${JSON.stringify(c)}`);
}

async function nothing(bot: Bot) {
    await tele(bot, 3209, 2801);
    const id = await nid(bot, 'king_roald');
    const since = bot.messages.length;
    bot.opNpc(1, id);
    const got = await nothingFor(bot, 3000, since);
    check(bot.chat === -1 && got.length === 0, `King Roald Talk-to does nothing (${JSON.stringify(got)})`);
    await tele(bot, 2855, 3597);
    const wom = await nid(bot, 'wise_old_man');
    const since2 = bot.messages.length;
    bot.opNpc(1, wom);
    const got2 = await nothingFor(bot, 3000, since2);
    check(bot.chat === -1 && got2.length === 0, `Wise Old Man Talk-to does nothing (${JSON.stringify(got2)})`);
    // the Zoo keeper's click ran Thessalia's handler
    await setvar(bot, 'allstar_cluelevel', 0);
    const keeper = await approach(bot, 'zoo_keeper');
    const since3 = bot.messages.length;
    bot.opNpc(1, keeper);
    await bot.waitForMessage(/^Thessalia isn't interested in talking right now\.\.\.$/, 5000, since3);
    check(true, 'Zoo keeper Talk-to gives Thessalia\'s refusal');
}

async function starter(bot: Bot) {
    await tele(bot, 2852, 3591);
    const spirit = await spawn(bot, 'filliman_tarlock_ns');
    const coins = count(bot, 995);
    let since = bot.messages.length;
    bot.opNpc(1, spirit);
    await bot.waitForMessage(/^Get more food from the store owner:zeek$/, 5000, since);
    await sleep(600);
    check(count(bot, 995) === coins + 15000000 && count(bot, 392) >= 1500, 'Nature Spirit starter items');
    since = bot.messages.length;
    bot.opNpc(1, spirit);
    await bot.waitForMessage(/^Why do you have to be greedy\?$/, 5000, since);
    await bot.waitForMessage(/is really greedy trying to type ::starter again$/, 5000, since);
    check(true, 'Nature Spirit second click');
}

async function makeover(bot: Bot) {
    await tele(bot, 2852, 3589);
    await talk(bot, 'makeover_mage', NPCCHAT4, 4904, 'Yo you want a make over?', 'make-over 14600', true);
    check(bot.texts.get(4902) === 'Make-over_mage', 'make-over header');
    bot.resumePauseButton(4907);
    await chat(bot, MULTI2, 2461, 'Sure', 'make-over menu 14601');
    bot.ifButton(2461);
    await chat(bot, NPCCHAT4, 4904, "Ok that'll be 10000 coins", 'make-over 14602');
    bot.resumePauseButton(4907);
    await chat(bot, MULTI2, 2462, 'Gay...', 'make-over menu 14603');
    const coins = count(bot, 995);
    bot.ifButton(2461);
    try {
        await bot.until(() => bot.main === 3559, 5000, 'design');
        await sleep(600);
        check(count(bot, 995) === coins - 10000, 'make-over takes 10000 coins and opens the design screen');
    } catch {
        check(false, `make-over design screen (main ${bot.main})`);
    }
}

async function mageOfZamorak(bot: Bot) {
    await tele(bot, 2852, 3587);
    await talk(bot, 'rcu_zammy_mage1b', NPCCHAT4, 4904, 'Hello, would you like me to tele you to the abyss?', 'Mage of Zamorak 2259', true);
    bot.resumePauseButton(4907);
    await chat(bot, MULTI2, 2461, 'Hell yeah!', 'abyss menu 2260');
    const since = bot.messages.length;
    bot.ifButton(2461);
    await bot.waitForMessage(/^You teleport to the abyss\.$/, 5000, since);
    await sleep(900);
    const c = await coord(bot);
    check(c.x === 3040 && c.z === 4842, `abyss teleport -> ${JSON.stringify(c)}`);
    check(bot.chat === MULTI2, 'the abyss menu stays up');
    bot.ifButton(2461);
    await chat(bot, MULTI2, 2461, 'Yea i wanna go own n00bs!', 'clicking it again: hijack into Hans menu');
    bot.ifButton(2462);
    await closed(bot, 'Hans menu option 2 closes');
}

async function boat(bot: Bot) {
    await tele(bot, 2852, 3585);
    await talk(bot, 'captain_tobias', NPCCHAT4, 4904, 'Do you want to go on a trip to Karjama?', 'Captain Tobias 40', true);
    check(bot.texts.get(4905) === "It's free.", 'boat is free');
    bot.resumePauseButton(4907);
    await chat(bot, MULTI2, 2461, 'Yes, please', 'boat menu 41');
    const dock = await coord(bot);
    const since = bot.messages.length;
    const start = Date.now();
    bot.ifButton(2461);
    await bot.waitForMessage(/^You board the ship\.$/, 5000, since);
    await sleep(2000);
    let c = await coord(bot);
    check(c.x === dock.x && c.z === dock.z && c.level === 3, `on the boat: the void is height 3 above the dock ${JSON.stringify(dock)} -> ${JSON.stringify(c)}`);
    await bot.waitForMessage(/^The boat arrives at Karamja\.$/, 20000, since);
    const secs = (Date.now() - start) / 1000;
    await sleep(600);
    c = await coord(bot);
    check(c.x === 2956 && c.z === 3146 && c.level === 0, `boat arrives at Karamja -> ${JSON.stringify(c)}`);
    check(secs > 13 && secs < 16.5, `trip takes 29 cycles (${secs.toFixed(1)} s)`);
    // the inventory still updates after the ship interface closed
    await give(bot, 'tinderbox', 590);
    check(count(bot, 590) === 1, 'inventory transmits after the trip');
}

async function horvik(bot: Bot) {
    await tele(bot, 2377, 3440);
    await talk(bot, 'horvik_the_armourer', NPCCHAT1, 4885, 'Hey I need help with making some invisible armour...', 'Horvik 100');
    check(bot.texts.get(4886) === "and you're gonna help me.", 'Horvik 100 continue line');
    check((await getvar(bot, 'allstar_q1stage')) === 1, 'q1stage 1 on render');
    bot.resumePauseButton(4886);
    await closed(bot, 'Horvik 100 closes');
    await sleep(600);
    check(bot.texts.get(7332) === '@yel@Invisible Armour', 'quest tab shows Invisible Armour in progress');
    // clue L1/S1/id1 -> dialogue 31, continue runs newclue()
    await setvar(bot, 'allstar_cluelevel', 1);
    await setvar(bot, 'allstar_cluestage', 1);
    await setvar(bot, 'allstar_clueid', 1);
    await talk(bot, 'horvik_the_armourer', NPCCHAT1, 4885, 'Heres your next clue, goodluck', 'Horvik clue 31');
    bot.resumePauseButton(4886);
    await closed(bot, 'clue 31 closes');
    check((await getvar(bot, 'allstar_cluestage')) === 2, 'newclue advanced the stage');
    check((await getvar(bot, 'allstar_npcdialogue')) === 31, 'NpcDialogue stays 31 after closing');
}

async function cook(bot: Bot) {
    await tele(bot, 2852, 3583);
    await talk(bot, 'cook', NPCCHAT1, 4885, "Yo, I'll add what I need to your quest log", 'Cook 200', true);
    bot.resumePauseButton(4886);
    await closed(bot, 'Cook 200 closes');
    await give(bot, 'egg', 1944);
    await give(bot, 'bucket_milk', 1927);
    await give(bot, 'pot_flour', 1933);
    const since = bot.messages.length;
    bot.opNpc(1, await approach(bot, 'cook'));
    await bot.waitForMessage(/^Quest complete!$/, 5000, since);
    await sleep(600);
    check(bot.main === 297 && bot.texts.get(301) === "You have completed Cook's Assistant" && bot.texts.get(4444) === '2', 'Cook quest complete scroll');
    check(count(bot, 775) === 1 && count(bot, 1944) === 0 && count(bot, 1927) === 0 && count(bot, 1933) === 0, `Cooking gauntlets given, ingredients taken ${JSON.stringify(inv(bot))}`);
    check((await getvar(bot, 'allstar_totalqp')) === 2, 'quest points 2');
}

async function mizgog(bot: Bot) {
    await tele(bot, 2852, 3581);
    await talk(bot, 'wizard_mizgog', NPCCHAT4, 4904, "Hi there, you don't happen to of seen a staff", 'Mizgog 301', true);
    bot.resumePauseButton(4907);
    await chat(bot, MULTI2, 2461, 'No but maybe I can help?', 'Mizgog menu 302');
    bot.ifButton(2461);
    await chat(bot, NPCCHAT4, 4904, 'You will? Well I think it\'s located in a', 'Mizgog 303');
    check((await getvar(bot, 'allstar_q3stage')) === 1, 'q3stage 1');
    bot.resumePauseButton(4907);
    await closed(bot, 'Mizgog 303 closes');
}

async function questItems(bot: Bot) {
    await setvar(bot, 'allstar_cluelevel', 0);
    await setvar(bot, 'allstar_q1stage', 1);
    await give(bot, 'runite_ore', 451);
    await give(bot, 'palm_leaf', 2339);
    await give(bot, 'bow_string', 1777);
    await tele(bot, 2377, 3440);
    await talk(bot, 'horvik_the_armourer', NPCCHAT1, 4885, "Thanks for getting me these, I've updated", 'Horvik 1101');
    check(bot.texts.get(4886) === 'your quest log for my next request.', 'Horvik 1101 continue line');
    await sleep(600);
    check(count(bot, 451) === 0 && count(bot, 2339) === 0 && count(bot, 1777) === 0, 'quest 1 materials taken');
    check((await getvar(bot, 'allstar_q1stage')) === 2, 'q1stage 2');
    bot.resumePauseButton(4886);
    await closed(bot, 'Horvik 1101 closes');
    await give(bot, 'magictraining_bookofmagic', 6889);
    await talk(bot, 'horvik_the_armourer', NPCCHAT1, 4885, 'Thanks giving me the Mage Book, now all I need', 'Horvik 1102');
    check(bot.texts.get(4886) === 'is the Consecration seed to add the power to the armour.', 'Horvik 1102 continue line');
    bot.resumePauseButton(4886);
    await sleep(1500);
    check(bot.chat === NPCCHAT1 && count(bot, 6889) === 0, '1102 stays open on continue, the book is taken');
    check((await getvar(bot, 'allstar_q1stage')) === 3, 'q1stage 3');
    // the ghost gives a Scythe at stage 2 only
    await tele(bot, 2852, 3575);
    await setvar(bot, 'allstar_q1stage', 3);
    const ghost = await spawn(bot, 'ahoy_disciple');
    const since = bot.messages.length;
    bot.opNpc(1, ghost);
    await bot.waitForMessage(/^The ghost isn't interested in talking at the moment\.$/, 5000, since);
    check(true, 'Ghost Disciple refuses outside stage 2');
    await setvar(bot, 'allstar_q1stage', 2);
    for (const n of [1, 2]) {
        await talk(bot, 'ahoy_disciple', NPCCHAT1, 4885, 'Happy Halloween from Mod Allstarscape v3!', `Ghost Disciple 6889 (${n})`);
        await sleep(600);
        check(count(bot, 1419) === n, `a Scythe every time (${count(bot, 1419)})`);
        bot.resumePauseButton(4886);
        await closed(bot, 'Ghost Disciple closes');
    }
}

async function mizgogKalrag(bot: Bot) {
    await setvar(bot, 'allstar_q3stage', 1);
    await give(bot, 'ikov_staffofarmardyl', 84);
    await tele(bot, 2852, 3573);
    await talk(bot, 'wizard_mizgog', NPCCHAT4, 4904, "Thanks! Now you'll need to get me", 'Mizgog 305', true);
    check((await getvar(bot, 'allstar_q3stage')) === 2 && count(bot, 84) === 1, 'q3stage 2, the staff is kept');
    bot.resumePauseButton(4907);
    await chat(bot, MULTI2, 2462, 'Ok bye.', 'Mizgog menu 306');
    bot.ifButton(2462);
    await sleep(1500);
    check(bot.chat === MULTI2, '"Ok bye." has no handler: the menu stays');
    bot.ifButton(2461);
    await chat(bot, NPCCHAT4, 4904, 'Kalrag can be found in Lumbridge Swamp,', 'Mizgog 307');
    check(bot.texts.get(4905) === `good luck ${bot.username}!` || /^good luck .+!$/.test(bot.texts.get(4905) ?? ''), `307 names the player (${bot.texts.get(4905)})`);
    bot.resumePauseButton(4907);
    await closed(bot, 'Mizgog 307 closes');
}

async function clueNpcs(bot: Bot) {
    await tele(bot, 2736, 3459);
    const thessalia = await approach(bot, 'thessalia');
    let since = bot.messages.length;
    bot.opNpc(1, thessalia);
    await bot.waitForMessage(/^Thessalia isn't interested in talking right now\.\.\.$/, 5000, since);
    check(true, 'Thessalia refuses without the clue step');
    // clue L2/S5/id2: Louie legs, dialogue 32, rewards on render
    await setvar(bot, 'allstar_cluelevel', 2);
    await setvar(bot, 'allstar_cluestage', 5);
    await setvar(bot, 'allstar_clueid', 2);
    await give(bot, 'trail_clue_easy_simple006', 2682);
    await tele(bot, 2852, 3571);
    const louie = await spawn(bot, 'louie_legs');
    since = bot.messages.length;
    bot.opNpc(1, louie);
    try {
        await bot.until(() => bot.main === 8134 && bot.texts.get(8145) === '@dbl@Congratz, you have completed the treasure trail!', 6000, 'reward');
        check(true, 'Louie legs 32 gives the reward scroll');
    } catch {
        check(false, `Louie legs 32 (main ${bot.main}, chat ${bot.chat})`);
    }
    await sleep(600);
    check(count(bot, 2682) === 0 && (await getvar(bot, 'allstar_cluelevel')) === 0, 'reward took the scroll and reset the clue');
    check(bot.texts.get(4885) === 'Congratulations! Heres your last reward!', 'dialogue 32 text');
}

async function tzhaarBanker(bot: Bot) {
    await tele(bot, 2852, 3569);
    const banker = await spawn(bot, 'tzhaar_banker1');
    bot.opNpc(1, banker);
    try {
        await bot.until(() => bot.main === 5292, 5000, 'tzhaar bank');
        check(true, 'TzHaar-Ket-Zuh Talk-to opens the bank at once');
    } catch {
        check(false, `TzHaar-Ket-Zuh (main ${bot.main})`);
    }
    const turael = await spawn(bot, 'slayer_master_1');
    bot.opNpc(1, turael);
    await sleep(2000);
    const c = await coord(bot);
    check(c.x === 2413 && c.z === 5117, `Turael teleport -> ${JSON.stringify(c)}`);
}

async function level3(bot: Bot) {
    // level 3 stage 5: a dig anywhere gives the reward; the message needs id 1 on 2352,3294
    await setvar(bot, 'allstar_cluelevel', 3);
    await setvar(bot, 'allstar_cluestage', 5);
    await setvar(bot, 'allstar_clueid', 3);
    if (count(bot, 952) === 0) {
        await give(bot, 'spade', 952);
    }
    await tele(bot, 2852, 3567);
    const since = bot.messages.length;
    bot.opHeld(1, 952, slotOf(bot, 952), INV);
    try {
        await bot.until(() => bot.main === 8134 && bot.texts.get(8145) === '@dbl@Congratz, you have completed the treasure trail!', 5000, 'l3 reward');
        check(!bot.messages.slice(since).includes('Congratulations you have completed the treasure trail!'), 'level 3 stage 5: reward from anywhere, no message');
    } catch {
        check(false, `level 3 stage 5 dig anywhere (${JSON.stringify(bot.messages.slice(since))})`);
    }
}

async function clues(bot: Bot) {
    await command(bot, 'empty');
    await setvar(bot, 'allstar_cluelevel', 0);
    await setvar(bot, 'allstar_cluestage', 0);
    await setvar(bot, 'allstar_clueid', 0);
    await bot.until(() => inv(bot).every(o => o === null), 5000, '::empty');
    await give(bot, 'trail_clue_easy_simple006', 2682);
    await give(bot, 'coins', 995, 5);
    const slot = slotOf(bot, 2682);
    let since = bot.messages.length;
    bot.opHeld(1, 2682, slot, INV);
    await bot.waitForMessage(/^Nothing interesting is happening\.$/, 5000, since);
    await sleep(900);
    check(count(bot, 2682) === 0, 'first read of a fresh scroll deletes it');
    check((await getvar(bot, 'allstar_cluelevel')) === 2 && (await getvar(bot, 'allstar_cluestage')) === 1, 'scroll read sets level 2 stage 1');
    // a level 1 trail at its last stage: dig at 3225,3218 (id 1)
    await setvar(bot, 'allstar_cluelevel', 1);
    await setvar(bot, 'allstar_cluestage', 5);
    await setvar(bot, 'allstar_clueid', 1);
    await give(bot, 'spade', 952);
    await tele(bot, 3225, 3218);
    const before = inv(bot).filter(o => o).length;
    since = bot.messages.length;
    bot.opHeld(1, 952, slotOf(bot, 952), INV);
    await bot.waitForMessage(/^Congratulations you have completed the treasure trail!$/, 5000, since);
    await sleep(900);
    const got = bot.messages.slice(since);
    check(got[0] === 'Nothing interesting is happening.' && got[1] === 'Dig working - cheezy' && got[2] === 'Clue level 1 found.', `dig messages ${JSON.stringify(got.slice(0, 3))}`);
    check(bot.main === 8134 && bot.texts.get(8145) === '@dbl@Congratz, you have completed the treasure trail!' && bot.texts.get(8146) === '@dbl@Reward:', 'reward scroll');
    check(/^@dbl@.+@dre@ \(500\)@dbl@$/.test(bot.texts.get(8151) ?? ''), `rune reward line ${bot.texts.get(8151)}`);
    check(inv(bot).filter(o => o).length === before + 5 && count(bot, 952) === 1, 'five rewards added, spade kept');
    check((await getvar(bot, 'allstar_cluelevel')) === 0, 'clue state reset');
    // a dig with no trail only prints the message
    since = bot.messages.length;
    bot.opHeld(1, 952, slotOf(bot, 952), INV);
    const msgs = await nothingFor(bot, 1500, since);
    check(msgs.length === 1 && msgs[0] === 'Nothing interesting is happening.', `spade without a trail ${JSON.stringify(msgs)}`);
}

async function essence(bot: Bot) {
    await tele(bot, 2852, 3579);
    const wizard = await spawn(bot, 'guild_wizard');
    bot.opNpc(3, wizard);
    await sleep(2000);
    const c = await coord(bot);
    check(c.x === 3088 && c.z === 3489 && c.level === 0, `Wizard Distentor Teleport -> ${JSON.stringify(c)}`);
    check((await getvar(bot, 'allstar_essence')) === 3, 'Essence 3');
}

async function gnomeBanker(bot: Bot) {
    await tele(bot, 2852, 3577);
    const banker = await spawn(bot, 'gnomebanker');
    bot.opNpc(1, banker);
    try {
        await bot.until(() => bot.main === 5292, 5000, 'gnome bank');
        check(true, 'gnome banker Talk-to opens the bank at once');
    } catch {
        check(false, `gnome banker (main ${bot.main})`);
    }
}

async function guards(bot: Bot) {
    const since = bot.messages.length;
    await tele(bot, 2790, 10216);
    await bot.waitForMessage(/^The guards kick you out the way\.$/, 5000, since);
    await sleep(900);
    const c = await coord(bot);
    check(c.x === 2790 && c.z === 10214, `quest 1 guards throw the player back -> ${JSON.stringify(c)}`);
}

async function boatAsPlayer(bot: Bot) {
    await tele(bot, 2852, 3585);
    await talk(bot, 'customs_officer', NPCCHAT4, 4904, 'Do you want to go on a trip to Port Sarim?', 'Customs officer 42', true);
    // the trip itself runs as a player (rank 0 cannot use cheats or debugprocs afterwards)
    await command(bot, '~npcsstaff 0');
    bot.resumePauseButton(4907);
    await chat(bot, MULTI2, 2461, 'Yes, please', 'boat menu 43');
    const since = bot.messages.length;
    bot.ifButton(2461);
    await bot.waitForMessage(/^The boat arrives at Port Sarim\.$/, 20000, since);
    check(!bot.messages.slice(since).includes('Invalid teleport!'), `no "Invalid teleport!" for a player (${JSON.stringify(bot.messages.slice(since))})`);
    await sleep(900);
    const pos = bot.messages.length;
    bot.cheat('mypos');
    const text = await bot.waitForMessage(/^You are standing on X=/, 5000, pos);
    check(text === 'You are standing on X=3029 Y=3217', `boat arrives at Port Sarim -> ${text}`);
}

const bot = await connect('npc');
await sleep(1500);
const tests: Record<string, (bot: Bot) => Promise<void>> = {
    quests, hans, hijack, ring, bankers, aubury, lowe, darkMage, pickpocket, paladin, fishing, teleports, nothing,
    starter, makeover, mageOfZamorak, boat, horvik, cook, mizgog, questItems, mizgogKalrag, clueNpcs, tzhaarBanker,
    clues, level3, essence, gnomeBanker, guards, boatAsPlayer
};
// ONLY=hans,bankers runs a subset
const only = process.env.ONLY?.split(',');
try {
    for (const [name, test] of Object.entries(tests)) {
        if (!only || only.includes(name)) {
            await test(bot);
        }
    }
} catch (err) {
    failures++;
    console.log('FAIL', (err as Error).message);
}
bot.close();
console.log(failures === 0 ? 'ALL PASSED' : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
