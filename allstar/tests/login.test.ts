import Bot from './Bot.js';
const check = (ok: boolean, what: string) => console.log(ok ? 'PASS' : 'FAIL', what);
const bot = await Bot.connect({ username: `new${Date.now() % 100000}`, port: Number(process.env.ALLSTAR_PORT) || undefined, webPort: Number(process.env.ALLSTAR_WEB_PORT) || undefined });
await new Promise(r => setTimeout(r, 2500));
const c = await bot.coord();
check(c.x === 2852 && c.z === 3591 && c.level === 0, `new player at home ${JSON.stringify(c)}`);
check(bot.messages.includes('Welcome to Allstar-Scape'), 'welcome message');
check(bot.messages.some(m => / has logged in$/.test(m)), 'login broadcast');
// new players start on 98/14; process() takes 1 above the base level straight away (potTimer3 = 0)
check(bot.stats[3]?.level === 97 && bot.stats[3]?.xp === 1155, `hitpoints ${JSON.stringify(bot.stats[3])}`);
const worn = [...bot.invs.values()].find(v => v.some(o => o?.id === 4587));
check(!!worn, 'dragon scimitar worn');
check(bot.main !== -1, `welcome scroll open (${bot.main})`);
since: {
  const s = bot.messages.length;
  bot.cheat('starter');
  await bot.waitForMessage(/Allstar-Scape Starter Package/, 5000, s);
  await new Promise(r => setTimeout(r, 800));
  const inv = [...bot.invs.values()].find(v => v.some(o => o?.id === 995));
  check(inv?.some(o => o?.id === 995 && o.count === 25000000) ?? false, 'starter coins in inventory');
}
console.log(bot.messages.slice(0, 12));
bot.close(); process.exit(0);
