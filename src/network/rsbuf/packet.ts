export class Packet {
    readonly data: Uint8Array;
    private readonly view: DataView;

    pos = 0;
    bitPos = 0;

    constructor(length: number) {
        this.data = new Uint8Array(length);
        this.view = new DataView(this.data.buffer, this.data.byteOffset, this.data.byteLength);
    }

    get len(): number {
        return this.data.length;
    }

    p1(value: number): void {
        this.data[this.pos++] = value & 0xff;
    }

    p2(value: number): void {
        this.view.setUint16(this.pos, value & 0xffff);
        this.pos += 2;
    }

    ip2(value: number): void {
        this.view.setUint16(this.pos, value & 0xffff, true);
        this.pos += 2;
    }

    p4(value: number): void {
        this.view.setInt32(this.pos, value | 0);
        this.pos += 4;
    }

    pjstr(value: string, terminator: number): void {
        for (let index = 0; index < value.length; index++) {
            this.data[this.pos++] = value.charCodeAt(index) & 0xff;
        }
        this.data[this.pos++] = terminator & 0xff;
    }

    pdata(src: Uint8Array, offset: number, length: number): void {
        this.data.set(src.subarray(offset, offset + length), this.pos);
        this.pos += length;
    }

    bits(): void {
        this.bitPos = this.pos << 3;
    }

    bytes(): void {
        this.pos = (this.bitPos + 7) >> 3;
    }

    pbit(n: number, value: number): void {
        const pos = this.bitPos;
        this.bitPos += n;

        let bytePos = pos >> 3;
        let remaining = 8 - (pos & 7);

        while (n > remaining) {
            const shift = (1 << remaining) - 1;
            const byte = this.data[bytePos];
            this.data[bytePos++] = ((byte & ~shift) | ((value >> (n - remaining)) & shift)) & 0xff;
            n -= remaining;
            remaining = 8;
        }

        const r = remaining - n;
        const shift = (1 << n) - 1;
        const byte = this.data[bytePos];
        this.data[bytePos] = ((byte & (~shift << r)) | ((value & shift) << r)) & 0xff;
    }

    p1_alt1(v: number): void {
        this.data[this.pos++] = (v + 128) & 0xff;
    }

    p1_alt2(v: number): void {
        this.data[this.pos++] = (0 - v) & 0xff;
    }

    p1_alt3(v: number): void {
        this.data[this.pos++] = (128 - v) & 0xff;
    }

    p2_alt1(v: number): void {
        this.data[this.pos++] = v & 0xff;
        this.data[this.pos++] = (v >> 8) & 0xff;
    }

    p2_alt2(v: number): void {
        this.data[this.pos++] = (v >> 8) & 0xff;
        this.data[this.pos++] = (v + 128) & 0xff;
    }

    p2_alt3(v: number): void {
        this.data[this.pos++] = (v + 128) & 0xff;
        this.data[this.pos++] = (v >> 8) & 0xff;
    }

    p3_alt1(v: number): void {
        this.data[this.pos++] = v & 0xff;
        this.data[this.pos++] = (v >> 8) & 0xff;
        this.data[this.pos++] = (v >> 16) & 0xff;
    }

    p3_alt2(v: number): void {
        this.data[this.pos++] = (v >> 16) & 0xff;
        this.data[this.pos++] = v & 0xff;
        this.data[this.pos++] = (v >> 8) & 0xff;
    }

    p3_alt3(v: number): void {
        this.data[this.pos++] = (v >> 8) & 0xff;
        this.data[this.pos++] = (v >> 16) & 0xff;
        this.data[this.pos++] = v & 0xff;
    }

    p4_alt1(v: number): void {
        this.data[this.pos++] = v & 255;
        this.data[this.pos++] = (v >> 8) & 255;
        this.data[this.pos++] = (v >> 16) & 255;
        this.data[this.pos++] = (v >> 24) & 255;
    }

    p4_alt2(v: number): void {
        this.data[this.pos++] = (v >> 8) & 255;
        this.data[this.pos++] = v & 255;
        this.data[this.pos++] = (v >> 24) & 255;
        this.data[this.pos++] = (v >> 16) & 255;
    }

    p4_alt3(v: number): void {
        this.data[this.pos++] = (v >> 16) & 255;
        this.data[this.pos++] = (v >> 24) & 255;
        this.data[this.pos++] = v & 255;
        this.data[this.pos++] = (v >> 8) & 255;
    }

    pdata_alt1(src: Uint8Array, off: number, len: number): void {
        for (let i = off + len - 1; i >= off; i--) {
            this.data[this.pos++] = src[i];
        }
    }

    pdata_alt2(src: Uint8Array, off: number, len: number): void {
        for (let i = off; i < off + len; i++) {
            this.data[this.pos++] = (src[i] + 128) & 0xff;
        }
    }

    pdata_alt3(src: Uint8Array, off: number, len: number): void {
        for (let i = off + len - 1; i >= off; i--) {
            this.data[this.pos++] = (src[i] + 128) & 0xff;
        }
    }
}
