// Prints Lost City debug names for Allstar-Scape ids: node allstar/tools/lookup.mjs obj 995 4151
import path from 'path';
import { fileURLToPath } from 'url';

import { Legacy } from './lib/legacy.mjs';
import { Pack } from './lib/pack.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [type, ...ids] = process.argv.slice(2);
const pack = new Pack(path.join(ROOT, `content/pack/${type}.pack`));
const legacy = new Legacy(path.join(ROOT, 'allstar/legacy'));
const names = type === 'obj' ? legacy.items() : type === 'npc' ? legacy.npcs() : new Map();

for (const id of ids.map(Number)) {
    console.log(`${id}\t${pack.name(id) ?? '-'}\t${names.get(id)?.name ?? ''}`);
}
