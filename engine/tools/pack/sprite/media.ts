import fs from 'fs';
import path from 'path';

import FileStream from '#/io/FileStream.js';
import { listFilesExt } from '#tools/pack/Parse.js';
import Environment from '#/util/Environment.js';
import Jagfile from '#/io/Jagfile.js';
import Packet from '#/io/Packet.js';
import { convertImage } from '#tools/pack/PixPack.js';
import { fileExists } from '#tools/pack/FsCache.js';
import { shouldBuildFile, shouldBuildFileAny } from '#tools/pack/PackFile.js';

// Where the 289 content cuts the game frame pieces out of sprites/back.png (used by the 289 unpacker).
// Allstar-City packs the 377 content, which keeps every piece (backbase1.png, ...) as its own sprite.
export const BACK_PIECES = [
    ['backbase1', 0, 453, 496, 50],
    ['backbase2', 496, 466, 269, 37],
    ['backhmid1', 516, 160, 249, 45],
    ['backhmid2', 0, 338, 553, 19],
    ['backleft1', 0, 4, 4, 334],
    ['backleft2', 0, 357, 17, 96],
    ['backright1', 722, 4, 43, 156],
    ['backright2', 743, 205, 22, 261],
    ['backtop1', 0, 0, 765, 4],
    ['backvmid1', 516, 4, 34, 156],
    ['backvmid2', 516, 205, 37, 133],
    ['backvmid3', 496, 357, 57, 109]
] as const;

// 377 media packing: every sprites/*.png becomes <name>.dat
export async function packClientMedia(cache: FileStream) {
    const rebuild = shouldBuildFileAny(`${Environment.build.srcDir}/sprites`, 'data/pack/client/media') || shouldBuildFileAny('tools/pack/sprite', 'data/pack/client/media') || shouldBuildFile('tools/pack/PixPack.ts', 'data/pack/client/media');

    if (!rebuild && cache.has(0, 4)) {
        return;
    }

    if (rebuild) {
        const index = Packet.alloc(3);

        const sprites = listFilesExt(`${Environment.build.srcDir}/sprites`, '.png');

        // organize spritesheets to be last (to help with over-reads)
        sprites.sort((a, b) => {
            const aExists = fileExists(`${Environment.build.srcDir}/sprites/meta/${path.basename(a, path.extname(a))}.opt`);
            const bExists = fileExists(`${Environment.build.srcDir}/sprites/meta/${path.basename(b, path.extname(b))}.opt`);
            return aExists === bExists ? 0 : aExists && !bExists ? 1 : -1;
        });

        const all = new Map();
        for (const name of sprites) {
            const safeName = path.basename(name, path.extname(name));
            all.set(safeName, await convertImage(index, `${Environment.build.srcDir}/sprites`, safeName));
        }

        const media = Jagfile.new();
        media.write('index.dat', index);
        for (const [name, sprite] of all) {
            media.write(`${name}.dat`, sprite);
        }
        media.save('data/pack/client/media');
    }

    cache.write(0, 4, fs.readFileSync('data/pack/client/media'));
}
