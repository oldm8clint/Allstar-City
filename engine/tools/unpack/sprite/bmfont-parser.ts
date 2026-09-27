export interface BMFontInfo {
    face: string;
    size: number;
    bold: boolean;
    italic: boolean;
    charset: string;
    unicode: boolean;
    stretchH: number;
    smooth: boolean;
    aa: number;
    padding: [number, number, number, number];
    spacing: [number, number];
    outline: number;
}

export interface BMFontCommon {
    lineHeight: number;
    base: number;
    scaleW: number;
    scaleH: number;
    pages: number;
    packed: boolean;
    alphaChnl: number;
    redChnl: number;
    greenChnl: number;
    blueChnl: number;
}

export interface BMFontPage {
    id: number;
    file: string;
}

export interface BMFontChar {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    xoffset: number;
    yoffset: number;
    xadvance: number;
    page: number;
    chnl: number;
}

export interface BMFontKerning {
    first: number;
    second: number;
    amount: number;
}

export interface BMFont {
    info: BMFontInfo;
    common: BMFontCommon;
    pages: BMFontPage[];
    chars: Map<number, BMFontChar>;
    kernings: BMFontKerning[];
}

export function parseBMFont(data: string): BMFont {
    const lines = data.split(/\r?\n/);

    let info: BMFontInfo | null = null;
    let common: BMFontCommon | null = null;
    const pages: BMFontPage[] = [];
    const chars: Map<number, BMFontChar> = new Map();
    const kernings: BMFontKerning[] = [];

    const parseKeyValue = (line: string): Record<string, string> => {
        const regex = /(\w+)=("[^"]*"|\S+)/g;
        const result: Record<string, string> = {};
        let match;
        while ((match = regex.exec(line)) !== null) {
            const key = match[1];
            let value = match[2];
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            result[key] = value;
        }
        return result;
    };

    for (const line of lines) {
        if (!line.trim()) {
            continue;
        }

        if (line.startsWith('info ')) {
            const kv = parseKeyValue(line);
            info = {
                face: kv.face,
                size: Number(kv.size),
                bold: kv.bold === '1',
                italic: kv.italic === '1',
                charset: kv.charset,
                unicode: kv.unicode === '1',
                stretchH: Number(kv.stretchH),
                smooth: kv.smooth === '1',
                aa: Number(kv.aa),
                padding: kv.padding.split(',').map(Number) as [number, number, number, number],
                spacing: kv.spacing.split(',').map(Number) as [number, number],
                outline: Number(kv.outline)
            };
        } else if (line.startsWith('common ')) {
            const kv = parseKeyValue(line);
            common = {
                lineHeight: Number(kv.lineHeight),
                base: Number(kv.base),
                scaleW: Number(kv.scaleW),
                scaleH: Number(kv.scaleH),
                pages: Number(kv.pages),
                packed: kv.packed === '1',
                alphaChnl: Number(kv.alphaChnl),
                redChnl: Number(kv.redChnl),
                greenChnl: Number(kv.greenChnl),
                blueChnl: Number(kv.blueChnl),
            };
        } else if (line.startsWith('page ')) {
            const kv = parseKeyValue(line);
            pages.push({
                id: Number(kv.id),
                file: kv.file,
            });
        } else if (line.startsWith('char ')) {
            const kv = parseKeyValue(line);
            const char: BMFontChar = {
                id: Number(kv.id),
                x: Number(kv.x),
                y: Number(kv.y),
                width: Number(kv.width),
                height: Number(kv.height),
                xoffset: Number(kv.xoffset),
                yoffset: Number(kv.yoffset),
                xadvance: Number(kv.xadvance),
                page: Number(kv.page),
                chnl: Number(kv.chnl),
            };
            chars.set(char.id, char);
        } else if (line.startsWith('kerning ')) {
            const kv = parseKeyValue(line);
            kernings.push({
                first: Number(kv.first),
                second: Number(kv.second),
                amount: Number(kv.amount),
            });
        }
    }

    if (!info || !common) {
        throw new Error('Invalid BMFont file: missing info or common section');
    }

    return {
        info,
        common,
        pages,
        chars,
        kernings,
    };
}
