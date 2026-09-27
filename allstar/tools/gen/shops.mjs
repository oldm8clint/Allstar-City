// Allstar-Scape shops, read the way the original server read them:
//   shops.cfg           ShopHandler.loadShops (tab-split, colour codes kept, "_" -> " ")
//   item.cfg            ItemHandler.loadItemList: names (first line of an id) and ShopValue
//                       (column 4 of the last line of an id), used by GetItemName/GetItemShopValue
//   data/*.dat + Item   Item.java item flags (stackable, notes, sellable + forced sellable ids)
//   client.java         the NPC click chains of packets 155 (first option) and 17 (third option)
//
// Output (content/scripts/allstar/generated):
//   configs/shops.inv   the shared shop model, restock clock and one display inv per shop
//   configs/shops.enum  shop titles/types/default stock and per-item price, name and flags
//   scripts/shops.rs2   one [opnpcN,npc] trigger per NPC option that opened a shop
//
// The RuneScript that runs the shops is in content/scripts/allstar/shops.
import fs from 'fs';
import path from 'path';

const SLOTS = 101; // ShopHandler.MaxShopItems: shop slots 0-100
const VIEW_SIZE = 40; // shop_template:inv (8x5), the same 40 slots as the 317 shop inventory 3900
const FLAG_SIZE = 20000; // Item.itemStackable/itemIsNote/itemSellable array size
const NOTE_DESC = 'Swap this note at any bank for a';

// Java String.trim(): strips every char <= ' '.
const javaTrim = s => s.replace(/^[\x00-\x20]+|[\x00-\x20]+$/g, '');

// token2.replaceAll("\t\t", "\t") five times, then split("\t") (Java drops trailing empty strings).
function javaTabSplit(s) {
    for (let i = 0; i < 5; i++) {
        s = s.split('\t\t').join('\t');
    }
    const out = s.split('\t');
    while (out.length > 1 && out[out.length - 1] === '') {
        out.pop();
    }
    return out;
}

function javaParseInt(token, where) {
    if (!/^[+-]?\d+$/.test(token ?? '')) {
        throw new Error(`${where}: Integer.parseInt("${token}") would throw`);
    }
    return parseInt(token, 10);
}

// The loop shared by ShopHandler.loadShops and ItemHandler.loadItemList: every "key = a\tb\t..."
// line until the end marker.
function* javaCfgRows(file, key, endMarker) {
    const lines = fs.readFileSync(file, 'latin1').split(/\r\n|\r|\n/);
    for (let n = 0; n < lines.length; n++) {
        const line = javaTrim(lines[n]);
        const spot = line.indexOf('=');
        if (spot > -1) {
            if (javaTrim(line.slice(0, spot)) === key) {
                yield { tokens: javaTabSplit(javaTrim(line.slice(spot + 1))), line: n + 1 };
            }
        } else if (line === endMarker) {
            return;
        }
    }
}

// ShopHandler.loadShops. Repeated shop ids overwrite their item slots and keep counting
// ShopItemsStandard; TotalShops counts every loaded line.
function loadShops(file) {
    const shops = new Map();
    let totalShops = 0;
    for (const { tokens, line } of javaCfgRows(file, 'shop', '[ENDOFSHOPLIST]')) {
        const where = `shops.cfg:${line}`;
        const id = javaParseInt(tokens[0], where);
        let shop = shops.get(id);
        if (!shop) {
            shop = { id, items: [], standard: 0, lines: [] };
            shops.set(id, shop);
        }
        shop.name = tokens[1].split('_').join(' ');
        shop.smod = javaParseInt(tokens[2], where);
        shop.bmod = javaParseInt(tokens[3], where);
        shop.lines.push(line);
        const pairs = Math.trunc((tokens.length - 4) / 2);
        for (let i = 0; i < pairs; i++) {
            shop.items[i] = { obj: javaParseInt(tokens[4 + i * 2], where), count: javaParseInt(tokens[5 + i * 2], where) };
            shop.standard++;
        }
        if ((tokens.length - 4) % 2 === 1) {
            shop.dangling = tokens[tokens.length - 1];
        }
        totalShops++;
    }
    return { shops, totalShops };
}

// ItemHandler.loadItemList: every line becomes an ItemList entry in file order.
function loadItems(file) {
    const entries = [];
    for (const { tokens, line } of javaCfgRows(file, 'item', '[ENDOFITEMLIST]')) {
        const id = javaParseInt(tokens[0], `item.cfg:${line}`);
        entries.push({ id, name: tokens[1].split('_').join(' '), desc: tokens[2].split('_').join(' '), value: Number(tokens[4]), line });
    }
    const first = new Map();
    const last = new Map();
    for (const entry of entries) {
        if (!first.has(entry.id)) {
            first.set(entry.id, entry);
        }
        last.set(entry.id, entry);
    }
    return { entries, first, last };
}

// Item.java static block: data/*.dat bytes, then the forced itemSellable[] = true ids.
function loadFlags(legacyDir) {
    const dat = name => fs.readFileSync(path.join(legacyDir, 'data', name));
    const stackable = dat('stackable.dat');
    const notes = dat('notes.dat');
    const sellable = dat('sellable.dat');
    const forced = new Set();
    const src = fs.readFileSync(path.join(legacyDir, 'Item.java'), 'latin1');
    for (const raw of src.split(/\r?\n/)) {
        const line = raw.replace(/\/\/.*$/, '');
        const m = line.match(/^\s*itemSellable\[(\d+)\]\s*=\s*(true|false)\s*;/);
        if (m) {
            if (m[2] !== 'true' || Number(m[1]) >= FLAG_SIZE) {
                throw new Error(`Item.java: unexpected override ${raw.trim()}`);
            }
            forced.add(Number(m[1]));
        }
    }
    return {
        stackable: id => id < stackable.length && stackable[id] !== 0,
        isNote: id => id < notes.length && notes[id] === 0,
        sellable: id => (id < sellable.length && sellable[id] === 0) || forced.has(id),
        forced
    };
}

// ---- client.java NPC click chains ----

function skipJunk(src, i) {
    for (;;) {
        while (i < src.length && /\s/.test(src[i])) {
            i++;
        }
        if (src.startsWith('//', i)) {
            i = src.indexOf('\n', i);
            i = i === -1 ? src.length : i;
        } else if (src.startsWith('/*', i)) {
            i = src.indexOf('*/', i) + 2;
        } else {
            return i;
        }
    }
}

// Index just past the bracket that closes the one at `i`, skipping strings and comments.
function matchBracket(src, i) {
    const open = src[i];
    const close = open === '(' ? ')' : '}';
    let depth = 0;
    for (; i < src.length; i++) {
        const c = src[i];
        if (c === '"' || c === "'") {
            for (i++; src[i] !== c; i++) {
                if (src[i] === '\\') {
                    i++;
                }
            }
        } else if (src.startsWith('//', i)) {
            i = src.indexOf('\n', i);
        } else if (src.startsWith('/*', i)) {
            i = src.indexOf('*/', i) + 1;
        } else if (c === open) {
            depth++;
        } else if (c === close && --depth === 0) {
            return i + 1;
        }
    }
    throw new Error('unbalanced bracket');
}

const isWord = (src, i, word) => src.startsWith(word, i) && !/\w/.test(src[i - 1] ?? ' ') && !/\w/.test(src[i + word.length] ?? ' ');

// Top-level if/else-if chains of a case block, each branch with its condition, body and line.
function parseChains(src, lineOf) {
    const chains = [];
    let depth = 0;
    for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (c === '"' || c === "'") {
            for (i++; src[i] !== c; i++) {
                if (src[i] === '\\') {
                    i++;
                }
            }
        } else if (src.startsWith('//', i)) {
            i = src.indexOf('\n', i);
        } else if (src.startsWith('/*', i)) {
            i = src.indexOf('*/', i) + 1;
        } else if (c === '{') {
            depth++;
        } else if (c === '}') {
            depth--;
        } else if (depth === 0 && isWord(src, i, 'if')) {
            const branches = [];
            for (;;) {
                const line = lineOf(i);
                i = skipJunk(src, i + 2);
                const condEnd = matchBracket(src, i);
                const cond = src.slice(i + 1, condEnd - 1);
                i = skipJunk(src, condEnd);
                const bodyEnd = src[i] === '{' ? matchBracket(src, i) : src.indexOf(';', i) + 1;
                branches.push({ cond, body: src.slice(i, bodyEnd), line });
                i = skipJunk(src, bodyEnd);
                if (!isWord(src, i, 'else')) {
                    break;
                }
                i = skipJunk(src, i + 4);
                if (!isWord(src, i, 'if')) {
                    const elseEnd = matchBracket(src, i);
                    branches.push({ cond: null, body: src.slice(i, elseEnd), line: lineOf(i) });
                    i = elseEnd;
                    break;
                }
            }
            chains.push(branches);
            i--;
        }
    }
    return chains;
}

// npc id -> { shop, line } for one click packet: the first branch naming an NPC wins, and a
// branch that does something else (bank, dialogue, teleport) shadows later shop branches.
function clickShops(clientSrc, startLabel, endLabel, report) {
    const start = clientSrc.indexOf(startLabel);
    const end = clientSrc.indexOf(endLabel, start);
    if (start === -1 || end === -1) {
        throw new Error(`client.java: ${startLabel} not found`);
    }
    const baseLine = clientSrc.slice(0, start).split('\n').length;
    const block = clientSrc.slice(start, end);
    const lineOf = i => baseLine + block.slice(0, i).split('\n').length - 1;

    const result = new Map();
    for (const chain of parseChains(block, lineOf)) {
        const seen = new Set();
        for (const { cond, body, line } of chain) {
            if (cond === null) {
                continue;
            }
            const ids = [...cond.matchAll(/NPCID\s*==\s*(\d+)/g)].map(m => Number(m[1]));
            if (ids.length === 0) {
                continue;
            }
            const pure = /^\s*\(?\s*NPCID\s*==\s*\d+(\s*\|\|\s*NPCID\s*==\s*\d+)*\s*\)?\s*$/.test(cond);
            const shop = body.match(/WanneShop\s*=\s*(\d+)/);
            for (const id of ids) {
                if (seen.has(id)) {
                    continue;
                }
                if (!pure) {
                    if (shop) {
                        report(`  ! L${line}: conditional shop branch for NPC ${id} (${cond.trim()}) not ported`);
                    }
                    continue;
                }
                seen.add(id);
                if (shop) {
                    result.set(id, { shop: Number(shop[1]), line });
                }
            }
        }
    }
    return result;
}

// debugname -> set of op numbers, from every .npc config (Lost City + Allstar).
function npcOps(contentDir) {
    const ops = new Map();
    const walk = dir => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const file = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(file);
            } else if (file.endsWith('.npc')) {
                let current = null;
                for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
                    const header = line.match(/^\[(.+)\]$/);
                    if (header) {
                        current = header[1];
                        if (!ops.has(current)) {
                            ops.set(current, new Set());
                        }
                        continue;
                    }
                    const op = line.match(/^op(\d)=/);
                    if (current && op) {
                        ops.get(current).add(Number(op[1]));
                    }
                }
            }
        }
    };
    walk(path.join(contentDir, 'scripts'));
    return ops;
}

export default function shops({ legacy, packs, content, writeGenerated, report }) {
    const legacyDir = legacy.dir;
    const clientSrc = fs.readFileSync(legacy.file('client.java'), 'latin1');
    const { shops, totalShops } = loadShops(legacy.file('shops.cfg'));
    const items = loadItems(legacy.file('item.cfg'));
    const flags = loadFlags(legacyDir);

    // Allstar item id -> obj debugname. Ids up to 7955 are the 377 objs; custom items (id >= 7956)
    // exist once the customitems step adds them as allstar_item_<id> (at whatever pack id).
    const allstarObjs = new Map();
    for (const [packId, name] of packs.obj.byId) {
        const custom = name.match(/^allstar_item_(\d+)$/);
        if (custom) {
            allstarObjs.set(Number(custom[1]), name);
        } else if (packId < 7956) {
            allstarObjs.set(packId, name);
        }
    }
    const objName = id => allstarObjs.get(id);

    // ---- NPC options that open shops ----
    const clicks = [
        { packet: 155, op: 1, label: 'case 155: // first Click npc', end: 'case 17: // second Click npc' },
        { packet: 17, op: 3, label: 'case 17: // second Click npc', end: 'case 72: // Click to attack' }
    ];
    const opsByName = npcOps(content);
    const triggers = [];
    const openable = new Set([2]); // dialogue 3 "Yes please!" (client.java L24005) opens shop 2
    for (const click of clicks) {
        for (const [npc, { shop, line }] of clickShops(clientSrc, click.label, click.end, report)) {
            const debugname = packs.npc.name(npc);
            if (debugname === undefined) {
                report(`  ! NPC ${npc} (packet ${click.packet} -> shop ${shop}) does not exist`);
                continue;
            }
            if (!opsByName.get(debugname)?.has(click.op)) {
                report(`  ! NPC ${npc} ${debugname} has no op${click.op} for packet ${click.packet} -> shop ${shop}`);
            }
            openable.add(shop);
            triggers.push({ npc, debugname, op: click.op, packet: click.packet, shop, line });
        }
    }
    triggers.sort((a, b) => a.npc - b.npc || a.op - b.op);

    // Defined shops, plus undefined ones an NPC still opens (blank title, no stock, S=0).
    const shopIds = [...new Set([...shops.keys(), ...openable])].sort((a, b) => a - b);
    const maxShop = Math.max(...shopIds);

    // ---- per-item data (every obj that exists) ----
    const objIds = [...allstarObjs.keys()].sort((a, b) => a - b);
    const price = id => {
        const entry = items.last.get(id);
        return entry ? Math.floor(entry.value) : 1;
    };
    const itemName = id => items.first.get(id)?.name ?? `!! NOT EXISTING ITEM !!! - ID:${id}`;
    // GetUnnotedItem compares names with ==, so only the note's own item.cfg entry matches and
    // it is skipped for a "Swap this note at any bank for a..." description: the result is 0.
    const unnote = id => {
        const entry = items.last.get(id);
        return entry && !entry.desc.startsWith(NOTE_DESC) ? id : 0;
    };

    // A missing key gives the default (0 unless set, so obj enums need default=null). String enums
    // must hold every key: the engine pushes an int for a missing string key.
    const enums = [];
    const enumBlock = (name, inputtype, outputtype, defaultValue, vals) => {
        enums.push(`[${name}]`, `inputtype=${inputtype}`, `outputtype=${outputtype}`);
        if (defaultValue !== undefined) {
            enums.push(`default=${defaultValue}`);
        }
        enums.push(...vals.map(([k, v]) => `val=${k},${v}`), '');
    };

    // shop data
    enumBlock('allstar_shop_title', 'int', 'string', undefined, shopIds.map(id => [id, shops.get(id)?.name ?? '']));
    enumBlock('allstar_shop_smod', 'int', 'int', 0, shopIds.map(id => [id, shops.get(id)?.smod ?? 0]));
    enumBlock('allstar_shop_standard', 'int', 'int', 0, shopIds.map(id => [id, shops.get(id)?.standard ?? 0]));
    enumBlock('allstar_shop_restocks', 'int', 'boolean', 'no', shopIds.filter(id => id >= 1 && id <= totalShops).map(id => [id, 'yes']));
    enumBlock('allstar_shop_view', 'int', 'inv', 'null', shopIds.map(id => [id, `allstar_shop_view_${id}`]));

    const defObj = [];
    const defCount = [];
    const skipped = new Map();
    for (const id of shopIds) {
        const shop = shops.get(id);
        (shop?.items ?? []).forEach((item, slot) => {
            const key = id * SLOTS + slot;
            defCount.push([key, item.count]);
            const name = objName(item.obj);
            if (name === undefined) {
                skipped.set(item.obj, [...(skipped.get(item.obj) ?? []), id]);
            } else {
                defObj.push([key, name]);
            }
        });
    }
    enumBlock('allstar_shop_defobj', 'int', 'namedobj', 'null', defObj);
    enumBlock('allstar_shop_defcount', 'int', 'int', 0, defCount);

    // item data
    // obj -> namedobj (inv_add/inv_setslot only take namedobj; values read from invs are obj)
    enumBlock('allstar_shop_obj', 'obj', 'namedobj', 'null', objIds.map(id => [objName(id), objName(id)]));
    enumBlock('allstar_shop_price', 'obj', 'int', 1, objIds.filter(id => price(id) !== 1).map(id => [objName(id), price(id)]));
    enumBlock('allstar_shop_itemname', 'obj', 'string', undefined, objIds.map(id => [objName(id), itemName(id)]));
    enumBlock('allstar_shop_sellable', 'obj', 'boolean', 'no', objIds.filter(id => flags.sellable(id)).map(id => [objName(id), 'yes']));
    enumBlock('allstar_shop_isnote', 'obj', 'boolean', 'no', objIds.filter(id => flags.isNote(id)).map(id => [objName(id), 'yes']));
    enumBlock('allstar_shop_stackable', 'obj', 'boolean', 'no', objIds.filter(id => flags.stackable(id)).map(id => [objName(id), 'yes']));
    enumBlock(
        'allstar_shop_unnote',
        'obj',
        'namedobj',
        'null',
        objIds.filter(id => flags.isNote(id)).map(id => [objName(id), objName(unnote(id))])
    );
    writeGenerated('configs/shops.enum', enums);

    // ---- inventories ----
    // Model and clock: slot shop*101+j is ShopItems[shop][j]; model count = ShopItemsN + 1 so an
    // empty default slot can be stored, clock count = restock origin tick + 1.
    const invs = [
        '[allstar_shop_items]',
        'scope=shared',
        `size=${(maxShop + 1) * SLOTS}`,
        'stackall=yes',
        '',
        '[allstar_shop_clock]',
        'scope=shared',
        `size=${(maxShop + 1) * SLOTS}`,
        'stackall=yes',
        '',
        // per shop: slot shop*4 = initialised, +1 = next restock cycle + 1,000,000, +2 = slots in use + 1
        '[allstar_shop_state]',
        'scope=shared',
        `size=${(maxShop + 1) * 4}`,
        'stackall=yes',
        ''
    ];
    for (const id of shopIds) {
        // Display: the stock objs are listed so a sold-out default item can stay at count 0.
        const stock = [...new Set((shops.get(id)?.items ?? []).map(item => objName(item.obj)).filter(name => name !== undefined))].slice(0, VIEW_SIZE);
        invs.push(`[allstar_shop_view_${id}]`, 'scope=shared', `size=${VIEW_SIZE}`, 'stackall=yes', ...stock.map((name, i) => `stock${i + 1}=${name},0`), '');
    }
    writeGenerated('configs/shops.inv', invs);

    // ---- NPC triggers ----
    const scripts = [];
    for (const t of triggers) {
        const title = shops.get(t.shop)?.name ?? '(undefined shop)';
        scripts.push(`// NPC ${t.npc} packet ${t.packet} (client.java L${t.line}) -> shop ${t.shop} ${JSON.stringify(title)}`);
        scripts.push(`[opnpc${t.op},${t.debugname}] ~allstar_shop_open(${t.shop});`, '');
    }
    writeGenerated('scripts/shops.rs2', scripts);

    // ---- report ----
    const stockTotal = shopIds.reduce((n, id) => n + (shops.get(id)?.items.length ?? 0), 0);
    report(
        `Shops: ${shops.size} defined (TotalShops ${totalShops}), ${shopIds.length} generated, ${stockTotal} stock slots, ${triggers.length} NPC shop options`,
        ...shopIds
            .filter(id => shops.get(id)?.dangling !== undefined)
            .map(id => `  - shop ${id}: trailing token ${JSON.stringify(shops.get(id).dangling)} ignored (as loadShops did)`),
        ...[...shops.values()].filter(s => s.lines.length > 1).map(s => `  - shop ${s.id}: loaded ${s.lines.length} times (lines ${s.lines.join(', ')}), ShopItemsStandard ${s.standard}`),
        ...shopIds.filter(id => !shops.has(id)).map(id => `  - shop ${id}: undefined in shops.cfg but opened by an NPC`),
        ...triggers.map(t => `  - [opnpc${t.op},${t.debugname}] NPC ${t.npc} -> shop ${t.shop}`)
    );
    if (skipped.size > 0) {
        report(
            `Shop stock skipped (obj not in obj.pack yet; rerun after the custom items exist): ${skipped.size} ids`,
            ...[...skipped.entries()].sort((a, b) => a[0] - b[0]).map(([obj, ids]) => `  - ${obj} (shop ${[...new Set(ids)].join(', ')})`)
        );
    }
}
