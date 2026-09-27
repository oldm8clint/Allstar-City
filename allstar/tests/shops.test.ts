// Shops: opening from NPC options, stock, value messages, buying, selling rules, restock.
//   cd engine && npx tsx ../allstar/tests/shops.test.ts
// Uses the dev-only helpers in content/scripts/allstar/shops/scripts/debug.rs2 (staff 4).
import Bot from './Bot.js';

const PORT = Number(process.env.PORT ?? 43611);
const WEB_PORT = Number(process.env.WEB_PORT ?? 8111);

// Bot.ts reads IF_OPENMAIN_SIDE and IF_SETTEXT with plain g2; the engine writes p2_alt2/p2_alt3.
// Both forms are accepted so this keeps working once Bot.ts decodes them.
const alt2 = (v: number) => (v & 0xff00) | ((v + 128) & 0xff);
const alt3 = (v: number) => (((v + 128) & 0xff) << 8) | ((v >> 8) & 0xff);
const comText = (com: number) => bot.texts.get(com) ?? bot.texts.get(alt3(com));

const SHOP = 3900; // shop_template:inv
const SIDE = 3823; // shop_template_side:inv
const INV = 3214;
const TITLE = 3901; // shop_template:com_76
const MAIN = 3824; // shop_template
const SIDE_PANEL = 3822; // shop_template_side

// ids
const COINS = 995;
const LOGS = 1511;
const OAK_LOGS = 1521;
const LOGS_NOTE = 1512;
const FIRE_RUNE = 554;
const DWARF_REMAINS = 0;

let failures = 0;
const check = (ok: boolean, what: string) => {
    console.log(ok ? 'PASS' : 'FAIL', what);
    if (!ok) {
        failures++;
    }
};
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const bot = await Bot.connect({ username: `shop${Date.now() % 100000}`, port: PORT, webPort: WEB_PORT });

// ::commands are flood-limited (25 in flight), so pace them a cycle apart
async function cmd(text: string) {
    bot.cheat(text);
    await sleep(550);
}

const view = () => bot.invs.get(SHOP) ?? [];
const inv = () => bot.invs.get(INV) ?? [];
const count = (items: ({ id: number; count: number } | null)[], id: number) => items.reduce((n, o) => n + (o?.id === id ? o.count : 0), 0);
const slotOf = (items: ({ id: number; count: number } | null)[], id: number) => items.findIndex(o => o?.id === id);
const coins = () => count(inv(), COINS);

async function message(pattern: RegExp, action: () => void | Promise<void>): Promise<string> {
    const since = bot.messages.length;
    await action();
    return bot.waitForMessage(pattern, 5000, since);
}

// Finds the NPC (::~shopnpc), stands the bot on its tile and returns its npc slot id.
async function nid(npc: string): Promise<number> {
    const found = await message(/^shopnpc /, () => cmd(`~shopnpc ${npc}`));
    const [x, z] = found.slice('shopnpc '.length).split(',').map(Number);
    await cmd(`tele 0,${x >> 6},${z >> 6},${x & 63},${z & 63}`);
    await sleep(600);
    const text = await message(/^get allstar_shop_testnpc: /, () => cmd('getvar allstar_shop_testnpc'));
    return Number(text.split(': ')[1]) & 0xffff;
}

async function openShop(npc: string, op: number, title: string) {
    const id = await nid(npc);
    bot.invs.delete(SHOP);
    bot.texts.delete(TITLE);
    bot.texts.delete(alt3(TITLE));
    bot.main = bot.side = -1;
    bot.opNpc(op, id);
    const open = () => [MAIN, alt2(MAIN)].includes(bot.main) && [SIDE_PANEL, alt3(SIDE_PANEL)].includes(bot.side);
    await bot.until(() => open() && comText(TITLE) === title && bot.invs.has(SHOP), 15000, `${npc} op${op} shop "${title}"`);
    await sleep(600);
}

async function closeShop() {
    // walking closes the shop window in Allstar-Scape (packets 98/164/248 set MyShopID = 0)
    await cmd('~shopclose');
}

async function setInventory(items: [string, number][]) {
    await cmd('~clearinv inv');
    for (const [name, n] of items) {
        await cmd(`give ${name} ${n}`);
    }
    await sleep(600);
}

await message(/You teleport to the Shopping Area!/, () => cmd('shops'));
await sleep(1500);

// ---------------------------------------------------------------- shop 2 (general store)
await cmd('~shopreset 2');
await setInventory([['coins', 10000000]]);
await openShop('aubury', 3, 'Gold & Trimmed Armor');
check(view().length === 40, `UPDATE_INV_FULL of 40 entries on 3900 (${view().length})`);
check(view().filter(o => o).length === 24, `shop 2 shows 24 items (${view().filter(o => o).length})`);
check(view()[0]?.id === 2595 && view()[0]?.count === 100, 'shop 2 slot 0 = 2595 x100');
check(view()[5]?.id === 2583 && view()[5]?.count === 1000, 'shop 2 slot 5 = 2583 x1000');
check(bot.invs.has(SIDE), 'inventory sent to the shop side panel (3823)');
check(comText(3903) === '@whi@Right click to buy, Choose ammount you want, Click item for the price.', 'shop hint text (3903)');
check(comText(3902) === '@whi@Closewindow', 'close text (3902)');

// value messages (packet 145): price = floor(item.cfg col4 of the last line), with K / million
let text = await message(/currently costs/, () => bot.invButton(1, 2595, 0, SHOP));
check(text === 'Black full helm (g): currently costs 500000 coins (500K)', `value: ${text}`);
text = await message(/currently costs/, () => bot.invButton(1, 2603, 15, SHOP));
check(text === 'Adam kiteshield (t): currently costs 3788 coins (3K)', `value: ${text}`);

// buy 1 (op2): exact price, stock -1
let before = coins();
bot.invButton(2, 2603, 15, SHOP);
await bot.until(() => count(inv(), 2603) === 1, 5000, 'bought 2603');
await sleep(300);
check(before - coins() === 3788, `buy 1 x 2603 costs 3788 (${before - coins()})`);
check(view()[15]?.count === 99, `shop stock 2603 now 99 (${view()[15]?.count})`);

// buy 5 (op3) of a non-stackable: 5 slots
before = coins();
bot.invButton(3, 2603, 15, SHOP);
await bot.until(() => count(inv(), 2603) === 6, 5000, 'bought 5 x 2603');
await sleep(300);
check(before - coins() === 5 * 3788, `buy 5 costs 5 x 3788 (${before - coins()})`);
check(view()[15]?.count === 94, `shop stock 2603 now 94 (${view()[15]?.count})`);

// restock: every 60 cycles after the last purchase the slot gains 1 (restock clock moved on by
// ::~shopage; real cycles keep passing too, a few per step here)
await cmd('~shopage 2 50');
await sleep(600);
check(view()[15]?.count === 94, `no restock before 60 cycles (${view()[15]?.count})`);
await cmd('~shopage 2 15');
await bot.until(() => view()[15]?.count === 95, 5000, 'restock +1 after 60 cycles');
check(view()[15]?.count === 95, 'restock +1 after 60 cycles');
await cmd('~shopage 2 60');
await bot.until(() => view()[15]?.count === 96, 5000, 'restock +1 after 120 cycles');
check(view()[15]?.count === 96, 'restock +1 after 120 cycles');
await cmd('~shopage 2 600');
await bot.until(() => view()[15]?.count === 100, 5000, 'restocked to the default');
check(view()[15]?.count === 100, 'restock stops at the default 100');

// sell to a general store: any sellable item, same price as buying
await setInventory([['coins', 1000], ['logs', 5], ['oak_logs', 3], ['cert_logs', 4]]);
text = await message(/shop will buy/, () => bot.invButton(1, LOGS, slotOf(inv(), LOGS), SIDE));
check(text === 'Logs: shop will buy for 3Coins', `sell value: ${text}`);
text = await message(/I cannot sell/, () => bot.invButton(1, COINS, slotOf(inv(), COINS), SIDE));
check(text === 'I cannot sell Coins.', `coins value: ${text}`);

before = coins();
bot.invButton(4, LOGS, slotOf(inv(), LOGS), SIDE); // sell 50: clamped to the 5 logs held
await bot.until(() => count(inv(), LOGS) === 0, 5000, 'sold 5 logs');
await sleep(300);
check(coins() - before === 15, `sold 5 logs for 15 coins (${coins() - before})`);
check(view()[24]?.id === LOGS && view()[24]?.count === 5, `logs appear after the default stock (${JSON.stringify(view()[24])})`);

bot.invButton(2, OAK_LOGS, slotOf(inv(), OAK_LOGS), SIDE);
await bot.until(() => view()[25]?.id === OAK_LOGS, 5000, 'oak logs in shop');
check(view()[25]?.count === 1, 'oak logs x1 in slot 25');

// a note goes in as GetUnnotedItem(note) = item 0 (Dwarf remains): names are compared with ==
before = coins();
bot.invButton(3, LOGS_NOTE, slotOf(inv(), LOGS_NOTE), SIDE);
await bot.until(() => count(inv(), LOGS_NOTE) === 0, 5000, 'sold 4 noted logs');
await sleep(300);
check(coins() - before === 12, `4 noted logs sold for 12 (${coins() - before})`);
check(view()[26]?.id === DWARF_REMAINS && view()[26]?.count === 4, `noted logs became item 0 x4 (${JSON.stringify(view()[26])})`);
text = await message(/currently costs/, () => bot.invButton(1, DWARF_REMAINS, 26, SHOP));
check(text === '!! NOT EXISTING ITEM !!! - ID:0: currently costs 1 coins', `item 0 value: ${text}`);

// buying from a player-sold slot empties the whole slot (BUG kept); the window then hides the
// last item behind the gap (resetShop lists every slot up to ShopItemsStandard)
before = coins();
bot.invButton(2, LOGS, 24, SHOP);
await bot.until(() => count(inv(), LOGS) === 1, 5000, 'bought 1 log back');
await sleep(400);
check(before - coins() === 3, `bought a log for 3 (${before - coins()})`);
check(view()[24] === null, `logs slot emptied after one purchase (${JSON.stringify(view()[24])})`);
check(view()[25]?.id === OAK_LOGS && slotOf(view(), DWARF_REMAINS) === -1, 'last item hidden behind the gap');

// decay: player-sold stock loses 1 every 60 cycles
await cmd('~shopage 2 120');
await sleep(600);
check(slotOf(view(), OAK_LOGS) === -1, 'oak logs x1 decayed away');

await closeShop();

// ---------------------------------------------------------------- shop 34 (specialty)
await cmd('~shopreset 34');
await setInventory([['coins', 100], ['logs', 2], ['firerune', 10]]);
await openShop('magic_store_owner', 3, 'Magic Shop            ');
check(view()[0]?.id === FIRE_RUNE && view()[0]?.count === 10000, 'magic shop fire runes x10000');
text = await message(/cannot sell/, () => bot.invButton(1, LOGS, slotOf(inv(), LOGS), SIDE));
check(text === 'You cannot sell Logs in this store.', `specialty value: ${text}`);
text = await message(/cannot sell/, () => bot.invButton(2, LOGS, slotOf(inv(), LOGS), SIDE));
check(text === 'You cannot sell Logs in this store.', `specialty sell: ${text}`);
text = await message(/shop will buy/, () => bot.invButton(1, FIRE_RUNE, slotOf(inv(), FIRE_RUNE), SIDE));
const firePrice = Number(text.match(/for (\d+)Coins/)?.[1]);
check(text === `Fire rune: shop will buy for ${firePrice}Coins`, `rune value: ${text}`);
before = coins();
bot.invButton(3, FIRE_RUNE, slotOf(inv(), FIRE_RUNE), SIDE); // sell 5
await bot.until(() => count(inv(), FIRE_RUNE) === 5, 5000, 'sold 5 fire runes');
await sleep(300);
check(coins() - before === 5 * firePrice, `sold 5 fire runes for ${5 * firePrice} (${coins() - before})`);
check(view()[0]?.count === 10005, `shop fire runes 10005 (${view()[0]?.count})`);

// not enough coins
await setInventory([['coins', 1]]);
text = await message(/enough coins/, () => bot.invButton(2, FIRE_RUNE, 0, SHOP));
check(text === "You don't have enough coins.", `no coins: ${text}`);

// full inventory: selling needs a free slot even though coins stack
await setInventory([['coins', 10], ['firerune', 5], ['logs', 26]]);
text = await message(/Not enough space/, () => bot.invButton(2, FIRE_RUNE, slotOf(inv(), FIRE_RUNE), SIDE));
check(text === 'Not enough space in your inventory.', `full inventory sell: ${text}`);
await closeShop();

// ---------------------------------------------------------------- Nulodion op1 = shop 79
await cmd('~shopreset 79');
await setInventory([['coins', 10], ['logs', 1]]);
await openShop('nulodion', 1, '');
check(view().every(o => o === null), 'shop 79 is empty');
before = coins();
bot.invButton(2, LOGS, slotOf(inv(), LOGS), SIDE);
await bot.until(() => view()[0]?.id === LOGS, 5000, 'shop 79 bought logs');
check(coins() - before === 3, 'undefined shop 79 buys anything');
await cmd('~shopage 79 6000');
await sleep(600);
check(view()[0]?.id === LOGS && view()[0]?.count === 1, 'shop 79 never decays');
await closeShop();

// ---------------------------------------------------------------- Nulodion op3 = shop 40 (colour codes kept)
await cmd('~shopreset 40');
await openShop('nulodion', 3, '@whi@D@gre@r@whi@a@gre@g@whi@o@gre@n @whi@s@gre@h@whi@o@gre@p');
check(view()[0]?.id === 1149 && view()[0]?.count === 10, 'dragon shop 1149 x10');
await closeShop();

// ---------------------------------------------------------------- Herquin (shop 12, unspawned):
// every default amount is 0; a sold gem decays to 0 and empties its default slot, which then
// shows as a gap, hides the last gem and stops the shop buying that gem
await cmd('~shopreset 12');
await cmd('npcadd herquin');
await setInventory([['coins', 1000], ['uncut_sapphire', 1]]);
await openShop('herquin', 3, "Herquin's Gems.");
check(view().slice(0, 8).every(o => o !== null && o.count === 0) && view()[0]?.id === 1623 && view()[7]?.id === 1601, `8 gems at 0: ${JSON.stringify(view().slice(0, 8))}`);
before = coins();
bot.invButton(2, 1623, 0, SHOP);
await sleep(1200);
check(coins() === before && count(inv(), 1623) === 1, 'buying a sold-out item does nothing');
bot.invButton(2, 1623, slotOf(inv(), 1623), SIDE);
await bot.until(() => view()[0]?.count === 1, 5000, 'sold sapphire');
check(coins() - before === 21, `sapphire sold for 21 (${coins() - before})`);
await cmd('~shopage 12 60');
await bot.until(() => view()[0] === null, 5000, 'sapphire slot emptied');
check(view()[0] === null && view()[7] === null && view()[6]?.id === 1603, `gap at 0, diamond hidden: ${JSON.stringify(view().slice(0, 8))}`);
await cmd('give uncut_sapphire 1');
await sleep(600);
text = await message(/cannot sell/, () => bot.invButton(2, 1623, slotOf(inv(), 1623), SIDE));
check(text === 'You cannot sell Uncut sapphire in this store.', `emptied default slot: ${text}`);
await closeShop();

// ---------------------------------------------------------------- two players, live restock
await cmd('~shopreset 57');
await setInventory([['coins', 1000000]]);
await openShop('generalshopkeeper5', 3, 'Helmet Shop');
const helm = view()[0];
check(helm?.id === 7534 && helm?.count === 50, `helmet shop slot 0 ${JSON.stringify(helm)}`);

// a second player with the same shop open sees the purchase (UpdatePlayerShop)
const other = await Bot.connect({ username: `shoq${Date.now() % 100000}`, port: PORT, webPort: WEB_PORT });
other.cheat('shops');
await sleep(2000);
other.cheat('~shopnpc generalshopkeeper5');
await sleep(700);
const since = other.messages.length;
other.cheat('getvar allstar_shop_testnpc');
const uid = Number((await other.waitForMessage(/^get allstar_shop_testnpc: /, 5000, since)).split(': ')[1]);
other.opNpc(3, uid & 0xffff);
await other.until(() => other.invs.get(SHOP)?.[0]?.count === 50, 15000, 'second player opened the helmet shop');

bot.invButton(2, 7534, 0, SHOP);
await bot.until(() => view()[0]?.count === 49, 5000, 'bought helm');
await other.until(() => other.invs.get(SHOP)?.[0]?.count === 49, 5000, 'other player sees 49');
check(other.invs.get(SHOP)?.[0]?.count === 49, 'the other player sees the purchase');
other.close();
const boughtAt = Date.now();
await bot.until(() => view()[0]?.count === 50, 40000, 'live restock after 60 cycles');
const seconds = (Date.now() - boughtAt) / 1000;
check(seconds > 28 && seconds < 33, `restocked while open after ${seconds.toFixed(1)} s (60 cycles = 30 s)`);
await closeShop();

bot.close();
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
