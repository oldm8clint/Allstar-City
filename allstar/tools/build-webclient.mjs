// Builds the Allstar-City web client (webclient/, Lost City Client-TS 289 + 377 support) and
// installs it where the engine's web server serves it (engine/public/client).
//
//   node allstar/tools/build-webclient.mjs [--dev]
//
// Needs Bun (https://bun.sh), which Client-TS uses to bundle; without a bun on the PATH it runs
// the npm package with npx. --dev keeps the bundle readable (no minify, console logging kept).
// Players open http://<server>:<WEB_PORT>/rs2.cgi; the client talks to the server over a
// WebSocket on the same address.
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CLIENT = path.join(ROOT, 'webclient');
const OUT = path.join(CLIENT, 'out');
const PUBLIC = path.join(ROOT, 'engine/public/client');
const dev = process.argv.includes('--dev');

function hasBun() {
    try {
        execFileSync('bun', ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' });
        return true;
    } catch {
        return false;
    }
}

function bun(args) {
    const [cmd, prefix] = hasBun() ? ['bun', []] : ['npx', ['--yes', 'bun']];
    execFileSync(cmd, [...prefix, ...args], { cwd: CLIENT, stdio: 'inherit', shell: process.platform === 'win32' });
}

if (!fs.existsSync(path.join(CLIENT, 'node_modules'))) {
    bun(['install', '--frozen-lockfile']);
}

bun(['run', 'bundle.ts', ...(dev ? ['dev'] : [])]);

fs.mkdirSync(PUBLIC, { recursive: true });
for (const file of ['client.js', 'ondemandworker.js', 'tinymidipcm.wasm']) {
    fs.copyFileSync(path.join(OUT, file), path.join(PUBLIC, file));
}
if (dev) {
    for (const file of ['client.js.map', 'ondemandworker.js.map']) {
        fs.copyFileSync(path.join(OUT, file), path.join(PUBLIC, file));
    }
}

console.log(`Installed the web client in ${path.relative(ROOT, PUBLIC)}`);
