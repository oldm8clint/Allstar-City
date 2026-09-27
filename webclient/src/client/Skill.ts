export default class Skill {
    static readonly count: number = 25;
    // Allstar-City: 377 skills (slayer and farming)
    static readonly names: string[] = ['attack', 'defence', 'strength', 'hitpoints', 'ranged', 'prayer', 'magic', 'cooking', 'woodcutting', 'fletching', 'fishing', 'firemaking', 'crafting', 'smithing', 'mining', 'herblore', 'agility', 'thieving', 'slayer', 'farming', 'runecraft', '-unused-', '-unused-', '-unused-', '-unused-'];
    static readonly used: boolean[] = [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, false, false, false, false];
}
