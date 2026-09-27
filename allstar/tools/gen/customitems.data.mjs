// What Allstar-Scape's client showed for every custom item id (>= 7956) the game uses.
//
// Allstar-Scape's client appended RS2 2007/08 items to the 317 cache; item.cfg only supplied the
// server side (bonuses, price, slot, requirements). Here each id gets the real RuneScape name and
// examine of the item it represents (allstar/spec/custom_items.md §0/§2/§3), and `osrs`, the id of
// the same item in the Dec 2021 OSRS cache, whose models/icon/recolours allstar/tools/models/convert.mjs
// ports to the 377 client. Everything else (bonuses, price, slot, requirements, animations) is read
// from allstar/legacy by allstar/tools/gen/customitems.mjs.
//
// Names and examines: OSRS cache names and OSRS wiki examines, reverted where the wiki records a
// post-2007 rename (RS2 2007/08 names were e.g. "Amulet of glory" for the trimmed glory,
// "Zamorak d'hide", "Runecrafting hood", "Armadyl plateskirt").
//
// Optional fields:
//   op            wear option label (iop2); iop1 sets the first option
//   looks         stand-in: take the visuals of this OSRS item instead (no model of the real item)
//   recol         [[fromHsl16, toHsl16], ...] replacing the OSRS recolours (stand-ins)
//   norecol       drop the OSRS recolours (an OSRS-era graphical change)
//   womanwear     'manwear': RS2 2007/08 used the male model for women; OSRS later added a female
//                 model (ids >= 29000 are OSRS additions). womanwearOff is the RS2 offset.
//   cfgOnly       not an item Allstar-Scape could hand out (kept for shop/::pickup references)
//   note          provenance for the report
export const CUSTOM_ITEMS = [
    { id: 9540, looks: 8013, name: 'Home teletab', desc: 'A teleport to home.', iop1: 'Break', note: 'Allstar client item "Home Teletab (Silabs)" (client.java CheckForSkillUse3); look and examine unknown, stand-in: Teleport to house tablet' },
    { id: 10717, osrs: 9760, name: 'Prayer cape(t)', desc: 'The cape worn by the most pious of heroes.', op: 'Wear', note: 'pack-1 id of Prayer cape(t); item.cfg puts it in the weapon slot' },
    { id: 10718, osrs: 9761, name: 'Prayer hood', desc: 'Prayer skillcape hood.', op: 'Wear', note: 'pack-1 id of Prayer hood; weapon slot' },
    { id: 11138, osrs: 10338, name: '3rd age robe top', desc: 'Fabulously ancient mage protection enchanted in the 3rd Age.', op: 'Wear', note: 'pack-1 id of 3rd age robe top; weapon slot' },
    { id: 11139, osrs: 10340, name: '3rd age robe', desc: 'Fabulously ancient mage protection enchanted in the 3rd Age.', op: 'Wear', note: 'pack-1 id of 3rd age robe; weapon slot' },
    { id: 11192, osrs: 10446, name: 'Saradomin cloak', desc: 'A Saradomin cloak.', op: 'Wear', note: 'pack-1 id of the Saradomin cloak (14561); dark beasts drop this id, undefined in item.cfg (0 bonuses, 1 gp)' },
    { id: 13595, osrs: 8844, name: 'Bronze defender', desc: 'A defensive weapon.', op: 'Wield', womanwear: 'manwear', womanwearOff: 6 },
    { id: 13596, osrs: 8845, name: 'Iron defender', desc: 'A defensive weapon.', op: 'Wield', womanwear: 'manwear', womanwearOff: 6 },
    { id: 13597, osrs: 8846, name: 'Steel defender', desc: 'A defensive weapon.', op: 'Wield', womanwear: 'manwear', womanwearOff: 6 },
    { id: 13598, osrs: 8847, name: 'Black defender', desc: 'A defensive weapon.', op: 'Wield', womanwear: 'manwear', womanwearOff: 6 },
    { id: 13599, osrs: 8848, name: 'Mithril defender', desc: 'A defensive weapon.', op: 'Wield', womanwear: 'manwear', womanwearOff: 6 },
    { id: 13600, osrs: 8849, name: 'Adamant defender', desc: 'A defensive weapon.', op: 'Wield', womanwear: 'manwear', womanwearOff: 6 },
    { id: 13601, osrs: 8850, name: 'Rune defender', desc: 'A defensive weapon.', op: 'Wield', womanwear: 'manwear', womanwearOff: 6 },
    { id: 13640, osrs: 8921, name: 'Black mask', desc: 'An inert-seeming cave horror mask.', op: 'Wear' },
    { id: 14023, osrs: 9678, name: 'Proselyte tasset', desc: "A Proselyte Temple Knight's leg armour.", op: 'Wear' },
    { id: 14073, osrs: 9747, name: 'Attack cape', desc: 'The cape worn by masters of Attack.', op: 'Wear' },
    { id: 14074, osrs: 9748, name: 'Attack cape(t)', desc: 'The cape worn by masters of Attack.', op: 'Wear' },
    { id: 14075, osrs: 9749, name: 'Attack hood', desc: 'Attack skillcape hood.', op: 'Wear' },
    { id: 14076, osrs: 9750, name: 'Strength cape', desc: 'The cape worn by only the strongest people.', op: 'Wear' },
    { id: 14077, osrs: 9751, name: 'Strength cape(t)', desc: 'The cape worn by only the strongest people.', op: 'Wear' },
    { id: 14078, osrs: 9752, name: 'Strength hood', desc: 'Strength skillcape hood.', op: 'Wear' },
    { id: 14079, osrs: 9753, name: 'Defence cape', desc: 'The cape worn by masters of the art of Defence.', op: 'Wear' },
    { id: 14080, osrs: 9754, name: 'Defence cape(t)', desc: 'The cape worn by masters of the art of Defence.', op: 'Wear' },
    { id: 14081, osrs: 9755, name: 'Defence hood', desc: 'Defence skillcape hood.', op: 'Wear' },
    { id: 14082, osrs: 9756, name: 'Ranging cape', desc: 'The cape worn by master archers.', op: 'Wear' },
    { id: 14083, osrs: 9757, name: 'Ranging cape(t)', desc: 'The cape worn by master archers.', op: 'Wear' },
    { id: 14084, osrs: 9758, name: 'Ranging hood', desc: 'Range skillcape hood.', op: 'Wear' },
    { id: 14085, osrs: 9759, name: 'Prayer cape', desc: 'The cape worn by the most pious of heroes.', op: 'Wear' },
    { id: 14086, osrs: 9760, name: 'Prayer cape(t)', desc: 'The cape worn by the most pious of heroes.', op: 'Wear' },
    { id: 14087, osrs: 9761, name: 'Prayer hood', desc: 'Prayer skillcape hood.', op: 'Wear' },
    { id: 14088, osrs: 9762, name: 'Magic cape', desc: 'The cape worn by the most powerful mages.', op: 'Wear' },
    { id: 14089, osrs: 9763, name: 'Magic cape(t)', desc: 'The cape worn by the most powerful mages.', op: 'Wear' },
    { id: 14090, osrs: 9764, name: 'Magic hood', desc: 'Magic skillcape hood.', op: 'Wear' },
    { id: 14091, osrs: 9765, name: 'Runecraft cape', desc: 'The cape worn by master runecrafters.', op: 'Wear' },
    { id: 14092, osrs: 9766, name: 'Runecraft cape(t)', desc: 'The cape worn by master runecrafters.', op: 'Wear' },
    { id: 14093, osrs: 9767, name: 'Runecrafting hood', desc: 'Runecraft skillcape hood.', op: 'Wear', note: 'undefined in item.cfg (0 bonuses, 1 gp) but handed out at 99 Runecrafting and sold in the Hood Shop' },
    { id: 14094, osrs: 9768, name: 'Hitpoints cape', desc: 'The cape worn by the healthiest adventurers.', op: 'Wear', note: 'OSRS graphically updated this cape; no 2007 model available' },
    { id: 14095, osrs: 9769, name: 'Hitpoints cape(t)', desc: 'The cape worn by the healthiest adventurers.', op: 'Wear', note: 'OSRS graphically updated this cape; no 2007 model available' },
    { id: 14096, osrs: 9770, name: 'Hitpoints hood', desc: 'Hitpoints skillcape hood.', op: 'Wear' },
    { id: 14097, osrs: 9771, name: 'Agility cape', desc: 'The cape worn by the most agile of heroes.', op: 'Wear' },
    { id: 14098, osrs: 9772, name: 'Agility cape(t)', desc: 'The cape worn by the most agile of heroes.', op: 'Wear' },
    { id: 14099, osrs: 9773, name: 'Agility hood', desc: 'Agility skillcape hood.', op: 'Wear' },
    { id: 14100, osrs: 9774, name: 'Herblore cape', desc: 'The cape worn by the most skilled at the art of Herblore.', op: 'Wear' },
    { id: 14101, osrs: 9775, name: 'Herblore cape(t)', desc: 'The cape worn by the most skilled at the art of Herblore.', op: 'Wear' },
    { id: 14102, osrs: 9776, name: 'Herblore hood', desc: 'Herblore skillcape hood.', op: 'Wear' },
    { id: 14103, osrs: 9777, name: 'Thieving cape', desc: 'The cape worn by master thieves.', op: 'Wear' },
    { id: 14104, osrs: 9778, name: 'Thieving cape(t)', desc: 'The cape worn by master thieves.', op: 'Wear' },
    { id: 14105, osrs: 9779, name: 'Thieving hood', desc: 'Thieving skillcape hood.', op: 'Wear' },
    { id: 14106, osrs: 9780, name: 'Crafting cape', desc: 'The cape worn by master craftworkers.', op: 'Wear', note: 'item.cfg calls it "Crafting Cape (t)"; the id is the untrimmed cape' },
    { id: 14107, osrs: 9781, name: 'Crafting cape(t)', desc: 'The cape worn by master craftworkers.', op: 'Wear' },
    { id: 14108, osrs: 9782, name: 'Crafting hood', desc: 'Crafting skillcape hood.', op: 'Wear' },
    { id: 14109, osrs: 9783, name: 'Fletching cape', desc: 'The cape worn by the best of fletchers.', op: 'Wear' },
    { id: 14110, osrs: 9784, name: 'Fletching cape(t)', desc: 'The cape worn by the best of fletchers.', op: 'Wear' },
    { id: 14111, osrs: 9785, name: 'Fletching hood', desc: 'Fletching skillcape hood.', op: 'Wear' },
    { id: 14112, osrs: 9786, name: 'Slayer cape', desc: 'The cape worn by Slayer masters.', op: 'Wear' },
    { id: 14113, osrs: 9787, name: 'Slayer cape(t)', desc: 'The cape worn by Slayer masters.', op: 'Wear' },
    { id: 14114, osrs: 9788, name: 'Slayer hood', desc: 'Slayer skillcape hood.', op: 'Wear' },
    { id: 14115, osrs: 9789, name: 'Construct. cape', desc: 'The cape worn by master builders.', op: 'Wear' },
    { id: 14116, osrs: 9790, name: 'Construct. cape(t)', desc: 'The cape worn by master builders.', op: 'Wear' },
    { id: 14117, osrs: 9791, name: 'Construct. hood', desc: 'Construction skillcape hood.', op: 'Wear' },
    { id: 14118, osrs: 9792, name: 'Mining cape', desc: 'The cape worn by the most skilled miners.', op: 'Wear' },
    { id: 14119, osrs: 9793, name: 'Mining cape(t)', desc: 'The cape worn by the most skilled miners.', op: 'Wear' },
    { id: 14120, osrs: 9794, name: 'Mining hood', desc: 'Mining skillcape hood.', op: 'Wear' },
    { id: 14121, osrs: 9795, name: 'Smithing cape', desc: 'The cape worn by master smiths.', op: 'Wear' },
    { id: 14122, osrs: 9796, name: 'Smithing cape(t)', desc: 'The cape worn by master smiths.', op: 'Wear' },
    { id: 14123, osrs: 9797, name: 'Smithing hood', desc: 'Smithing skillcape hood.', op: 'Wear' },
    { id: 14124, osrs: 9798, name: 'Fishing cape', desc: 'The cape worn by the best fishermen.', op: 'Wear' },
    { id: 14125, osrs: 9799, name: 'Fishing cape(t)', desc: 'The cape worn by the best fishermen.', op: 'Wear' },
    { id: 14126, osrs: 9800, name: 'Fishing hood', desc: 'Fishing skillcape hood.', op: 'Wear' },
    { id: 14127, osrs: 9801, name: 'Cooking cape', desc: "The cape worn by the world's best chefs.", op: 'Wear' },
    { id: 14128, osrs: 9802, name: 'Cooking cape(t)', desc: "The cape worn by the world's best chefs.", op: 'Wear' },
    { id: 14129, osrs: 9803, name: 'Cooking hood', desc: 'Cooking skillcape hood.', op: 'Wear' },
    { id: 14130, osrs: 9804, name: 'Firemaking cape', desc: 'The cape worn by master firelighters.', op: 'Wear' },
    { id: 14131, osrs: 9805, name: 'Firemaking cape(t)', desc: 'The cape worn by master firelighters.', op: 'Wear' },
    { id: 14132, osrs: 9806, name: 'Firemaking hood', desc: 'Firemaking skillcape hood.', op: 'Wear' },
    { id: 14133, osrs: 9807, name: 'Woodcutting cape', desc: 'The cape worn by master woodcutters.', op: 'Wear' },
    { id: 14134, osrs: 9808, name: 'Woodcut. cape(t)', desc: 'The cape worn by master woodcutters.', op: 'Wear' },
    { id: 14135, osrs: 9809, name: 'Woodcutting hood', desc: 'Woodcutting skillcape hood.', op: 'Wear' },
    { id: 14136, osrs: 9810, name: 'Farming cape', desc: 'The cape worn by master farmers.', op: 'Wear' },
    { id: 14137, osrs: 9811, name: 'Farming cape(t)', desc: 'The cape worn by master farmers.', op: 'Wear' },
    { id: 14138, osrs: 9812, name: 'Farming hood', desc: 'Farming skillcape hood.', op: 'Wear' },
    { id: 14139, osrs: 9813, name: 'Quest point cape', desc: 'The cape worn by only the most experienced adventurers.', op: 'Wear' },
    { id: 14140, osrs: 9814, name: 'Quest point hood', desc: 'Quest point cape hood.', op: 'Wear' },
    { id: 14503, osrs: 10330, name: '3rd age range top', desc: 'Fabulously ancient range protection crafted from white dragonhide.', op: 'Wear' },
    { id: 14504, osrs: 10332, name: '3rd age range legs', desc: 'Fabulously ancient range protection crafted from white dragonhide.', op: 'Wear' },
    { id: 14505, osrs: 10334, name: '3rd age range coif', desc: 'Fabulously ancient range protection crafted from white dragonhide.', op: 'Wear' },
    { id: 14506, osrs: 10336, name: '3rd age vambraces', desc: 'Fabulously ancient range protection crafted from white dragonhide.', op: 'Wear' },
    { id: 14507, osrs: 10338, name: '3rd age robe top', desc: 'Fabulously ancient mage protection enchanted in the 3rd Age.', op: 'Wear' },
    { id: 14508, osrs: 10340, name: '3rd age robe', desc: 'Fabulously ancient mage protection enchanted in the 3rd Age.', op: 'Wear' },
    { id: 14509, osrs: 10342, name: '3rd age mage hat', desc: 'Fabulously ancient mage protection enchanted in the 3rd Age.', op: 'Wear', note: 'undefined in item.cfg (0 bonuses, 1 gp) but sold in the 3rd Age Shop and dropped by skeleton hellhounds' },
    { id: 14511, osrs: 10346, name: '3rd age platelegs', desc: 'Fabulously ancient armour beaten from magical silver.', op: 'Wear' },
    { id: 14512, osrs: 10348, name: '3rd age platebody', desc: 'Fabulously ancient armour beaten from magical silver.', op: 'Wear' },
    { id: 14513, osrs: 10350, name: '3rd age full helmet', desc: 'Fabulously ancient armour beaten from magical silver.', op: 'Wear' },
    { id: 14514, osrs: 10352, name: '3rd age kiteshield', desc: 'Fabulously ancient armour beaten from magical silver.', op: 'Wield', womanwear: 'manwear', womanwearOff: 6 },
    { id: 14519, osrs: 10362, name: 'Amulet of glory', desc: 'A very powerful dragonstone amulet.', op: 'Wear', note: 'trimmed glory; named "Amulet of glory" until an OSRS-era rename' },
    { id: 14520, osrs: 10364, name: 'Amulet of strength', desc: 'An enchanted ruby amulet.', op: 'Wear', note: 'trimmed strength amulet' },
    { id: 14521, osrs: 10366, name: 'Amulet of magic', desc: 'An enchanted sapphire amulet of magic.', op: 'Wear', note: 'trimmed magic amulet' },
    { id: 14522, osrs: 10368, name: 'Zamorak bracers', desc: 'Zamorak blessed dragonhide vambraces.', op: 'Wear', note: 'OSRS recoloured the bracers; 2007 colours unknown' },
    { id: 14523, osrs: 10370, name: "Zamorak d'hide", desc: 'Zamorak blessed dragonhide body armour.', op: 'Wear' },
    { id: 14524, osrs: 10372, name: 'Zamorak chaps', desc: 'Zamorak blessed dragonhide chaps.', op: 'Wear' },
    { id: 14525, osrs: 10374, name: 'Zamorak coif', desc: 'Zamorak blessed dragonhide coif.', op: 'Wear' },
    { id: 14526, osrs: 10376, name: 'Guthix bracers', desc: 'Guthix blessed dragonhide vambraces.', op: 'Wear', note: 'OSRS recoloured the bracers; 2007 colours unknown' },
    { id: 14527, osrs: 10378, name: 'Guthix dragonhide', desc: 'Guthix blessed dragonhide body armour.', op: 'Wear' },
    { id: 14528, osrs: 10380, name: 'Guthix chaps', desc: 'Guthix blessed dragonhide chaps.', op: 'Wear' },
    { id: 14529, osrs: 10382, name: 'Guthix coif', desc: 'Guthix blessed dragonhide coif.', op: 'Wear' },
    { id: 14530, osrs: 10384, name: 'Saradomin bracers', desc: 'Saradomin blessed dragonhide vambraces.', op: 'Wear', note: 'OSRS recoloured the bracers; 2007 colours unknown' },
    { id: 14531, osrs: 10386, name: "Saradomin d'hide", desc: 'Saradomin blessed dragonhide body armour.', op: 'Wear' },
    { id: 14532, osrs: 10388, name: 'Saradomin chaps', desc: 'Saradomin blessed dragonhide chaps.', op: 'Wear' },
    { id: 14533, osrs: 10390, name: 'Saradomin coif', desc: 'Saradomin blessed dragonhide coif.', op: 'Wear' },
    { id: 14561, osrs: 10446, name: 'Saradomin cloak', desc: 'A Saradomin cloak.', op: 'Wear' },
    { id: 14562, osrs: 10448, name: 'Guthix cloak', desc: 'A Guthix cloak.', op: 'Wear' },
    { id: 14563, osrs: 10450, name: 'Zamorak cloak', desc: 'A Zamorak cloak.', op: 'Wear' },
    { id: 14564, osrs: 10452, name: 'Saradomin mitre', desc: 'A Saradomin mitre.', op: 'Wear' },
    { id: 14565, osrs: 10454, name: 'Guthix mitre', desc: 'A Guthix mitre.', op: 'Wear', note: 'undefined in item.cfg (0 bonuses, 1 gp) but sold in the God Shop' },
    { id: 14566, osrs: 10456, name: 'Zamorak mitre', desc: 'A Zamorak mitre.', op: 'Wear' },
    { id: 14567, osrs: 10458, name: 'Saradomin robe top', desc: 'Saradomin Vestments.', op: 'Wear' },
    { id: 14568, osrs: 10460, name: 'Zamorak robe top', desc: 'Zamorak Vestments.', op: 'Wear' },
    { id: 14569, osrs: 10462, name: 'Guthix robe top', desc: 'Guthix Vestments.', op: 'Wear' },
    { id: 14570, osrs: 10464, name: 'Saradomin robe leg', desc: 'Leggings from the Saradomin Vestments.', op: 'Wear' },
    { id: 14571, osrs: 10466, name: 'Guthix robe legs', desc: 'Leggings from the Guthix Vestments.', op: 'Wear' },
    { id: 14572, osrs: 10468, name: 'Zamorak robe legs', desc: 'Leggings from the Zamorak Vestments.', op: 'Wear' },
    { id: 14575, osrs: 10474, name: 'Zamorak stole', desc: 'A Zamorak stole.', op: 'Wear', note: 'item.cfg calls it "Guthix Mitre" (weapon slot); the client showed the Zamorak stole' },
    { id: 14638, osrs: 10551, name: 'Fighter torso', desc: 'A Penance Fighter torso armour.', op: 'Wear' },
    { id: 14643, osrs: 10556, name: 'Attacker icon', desc: 'An icon.', op: 'Wear', note: 'undefined in item.cfg (its line is typo id 146143); reward for Ice giant key 1543' },
    { id: 14644, osrs: 10557, name: 'Collector icon', desc: 'An icon.', op: 'Wear', note: 'undefined in item.cfg (typo id 146144); reward for key 1545' },
    { id: 14645, osrs: 10558, name: 'Defender icon', desc: 'An icon.', op: 'Wear', note: 'undefined in item.cfg (typo id 146145); reward for key 1546' },
    { id: 14646, osrs: 10559, name: 'Healer icon', desc: 'An icon.', op: 'Wear', note: 'undefined in item.cfg (typo id 146146); reward for key 1548' },
    { id: 14724, osrs: 9948, name: 'Hunter cape', desc: 'The cape worn by master hunters.', op: 'Wear', note: 'low-confidence identification (OSRS-nulled RS2 range); item.cfg "Hunter Cape"' },
    { id: 14819, looks: 405, name: '!! NOT EXISTING ITEM !!! - ID:14819', desc: null, cfgOnly: true, note: 'unidentified; only in the Mod & Admin shop (no NPC opens it); server name, stand-in model (casket)' },
    { id: 14860, osrs: 10828, name: 'Helm of neitiznot', desc: "A gift from Neitiznot's Burgher.", op: 'Wear' },
    { id: 14868, osrs: 10836, name: 'Jester hat', desc: 'A silly hat with bells.', op: 'Wear', cfgOnly: true, note: 'only in the Mod & Admin shop (no NPC opens it)' },
    { id: 14869, osrs: 10837, name: 'Jester top', desc: "A jester's jangly top.", op: 'Wear', cfgOnly: true, note: 'only in the Mod & Admin shop' },
    { id: 14870, osrs: 10838, name: 'Jester tights', desc: 'Silly jester tights.', op: 'Wear', cfgOnly: true, note: 'only in the Mod & Admin shop' },
    { id: 14915, osrs: 10887, name: 'Barrelchest anchor', desc: 'This is likely to put my back out...', op: 'Wield' },
    { id: 15145, osrs: 11212, name: 'Dragon arrow', desc: "An arrow made using a dragon's talon.", op: 'Wield' },
    { id: 15156, osrs: 11235, name: 'Dark bow', desc: 'A bow from a darker dimension.', op: 'Wield' },
    { id: 15181, looks: 11280, name: '!! NOT EXISTING ITEM !!! - ID:15181', desc: null, cfgOnly: true, note: 'unidentified mask-like RS2 item (11274-11278, nulled in OSRS); only in the Mod & Admin shop; server name, stand-in model (Cavalier mask)' },
    { id: 15183, osrs: 11280, name: 'Cavalier mask', desc: "I hope I don't meet any roundheads...", op: 'Wear', cfgOnly: true, note: 'only in the Mod & Admin shop' },
    { id: 15185, osrs: 11283, name: 'Dragonfire shield', desc: 'A heavy shield with a snarling, draconic visage.', op: 'Wield' },
    { id: 15195, osrs: 11335, name: 'Dragon full helm', desc: 'Protects your head and looks impressive too.', op: 'Wear', norecol: true, note: 'OSRS recoloured the spikes grey -> white; the OSRS recolour is dropped' },
    { id: 15333, osrs: 11802, name: 'Armadyl godsword', desc: 'A beautiful, heavy sword.', op: 'Wield', womanwear: 'manwear', womanwearOff: 5 },
    { id: 15334, osrs: 11804, name: 'Bandos godsword', desc: 'A brutally heavy sword.', op: 'Wield', womanwear: 'manwear', womanwearOff: 5 },
    { id: 15335, osrs: 11806, name: 'Saradomin godsword', desc: 'A gracious, heavy sword.', op: 'Wield', womanwear: 'manwear', womanwearOff: 5 },
    { id: 15336, osrs: 11808, name: 'Zamorak godsword', desc: 'A terrifying, heavy sword.', op: 'Wield', womanwear: 'manwear', womanwearOff: 5 },
    { id: 15345, osrs: 11826, name: 'Armadyl helmet', desc: 'A helmet of great craftsmanship.', op: 'Wear', note: 'OSRS remade the female model' },
    { id: 15346, osrs: 11828, name: 'Armadyl chestplate', desc: 'Armour of great craftsmanship.', op: 'Wear', note: 'OSRS updated the worn model' },
    { id: 15347, osrs: 11830, name: 'Armadyl plateskirt', desc: 'A plateskirt of great craftsmanship.', op: 'Wear', note: 'OSRS name "Armadyl chainskirt" (renamed Aug 2010); OSRS updated the worn model' },
    { id: 15348, osrs: 11832, name: 'Bandos chestplate', desc: 'A sturdy chestplate.', op: 'Wear' },
    { id: 15349, osrs: 11834, name: 'Bandos tassets', desc: 'A sturdy pair of tassets.', op: 'Wear' },
    { id: 15350, osrs: 11836, name: 'Bandos boots', desc: 'Some sturdy boots.', op: 'Wear' },
    { id: 15352, osrs: 11840, name: 'Dragon boots', desc: 'These will protect my feet.', op: 'Wear' },
    // Summoning (RS2 12169-12171, 2008) never existed in OSRS: hunter cape/hood models recoloured.
    { id: 15713, looks: 9948, name: 'Summoning cape', desc: 'The cape worn by masters of Summoning.', op: 'Wear', recol: 'summoning', note: 'RS2 12169; no model available, stand-in: Hunter cape model recoloured blue/white' },
    { id: 15714, looks: 9949, name: 'Summoning cape(t)', desc: 'The cape worn by masters of Summoning.', op: 'Wear', recol: 'summoning_t', note: 'RS2 12170; stand-in: Hunter cape(t) model recoloured' },
    { id: 15715, looks: 9950, name: 'Summoning hood', desc: 'Summoning skillcape hood.', op: 'Wear', recol: 'summoning_hood', note: 'RS2 12171; the shared skillcape hood model recoloured (colours approximate)' }
];

// Stand-in recolours, [from, to] in HSL16. Hunter cape model colours: body 5388/8478/8598/5268,
// emblem 6348/6336/8487, dark detail 6020; placeholders 57280/54183/54503 (trim, lining) and
// 960/22464/43968 (hood). Summoning palette (approximate): pale blue body, blue emblem and trim.
const hsl = (h, s, l) => (h << 10) | (s << 7) | l;
const SUMMONING_BODY = [
    [5388, hsl(36, 3, 85)], [8478, hsl(36, 3, 95)], [8598, hsl(36, 3, 72)], [5268, hsl(36, 3, 60)],
    [6348, hsl(42, 6, 45)], [6336, hsl(42, 6, 35)], [8487, hsl(36, 2, 105)], [6020, hsl(42, 7, 12)]
];
export const STANDIN_RECOLOURS = {
    summoning: [...SUMMONING_BODY, [57280, hsl(36, 3, 95)], [54183, hsl(36, 3, 85)], [54503, hsl(36, 2, 100)]],
    summoning_t: [...SUMMONING_BODY, [57280, hsl(42, 6, 30)], [54183, hsl(42, 6, 24)], [54503, hsl(36, 2, 100)]],
    summoning_hood: [[960, hsl(36, 3, 95)], [22464, hsl(36, 3, 85)], [43968, hsl(36, 3, 72)]]
};

// Pack-1 ids (an older copy of the same RS2 items; custom_items.md §0.3/§3) that code references,
// mapped to the pack-2 item they duplicate. Only ids whose twin exists here are listed.
export const PACK1_ALIASES = {
    10228: 13597, 10229: 13598, 10230: 13599, 10231: 13600, 10232: 13601, // defenders
    10271: 13640, // Black mask
    10704: 14073, 10705: 14074, 10706: 14075, 10707: 14076, 10709: 14078, 10712: 14081, 10713: 14082,
    10715: 14084, 10721: 14090, 10724: 14093, 10727: 14096, 10730: 14099, 10733: 14102, 10736: 14105,
    10739: 14108, 10742: 14111, 10745: 14114, 10748: 14117, 10751: 14120, 10754: 14123, 10757: 14126,
    10760: 14129, 10763: 14132, 10766: 14135, 10769: 14138, 10771: 14140, // capes and hoods
    11134: 14503, 11135: 14504, 11136: 14505, 11137: 14506, 11140: 14509, 11143: 14512, 11145: 14514, // 3rd age
    11153: 14522, 11154: 14523, 11155: 14524, 11156: 14525, 11157: 14526, 11158: 14527, 11159: 14528,
    11160: 14529, 11161: 14530, 11162: 14531, 11163: 14532, 11164: 14533, // god d'hide
    11193: 14562, 11194: 14563, // god cloaks (11192, the dark beast drop, is an item of its own)
    11198: 14567, 11199: 14568, 11200: 14569, 11201: 14570, 11202: 14571, 11203: 14572, // god robes
    11268: 14638, 11490: 14860, 11785: 15156, 11814: 15185, 11824: 15195,
    11977: 15348, 11978: 15349, 11979: 15350, 11981: 15352
};
