// Smoke test: log in, read position, check a command responds.
import Bot from './Bot.js';

const bot = await Bot.connect({ username: `smoke${Date.now() % 100000}`, port: Number(process.env.ALLSTAR_PORT) || undefined, webPort: Number(process.env.ALLSTAR_WEB_PORT) || undefined });
console.log('staff', bot.staffModLevel, 'region', bot.region);
console.log('coord', await bot.coord());
console.log('messages', bot.messages);
bot.close();
process.exit(0);
