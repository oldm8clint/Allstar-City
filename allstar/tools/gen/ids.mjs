// Allstar-Scape ::commands take raw 317 ids (::pickup, ::pnpc, ::emote, ::gfx, ::interface ...).
// These enums map an Allstar-Scape id to the Lost City config with that id. Allstar-Scape's custom
// items (ids >= 7956) are the objs named allstar_item_<id>.
import fs from 'fs';
import path from 'path';

import { Pack } from '../lib/pack.mjs';

function* files(dir, ext) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            yield* files(file, ext);
        } else if (entry.name.endsWith(ext)) {
            yield file;
        }
    }
}

// objs that inv_add refuses (dummyitem=...)
function dummyObjs(content) {
    const dummies = new Set();
    for (const file of files(path.join(content, 'scripts'), '.obj')) {
        let current = null;
        for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
            if (line.startsWith('[')) {
                current = line.slice(1, line.indexOf(']'));
            } else if (line.startsWith('dummyitem=') && current) {
                dummies.add(current);
            }
        }
    }
    return dummies;
}

function enumLines(name, outputtype, entries) {
    const lines = [`[${name}]`, 'inputtype=int', `outputtype=${outputtype}`];
    for (const [id, config] of [...entries].sort((a, b) => a[0] - b[0])) {
        lines.push(`val=${id},${config}`);
    }
    return lines;
}

export default function ids({ content, packs, writeGenerated, report }) {
    const pack = type => new Pack(path.join(content, `pack/${type}.pack`));

    const objs = new Map();
    const dummies = dummyObjs(content);
    for (const [id, name] of packs.obj.byId) {
        const custom = /^allstar_item_(\d+)$/.exec(name);
        if (custom) {
            objs.set(Number(custom[1]), name);
        } else if (id < 7956 && !dummies.has(name)) {
            objs.set(id, name);
        }
    }

    const npcs = new Map(packs.npc.byId);
    const seqs = new Map(pack('seq').byId);
    const spotanims = new Map(pack('spotanim').byId);
    const interfaces = new Map([...pack('interface').byId].filter(([, name]) => !name.includes(':')));

    writeGenerated('configs/ids.enum', [
        '// Allstar-Scape id -> Lost City config, for ::commands that take ids',
        ...enumLines('allstar_obj_ids', 'namedobj', objs),
        '',
        ...enumLines('allstar_npc_ids', 'npc', npcs),
        '',
        ...enumLines('allstar_seq_ids', 'seq', seqs),
        '',
        ...enumLines('allstar_spotanim_ids', 'spotanim', spotanims),
        '',
        ...enumLines('allstar_interface_ids', 'interface', interfaces)
    ]);

    report(`Id enums: ${objs.size} objs, ${npcs.size} npcs, ${seqs.size} seqs, ${spotanims.size} spotanims, ${interfaces.size} interfaces`);
}
