// Commands vertical slice: teleports, starter, info.
import Bot from './Bot.js';

const bot = await Bot.connect({ username: `cmd${Date.now() % 100000}` });
const check = (ok: boolean, what: string) => console.log(ok ? 'PASS' : 'FAIL', what);

let since = bot.messages.length;
bot.cheat('home');
await bot.waitForMessage(/You teleport to Home\./, 5000, since);
await new Promise(r => setTimeout(r, 1200));
let c = await bot.coord();
check(c.x === 2853 && c.z === 3591 && c.level === 0, `::home -> ${JSON.stringify(c)}`);

since = bot.messages.length;
bot.cheat('starter');
await bot.waitForMessage(/Allstar-Scape Starter Package/, 5000, since);
await new Promise(r => setTimeout(r, 600));
const inv = bot.invs.get(3214) ?? [...bot.invs.values()].find(v => v.length === 28) ?? [];
check(inv.some(o => o?.id === 995 && o.count === 25000000), 'starter coins 25M');
check(inv.some(o => o?.id === 392 && o.count === 15000), 'starter noted mantas');

since = bot.messages.length;
bot.cheat('starter');
await bot.waitForMessage(/Sorry\./, 5000, since);
await bot.waitForMessage(/Is a noob and is trying to get a extra starter/, 5000, since);
check(true, 'second starter refused + broadcast');

since = bot.messages.length;
bot.cheat('mypos');
await bot.waitForMessage(/You are standing on X=2853 Y=3591$/, 5000, since);
check(true, '::mypos');

since = bot.messages.length;
bot.cheat('players');
await bot.waitForMessage(/There are currently \d+ players!/, 5000, since);
check(bot.main !== -1, `::players opened interface ${bot.main}`);

since = bot.messages.length;
bot.cheat('shops');
await bot.waitForMessage(/You teleport to the Shopping Area!/, 5000, since);
await new Promise(r => setTimeout(r, 1200));
c = await bot.coord();
check(c.x === 2738 && c.z === 3464, `::shops -> ${JSON.stringify(c)}`);

bot.close();
process.exit(0);
