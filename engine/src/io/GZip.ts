import zlib from 'zlib';

function compressGz(
    src: Uint8Array,
    off: number = 0,
    len: number = src.length,
): Uint8Array | null {
    try {
        const data = new Uint8Array(
            zlib.gzipSync(src.subarray(off, off + len)),
        );
        data[9] = 0;
        return data;
    } catch (err) {
        console.error(err);
        return null;
    }
}

function decompressGz(
    src: Uint8Array,
    off: number = 0,
    len: number = src.length,
): Uint8Array | null {
    try {
        return new Uint8Array(zlib.gunzipSync(src.subarray(off, off + len)));
    } catch (err) {
        console.error(err);
        return null;
    }
}

export { compressGz, decompressGz };
