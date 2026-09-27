// Allstar-Scape wrote its text scrolls to 317 interface 8134. The 377 equivalent is questjournal:
// line 0 is com_4, lines 1-99 are com_6-com_104 (8145 -> 0, 8147-8195 -> 1-49, 12174-12223 -> 50-99).
export default function scroll({ writeGenerated }) {
    const lines = ['[allstar_scroll_lines]', 'inputtype=int', 'outputtype=component', 'val=0,questjournal:com_4'];
    for (let line = 1; line <= 99; line++) {
        lines.push(`val=${line},questjournal:com_${line + 5}`);
    }
    writeGenerated('configs/scroll.enum', lines);
}
