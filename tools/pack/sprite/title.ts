import fs from 'fs';

import FileStream from '#/io/FileStream.js';
import { convertImage } from '#tools/pack/PixPack.js';
import Packet from '#/io/Packet.js';
import Environment from '#/util/Environment.js';
import Jagfile from '#/io/Jagfile.js';
import { shouldBuildFile, shouldBuildFileAny } from '#tools/pack/PackFile.js';

export async function packClientTitle(cache: FileStream) {
    const rebuild =
        shouldBuildFileAny(`${Environment.BUILD_SRC_DIR}/title`, 'data/pack/client/title') ||
        shouldBuildFileAny(`${Environment.BUILD_SRC_DIR}/fonts`, 'data/pack/client/title') ||
        shouldBuildFile(`${Environment.BUILD_SRC_DIR}/binary/title.jpg`, 'data/pack/client/title') ||
        shouldBuildFileAny('tools/pack/sprite', 'data/pack/client/title') ||
        shouldBuildFile('tools/pack/PixPack.ts', 'data/pack/client/title');

    if (!rebuild && cache.has(0, 1)) {
        return;
    }

    if (rebuild) {
        const index = Packet.alloc(3);
        const p11 = await convertImage(index, `${Environment.BUILD_SRC_DIR}/fonts`, 'p11_full');
        const p12 = await convertImage(index, `${Environment.BUILD_SRC_DIR}/fonts`, 'p12_full');
        const b12 = await convertImage(index, `${Environment.BUILD_SRC_DIR}/fonts`, 'b12_full');
        const q8 = await convertImage(index, `${Environment.BUILD_SRC_DIR}/fonts`, 'q8_full');
        const logo = await convertImage(index, `${Environment.BUILD_SRC_DIR}/title`, 'logo');
        const titlebox = await convertImage(index, `${Environment.BUILD_SRC_DIR}/title`, 'titlebox');
        const titlebutton = await convertImage(index, `${Environment.BUILD_SRC_DIR}/title`, 'titlebutton');
        const runes = await convertImage(index, `${Environment.BUILD_SRC_DIR}/title`, 'runes');

        const title = Jagfile.new();
        title.write('p11_full.dat', p11);
        title.write('p12_full.dat', p12);
        title.write('b12_full.dat', b12);
        title.write('q8_full.dat', q8);
        title.write('logo.dat', logo);
        title.write('title.dat', Packet.load(`${Environment.BUILD_SRC_DIR}/binary/title.jpg`, true));
        title.write('titlebox.dat', titlebox);
        title.write('titlebutton.dat', titlebutton);
        title.write('runes.dat', runes);
        title.write('index.dat', index);
        title.save('data/pack/client/title');
    }

    const packed = fs.readFileSync('data/pack/client/title');
    if (Environment.BUILD_VERIFY && !Packet.checkcrc(packed, 0, packed.length, -1794511643)) {
        throw new Error('title checksum mismatch!\nYou can disable this safety check by setting BUILD_VERIFY=false');
    }

    cache.write(0, 1, packed);
}
