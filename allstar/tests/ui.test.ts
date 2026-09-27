// ui workstream: ::commands, emote tab, HUD, login texts and level-ups against a running server.
//   cd engine && npx tsx ../allstar/tests/ui.test.ts
// Ports: ALLSTAR_PORT / ALLSTAR_WEB_PORT (default 43616 / 8116, the ui worktree's server).
import Bot from './Bot.js';

const port = Number(process.env.ALLSTAR_PORT) || 43616;
const webPort = Number(process.env.ALLSTAR_WEB_PORT) || 8116;

let failures = 0;
const check = (ok: boolean, what: string) => {
    if (!ok) failures++;
    console.log(ok ? 'PASS' : 'FAIL', what);
};
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
let serial = Date.now() % 10000;
const connect = (prefix: string) => Bot.connect({ username: `${prefix}${serial++}`, port, webPort });
const display = (bot: Bot) => bot.username.charAt(0).toUpperCase() + bot.username.slice(1);

// Sends a command and waits a tick so the flood counter (+1 per command, -1 per cycle) stays low.
async function cmd(bot: Bot, text: string, wait = 600) {
    bot.cheat(text);
    await sleep(wait);
}

async function expectMessage(bot: Bot, pattern: RegExp, what: string, since: number, timeout = 4000) {
    try {
        await bot.waitForMessage(pattern, timeout, since);
        check(true, what);
    } catch (err) {
        check(false, `${what}: ${(err as Error).message}`);
    }
}

async function expectClosed(bot: Bot, what: string, timeout = 4000) {
    try {
        await bot.until(() => bot.closed, timeout, 'disconnect');
        check(true, what);
    } catch {
        check(false, what);
    }
}

function inventory(bot: Bot) {
    return bot.invs.get(3214) ?? [];
}

async function setRights(bot: Bot, rights: number) {
    await cmd(bot, `setvar allstar_rights ${rights}`);
}

// ---------------------------------------------------------------- login, texts, HUD
{
    const bot = await connect('uil');
    await sleep(2500);
    check(bot.main === 15944, `welcome screen is 317 interface 15944 (${bot.main})`);
    check(bot.texts.get(15952) === 'Reputation: @whi@0', `welcome reputation line: ${bot.texts.get(15952)}`);
    check(bot.texts.get(15959) === 'Server created by - Mod Allstar', 'welcome created-by line');
    check(bot.texts.get(7332) === '@whi@Thank you for choosing', `quest tab line: ${bot.texts.get(7332)}`);
    check(bot.texts.get(7339) === '          - Mod Allstar', 'quest tab signature');
    check(bot.texts.get(2450) === 'Allstar-Scape', 'logout tab text');
    check(bot.texts.get(2458) === 'Log Out.. Come Back!', 'logout button text');
    check(bot.texts.get(181) === '@Whi@Train', `emote label No -> Train: ${bot.texts.get(181)}`);
    check(bot.texts.get(180) === '', 'emote label Yes blanked by TextHandler');
    check(/^@whi@ Players Online: \d+$/.test(bot.texts.get(174) ?? ''), `emote header players online: ${bot.texts.get(174)}`);
    check(bot.texts.get(5067) === '@whi@Hommie List', 'friends list title');
    check(bot.texts.get(4120) === '@gre@Smihing XP:', 'skill hover typo');
    check(bot.texts.get(5383) === `@whi@The Official Bank Of ${display(bot)}`, `bank title: ${bot.texts.get(5383)}`);
    check(bot.texts.get(183) === 'Your coordinates', 'coordinates label');
    check(bot.texts.get(184) === 'X: 2852 Y: 3591', `coordinates: ${bot.texts.get(184)}`);
    check(bot.texts.get(149) === '@whi@1@gre@0@whi@0@gre@%', `run energy text: ${bot.texts.get(149)}`);
    check(bot.overlay === 19100 && bot.texts.get(19103) === '@gre@Safe', `safe overlay at home (${bot.overlay}, ${bot.texts.get(19103)})`);
    const welcome = bot.messages.indexOf('Welcome to Allstar-Scape');
    const broadcast = bot.messages.findIndex(m => m.endsWith(' has logged in'));
    check(welcome !== -1 && broadcast > welcome, 'login broadcast after the welcome messages');

    // wild overlay outside the safe zones, text follows the tile
    let since = bot.messages.length;
    // (Lost City's own wilderness overlay still opens for a tick when entering its zones)
    await cmd(bot, 'testminigame', 2500);
    check(bot.overlay === 19100 && bot.texts.get(19103) === '@red@Wild', `wild overlay (${bot.overlay}, ${bot.texts.get(19103)})`);
    check(bot.texts.get(184) === 'X: 3114 Y: 9928', `coordinates after teleport: ${bot.texts.get(184)}`);
    await cmd(bot, 'home', 1500);
    check(bot.texts.get(19103) === '@gre@Safe', 'back to safe');

    // ::serverpanel only toggles (the panel was overwritten in the same cycle)
    since = bot.messages.length;
    await cmd(bot, 'serverpanel');
    await expectMessage(bot, /^You have turned the server panel off\. Type ::serverpanel to get it back\.$/, '::serverpanel off', since);
    since = bot.messages.length;
    await cmd(bot, 'SERVERPANEL');
    await expectMessage(bot, /^You have turned the server panel back on\. Type ::serverpanel if you wish to turn it off\.$/, '::serverpanel on (any case)', since);
    bot.close();
}

// ---------------------------------------------------------------- matching rules
{
    const bot = await connect('uim');
    await sleep(2000);
    let since = bot.messages.length;
    await cmd(bot, 'HoMe', 1200);
    await expectMessage(bot, /^You teleport to Home\.$/, '::HoMe (equalsIgnoreCase)', since);

    since = bot.messages.length;
    await cmd(bot, 'Pest', 1200);
    let c = await bot.coord();
    check(!(c.x === 2657 && c.z === 2639), `::Pest does nothing (startsWith is case-sensitive) ${JSON.stringify(c)}`);
    await cmd(bot, 'pestxyz', 1200);
    c = await bot.coord();
    check(c.x === 2657 && c.z === 2639, `::pestxyz teleports to pest ${JSON.stringify(c)}`);

    // ::mypos runs two handlers
    since = bot.messages.length;
    await cmd(bot, 'mypos');
    await expectMessage(bot, /^You are standing on X=2657 Y=2639$/, '::mypos first handler', since);
    await expectMessage(bot, /^You are standing on X=2657 Y=2639 Your Height=0$/, '::mypos second handler', since);
    await expectMessage(bot, /^CurrentX: \d+ CurrentY: \d+$/, '::mypos CurrentX line', since);

    // ::players: scroll with the player on the second line + count
    since = bot.messages.length;
    await cmd(bot, 'players', 1000);
    await expectMessage(bot, /^There are currently \d+ players!$/, '::players count', since);
    check(bot.main === 8134 && bot.texts.get(8144) === '@dre@Players', `::players scroll (${bot.main})`);
    check([...Array(20).keys()].some(i => bot.texts.get(8148 + i) === `@red@${display(bot)}`), 'own name on the player list');

    // ::mystats: two handlers, total level bug
    since = bot.messages.length;
    await cmd(bot, 'mystats');
    await expectMessage(bot, /^Total lvl:  \d+$/, '::mystats total', since);
    await expectMessage(bot, /^PkPts: 0 Kills: 0 Deaths: 0$/, '::mystats pk line', since);

    // no-argument handlers that threw: the issuer is disconnected
    since = bot.messages.length;
    bot.cheat('rep');
    await expectClosed(bot, '::rep without a name disconnects');
}

{
    const bot = await connect('uic');
    await sleep(2000);
    bot.cheat('rep nobodyhere');
    await expectClosed(bot, '::rep offline name disconnects');
}

{
    const bot = await connect('uis');
    await sleep(2000);
    const since = bot.messages.length;
    bot.cheat('suggest');
    await expectMessage(bot, /^Sending\.\.\.$/, '::suggest sends first', since);
    await expectClosed(bot, '::suggest without text disconnects');
}

// ---------------------------------------------------------------- flood limit
{
    const bot = await connect('uif');
    await sleep(2000);
    const since = bot.messages.length;
    // the engine reads at most 5 commands a tick, so the count grows by 4 a tick
    for (let i = 0; i < 60; i++) {
        bot.cheat('mypk');
    }
    await expectMessage(bot, /^Kicked for acting too fast!$/, 'more than 25 commands in a burst: kicked', since, 15000);
    await expectClosed(bot, 'flood disconnects', 15000);
}

// ---------------------------------------------------------------- player utility
{
    const a = await connect('uia');
    const b = await connect('uib');
    await sleep(2000);

    let since = b.messages.length;
    await cmd(a, `tell ${b.username} hello   there`);
    await expectMessage(b, new RegExp(`^${display(a)} Tells you:  hello there$`), '::tell reaches the player (two spaces)', since);
    since = a.messages.length;
    await cmd(a, 'tell');
    await expectMessage(a, /^Error - Message not sent$/, '::tell without a name', since);
    since = a.messages.length;
    await cmd(a, 'tell nosuchplayer hi');
    await expectMessage(a, /^Player not currently online! If you know they are, their name must have a space in it$/, '::tell offline', since);

    since = b.messages.length;
    await cmd(a, 'yell hello world');
    await expectMessage(b, new RegExp(`^${display(a)} - hello world$`), '::yell broadcast', since);

    // both bots share an ip: -5 rep
    since = a.messages.length;
    await cmd(a, `rep ${b.username}`);
    await expectMessage(a, /^You are double logging in, you are laggin server, and cheating\. -5 rep\.$/, '::rep same ip', since);

    since = a.messages.length;
    await cmd(a, 'modinfo', 1000);
    check(a.main === 8134 && a.texts.get(8144) === '@dre@The rules of Allstar-Scape' && a.texts.get(8148) === '1. Respect all other players!', '::modinfo scroll');
    await cmd(a, 'castlewars', 1000);
    check(a.texts.get(8162) === '@dbl@@dre@Barricades Table@dbl@' && a.texts.get(8163) === '@dbl@@dre@Requirements: 120 theiving@dbl@', '::castlewars overwritten lines');
    await cmd(a, 'armorhelp', 1000);
    check(a.texts.get(8156) === 'Fire > Earth' && a.texts.get(8148) === '', '::armorhelp scroll');
    await cmd(a, 'updates', 1000);
    check(a.texts.get(8144) === '@dre@LATEST UPDATES!!!!', '::updates scroll');

    since = a.messages.length;
    await cmd(a, 'testclue96f3t23t43v4g3');
    await expectMessage(a, /^Haha motherfucker this test command has been removed!$/, '::testclue', since);
    await expectMessage(a, /^You gain a hidden point!$/, 'hidden point', since);

    // Allstar-Scape logout delay
    since = a.messages.length;
    a.cheat('testskull');
    a.ifButton(2458);
    await expectMessage(a, /^You must wait 10 seconds after combat to log out!$/, '::testskull blocks the logout button', since);

    a.close();
    b.close();
}

// ---------------------------------------------------------------- emote tab
{
    const bot = await connect('uie');
    await sleep(2000);
    let since = bot.messages.length;
    bot.ifButton(169); // No -> Train
    await expectMessage(bot, /^You teleport to the Training Area!$/, 'No emote -> ::Train', since);
    await sleep(1000);
    let c = await bot.coord();
    check(c.x === 3209 && c.z === 2801, `emote teleport ${JSON.stringify(c)}`);
    await sleep(600);

    bot.ifButton(13362); // Panic: never reached the server's handler
    await sleep(1200);
    c = await bot.coord();
    check(c.x === 3209 && c.z === 2801, 'Panic does nothing');

    since = bot.messages.length;
    bot.ifButton(162); // Think: vengeance
    await expectMessage(bot, /^You use vengence!$/, 'Think -> vengeance', since);
    await sleep(600);

    await cmd(bot, 'setvar allstar_teleblock 1');
    since = bot.messages.length;
    bot.ifButton(168); // Yes -> home
    await expectMessage(bot, /^A magical force stops you from teleporting\.$/, 'teleblocked emote', since);
    bot.close();
}

// ---------------------------------------------------------------- level-ups
{
    const bot = await connect('uix');
    await sleep(2000);
    // advancestat runs once no interface is open: close the welcome screen like a player would
    bot.closeModal();
    await setRights(bot, 2);
    let since = bot.messages.length;
    await cmd(bot, 'master', 2000);
    check(bot.tutorial === 6211 && bot.texts.get(6212) === 'Congratulations, you just advanced a magic level!' && bot.texts.get(6213) === 'Your magic level is now 99 .', `last combat level-up chatbox: magic (${bot.tutorial}, ${bot.texts.get(6212)})`);
    await expectMessage(bot, /^Congratulations, you just advanced an attack level\.$/, 'attack level-up message', since);
    await expectMessage(bot, /^Congratulations, you just recived Attack skill capes and hood!$/, '99 attack message', since);
    await expectMessage(bot, new RegExp(`^${display(bot)} has just gotten 99 attack!$`), '99 attack broadcast', since);
    await expectMessage(bot, new RegExp(`^${display(bot)} has just gotten 99 defence!$`), '99 defence broadcast (Strength level)', since);
    await expectMessage(bot, /^Congratulations, you just advanced a fire making level\.$/, 'firemaking level-up message', since);
    await expectMessage(bot, /^Congratulations, there is no agility skillcape$/, 'agility 99 message', since);
    await expectMessage(bot, /^.* \.\. your a nerd\.$/, '::master message', since);
    check(inventory(bot).some(o => o?.id === 995 && o.count === 20000000), `99 cooking + fishing: 20M coins (${JSON.stringify(inventory(bot).filter(o => o))})`);
    check(bot.stats[0]?.level === 99 && bot.stats[0]?.xp === 14910000, `attack 99 ${JSON.stringify(bot.stats[0])}`);
    bot.close();
}

// ---------------------------------------------------------------- staff
{
    const owner = await connect('uio');
    const victim = await connect('uiv');
    await sleep(2000);
    await setRights(owner, 3);

    // owners: every command starting with a lowercase m pays 999,999,999 coins
    let since = owner.messages.length;
    await cmd(owner, 'mypk', 1000);
    check(inventory(owner).some(o => o?.id === 995 && o.count === 999999999), 'owner m-command coins');

    since = victim.messages.length;
    await cmd(owner, 'alert hello there');
    await expectMessage(victim, /^\[~!ANNOUNCEMENT!~\]: llo there$/, '::alert drops two characters', since);
    since = victim.messages.length;
    await cmd(owner, 'lupdate New stuff');
    await expectMessage(victim, /^\[LATESTUPDATE\]:New stuff$/, '::lupdate', since);

    since = owner.messages.length;
    await cmd(owner, `checkip ${victim.username}`);
    await expectMessage(owner, new RegExp(`^${victim.username}'s ip address is .+$`), '::checkip', since);

    await cmd(owner, 'home', 1000);
    await cmd(owner, `xteletome ${victim.username}`, 1500);
    let c = await victim.coord();
    check(c.x === 2853 && c.z === 3591, `::xteletome ${JSON.stringify(c)}`);

    since = owner.messages.length;
    await cmd(owner, 'mod');
    await expectMessage(owner, /^The Allstar-Scape, ModLook package!$/, '::mod kit', since);

    since = victim.messages.length;
    await cmd(owner, `giveadmin ${victim.username}`);
    await expectClosed(victim, '::giveadmin disconnects the player');
    const again = await Bot.connect({ username: victim.username, port, webPort });
    await sleep(2000);
    check(again.messages.includes('Feel free to spawn w/e u want... NOTHING to other players (cept mods)'), 'new admin welcome');

    since = owner.messages.length;
    await cmd(owner, `demote ${again.username}`);
    await expectClosed(again, '::demote disconnects the player');

    // kickNick stays set for a name that is not online: that player is kicked at the next login
    await sleep(1500);
    await cmd(owner, `kick ${victim.username}`);
    const kicked = await Bot.connect({ username: victim.username, port, webPort });
    await expectClosed(kicked, '::kick of an offline name kicks them at login');
    await sleep(1500);

    const online = await Bot.connect({ username: victim.username, port, webPort });
    await sleep(1500);
    since = owner.messages.length;
    await cmd(owner, `banuser ${victim.username}`);
    await expectClosed(online, '::banuser kicks the player');
    await expectMessage(owner, new RegExp(`^Administrator ${display(owner)} is banning ${victim.username}$`), '::banuser broadcast', since);
    let refused = false;
    try {
        const banned = await Bot.connect({ username: victim.username, port, webPort });
        banned.close();
    } catch {
        refused = true;
    }
    check(refused, '::banuser refuses the login');
    since = owner.messages.length;
    await cmd(owner, `unban ${victim.username}`);
    await expectMessage(owner, new RegExp(`^Player  ${victim.username} successfully unbanned$`), '::unban message (two spaces)', since);
    const back = await Bot.connect({ username: victim.username, port, webPort });
    check(!back.closed, '::unban lifts the ban');
    await sleep(1500);

    // honeypot
    since = owner.messages.length;
    back.cheat('noclip');
    await expectClosed(back, '::noclip autobans');
    await expectMessage(owner, new RegExp(`^${display(back)} tried to noclip and has been autobanned!$`), 'autoban broadcast', since);
    await cmd(owner, 'unban x');

    // weather in a safe zone
    await cmd(owner, 'snowingzz 1', 1500);
    check(owner.overlay === 11877, `::snowingzz 1 snow overlay (${owner.overlay})`);
    await cmd(owner, 'nosnow', 1500);
    check(owner.overlay === 19100, `::nosnow back to the safe overlay (${owner.overlay})`);
    owner.close();
}

// ---------------------------------------------------------------- single level-up chatbox
{
    const bot = await connect('uiu');
    await sleep(2000);
    bot.closeModal();
    await sleep(600);
    const since = bot.messages.length;
    await cmd(bot, 'advancestat attack 50', 1500);
    await expectMessage(bot, /^Congratulations, you just advanced an attack level\.$/, 'level-up message', since);
    check(bot.tutorial === 6247 && bot.texts.get(6248) === 'Congratulations, you just advanced an attack level!' && bot.texts.get(6249) === 'Your attack level is now 50 .', `attack chatbox (${bot.tutorial})`);
    check(bot.stats[0]?.level === 50, `current level is the new base level (${bot.stats[0]?.level})`);
    await cmd(bot, 'home', 1500);
    check(bot.tutorial === -1, `the chatbox goes away when the player moves (${bot.tutorial})`);
    bot.close();
}

// ---------------------------------------------------------------- more player commands
{
    const bot = await connect('uip');
    await sleep(2000);
    let since = bot.messages.length;
    await cmd(bot, '135hp');
    await expectMessage(bot, /^Don't try and cheat nub!$/, '::135hp', since);
    since = bot.messages.length;
    await cmd(bot, 'savebackup');
    await expectMessage(bot, /^Character backup file successfully saved$/, '::savebackup', since);
    since = bot.messages.length;
    await cmd(bot, 'updatestats');
    await expectMessage(bot, /^Stats saved to highscores\.$/, '::updatestats', since);
    since = bot.messages.length;
    await cmd(bot, 'makemem bob');
    await expectMessage(bot, /^ bob$/, '::makemem echoes the name with its space', since);
    since = bot.messages.length;
    await cmd(bot, `membership ${bot.username}`);
    await expectMessage(bot, new RegExp(`^Player ${bot.username} has become a Member!$`), '::membership', since);
    since = bot.messages.length;
    await cmd(bot, 'getweather');
    await expectMessage(bot, /^Weather Id = 0$/, '::getweather', since);
    since = bot.messages.length;
    await cmd(bot, 'prayerstats');
    await expectMessage(bot, /^Prayer Points = \d+$/, '::prayerstats', since);
    since = bot.messages.length;
    await cmd(bot, 'drainme');
    await expectMessage(bot, /^Your prayer gets drained\.$/, '::drainme', since);
    since = bot.messages.length;
    await cmd(bot, 'female');
    await expectMessage(bot, /^You're now a girl\.\.\.$/, '::female', since);
    await cmd(bot, 'male');
    await cmd(bot, 'char', 1000);
    check(bot.main === 3559, `::char opens the design screen (${bot.main})`);
    await cmd(bot, 'duel', 1000);
    check(bot.main === 6412, `::duel opens the duel screen (${bot.main})`);
    await cmd(bot, 'interface 5292', 1000);
    check(bot.main === 5292, `::interface 5292 opens the bank frame (${bot.main})`);
    bot.closeModal();
    await cmd(bot, 'skullz 197', 100);
    await bot.until(() => bot.overlay === 197, 2000, 'skullz overlay').catch(() => {});
    check(bot.overlay === 197, '::skullz opens the walkable interface');
    await sleep(1500);
    check(bot.overlay === 19100, 'process() puts the Safe overlay back');

    // the Chaos Elemental weapon strip: the new player's dragon scimitar goes to the inventory
    since = bot.messages.length;
    await cmd(bot, 'heal', 1500);
    await expectMessage(bot, /^The Chaos Elemental removes your weapon!$/, '::heal', since);
    check(inventory(bot).some(o => o?.id === 4587), 'weapon in the inventory');

    since = bot.messages.length;
    await cmd(bot, 'hitdiff5', 1500);
    await expectMessage(bot, /^Hp type set to: 5$/, '::hitdiff', since);
    check((bot.stats[3]?.level ?? 0) <= 88, `::hitdiff hits 10 (${bot.stats[3]?.level})`);

    await cmd(bot, 'nc', 1500);
    const c = await bot.coord();
    check(c.x === 102 && c.z === 0, `::nc sends the player off the map ${JSON.stringify(c)}`);
    await cmd(bot, 'home', 1000);

    since = bot.messages.length;
    bot.cheat('interface');
    await expectClosed(bot, '::interface without an id disconnects');
}

// ---------------------------------------------------------------- admin and owner tools
{
    const admin = await connect('uid');
    const other = await connect('uit');
    await sleep(2000);
    await setRights(admin, 2);
    let since = admin.messages.length;
    await cmd(admin, 'pickup 04151 1', 1000);
    check(inventory(admin).some(o => o?.id === 4151), '::pickup 04151 1');
    since = admin.messages.length;
    await cmd(admin, 'pickup 4151 1');
    await expectMessage(admin, /^Cmon Type IT AGIAN ! $/, '::pickup needs five digits', since);
    since = admin.messages.length;
    await cmd(admin, 'pickup 99999 1');
    await expectMessage(admin, /^That Item Doesn't Exist$/, '::pickup id over 30000', since);
    since = admin.messages.length;
    await cmd(admin, 'god');
    await expectMessage(admin, /^God mode on$/, '::god', since);
    check(admin.texts.get(149) === '99999999%', '::god energy text');
    since = admin.messages.length;
    await cmd(admin, 'godoff');
    await expectMessage(admin, /^god mode off$/, '::godoff', since);
    since = admin.messages.length;
    await cmd(admin, 'pnpc abc');
    await expectMessage(admin, /^Wrong Syntax! Use as ::pnpc #$/, '::pnpc syntax', since);
    since = admin.messages.length;
    await cmd(admin, 'pnpc 20000');
    await expectMessage(admin, /^No such P-NPC\.$/, '::pnpc range', since);
    await cmd(admin, 'pnpc 50');
    await cmd(admin, 'normal');
    since = admin.messages.length;
    await cmd(admin, 'gfx 1199');
    await expectMessage(admin, /^Testing GrApHiCs cODE!!$/, '::gfx', since);
    since = admin.messages.length;
    await cmd(admin, 'clicks');
    await expectMessage(admin, /^Logging clicks set to false$/, '::clicks', since);
    since = admin.messages.length;
    await cmd(admin, 'emote 0');
    await expectMessage(admin, /^Bad emote ID$/, '::emote out of range', since);

    // ::xteleto runs twice for administrators (rights == 2 and >= 1)
    await cmd(other, 'train', 1500);
    since = admin.messages.length;
    await cmd(admin, `xteleto ${other.username}`, 1500);
    await expectMessage(admin, new RegExp(`^Teleto: You teleport to ${display(other)}$`), '::xteleto', since);
    check(admin.messages.slice(since).filter(m => m.startsWith('Teleto:')).length === 2, 'administrators run ::xteleto twice');
    let c = await admin.coord();
    check(c.x === 3209 && c.z === 2801, `::xteleto destination ${JSON.stringify(c)}`);

    // ::macrowarn: kicked, then a black mark at every login
    since = admin.messages.length;
    await cmd(admin, `macrowarn ${other.username}`);
    await expectClosed(other, '::macrowarn kicks the player');
    await sleep(1500);
    const warned = await Bot.connect({ username: other.username, port, webPort });
    await sleep(2000);
    check(warned.messages.includes('You have 1 black mark as you have been caught autoing...'), 'black mark at login');

    // owners
    await setRights(admin, 3);
    since = warned.messages.length;
    await cmd(admin, `eat ${warned.username}`, 1500);
    await expectMessage(warned, new RegExp(`^You have been eaten by ${display(admin)}!$`), '::eat', since);
    since = admin.messages.length;
    await cmd(admin, 'tele 3222,3218', 1500);
    await expectMessage(admin, /^Wrong Syntax! Use as ::tele #####,#####$/, 'owner ::tele: the owner-block handler wants five digits', since);
    c = await admin.coord();
    check(c.x === 3222 && c.z === 3218, `the administrator ::tele moved the owner ${JSON.stringify(c)}`);
    since = admin.messages.length;
    await cmd(admin, 'npc 50');
    await expectMessage(admin, /^You spawn an npc$/, '::npc', since);
    since = admin.messages.length;
    await cmd(admin, 'a');
    await expectMessage(admin, /^You spawn an KBD$/, '::a', since);
    since = admin.messages.length;
    await cmd(admin, 'npc x');
    await expectMessage(admin, /^Wrong Syntax! Use as ::npc 1$/, '::npc syntax', since);
    await cmd(admin, 'bank', 1000);
    check(admin.main === 5292 && admin.side !== -1, `::bank opens the bank (${admin.main}, ${admin.side})`);
    admin.closeModal();
    since = warned.messages.length;
    await cmd(admin, 'alltome', 1500);
    c = await warned.coord();
    check(c.x === 3222 && c.z === 3218, `::alltome ${JSON.stringify(c)}`);

    // ::reboot kicks everyone, the issuer too
    admin.cheat('reboot');
    await expectClosed(warned, '::reboot kicks everyone');
    await expectClosed(admin, '::reboot kicks the issuer');
    // clean up the macro warning list for later runs
}

console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
