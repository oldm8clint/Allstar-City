# Allstar-Scape v2 — custom items and item behaviour (saved from items agent hand-back)

Data files (same folder): allstar_items.csv (7,975 rows, every id with behaviour columns), custom_items.csv (145 lines id>=7956 incl. OSRS model ids), custom_refs_undefined.csv (299 undefined ids >=7956 used by code/shops), nonauthentic_0_7955.csv. Local OSRS cache: C:\Users\clint\jagexcache\oldschool\LIVE (Dec-2021), decoded JSON in scratchpad\work\.

## 0. Headlines
1. Server loads ROOT item.cfg (7,680 lines, 7,676 ids, read to EOF). data\item.cfg is an unused older copy (5 malformed lines 1297,1327,4125,6605,6609).
2. 145 lines id>=7956 = 143 ids (14121, 14124 defined twice). 146143-146146 are typos for 14643-14646 (BA icons). All custom ids are stock RS 2007/08 items; genuinely custom = renames/buffs in 0-7955.
3. Missing client appended RS2 2007/08 item table twice:
   - Pack 2 (used by item.cfg/shops/drops): 13595 = Bronze defender (RS 8844); 14073-14140 skillcapes (RS 9747-9814); 14503-14514 3rd age; 15333-15336 godswords; 15352 Dragon boots (RS 11732); 15713-15715 Summoning cape set (RS 12169-12171).
   - Pack 1 (older, used by Item4 lists & level req tables): pack1 = pack2 - 3369 (drifting -3370/-3371). 10226-10232 defenders, 10261-10271 black masks, 10704-10771 capes/hoods, 11134-11145 3rd age, 11153-11164 god d'hide, 11169-11188 elegant, 11490 neitiznot, 11785 dark bow, 11814 DFS, 11824 d full helm, 11938-11941 void helms/seal, 11977-11981 bandos + d boots. item.cfg contains pack-1 ids 10717, 10718, 11138, 11139.
4. item.cfg names/descs server-side only (in-game names/examine/models came from client cache). Server uses names for name-based wear reqs, weapon tab title/interface (SendWeapon), shop messages; desc only to detect notes ("Swap this note…"). Port: real RS name/examine/model, Allstar bonuses/prices/reqs/slots/combat.
5. .dat flags cover ids 0-6799 only; custom items: not stackable (dragon arrows 15145 incl.), not note, not notable, not 2h by .dat, unsellable unless in itemSellable override list.

## 1. item.cfg reading
`item = id name desc col3 col4 col5 b0..b11 [extra]`; tab runs collapsed, `_`->space, trailing spaces kept.
- col3 never read. col4 = shop value & low alch base: buy = sell = high alch = floor(col4); low alch = floor(col4)/5. col6 (=b0) loader bug (high alch never used).
- b0-b11: atk stab, slash, crush, magic, range; def stab, slash, crush, magic, range; strength; prayer. Extra columns ignored.
- Duplicates: name+bonuses from FIRST line; shop price from LAST line (6735 Warrior Ring/"Archer Ring"; 6889 Mage Book; 14121; 14124).
- Undefined id: name `!! NOT EXISTING ITEM !!! - ID:n`, bonuses 0, shop price 1 gp.
- 423 undefined ids in 0-7955: 0, 6542-6567, 6587-6602, 6604, 6635-6723, 6725-6730, 6732-6734, 6736-6738, 6740-6799, 6884, 6927-6944, 7005-7049, 7151-7154, 7412, 7619, 7621, 7670, 7810-7955 (Archers ring 6733, Berserker ring 6737 undefined).
- Root vs data item.cfg non-price changes: 3759-3789 Fremennik cloaks -> "Hp/Magic/Prayer/Strength/Attack/Defence/Thieveing/Range Cape" +20 own stat; 6541 Dwarf remains -> Mouse Toy; 4747 Torag hammers str 80 only; 4716-4722 Dharok spreads; 5574-5576 initiate str removed; 6527 str 85->210; 6583 ring of stone bonuses removed; 773 10000x12 removed; 1704 glory 20->10; 3101 claws str 39->1.

## 2. Items id>=7956 (see custom_items.csv for all columns + OSRS model ids)
Price = floor(col4 of last definition). Slot from itemType(): "plate" hides arms; "fullhelm"/"mask" hides head; "2h-blocks-shield" = in twoHanderz.
| id | name | bonuses | price | slot | req | real item (RS2 id -> OSRS id) |
|---|---|---|---|---|---|---|
| 10717 | Prayer Cape | 0 | 100000 | weapon | - | Prayer cape(t) 9760 |
| 10718 | Prayer Hood | 0 | 100000 | weapon(fullhelm) | - | Prayer hood 9761 |
| 11138 | 3rd Age Robetop | 0 | 1000000 | weapon(plate) | - | 3rd age robe top 10338 |
| 11139 | 3rd Age Robe | 0 | 900000 | weapon | - | 3rd age robe 10340 |
| 13595 | Bronze Defender | S1 | 30000 | shield | - | 8844 |
| 13596 | Iron Defender | S1 | 50000 | shield | - | 8845 |
| 13597 | Steel Defender | S1 | 121222 | shield | def 5 | 8846 |
| 13598 | Black Defender | S2 | 32432 | shield | - | 8847 |
| 13599 | Mithril Defender | S3 | 99554 | shield | def 20 | 8848 |
| 13600 | Adament Defender | S5 | 145321 | shield | - | 8849 |
| 13601 | Rune Defender | S10 P10 | 334222 | shield | - | 8850 |
| 13640 | Black Mask | D 1/2/3/4/5 S6 P9 | 30000000 | hat | - | 8921 |
| 14023 | Proselyte tasset | S2 P5 | 716321 | legs | - | 9678 |
| 14073-14140 | skillcapes, (t) capes, hoods (Att Cape 7/7/7 S4; Str Cape S10; Def Cape D5 S5 P5; Range Cape rng 15; Magic Cape mag 12 P5; hoods small) | | 100000-200000 (QP cape & Construct.(t) 20M) | cape; hoods = hat(mask), agility hood = hat | 99 own skill for Att/Str/Def/HP/Rng/Pray/Mag/Cook/WC/Fletch/Fish/Thiev/Farm/Slay; none RC/Agil/Herb/Craft/Constr/Mine/Smith/FM/QP | RS2 9747-9814 same ids OSRS (14073 = Attack cape 9747, 14140 = QP hood 9814) |
| 14503 | 3rd Age Topp | 35x12 | 34000000 | chest | - | 10330 |
| 14504 | 3rd age Legs | 31x12 | 27000000 | legs | - | 10332 |
| 14505 | 3rd Age Coif | 22x12 | 25000000 | hat | - | 10334 |
| 14506 | 3rd age vambraces | A rng 30, D 0/30/30/30/30 | 15000000 | hands | - | 10336 |
| 14507 | 3rd Age Robe Top | 0 | 600000 | chest | - | 10338 |
| 14508 | 3rd Age Robe | 0 | 600000 | legs | - | 10340 |
| 14511 | 3rd Age Platelegs | 0 | 900000 | legs | - | 10346 |
| 14512 | 3rd Age Platebody | 0 | 1000000 | chest (arms not hidden) | - | 10348 |
| 14513 | 3rd Age Fullhelm | 0 | 600000 | hat | - | 10350 |
| 14514 | 3rd Age Kiteshield | 0 | 600000 | shield | - | 10352 |
| 14519 | Amulet of glory(t) | 8x5 atk, D 14/6/6/6/6, S7 P8 | 30000000 | amulet | - | 10362 |
| 14520 | Amulet of strength(t) | 5x5 atk, D 5/5/3/0/3, S16 P5 | 30000000 | amulet | - | 10364 |
| 14521 | Amulet of magic(t) | mag def 25 | 30000000 | amulet | - | 10366 |
| 14522/14526/14530 | Zamorak/Guthix/Saradomin Bracers | mag -10, rng 11, D 6/5/7/8/0 | 1000000 | hands | - | 10368/10376/10384 |
| 14523/14527/14531 | Z/G/S Dragonhide | mag -15, rng 30, D 55/47/60/50/55 | 5000000 | chest | - | 10370/10378/10386 |
| 14524/14528/14532 | Z/G/S Chaps | mag -10, rng 17, D 31/25/33/28/31 | 3000000 | legs | - | 10372/10380/10388 |
| 14525/14529/14533 | Z/G/S Coif | mag -1, rng 7, D 4/7/10/4/8 | 2000000 | hat | - | 10374/10382/10390 |
| 14561-14563 | Sara/Guthix/Zammy Cloak | mag 4, rng def 4, P4 | 600000 | cape | - | 10446/10448/10450 |
| 14564/14566 | Sara/Zammy Mitre | same | 600000 | hat | - | 10452/10456 |
| 14567-14569 | Sara/Zammy/Guthix Robe Top | same | 600000 | chest(plate) | - | 10458/10460/10462 |
| 14570-14572 | Sara/Guthix/Zammy Robe Legs | same | 600000 | legs | - | 10464/10466/10468 |
| 14575 | Guthix Mitre | same | 600000 | weapon | - | actually Zamorak stole 10474 (M) |
| 14638 | Fighter Torso | rng def 10, S10 | 965432 | chest(plate) | - | 10551 |
| 14724 | Hunter Cape | 0 | 1000000 | cape | - | duplicate; real hunter cape is 14234 (model: 9948) (L) |
| 14860 | Helmet of Neitznot | 25x12 | 15000000 | hat | - | 10828 |
| 14915 | Barrelchest Anchor | 31/21/35/13/25 17/12/12/13/12 S65 P13 | 11232321 | weapon(2h-blocks-shield) | att 60 | 10887 |
| 15145 | Dragon Arrow | 35x12 | 1200 | arrows | def 60 | 11212 |
| 15156 | Dark Bow | 40x12 but slash def 150 | 4000000 | weapon | ran 80 | 11235 |
| 15185 | Dragon fire Shield | 75x12 | 40000000 | shield | def 60 | 11283 |
| 15195 | Dragon Full Helm | 50x12 | 20000000 | hat(mask) | def 60 | 11335 |
| 15333 | Armadyl Godsword | 3/4/13/14/12 12/12/16/12/6 S120 P11 | 13200000 | weapon | - | 11694 -> OSRS 11802 |
| 15334 | Bandos Godsword | same | 65000000 | weapon | att 80 | 11696 -> 11804 |
| 15335 | Saradomin Godsword | same | 13200000 | weapon | - | 11698 -> 11806 |
| 15336 | Zamorak GodSword | 31/21/35/13/25 17/12/12/13/12 S65 P13 | 70000000 | weapon | att 80 | 11700 -> 11808 |
| 15345 | Armadyl Helmettttt | 60x12 | 130000000 | hat(mask) | - | 11718 -> 11826 |
| 15346 | Armadyl chestplate | 60x12 | 130000000 | chest(plate) | - | 11720 -> 11828 |
| 15347 | Armadyl Plate legs | 60x12 | 130000000 | legs | - | 11722 -> 11830 |
| 15348 | Bandos Chestplate | 75x12 | 45000000 | chest (arms not hidden) | - | 11724 -> 11832 |
| 15349 | Bandos Tasset | 45x12 | 32000000 | legs | - | 11726 -> 11834 |
| 15350 | Bandos Boots | 30x12 | 15000000 | feet | - | 11728 -> 11836 |
| 15352 | Dragon Boots | 71/90/11/17/52 17/21/37/72/45 S11 P37 | 162362 | feet | def 60 | 11732 -> 11840 |
| 15713 | Summoning Cape | 0 | 20000000 | cape | - | 12169 (no OSRS) |
| 15714 | Summoning Skillcape | 10x12 | 20000000 | cape | - | 12170 |
| 15715 | Summoning Skillhood | 0 | 4000000 | hat(mask) | - | 12171 |
| 146143-146146 | Attacker/Collector/Defender/Healer Icon | 0 | 100M | unusable | - | typos for 14643-14646 (RS 10556-10559) |
All melee weapons: every 6 ticks vs players, 5 ticks vs NPCs.

### 2.1 Quirks
- Defenders: only Steel (def 5) and Mithril (def 20) have Defence req; Adament misspelled/Black no rule -> no req. Rune defender extra def in ignored columns (only str+10 pray+10). Pack-1 aliases 10228-10232 have id reqs 5/10/20/30/40.
- 14575 wields into weapon slot (really Zamorak stole). Real Guthix mitre 14565 undefined but sold in God Shop for 1 gp. 10717 and 11139 wield as weapons; 11138 full-body list only -> weapon slot hiding arms.
- Godswords: only BGS/ZGS need Att 80. BGS/ZGS attack anim 407, stand 1662, walk 1663; AGS/SGS anim 406 default stand/walk. None two-handed (can wield with shield). Specials: BGS 50% anim 2890 proj 436 dmg 40+rand5; ZGS 50% anim 1499 gfx 437/293/379 self, proj 282+497 vs players / 436 vs NPCs, 40+rand5, msg "Everything starts to burn around you!!". AGS/SGS no special. Smithing hooks dead (99 smithing; blade 15331).
- Dark bow 15156: Ranged 80. Attack anim 426; melee range only; no arrows; hit 4+rand(20) only while actionTimer==0 (after melee hit vs NPC timer 7 > 5 tick cycle). Special 50%: two hits up to 50 (players) / 45 (NPCs), proj 380.
- Dragon arrows 15145: not stackable, Def 60 (name "Dragon"). No bow fires them (arrow check bug: only rune arrows 892 count as ammo).
- Barrelchest anchor 14915: twoHanderz (can't wield with shield worn, but wielding doesn't remove shield). Attack anim 406, stand 2065, walk 2064. Special 50% anim 405 proj 282 40+rand5.
- Skillcapes on 99: most skills give cape+(t)+hood. Magic: cape + 5x (t), no hood. Cooking: only (t) + 10M coins. Fishing: cape,(t),hood + 10M. Fletching no (t). Agility nothing. Runecraft includes undefined hood 14093. Summoning cape emote copies Attack emote (+1 Attack).

## 3. Undefined custom ids used by code/shops (custom_refs_undefined.csv)
Get NOT EXISTING name, 0 bonuses, 1 gp. Handed out: 14093 RC hood (99 RC, Hood Shop); 14509 3rd age mage hat (3rd Age shop, Skeleton hellhound drop); 14565 Guthix mitre (God Shop); 14643-14646 BA icons (Ice giant key rewards; shield slot); 15181/15183/14819/14868-14870 (Mod&Admin shop 67, no NPC); 9540 Home teletab (item click).
Pack-1 aliases: 10226-10232 defenders; 10261-10270 Black mask (10)..(1), 10271 Black mask (Slayer 100); 10407-10413 Lunar (M); 10431 Rune crossbow (anim 427, Ranged 65); 10651-10653 Proselyte (M); 10704-10771 capes/hoods (reqs 100/66/99; hoods in Item4.fullHelm but wield as weapons); 11125-11129 Bob's shirts (M); 11134-11145 3rd age; 11153-11164 god d'hide; 11168 sleeping cap; 11169-11188 elegant; 11191-11194 crozier/cloaks; 11198-11203 robes; 11268 fighter torso; 11490 neitiznot; 11716 berserker necklace (M); 11785 dark bow; 11814 DFS; 11824 d full helm; 11938-11941 void helms/seal (M); 11967-11969 GWD hilts (L); 11977-11979 bandos; 11981 d boots.
Pack-2: 13591-13594 void top/robe/mace/gloves (M); 13776-13784 lunar (M); 13800 rune crossbow; 14234-14236 hunter cape/(t)/hood (H); 14295-14311 hunter gear (M); 14509/14510 3rd age mage hat/amulet; 14535 flared trousers; 14536 pantaloons; 14538-14557 elegant; 14558-14560 croziers; 14573/14574 sara/guthix stole; 14634-14637 BA hats; 14639-14642 runner boots, penance gloves, penance skirt; 14651 granite body; 14868-14871 silly jester (M); 14894-14896 builder's (M); 14945-14947 lumberjack (M); 15180-15184 masks (L); 15226-15231 hastas (M); 15320-15322 RS2 11674-11676 (null in OSRS) (L); 15331 godsword blade; 15332 shards 2&3 (M); 15337-15344 hilts, shards, zamorakian spear; 15351 saradomin sword.
Unidentified: 8447 "cat toy" (whip anims), 8486, 9000-9010, 9128, 9200, 9999, 11370-11372, 11444, 11538/11540, 11711, 12426-12440, 13603-13749 (some), 14316, 14478, 14579, 14595, 14668, 14715, 14767, 14819, 15106, 15368-15370.
Code typos: 140966621 = "14096, 6621"; 141001 ~ 14100/14101; 49914091 = "4991, 4091"; GetCLThieving 14013 and 140103 = 14103.

## 4. Mapping ids
RS2 ids <= ~11,650 = OSRS ids. GWD block OSRS = RS2 + 108. Summoning needs RS2 2008+ cache. Pack-2 anchors: 13595=8844, 13640=8921, 14023=9678, 14073=9747, 14140=9814, 14234=9948, 14295=10035, 14503=10330, 14561=10446, 14638=10551, 14646=10559, 14860=10828, 14915=10887, 15145=11212, 15156=11235, 15185=11283, 15195=11335, 15226=11367, 15309=11663, 15331=11690, 15352=11732, 15713=12169. OSRS nulled RS2 10603-10807, 11274-11278, 11526-11639 (don't count across). Pack 1 = pack 2 - 3369/3370/3371.

## 5. Sources of custom items
Shops (NPC-click else-if chain client.java 19075-19596, first match wins):
| shop | name | NPC | custom stock |
|---|---|---|---|
| 11 | Range Shop | 683 | 15156, 14522-14533 |
| 33 | Allstar's Pking Shop | 2167 | 14638, 13601, 15334, 15156, 15352, 15195, 15336 (twice) |
| 48 | Rares Shop! | 554 | 14519-14521 (dangling 14116 ignored) |
| 49 | Allstar's Pk Shop | 550 | 14638, 13601, 15334, 15156, 15352, 15195 |
| 50 | Allstar's Shop! | 520 | 14915, 15334, 14860, 15348-15350, 15195, 15345-15347, 15185 (stock 300000), 15352, 15336, 7449 |
| 51 | Pure Shop | 1699 | 13595-13601, 14638 |
| 53 | God Shop | 521 | 14522-14533, 14561-14572 (incl undefined 14565) |
| 54 | God Armor Shop | 1917 | 14023 |
| 61 | Skill Cape Shop | 555 | 40 capes incl 15714 (not 14097/14098/14115/14116/15713) |
| 62 | Hood Shop | 561 | all hoods (incl undefined 14093), 14100/14101, 15715 |
| 64 | Slayer Shop | 538 | 13640 |
| 65 | 3rd_Age_Shop | 558 | 14503-14514 (incl undefined 14509) |
| 66 | Brett's Relleka Shop | 681 | 14511-14513 |
| 67 | Mod_&_Admin_Shop | none | 15183, 15181, 14819, 14868-14870 |
NPC drops: hard-coded NPCHandler.MonsterDropItem, one uniform pick from Item2 array per kill. npcdrops.cfg loaded but only commented-out code reads it (no effect); drops.cfg never loaded.
| NPC | custom items (odds per pick) |
|---|---|
| KBD 50 | 15352, 15334, 14519, 15195 (1/6 each, with 4585, 4087) |
| Dagannoth Supreme 2881 | 15185, 15195 (1/17) |
| Dagannoth Prime 2882 | 15350, 15334 (1/17) |
| Dagannoth Rex 2883 | 15348, 15349 (1/18) |
| Black demon 84 | 14503, 14504, 14505 (1/17) |
| Skeleton hellhound 1575 | 14506, 14507, 14508, 14509 (1/17) |
| Arzinian Being 1859 | 15345, 14521, 15346 (1/18) |
| Jogre 113 | 3 picks/kill from 9-item table incl 15352 |
| Battle mages 912/913/914 | 14507, 14508 + 14513/14512/14511 (1/31) |
| Jelly 1637 | 14860 (1/30) |
| Dark beast 2783 | 11192 (1/78) |
| Chaos elemental 3200 | keys 601/758/788/983 (1/4) |
Other: keys on object 4126: 601 -> ZGS 15336, 758 -> BGS 15334, 788 -> 30M coins, 983 -> 10M coins. Ice giant (111) keys 1543/1545/1546/1548 on object 4119 -> 14643/14644/14645/14646. Wishing well object 884: use 70M coins -> random {15195, 15185, 15348, 14520, 15334, 7449, 15346}; cooldown 3600 ticks. Crates: 10688 -> 14077, 14078; 10689 -> 14082-14084, 14088-14090 (no checks). ::pickup (rights>=2) 5-digit id <=30000; ::item only "D D 3"/"Purez".

## 6. Behaviour rules (per-id in allstar_items.csv)
6.1 Flags (data\*.dat, 6800 bytes, id 0-6799; >=6800 false): stackable.dat non-zero = stackable (2,898). notes.dat ZERO = is note (2,042); deposit note -> id-1; withdraw as note if id+1 flagged note. twohanded.dat 44 ids (wield removes shield): 829-861 odd, 1307-1319 odd, 4153, 4212, 4214-4223, 4236, 4710, 4718, 4726, 4734, 4747, 4755, 4827. sellable.dat ZERO = sellable; only 617 and 995-1004 unsellable. tradeable.dat all zero, unused. Sellable overrides >=6800: 8486, 11967-11969, 12426-12435, 13591-13594, 13600, 13601, 13603, 13606, 13611, 13662, 13663, 13669, 13676, 13700, 13733, 13749, 13764, 13776-13782, 13784, 13800, 13889, 13994-13996, 14316, 14478, 14503-14509, 14511-14514, 14519-14533, 14535, 14536, 14538-14561, 14563-14574, 14579, 14634-14642, 14860, 14868-14871, 14945-14947, 15180, 15181, 15185, 15195, 15226-15231, 15320-15322, 15333-15352, 15368-15370. Untradeable: only 6384 (dropping destroys). 6556 blocked only for "trade 1". twoHanderz = {7158, 1319, 6528, 14915} refuse wield while shield worn; reverse check broken; item2handed() true only for id 1.
6.2 Slot: Item4 lists order capes->hat, boots->feet, gloves->hands, shields, amulets, arrows, rings, body->chest, legs; else weapon. Overlaps: 1044, 4302 -> hat; 4514/4516 -> cape; 4712/6107 -> chest; 6061 -> feet. Item.java slot lists dead. Mourner cloak 6070 -> wearer becomes NPC 1645.
6.3 Appearance: full-body list (155 ids) hides arms; full-helm (109) + full-mask (95) hide head; beard never drawn.
6.4 Wear reqs: order id table, -1 gives 1, name rules (case-sensitive on item.cfg name).
- Attack ids: 10704-10706=100; 15334,15336=80; 14915=60; 14073-14075=99; 3202=40; 7158=60; 3101=40. Name: strip Bronze/Iron/Steel/Black/Mithril/Adamant/Rune/Granite/Dragon/Crystal; if remainder starts claws/dagger/sword/scimitar/mace/longsword/battleaxe/warhammer/"2h sword"/"harlberd" use prefix: Bronze 1, Iron 1, "Attack Cape" 100, Steel 5, Black 10, Mithril 20, Adamant 30, Rune 40, Dragon 60, White 10. Else "Granite…"=50; names ending whip/Ahrims staff/Torags hammers/Veracs flail/Guthans warspear/Dharoks greataxe = 70.
- Defence ids: 1: 2497,2491,1065,1099,2489,2495,2493,2487; 40: 11154,2503,1135,2501,1163,1127,1079,1093,1201,1185,4131; 99: 14079-14081; 10228-10232 = 5/10/20/30/40; 70: 4716,4720,4722; 60: 11981,11824; 100: 10712. Name: strip metals (not Black); weapon words -> 1; Ahrims/Karil/Torag/Verac/Guthans (or ending "Dharok") -> 70 unless ends in weapon word; else prefix Bronze 1, Iron 1, "Defence Cape" 100, Steel 5, Mithril 20, Adamant 30, 5 exact "Rune …" names 40, Dragon 60, dragon 60, White 1, Initiate 20, ending "guthix" 40.
- Strength ids: 10707=100; 7449=80; 6528=60; 10709=66; 14076-14078=99. Names Granite 50; Torags hammers/Dharoks greataxe 70; "Strength Cape" 99.
- Ranged ids: 99: 14082-14084, 10713; 80: 11154, 11153, 15156; 859=50; 861=1; 40: 1135,1099,1065,2577,2581; 60: 2501,2495,2489; 10431=65. Names Karil 70, "Range Cape" 99, "Dark Bow" 99, Crystal 75, Seercull 70, "Dharoks" 99. Then 2497 = 70.
- Magic ids 14088/14090/10721=99; 6916-6924 even=70; 2412-2414=60. Names Ahrim 70, "Magic Cape" 99.
- Other: Prayer 14085-14087=99; Fletching 14109-14111=99; WC 14133-14135=99 name 100; Cooking 14127-14129=99 name 100; Fishing 14124-14126=99 name 100; Thieving 14103-14105=99, rogue 5553-5557=100; HP 14094-14096=99 name 100; Farming 14136-14138=99; Slayer 14112-14114=99, 4170=80, 4156=60, 4166=70, 7053=60, 4164=55, 10271=100.
- Oddities: every "Dragon…" item needs Def 60 (incl arrows, dragon axe, 7158); all Dharok pieces need 99 Ranged; renamed Fremennik cloaks need Str 99/Def 100/Mag 99/Rng 99.
6.5 Animations: attack (GetWepAnim) unarmed 422 (423 kick); 1658: 4151, 8447, 6541; 385: 868; 2927: 6527; 426: 15156, 4214, 859, 861, 6724; 451: 1305, scimitars, 4587, 746, 6739, 5018, 3101; 407: 15334, 15336, 2h swords, 7158; 406: 14915, 15333, 15335; 440: 3204, 3202, 6818; 1665: 4153, 7449; 2661: 6528; 1833: 1377, 1373, 1434, 4566; 2080: 5730, 4726; 2067: 4718; 2068: 4747; 2062: 4755; 2075: 4734; 427: 837, 10431; 402: dragon daggers; 408: 1419; 806 everything else. Stand default 808: staves 809, 2h + anchor 2065, mauls/BGS/ZGS/Allstar's Hammer 1662. Walk default 819: staves 1146, 2h + anchor 2064, mauls/BGS/ZGS 1663. Run default 824: whip 1661, maul 1664. wear() overrides: whip & cat toy run 1661 walk 1660; Torag hammers attack 2068. Login overrides: mauls 2064/2064/2065; 1215: 1661/1660 + gfx 306. Removing weapon doesn't reset. Block anim by defender weapon: whip 1659, maul/scythe 1666, 4755 = 2063, default 1834.
6.6 Attack speed (500ms ticks): vs players 6 ticks all except magic shortbow 861 = 5 (else branch overwrites). Bows 859, 4214, 839-857 hit from range but act like melee; only 861 real ranged. Vs NPCs: melee 5 ticks; bows 861, 839-857 4 ticks; 859, 4214, 6724 9 ticks; 861 must be adjacent to NPCs. Max hit: full Dharok adds (maxHP - curHP)/2; ranged max hit reads STAB defence bonus instead of ranged.
6.7 Specials:
| weapon | energy | anim/gfx | damage | proj |
|---|---|---|---|---|
| whip 4151 | 50% | 1658 / gfx 341 | 20+rand10 | - |
| Dark dagger 746 | 100% | 451 / 433 | 40+rand5 | - |
| Dark bow 15156 | 50% | 426 | two hits up to 50 (players)/45 (NPCs) | 380 |
| D long 1305 | 50% | 451 | 18+rand5 | 248 |
| BGS 15334 | 50% | 2890 | 40+rand5 | 436 |
| ZGS 15336 | 50% | 1499 / 437,293,379 | 40+rand5 | 282+497 players / 436 NPCs |
| Anchor 14915 | 50% | 405 | 40+rand5 | 282 |
| D halberd 3204 | 100% | 1667 | 35+rand10 | 282 |
| D scim 4587, Mouse toy 6541 | 75% | 451 | 30+rand5 | 347 |
| D mace 1434 | 40% | 1060 | rand(60) | 251 |
| D 2h 7158 | 40% | 3157 | rand(60) | 479 |
| DDS 5698 | 25% | - | two hits up to 31 | 252 |
| G maul 4153 | 50% | - | two hits up to 30 | 340 |
| D axe 6739 | 100% | 2876 | rand(80) | - |
| MSB 861 | costs 75% | - | - | - |
| Crystal bow 4214 | 50% | - | up to 32 | - |
| Barrows weapons | 100% | - | 10+rand5 | 432 |
| D battleaxe 1377 | 100% (fires on spec button) | 1670 / 246 | - | - |
6.8 Hooks: cape emote (button 161) gfx+anim, temp +1 in skill for Att/Str/Def/HP/Rng/Pray/Mag/Cook/WC/Fletch/Fish/Smith/Thiev/Slay (summoning copies attack). Ring of life 2570 saves at <=10% HP. Ring of stone 6583 -> NPC 1266. Mourner cloak 6070 opens mage guild doors 1600/1601 (+ NPC 1645 disguise). Ancient staff 4675 switches to ancient spellbook. Dramen staff 772 opens door 2406. Cooking gauntlets 775 lower stop-burn level by 10. Ring of forging 2568 iron smelt always succeeds. Staff of air substitutes air runes. Home teletab 9540 teleports home.
6.9 Prices: buy = sell = floor(col4 last def); shop modifiers x1; undefined 1 gp; high alch = full value; low alch = value/5. Selling needs sellable flag + shop stocking item (unless general store).
6.10 Weapon interface by name: ends whip 12290; ends bow/Bow 1764; Staff 328; else after stripping metals: dart 4446, dagger 2276, pickaxe 5570, axe/battleaxe 1698, halberd 8460, spear 4679, claws 7762, else 2423; unarmed 5855.

## 7. Customised 0-7955 (nonauthentic_0_7955.csv)
Renamed: 3748 "Third Age Helmz" (Fremennik helm) D 43/45/42/-3/44 S30; 3759-3789 Fremennik cloaks -> skill "capes" +20 own stat; 4827/4828 "Dark Bow" (comp ogre bow) +139 ranged, 99 Ranged, 1.5M/50M; 6129/6130/6131 "Third Age" plate/legs/helm (rock-shell plate/legs, spined helm) custom stats; 6384/6385 "Fighter Torso" (desert top) custom stats, 6384 only untradeable; 6541 Mouse toy custom desc, whip anims, special; 6603 magic staff +100 magic 1M; 6889 "Mage Book"; 7449/7450 "Allstar's Hammer" (meat tenderiser) +150 every bonus, 100M, Str 80.
Buffed: 746 Dark dagger (10M); 538, 636, 662 +150 magic; black set: 1089 black plateskirt 150/150/150 attack; notes +150 every bonus: 1090, 1108, 1180, 1218, 1234, 1284, 1298, 1314, 1328, 1342, 1368, 1427, 4126; 1077/1078, 1125, 1151, 1165, 1195 def 20/-20; 4125 black boots 10 every bonus; 2585/2589 +500,000 stab attack; 3140 d chain +100 def str/pray 30 100M; 1704 glory 10 every bonus; 1727 amulet of magic +10 mag def; 6575/6577 onyx ring/necklace 10 every bonus; 6527 Tzhaar-ket-em str 210; 6528 Tzhaar-ket-om crush 222; 6570 fire cape 12 every bonus 1M; 7336 rune kite(h) 60s/10s 217.6M; 3204 d halberd 115/135/129; 4151 whip slash 102 str 52; 859 magic longbow range 89; 6585 fury & 7462 barrows gloves altered values; Dharok/Torag odd stats.
Prices: party hats, santa, h'ween masks 5M; bobble/jester/woolly 6856-6863 1M.
