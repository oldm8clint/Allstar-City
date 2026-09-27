// Parsers for the original Allstar-Scape v2 (Moparscape 317) configuration files.
import fs from 'fs';
import path from 'path';

const isInt = token => /^-?\d+$/.test(token);

// Yields the whitespace-split tokens after "key =" for every line starting with key.
function* rows(file, key) {
    const text = fs.readFileSync(file, 'latin1');
    let lineNo = 0;
    for (const raw of text.split(/\r?\n/)) {
        lineNo++;
        const line = raw.trim();
        if (!line.startsWith(key)) {
            continue;
        }
        const eq = line.indexOf('=');
        if (eq === -1 || line.slice(0, eq).trim() !== key) {
            continue;
        }
        yield { tokens: line.slice(eq + 1).trim().split(/\s+/), line: lineNo };
    }
}

// Names use underscores for spaces; some also carry @col@ codes.
export function cleanName(name) {
    return name.replace(/@[a-z0-9]{3}@/gi, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

export class Legacy {
    constructor(dir) {
        this.dir = dir;
    }

    file(name) {
        return path.join(this.dir, name);
    }

    // spawn = npc x y height rangeX1 rangeY1 rangeX2 rangeY2 walkType description
    spawns() {
        const out = [];
        for (const { tokens, line } of rows(this.file('autospawn.cfg'), 'spawn')) {
            const [npc, x, z, level, rx1, rz1, rx2, rz2, walk] = tokens.slice(0, 9).map(Number);
            out.push({ npc, x, z, level, rx1, rz1, rx2, rz2, walk, desc: tokens.slice(9).join(' '), line });
        }
        return out;
    }

    // shop = id name sell buy (item amount)*
    shops() {
        const out = [];
        for (const { tokens, line } of rows(this.file('shops.cfg'), 'shop')) {
            const id = Number(tokens[0]);
            let start = tokens.length;
            while (start > 1 && isInt(tokens[start - 1])) {
                start--;
            }
            if ((tokens.length - start) % 2 === 1) {
                start++; // a trailing number that belongs to the name
            }
            const nums = tokens.slice(start).map(Number);
            const stock = [];
            for (let i = 2; i + 1 < nums.length; i += 2) {
                stock.push({ obj: nums[i], count: nums[i + 1] });
            }
            out.push({ id, rawName: tokens.slice(1, start).join(' '), name: cleanName(tokens.slice(1, start).join(' ')), sell: nums[0], buy: nums[1], stock, line });
        }
        return out;
    }

    // npcdrop = npc dropType (item amount)*
    npcDrops() {
        const out = [];
        for (const { tokens, line } of rows(this.file('npcdrops.cfg'), 'npcdrop')) {
            const nums = tokens.filter(isInt).map(Number);
            const items = [];
            for (let i = 2; i + 1 < nums.length; i += 2) {
                items.push({ obj: nums[i], count: nums[i + 1] });
            }
            out.push({ npc: nums[0], type: nums[1], items, line });
        }
        return out;
    }

    // drop = item x y amount height type description   (static ground items)
    groundItems() {
        const out = [];
        for (const { tokens, line } of rows(this.file('drops.cfg'), 'drop')) {
            const [obj, x, z, count, level, type] = tokens.slice(0, 6).map(Number);
            out.push({ obj, x, z, count, level, type, desc: tokens.slice(6).join(' '), line });
        }
        return out;
    }

    // item = id name desc shopValue lowAlch highAlch bonus*
    items() {
        const out = new Map();
        for (const { tokens, line } of rows(this.file('item.cfg'), 'item')) {
            const id = Number(tokens[0]);
            out.set(id, {
                id,
                name: cleanName(tokens[1] ?? ''),
                desc: cleanName(tokens[2] ?? ''),
                value: Number(tokens[3] ?? 0),
                lowAlch: Number(tokens[4] ?? 0),
                highAlch: Number(tokens[5] ?? 0),
                bonuses: tokens.slice(6).map(Number),
                line
            });
        }
        return out;
    }

    // npc = id name combat health
    npcs() {
        const out = new Map();
        for (const { tokens, line } of rows(this.file('npc.cfg'), 'npc')) {
            const id = Number(tokens[0]);
            const nums = tokens.slice(1);
            const health = Number(nums.pop());
            const combat = Number(nums.pop());
            out.set(id, { id, name: cleanName(nums.join(' ')), combat, health, line });
        }
        return out;
    }
}
