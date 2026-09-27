# Allstar-Scape v2 — Objects, World Edits, Interface Buttons (1:1 inventory)

Source: `D:\Desktop\allstar.scape.v2` (all line numbers = `client.java` unless noted). Loc names = Lost City 377 cache (`D:\Desktop\Allstar-City\content\pack\loc.pack` + `scripts/**/*.loc`), component names = LC `pack/interface.pack`. Item names = Allstar `item.cfg` (`[noted]`/`[stack]` from Allstar `data/stackable.dat`). Scope rule (per user): record Allstar's exact implementation for everything, including authentic-looking features. Tags: **CUSTOM** (Allstar-specific), **AUTH-ish** (real-RS feature, but Allstar's numbers/behaviour recorded as-is), **JUNK** (dead/broken; recorded so the porter can decide).

---

## 0. Engine facts required to reproduce behaviour 1:1

| Fact | Detail |
|---|---|
| Cycle length | `server.java:16 cycleTime = 500` ms. Every cycle `PlayerHandler.process()` per player: `actionAmount--` → `client.process()` (all timers −1) → drain *all* queued packets → movement. LC tick = 600 ms. All timers below are **cycles** (×0.5 s). |
| Timers used by objects | `actionTimer`, `theifTimer`, `AgilityTimer`, `WCTimer`, `RCTimer` — each −1 per cycle in `process()` (17028-17047). A handler gated by `timer == 0` silently does nothing while the timer runs. |
| Anti-spam | `actionAmount` +1 on each `customCommand()` (so each emote-teleport), firemaking, smithing; −1 per cycle. `> 25` → "Kicked for acting too fast!" + disconnect (17031). |
| Click reach | Packets 132/252/70: if `GoodDistance(player,obj,range)` (Chebyshev ≤ range) run handler now, else walk (`WalkingTo`) and run when within range (17983). range = 2; `6912` → 3; op1 on `6672/6673` → 1. Item-on-object (192) has **no distance check** (fires instantly from anywhere). |
| No server object map | Server never verifies a loc exists at the clicked tile and has **no collision**. Handlers key on loc id (and coords only where stated) → every copy of that loc id in the world behaves identically; placed/removed objects are client-side only (server pathing ignores them). |
| Teleports | `teleportToX/Y = …` → instant next cycle, no anim/gfx, **height unchanged** unless code sets `heightLevel` (so emote/portal teleports from an upper floor land on that floor). |
| `addItem(id,n)` (14850) | Non-stackables always add exactly **1** (n ignored). Stackables add n (capped at maxItemAmount). Fails with "Not enough space in your inventory." whenever `freeSlots()==0`, **even if the stack already exists**. |
| XP | `addSkillXP(amount, skill)` raw (no multiplier); amounts like `1700*playerLevel[x]` use the *current (boosted)* level at click time. XP > 2,000,000,000 → "Max XP value reached". |
| Anim/gfx helpers | `setAnimation(n)` = `startAnimation(n)` (anim mask). `stillgfx(id,Y,X)` = spotanim at tile, broadcast ≤60 tiles. Hex anims used: 0x323=803, 0x340=832, 0x378=888, 0x362=866, 0x320=800, 0x714=1812, 0x306=774, 0x383=899, 0x382=898, 0x831=2097, 0x2DD=733. |
| Button ids | Packet 185 id = `misc.HexToInt` = `hi*1000 + lo` of the 2-byte component id (e.g. 9154 = component 2458). Real component = `(id/1000)*256 + id%1000`; ids with `id%1000 > 255` can never arrive (**unreachable**). |

---

## 1. World edits

### 1.1 When/how they run
- Trigger: packet **121** ("map region loaded", 19776-19796) → `WritePlayers(); writePlayers(); NewObjects(); Deleteobjects(); Deletewalls(); OBJECTS()` (OBJECTS is empty). So on **login and after every region change/teleport that reloads the map**, for the player whose client finished loading.
- `makeGlobalObject(x,y,id,face,type)` (1597) loops **all players** and sends `createNewTileObject` (frames 85+151) to each player whose Euclidean distance to (x,y) ≤ 60. No height: the 317 client places it on the receiving player's **current plane** (object appears on whatever floor you stand on).
- Rotation byte = `face & 3` → raw 0/-1/-2/-3 → rot 0/3/2/1 (source comment claims 0=W,-1=N,-2=E,-3=S). Type 10 in all 509 calls; a type-10 add replaces any existing type-10 loc on that tile (client side).
- Removals: `deletethatobject(x,y)` = `ReplaceObject2(x,y,6951,-1,10)`; `deletethatwall(x,y)` = `ReplaceObject2(x,y,6951,-1,0)` → client removes the loc of that layer (type 10 scenery / type 0 wall) and adds 6951 (`lost_tribe_trap_ceiling` "Nothing", invisible) — sent only to the loading player.
- Totals: **509** `makeGlobalObject` calls (lines 1820-2328), 27 exact duplicates (idempotent), 1 same-tile conflict: (3101,3513) 6477 @1879 then 6472 @2029 → **6472 wins** (last write). 2 placements fall in regions with no LC map file: (2854,3957) chaos altar 61 (probably typo for home 2854,3597) and (3444,9792) ice chunk. **67 removals** (9 `Deleteobjects` + 58 `Deletewalls` = 16 type-0 walls + 42 type-10 objects). Full row data: Appendix A (placements CSV) / Appendix B (removals CSV).

### 1.2 Placements grouped by area (CUSTOM unless noted; counts = unique rows)
| Area (bbox label used in CSV) | Rows | Content (loc id "377 name" ×n) | Purpose / linked handlers |
|---|---|---|---|
| HOME 2845-2880,3585-3602 (`::home`/Yes-emote = 2853,3591) | 22 | portals 2466(2855,3598 red) 7324(2856,3598 blue) 7325(2857,3598) 7352(2858,3598) 7319(2860,3599) 2465(2861,3599) 2467(2862,3599) 2472(2864,3599); booths 2213×5 (2851/2852/2853,3590; 2857/2858,3587); altar 6552 (2854,3595); statues 576 (2855,3589/3594), 579 (2850,3591/3592); 210 ice light (2850,3593 & 2850,3590 "fire"); well 884 (2860,3591); 5981 fire (2874,3600) | Portal hub (§3.1), ancient-altar toggle (§3.13), wishing well (§5) |
| SHILO old home 2840-2865,2950-2970 | 7 | 61 chaos altar (2843,2964); 4389 portal (2852,2953 "shopportal"); 6084/6083 Keldagrim booths (2860/2859,2957); 2213×2 (2851/2853,2957); 3192 scoreboard (2843,2961) | old home (portal 4156 at Barrows still sends here) |
| MISCELLANIA 2500-2615,3840-3900 | 22 | anvil 2783 (2510,3863); range 4172 (2511,3864); "Bankhome" booths 6084×3/6083×2 (2514-2518,3858); 210 lights ×6 (2513/2519,3856-3858); deposit box 9398 (2572,3853, comment "shopportal"); 2213×3 (2535,3889-3891); altar 6552 (2542,3895); magic trees 1306 ×4 (2539,3860 2563,3867 2609,3854 2565,3888) | fishing area (7324 → 2572,3852), shops (4389 → 2540,3890), `::wc` 2544,3878 |
| SKILL_AREA 2370-2390,3420-3445 (dance-emote/2467 → 2380,3427) | 25 | stalls 4876(2373,3432) 4877(2373,3433) 4878(2373,3434) 2562(2373,3435) 2565(2373,3437) 2560(2373,3439); pipe 2287 (2378,3438); chest 2193 (2380,3440); drawers 3816 (2383,3427); range 4172 (2381,3438); barrels 3206 (2383,3436/3437); booths 2213 (2380/2381,3425); trees 1315 (2382,3434) 1307 (2382,3432) 1306 (2382,3430); anvils 2783 (2376/2378,3442); water altar 2480 (2377,3434); herb patch 8151 (2375,3427); gem rocks 2111 (2375/2377,3431); deposit box 9398 (2375,3441); 12120 chest (2378,3427, comment "water") | money+XP objects (§3.2), stalls (§4), farming (§5) |
| TRAINING_AREA Menaphos 3200-3230,2780-2810 (No-emote → 3209,2801) | 53 | hedge 1116 wall ×44: x=3224,y=2783-2807 and y=2783,x=3205-3223; booths 2213 (3209,2802/2804 3208,2803 3210,2803); 4901 Zamorak standard ×4 (3208/3210,2802/2804) | enclosure |
| EDGEVILLE/WILD_WALLS 3070-3140,3460-3560 | 127 | ice-chunk wall 6472 ×103: y=3552 x=3071-3073,3075-3105 (+6477 at 3074); x=3071 y=3520-3551; y=3512 x=3071-3075; y=3513 x=3101-3106,3112-3122,3129; y=3514 x=3123-3125,3127-3128; singles 3095,3527 3107,3531 3094,3537 3077,3538 3082,3544 3097,3464/3465 3079/3080,3468; 6477 ×3 (3101,3513 [overwritten by 6472] 3074,3552 3104,3523); gate 6461 (3088,3512) 6462 (3086,3512); torches 6416 (3085/3090,3512); Keldagrim booths 6084/6083 (3092-3099,3506); lights 210 (3085-3100,3487-3506); portal 8987 (3082,3505, no handler); 767 (3096,3468); barrels 6213 (3086/3089,3496); wheelbarrow 5353 (3133,3516); cart wheel 327 (3133,3518) | walled PK/"Training Facilities" box north of Edgeville with ice-gate entry (§3.1) |
| OLD_PKBOX 3425-3446,9765-9795 | 87 | ice 6473 ×74 ring: y=9770 x=3427-3435,3437-3438 (gap 3436); x=3428 y=9770-9791; x=3438 y=9771-9784; y=9784 x=3438-3444; x=3444 y=9784-9792; y=9791 x=3430-3444 (gap 3429); booths 11758 (3432-3435,9772); altar 6552 (3430,9774); danger signs 1032 (3430-3437,9777) | abandoned PK box (no teleport targets it) |
| PKBOX (Angry-emote → 3306,9375) | 11 | booths 11758 (3305,9374-9377); danger signs 1032 (3308,9372-9374 & 9377-9380) | PK box |
| TEAM_PK N-Varrock (Wave-emote → 3243,3517) | 9 | booths 2213 (3243/3244,3515); altar 6552 (3246,3517); danger signs 1032 (3240,3241,3245,3246,3247 @3520 + typo 3442,3520) | team PK |
| SEERS/CAMELOT shops (Bow-emote → 2738,3464) | 11 | Keldagrim booths 6084 ×8 (2736-2739,3467 & 3469); closed chest 2417 (2736/2737,3476); altar 6552 (2732,3462) | shop area |
| GUILD_PORTALS Camelot (Beckon → 2757,3496) | 6 | 7315 (2756,3498 → Strength guild), 7316 (2759,3498 → Range/Magic guild); booths 11758 (2757/2758,3493 & 3503) | §3.1 |
| STRENGTH_GUILD 3485-3500,9660-9695 | 11 | booths 11758 (3490,9668-9673); fires 5981 (3489,9686-9689); crate 10688 (3496,9665) | §3.4 |
| RANGE_MAGIC_GUILD 3235-3250,9355-9370 | 9 | booths 11758 (3241,9359-9362); fires 5981 (3239,9363-9366); crate 10689 (3248,9364) | §3.4 |
| MOD_ZONE Sophanem (2472 → 3281,2766) | 11 | booths 2213 (3278-3284,2777); danger sign 1032 (3281,2764); crate 10687 (3285,2770); spotlights 3644 (3280/3281,2765) | §3.4 |
| EDGE_DUNGEON_TRAINING 3110-3125,9830-9850 | 8 (+8 dup) | chests 75 (3114,9842-9844); hay 299 (3118,9836); lever 2416 (3121,9842, "strength"); target 2513 (3121,9838); chaos altar 61 (3114,9836); booth 2213 (3116,9846) | training dummies (§3.3); free god capes spawn at 3118-3120,9848 (§8) |
| HEROES_BASEMENT 2855-2895,9875-9910 | 8 | booths 2213 (2868,9881-9883; 2859,9881/9882); barrels 2932 (2863/2864,9881); stairs 4626 (2892,9907, no handler) | barrel 2863,9881 → "pk area" (§3.1) |
| BURTHORPE/HEROES_GUILD | 5 (+1) | booths 2213 (2895,3509/3512; 2901,3557); altar 6552 (2892,3512); portal 7288 (2890,3545 "gmaulportal") | gmaul minigame — its item-on-object handlers are unreachable (§5) |
| Minigame chests | 4 | 4126 silver chest (2465,4817 Law altar); 4121 black chest (2794,9326 secret cave); 4119 steel chest (2866,9956); 2182 open chest (3231,3499 — **handler checks 3231,3501**) | §3.1/§5 |
| GU'TANOTH (7352 → 2502,3011) | 4 | battlements 2832 (2500/2501,3018; 2539,3032/3033) | Enchanted minigame blockers |
| Misc singles | — | furnace 2781 (3042,4843 Abyss); anvil 2783 (3306,3204, placed twice); Al-Kharid stalls 2562 (3286,3211) 4878 (3299,3199) 4876 (3299,3200) 2565 (3298,3205); barrel 362 (2768,2756 Ape Atoll); portal 4156 (3565,3308) + booths (3568/3569,3307) Barrows; portal 2472 (3303,3123 Shantay); portal 7319 + booths 2213 (3228,9318; 3233/3234,9321); booth 2213 (2605,3157, placed twice); trees 1276/1308/1307/1309/1306 (2976-2982,3398-3404 N Falador); chest 76 (3469,9488 KQ); bank chest 4483 (3054,3437); booth 2213 + open chests 104 (3426,3536; 3427/3429,3539 Slayer tower); ice 6472 (3094-3098,9878-9888 Edge dungeon); scoreboards 3192 (2993,3127 3002,3126 2786,3179 2802,3180); fire box 5981 ×13 (2034-2039,4526-4531, orphan: nothing teleports there) | |

### 1.3 Removals (every region load; client-side)
| What | Tiles (x,y; layer) | 377 loc actually there | Effect |
|---|---|---|---|
| Heroes' Guild | stairs 2895,3513 (t10 + t0); trees 2885,3515 2883,3511 2886,3514 2883,3512 2883,3508 2886,3506 2886,3510 (t10); doors 2891,3510/3511 (t0) | 1738 stairs; 1289/1315/1316 trees; 1516/1519 large doors | opens the guild |
| Heroes' basement "Ladder to home" 2892,9907 (t0) | | 1757 ladder is **t10** → wall delete misses; ladder is instead overwritten by placed stairs 4626 | ladder gone |
| Brimhaven | plant 2785,3175 (t10); doors 2790,3177 2794,3180 (1534, t0); members gate 2816,3182/3183 (1596/1597); wall 2811,3170 (2626 grubor door) | | free passage |
| Karamja volcano / Elvarg | gates 2847,9636/9637 (2607/2608 elvarg gates); wall 2836,9600 (2606 dragon secret door) | | free access to Elvarg lair |
| Al Kharid | walls 3292,3167 3293,3167 (1506/1508) 3287,3171 3298,3171 | palace doors | removed |
| "new training area for Mod Steve" (Brimhaven pub interior 2791-2799,3154-3169) | 42 t10 tiles (counters, bar pumps, stools, chairs, tables, barrels, anchors…) | see CSV | pub gutted |

### 1.4 Other runtime object edits
| Source | Behaviour | Tag |
|---|---|---|
| Woodcutting (9450) | after 20 successful chops: `AddGlobalObj(tree,1341 stump,face 0,type 10)` to all players ≤60 tiles; never respawned server-side, reverts on next region load (no server state) | CUSTOM |
| Firemaking (1737-1815) | fire 2732 via ObjectFire arrays, lasts `FireDelay 80 + 10*logTier` cycles, 1/3 chance (`random(2)==1`) ashes 592 on burnout | AUTH-ish |
| Door handlers (§3.11) | `ReplaceObject` visuals only, sent to clicking player only | — |
| `::object`(Mod Steve only, 13506) / `::make ####  #` (rights≥2, 13609) | spawn arbitrary loc | JUNK/dev |

---

## 2. Object packet pipeline

| Packet | Code | Behaviour |
|---|---|---|
| 132 op1 (20590) | reads x,id,y | range rule (§0). **At click time, regardless of distance:** `6552` spellbook toggle (see below), `9398` → `openUpDepBox()` (title `"@whi@The Official Deposit Box Of "+name` on 7421, `sendFrame248(4465,197)`, items on 7423, IsBanking). **BUG: no `break` → falls into case 252**, re-reading 6 stale bytes as (id,y,x) and possibly running `objectClick2` on garbage. |
| 252 op2 (20634) | reads id,y,x | range 2 (6912→3) → `objectClick2` |
| 70 op3 (20658) | reads x,y,id | range 2 (6912→3) → `objectClick3` |
| 234 op4 (19863) | prints only | JUNK |
| 192 item-on-object (18447) | see §5 | preceded by case 16 (item op2) **without break** → every item-op2 click also runs the 192 code on junk bytes (normally matches nothing → silent) |

6552 double toggle (net effect): `objectClick(6552)` toggles `playerAncientMagics` and sends sidebar 12855 then 1151; the packet-132 block then toggles `ancients` + `emotes` (spellbook var; `emotes=2` → ancient book, `0` → normal) with messages "You convert to ancient magic." / "You convert to normal magic.". From a fresh login: 1st click → "You convert to normal magic." (stays normal), 2nd → ancients, then alternates. `process()` 17054 forces ancient book whenever weapon 4675 (Ancient staff) is wielded while `emotes==0`, or whenever `emotes==1`. No quest/level requirement; works on every 6552 (6 placed: home 2854,3595; Miscellania 2542,3895; Heroes 2892,3512; Team PK 3246,3517; Seers 2732,3462; old pkbox 3430,9774).

---

## 3. objectClick — option 1 (`objectClick` 2540-4282)

All messages verbatim. "tb" = if `teleblock` → message instead of teleport.

### 3.1 Custom teleports / portals (CUSTOM)
| Loc (377 name) | Coord condition | Requirement | Destination (x,y[,h]) | Message(s) |
|---|---|---|---|---|
| 7324 rd_portal_room6_entrance (home 2856,3598) | none | — | 2572,3852 | "You teleport to the Fishing area." |
| 2466 mindtemple_exit_portal (home 2855,3598; also real Mind altar exit) | none | actionTimer==0 | opt1 → 2387,3116; opt2 → 2412,3091 (inside Castle Wars arena) | Option box title `@whi@W@gre@h@whi@e@gre@r@whi@e @whi@d@gre@o @whi@y@gre@o@whi@u @whi@w@gre@a@whi@n@gre@t @whi@t@gre@o @whi@g@gre@o@whi@?`, options `@red@Saradomin's Clan` / `@red@Zamorak's Clan` (OptionObject=2466); results "Welcome to Saradomin's team!" / "Welcome to Zamorak's team!". **Quirk:** while NpcDialogue==0 (normal state) option 1 first hits the `NpcDialogue==0` branch of button 9157 → chatbox text "Mmk thanks for reading!", windows closed, NpcDialogue=1340, and next cycle a Hans option box "Select an Option" / "Yea i wanna go own n00bs!" / "Nah im really scared!"; its option 1 then performs the Saradomin teleport (option 2 → "Fine, you suck!"). NpcDialogue stays 1340 afterwards, so later uses skip the extra box. |
| 7319 rd_portal_room4_exit (home 2860,3599; 3228,9318) | none | — | 3565,3306 | "You teleport to the Barrows Training!" |
| 2465 airtemple_exit_portal (home 2861,3599; also real Air-altar exit, i.e. exit of the gsmini arena) | none | — | 3209,2801 | "You teleport to the Training Area!" |
| 2467 watertemple_exit_portal (home 2862,3599) | only obj (2862,3599) | — | 2380,3427 | "You teleport to the Skill Area!" |
| 7352 rd_portal_room7_entrance (home 2858,3598) | none | — | 2502,3011 | "You teleport to the Enchanted Minigame." |
| 7325 rd_portal_room6_exit (home 2857,3598) | none | — | 2607,3166 | "You teleport to the Icon Minigame." |
| 2472 lawtemple_exit_portal (home 2864,3599; 3303,3123; also real Law-altar exit) | none | playerRights ≥ 1 | 3281,2766 | "Welcome to the Mod & Admin Zone." / else "Sorry You Are Not A Mod Or Admin" + "You May Have Luck If You Work For It" |
| 4389 castlewars_saradomin_exit (Shilo 2852,2953) | none | — | 2540,3890 | "You teleport to Shop's" |
| 4156 vt_mazeportal_7 (Barrows 3565,3308) | none | — | 2852,2955 | "You teleport Home." |
| 7315 rd_portal_room3_entrance (2756,3498) | none | Strength (current) ≥ 99 | 3492,9670 | "You teleport to the Strength Guild!" / "You need 99 strength in order to enter this portal." |
| 7316 rd_portal_room3_exit (2759,3498) | none | Ranged (current) ≥ 99 (magic NOT checked) | 3243,9361 | "You teleport to the Range/Magic Guild!" / "You need 99 Range and Magic in order to enter this portal." |
| 2474 chaostemple_exit_portal (real Chaos-altar exit) | none | — | 3094,3498 | "Welcome To Allstar-Scape Sick-like-a-Dick Town!!", "You Can Shop Here!", " WHOA! And You Can Pk!!" |
| 2469 firetemple_exit_portal (real Fire-altar exit) | none | — | 3088,3493 | "You Go To The Edge" |
| 6462 icegate_right_small (3086,3512) | none | — | 3087,3514 | "This Nub Goes to The Training Facilities." |
| 6461 icegate_left_small (3088,3512) | none | — | 3087,3511 | "Back To da Trainin i c?" |
| 2932 skullcavebarrel (2863,9881) | obj (2863,9881) | — | 2863,9880 | "You smash the barrel and climb into pk area click pk to get back on emote tab" |
| 2182 chestopen_khazard (placed 3231,3499) | obj (3231,**3501**) — placed copy never matches | — | +1 6818 Bow-sword → 2853,3591 | "U G3T TH3 LOOT AND SCRAM" |
| 4031 shantay_pass_henge_doorway (every Shantay pass) | none | actionTimer==0; sets actionTimer=200 | 3483,9490 (KQ lair) | "You Got tele'd to the Deadly Biotch!.. Beware..." |
| 1748 laddermiddle (every one) | none | actionTimer==0; sets 2 | 3286,3191, h=0 | — |
| 1765 ladder (KBD ladder) | obj (3017,3849) | — | 2773,9341 | "You climb down the ladder to find a secret cave!" |
| 2903 / 2904 shaman_entrance_cave | (2773,9342) / (2772,9342) | — | 3016,3848 | "You climb out of the cave back into the wilderness." |
| 393 bookcase_bamboo | (2790,9341) | — | 2800,9341 | "You search the bookcase a crawl through a hidden crack in the rock." |
| 2918 shaman_cave_crevice | (2799,9341) | — | 2790,9340 | "You crawl through the crack in the rock." |
| 4499 slayer_dungeon_entrance ("QUEST_1") | (2797,3614) | — | 2772,10231 | "You crawl through the cave" |
| 5025 trollromance crevasse ("QUEST_1") | (2772,10233) | — | 2795,3614 | "You crawl through the cravass" |
| 1814 wildinlever / 1815 wildoutlever (AUTH-ish) | none | tb | 3153,3923 / 2561,3311; anim 1812 | "You pull the lever..." + "And get teleported into the wilderness." / "And get teleported back to Ardougne!"; tb: "A magical force stops you from teleporting to ::home." / "A magical force stops you from Going Back to ::home..." |
| 1728 staircase | obj y==9497 | — | 2636,9517; hit 10-15 (`10+random(5)`, random is 0..n inclusive), actionTimer 30, currentHealth−=hit | "You climb down the stairs, and stand on a trap!" (lands in the "KBDLair" damage zone, §3.14) |
| 6657 Juna (ToG) | absX<objX → JunaTele 1; absX>objX → JunaTele 2 (equal: none) | — | opt1 → x=3253 (JunaTele 1) or x=3251 (JunaTele 2), y unchanged | Option box "Hello what do you want?" / "Can I go through please?" / "Ya ma."; opt1 subject to the same NpcDialogue==0 quirk as 2466; opt2 → player chat head "Ya ma." |

### 3.2 Money + XP objects (CUSTOM; all: `actionTimer==0` gate, then actionTimer=15 (7.5 s); no level req; no coord check)
| Loc (377 name) — placed at | XP | Items | Anim | Message |
|---|---|---|---|---|
| 3816 eadgar_kitchen_drawers — 2383,3427 | 1700×Crafting → Crafting | 10× 392 Manta ray [noted] + 1,000,000 coins | 888 | "You Gain Some Crafting, and get some Cash!." |
| 7133 abyss_exit_to_nature (Nature rift, every one) | 1700×RC | 100× 561 Nature rune + 1,000,000 | 866 | "You Gain Some RuneCrafting, and get some Cash!." |
| 2513 target — 3121,9838 | 1700×Ranged | 1,000,000 | 888 | "You Gain Some Range, and get some Cash!." |
| 2781 furnace1 — 3042,4843 (every 2781) | 1700×Smithing | 1,000,000 | 888 | "You Gain Some Smithing, and get some Cash!." |
| 2287 barbarian_obstacle_pipe — 2378,3438 | 1700×Agility | 1,000,000 | 803 | "You Gain Some Agility, and get some Cash" |
| 2111 gemrock — 2375/2377,3431 | 1700×Mining | 1,000,000 | 624 | "You Gain Some Mining, and get some Cash!!" |
| 2193 chest — 2380,3440 | 1700×Firemaking | 100× 892 Rune arrow + 1,000,000 | 733 | "You Gain Some FireMaking, and get some Cash, and Arrows!." |
| 12120 fairy_chest_closed — 2378,3427 | 1700×Herblore | 1× 158 Super strength(3) [noted] | 888 | "You Gain Some Herblore!" |
| 2643 potteryoven | 8×Crafting | 1× 1806 Silver pot (no materials) | 888 | "You make a pot." |
| 2357 digsitebush | 25×Farming | 3× 1968 Cabbage [noted] | — | "You dig in the bushes" + "You manage to find some kind of seeds." |
| 9533 sarim_crate / 9535 sarim_crate3 | 20×Strength | — (actionTimer 20) | 800 | "You find some roids." / "You find some Steroids." |

### 3.3 Training dummies (CUSTOM; require `GoodDistance2` cross-shape ≤3 tiles and actionTimer==0)
| Loc — placed | XP | Timer | Anim / gfx | Message |
|---|---|---|---|---|
| 2416 lever — 3121,9842 | 1×Strength | 10 | 1658 / 246 | "Go train on npc's, Fucker..." |
| 104 ikov_chestopen — 3427,3539 & 3429,3539 | 1700×Slayer | 10 | 423 / 199 | "You gain some slayer Exp" |
| 2393 goal_gnomeball_game (unplaced) | 1×Ranged | 20 | 1658 / 246 | "Go train on npc's" |
| 75 arena_guard_chest_shut — 3114,9842-9844 | 1×Attack | 10 | 422 / 246 | "Go train on npc's please" (falls into 299 block, which is then blocked by the timer) |
| 299 haystack2 — 3118,9836 | 1×Defence | 10 | 800 | "Go train on npc's please" |
| 61 thrantaxaltar (Chaos altar) — 2843,2964 2854,3957 3114,9836 | none | none | 645 | prayer restored to base level; "You recharge your prayer" |

### 3.4 Reward crates (CUSTOM; op1, no timer, no rights/coord check → unlimited)
| Loc — placed | Gives | Message |
|---|---|---|
| 10687 Puppet torsos — Mod zone 3285,2770 | 10× each [noted]: 1039 Red, 1041 Yellow, 1043 Blue, 1045 Green, 1047 Purple, 1049 White partyhat; 1051 Santa hat; 1054 Green, 1056 Blue, 1058 Red h'ween mask | "Give any of this away and you will be DEMOTED+BANNED!" |
| 10688 Puppet arms — Strength guild 3496,9665 | 14077 Str Cape (t), 14078 Str Hood | — |
| 10689 Puppet legs — Range/Magic guild 3248,9364 | 14082 Range Cape, 14083 Range Cape (t), 14084 Range Hood, 14088 Magic Cape, 14089 Magic Cape (t), 14090 Magic Hood | — |
| 10691 / 10692 / 10693 / 10695 (not placed) | 1044 Green partyhat / 1046 Purple partyhat / 1048 White partyhat / 1050 Santa hat | — |
> Port warning: LC map natively contains 10687-10695 at 2001-2014,4433-4436 (m31_69); an id-only port would make those dispense rares too.

### 3.5 Custom "quest" objects
| Loc | Condition | Behaviour |
|---|---|---|
| 1600 / 1601 magicguild_door (Yanille) "QUEST_3" | obj y==3087 / y==3088 | cape slot == 6070 (Mourner cloak) → "You sneak into the mage guild..." + door → id−1 face −2; else "Piss off! You ain't aloud in here!". **Missing breaks**: 1600 falls into 1601 and both fall into the generic door swap (§3.11 A) → door visually opens regardless of cape (and no server collision anyway). |
| 4499 / 5025 "QUEST_1" | §3.1 | cave ↔ crevasse pair |

### 3.6 Runecrafting (op1)
`runecraft(req, xp, rune, t2,t3,t4,t5,t6)` (750): needs ≥1 rune essence 1436 (pure 7936 not accepted) → "You need some rune essence to craft runes!"; level < req → "You need <req> Runecrafting to make <rune name>!". Output = essCount × mult (×1 below t2, ×2 ≥t2, ×3 ≥t3, ×4 ≥t4, ×5 ≥t5; t6 unused). Removes all 1436. XP = flat `xp` (not per essence). gfx 186 (`staticAnimation`), anim 791, "You craft <n> <rune name>!". No timer.
| Altar | Req | XP | Rune | ×2/×3/×4/×5 at |
|---|---|---|---|---|
| 2480 water_altar (also placed skill area 2377,3434) | 1 | 3000×RC | 555 Water | 30/45/60/80 |
| 2481 earth | 9 | 300×RC | 557 Earth | 45/55/65/85 |
| 2482 fire | 14 | 350×RC | 554 Fire | 50/60/70/80 |
| 2483 body | 20 | 400×RC | 559 Body | 55/65/75/85 |
| 2484 cosmic | 27 | 450×RC | 564 Cosmic | 60/70/80/90 |
| 2487 chaos | 35 | 500×RC | 562 Chaos | 60/70/80/90 |
| 2486 nature | 44 | 550×RC | 561 Nature | 60/70/80/90 |
| 2485 law | 54 | 600×RC | **557 Earth (bug)** | 65/75/85/95 |
Air (2478), mind (2479), death, blood altars: no handler.

Abyss rifts (op1, exact obj coords required): 7139 air (3047,4825) → 2845,4832 (= gsmini arena); 7137 water (3051,4833) → 2713,4836; 7130 earth (3031,4825) → 2660,4839; 7129 fire (3029,4830) → 2584,4836; 7131 body (3039,4821) → 2527,4833; 7135 law (3049,4839) → 2464,4834; 7132 cosmic (3028,4837) → 2162,4833; 7134 chaos (3044,4842) → 2269,4843. Message "You step into the mysterious rift and end up in the <air|water|earth|fire|body|law|cosmic|chaos> temple". 7133 nature rift = money object (§3.2). Mind/death/blood rifts: none.

### 3.7 Woodcutting — trees give **coins** (CUSTOM)
`Woodcutting(name,lvl,xp,995,amount,obj,x,y,875)` (9490) → requires WCTimer≤0 and level; "You begin to cut the <name> tree."; sets stand-anim `pEmote=875`, `TreeTimer = base − floor(WC/4)` cycles. Each time WCTimer hits 0 while within Chebyshev 2 of the tree (`WC()` 9446): needs any axe (1349,1351,1353,1355,1357,1359,1361,6739 in inventory or worn; tier irrelevant) else "You need an axe to chop down this tree." + reset; adds XP and `amount` coins ("You cut and tree, and get some money!"), `TreeHP--`; after 20 chops → stump 1341 (§1.4) + "This tree has run out of logs" + reset. Walking resets (TreeHP back to 20). Level fail: "You need a woodcutting level of <lvl> to chop down this tree."
| Loc ids | Name | Lvl | XP per chop | Coins per chop | base timer |
|---|---|---|---|---|---|
| 1276,1277,1278,1279,1280,1282,1283,1284,1285,1286,1289,1290,1291,1315,1316,1318,1319,1330,1331,1332,1365,1383,1384,2409,3033,3034,3035,3036,3881,3882,3883,5902,5903,5904 | tree | 1 | 500×WC | 15,000 | 25 |
| 1281,3037 | oak | 15 | 1000×WC | 30,000 | 35 |
| 1308,5551,5552,5553 | willow | 35 | 1500×WC | 55,000 | 45 |
| 1307,4674 | maple | 45 | 2000×WC | 2,000,000 | 60 |
| 1309 | yew | 60 | 2500×WC | 85,000 | 85 |
| 1292 (dramen), 1306 | magic | 90 | 3000×WC | 5,000,000 | 100 |
(XP uses WC level at the moment of the first click.) No logs are ever given. `CheckObjectSkill` woodcutting table is commented out.

### 3.8 Agility (op1)
`Agility(msg,x,y,lvl,xp,24,803)` (9424): AgilityTimer 24 gate, instant teleport, anim 803; level fail "You need an agility level of <lvl> to use this obstacle.".
| Loc | Msg | Dest | XP | Lvl |
|---|---|---|---|---|
| 2283 wilderness_rope_swing | "You swing from the rope." | 3006,3958 | 8×Agility | 1 |
| 2311 stepping stone | "You cross the lava." | 2996,3960 | 6× | 1 |
| 2297 log balance | "You walk across the log." | 2994,3945 | 14× | 1 |
| 2328 rocks | "You climb the rocks." | 2996,3932 | 10× | 1 |
| 2288 obstacle pipe | "You squeeze through the pipe." | 3004,3950 | 8× | 1 |
| 2321 monkeybars (only if absY 9487-9495; Yanille dungeon) | at y=9494 & Agility≥80 → (absX,9488) "You swing across the monkey bars." + 40×Agility; at y=9488 & Agility≥80 & gloves 776 (Goldsmith gauntlet) → (absX,9494) "You swing accross the monkey bars." (no XP). Each of the two checks, when false, prints "You need an agility level of 80 to climb the monkey bars." + "You need to be wearing goldsmith gaunlets to climb the monkey bars." (so even a success prints the other branch's two failure lines). | | | |
| 2303 balancing ledge | y=9520 & ≥80 → (absX,9512) "You climb accross the ledge." + 40×Agility; y=9512 & ≥80 → (absX,9520) same msg, no XP; y=9520/9512 & ≤80 → "You need an agility level of 80 to climb this ledge." | | | |
| 1733 staircase | obj (2603,3078): gloves 776 required → (absX,absY+6397) else "You need to be wielding goldsmith gaunlets to use these stairs."; any other 1733 → (absX,absY+6397) | | | |
Course gates 2307/2308/2309 → door bug (§3.11 F).

### 3.9 Thieving crates (op1; `TheifStall` 9362: theifTimer gate, anim 832, "You steal from the <name>" + msg, no failure/stun/depletion; level fail "You need a theiving level of <lvl> to theif from this stall.")
| Loc | name / msg | Lvl | XP | Item | Delay |
|---|---|---|---|---|---|
| 354 crate2 | "secret crate" / "and recieve an item" | 99 | 20×Thieving | 1631 Uncut dragonstone | 40 |
| 355 crate3 | "crate" / "and steal a gnome" | 1 | 10× | 3257 Gnome | 40 |
| 361 boxes3 | "crate" / "and steal a cup of tea" | 1 | 10× | 4245 Cup of tea | 40 |
| 359 boxes | "boxes" / "and steal a basket of eggs" | 1 | 10× | 4245 Cup of tea | 40 |

### 3.10 Ladders / stairs (AUTH-ish mechanics, Allstar math)
| Loc ids | Behaviour |
|---|---|
| Down: 1568,1569,1570,1571 trapdoors; 1759,2113,1754,2147,5054,5130,5488 ladders; 1762,1763,1764 ropes; 3771; 54,56; 5947; 6434; 492; 9358 | obj (3097,3468) → 3096,9867; else (absX, absY+6400); height unchanged; no anim/msg |
| 1755 ladder up | obj (3097,9867) → 3096,3468; else (absX, absY−6400) |
| 1746,1740,5281,1749 | heightLevel−1, (absX, absY−1) |
| Up: 1747,1750,1738,1722,1734,55,57,5946,1757,2148,3608,2408,5055,5131,9359,2492 (essence portal),2406 (Zanaris door),5280, barrows stairs 6702-6707, 4772 | anim 828, heightLevel+1, same x,y |
| 1739 (op2/op3, §4) | `heightLevel ±1` only — no teleport sent, client not updated until next teleport (JUNK) |
| Slayer tower (AUTH-ish): 4487 door | h=0; absY 3535→(3428,3536), 3536→(3428,3535) |
| 4495 / 4496 / 4494 / 4493 stairs | h+1→(3417,3541) / h−1→(3412,3540) / h−1→(3438,3538) / h=1→(3433,3537) |
| 9319 / 9320 spikey chain | h+1 / h−1, same x,y |
| 10527 / 10529 doors | h=1; absY 3555↔3556 at x=3426 / 3427 |
| 5126 door | h=2; absY 3555→(3445,3554), 3554→(3445,3555) |
| 6672/6673 ToG climbing rocks ("Mod Allstar") | only objX 3239/3240; approach from east: anim 740, actionTimer 5, stage 1 → after 5 cycles x−1 → after 5 more x−1, anim reset (`startAnimation(1)`); from west: face west, anim 740, stage 100 → next cycle x+1, 5 cycles later x+1 |

### 3.11 Doors / gates (visual `ReplaceObject`, clicking player only; no server collision)
| Grp | Loc ids | Exact behaviour |
|---|---|---|
| A | 11993, 1537, 2427, 2429 (+fall-through from 1600/1601) | → id−1 at same tile; face −3 at (3231,3433)(3253,3431)(2719,9671)(2722,9671)(3109,3167)(3107,3162); −2 at (3234,3426)(3225,3293)(3230,3291)(3235,3406)(3276,3421)(3207,3210); −1 at (3233,3427)(3215,3225)(3207,3217)(3208,3211); else 0 |
| B | 1536 | → 1537; face −3 at (3235,3426)(3233,3438)(3207,3210); −2 at (3231,3433)(2611,3324); −1 at (3234,3426)(3225,3293)(3230,3291)(3241,3406)(3235,3406)(3276,3421)(3248,3396)(3260,3400); else 0 |
| C | double gates 1551/1552/1553/1556 | GateID1+face −3 at (3253,3266/3267),(3241,3301/3302); GateID2+face −3 at (3236,3284/3285/3295/3296); GateID2+face −2 at (3312,3234),(3237/3238,3284),(3237/3238,3295); else GateID 1 face 0. G1: 1553→ place 1552@(x−1,y−1),1556@(x−2,y−1), clear (x,y−1); 1551→1552@(x−1,y),1556@(x−2,y), clear (x,y+1); 1552→1551@(x+1,y),1553@(x+1,y+1), clear (x−1,y); 1556→1551@(x+2,y),1553@(x+2,y+1), clear (x+1,y). G2: 1553→1552@(x+2,y),1556@(x+1,y), clear (x,y+1); 1551→1552@(x+2,y−1),1556@(x+1,y−1), clear (x,y−1); 1552→1551@(x−2,y+1),1553@(x−2,y), clear (x−1,y); 1556→1551@(x−1,y+1),1553@(x−1,y), clear (x+1,y). Always finally clear (x,y). |
| D | large doors 1516/1517/1519/1520 | face −3/face2 −1 at (3217,3218/3219),(3213,3221/3222) else 0/0. 1516: 1517@(x−1,y) f, 1520@(x−1,y+1) f2, clear (x,y+1),(x,y). 1519: 1517@(x−1,y−1) f, 1520@(x−1,y) f2, clear (x,y),(x,y−1). 1517: 1519@(x+1,y+1) f, 1516@(x+1,y) f, clear (x,y+1),(x,y). 1520: 1519@(x+1,y) f, 1516@(x+1,y−1) f, clear (x,y),(x,y−1). |
| E | 2559 | → 1531 face −2 |
| F (BUG `objectID = +2`) | 2557 (f0), 2112 & 1512 (f −2), 2307/2308/2309 wildy course gates (f −1), 1533 except (3183,3434) (f0), 1530 (see I) | replaced by **loc 2** (`mcannoncave` "Cave Entrance") |
| G | 2558 pirate hut door, 1557/1558 Edgeville dungeon gates | → id+2, face 0 |
| H | 1533 at (3183,3434) | → 1531 face −1 |
| I | 1530 | obj (2716,3472) → loc 2 f −1; then by absX: 2564→(2563,3310), 2563→(2564,3310), 3246→(3247,3193), 3247→(3246,3193), 2575→(2576,absY), 2581→(2582,absY), 2576→(2575,absY), 2582→(2581,absY); unless absX==2582 → also loc 2 f −2 |
| J | 1596 membergatel / 1597 membergater | → 2630; 1596: x==2816 f −3, x==3008 f −2, else −3; 1597: x==2816 −3, x==3008 −2, else 0 (5959 lever falls into 1596 → lever replaced by 2630 f −3) |
| K | 8788 / 8787 / 8789 (mourner hideout) | 8788: absY 4633/4634 → (2037,4634); 8787: → (2042,4634); 8789: absX 2034→(2033,4636), 2033→(2034,4636) |
| — | 2213 bank booth op1 | `NpcWanneTalk=2`; when cross-distance ≤1: NpcDialogue 1 with NPC at (x,y−1): "Good day, how can I help you?" → options "What would you like to say?" / "I'd like to access my bank account, please." (→ bank 5292/5063) / "I'd like to check my PIN settings." (→ openUpPinSettings) |

### 3.12 Wilderness / Mage Arena (AUTH-ish, exact)
| Loc | Behaviour |
|---|---|
| 5960 lever | if absY==4712: tb else → 3090,3956 ("A magical force stops you from teleporting.") |
| 5959 lever | if absY==3956: tb else → 2539,4712; **no break** → then 1596 code replaces the lever with 2630 f −3 |
| 2878 / 2879 sparkling pools | → 2509,4689 / 2542,4718 |
| 9707 / 9706 levers | → 3105,3956 / 3105,3951, "You teleport inside..." |
| 733 web (no knife needed) | sequential: absX 3092→(3093,3957); 3093→(3092,3957); 3094→(3095,3957); 3095→(3094,3957); absY 3950→(3158,3952); 3952→(3158,3950); 3119→(absX,3118); 3118→(absX,3119); 3957→(absX,3959); 3959→(objX,3957) (later matches override) |
| 2873 / 2875 / 2874 god statues | `TakeCape(god, skill, 99, skill, 5000, cape, 1, 60, 645)` + resetanim 6: Saradomin = **Agility**≥99 → 2412, 5000 Agility XP; Guthix = **Herblore**≥99 → 2413, 5000 Herblore XP, then falls into Zamorak; Zamorak = **Runecrafting**≥99 → 2414, 5000 RC XP. theifTimer 60 gate. "You bow down to <god>" + "You recieve the cape of <god>." / "You need a <agility / herblore / runecrafting> level of 99 to pray to <god>." (skill name from `statName[]`, lowercase) |

### 3.13 Misc op1
| Loc | Behaviour |
|---|---|
| 2073-2078 banana trees | +1 banana 1963, "You pick a banana." — no timer, never depletes |
| 8689 fat_cow (Dairy cow) | 12×Farming XP, +1 1927 Bucket of milk (no bucket), "You get some milk" — no timer |
| 6552 dt_zaros_altar | spellbook toggle (§2) |
| 3192 scoreboard (5 placed) | `playerMenu()`: quest interface 8134, title "@dre@Players" (8144), "@red@Allstar-Scape" (8146), "@red@<name>" at 8147+playerIndex; plus "Players Online!", "For The Win!" |
| 2513/2781/… | §3.2 |
| 6912 lost_tribe_hole_2 | only destinationRange 3, no handler |
| 8987 portal (3082,3505), 4626 stairs (2892,9907), 3206 barrels, 362 barrel, 2417 chests, 4901 standards, 576/579 statues, 210/5981/3644/6416 lights, 1032 signs, 1116 hedges, 2832 battlements, 6472/6473/6477 ice, 6083 closed booths | no handler at all (pure decoration/blocking) |
| 4126 / 4121 / 4119 chests, 884 well | item-on-object only (§5, working) |
| 76 KQ chest, 7288 gmaul portal, 4483 bank chest | item-on-object handlers exist but are unreachable (§5) → inert in Allstar |

### 3.14 Area triggers tied to object content (process(), every cycle)
| Function | Box | Effect |
|---|---|---|
| `Dungeon1()` 9279 | 2549≤x≤2625, 9476≤y≤9535 (Yanille agility dungeon: 2321/2303/1733) | every 20 cycles: hit 3-23, "Poison from the dungeon starts to kill you!" |
| `KBDLair()` 9230 | 2630≤x≤2650, 9517≤y≤9546 (1728 trap-stairs destination) | every 40 cycles: hit 3-81, "You get hit!" |
| both, when `currentHealth==0` | (separate HP pool, set from HP at login, only reduced by these hits and 1728) | unequips/deletes **all** items, "Oh dear you are dead!", HP→99; KBDLair → 2889,3557; Dungeon1 → 3254,3420 |

---

## 4. objectClick2 (op2, 4286) and objectClick3 (op3, 4387)
| Loc | Behaviour |
|---|---|
| 2213, 2214, 2566, 3045, 5276, 6084, 11758 | `openUpBank()` immediately (frame248 5292/5063, items 5064) — placed 6083 booths are dead |
| Stalls (`TheifStall`, anim 832, no fail, no depletion, theifTimer gate) | 2562 gem "gem stall"/"and recieve 3m": lvl 60, 500×Thieving, 3,000,000 coins, delay 30 · 4878 "scimitar stall"/"and recieve 2m": 40, 300×, 2,000,000, 30 · 4877 "magic stall"/"and recieve 1m": 20, 125×, 1,000,000, 30 · 4876 "general stall"/"and recieve 500k": 1, 70×, 500,000, **15** · 2560 "silk stall"/"and recieve 9m": 99, 20×, 9,000,000, 30 · 4705 "Fish stall"/"and recieve a manta ray": 1, 500×, 1× 389 Raw manta ray, 30 · 4706 "Veg Stall"/"and recieve money???": 1, 500×, 100,000, 30 · 2565 "silver stall"/"and recieve 5m": 80, 750×, 5,000,000, 30 · 635 tea stall "."/".": 1, 5×, 250 coins, 30. Other stalls (baker 2561, fur 2563, spice 2564…): nothing. |
| 1739 | op2 `heightLevel++`, op3 `heightLevel--` (no position update) |
| 348 drawers1 (2611,3323) | cluelevel 1 & cluestage 2 & clueid 3 → "You find another clue!" + `newclue()` |
| 356 crate_old (2424,3081) | cluelevel 1 & clueid 4 → same + 1× 2682 Clue scroll |
| 357 crate2_old (2757,2951) | cluelevel 2 & cluestage 2 & clueid 5 → same |
`newclue()` (8163): clueid = random, cluestage+1, deletes 2681/2682/2683.

---

## 5. Item on object (packet 192, 18447-18865) — no distance check
Control flow (verified from braces): **Chain 1** (18484-18545): fountain-hash fishing → 436/438 smelting → 293 key @3028,3356. Independent `if`: 4151 on 1531. **Chain 2** (18546-18861): 293 @3268,3435 → 440/442/444 smelt → key chests 4126/4121/4119 → 447/449/451 smelt → bars on anvil → seeds → 317/377 on range 4172 → **`else if (995 && 884)` with no braces** — its body is `if (actionTimer==0) if (<70M) {…} else if (≥70M) {…} else if (389&&4172) … else {"Nothing interesting happens."}`, so every branch written after the well (Kalphite chest, gmaul portal/chest, shark & manta cooking, bone grinder, flax, range 2728, fire 2732, and the "Nothing interesting happens." fallback) is **unreachable**. Unmatched item/loc pairs therefore do nothing, silently.
| Item → Loc | Condition | Result |
|---|---|---|
| raw-packet hash `HexToInt(payload)` = b0×1000+Σ(b1..b11) | 12609 (comment: harpoon, inv slot 1, Varrock fountain 3240,3435) | Fishing≤79 → "You need to be lvl 80 fishing to catch shark." else `make()`: actionTimer==0 → +1 383 Raw shark, 17000×Fishing XP, "You catch a shark.", actionTimer 10, stand-anim 774 |
| | 12599 (lobster pot, fountain) | ≤59 → "You need to be lvl 60 fishing to catch lobster." else +1 377 Raw lobster, 10000×Fishing, "You catch a lobster." |
| | 12603 (big net, fountain) | +1 363 Raw bass, 10×Fishing, "You catch a bass." |
| | 12706 (lobster pot, well 2651,3370) | ≤98 → "You need to be lvl 99 fishing to catch sea turtle." else +1 395 Raw sea turtle, 70×Fishing, "You catch a turtle." |
| | 12716 (harpoon, well) | ≤110 → "You need to be lvl 90 fishing to catch manta rays." (unreachable at normal levels) else +1 389, 200×Fishing, "You catch a manta ray." |
> Hash matching is on the whole 12-byte payload (component id, loc id, coords, slot, item); it only fires for the exact combination the author used (and any byte-sum collision). The 377 Varrock palace fountain is 879 at 3238,3434 — the hashes do not reproduce with that, so treat the comments as the design intent. All five share actionTimer 10.
| 4151 Abyssal whip → 1531 door | — | "Works fool." + first time: "Hidden found", "You gain a hidden point!", hiddenPoints+1 (foundz[2]) |
| Ores → furnace 2781 / 11666 / 9390 (lava forge) | actionTimer==0; no level, no coal | 436 Copper→`Copper()` / 438 Tin→`tin()`: 1 ore → 1 2349 Bronze bar, 5×Smithing, "You make a Bronze bar."; 440→2351 Iron bar 10×, "You make an iron bar."; 442→2355 Silver bar 15×, "You make a silver bar."; 444→2357 Gold bar 15×, "You make a gold bar."; 447→2359 Mithril 20×, "You make a mith bar."; 449→2361 Adamantite 30×, "You make a adamant bar."; 451→2363 Runite 45×, "You make a rune bar."; each actionTimer 10, anim 899. Steel (coal) branch commented out. |
| 293 A key → tile (3028,3356) | — | if absY==3355 → (absX, absY+2) else → (3028,3355) |
| 293 A key → tile (3268,3435) | — | → 3255,9581 "No turning back now" (black dragon cave) |
| Keys → 4126 silver chest (2465,4817, gsmini reward) | — | "Well done, you have just finished your mini game, here's your reward :)" then → 2845,4832: 601 Keep key → 15336 Zamorak GodSword + 300000×Magic XP; 758 Key → 15334 Bandos Godsword + 300000×Magic; 788 Glough's key → 30,000,000 coins + 300000×Magic; 983 Brass key → 10,000,000 coins (0 XP). Key removed. |
| Keys → 4121 black chest (2794,9326) | — | same message, → 2853,3591: 6104 New key → 7400 Enchanted hat; 989 Crystal key → 7399 Enchanted top; 991 Muddy key → 7398 Enchanted robe (**bug: deletes 6104, not 991**) |
| Keys → 4119 steel chest (2866,9956) | — | same message, → 2853,3591: 1543 Key → 14643; 1546 → 14645; 1545 → 14644; 1548 → 14646 (unnamed shields, `Item4.shields[]`) |
| 995 Coins → 884 well (2860,3591) | actionTimer==0 (else silent) | need ≥70,000,000 coins ("You Need 70m to drop in the well") → remove 70M, "YOUR WISH HAS CAME TRUE!", +1 random of {15195 Dragon Full Helm, 15185 Dragon fire Shield, 15348 Bandos Chestplate, 14520 Amulet of strength(t), 15334 Bandos Godsword, 7449 Allstar's Hammer, 15346 Armadyl chestplate} (uniform, `Item2.well[]`), "Unfortanatly you need to wait 1 HOUR to make another wish!", actionTimer 3600 (=30 min) |
| **UNREACHABLE (intended design, never worked):** 989 Crystal key → 76 chest (3469,9488 KQ) | — | +1037 Bunny ears, +1050 Santa hat, +6570 Fire Cape, "You use the key on the chest, and you get kalphite items!" |
| UNREACHABLE: 3741 Frozen key → 7288 portal (2890,3545) | — | key removed → 3052,3440 "Kill the unicorn for the prison key, use it on the chest and get a g maul!" |
| UNREACHABLE: 6966 Prison key → 4483 bank chest (3054,3437) | — | +4153 Granite maul, "You use the key on the chest, and recieve a granite maul!!" |
| Bars → 2783 anvil | — | 2349/2351/2353/2359/2361/2363 → `initSmithing(bar)` opens smithing interface 994 with bar-count/level colouring. Production: interface-item packets (22711+) → `smithing()` 31587: hammer 2347 in bag, level/bars from `Item.smithing_frame`, "You start hammering the bar...", anim 898, 7 cycles, XP = (int)(12.5×bars×barTier×smithing[3]), "You smith a <item>.", repeats with 5-cycle gaps. |
| Seeds → patch 8151 / 7848 / 8553 / 8552 | level check | instant herb, "You put the seed on the patch and get an herb" / "You need atleast <lvl> farming to plant this!", stand-anim 2097: 5291 Guam→249 (lvl 1, 5×Farming XP) · 5292→251 Marrentill (15, 10×) · 5293→253 Tarromin (25, 15×) · 5294→255 Harralander (30, 38×) · 5295→257 Ranarr (40, 47×) · 5296→2998 Toadflax (50, 60×) · 5297→259 Irit (60, 70×) · 5298→261 Avantoe (65, 150×) · 5299→263 Kwuarm (75, 200×) · 5300→3000 Snapdragon (80, 555×) · 5301→265 Cadantine (90, 915×) · 5302→2481 Lantadyme (95, 1225×) · 5303→267 Dwarf weed (96, 1375×) · 5304→269 Torstol (1, 1700×) |
| Raw fish → 4172 range (2381,3438; 2511,3864) | no level, never burns, no timer | anim 883; 317→315 Shrimps 100×Cooking "You cook a shrimp"; 377→379 Lobster 150× "You cook a lobster". (Shark/manta branches unreachable, below.) |
| UNREACHABLE: 389→4172 | — | 391 Manta, 300×Cooking, "You cook a manta ray." (a 2nd copy: 250×, "You cook a manta ray") |
| UNREACHABLE: 383→4172 | — | 385 Shark, 200×Cooking, "You cook a shark" |
| UNREACHABLE: any → 2728 range | — | `cookItem(item)` (9873): 317 lvl 0, 377 lvl 39, 383 lvl 85, 395 lvl 90, 389 lvl 95; burn roll, cooking gauntlets 775 |
| UNREACHABLE: bones → 5284 bone grinder | — | "You grind the <name> and recieve prayer xp.": 4834 Ourg 240×Prayer, 4832 Raurg 190×, 4830 Fayrg 170×, 4812 Zogre 115×, 534 Babydragon 120×, 536 Dragon 152× |
| UNREACHABLE: 1779 Flax → 2644 spinning wheel | — | +1777 Bow string, 15×Crafting, "You spin the flax" |
| UNREACHABLE: 2166 → 2732 fire | — | +4653 Fire object |
| UNREACHABLE fallback | — | "Nothing interesting happens." (so unmatched uses are silent) |

---

## 6. Buttons (packet 185, 23437-24420). id → real component (LC name). Unlisted ids → `parseIncomingPackets2()` (empty) = nothing.

### 6.1 Emote tab = teleport menu (CUSTOM). Emotes themselves never animate (no emote handler exists).
All teleports: button checks `teleblock` → "A magical force stops you from teleporting."; then `customCommand(cmd)` (actionAmount+1; checks teleblock again). Instant, height unchanged, no anim.
| id / comp (LC) | Emote | Action | Dest | Message |
|---|---|---|---|---|
| 168 / controls:com_20 | Yes | `home` | 2853,3591 | "You teleport to Home." |
| 169 / com_21 | No | `train` | 3209,2801 | "You teleport to the Training Area!" |
| 164 / com_16 | Bow | `shops` | 2738,3464 | "You teleport to the Shopping Area!" |
| 165 / com_17 | Angry | `pkbox` | 3306,9375 | "You teleport to the PkBox" |
| 170 / com_22 | Laugh | `gsmini` (no inner tb check) | 2845,4832 | "Welcome godsword mini game, kill the monsters to advance rounds", "The monsters hp starts at 150 then next monster is 250 and so on", "If you PK here YOUR BANNED!" |
| 171 / com_23 | Cheer | `barrows` | 3565,3306 | "You teleport to the Barrows!" |
| 163 / com_15 | Wave | `teampk` | 3243,3517 | "You teleport to the Team Pk area!" |
| 167 / com_19 | Beckon | `guilds` | 2757,3496 | "You teleport to the Guild Portals!" |
| 172 / com_24 | Clap | `slayer` | 3428,3536 | "You teleport to slayer tower, hit the chests for slayer exp!" |
| 166 / com_18 | Dance | `skill` | 2380,3427 | "You teleport Allstar-Scape's Skill Area!" |
| 13362 / (com_55 Panic) | Panic | `mining` → 2823,3001 "You teleport to the Shilo Village Mining!" | **unreachable** (13362 can't be produced by HexToInt; real Panic arrives as 52050) | JUNK |
| 13363 / (com_56 Jig) | Jig | `Shilo` — no such command | unreachable + no handler | JUNK |
| 161 / com_13 | Cry | `capeEmote()` (§6.2) | | |
| 162 / com_14 | Think | "vengeance": if actionTimer==0 → actionTimer 10, gfx 401 on self, sets strPot vars (no stat change), `attackPlayersWithin(gfx 600, max 17, range 1)` = every other player within 1 tile (int-truncated Euclidean, diagonals included) who is in the wilderness takes random 0-17 with gfx 600; anim 2890; forced chat "Die Like The Rest Bitch...!"; closes windows. **Always** then "You use vengence!" | | |

### 6.2 Skillcape emote (`capeEmote()` 1066, button 161). Cape slot → gfx list (stillgfx on self), anim, forced chat, +1 boost (level set to base+1, frame126 on 4016)
| Cape item(s) | gfx | anim | text | boost |
|---|---|---|---|---|
| 14073 Att Cape, 14074 Att Cape (t) | 346,427,83 | 2890 | "An attack skill cape." | Attack +1 |
| 14076 Str Cape, 14077 (t) | 406,327,436 | 750 | "A strength skill cape." | Strength +1 |
| 14079 Def Cape, 14080 (t) | 8,57,240 | 2720 | "A defence skill cape." | Defence +1 |
| 14094 Hp Cape, 14095 (t) | 444,574,199,293 | 1500 | "A hitpoints skill cape." | HP +1 |
| 14082 Range Cape, 14083 (t) | 472,474,325,0 | 426 | "A ranging skill cape." | Ranged +1 |
| 14085 Pray Cape, 14086 (t) | 293,281,327,431 | 1331 | "A prayer skill cape." | Prayer +1 |
| 14088 Magic Cape | 409,498,497 | 811 | "A magic skill cape." | Magic +1 |
| 14127 Cook Cape, 14128 (t) | 563 | 883 | "A cooking skill cape." | Cooking +1 |
| 14133 Wc Cape, 14134 (t) | 187,247 | — | "A woodcutting skill cape." | WC +1 |
| 14109 Fletch Cape, 14110 (t) | 588 | — | "A fletching skill cape." | Fletching +1 |
| 14124 Fish Cape | 68 | — | "A fishing skill cape." | Fishing +1 |
| 14130 Firemaking Cape | 453,446 | — | "A firemaking skill cape." | — |
| 14105 (item.cfg "Thieve Hood") | 239 | — | "A crafting skill cape." | — |
| 14121 Smith Cape | 436 | — | "A smithing skill cape." | Smithing +1 |
| 14118 Mining Cape | 287 | — | "A mining skill cape." | — |
| 7638 (item.cfg "Silvthrill rod") | 267,255,259,352 | — | "An herblore skill cape." | — |
| 7634 (item.cfg "Crumbling tome") | 422,60,62 | 747 | "An agility skill cape." | — |
| 14103 Thieve Cape, 14104 (t) | 421,143 | — | "A thieving skill cape." | Thieving +1 |
| 14112 Slayer Cape, 14113 (t) | 466,468 | — | "A slayer skill cape." | Slayer +1 |
| 14136 Farming Cape | 568,569,593 | — | "A farming skill cape." | — |
| 14091 Runecrafting Cape | 111,185,186 | — | "A runecrafting skill cape." | — |
| 15713 Summoning Cape, 15714 | 346,427,83 | 2890 | "A Summoning skill cape." | **Attack** +1 |
| 7676 (item.cfg "Wooden shield.") | 350,448,474 | — | "A hunter skill cape." | — |
(No cooldown; can be spammed. Capes are awarded on reaching 99 by `levelup()`, e.g. Attack → 14073+14074+14075.)

### 6.3 Prayers (components prayer:*). No level/points requirement to activate; no server-side glow (client toggles its own). Drain: every cycle `PrayerTimer−1`; when ≤1 and any prayer on: −1 prayer point, `PrayerTimer = PrayerDrain`. `newdrain()`: if another prayer already active keep the faster (smaller) drain, else take the new one. At 0 points: all off + "You have run out of prayer points".
| id | Prayer | NewDrain (cycles/point) | Server effect |
|---|---|---|---|
| 21233 | Thick Skin | 40 | none (flag unused) |
| 21234 | Burst of Strength | 40 | none (`StrPrayer` never set) |
| 21235 | Clarity of Thought | 40 | none |
| 21236 | Rock Skin | 30 | none |
| 21237 | Superhuman Strength | 30 | none |
| 21238 | Improved Reflexes | 30 (no `noprayer()` first; off only while DrainPray) | none |
| 21239 | Rapid Restore | 20 | none |
| 21240 | Rapid Heal | 20 (no `newdrain()`) | none |
| 21241 | Protect Item | 20 — turns on only if no other prayer active | none (flag unused) |
| 21242 | Steel Skin | 20 | none |
| 21243 | Ultimate Strength | 20 | none |
| 21244 | Incredible Reflexes | 20 | none |
| 21245 | Protect from Magic | 15; `ResetProtPrayers()` turns off ALL other prayers; headIcon 4 | PvP: blocks all enemy **player** magic attacks ("This player is in a safe zone and cannot be attacked") and all melee/range |
| 21246 | Protect from Missiles | 15; turns off all others; headIcon 2 | PvP: target immune to all player melee/range |
| 21247 | Protect from Melee | 15; turns off all others; headIcon 1 | PvP: target immune to all player melee/range |
Any protect prayer = full PvP immunity to melee+range (24936); no effect vs NPCs. Retribution/Redemption/Smite (683-685): no handler.

### 6.4 Other buttons
| id → comp (LC) | Behaviour |
|---|---|
| 29063 → combat_axe:specbar | Weapon 1377 (DBA): special<100 → "You do not have enough special energy left."; ≥100 → anim 1670, gfx 246 on self, special −100 (no stat boost). Then redraw bars. |
| 29113 bow / 33033 halberd (inter_178:com_20) / 29163 hacksword / 29138 stabsword / 48023 whip specbar | toggle `usingSpecial`, redraw bars (effects live in combat code) |
| (process) | special +1% every 4 cycles; bars 12323, 7574, 7599, 7549, 8493, 7499 force-shown every cycle; text "S P E C I A L  A T T A C K" coloured @yel@ when active |
| 153 controls:com_5 / 152 com_4 | run on (only if energy>0) / walk |
| 9154 logout:try_logout | LogoutDelay≥1 → "You must wait 10 seconds after combat to log out!" else logout + save |
| 9125-9128, 22228-22230, 48009-48010, 21200-21203, 1078-1080, 6168-6171, 6234-6236, 17100-17102, 8234-8237, 33018-33020, 18077-18080 (combat style comps) | FightType/SkillID: Accurate=1/0, Defensive=4/1, Controlled=3/3, Aggressive=2/2. NPC-kill XP per hit: Acc 750×hit→Atk, Agg 750×→Str, Def 750×→Def, Ctrl 700×→**Str**; always +200×hit HP (`CombatExpRate`=1). Max-hit divisor differs per style (29394). |
| 21011 bank_main:com_94 / 21010 com_93 | withdraw as item / as note |
| 13092 trademain:accept / 13218 tradeconfirm:accept | trade status 3 / 4 ("Waiting for other player..." on 3431 / 3535) |
| 9157 multi2:com_1 / 9158 multi2:com_2 (2-option chat) | first match: NpcDialogue 2 → bank / PIN settings; 4 (Aubury) → shop 2 / dialogue 5; 41 & 43 → "You board the ship." (boat 1/2, traveltime 30) / close; 302 → 303 & q3stage=1 / 300; 306 → 307 (opt1 only); 305 → close (opt2 only); **0 → 1340 + "Mmk thanks for reading!"** (quirk §3.1); 1340 → (opt2) "Fine, you suck!"; 14601→14602 / close; 14603→14604 / close; 2260 Mage of Zamorak → "You teleport to the abyss." 3040,4842 / close; 1002 Dark Mage → gfx 435, toggle spellbook "The dark mage converts back to normal magic!" / "The dark mage converts you to ancient magicks!" / close; duelring → 2837,9581 h0 "You teleport to the TzTok-Jad's lair" + "As you materialize, you feel the air around you grow hot" / 3040,4840 h0 "You teleport to the abyssal rift" + "You can feel the magical aura in the air"; OptionObject 2466 → Saradomin / Zamorak (§3.1); JunaTele → pass / "Ya ma." |
| 9178-9181 multi4:com_1-4 (god-book menu from item op2 on 3840/3842/3844) | forced-chat sequences, 7 cycles apart: **Holy** Wedding: "In the name of Saradomin," → "Protector of us all," → "I now join you in the eyes of Saradomin." · Last rights: "Thy cause was false, thine skills did lack," → "See you in Lumbridge when you get back." · Blessing: "Go in peace in the name of Saradomin," → "May his glory shine upon you like the sun." · Preach: "Protect yourself, protect your friends," → "Mine is the glory that never ends," → "This is Saradomin's wisdom." **Unholy** Wedding: "Two great warriors, joined by hand," → "To spread destruction across the land," → "In Zamorak's name, now two are one." · Last: "The weak deserve to die," → "So that the strong may flourish," → "This is the creed of Zamorak." · Blessing: "May your bloodthirst be never sated," → "And may all your battles be glorious," → "May Zamorak bring you strength." · Preach: "Strike fast, strike hard, strike true," → "The strength of Zamorak will be with you," → "Zamorak give me strength." **Balance** Wedding: "Light and dark, day and night," → "Balance arises from contrast," → "I unify thee in the name of Guthix." · Last: "Thy death was not in vain," → "For it brought some balance to the world." → "May Guthix bring you rest." · Blessing: "May you walk the path, and never fall," → "For Guthix walks beside thee on thy journey." → "May Guthix bring you balance." · Preach: "The trees, the earth, the sky, the waters," → "All play their part upon this land." → "May Guthix bring you balance." |
| Leather crafting (leather_crafting comps) | 33190 (8638): thread≥1 → 1059 Leather gloves, −1 thread −1 leather, 20×Crafting, "You make some gloves!" (leather not checked) · 33193: thread≥1, Crafting≥4 → 1061 boots, 40× · 33205: thread≥2, ≥9 → 1167 cowl (−2 thread −1 leather) 60× "You make a leather cowl!!" · 33196: thread≥2, ≥14 → 1063 vambraces 80× · 33199: leather≥1 & thread≥6, ≥34 → 1095 chaps (−4 thread −2 leather) 140× "You make some leather chaps!!" · 33187: thread≥15 & leather≥1, ≥29 → 1129 body (−5 thread −3 leather) 120× "You make a leather body!!" · 33202: thread≥2 & leather≥1, ≥34 → 1169 coif (−2 thread −1 leather) 140× "You make a coif!!". Fail msgs: "You havnt got any thread!" / "You need 6 thread and 1 piece of soft leather to make this!" / "You need 15 thread and 1 pieces of soft leather to make this!" / "You need 2 thread and 1 piece of soft leather to make this!" (also shown when level is too low) |
| 4135 magic:bones_to_bananas | "bars to ores": no runes, no real level check; "You turn the bars into ores..." then converts ONE of each bar held: 2349→436, 2351→440, 2353→**453 Coal**, 2355→442, 2357→444, 2359→447, 2361→449, 2363→451; none → "...but you have no bars to convert" |
| 1097 combat_staff_2:auto_choose / 7212 staff_spells:cancelspell | attack tab ← 1829 / ← 328 (UI only; spell selection not handled → no autocast) |
| 14067 player_kit:accept, 9118 (leather_crafting:com_89) | close windows |
| 28164-28180, 28215 (questlist lines) | no-op |
| 130 | debug print |
| 3162/3163 options:com_25/26 (music volume) | InWildrange=true/false — overwritten next cycle (JUNK) |
| 24135/24134 options_ld:com_9/8 | "Clue debugging set to true." / "...false." (JUNK) |
| All spellbook teleports (Varrock 1164…Ghorrock) | **not handled** (would arrive as 4140/4143/4146/4150/6004/6005/29031/50235…); no spell teleports exist server-side |

---

## 7. `TeleTo` (5885) and `TeleToAdvanced` (6065) + `Teleport.cfg` — both **never called** (JUNK), intended data:
| Spell | TeleTo dest (h) | TeleTo XP | Teleport.cfg (lvl; runes; dest h; XP) | LC `skill_magic/configs/magic_spells.dbrow` |
|---|---|---|---|---|
| Varrock | 3210,3424 (0) | 20×Magic | 25; 3 air 556,1 fire 554,1 law 563; 3213,3425 (0); 5 | 3213,3424 h0 |
| Lumbridge ("Lumby") | 3222,3218 (0) | 40× | 31; 3 air,1 earth 557,1 law; 3218,3218 (0); 7 | 3221,3218 h0 |
| Falador | 2964,3378 (0) | 30× | 37; 3 air,1 water 555,1 law; 2965,3380 (0); 12 | 2965,3378 h0 |
| Camelot | 2757,3477 (0) | 50× | 45; 5 air,1 law; 2757,3480 (0); 17 | 2757,3478 h0 |
| Ardougne ("Ardy") | 2662,3305 (0) | 120× | 51; 2 water,2 law; 2661,3305 (0); 20 | 2661,3301 h0 |
| Watchtower ("WTower") | 2549,3113 (0) | 150× | 58; 2 earth,2 law; 2550,3112 (**2**); 23 | 2933,4713 h2 (LC row) |
| Trollheim ("THeim") | **2480,5174** (0) (TzHaar city) | 400× | 61; 2 fire,2 law; 2480,5174 (0); 26 | not in LC table |
| Ape Atoll ("Ape"/"AAtoll") | 2761,2784 (1) | 400× | 64; 2 fire,2 water,2 law + 1 banana 1963; 2761,2784 (1); 30 | not in LC table |
| Paddewwa | 3131,9912 (0) | 150× | — | not in LC |
| Senntisten | 3312,3376 (0) | 200× | — | not in LC |
| Kharyrll | 3493,3485 (0) | 25× | — | not in LC |
| Lasaar | 3007,3477 (0) | 350× | — | not in LC |
| Carrallangar | 3161,3671 (0) | 400× | — | not in LC |
| Annakarl | 3288,3886 (0) | 550× | — | not in LC |
| Ghorrock | 3091,3963 (0) | 650× | — | not in LC |
TeleTo: works if !teleblock && actionTimer≤7 (level/runes/wildy only mentioned in else-branch messages), then actionTimer 10. TeleToAdvanced: `Tele = name RTID MLvl RuneTypes R1 R2 R3 Item X Y H XP R1Amt R2Amt R3Amt ItmAmt` (tab-separated); only fires when `RTID == RandomNum` (cmd→1, mage→random(25), all entries RTID 0) — effectively never; 2-rune+item branch deletes Rune2 with R1Amt (bug).

---

## 8. Config / data files
| File | Loaded by | Format | Status / custom entries |
|---|---|---|---|
| `WorldObjects.cfg` | `WorldObject.java` — class **never instantiated** | `object = X Y ID face type height comment` (tab), end `[End of World Objects]`; face 0=W −1=N −2=E −3=S | JUNK. 6 entries: id −1 (remove) at 2671,2593 2671,2592 2656,2585 2657,2585 2643,2593 2643,2592 "pest control no door" |
| `Config\objects.cfg` | `ObjectHandler()` (`config\\objects.cfg`) | `object = objID X Y height face type(1=Y+1,2=X+1,3=Y−1,4=X−1) open? comment`, end `[ENDOFOBJECTLIST]` | Inert: door state never changes (`doors` never set) → auto-close (MaxOpenDelay 120) and login `ChangeDoor` never trigger. 17 Lumbridge door rows (1530/1531/1533/1536). AUTH. |
| `data\Objects.cfg` | nothing | `ObID = ClsdID X Y CDir OpenID OpenX OpenY ODir`; `Stall = StallID X Y SDir Lvl Exp Stat ItemA SType` | JUNK: 34 Varrock doors (1530/1531/1528, 2550 Ardougne), 8 Ardougne market stalls |
| `data\staticnpcs.dat` | nothing | `x,y,npcId,height,walk, comment` | JUNK: 3085,3230 & 3086,3227 327 Fishing spot; 3094,3244 494 Banker (Draynor) |
| `data\spawnpoint.dat`, `data\notes.dat` | spawnpoint unused (empty) | — | JUNK |
| `itemspawnpoints.java` | `server` main loop, every cycle | hard-coded | CUSTOM: every 99 cycles spawns ground items 2414 Zamorak cape @3118,9848, 2412 Saradomin cape @3119,9848, 2413 Guthix cape @3120,9848 (controller = `globalItemController[0]`, normally 0 → hidden for 60 cycles, shown to all for cycles 60-120, then hidden; visible ~60 of every 99 cycles) → free god capes in the Edgeville-dungeon training room. Slots are never freed unless picked up (removeItemAll is visual only) → the shared 5001-slot ground-item table fills after ~23 h uptime, after which no ground items (incl. NPC drops) can spawn |
| `Teleport.cfg` | `TeleToAdvanced` (dead) | see §7 | JUNK |
| `ObjectHandler.java` | server | arrays for doors (above) + fires (`FireDelay` 80, `FireGianDelay` 10) | fires AUTH-ish, doors inert |

---

## 9. JUNK / bug list (keep or drop deliberately)
- Unreachable code: `case -1/-2` stair tables in `objectClick` (2809-3001) incl. TzHaar doors 9356/9357 → 2413,5117 and mining-guild 60 req; `stairs()` system; `CheckObjectSkill()` and `Mining()` (9591) (never called → **no normal mining exists**, incl. rune essence 2491; only the 2111 gem-rock money object); `TeleTo`/`TeleToAdvanced`; `WorldObject`; `data\Objects.cfg`; `staticnpcs.dat`; 13362/13363 buttons; `OBJECTS()`; packet 234.
- Item-on-object brace bug (§5): Kalphite chest (989→76), gmaul portal/chest (3741→7288, 6966→4483), shark/manta cooking on 4172, bone grinder 5284, flax 2644, range 2728 `cookItem`, fire 2732, and the "Nothing interesting happens." fallback are all unreachable.
- Fall-throughs: 132→252; 16→192; 1600→1601→door swap; 5959→1596; 2875→2874; 75→299.
- `objectID = +2` door bug (loc 2 shown) — §3.11 F. Law altar gives earth runes. 2182 coordinate mismatch. 991 key deletes 6104. Manta branch duplicated. Well message says 1 hour, timer is 30 min. Monkey-bar double messages. 7316 message says Range and Magic, checks Range only. Summoning cape boosts Attack. 2 placement typos (2854,3957; 3442,3520).
- Height never reset on emote/portal teleports; `1739` height change not sent.
- Admin debug prints (`playerName == "admin"`), `::object`/`::make` dev commands.
- Random 1-in-3,000,000 per cycle teleport to 3387,9786 in `process()` (17182).

---

## Appendix A — `NewObjects()` placements (509 rows, source order; CSV)
Columns: n, src_line (client.java), x, y, loc, raw_face (as written), rot (=face&3, value sent), type (always 10), area (label from §1.2), allstar_comment, lc377_debugname, lc377_name, dup (DUP = exact repeat of an earlier row). Height: none (client's current plane).

```csv
n,src_line,x,y,loc,raw_face,rot,type,area,allstar_comment,lc377_debugname,lc377_name,dup
1,1820,2510,3863,2783,-3,1,10,MISCELLANIA(bankhome/fish/shops/wc),Anvil,anvil,Anvil,
2,1821,2843,2964,61,-3,1,10,SHILO(old-home),Ancient Alter,thrantaxaltar,Chaos altar,
3,1822,3042,4843,2781,0,0,10,ABYSS_FURNACE,Furnace,furnace1,Furnace,
4,1823,2378,3438,2287,-1,3,10,SKILL_AREA,Obstacle Pipe,barbarian_obstacle_pipe,Obstacle pipe,
5,1824,2380,3440,2193,0,0,10,SKILL_AREA,Chest,loc_2193,Chest,
6,1825,2383,3427,3816,1,1,10,SKILL_AREA,Kitchen Drawers,eadgar_kitchen_drawers,Kitchen Drawers,
7,1826,2572,3853,9398,-2,2,10,MISCELLANIA(bankhome/fish/shops/wc),shopportal,loc_9398,Bank Deposit Box,
8,1827,2856,3598,7324,0,0,10,HOME,blue portal,rd_portal_room6_entrance,Portal,
9,1828,2381,3438,4172,-1,3,10,SKILL_AREA,Range,viking_seer_range,Cooking range,
10,1829,2854,3957,61,2,2,10,HOME?-typo(y3957),Ancient Alter,thrantaxaltar,Chaos altar,
11,1830,2852,2953,4389,0,0,10,SHILO(old-home),shopportal,castlewars_saradomin_exit,Portal,
12,1831,2855,3598,2466,-2,2,10,HOME,red portal,mindtemple_exit_portal,Portal,
13,1832,2868,9883,2213,0,0,10,HEROES_BASEMENT(pk-barrel),bank,bankbooth,Bank booth,
14,1833,2868,9882,2213,0,0,10,HEROES_BASEMENT(pk-barrel),bank,bankbooth,Bank booth,
15,1834,2868,9881,2213,0,0,10,HEROES_BASEMENT(pk-barrel),bank,bankbooth,Bank booth,
16,1835,2859,9881,2213,0,0,10,HEROES_BASEMENT(pk-barrel),bank,bankbooth,Bank booth,
17,1836,2859,9882,2213,0,0,10,HEROES_BASEMENT(pk-barrel),bank,bankbooth,Bank booth,
18,1837,2864,9881,2932,0,0,10,HEROES_BASEMENT(pk-barrel),thing,skullcavebarrel,Barrel,
19,1838,2863,9881,2932,0,0,10,HEROES_BASEMENT(pk-barrel),thing,skullcavebarrel,Barrel,
20,1839,2511,3864,4172,0,0,10,MISCELLANIA(bankhome/fish/shops/wc),Range,viking_seer_range,Cooking range,
21,1840,2895,3512,2213,0,0,10,BURTHORPE/HEROES_GUILD,bank,bankbooth,Bank booth,
22,1841,2895,3509,2213,0,0,10,BURTHORPE/HEROES_GUILD,bank,bankbooth,Bank booth,
23,1842,2892,9907,4626,0,0,10,HEROES_BASEMENT(pk-barrel),Stairs,board_game_stairs_grey_base,Stairs,
24,1843,2465,4817,4126,0,0,10,LAW_ALTAR(gsmini-reward),silver chest,shadechest_silver_bloodred,Silver Chest,
25,1844,3306,3204,2783,0,0,10,AL_KHARID,anvil,anvil,Anvil,
26,1845,2373,3433,4877,0,0,10,SKILL_AREA,general stall,mm_stall_magic,Magic Stall,
27,1846,2373,3435,2562,-1,3,10,SKILL_AREA,gem stall,gem_stall_stealing,Gem stall,
28,1847,2373,3434,4878,0,0,10,SKILL_AREA,scimitar stall,mm_stall_scimitar,Scimitar Stall,
29,1848,2373,3432,4876,0,0,10,SKILL_AREA,magic stall,mm_stall_general,General Stall,
30,1849,2373,3437,2565,-1,3,10,SKILL_AREA,silver stall,silver_stall_stealing,Silver stall,
31,1850,2373,3439,2560,-1,3,10,SKILL_AREA,silk stall,silk_stall_stealing,Silk stall,
32,1851,2892,3512,6552,-3,1,10,BURTHORPE/HEROES_GUILD,magic altar,dt_zaros_altar,Altar,
33,1852,2768,2756,362,-3,1,10,APE_ATOLL,barrel,barrel,Barrel,
34,1853,3565,3308,4156,0,0,10,BARROWS,portal,vt_mazeportal_7,Portal,
35,1854,3303,3123,2472,0,0,10,SHANTAY_PASS,portal,lawtemple_exit_portal,Portal,
36,1855,2901,3557,2213,0,0,10,BURTHORPE/HEROES_GUILD,bank,bankbooth,Bank booth,
37,1856,3228,9318,7319,0,0,10,UNDERGROUND_3228_9318(memberportal),memberportal,rd_portal_room4_exit,Portal,
38,1857,3114,9844,75,-3,1,10,EDGE_DUNGEON_TRAINING_ROOM,chest,arena_guard_chest_shut,Chest,
39,1858,3114,9843,75,-3,1,10,EDGE_DUNGEON_TRAINING_ROOM,chest,arena_guard_chest_shut,Chest,
40,1859,3114,9842,75,-3,1,10,EDGE_DUNGEON_TRAINING_ROOM,chest,arena_guard_chest_shut,Chest,
41,1860,3118,9836,299,-1,3,10,EDGE_DUNGEON_TRAINING_ROOM,haystack,haystack2,Hay Bales,
42,1861,3121,9842,2416,-1,3,10,EDGE_DUNGEON_TRAINING_ROOM,strength,loc_2416,Lever,
43,1862,3116,9846,2213,0,0,10,EDGE_DUNGEON_TRAINING_ROOM,bankz,bankbooth,Bank booth,
44,1863,2605,3157,2213,-1,3,10,FIGHT_ARENA(icon-minigame),banks,bankbooth,Bank booth,
45,1864,2976,3402,1276,-1,3,10,FALADOR_N_TREES,regtree,tree,Tree,
46,1865,2982,3398,1308,-1,3,10,FALADOR_N_TREES,willowtree,willowtree,Willow,
47,1866,2982,3403,1307,-1,3,10,FALADOR_N_TREES,mapletree,mapletree,Maple tree,
48,1867,2978,3404,1309,-1,3,10,FALADOR_N_TREES,yewtree,yewtree,Yew,
49,1868,2979,3402,1306,-1,3,10,FALADOR_N_TREES,magictree,magictree,Magic tree,
50,1869,3114,9836,61,0,0,10,EDGE_DUNGEON_TRAINING_ROOM,altar,thrantaxaltar,Chaos altar,
51,1870,3121,9838,2513,0,0,10,EDGE_DUNGEON_TRAINING_ROOM,target,loc_2513,Target,
52,1871,3469,9488,76,-3,1,10,KQ_LAIR,kalphitechest,arena_guard_chest_open,Chest,
53,1872,2890,3545,7288,0,0,10,BURTHORPE/HEROES_GUILD,gmaulportal,rd_portal_room2_entrance,Portal,
54,1873,3054,3437,4483,0,0,10,GMAUL_CHEST,bankchest,castlewars_bankchest,Bank chest,
55,1874,3096,3468,767,0,0,10,EDGEVILLE/WILD_WALLS,chest,floor_depth2,,
56,1875,3426,3536,2213,-1,3,10,SLAYER_TOWER,bankbooth,bankbooth,Bank booth,
57,1876,3429,3539,104,-2,2,10,SLAYER_TOWER,openchest,ikov_chestopen,Open chest,
58,1877,3427,3539,104,-2,2,10,SLAYER_TOWER,openchest,ikov_chestopen,Open chest,
59,1878,3306,3204,2783,0,0,10,AL_KHARID,anvil,anvil,Anvil,DUP
60,1879,3101,3513,6477,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide6,Ice chunks,
61,1880,3286,3211,2562,0,0,10,AL_KHARID,gem stall,gem_stall_stealing,Gem stall,
62,1881,3299,3199,4878,0,0,10,AL_KHARID,scimitar stall,mm_stall_scimitar,Scimitar Stall,
63,1882,3299,3200,4876,0,0,10,AL_KHARID,magic stall,mm_stall_general,General Stall,
64,1883,3298,3205,2565,0,0,10,AL_KHARID,silver stall,silver_stall_stealing,Silver stall,
65,1884,3082,3505,8987,0,0,10,EDGEVILLE/WILD_WALLS,Cave,loc_8987,Portal,
66,1885,2542,3895,6552,0,0,10,MISCELLANIA(bankhome/fish/shops/wc),magic altar,dt_zaros_altar,Altar,
67,1886,2768,2756,362,-3,1,10,APE_ATOLL,barrel,barrel,Barrel,DUP
68,1887,3565,3308,4156,0,0,10,BARROWS,portal,vt_mazeportal_7,Portal,DUP
69,1888,3303,3123,2472,0,0,10,SHANTAY_PASS,portal,lawtemple_exit_portal,Portal,DUP
70,1889,2901,3557,2213,0,0,10,BURTHORPE/HEROES_GUILD,bank,bankbooth,Bank booth,DUP
71,1890,2860,3599,7319,0,0,10,HOME,memberportal,rd_portal_room4_exit,Portal,
72,1891,3114,9844,75,-3,1,10,EDGE_DUNGEON_TRAINING_ROOM,chest,arena_guard_chest_shut,Chest,DUP
73,1892,3114,9843,75,-3,1,10,EDGE_DUNGEON_TRAINING_ROOM,chest,arena_guard_chest_shut,Chest,DUP
74,1893,3114,9842,75,-3,1,10,EDGE_DUNGEON_TRAINING_ROOM,chest,arena_guard_chest_shut,Chest,DUP
75,1894,3118,9836,299,-1,3,10,EDGE_DUNGEON_TRAINING_ROOM,haystack,haystack2,Hay Bales,DUP
76,1895,3121,9842,2416,-1,3,10,EDGE_DUNGEON_TRAINING_ROOM,strength,loc_2416,Lever,DUP
77,1896,2861,3599,2465,-1,3,10,HOME,trainportal,airtemple_exit_portal,Portal,
78,1897,2862,3599,2467,-2,2,10,HOME,portal,watertemple_exit_portal,Portal,
79,1898,3116,9846,2213,0,0,10,EDGE_DUNGEON_TRAINING_ROOM,bankz,bankbooth,Bank booth,DUP
80,1899,2605,3157,2213,-1,3,10,FIGHT_ARENA(icon-minigame),banks,bankbooth,Bank booth,DUP
81,1900,2976,3402,1276,-1,3,10,FALADOR_N_TREES,regtree,tree,Tree,DUP
82,1901,2982,3398,1308,-1,3,10,FALADOR_N_TREES,willowtree,willowtree,Willow,DUP
83,1902,2982,3403,1307,-1,3,10,FALADOR_N_TREES,mapletree,mapletree,Maple tree,DUP
84,1903,2978,3404,1309,-1,3,10,FALADOR_N_TREES,yewtree,yewtree,Yew,DUP
85,1904,2539,3860,1306,-1,3,10,MISCELLANIA(bankhome/fish/shops/wc),magictree,magictree,Magic tree,
86,1905,2563,3867,1306,-1,3,10,MISCELLANIA(bankhome/fish/shops/wc),magictree,magictree,Magic tree,
87,1906,2609,3854,1306,-1,3,10,MISCELLANIA(bankhome/fish/shops/wc),magictree,magictree,Magic tree,
88,1907,2565,3888,1306,-1,3,10,MISCELLANIA(bankhome/fish/shops/wc),magictree,magictree,Magic tree,
89,1908,3114,9836,61,0,0,10,EDGE_DUNGEON_TRAINING_ROOM,altar,thrantaxaltar,Chaos altar,DUP
90,1909,3121,9838,2513,0,0,10,EDGE_DUNGEON_TRAINING_ROOM,target,loc_2513,Target,DUP
91,1910,3469,9488,76,-3,1,10,KQ_LAIR,kalphitechest,arena_guard_chest_open,Chest,DUP
92,1911,3054,3437,4483,0,0,10,GMAUL_CHEST,bankchest,castlewars_bankchest,Bank chest,DUP
93,1912,3096,3468,767,0,0,10,EDGEVILLE/WILD_WALLS,chest,floor_depth2,,DUP
94,1913,3426,3536,2213,-1,3,10,SLAYER_TOWER,bankbooth,bankbooth,Bank booth,DUP
95,1914,3429,3539,104,-2,2,10,SLAYER_TOWER,openchest,ikov_chestopen,Open chest,DUP
96,1915,3427,3539,104,-2,2,10,SLAYER_TOWER,openchest,ikov_chestopen,Open chest,DUP
97,1916,3091,3506,210,-2,2,10,EDGEVILLE/WILD_WALLS,Light,ice_light,Ice Light,
98,1917,3100,3506,210,-2,2,10,EDGEVILLE/WILD_WALLS,Light,ice_light,Ice Light,
99,1918,3096,3506,210,-2,2,10,EDGEVILLE/WILD_WALLS,Light,ice_light,Ice Light,
100,1919,3088,3488,210,-2,2,10,EDGEVILLE/WILD_WALLS,Light,ice_light,Ice Light,
101,1920,3085,3487,210,-2,2,10,EDGEVILLE/WILD_WALLS,Light,ice_light,Ice Light,
102,1921,2860,2957,6084,-2,2,10,SHILO(old-home),Bank,dwarf_keldagrim_bankbooth,Bank booth,
103,1922,2859,2957,6083,-2,2,10,SHILO(old-home),Bank,dwarf_keldagrim_bankboothclosed,Closed bank booth,
104,1923,3093,3506,6084,-2,2,10,EDGEVILLE/WILD_WALLS,Bank,dwarf_keldagrim_bankbooth,Bank booth,
105,1924,3092,3506,6083,-2,2,10,EDGEVILLE/WILD_WALLS,Bank,dwarf_keldagrim_bankboothclosed,Closed bank booth,
106,1925,3097,3506,6083,-2,2,10,EDGEVILLE/WILD_WALLS,Bank,dwarf_keldagrim_bankboothclosed,Closed bank booth,
107,1926,3098,3506,6084,-2,2,10,EDGEVILLE/WILD_WALLS,Bank,dwarf_keldagrim_bankbooth,Bank booth,
108,1927,3099,3506,6083,-2,2,10,EDGEVILLE/WILD_WALLS,Bank,dwarf_keldagrim_bankboothclosed,Closed bank booth,
109,1928,2518,3858,6084,-2,2,10,MISCELLANIA(bankhome/fish/shops/wc),Bankhome,dwarf_keldagrim_bankbooth,Bank booth,
110,1929,2517,3858,6083,-2,2,10,MISCELLANIA(bankhome/fish/shops/wc),Bankhome,dwarf_keldagrim_bankboothclosed,Closed bank booth,
111,1930,2516,3858,6084,-2,2,10,MISCELLANIA(bankhome/fish/shops/wc),Bank,dwarf_keldagrim_bankbooth,Bank booth,
112,1931,2515,3858,6083,-2,2,10,MISCELLANIA(bankhome/fish/shops/wc),Bank,dwarf_keldagrim_bankboothclosed,Closed bank booth,
113,1932,2514,3858,6084,-2,2,10,MISCELLANIA(bankhome/fish/shops/wc),Bank,dwarf_keldagrim_bankbooth,Bank booth,
114,1933,2513,3858,210,-2,2,10,MISCELLANIA(bankhome/fish/shops/wc),Light,ice_light,Ice Light,
115,1934,2513,3857,210,-2,2,10,MISCELLANIA(bankhome/fish/shops/wc),Light,ice_light,Ice Light,
116,1935,2513,3856,210,-2,2,10,MISCELLANIA(bankhome/fish/shops/wc),Light,ice_light,Ice Light,
117,1936,2519,3858,210,-2,2,10,MISCELLANIA(bankhome/fish/shops/wc),Light,ice_light,Ice Light,
118,1937,2519,3857,210,-2,2,10,MISCELLANIA(bankhome/fish/shops/wc),Light,ice_light,Ice Light,
119,1938,2519,3856,210,-2,2,10,MISCELLANIA(bankhome/fish/shops/wc),Light,ice_light,Ice Light,
120,1939,3133,3516,5353,-2,2,10,EDGEVILLE/WILD_WALLS,block off,ahoy_wheel_barrow,Wheelbarrow,
121,1940,3133,3518,327,-2,2,10,EDGEVILLE/WILD_WALLS,Bank,broken_cart_wheel,Broken cart wheel,
122,1941,3105,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
123,1942,3104,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
124,1943,3103,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
125,1944,3102,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
126,1945,3101,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
127,1946,3100,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
128,1947,3099,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
129,1948,3098,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
130,1949,3097,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
131,1950,3096,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
132,1951,3095,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
133,1952,3094,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
134,1953,3093,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
135,1954,3092,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
136,1955,3091,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
137,1956,3090,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
138,1957,3089,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
139,1958,3088,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
140,1959,3087,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
141,1960,3086,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
142,1961,3085,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
143,1962,3084,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
144,1963,3083,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
145,1964,3082,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
146,1965,3081,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
147,1966,3080,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
148,1967,3079,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
149,1968,3078,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
150,1969,3077,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
151,1970,3076,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
152,1971,3075,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
153,1972,3074,3552,6477,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide6,Ice chunks,
154,1973,3073,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
155,1974,3072,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
156,1975,3071,3552,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
157,1976,3071,3551,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
158,1977,3071,3550,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
159,1978,3071,3549,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
160,1979,3071,3548,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
161,1980,3071,3547,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
162,1981,3071,3546,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
163,1982,3071,3545,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
164,1983,3071,3544,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
165,1984,3071,3543,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
166,1985,3071,3542,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
167,1986,3071,3541,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
168,1987,3071,3540,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
169,1988,3071,3539,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
170,1989,3071,3538,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
171,1990,3071,3537,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
172,1991,3071,3536,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
173,1992,3071,3535,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
174,1993,3071,3534,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
175,1994,3071,3533,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
176,1995,3071,3532,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
177,1996,3071,3531,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
178,1997,3071,3530,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
179,1998,3071,3529,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
180,1999,3071,3528,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
181,2000,3071,3527,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
182,2001,3071,3526,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
183,2002,3071,3525,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
184,2003,3071,3524,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
185,2004,3071,3523,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
186,2005,3071,3522,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
187,2006,3071,3521,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
188,2007,3071,3520,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
189,2008,3097,3465,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
190,2009,3097,3464,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
191,2010,3080,3468,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
192,2011,3079,3468,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
193,2012,3086,3496,6213,0,0,10,EDGEVILLE/WILD_WALLS,Bank,barrel_ranging,Barrel,
194,2013,3089,3496,6213,0,0,10,EDGEVILLE/WILD_WALLS,Bank,barrel_ranging,Barrel,
195,2014,3077,3538,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
196,2015,3082,3544,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
197,2016,3094,3537,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
198,2017,3095,3527,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
199,2018,3104,3523,6477,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide6,Ice chunks,
200,2019,3107,3531,6472,0,0,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
201,2020,3088,3512,6461,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,icegate_left_small,Ice gate,
202,2021,3086,3512,6462,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,icegate_right_small,Ice gate,
203,2022,3085,3512,6416,-3,1,10,EDGEVILLE/WILD_WALLS,Bank,4d_standing_torch4_lit,Standing Torch,
204,2023,3090,3512,6416,-3,1,10,EDGEVILLE/WILD_WALLS,bank,4d_standing_torch4_lit,Standing Torch,
205,2024,3075,3512,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
206,2025,3074,3512,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
207,2026,3073,3512,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
208,2027,3072,3512,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
209,2028,3071,3512,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
210,2029,3101,3513,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
211,2030,3102,3513,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
212,2031,3103,3513,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
213,2032,3104,3513,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
214,2033,3105,3513,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
215,2034,3106,3513,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
216,2035,3112,3513,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
217,2036,3113,3513,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
218,2037,3114,3513,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
219,2038,3115,3513,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
220,2039,3116,3513,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
221,2040,3117,3513,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
222,2041,3118,3513,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
223,2042,3119,3513,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
224,2043,3120,3513,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
225,2044,3121,3513,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
226,2045,3122,3513,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
227,2046,3123,3514,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
228,2047,3124,3514,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
229,2048,3125,3514,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
230,2049,3127,3514,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
231,2050,3128,3514,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
232,2051,3129,3513,6472,-1,3,10,EDGEVILLE/WILD_WALLS,Bank,trollrescue_iceslide1,Ice chunks,
233,2052,3098,9878,6472,0,0,10,EDGE_DUNGEON,Bank,trollrescue_iceslide1,Ice chunks,
234,2053,3096,9878,6472,0,0,10,EDGE_DUNGEON,Bank,trollrescue_iceslide1,Ice chunks,
235,2054,3094,9888,6472,0,0,10,EDGE_DUNGEON,Bank,trollrescue_iceslide1,Ice chunks,
236,2055,3435,9772,11758,0,0,10,OLD_PKBOX(ice-box),bank booth @ pkbox,loc_11758,Bank booth,
237,2056,3434,9772,11758,0,0,10,OLD_PKBOX(ice-box),bank booth @ pkbox,loc_11758,Bank booth,
238,2057,3433,9772,11758,0,0,10,OLD_PKBOX(ice-box),bank booth @ pkbox,loc_11758,Bank booth,
239,2058,3432,9772,11758,0,0,10,OLD_PKBOX(ice-box),bank booth @ pkbox,loc_11758,Bank booth,
240,2059,3428,9775,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
241,2060,3428,9776,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
242,2061,3428,9774,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
243,2062,3428,9773,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
244,2063,3428,9772,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
245,2064,3428,9771,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
246,2065,3428,9770,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
247,2066,3428,9777,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
248,2067,3428,9778,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
249,2068,3428,9779,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
250,2069,3428,9780,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
251,2070,3428,9781,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
252,2071,3428,9782,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
253,2072,3428,9783,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
254,2073,3428,9784,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
255,2074,3428,9785,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
256,2075,3428,9786,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
257,2076,3428,9787,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
258,2077,3428,9788,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
259,2078,3428,9789,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
260,2079,3428,9790,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
261,2080,3428,9791,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
262,2081,3427,9770,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
263,2082,3428,9770,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,DUP
264,2083,3429,9770,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
265,2084,3430,9770,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
266,2085,3431,9770,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
267,2086,3432,9770,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
268,2087,3433,9770,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
269,2088,3434,9770,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
270,2089,3435,9770,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
271,2090,3437,9770,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
272,2091,3438,9770,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
273,2092,3438,9771,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
274,2093,3438,9772,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
275,2094,3438,9773,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
276,2095,3438,9774,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
277,2096,3438,9775,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
278,2097,3438,9776,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
279,2098,3438,9777,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
280,2099,3438,9778,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
281,2100,3438,9779,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
282,2101,3438,9780,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
283,2102,3438,9781,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
284,2103,3438,9782,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
285,2104,3438,9783,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
286,2105,3438,9784,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
287,2106,3439,9784,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
288,2107,3440,9784,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
289,2108,3441,9784,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
290,2109,3442,9784,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
291,2110,3443,9784,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
292,2111,3444,9784,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
293,2112,3444,9785,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
294,2113,3444,9786,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
295,2114,3444,9787,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
296,2115,3444,9788,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
297,2116,3444,9789,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
298,2117,3444,9790,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
299,2118,3444,9791,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
300,2119,3444,9792,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
301,2120,3444,9791,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,DUP
302,2121,3443,9791,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
303,2122,3442,9791,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
304,2123,3441,9791,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
305,2124,3440,9791,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
306,2125,3439,9791,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
307,2126,3438,9791,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
308,2127,3437,9791,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
309,2128,3436,9791,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
310,2129,3435,9791,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
311,2130,3434,9791,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
312,2131,3433,9791,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
313,2132,3432,9791,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
314,2133,3431,9791,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
315,2134,3430,9791,6473,-1,3,10,OLD_PKBOX(ice-box),Ice chunks,trollrescue_iceslide2,Ice chunks,
316,2135,3437,9777,1032,-2,2,10,OLD_PKBOX(ice-box),Danger Sign,dangersign,Danger sign,
317,2136,3436,9777,1032,-2,2,10,OLD_PKBOX(ice-box),Danger Sign,dangersign,Danger sign,
318,2137,3435,9777,1032,-2,2,10,OLD_PKBOX(ice-box),Danger Sign,dangersign,Danger sign,
319,2138,3432,9777,1032,-2,2,10,OLD_PKBOX(ice-box),Danger Sign,dangersign,Danger sign,
320,2139,3430,9777,1032,-2,2,10,OLD_PKBOX(ice-box),Danger Sign,dangersign,Danger sign,
321,2140,3431,9777,1032,-2,2,10,OLD_PKBOX(ice-box),Danger Sign,dangersign,Danger sign,
322,2141,2993,3127,3192,-1,3,10,KARAMJA_SCOREBOARDS,"Scoreboard, change coords to fit your needs",loc_3192,Scoreboard,
323,2142,3002,3126,3192,-2,2,10,KARAMJA_SCOREBOARDS,"Scoreboard, change coords to fit your needs",loc_3192,Scoreboard,
324,2143,2786,3179,3192,-1,3,10,BRIMHAVEN_SCOREBOARDS,"Scoreboard, change coords to fit your needs",loc_3192,Scoreboard,
325,2144,2802,3180,3192,-3,1,10,BRIMHAVEN_SCOREBOARDS,"Scoreboard, change coords to fit your needs",loc_3192,Scoreboard,
326,2145,2843,2961,3192,0,0,10,SHILO(old-home),"Scoreboard, change coords to fit your needs",loc_3192,Scoreboard,
327,2146,2853,2957,2213,-2,2,10,SHILO(old-home),bank,bankbooth,Bank booth,
328,2147,2851,2957,2213,-2,2,10,SHILO(old-home),bank,bankbooth,Bank booth,
329,2148,2535,3891,2213,-1,3,10,MISCELLANIA(bankhome/fish/shops/wc),bank,bankbooth,Bank booth,
330,2149,2535,3890,2213,-1,3,10,MISCELLANIA(bankhome/fish/shops/wc),bank,bankbooth,Bank booth,
331,2150,2535,3889,2213,-1,3,10,MISCELLANIA(bankhome/fish/shops/wc),bank,bankbooth,Bank booth,
332,2151,3243,3515,2213,-2,2,10,TEAM_PK(N_Varrock),bank,bankbooth,Bank booth,
333,2152,3244,3515,2213,-2,2,10,TEAM_PK(N_Varrock),bank,bankbooth,Bank booth,
334,2153,3240,3520,1032,-2,2,10,TEAM_PK(N_Varrock),Danger Sign,dangersign,Danger sign,
335,2154,3241,3520,1032,-2,2,10,TEAM_PK(N_Varrock),Danger Sign,dangersign,Danger sign,
336,2155,3442,3520,1032,-2,2,10,TEAM_PK-typo(x3442),Danger Sign,dangersign,Danger sign,
337,2156,3245,3520,1032,-2,2,10,TEAM_PK(N_Varrock),Danger Sign,dangersign,Danger sign,
338,2157,3246,3520,1032,-2,2,10,TEAM_PK(N_Varrock),Danger Sign,dangersign,Danger sign,
339,2158,3247,3520,1032,-2,2,10,TEAM_PK(N_Varrock),Danger Sign,dangersign,Danger sign,
340,2159,2736,3476,2417,0,0,10,SEERS/CAMELOT_SHOPS,Chest,loc_2417,Closed chest,
341,2160,2737,3476,2417,0,0,10,SEERS/CAMELOT_SHOPS,Chest,loc_2417,Closed chest,
342,2161,2739,3469,6084,0,0,10,SEERS/CAMELOT_SHOPS,bank,dwarf_keldagrim_bankbooth,Bank booth,
343,2162,2738,3469,6084,0,0,10,SEERS/CAMELOT_SHOPS,bank,dwarf_keldagrim_bankbooth,Bank booth,
344,2163,2737,3469,6084,0,0,10,SEERS/CAMELOT_SHOPS,bank,dwarf_keldagrim_bankbooth,Bank booth,
345,2164,2736,3469,6084,0,0,10,SEERS/CAMELOT_SHOPS,bank,dwarf_keldagrim_bankbooth,Bank booth,
346,2165,2736,3467,6084,0,0,10,SEERS/CAMELOT_SHOPS,bank,dwarf_keldagrim_bankbooth,Bank booth,
347,2166,2737,3467,6084,0,0,10,SEERS/CAMELOT_SHOPS,bank,dwarf_keldagrim_bankbooth,Bank booth,
348,2167,2738,3467,6084,0,0,10,SEERS/CAMELOT_SHOPS,bank,dwarf_keldagrim_bankbooth,Bank booth,
349,2168,2739,3467,6084,0,0,10,SEERS/CAMELOT_SHOPS,bank,dwarf_keldagrim_bankbooth,Bank booth,
350,2169,2383,3436,3206,-1,3,10,SKILL_AREA,Barrel,barrel_godstaffs,Barrel,
351,2170,2383,3437,3206,-1,3,10,SKILL_AREA,Barrel,barrel_godstaffs,Barrel,
352,2171,2381,3425,2213,0,0,10,SKILL_AREA,bank,bankbooth,Bank booth,
353,2172,2380,3425,2213,0,0,10,SKILL_AREA,bank,bankbooth,Bank booth,
354,2173,2382,3434,1315,0,0,10,SKILL_AREA,evergreen,evergreen,Evergreen,
355,2174,2382,3432,1307,0,0,10,SKILL_AREA,maple,mapletree,Maple tree,
356,2175,2382,3430,1306,0,0,10,SKILL_AREA,magic,magictree,Magic tree,
357,2176,2376,3442,2783,0,0,10,SKILL_AREA,anvil,anvil,Anvil,
358,2177,2378,3442,2783,0,0,10,SKILL_AREA,anvil,anvil,Anvil,
359,2178,3430,9774,6552,1,1,10,OLD_PKBOX(ice-box),Ancient Alter,dt_zaros_altar,Altar,
360,2179,3246,3517,6552,-1,3,10,TEAM_PK(N_Varrock),Ancient Alter,dt_zaros_altar,Altar,
361,2180,2732,3462,6552,-2,2,10,SEERS/CAMELOT_SHOPS,Ancient Alter,dt_zaros_altar,Altar,
362,2181,3568,3307,2213,0,0,10,BARROWS,bank,bankbooth,Bank booth,
363,2182,3569,3307,2213,0,0,10,BARROWS,bank,bankbooth,Bank booth,
364,2183,3233,9321,2213,0,0,10,UNDERGROUND_3228_9318(memberportal),bank,bankbooth,Bank booth,
365,2184,3234,9321,2213,0,0,10,UNDERGROUND_3228_9318(memberportal),bank,bankbooth,Bank booth,
366,2185,2377,3434,2480,-2,2,10,SKILL_AREA,alter,water_altar,Altar,
367,2186,3224,2807,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
368,2187,3224,2806,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
369,2188,3224,2805,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
370,2189,3224,2804,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
371,2190,3224,2803,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
372,2191,3224,2802,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
373,2192,3224,2801,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
374,2193,3224,2800,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
375,2194,3224,2799,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
376,2195,3224,2798,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
377,2196,3224,2797,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
378,2197,3224,2796,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
379,2198,3224,2795,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
380,2199,3224,2794,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
381,2200,3224,2793,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
382,2201,3224,2792,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
383,2202,3224,2791,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
384,2203,3224,2790,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
385,2204,3224,2789,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
386,2205,3224,2788,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
387,2206,3224,2787,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
388,2207,3224,2786,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
389,2208,3224,2785,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
390,2209,3224,2784,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
391,2210,3224,2783,1116,-1,3,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
392,2211,3223,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
393,2212,3223,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,DUP
394,2213,3222,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
395,2214,3221,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
396,2215,3220,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
397,2216,3219,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
398,2217,3218,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
399,2218,3217,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
400,2219,3216,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
401,2220,3215,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
402,2221,3214,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
403,2222,3213,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
404,2223,3212,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
405,2224,3211,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
406,2225,3210,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
407,2226,3209,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
408,2227,3208,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
409,2228,3207,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
410,2229,3206,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
411,2230,3205,2783,1116,-2,2,10,TRAINING_AREA(Menaphos),wall,hedge,Hedge,
412,2231,3209,2804,2213,-2,2,10,TRAINING_AREA(Menaphos),bank,bankbooth,Bank booth,
413,2232,3209,2802,2213,-2,2,10,TRAINING_AREA(Menaphos),bank,bankbooth,Bank booth,
414,2233,3208,2803,2213,-1,3,10,TRAINING_AREA(Menaphos),bank,bankbooth,Bank booth,
415,2234,3210,2803,2213,-1,3,10,TRAINING_AREA(Menaphos),bank,bankbooth,Bank booth,
416,2235,3210,2802,4901,0,0,10,TRAINING_AREA(Menaphos),idk,castlewars_zamorak_banner,Zamorak Standard,
417,2236,3210,2804,4901,0,0,10,TRAINING_AREA(Menaphos),idk,castlewars_zamorak_banner,Zamorak Standard,
418,2237,3208,2802,4901,0,0,10,TRAINING_AREA(Menaphos),idk,castlewars_zamorak_banner,Zamorak Standard,
419,2238,3208,2804,4901,0,0,10,TRAINING_AREA(Menaphos),idk,castlewars_zamorak_banner,Zamorak Standard,
420,2239,2500,3018,2832,0,0,10,GUTANOTH(enchanted-minigame),idk,ganothbattlement,Battlement,
421,2240,2501,3018,2832,0,0,10,GUTANOTH(enchanted-minigame),idk,ganothbattlement,Battlement,
422,2241,2858,3598,7352,0,0,10,HOME,minigame,rd_portal_room7_entrance,Portal,
423,2242,3231,3499,2182,0,0,10,N_VARROCK_MINIGAME_BARREL,minigamebarrel,chestopen_khazard,Open chest,
424,2243,2794,9326,4121,-1,3,10,SECRET_CAVE(minigame-chest),minigamechest,shadechest_black_bloodred,Black Chest,
425,2244,2539,3032,2832,0,0,10,GUTANOTH(enchanted-minigame),idk,ganothbattlement,Battlement,
426,2245,2539,3033,2832,0,0,10,GUTANOTH(enchanted-minigame),idk,ganothbattlement,Battlement,
427,2246,2866,9956,4119,2,2,10,MINIGAME_CHEST_2866_9956,minigamechest,shadechest_steel_black,Steel Chest,
428,2247,2857,3598,7325,0,0,10,HOME,minigameportal,rd_portal_room6_exit,Portal,
429,2248,3284,2777,2213,0,0,10,MOD_ZONE(Sophanem),bank,bankbooth,Bank booth,
430,2249,3283,2777,2213,0,0,10,MOD_ZONE(Sophanem),bank,bankbooth,Bank booth,
431,2250,3282,2777,2213,0,0,10,MOD_ZONE(Sophanem),bank,bankbooth,Bank booth,
432,2251,3281,2777,2213,0,0,10,MOD_ZONE(Sophanem),bank,bankbooth,Bank booth,
433,2252,3280,2777,2213,0,0,10,MOD_ZONE(Sophanem),bank,bankbooth,Bank booth,
434,2253,3279,2777,2213,0,0,10,MOD_ZONE(Sophanem),bank,bankbooth,Bank booth,
435,2254,3278,2777,2213,0,0,10,MOD_ZONE(Sophanem),bank,bankbooth,Bank booth,
436,2255,3281,2764,1032,0,0,10,MOD_ZONE(Sophanem),Danger Sign,dangersign,Danger sign,
437,2256,2864,3599,2472,0,0,10,HOME,modzone,lawtemple_exit_portal,Portal,
438,2257,2375,3427,8151,0,0,10,SKILL_AREA,farming,farming_herb_patch_2,,
439,2258,2375,3431,2111,0,0,10,SKILL_AREA,ore,gemrock,Rocks,
440,2259,2377,3431,2111,0,0,10,SKILL_AREA,ore,gemrock,Rocks,
441,2260,3285,2770,10687,-1,3,10,MOD_ZONE(Sophanem),crate,loc_10687,Puppet torsos,
442,2261,2850,3593,210,-1,3,10,HOME,light,ice_light,Ice Light,
443,2262,2850,3590,210,-1,3,10,HOME,fire,ice_light,Ice Light,
444,2263,2855,3594,576,-1,3,10,HOME,statue,bust3,Statue,
445,2264,2855,3589,576,-1,3,10,HOME,statue,bust3,Statue,
446,2265,2038,4531,5981,-1,3,10,FIRE_BOX_2034_4526,statue,dwarf_lights,Fire,
447,2266,2850,3591,579,-1,3,10,HOME,statue,egypt_statue1,Statue,
448,2267,2850,3592,579,-1,3,10,HOME,statue,egypt_statue1,Statue,
449,2268,2034,4531,5981,-1,3,10,FIRE_BOX_2034_4526,fire,dwarf_lights,Fire,
450,2269,2034,4530,5981,-1,3,10,FIRE_BOX_2034_4526,fire,dwarf_lights,Fire,
451,2270,2034,4529,5981,-1,3,10,FIRE_BOX_2034_4526,fire,dwarf_lights,Fire,
452,2271,2034,4528,5981,-1,3,10,FIRE_BOX_2034_4526,fire,dwarf_lights,Fire,
453,2272,2034,4527,5981,-1,3,10,FIRE_BOX_2034_4526,fire,dwarf_lights,Fire,
454,2273,2034,4526,5981,-1,3,10,FIRE_BOX_2034_4526,fire,dwarf_lights,Fire,
455,2274,2035,4526,5981,-1,3,10,FIRE_BOX_2034_4526,fire,dwarf_lights,Fire,
456,2275,2036,4526,5981,-1,3,10,FIRE_BOX_2034_4526,fire,dwarf_lights,Fire,
457,2276,2037,4526,5981,-1,3,10,FIRE_BOX_2034_4526,fire,dwarf_lights,Fire,
458,2277,2038,4526,5981,-1,3,10,FIRE_BOX_2034_4526,fire,dwarf_lights,Fire,
459,2278,2039,4526,5981,-1,3,10,FIRE_BOX_2034_4526,fire,dwarf_lights,Fire,
460,2279,2039,4527,5981,-1,3,10,FIRE_BOX_2034_4526,fire,dwarf_lights,Fire,
461,2280,2874,3600,5981,-1,3,10,HOME,fire,dwarf_lights,Fire,
462,2281,2858,3587,2213,0,0,10,HOME,bank,bankbooth,Bank booth,
463,2282,2857,3587,2213,0,0,10,HOME,bank,bankbooth,Bank booth,
464,2283,2853,3590,2213,0,0,10,HOME,bank,bankbooth,Bank booth,
465,2284,2852,3590,2213,0,0,10,HOME,bank,bankbooth,Bank booth,
466,2285,2851,3590,2213,0,0,10,HOME,bank,bankbooth,Bank booth,
467,2286,2854,3595,6552,1,1,10,HOME,Ancient Alter,dt_zaros_altar,Altar,
468,2287,2756,3498,7315,1,1,10,GUILD_PORTALS(Camelot),Ancient Alter,rd_portal_room3_entrance,Portal,
469,2288,3489,9688,5981,-1,3,10,STRENGTH_GUILD,fire,dwarf_lights,Fire,
470,2289,3489,9687,5981,-1,3,10,STRENGTH_GUILD,fire,dwarf_lights,Fire,
471,2290,3489,9686,5981,-1,3,10,STRENGTH_GUILD,fire,dwarf_lights,Fire,
472,2291,3489,9689,5981,-1,3,10,STRENGTH_GUILD,fire,dwarf_lights,Fire,
473,2292,3496,9665,10688,-1,3,10,STRENGTH_GUILD,crateatsg,loc_10688,Puppet arms,
474,2293,3490,9668,11758,-1,3,10,STRENGTH_GUILD,bank booth,loc_11758,Bank booth,
475,2294,3490,9669,11758,-1,3,10,STRENGTH_GUILD,bank booth,loc_11758,Bank booth,
476,2295,3490,9670,11758,-1,3,10,STRENGTH_GUILD,bank booth,loc_11758,Bank booth,
477,2296,3490,9671,11758,-1,3,10,STRENGTH_GUILD,bank booth,loc_11758,Bank booth,
478,2297,3490,9672,11758,-1,3,10,STRENGTH_GUILD,bank booth,loc_11758,Bank booth,
479,2298,3490,9673,11758,-1,3,10,STRENGTH_GUILD,bank booth,loc_11758,Bank booth,
480,2299,2375,3441,9398,-1,3,10,SKILL_AREA,bank booth,loc_9398,Bank Deposit Box,
481,2300,2378,3427,12120,-1,3,10,SKILL_AREA,water,fairy_chest_closed,Closed chest,
482,2301,2860,3591,884,-1,3,10,HOME,well,well,Well,
483,2302,3281,2765,3644,0,0,10,MOD_ZONE(Sophanem),light,macro_spotlight,Spotlight,
484,2303,3280,2765,3644,0,0,10,MOD_ZONE(Sophanem),light,macro_spotlight,Spotlight,
485,2304,3248,9364,10689,-1,3,10,RANGE_MAGIC_GUILD,crateatmg,loc_10689,Puppet legs,
486,2305,3241,9360,11758,-1,3,10,RANGE_MAGIC_GUILD,bank booth,loc_11758,Bank booth,
487,2306,3241,9359,11758,-1,3,10,RANGE_MAGIC_GUILD,bank booth,loc_11758,Bank booth,
488,2307,3241,9361,11758,-1,3,10,RANGE_MAGIC_GUILD,bank booth,loc_11758,Bank booth,
489,2308,3241,9362,11758,-1,3,10,RANGE_MAGIC_GUILD,bank booth,loc_11758,Bank booth,
490,2309,3239,9363,5981,-1,3,10,RANGE_MAGIC_GUILD,fire,dwarf_lights,Fire,
491,2310,3239,9364,5981,-1,3,10,RANGE_MAGIC_GUILD,fire,dwarf_lights,Fire,
492,2311,3239,9365,5981,-1,3,10,RANGE_MAGIC_GUILD,fire,dwarf_lights,Fire,
493,2312,3239,9366,5981,-1,3,10,RANGE_MAGIC_GUILD,fire,dwarf_lights,Fire,
494,2313,2759,3498,7316,-1,3,10,GUILD_PORTALS(Camelot),portal,rd_portal_room3_exit,Portal,
495,2314,3305,9375,11758,-1,3,10,PKBOX(::pkbox),bank booth,loc_11758,Bank booth,
496,2315,3305,9376,11758,-1,3,10,PKBOX(::pkbox),bank booth,loc_11758,Bank booth,
497,2316,3305,9374,11758,-1,3,10,PKBOX(::pkbox),bank booth,loc_11758,Bank booth,
498,2317,3305,9377,11758,-1,3,10,PKBOX(::pkbox),bank booth,loc_11758,Bank booth,
499,2318,3308,9372,1032,-1,3,10,PKBOX(::pkbox),Danger Sign,dangersign,Danger sign,
500,2319,3308,9373,1032,-1,3,10,PKBOX(::pkbox),Danger Sign,dangersign,Danger sign,
501,2320,3308,9374,1032,-1,3,10,PKBOX(::pkbox),Danger Sign,dangersign,Danger sign,
502,2321,3308,9380,1032,-1,3,10,PKBOX(::pkbox),Danger Sign,dangersign,Danger sign,
503,2322,3308,9379,1032,-1,3,10,PKBOX(::pkbox),Danger Sign,dangersign,Danger sign,
504,2323,3308,9378,1032,-1,3,10,PKBOX(::pkbox),Danger Sign,dangersign,Danger sign,
505,2324,3308,9377,1032,-1,3,10,PKBOX(::pkbox),Danger Sign,dangersign,Danger sign,
506,2325,2758,3493,11758,-2,2,10,GUILD_PORTALS(Camelot),bank booth,loc_11758,Bank booth,
507,2326,2757,3493,11758,-2,2,10,GUILD_PORTALS(Camelot),bank booth,loc_11758,Bank booth,
508,2327,2758,3503,11758,-2,2,10,GUILD_PORTALS(Camelot),bank booth,loc_11758,Bank booth,
509,2328,2757,3503,11758,-2,2,10,GUILD_PORTALS(Camelot),bank booth,loc_11758,Bank booth,
```

## Appendix B — removals (`Deleteobjects()` + `Deletewalls()`, 67 rows; CSV)
layer_type 10 = `deletethatobject` (scenery), 0 = `deletethatwall` (wall); both replace with invisible loc 6951. Last column = 377 locs on that tile (level 0) in LC map data, i.e. what actually disappears.

```csv
fn,src_line,x,y,layer_type,allstar_comment,lc377_locs_at_tile_level0
Deleteobjects,1613,2895,3513,10,"Stairs","1738 loc_1738 t10"
Deleteobjects,1614,2885,3515,10,"Tree","1289 deadtree2_dark t10"
Deleteobjects,1615,2883,3511,10,"Tree","185 dugupsoil2_upass t22 / 1289 deadtree2_dark t10"
Deleteobjects,1616,2886,3514,10,"Tree","1315 evergreen t10"
Deleteobjects,1617,2883,3512,10,"Tree","185 dugupsoil2_upass t22 / 1316 evergreen_large t10"
Deleteobjects,1618,2883,3508,10,"Tree","1316 evergreen_large t10"
Deleteobjects,1619,2886,3506,10,"Tree","185 dugupsoil2_upass t22 / 1315 evergreen t10"
Deleteobjects,1620,2886,3510,10,"Tree","1289 deadtree2_dark t10"
Deleteobjects,1621,2785,3175,10,"plant","1401 jungleplant2 t10"
Deletewalls,1626,2895,3513,0,"Stairs","1738 loc_1738 t10"
Deletewalls,1627,2892,9907,0,"Ladder to home","186 dugupsoil3_upass t22 / 1757 loc_1757 t10"
Deletewalls,1628,2891,3511,0,"door","1516 loc_1516 t0"
Deletewalls,1629,2891,3510,0,"door","185 dugupsoil2_upass t22 / 1519 loc_1519 t0"
Deletewalls,1630,2790,3177,0,"door","1534 loc_1534 t0"
Deletewalls,1631,2794,3180,0,"door","1534 loc_1534 t0"
Deletewalls,1632,2816,3183,0,"gate 1","1597 membergater t0"
Deletewalls,1633,2816,3182,0,"gate 2","1596 membergatel t0"
Deletewalls,1634,2847,9637,0,"gate 3","2608 elvarg_gate_left t0"
Deletewalls,1635,2847,9636,0,"gate 4","2607 elvarg_gate_right t0"
Deletewalls,1636,2836,9600,0,"wall","2606 dragonsecretdoor t0"
Deletewalls,1637,2811,3170,0,"wall","1248 sticks_twigs t22 / 2626 grubordoor t0"
Deletewalls,1638,3292,3167,0,"wall","1506 loc_1506 t0"
Deletewalls,1639,3287,3171,0,"wall","1508 loc_1508 t0"
Deletewalls,1640,3293,3167,0,"wall","1508 loc_1508 t0"
Deletewalls,1641,3298,3171,0,"wall","1506 loc_1506 t0"
Deletewalls,1642,2799,3154,10,"new training area for Mod Steve","196 torch t5 / 612 counter t10 / 1769 wood1 t2"
Deletewalls,1643,2798,3156,10,"new training area for Mod Steve","612 counter t10"
Deletewalls,1644,2797,3156,10,"new training area for Mod Steve","885 barpumps t10 / 918 poorrug1side t22"
Deletewalls,1645,2796,3156,10,"new training area for Mod Steve","885 barpumps t10 / 918 poorrug1side t22"
Deletewalls,1646,2795,3156,10,"new training area for Mod Steve","885 barpumps t10 / 918 poorrug1side t22"
Deletewalls,1647,2794,3156,10,"new training area for Mod Steve","364 barrelwithtap t10"
Deletewalls,1648,2791,3157,10,"new training area for Mod Steve","364 barrelwithtap t10 / 969 fishingnet t5 / 1769 wood1 t0"
Deletewalls,1649,2794,3157,10,"new training area for Mod Steve","1100 barstool t10"
Deletewalls,1650,2796,3157,10,"new training area for Mod Steve","1100 barstool t10"
Deletewalls,1651,2797,3157,10,"new training area for Mod Steve","1100 barstool t10"
Deletewalls,1652,2799,3157,10,"new training area for Mod Steve","271 anchor t10 / 1023 cookingshelfempty t5 / 1769 wood1 t0"
Deletewalls,1653,2795,3159,10,"new training area for Mod Steve","1088 chair t10"
Deletewalls,1654,2794,3160,10,"new training area for Mod Steve","1088 chair t10"
Deletewalls,1655,2794,3161,10,"new training area for Mod Steve","1088 chair t10"
Deletewalls,1656,2795,3160,10,"new training area for Mod Steve","594 bigtable t10"
Deletewalls,1657,2797,3161,10,"new training area for Mod Steve","1088 chair t10"
Deletewalls,1658,2798,3159,10,"new training area for Mod Steve","1089 smashedchair t10"
Deletewalls,1659,2799,3160,10,"new training area for Mod Steve","1023 cookingshelfempty t5 / 1088 chair t10 / 1769 wood1 t0"
Deletewalls,1660,2799,3161,10,"new training area for Mod Steve","1023 cookingshelfempty t5 / 1089 smashedchair t10 / 1769 wood1 t0"
Deletewalls,1661,2798,3160,10,"new training area for Mod Steve","594 bigtable t10"
Deletewalls,1662,2791,3160,10,"new training area for Mod Steve","363 barrel_fish t10 / 965 swordfishl t5 / 1769 wood1 t0"
Deletewalls,1663,2791,3161,10,"new training area for Mod Steve","227 pileofrope t10 / 964 swordfishr t5 / 1769 wood1 t0"
Deletewalls,1664,2791,3162,10,"new training area for Mod Steve","196 torch t5 / 227 pileofrope t10 / 1769 wood1 t0"
Deletewalls,1665,2791,3164,10,"new training area for Mod Steve","271 anchor t10 / 968 piratemap t5 / 1769 wood1 t0"
Deletewalls,1666,2799,3164,10,"new training area for Mod Steve","362 barrel t10 / 1023 cookingshelfempty t5 / 1769 wood1 t0"
Deletewalls,1667,2799,3165,10,"new training area for Mod Steve","362 barrel t10 / 1023 cookingshelfempty t5 / 1769 wood1 t0"
Deletewalls,1668,2799,3166,10,"new training area for Mod Steve","362 barrel t10 / 1023 cookingshelfempty t5 / 1769 wood1 t0"
Deletewalls,1669,2799,3169,10,"new training area for Mod Steve","374 hatstand t10 / 1769 wood1 t2"
Deletewalls,1670,2798,3169,10,"new training area for Mod Steve","364 barrelwithtap t10 / 1023 cookingshelfempty t5 / 1769 wood1 t0"
Deletewalls,1671,2797,3169,10,"new training area for Mod Steve","227 pileofrope t10 / 1023 cookingshelfempty t5 / 1769 wood1 t0"
Deletewalls,1672,2791,3167,10,"new training area for Mod Steve","599 smashedtable t10 / 1854 shopwindowwall2 t0"
Deletewalls,1673,2791,3166,10,"new training area for Mod Steve","1023 cookingshelfempty t5 / 1089 smashedchair t10 / 1769 wood1 t0"
Deletewalls,1674,2793,3166,10,"new training area for Mod Steve","1088 chair t10"
Deletewalls,1675,2794,3166,10,"new training area for Mod Steve","1088 chair t10"
Deletewalls,1676,2795,3166,10,"new training area for Mod Steve","1088 chair t10"
Deletewalls,1677,2796,3166,10,"new training area for Mod Steve","1088 chair t10"
Deletewalls,1678,2793,3165,10,"new training area for Mod Steve","594 bigtable t10"
Deletewalls,1679,2795,3165,10,"new training area for Mod Steve","594 bigtable t10"
Deletewalls,1680,2793,3164,10,"new training area for Mod Steve","1088 chair t10"
Deletewalls,1681,2794,3164,10,"new training area for Mod Steve","1088 chair t10"
Deletewalls,1682,2795,3164,10,"new training area for Mod Steve","1088 chair t10"
Deletewalls,1683,2796,3164,10,"new training area for Mod Steve","1088 chair t10"
```

## Appendix C — object handler index (every live `case` label in objectClick/objectClick2/objectClick3; CSV)

```csv
loc,op,src_line,lc377_debugname,lc377_name,section
4499,op1,2551,slayer_dungeon_entrance,Cave Entrance,3.1 teleport/portal CUSTOM
2932,op1,2559,skullcavebarrel,Barrel,3.1 teleport/portal CUSTOM
5025,op1,2567,trollromance_snow_cavewall_crevis,Crevasse,3.1 teleport/portal CUSTOM
1600,op1,2578,magicguild_door_l,Magic guild door,3.5 quest door CUSTOM
1601,op1,2588,magicguild_door_r,Magic guild door,3.5 quest door CUSTOM
11993,op1,2600,fai_wiztower_poor_door,Door,3.11 doors/gates/bank dialog
1537,op1,2601,loc_1537,Door,3.11 doors/gates/bank dialog
2427,op1,2602,famcrest_doorh2,Door,3.11 doors/gates/bank dialog
2429,op1,2603,famcrest_doorg2h1,Door,3.11 doors/gates/bank dialog
1536,op1,2628,loc_1536,Door,3.11 doors/gates/bank dialog
1553,op1,2650,loc_1553,Gate,3.11 doors/gates/bank dialog
1551,op1,2651,loc_1551,Gate,3.11 doors/gates/bank dialog
1552,op1,2652,loc_1552,Gate,3.11 doors/gates/bank dialog
1556,op1,2653,loc_1556,Gate,3.11 doors/gates/bank dialog
1516,op1,2730,loc_1516,Large door,3.11 doors/gates/bank dialog
1517,op1,2731,loc_1517,Large door,3.11 doors/gates/bank dialog
1519,op1,2732,loc_1519,Large door,3.11 doors/gates/bank dialog
1520,op1,2733,loc_1520,Large door,3.11 doors/gates/bank dialog
2213,op1,2774,bankbooth,Bank booth,3.11 doors/gates/bank dialog
6552,op1,2780,dt_zaros_altar,Altar,3.13 misc
2073,op1,2797,bananatreefull,Banana Tree,3.13 misc
2074,op1,2798,bananatreefour,Banana Tree,3.13 misc
2075,op1,2799,bananatreethree,Banana Tree,3.13 misc
2076,op1,2800,bananatreetwo,Banana Tree,3.13 misc
2077,op1,2801,bananatreeone,Banana Tree,3.13 misc
2078,op1,2802,bananatreeempty,Banana Tree,3.13 misc
-1,op1,2809,-,-,9 JUNK unreachable stair table
-2,op1,2909,-,-,9 JUNK unreachable stair table
1568,op1,3003,trapdoor,Trapdoor,3.10 ladders/stairs
1569,op1,3004,trapdoor_level1,Trapdoor,3.10 ladders/stairs
1570,op1,3005,trapdoor_open,Trapdoor,3.10 ladders/stairs
1571,op1,3006,trapdoor_open_level1,Trapdoor,3.10 ladders/stairs
1759,op1,3007,loc_1759,Ladder,3.10 ladders/stairs
1762,op1,3008,loc_1762,Climbing rope,3.10 ladders/stairs
1763,op1,3009,climbing_rope_top,Climbing rope,3.10 ladders/stairs
1764,op1,3010,loc_1764,Climbing rope,3.10 ladders/stairs
2113,op1,3011,loc_2113,Ladder,3.10 ladders/stairs
3771,op1,3012,troll_stronghold_door,Stronghold,3.10 ladders/stairs
54,op1,3013,tunnelstairs,Stairs,3.10 ladders/stairs
56,op1,3014,tunnelstairs2,Stairs,3.10 ladders/stairs
5947,op1,3015,goblin_cave_entrance,Dark hole,3.10 ladders/stairs
6434,op1,3016,vampire_trap1,Trapdoor,3.10 ladders/stairs
1754,op1,3017,loc_1754,Ladder,3.10 ladders/stairs
492,op1,3018,volcano_entrance,Rocks,3.10 ladders/stairs
2147,op1,3019,wizards_tower_laddertop,Ladder,3.10 ladders/stairs
5054,op1,3020,thrttavernbasementladder,Ladder,3.10 ladders/stairs
5130,op1,3021,loc_5130,Ladder,3.10 ladders/stairs
9358,op1,3022,loc_9358,Cave entrance,3.10 ladders/stairs
5488,op1,3023,zanarisladderout2,Ladder,3.10 ladders/stairs
2559,op1,3038,loc_2559,Door,3.11 doors/gates/bank dialog
4487,op1,3043,slayertower_door,Door,3.10 ladders/stairs
4495,op1,3055,loc_4495,Staircase,3.10 ladders/stairs
4496,op1,3061,loc_4496,Staircase,3.10 ladders/stairs
9319,op1,3067,loc_9319,Spikey chain,3.10 ladders/stairs
9320,op1,3073,loc_9320,Spikey chain,3.10 ladders/stairs
4494,op1,3079,loc_4494,Staircase,3.10 ladders/stairs
4493,op1,3085,loc_4493,Staircase,3.10 ladders/stairs
10527,op1,3091,loc_10527,Door,3.10 ladders/stairs
10529,op1,3103,loc_10529,Door,3.10 ladders/stairs
5126,op1,3115,loc_5126,Door,3.10 ladders/stairs
5960,op1,3132,magearena_lever_from_cellar,Lever,3.12 wilderness/mage arena
5959,op1,3143,magearena_lever_to_cellar,Lever,3.12 wilderness/mage arena
1596,op1,3153,membergatel,Gate,3.11 doors/gates/bank dialog
1597,op1,3163,membergater,Gate,3.11 doors/gates/bank dialog
2878,op1,3173,magearena_waterportal1,Sparkling pool,3.12 wilderness/mage arena
2879,op1,3178,magearena_waterportal2,Sparkling pool,3.12 wilderness/mage arena
2557,op1,3183,loc_2557,Door,3.11 doors/gates/bank dialog
1765,op1,3187,loc_1765,Ladder,3.1 teleport/portal CUSTOM
2903,op1,3195,shaman_entrance_caver,Cave entrance,3.1 teleport/portal CUSTOM
2904,op1,3204,shaman_entrance_cavel,Cave entrance,3.1 teleport/portal CUSTOM
393,op1,3213,bookcase_bamboo,Bookcase,3.1 teleport/portal CUSTOM
2918,op1,3222,shaman_cave_crevice,Crevice,3.1 teleport/portal CUSTOM
733,op1,3230,bigweb_slashable,Web,3.12 wilderness/mage arena
9707,op1,3276,magearena_lever_out,Lever,3.12 wilderness/mage arena
9706,op1,3282,magearena_lever_in,Lever,3.12 wilderness/mage arena
2321,op1,3288,loc_2321,Monkeybars,3.8 agility
2303,op1,3316,loc_2303,Balancing ledge,3.8 agility
2558,op1,3337,loc_2558,Door,3.11 doors/gates/bank dialog
1557,op1,3338,loc_1557,Gate,3.11 doors/gates/bank dialog
1558,op1,3339,loc_1558,Gate,3.11 doors/gates/bank dialog
1533,op1,3343,loc_1533,Door,3.11 doors/gates/bank dialog
1530,op1,3357,loc_1530,Door,3.11 doors/gates/bank dialog
2112,op1,3397,loc_2112,Door,3.11 doors/gates/bank dialog
1512,op1,3398,loc_1512,Large door,3.11 doors/gates/bank dialog
1728,op1,3402,loc_1728,Staircase,3.1 teleport/portal CUSTOM
6657,op1,3416,hidey_unbuilt_bush_easy,Juna,3.1 teleport/portal CUSTOM
2873,op1,3428,magearena_statue_saradomin,Statue of Saradomin,3.12 wilderness/mage arena
2875,op1,3433,magearena_statue_guthix,Statue of Guthix,3.12 wilderness/mage arena
2874,op1,3437,magearena_statue_zamorak,Statue of Zamorak,3.12 wilderness/mage arena
2309,op1,3442,loc_2309,Door,3.11 doors/gates/bank dialog
2307,op1,3443,loc_2307,Gate,3.11 doors/gates/bank dialog
2308,op1,3444,loc_2308,Gate,3.11 doors/gates/bank dialog
8788,op1,3448,mourner_hideout_door3,Door,3.11 doors/gates/bank dialog
8787,op1,3460,mourner_hideout_door2,Door,3.11 doors/gates/bank dialog
8789,op1,3472,mourner_hideout_door4,Door,3.11 doors/gates/bank dialog
1755,op1,3484,loc_1755,Ladder,3.10 ladders/stairs
1746,op1,3495,laddertop,Ladder,3.10 ladders/stairs
1740,op1,3496,loc_1740,Staircase,3.10 ladders/stairs
5281,op1,3497,ahoy_tower_stairs_lv1_top,Staircase,3.10 ladders/stairs
1749,op1,3498,loc_1749,Ladder,3.10 ladders/stairs
2283,op1,3504,wilderness_rope_swing,Ropeswing,3.8 agility
2311,op1,3509,wilderness_stepping_stone,Stepping stone,3.8 agility
2297,op1,3514,wilderness_log_balance,Log balance,3.8 agility
2328,op1,3519,wilderness_rocks,Rocks,3.8 agility
2288,op1,3524,wilderness_obstacle_pipe,Obstacle pipe,3.8 agility
8689,op1,3529,fat_cow,Dairy Cow,3.13 misc
354,op1,3535,crate2,Crate,3.9 thieving crate CUSTOM
355,op1,3540,crate3,Crate,3.9 thieving crate CUSTOM
361,op1,3545,boxes3,Boxes,3.9 thieving crate CUSTOM
359,op1,3550,boxes,Boxes,3.9 thieving crate CUSTOM
2643,op1,3555,potteryoven,Pottery Oven,3.2 money/XP CUSTOM
3816,op1,3567,eadgar_kitchen_drawers,Kitchen Drawers,3.2 money/XP CUSTOM
7133,op1,3580,abyss_exit_to_nature,Nature rift,3.2 money/XP CUSTOM
2513,op1,3593,loc_2513,Target,3.2 money/XP CUSTOM
2781,op1,3605,furnace1,Furnace,3.2 money/XP CUSTOM
2287,op1,3617,barbarian_obstacle_pipe,Obstacle pipe,3.2 money/XP CUSTOM
2111,op1,3629,gemrock,Rocks,3.2 money/XP CUSTOM
2193,op1,3641,loc_2193,Chest,3.2 money/XP CUSTOM
12120,op1,3654,fairy_chest_closed,Closed chest,3.2 money/XP CUSTOM
2357,op1,3666,digsitebush,Bush,3.2 money/XP CUSTOM
1276,op1,3676,tree,Tree,3.7 woodcutting->coins CUSTOM
1277,op1,3677,lighttree,Tree,3.7 woodcutting->coins CUSTOM
1278,op1,3678,tree2,Tree,3.7 woodcutting->coins CUSTOM
1279,op1,3679,tree3,Tree,3.7 woodcutting->coins CUSTOM
1280,op1,3680,lighttree2,Tree,3.7 woodcutting->coins CUSTOM
1282,op1,3681,deadtree1,Dead tree,3.7 woodcutting->coins CUSTOM
1283,op1,3682,deadtree1_large,Dead tree,3.7 woodcutting->coins CUSTOM
1284,op1,3683,deadtree4,Dead tree,3.7 woodcutting->coins CUSTOM
1285,op1,3684,lightdeadtree1,Dead tree,3.7 woodcutting->coins CUSTOM
1286,op1,3685,deadtree2,Dead tree,3.7 woodcutting->coins CUSTOM
1289,op1,3686,deadtree2_dark,Dead tree,3.7 woodcutting->coins CUSTOM
1290,op1,3687,deadtree3,Dead tree,3.7 woodcutting->coins CUSTOM
1291,op1,3688,deadtree2_snowy,Dead tree,3.7 woodcutting->coins CUSTOM
1315,op1,3689,evergreen,Evergreen,3.7 woodcutting->coins CUSTOM
1316,op1,3690,evergreen_large,Evergreen,3.7 woodcutting->coins CUSTOM
1318,op1,3691,evergreen_vsnowy_large,Evergreen,3.7 woodcutting->coins CUSTOM
1319,op1,3692,evergreen_snowy_large,Evergreen,3.7 woodcutting->coins CUSTOM
1330,op1,3693,snowtree1,Tree,3.7 woodcutting->coins CUSTOM
1331,op1,3694,snowtree2,Tree,3.7 woodcutting->coins CUSTOM
1332,op1,3695,snowtree3,Tree,3.7 woodcutting->coins CUSTOM
1365,op1,3696,deadtree2_swamp,Dead tree,3.7 woodcutting->coins CUSTOM
1383,op1,3697,deadtree6,Dead tree,3.7 woodcutting->coins CUSTOM
1384,op1,3698,deadtree_burnt,Dead tree,3.7 woodcutting->coins CUSTOM
2409,op1,3699,leprechauntree,Tree,3.7 woodcutting->coins CUSTOM
3033,op1,3700,newbietree,Tree,3.7 woodcutting->coins CUSTOM
3034,op1,3701,newbietree2,Tree,3.7 woodcutting->coins CUSTOM
3035,op1,3702,newbiedeadtree,Tree,3.7 woodcutting->coins CUSTOM
3036,op1,3703,newbiedeadtree2,Tree,3.7 woodcutting->coins CUSTOM
3881,op1,3704,regicide_tree_large2,Tree,3.7 woodcutting->coins CUSTOM
3882,op1,3705,regicide_tree_large3,Tree,3.7 woodcutting->coins CUSTOM
3883,op1,3706,regicide_tree_small,Tree,3.7 woodcutting->coins CUSTOM
5902,op1,3707,mdaughter_impassable_tree,Dead tree,3.7 woodcutting->coins CUSTOM
5903,op1,3708,mdaughter_impassable_tree2,Dead tree,3.7 woodcutting->coins CUSTOM
5904,op1,3709,mdaughter_passable_tree,Dead tree,3.7 woodcutting->coins CUSTOM
1281,op1,3714,oaktree,Oak,3.7 woodcutting->coins CUSTOM
3037,op1,3715,newbieoaktree,Oak,3.7 woodcutting->coins CUSTOM
1308,op1,3720,willowtree,Willow,3.7 woodcutting->coins CUSTOM
5551,op1,3721,loc_5551,Willow,3.7 woodcutting->coins CUSTOM
5552,op1,3722,loc_5552,Willow,3.7 woodcutting->coins CUSTOM
5553,op1,3723,loc_5553,Willow,3.7 woodcutting->coins CUSTOM
1307,op1,3728,mapletree,Maple tree,3.7 woodcutting->coins CUSTOM
4674,op1,3729,misc_dummy_mapletree,Maple tree,3.7 woodcutting->coins CUSTOM
1309,op1,3734,yewtree,Yew,3.7 woodcutting->coins CUSTOM
1292,op1,3739,dramentree,Dramen tree,3.7 woodcutting->coins CUSTOM
1306,op1,3740,magictree,Magic tree,3.7 woodcutting->coins CUSTOM
1733,op1,3745,loc_1733,Staircase,3.8 agility
1814,op1,3765,wildinlever,Lever,3.1 teleport/portal CUSTOM
1815,op1,3777,wildoutlever,Lever,3.1 teleport/portal CUSTOM
9533,op1,3790,sarim_crate,Crate,3.2 money/XP CUSTOM
1748,op1,3799,laddermiddle,Ladder,3.1 teleport/portal CUSTOM
9535,op1,3808,sarim_crate3,Crates,3.2 money/XP CUSTOM
4031,op1,3817,shantay_pass_henge_doorway,Shantay pass,3.1 teleport/portal CUSTOM
2416,op1,3826,loc_2416,Lever,3.3 training dummy/altar CUSTOM
104,op1,3840,ikov_chestopen,Open chest,3.3 training dummy/altar CUSTOM
2393,op1,3854,goal_gnomeball_game,Gnome goal,3.3 training dummy/altar CUSTOM
75,op1,3868,arena_guard_chest_shut,Chest,3.3 training dummy/altar CUSTOM
299,op1,3881,haystack2,Hay Bales,3.3 training dummy/altar CUSTOM
61,op1,3894,thrantaxaltar,Chaos altar,3.3 training dummy/altar CUSTOM
2469,op1,3904,firetemple_exit_portal,Portal,3.1 teleport/portal CUSTOM
7324,op1,3912,rd_portal_room6_entrance,Portal,3.1 teleport/portal CUSTOM
2472,op1,3918,lawtemple_exit_portal,Portal,3.1 teleport/portal CUSTOM
7352,op1,3929,rd_portal_room7_entrance,Portal,3.1 teleport/portal CUSTOM
7315,op1,3935,rd_portal_room3_entrance,Portal,3.1 teleport/portal CUSTOM
7316,op1,3945,rd_portal_room3_exit,Portal,3.1 teleport/portal CUSTOM
7319,op1,3955,rd_portal_room4_exit,Portal,3.1 teleport/portal CUSTOM
4389,op1,3961,castlewars_saradomin_exit,Portal,3.1 teleport/portal CUSTOM
7325,op1,3967,rd_portal_room6_exit,Portal,3.1 teleport/portal CUSTOM
4156,op1,3973,vt_mazeportal_7,Portal,3.1 teleport/portal CUSTOM
2465,op1,3980,airtemple_exit_portal,Portal,3.1 teleport/portal CUSTOM
2474,op1,3986,chaostemple_exit_portal,Portal,3.1 teleport/portal CUSTOM
3192,op1,3994,loc_3192,Scoreboard,3.13 misc
6462,op1,4002,icegate_right_small,Ice gate,3.1 teleport/portal CUSTOM
6461,op1,4008,icegate_left_small,Ice gate,3.1 teleport/portal CUSTOM
10687,op1,4014,loc_10687,Puppet torsos,3.4 reward crate CUSTOM
10688,op1,4030,loc_10688,Puppet arms,3.4 reward crate CUSTOM
10689,op1,4037,loc_10689,Puppet legs,3.4 reward crate CUSTOM
10691,op1,4048,loc_10691,Puppet torsos,3.4 reward crate CUSTOM
10692,op1,4054,loc_10692,Puppet arms,3.4 reward crate CUSTOM
10693,op1,4060,loc_10693,Puppet legs,3.4 reward crate CUSTOM
10695,op1,4066,loc_10695,Puppet torsos,3.4 reward crate CUSTOM
2480,op1,4073,water_altar,Altar,3.6 runecrafting
2481,op1,4077,earth_altar,Altar,3.6 runecrafting
2482,op1,4081,fire_altar,Altar,3.6 runecrafting
2483,op1,4085,body_altar,Altar,3.6 runecrafting
2484,op1,4089,cosmic_altar,Altar,3.6 runecrafting
2487,op1,4093,chaos_altar,Altar,3.6 runecrafting
2486,op1,4097,nature_altar,Altar,3.6 runecrafting
2485,op1,4101,law_altar,Altar,3.6 runecrafting
7139,op1,4107,abyss_exit_to_air,Air rift,3.6 runecrafting
2182,op1,4118,chestopen_khazard,Open chest,3.1 teleport/portal CUSTOM
7137,op1,4127,abyss_exit_to_water,Water rift,3.6 runecrafting
7130,op1,4138,abyss_exit_to_earth,Earth rift,3.6 runecrafting
7129,op1,4149,abyss_exit_to_fire,Fire rift,3.6 runecrafting
7131,op1,4160,abyss_exit_to_body,Body rift,3.6 runecrafting
7135,op1,4171,abyss_exit_to_law,Law rift,3.6 runecrafting
7132,op1,4182,abyss_exit_to_cosmic,Cosmic rift,3.6 runecrafting
2467,op1,4193,watertemple_exit_portal,Portal,3.1 teleport/portal CUSTOM
7134,op1,4204,abyss_exit_to_chaos,Chaos rift,3.6 runecrafting
2466,op1,4215,mindtemple_exit_portal,Portal,3.1 teleport/portal CUSTOM
1747,op1,4225,ladder,Ladder,3.10 ladders/stairs
1750,op1,4226,loc_1750,Ladder,3.10 ladders/stairs
1738,op1,4227,loc_1738,Staircase,3.10 ladders/stairs
1722,op1,4228,stairs,Staircase,3.10 ladders/stairs
1734,op1,4229,loc_1734,Staircase,3.10 ladders/stairs
55,op1,4230,tunnelstairstop,Stairs,3.10 ladders/stairs
57,op1,4231,tunnelstairstop2,Stairs,3.10 ladders/stairs
5946,op1,4232,swamp_cave_climbing_rope,Climbing rope,3.10 ladders/stairs
1757,op1,4233,loc_1757,Ladder,3.10 ladders/stairs
2148,op1,4234,wizards_tower_ladder,Ladder,3.10 ladders/stairs
3608,op1,4235,agility_ticketpillar,Ticket Dispenser,3.10 ladders/stairs
2408,op1,4236,entranaladdertop,Ladder,3.10 ladders/stairs
5055,op1,4237,thrt_tavern_trap_door,Trapdoor,3.10 ladders/stairs
5131,op1,4238,loc_5131,Trapdoor,3.10 ladders/stairs
9359,op1,4239,loc_9359,Cave exit,3.10 ladders/stairs
2492,op1,4240,blankrunestone_exit_portal,Portal,3.10 ladders/stairs
2406,op1,4241,zanarisdoor,Door,3.10 ladders/stairs
5280,op1,4242,ahoy_tower_stairs_lv1,Staircase,3.10 ladders/stairs
6707,op1,4243,barrows_stairs_verac,Staircase,3.10 ladders/stairs
6706,op1,4244,barrows_stairs_torag,Staircase,3.10 ladders/stairs
6705,op1,4245,barrows_stairs_karil,Staircase,3.10 ladders/stairs
6704,op1,4246,barrows_stairs_guthan,Staircase,3.10 ladders/stairs
6703,op1,4247,barrows_stairs_dharok,Staircase,3.10 ladders/stairs
6702,op1,4248,barrows_stairs_ahrim,Staircase,3.10 ladders/stairs
4772,op1,4249,mm_bamboo_ladder,Bamboo Ladder,3.10 ladders/stairs
6672,op1,4256,tog_climbing_rocks_down,Rocks,3.10 ladders/stairs
6673,op1,4257,tog_climbing_rocks_up,Rocks,3.10 ladders/stairs
2213,op2,4296,bankbooth,Bank booth,4 op2 bank/stall/clue
2214,op2,4297,loc_2214,Bank booth,4 op2 bank/stall/clue
2566,op2,4298,chest_10_coins,Chest,4 op2 bank/stall/clue
3045,op2,4299,newbiebankbooth,Bank booth,4 op2 bank/stall/clue
5276,op2,4300,ahoy_bankbooth,Bank booth,4 op2 bank/stall/clue
6084,op2,4301,dwarf_keldagrim_bankbooth,Bank booth,4 op2 bank/stall/clue
11758,op2,4302,loc_11758,Bank booth,4 op2 bank/stall/clue
2562,op2,4306,gem_stall_stealing,Gem stall,4 op2 bank/stall/clue
4878,op2,4311,mm_stall_scimitar,Scimitar Stall,4 op2 bank/stall/clue
4877,op2,4316,mm_stall_magic,Magic Stall,4 op2 bank/stall/clue
4876,op2,4321,mm_stall_general,General Stall,4 op2 bank/stall/clue
2560,op2,4326,silk_stall_stealing,Silk stall,4 op2 bank/stall/clue
4705,op2,4331,misc_fish_market,Fish stall,4 op2 bank/stall/clue
4706,op2,4336,misc_veg_market,Veg stall,4 op2 bank/stall/clue
2565,op2,4341,silver_stall_stealing,Silver stall,4 op2 bank/stall/clue
635,op2,4346,tea_stall,Tea stall,4 op2 bank/stall/clue
1739,op2,4350,loc_1739,Staircase,3.10 ladders/stairs
348,op2,4354,drawers1,Drawers,4 op2 bank/stall/clue
356,op2,4363,crate_old,Crate,4 op2 bank/stall/clue
357,op2,4373,crate2_old,Crate,4 op2 bank/stall/clue
1739,op3,4396,loc_1739,Staircase,3.10 ladders/stairs
```
