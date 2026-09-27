// Reads and extends Lost City pack files (content/pack/*.pack): "id=debugname" per line.
import fs from 'fs';

export class Pack {
    constructor(file) {
        this.file = file;
        this.byId = new Map();
        this.byName = new Map();
        this.added = [];
        for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
            const eq = line.indexOf('=');
            if (eq === -1) {
                continue;
            }
            const id = parseInt(line.slice(0, eq));
            const name = line.slice(eq + 1);
            this.byId.set(id, name);
            this.byName.set(name, id);
        }
    }

    get max() {
        let max = -1;
        for (const id of this.byId.keys()) {
            max = Math.max(max, id);
        }
        return max;
    }

    name(id) {
        return this.byId.get(id);
    }

    id(name) {
        return this.byName.get(name);
    }

    // Returns the id for a name, registering it at the next free id when new.
    ensure(name) {
        const existing = this.byName.get(name);
        if (existing !== undefined) {
            return existing;
        }
        const id = this.max + 1;
        this.byId.set(id, name);
        this.byName.set(name, id);
        this.added.push(id);
        return id;
    }

    save() {
        if (this.added.length === 0) {
            return;
        }
        const ids = [...this.byId.keys()].sort((a, b) => a - b);
        fs.writeFileSync(this.file, ids.map(id => `${id}=${this.byId.get(id)}`).join('\n') + '\n');
    }
}
