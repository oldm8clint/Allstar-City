// Colour helpers. Models and OSRS obj recolours use Jagex HSL16 (6-bit hue, 3-bit saturation,
// 7-bit lightness). Lost City obj configs write recolours as RGB15 and the packer converts them
// with ColorConversion.rgb15toHsl16 (engine/src/util/ColorConversion.ts, ported below); a pair is
// only passed through raw when both values are below 100. Only some HSL16 values are reachable
// from RGB15, so the converter picks reachable colours and remaps model faces where needed.

function hsl24to16(hue, saturation, lightness) {
    if (lightness > 243) saturation >>= 4;
    else if (lightness > 217) saturation >>= 3;
    else if (lightness > 192) saturation >>= 2;
    else if (lightness > 179) saturation >>= 1;
    return (((hue & 0xff) >> 2) << 10) + ((saturation >> 5) << 7) + (lightness >> 1);
}

function rgbToHsl(red, green, blue) {
    const min = Math.min(red, green, blue);
    const max = Math.max(red, green, blue);
    let h = 0;
    let s = 0;
    const l = (min + max) / 2;
    if (min !== max) {
        s = l < 0.5 ? (max - min) / (max + min) : (max - min) / (2 - max - min);
        if (red === max) h = (green - blue) / (max - min);
        else if (green === max) h = (blue - red) / (max - min) + 2;
        else h = (red - green) / (max - min) + 4;
    }
    h /= 6;
    const hue = (h * 256) | 0;
    const saturation = Math.max(0, Math.min(255, (s * 256) | 0));
    const lightness = Math.max(0, Math.min(255, (l * 256) | 0));
    return hsl24to16(hue, saturation, lightness);
}

export function rgb15toHsl16(rgb) {
    return rgbToHsl(((rgb >> 10) & 0x1f) / 31, ((rgb >> 5) & 0x1f) / 31, (rgb & 0x1f) / 31);
}

// HSL16 -> RGB24 as the client palette computes it (Pix3D colour table, before brightness).
export function hsl16toRgb(hsl) {
    const hue = ((hsl >> 10) & 63) / 64 + 0.0078125;
    const sat = ((hsl >> 7) & 7) / 8 + 0.0625;
    const light = (hsl & 127) / 128;
    let r = light;
    let g = light;
    let b = light;
    if (sat !== 0) {
        const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
        const p = 2 * light - q;
        const channel = t => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (6 * t < 1) return p + (q - p) * 6 * t;
            if (2 * t < 1) return q;
            if (3 * t < 2) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        r = channel(hue + 1 / 3);
        g = channel(hue);
        b = channel(hue - 1 / 3);
    }
    return [Math.min(255, (r * 256) | 0), Math.min(255, (g * 256) | 0), Math.min(255, (b * 256) | 0)];
}

// hsl16 -> list of rgb15 values the packer converts to exactly that colour
const REVERSE = new Map();
for (let rgb = 0; rgb < 32768; rgb++) {
    const hsl = rgb15toHsl16(rgb);
    if (!REVERSE.has(hsl)) REVERSE.set(hsl, []);
    REVERSE.get(hsl).push(rgb);
}
export const REACHABLE = [...REVERSE.keys()].sort((a, b) => a - b);

export function isReachable(hsl) {
    return REVERSE.has(hsl);
}

// An rgb15 spelling of a reachable hsl16 colour; >= 100 when possible so the packer converts it.
export function toRgb15(hsl) {
    const list = REVERSE.get(hsl);
    if (!list) return null;
    return list.find(v => v >= 100) ?? list[0];
}

export function colourDistance(a, b) {
    const x = hsl16toRgb(a);
    const y = hsl16toRgb(b);
    return (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2;
}

// Nearest reachable colour to hsl, skipping any in `avoid`.
export function nearestReachable(hsl, avoid = new Set()) {
    if (isReachable(hsl) && !avoid.has(hsl)) return hsl;
    let best = -1;
    let bestDist = Infinity;
    for (const c of REACHABLE) {
        if (avoid.has(c)) continue;
        const d = colourDistance(hsl, c);
        if (d < bestDist) {
            bestDist = d;
            best = c;
        }
    }
    return best;
}
