import VarBitType from '#/config/VarBitType.js';

// Allstar-City: client varps for 377 multilocs and multinpcs, which pick their variant from a varbit or
// (new in 377) a whole varp. The client points `vars` at its varp array when it starts.
export default class VarProvider {
    static vars: number[] = [];

    private static readonly masks: Int32Array = (() => {
        const masks = new Int32Array(32);
        let n = 2;
        for (let bit = 0; bit < 32; bit++) {
            masks[bit] = n - 1;
            n += n;
        }
        return masks;
    })();

    // the variant index selected by a varbit (preferred) or varp, -1 when neither is set
    static getMultiIndex(varbit: number, varp: number): number {
        if (varbit !== -1) {
            const type = VarBitType.list[varbit];
            if (!type) {
                return -1;
            }
            const mask = VarProvider.masks[type.endbit - type.startbit];
            return ((VarProvider.vars[type.basevar] ?? 0) >> type.startbit) & mask;
        } else if (varp !== -1) {
            return VarProvider.vars[varp] ?? 0;
        }
        return -1;
    }
}
