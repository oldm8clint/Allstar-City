// TextHandler.process(): the interface relabels Allstar-Scape sent at every login (prayer tab title,
// attack styles, options, friends/ignore, emote tab teleport labels, spellbook, skill hovers).
// 317 component ids are the same in the 377 cache; writes to components that are not text in 377
// (the staff attack tab was redrawn) are left out.
import fs from 'fs';
import path from 'path';

import { Pack } from '../lib/pack.mjs';

function componentTypes(content) {
    const types = new Map();
    const walk = dir => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const file = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(file);
            } else if (entry.name.endsWith('.if')) {
                const inter = entry.name.slice(0, -3);
                let com = null;
                for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
                    if (line.startsWith('[')) {
                        com = line.slice(1, line.indexOf(']'));
                    } else if (line.startsWith('type=') && com) {
                        types.set(`${inter}:${com}`, line.slice(5));
                    }
                }
            }
        }
    };
    walk(path.join(content, 'scripts'));
    return types;
}

// "text" or "text" + PlayerHandler.getPlayerCount() -> RuneScript string literal
function literal(expr) {
    const parts = [];
    for (const piece of expr.split(/\s*\+\s*/)) {
        if (piece.startsWith('"')) {
            parts.push(JSON.parse(piece));
        } else if (piece === 'PlayerHandler.getPlayerCount()') {
            parts.push('<tostring(playercount)>');
        } else {
            throw new Error(`TextHandler: unsupported expression ${expr}`);
        }
    }
    return `"${parts.join('')}"`;
}

export default function texts({ root, content, writeGenerated, report }) {
    const pack = new Pack(path.join(content, 'pack/interface.pack'));
    const types = componentTypes(content);
    const source = fs.readFileSync(path.join(root, 'allstar/legacy/TextHandler.java'), 'latin1');

    const lines = [
        '// TextHandler.process(int), called once from client.initialize at login',
        '[proc,allstar_texthandler]'
    ];
    const skipped = [];
    let count = 0;
    for (const match of source.matchAll(/p\.send(?:Quest|Frame126)\(\s*((?:"(?:[^"\\]|\\.)*"(?:\s*\+\s*[\w.()]+)?))\s*,\s*(\d+)\s*\)/g)) {
        count++;
        const id = Number(match[2]);
        const name = pack.name(id);
        if (!name || types.get(name) !== 'text') {
            skipped.push(`${id} (${name ?? 'no component'}${name ? `, ${types.get(name) ?? 'no type'}` : ''})`);
            continue;
        }
        lines.push(`if_settext(${name}, ${literal(match[1])});`);
    }
    writeGenerated('scripts/texthandler.rs2', lines);
    report(`TextHandler: ${count} writes, ${count - skipped.length} sent, not text in 377: ${skipped.join(', ')}`);
}
