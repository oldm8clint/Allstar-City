// Builds the Allstar-City Java client (client/, revision 377) into dist/allstar-city-client.jar.
//
//   node allstar/tools/build-client.mjs [--host play.example.com] [--portoff 0]
//
// The host and port offset are baked into the jar (allstar.properties); players can still
// override them with java -Dallstar.host=... -Dallstar.portoff=... -jar allstar-city-client.jar.
// The client connects to the game on 43594 + portoff and downloads the cache over http on 80 + portoff.
// Needs a JDK (javac and jar) on the PATH.
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'client/src/main/java');
const OUT = path.join(ROOT, 'client/build/allstar');
const CLASSES = path.join(OUT, 'classes');
const JAR = path.join(ROOT, 'dist/allstar-city-client.jar');

function option(name, fallback) {
    const index = process.argv.indexOf(`--${name}`);
    return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const host = option('host', '127.0.0.1');
const portoff = option('portoff', '0');

function listJava(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            listJava(full, out);
        } else if (entry.name.endsWith('.java')) {
            out.push(full);
        }
    }
    return out;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(CLASSES, { recursive: true });
fs.mkdirSync(path.dirname(JAR), { recursive: true });

const sources = path.join(OUT, 'sources.txt');
fs.writeFileSync(sources, listJava(SRC).map(f => `"${f.replaceAll('\\', '/')}"`).join('\n'));
execFileSync('javac', ['--release', '8', '-nowarn', '-encoding', 'UTF-8', '-d', CLASSES, `@${sources}`], { stdio: 'inherit' });

fs.writeFileSync(path.join(CLASSES, 'allstar.properties'), `host=${host}\nportoff=${portoff}\n`);
fs.rmSync(JAR, { force: true });
execFileSync('jar', ['--create', '--file', JAR, '--main-class', 'jagex2.client.Client', '-C', CLASSES, '.'], { stdio: 'inherit' });

console.log(`Built ${path.relative(ROOT, JAR)} for ${host} (game port ${43594 + Number(portoff)}, http port ${80 + Number(portoff)})`);
