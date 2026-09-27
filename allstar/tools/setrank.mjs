// Sets an account's Allstar rank for its next login: 0 player, 1 moderator, 2 administrator,
// 3 owner. It writes the account's staff level in the login database (engine/db.sqlite), which
// [proc,allstar_login_rights] turns into the rank (%allstar_rights) when it is higher. This is how
// the owner account is made on a production server (LOGIN_SERVER=true). The account must have
// logged in once. Lowering a rank here does not demote anyone; use the in-game commands for that.
//
//   node allstar/tools/setrank.mjs "Mod Allstar" 3
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DB = path.join(ROOT, 'engine/db.sqlite');

// The login name as the engine stores it (toSafeName: base37, 12 characters, lowercase,
// anything else becomes '_', trailing '_' dropped).
function safeName(name) {
    let out = '';
    for (const c of name.slice(0, 12)) {
        out += /[a-z0-9]/i.test(c) ? c.toLowerCase() : '_';
    }
    return out.replace(/_+$/, '');
}

const [name, rankText] = process.argv.slice(2);
const rank = Number(rankText);
if (!name || !Number.isInteger(rank) || rank < 0 || rank > 3) {
    console.error('usage: node allstar/tools/setrank.mjs <username> <rank 0-3>');
    process.exit(1);
}

const db = new DatabaseSync(DB);
const username = safeName(name);
const result = db.prepare('UPDATE account SET staffmodlevel = ? WHERE username = ?').run(rank, username);
if (result.changes === 0) {
    console.error(`no account "${username}" in ${DB} (it is created at the first login)`);
    process.exit(1);
}
console.log(`${username}: rank ${rank} from the next login`);
