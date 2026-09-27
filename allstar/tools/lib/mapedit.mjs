// Edits Lost City map squares (content/maps/m{mx}_{mz}.jm2).
//
// Map line format per section: "level localX localZ: data"
//   LOC: "id shape angle"   NPC: "id"   OBJ: "id count"
//
// Sections can be cleared wholesale (Allstar-City owns all NPC and OBJ spawns) or edited line by
// line. Line edits are recorded in a manifest and undone at the start of the next run, so the
// generator is repeatable and upstream map data is never lost.
import fs from 'fs';
import path from 'path';

const SECTIONS = ['MAP', 'LOC', 'NPC', 'OBJ'];

function parseSections(text) {
    const sections = new Map();
    let current = null;
    for (const line of text.split(/\r?\n/)) {
        const match = /^==== (\w+) ====$/.exec(line);
        if (match) {
            current = match[1];
            sections.set(current, []);
        } else if (current !== null && line.length > 0) {
            sections.get(current).push(line);
        }
    }
    return sections;
}

// Writes sections in their original order (new ones in canonical order), keeping empty
// upstream sections so untouched files round-trip byte-for-byte.
function writeSections(sections) {
    const names = [...sections.keys()];
    for (const name of SECTIONS) {
        if (!names.includes(name)) {
            names.push(name);
        }
    }
    const out = [];
    for (const name of names) {
        const lines = sections.get(name);
        if (!lines) {
            continue;
        }
        if (out.length > 0) {
            out.push('');
        }
        out.push(`==== ${name} ====`, ...lines);
    }
    return out.join('\n') + '\n';
}

export function square(x, z) {
    return { mx: x >> 6, mz: z >> 6, lx: x & 63, lz: z & 63 };
}

export function parseLine(file, line) {
    const [mx, mz] = file.slice(1, -4).split('_').map(Number);
    const colon = line.indexOf(': ');
    const [level, lx, lz] = line.slice(0, colon).split(' ').map(Number);
    return { level, x: (mx << 6) + lx, z: (mz << 6) + lz, data: line.slice(colon + 2) };
}

export class MapEditor {
    constructor(mapsDir, manifestFile) {
        this.mapsDir = mapsDir;
        this.manifestFile = manifestFile;
        this.maps = new Map();
        this.touched = new Set();
        this.manifest = {};

        for (const file of fs.readdirSync(mapsDir)) {
            if (/^m\d+_\d+\.jm2$/.test(file)) {
                this.maps.set(file, parseSections(fs.readFileSync(path.join(mapsDir, file), 'utf8')));
            }
        }

        // undo the previous run's line edits
        const previous = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};
        for (const [file, sections] of Object.entries(previous)) {
            const map = this.maps.get(file);
            if (!map) {
                continue;
            }
            this.touched.add(file);
            for (const [section, { added = [], removed = [] }] of Object.entries(sections)) {
                const lines = map.get(section) ?? [];
                for (const line of added) {
                    const index = lines.lastIndexOf(line);
                    if (index !== -1) {
                        lines.splice(index, 1);
                    }
                }
                lines.push(...removed);
                map.set(section, lines);
            }
        }
    }

    fileFor(x, z) {
        const { mx, mz } = square(x, z);
        return `m${mx}_${mz}.jm2`;
    }

    has(x, z) {
        return this.maps.has(this.fileFor(x, z));
    }

    record(file, section, kind, line) {
        ((this.manifest[file] ??= {})[section] ??= { added: [], removed: [] })[kind].push(line);
    }

    // Empties a section in every map square. Not recorded: the caller owns the whole section.
    clear(section) {
        for (const [file, map] of this.maps) {
            if (map.has(section) && map.get(section).length > 0) {
                map.set(section, []);
                this.touched.add(file);
            }
        }
    }

    // Entries of a section at an exact tile (or the whole square when level is undefined).
    entries(section, level, x, z) {
        const file = this.fileFor(x, z);
        const lines = this.maps.get(file)?.get(section) ?? [];
        return lines
            .map(line => ({ line, ...parseLine(file, line) }))
            .filter(e => level === undefined || (e.level === level && e.x === x && e.z === z));
    }

    add(section, level, x, z, data, record = true) {
        const file = this.fileFor(x, z);
        const map = this.maps.get(file);
        if (!map) {
            throw new Error(`no map square for ${level},${x},${z}`);
        }
        if (!map.has(section)) {
            map.set(section, []);
        }
        const { lx, lz } = square(x, z);
        const line = `${level} ${lx} ${lz}: ${data}`;
        map.get(section).push(line);
        this.touched.add(file);
        if (record) {
            this.record(file, section, 'added', line);
        }
    }

    // Removes entries at a tile matching predicate(data); returns how many were removed.
    remove(section, level, x, z, predicate) {
        const file = this.fileFor(x, z);
        const lines = this.maps.get(file)?.get(section);
        if (!lines) {
            return 0;
        }
        let removed = 0;
        for (const entry of this.entries(section, level, x, z)) {
            if (predicate(entry.data)) {
                lines.splice(lines.indexOf(entry.line), 1);
                this.record(file, section, 'removed', entry.line);
                this.touched.add(file);
                removed++;
            }
        }
        return removed;
    }

    save() {
        for (const file of this.touched) {
            fs.writeFileSync(path.join(this.mapsDir, file), writeSections(this.maps.get(file)));
        }
        fs.writeFileSync(this.manifestFile, JSON.stringify(this.manifest, null, 1) + '\n');
    }
}
