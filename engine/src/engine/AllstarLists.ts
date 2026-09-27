import fs from 'fs';
import path from 'path';

// Allstar-City: named lists persisted one entry per line in data/allstar/<list>.txt, like
// Allstar-Scape's data/bannedusers.txt, bannedips.txt and macrowarn.txt.
const DIR = 'data/allstar';
const lists = new Map<string, Set<string>>();

function normalize(entry: string): string {
    return entry.trim().toLowerCase().replaceAll(' ', '_');
}

function file(list: string): string {
    if (!/^[a-z0-9_]+$/.test(list)) {
        throw new Error(`invalid list name: ${list}`);
    }
    return path.join(DIR, `${list}.txt`);
}

function load(list: string): Set<string> {
    let entries = lists.get(list);
    if (!entries) {
        const f = file(list);
        entries = new Set(fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(e => e.length > 0) : []);
        lists.set(list, entries);
    }
    return entries;
}

function save(list: string, entries: Set<string>): void {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(file(list), [...entries].map(e => e + '\n').join(''));
}

export function appendLog(name: string, line: string): void {
    if (!/^[A-Za-z0-9_]+$/.test(name)) {
        throw new Error(`invalid log name: ${name}`);
    }
    const dir = path.join(DIR, 'logs');
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, `${name}.txt`), line + '\n');
}

export default {
    has(list: string, entry: string): boolean {
        return load(list).has(normalize(entry));
    },

    add(list: string, entry: string): void {
        const entries = load(list);
        const value = normalize(entry);
        if (value.length > 0 && !entries.has(value)) {
            entries.add(value);
            save(list, entries);
        }
    },

    delete(list: string, entry: string): void {
        const entries = load(list);
        if (entries.delete(normalize(entry))) {
            save(list, entries);
        }
    },

    clear(list: string): void {
        const entries = load(list);
        entries.clear();
        save(list, entries);
    }
};
