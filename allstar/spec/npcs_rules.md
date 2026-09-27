# Allstar-Scape v2 — NPCs, drops, combat, server rules, login, XP (port inventory)

Source: `D:\Desktop\allstar.scape.v2` (read-only). Lost City (LC) reference: `D:\Desktop\Allstar-City\content` (`pack/npc.pack`, `pack/obj.pack`, `scripts/**/*.npc`, `_unpack/377/all.npc|all.obj`). Where an LC debugname is given in `[brackets]` it is the 377 name for the same id.

## 0. Conventions

- **Tags**: `CUSTOM` = Allstar-specific, must port. `AUTH` = real RS behaviour LC already has (still note Allstar's exact numbers when they differ — per the 1:1 scope change, the Allstar numbers are what must be reproduced). `JUNK` = dead code / unreachable / bug with no gameplay meaning. `BUG` = reachable bug that changes behaviour (a 1:1 port must decide whether to reproduce).
- **Tick**: one server cycle = **500 ms** (`server.java:16 cycleTime = 500`). "N cyc" = N × 0.5 s. (RS/LC tick is 600 ms — every timer below must be converted: `LC ticks = cyc × 500 / 600`, or run LC timers in "Allstar cycles".)
- `r(n)` = `misc.random(n)` = uniform integer **0..n inclusive** (`misc.java:96`). `r2(n)` = `misc.random2(n)` = 1..n. `r3(n)` = 0..n-1.
- Line refs: `C:` = client.java, `NH:` = NPCHandler.java, `P:` = Player.java, `PH:` = PlayerHandler.java, `S:` = server.java, `I2:` = Item2.java etc.
- Allstar XP curve is **half** the RS curve (see §6.1). Any "level" derived from XP below uses that curve unless noted.

### 0.1 Porting checklist (what makes Allstar different from LC)

1. **500 ms cycle** and every timer in cycles (§1.1).
2. **Half XP curve** (99 = 6,517,816 XP) + huge per-action XP (melee 750/dmg, magic 1000/dmg, 1700×lvl skill chests, Ourg bones 13k) (§3.8, §6).
3. **NPC combat model**: HP from npc.cfg (0 → 3000), max hit = HP/100, hit = uniform 0..max, no accuracy/defence/prayers, 7-cycle attack speed, 35 s universal respawn, NPC won't chase/hit a moving player, retaliation drops when anyone is ≥5 tiles away, only KQ/Jad aggressive (§2.3-2.4).
4. **Custom boss stats & placements** (KBD 2600 HP in a safe "training area", Rock crabs 5000 HP, Dagannoth kings/Agrith Naar "Strength guild", Jads in Varrock/wilderness, Chaos Elementals in the Law altar) (§2.8, Appendix A/B).
5. **Custom drop engine**: only ~50 NPC types drop anything; 1 item per table roll, amount 1; custom rare tables with custom item ids ≥14000 (3rd age, Bandos, godswords, skill capes) (§2.6).
6. **Drop-chain minigames**: Icon, Enchanted, Godsword/Elemental, Granite-maul, Kalphite chest, wishing well (§8).
7. **Player combat**: max hit `(Str+StrBonus)/6.83`, no accuracy, fixed 3.0 s PvP / 2.5 s PvM melee speed, ranged r(20)/r(15) with rune arrows only, custom magic tables (§3.1-3.3).
8. **Special attacks**: custom costs/damages, many are cosmetic in PvP but work in PvM (§3.4).
9. **PvP everywhere except 67 safe rectangles + plane 1**; no wilderness levels, no multi/single, no skulls; any protection prayer = immune to player melee/range; PK points 1/2/3 with partyhat rewards (§4).
10. **Death**: instant, keep last 3 inventory stacks, everything else dropped, respawn 2853,3591 (§4.4).
11. **Login/new player**: spawn 2852,3591 with custom outfit + dragon scimitar, 98 HP quirk, `::starter` (25M + runes + mantas), welcome/broadcast texts, plaintext two-file save format, rights only from save file (§5).
12. **99 rewards**: custom skill capes + global broadcast; cape emote +1 boost (§6.3).
13. **Globals**: yell for everyone, one broadcast per cycle, no timed events/double XP (§7).

---

## 1. Server core (S:, PH:)

| Item | Value | Ref | Tag |
|---|---|---|---|
| Cycle | 500 ms; main loop: `playerHandler.process → npcHandler.process → itemHandler.process → shopHandler.process → antilag.process → itemspawnpoints.process → objectHandler.process → objectHandler.firemaking_process → System.gc()` | S:39-57 | CUSTOM (order matters for 1:1: players act before NPCs each cycle) |
| Player cycle order | for each player: `actionAmount--`, `preProcessing`, `client.process()`, drain all packets (`packetSending` loop), `postProcessing`, `getNextPlayerMovement`; then 2nd pass: initialize()/update() (sends player+NPC update packets); then clearUpdateFlags | PH:116-263 | AUTH-ish |
| Max players | `maxPlayers = 200` (slot 0 unused → 199 usable). Login refused (code 7) when `playerCount >= 200` | PH:11, C:10803 | CUSTOM value |
| Max NPCs | 10000 slots (`maxNPCs`), NPC defs 10000, drop defs 10000 | NH:5-7 | — |
| Per-IP limit | intended max 3 connections/host but `Connections[]` compares String with `==` → never matches → **no IP limit** | S:164-179, C:11185 | BUG |
| Port | 43594; login magic 255/317; RSA disabled; UID `-74352552` logged as "XeroScape cheat client" | S:122, C:10712-10764 | AUTH/JUNK |
| Idle timeout | 20 cyc (10 s) without any packet → disconnect (+`saveStats`) | C:18015 | AUTH-ish |
| Flood kick | `actionAmount` +1 per command/some actions, −1 per cycle; `> 25` → "Kicked for acting too fast!" | C:17031, PH:149 | CUSTOM |
| System update | `::update N` (rights 3 or name "Fatality") → countdown N+1 s, client frame 114 `updateSeconds*50/30`; at expiry kick all + `ShutDown` (100 cycles later server exits). New logins refused with code 14 while running | C:13384, PH:244-253, S:86-91, C:11158 | AUTH-ish |
| antilag | server auto-restart after 9,999,999 cyc (~58 days) via `runserver.bat` | antilag.java | JUNK |
| Ground items | item added with an owner → shown only to owner; after **60 cyc (30 s)** shown to everyone else; at **120 cyc (60 s)** removal packets sent. Slot is **never freed** on expiry (only on pickup) → after 5001 un-picked drops no new ground items can be created until restart | ItemHandler.java:43-110 | BUG (timers CUSTOM: RS = 60 s/60 s) |
| God-cape spawn | every 100 cyc: Zamorak cape 2414 @3118,9848; Saradomin cape 2412 @3119,9848; Guthix cape 2413 @3120,9848 (owner 0 → appear for everyone after 60 cyc, disappear at 120). Each spawn permanently consumes 3 of the 5001 ground-item slots unless picked up → table full after ≈1667 un-picked spawns (≈23 h uptime), after which **no NPC drops or player drops appear** | itemspawnpoints.java | CUSTOM + BUG |
| drops.cfg | world ground-item spawn list (`drop = ItemID X Y Amount Height Type`), **never loaded** (`loadDrops` commented out at ItemHandler.java:40,194; loader ignores Type). Contents are authentic RS ground spawns + custom `995 x1,000,000 @2514,3861`. | drops.cfg | JUNK (dead) |

### 1.1 Timer table (all in cycles of 500 ms)

| Timer | Cycles | Seconds | Ref |
|---|---|---|---|
| NPC attack interval | 7 | 3.5 | NH:2038/2210/2294 |
| NPC death anim → drop | 10 (+ waits for NPC `actionTimer` to reach 0, up to 7 more) | 5 | NH:965 |
| NPC drop → respawn | 60 | 30 | NH:976 |
| Rocks → Rock crab wake | 2 | 1 | NH:342 |
| NPC poison hit | every 39 (first 39 after poisoning), max 15 hits | 19.5 | NH:297-313 |
| Player poison hit | every 39 (first 39 after poisoning), max 15 hits | 19.5 | C:9182 |
| Player melee attack (PvP) | 6 (all melee weapons) / 5 (magic shortbow 861) | 3.0 / 2.5 | C:24769 (see §3.1) |
| Player melee attack (PvM) | 5 (all melee) ; bows: 4 (861, 839-857) / 9 (859, 6724, 4214) | 2.5 / 2.0 / 4.5 | C:28713 |
| PvP magic | 20 between casts (`mageTimer`) | 10 | C:21293 |
| Special energy regen | +1 % every 4 | 2.0 (100 % in 200 s) | C:17002 |
| Boosted stat decay (skills 0-6 only) | −1 level every 250 | 125 | C:17060-17107 |
| Prayer drain | `PrayerDrain` N = 40/30/20/15 → 1 pt every N−1 = 39/29/19/14 (see §3.5) | 19.5/14.5/9.5/7 | C:24196-24412, 17449 |
| Run energy regen | +1 % every cycle (`server.EnergyRegian = 0`) | 0.5 | C:17572 |
| Logout lock after combat | `LogoutDelay = 2` | 1 (message says "10 seconds") | C:9090, C:23955 |
| Auto-save | first after 300, then every 20 | 150 / 10 | C:15863, C:17509-17532 |
| Teleport (modern/ancient) | 5 / 12 | 2.5 / 6 | C:15967 |
| Ring of life teleport | 4 | 2 | C:25679 |
| Trade request timeout | 40 | 20 | C:17669 |
| Reputation give cooldown | 3600, **never decremented** (one rep per session) | — | C:11345 |
| Wishing well cooldown | `actionTimer = 3600` | 1800 (msg says 1 hour) | C:18763 |

---

## 2. NPC system

### 2.1 Data files & structures

**npc.cfg** (`npc = ID<TAB>Name<TAB>Combat<TAB>Health`, terminator `[ENDOFNPCLIST]`; 2650 entries, ids 0..3500). Loaded by `loadNPCList` (NH:2550). Only **Health** matters for gameplay (spawn HP → also max hit, §2.3). Name is used only in server-side text (`GetNpcName`), combat is unused (the client cache shows level). Lookups take the **first** matching row (NH:2539). Two rows appended at the end out of order (3499 Gelatinnoth Mother 600/1000, 2783 Dark Beast 182/350) are the only ones for those ids.

**autospawn.cfg** (`spawn = NpcID CoordX CoordY Height RangeX1 RangeY1 RangeX2 RangeY2 WalkType Description`, tab-separated, `[ENDOFSPAWNLIST]`; 492 rows). `loadAutoSpawn` (NH:2470) → `newNPC(id,x,y,h, X1,Y1,X2,Y2, walk, HP=GetNpcListHP(id), Respawns=true)`. Description is ignored.
- **Range semantics** (NH:265-295): absolute coords; X1/Y1 = **max** corner, X2/Y2 = **min** corner. A random-walk step is allowed only if the new tile is inside `[X2..X1]×[Y2..Y1]`. Random walk is attempted only if **all four** values > 0 (NH:371-375). Boxes with min>max, or boxes not containing the spawn point, make the NPC stationary (very common in this file — only 84 of 492 spawns can actually wander; see Appendix A flag `WANDERS`).
- **WalkType**: `1` = wander inside box (`IsInWorldMap` always returns true); `2` = wander inside box but never onto a tile listed in `worldmap2` (45 hard-coded Lumbridge cow-field fence tiles, NH:1849); for a diagonal step with MoveX==MoveY both orthogonal tiles are also checked; **any other value** (e.g. 1183, 2651 used for KQ/Jad) = never wanders. `worldmap[][]` (walkable list) is dead (`IsInWorldMap` returns true on first iteration). No clipping/collision at all.
- Wander chance: when idle, `r2(10)==1` (10 %/cycle); step: `dx=r(1), dy=r(1)` then `Rnd=r2(4)`: 1→(−dx,−dy), 2→(−dx,dy), 3→(dx,−dy), 4→(dx,dy) (NH:376-391).

**npcdrops.cfg** (`npcdrop = NPCID DropType Item Amount Item Amount ...`, `[ENDOFNPCDROPLIST]`): loaded into `NpcDrops[]` (NH:2612) but the only consumer `MonsterDropItems()` is **commented out** (NH:1017-1086). Intended semantics of the dead code: DropType 0 = drop every listed item always; then `r2(5)` picks table 1..5 and one random entry is dropped. **JUNK (no effect).** (Contents are the stock Moparscape list + custom `14860 Helmet of Neitznot` on Rock crab 1265.)

**NPC.java fields** (per instance): `npcId` (slot), `npcType` (def id), `absX/absY/heightLevel`, `makeX/makeY` (spawn/respawn point), `moverangeX1/Y1/X2/Y2`, `walkingType`, `HP/MaxHP/MaxHit`, `hitDiff` (pending damage), `animNumber`, `actionTimer` (attack/death/respawn countdown), `StartKilling` (player index it fights / first attacker), `Killing[200]` (damage dealt per player index → drop owner), `IsDead/DeadApply/NeedRespawn/Respawns`, `IsUnderAttack` (retaliating), `RandomWalk` (true = idle/wander, false = in combat), `IsClose` (rock-crab wake), `followPlayer/followingPlayer` (summoned), `attacknpc/IsUnderAttackNpc` (NPC-vs-NPC), `PoisonDelay(999999)/PoisonClear/poisondmg`, `textUpdate` (forced chat), `viewX/viewY` (face coords), `attackable` (never used).

### 2.2 Spawning, HP and max hit (NH:27-64)

- `newNPC`: takes the first free slot ≥1. **If HP ≤ 0 (npc.cfg health 0 or id missing from npc.cfg) → HP = 3000.** `MaxHP = HP`. **`MaxHit = floor(HP/100)`, minimum 1.** (e.g. KBD 2600 HP → max 26; Rock crab 5000 → 50; every 0-HP NPC → 3000 HP / max 30.) — CUSTOM (this is the only NPC max-hit source except the per-type overrides in §2.4).
- `newSummonedNPC` (NH:66): same but min MaxHit 10 and `followPlayer` set — **never called** (JUNK).
- HP of every spawned type (cfg HP → effective HP / max hit) is in Appendix A and §2.9.

### 2.3 NPC process loop (NH:315-1015), per cycle, per NPC

1. `actionTimer--` if > 0; `Poison(i)`; `PoisonDelay--`; if `PoisonClear >= 15` stop poison.
   - Poison starts at 999999 → every NPC that stays alive ~999,999 cycles (≈139 h uptime) starts taking poison ticks. BUG/JUNK.
2. If alive, first matching branch of this chain:
   a. **Rocks 1266/1268** (sleeping rock crabs): if any player within Chebyshev 2 and not yet `IsClose` → `actionTimer=2, IsClose=true`; when `actionTimer==0 && IsClose` → rebuild all NPC lists and replace the NPC with type **id−1** (1265/1267 Rock Crab) at its spawn point with the **same MaxHP** (NH:334-370). AUTH mechanic, CUSTOM HP.
   b. **Wander** (idle, 10 %).
   c. **Combat**: `RandomWalk==false && IsUnderAttack` → `AttackPlayerMage(i)` if type ∈ {1645, 1241, 1246, 1159, 54}, else `AttackPlayer(i)`.
   d. **Summoned follow**: `followingPlayer && owner online`: if owner `AttackingOn>0` → `StartKilling = owner.AttackingOn`, attack that player (mage if type ∈ {1645,509,1241,1246,54}); else `FollowPlayer`.
   e. (identical condition → **unreachable**) summoned NPC-vs-NPC branch. JUNK.
   f. `IsUnderAttackNpc` → `AttackNPC(i)` (NPC-vs-NPC; only reachable if some NPC attacked another — practically never). JUNK.
3. If `RandomWalk` → apply the pending step (`getNextNPCMovement`).
4. Forced chat (§2.7).
5. **Retreat/de-aggro loops (NH:773-801)**: for **every online player**, if that player's distance (Euclidean, truncated) to the NPC is **≥ 5** → `RandomWalk = true` (2nd loop excludes KQ 1158). Because `RandomWalk=true` disables branch (c), **an NPC stops retaliating as soon as ANY online player (not just its target) is ≥5 tiles away**, and nothing re-arms it except a new attack click (packet 72), a magic cast (packet 131), `SpecDamgNPC`, or AoE (`attackNPCSWithin`). In single-player testing = "stops fighting if you walk 5+ tiles away". BUG (reproduce literally or as "leash 5 tiles from target").
6. **Aggression (NH:802-830)**: only **Kalphite Queen 1158** and **TzTok-Jad 2745**: for every player within distance ≤ 20 on the same height → `StartKilling = that player` (last such player index wins), `RandomWalk=false`, `IsUnderAttack=true`. CUSTOM.
7. Dead NPC (NH:901-1011):
   - when `actionTimer==0` (first time): set death anim (table below), `DeadApply`, `actionTimer=10`; if summoned, owner `summonedNPCS--`.
   - next time `actionTimer==0`: **`MonsterDropItem`** (§2.6), `NeedRespawn`, `actionTimer=60`, move to `makeX/makeY`, HP=MaxHP, anim 0x328. While `NeedRespawn` the NPC is invisible (`Player.withinDistance(NPC)` false).
   - next `actionTimer==0`: force every player to rebuild NPC list; if `Respawns` → delete and `newNPC` again (same def id, except **1265→1266, 1267→1268** i.e. dead Rock crabs come back as Rocks). Non-respawning NPCs (`::npc` spawns) stay invisible forever and force a full NPC-list rebuild for every player every cycle (BUG, perf).
   - **Total death→respawn ≈ 70 cycles (35 s)** for every NPC type (no per-NPC respawn times). CUSTOM (RS varies per NPC).

**Death animations** (NH:904-961): cows 81/397/1766/1767/1768 → 62 (0x03E); chicken 41 → 57; rat 87 → 141; 75 → 466; Barrows 2025-2030, KBD 50, 2036 → 2304 (0x900); KQ 1158 → 1187; Greater demon 83 → 804; Chaos Ele 3200 → 777; Aberrant 1605 → 1508; dragons/hellhound 55, 49, 941, 1590, 1591, 1592, 53, 54 → 92; Jad 2745 → 2654; **default → 2304**.

**NPC block animation when hit by a player** (`GetNPCBlockAnim`, NH:1889): 50/53/1158 → 1186; 54/2256/21/18 → 403; 2745 → 2653; 92 → 0; 55 → 89; default 1834.

### 2.4 NPC attack formulas

Common to `AttackPlayer` (melee) and `AttackPlayerMage` (NH:2047-2300):
- Target = `StartKilling`. Returns without attacking if target null (→ reset) or **target `DirectionCount < 2`** (the player moved during the last 2 cycles). This check comes before the follow step, so **while the target keeps moving the NPC neither chases nor hits** — it resumes once the player has stood still for 2 cycles. BUG/CUSTOM.
- `hitDiff = r(MaxHit)` (0..floor(HP/100)), then per-type override below. **No accuracy roll, no player defence, no prayer check** (protection prayers do nothing vs NPCs).
- Ring of life: if target wears 2570 and `targetHP <= (int)(maxHP/10 + 0.5)` (maxHP via NPCHandler's own **authentic-curve** `getLevelForXP` capped 135 — inconsistent with players' half curve) → set `SafeMyLife` instead of hitting (§3.7).
- Damage clamped to target's current HP; player plays block anim `GetBlockAnim(weapon)` (C:27728); `actionTimer = 7` after every attack (overrides the per-type values set inside the chain).
- **Melee (`AttackPlayer`)**: NPC first steps 1 tile toward the player (`FollowPlayerCB`, except 3200 and 1645): target tile = (px, py+1) if player is south, (px, py−1) if north, else (px+1,py)/(px−1,py); moves by sign on both axes, no clipping. Attack only if Chebyshev distance ≤ 1 (**3200 Chaos Elemental attacks from any distance**).

| NPC | anim | hit (overrides r(MaxHit)) | notes |
|---|---|---|---|
| 81, 397, 1766-1768 cows | 59 | r(MaxHit) | |
| 41 chicken | 55 | r(MaxHit) | |
| 87 rat | 138 | r(MaxHit) | |
| 21 Hero | 451 | 4 + r(9) | |
| 1958 Mummy | 422 | 4 + r(18) | |
| 2256 Paladin | 451 | 4 + r(8) | |
| 50 KBD | 91 | r(26) | no dragonfire |
| 18 Al-Kharid warrior | 451 | 4 + r(2) | |
| 53, 54, 55, 941, 1590, 1591 dragons | 80 | r(MaxHit) | (54 actually uses mage path) |
| 1158 Kalphite Queen | 1184 | 4 + r(35) | aggressive 20 tiles |
| 2026 Dharok / 2027 Guthan / 2029 Torag / 2030 Verac | 2067 / 2080 / 2068 / 2062 | 4 + r(15) | no set effects |
| 83 Greater demon | 64 | r(MaxHit)=r(1) | |
| 82 Lesser demon | 64 | 4 + r(13) | |
| **2745 TzTok-Jad** | if `r(2)==1` (1/3): 2655 "poke" 4+r(25); elif `r(3)==2` (1/6 overall): 2652 "slash" + gfx 451 on target tile, 4+r(30); elif `r(5)==3` (1/12): 2656 "crush" + gfx 451, 4+r(35); else (5/12): 2656, 4+r(25) | melee only, aggressive 20 tiles; attack every 7 cyc |
| 64 Ice spider | 806 | r(MaxHit)=r(1) | |
| 3647 [soulbane_anger_rat] | (none) | r(MaxHit) | |
| **3200 Chaos Elemental** | 806 | r(8) | any range, no follow; **1/4 chance** (`removeschaos={1,2,2,2}`) sets target `dropsitem` → on the player's next cycle: weapon unequipped to inventory, "The Chaos Elemental removes your weapon!", player poisoned (C:17477) |
| 752 Lesser demon (quest id) | 806 | r(5) | |
| everything else | 806 (0x326) | r(MaxHit) | |

- **Magic (`AttackPlayerMage`)**, used by type ∈ {1645, 1241, 1246, 1159, 54} (and 509 only when summoned): **no distance check and no movement** (hits from any range once in combat); anim 711; gfx sent only to the target player:

| NPC | gfx | hit |
|---|---|---|
| 1645 Infernal Mage | 369 on player | 6 + r(43) |
| 509 Nazastarool | – | 8 + r(20) |
| 1241 Loar Shade | 363 on player | 2 + r(19) |
| 124 Earth warrior | anim 1833 | 4 + r(35) (never reached: 124 not in mage list) |
| 1246 Riyl Shade | 368 on NPC, 367 on player | 4 + r(35) |
| 1159 Kalphite Queen (form 2) | 552 | 2 + r(88) (1159 is not spawned) |
| **54 Black dragon** | 197 on player | **2 + r(96)** from any distance |
| other callers | – | 0 |

- `AttackPlayerRanged` (NH:1922) is **never called** — JUNK (would reproduce melee chain with 3200/752/50/35/dragon anims).
- NPC-vs-NPC (`AttackNPC`/`AttackNPCMage`, NH:2302-2411): r(MaxHit) (9 anim 386; mage types same gfx/hit as above via `gfxAll`), winner says "Oh yeah I win bitch!" + anim 2103. Unreachable in practice. JUNK.

**Damage application BUG (important for balance)**: `NPC.appendHitUpdate` does `HP -= hitDiff` every time the NPC's update block is written, and `PlayerHandler.updateNPC` writes it **once per player that has the NPC in view** (NPC.java:147-167, PH:265-317). **Damage dealt to an NPC is multiplied by the number of players currently viewing it** (±15 tiles). Player HP is not affected (players compute `NewHP` instead). A 1:1 port must choose to reproduce or not.

### 2.5 Player-side attack rules vs NPCs (C:19647-19774, C:21341-21404)

- Melee/range attack (packet 72) blocked unless: NPC not NPC-dueling (`attacknpc>0` → "You can't attack a dueling npc!"), NPC not someone else's summon (`followPlayer`), and requirements (CUSTOM):

| NPC | requirement |
|---|---|
| 41 Chicken | Slayer 5 |
| 90 Skeleton | Slayer 20 |
| 1648 Crawling Hand | Slayer 30 |
| 1832 Cave Bug | Slayer 40 |
| 1637 Jelly | Slayer 50 |
| 1604 Aberrant specter | Slayer 65 |
| 50 King Black Dragon | **Strength** 75 |
| 113 Jogre | **Attack** 55 |
| 1615 Abyssal demon | Slayer 82 |
| 2783 Dark Beast | Slayer 99 |

- Magic (packet 131) uses a different list: 1625 Smokedevil Slayer ≥74 (msg says 75), 2035 Giant crypt spider ≥64 (msg 65), 1605 Aberrant specter ≥84 (msg 85); NPCs with current HP exactly 10000 are immune. Magic ignores the melee list (e.g. KBD can be maged without 75 Str). BUG/CUSTOM.
- Attack click sets NPC `StartKilling = player`, `RandomWalk=false`, `IsUnderAttack=true` (NPC starts retaliating). `nonattackable()` list (C:135) is never used — attackability depends only on the client cache "Attack" option. JUNK.
- Kill credit / drop owner: `GetNpcKiller` (NH:1471) = player index with the most `Killing[]` damage (only normal melee/range/magic hits add to `Killing`; special-attack extra hits via `SpecDamgNPC` and AoE do **not**). Ties → `StartKilling` if it shares the top value; if nobody dealt damage → player slot 1.

### 2.6 Drops — `MonsterDropItem` (NH:1089-1469)

Engine semantics (CUSTOM, replaces all authentic drop tables — **NPCs not listed below drop nothing, not even bones**):
- Runs once after the 10-cycle death delay. Every matching `if` fires independently (some NPCs have several blocks). Each block drops **exactly 1 item, amount 1** (coins drops are literally 1 coin) except the Tokkul drop, at the NPC's death tile, owned by `GetNpcKiller` (visible to owner 30 s, then public, removed at 60 s — §1).
- "Table" drops pick **one uniformly random array element** (`arr[(int)(Math.random()*len)]`) — probabilities below are element counts / array length.
- Teleport blocks move the player in **`StartKilling`** (who started the fight — not necessarily the killer); if that player logged out the code throws (no try/catch in the NPC loop → can kill the main thread). BUG.

| NPC (id, HP) | Drop(s) (item id name — chance) | Teleport of StartKilling player | Ref |
|---|---|---|---|
| 275 Guardian of Armadyl (F), 1000 | 4273 Chest key 100 % | → 2608,3163 | NH:1104,1145 |
| 18 Al-Kharid warrior, 38 | `Item3.randomguard`: 995 Coins(1) 30/31, 4151 Abyssal whip 1/31 | – | NH:1109 |
| 21 Hero, 3000 | `Item3.randomhero` (n=61): 995 Coins 40/61; 4151 whip 2/61; 1159 Mithril full helm 2/61; 1/61 each: 1071, 1085, 1093, 1109, 1121, 1127, 1143, 1163, 1198 (noted mith kite), 1201, 1333, 2615, 2617, 2619, 2621, 2623, 6585 Amulet of fury | – | NH:1114 |
| 2256 Paladin, 65 | `Item3.randomguardz` (n=36): 995 26/36; 1/36 each: 1071, 1085, 1109, 1121, 1143, 1159, 1198, 1333, 1995 Unfermented wine, 2623 Rune platebody (t) | – | NH:1119 |
| 1021 Air elemental, 400 | – | → 2660,4839 (Earth room) | NH:1124 |
| 1020 Earth elemental, 400 | – | → 2713,4836 (Water room) | NH:1131 |
| 752 Lesser demon (quest version), 520 | – | → 2542,3029 | NH:1138 |
| 477 Khazard warlord, 1400 | – | → 2608,3159 | NH:1152 |
| 1919 Stranger, 1700 | – | → 2866,9952 (Ice giants) | NH:1159 |
| 509 Nazastarool, 800 | 6104 New key 100 % | → 2792,9325 (Flambeed) | NH:1166,1223 |
| 274 Guardian of Armadyl (M), 400 | – | → 2540,3019 (Ice Queen) | NH:1173 |
| 795 Ice Queen, 300 | 4078 Zealot's key 100 % | → 2551,3043 (Lesser demon) | NH:1181,1218 |
| 1022 Water elemental, 400 | – | → 2584,4836 (Fire room) | NH:1187 |
| 1019 Fire elemental, 400 | – | → 2464,4834 (Chaos room / Law altar) | NH:1195 |
| 3200 Chaos Elemental, 800 | `Item2.randomSilvchest`: 601 Keep key / 758 Key / 788 Glough's key / 983 Brass key — 1/4 each | – | NH:1202 |
| 1007 Zamorak Wizard, 400 | 6754 (key, no use found) 100 % | – | NH:1208 |
| 49 Hellhound, 135 | 4272 Bone key 100 % (no use found) | – | NH:1213 |
| 2880 Dagannoth Fledgeling, 185 | 5585 Bronze key 100 % (no use found) | – | NH:1228 |
| 2745 TzTok-Jad, 700 | 6570 Fire cape 100 % | – | NH:1233 |
| 1859 Arzinian Being of Bordanzan, 2500 | **6529 Tokkul ×10,000,000** 100 % **and** `randomArzinian` (n=18): 532 Big bones 15/18, 14521 Amulet of magic(t) 1/18, 15345 Armadyl helmet 1/18, 15346 Armadyl chestplate 1/18 | – | NH:1238,1346 |
| 1158 Kalphite Queen, 800 | `randomKQ` (n=43, each 1/43): 989 Crystal key, 1037 Bunny ears, 1050 Santa hat, 2633/2635/2637 berets, 2653/2655/2659 Zamorak rune plate/legs/kite, 2661/2663/2665/2667 Saradomin plate/legs/full/kite, 2669/2671/2673 Guthix plate/legs/full, 2957 Druid pouch, 2978-2994 (9 Chompy bird hats), 3478/3479/3480 god plateskirts, 4724/4726/4728/4730 Guthan set, 6570 Fire cape, 6818 Bow-sword, 6856-6863 (8 winter hats/scarves) | – | NH:1243 |
| 391 River troll, 100 | `randomtroll`: 3741 Frozen key 4/23, 995 19/23 | – | NH:1248 |
| 41 Chicken, 3 | 4834 Ourg bones 100 % | – | NH:1253 |
| 90 Skeleton, 100 | `randomskeleton` (n=37): 995 34/37; 6137/6139/6141 Skeletal helm/top/bottoms 1/37 each | – | NH:1258 |
| 1648 Crawling Hand, 150 | 526 Bones 14/16; 1333 Rune scimitar 1/16; 2615 Rune platebody(g) 1/16 | – | NH:1263 |
| 1832 Cave Bug, 200 | 526 18/25; 4119/4121/4123/4125/4127/4129/4131 bronze..rune boots 1/25 each | – | NH:1268 |
| 1637 Jelly, 300 | 526 28/30; 6809 Granite legs 1/30; 14860 Helmet of Neitznot 1/30 | – | NH:1273 |
| 1604 Aberrant specter, 220 | `randomaberrantspecter`: 526 26/29; 3840 Holy/3842 Unholy/3844 Balance book 1/29 each **and** `Item.randomSlayeritem65` **and** `Item.randomSlayeritem75` (3 drops) | – | NH:1278,1406,1413 |
| 1615 Abyssal demon, 250 | 526 24/25; 4151 Abyssal whip 1/25 | – | NH:1284 |
| 2783 Dark Beast, 350 | 526 76/78; 6818 Bow-sword 1/78; 11192 (unknown custom) 1/78 | – | NH:1289 |
| 89 Unicorn, 100 | 6966 Prison key 1/19; 995 18/19 | – | NH:1294 |
| 912 / 913 / 914 Battle mages, 200 | 995 27/31; 5698 DDS 1/31; 14507 3rd age robe top 1/31; 14508 3rd age robe 1/31; + 14513 3rd age full helm (912) / 14512 3rd age platebody (913) / 14511 3rd age platelegs (914) 1/31 | – | NH:1299-1315 |
| 86 Giant rat, 5 | 1/14 each: 1067, 1069, 1081, 1083, 1115, 1119, 1153, 1157, 1305 DLS, 1323, 1704 Glory, 1725 Str ammy, 3105 Climbing boots, 5698 DDS | – | NH:1316 |
| 35 Soldier, 400 | 1/13 each: 995, 1079, 1093, 1113, 1127, 1147, 1319, 1333, 1373, 3101 Rune claws, 3202 Rune halberd, 4131 Rune boots, 6897 Rune longsword | – | NH:1321 |
| 114 Ogre, 60 | 837 Crossbow / 995 / 5018 Bone club, 1/3 each | – | NH:1326 |
| 17 Barbarian woman, 80 | 1/12 each: 995, 1038 **Red partyhat**, 1305, 1704, 1725, 3105, 4587 D scim, 4726 Guthan spear, 5698, 7386, 7390, 7394 | – | NH:1331 |
| 3494 Flambeed, 1300 | 6104 New key / 991 Muddy key / 989 Crystal key, 1/3 each | – | NH:1336 |
| **113 Jogre, 700** | `randomJogre` **rolled 3 times** (3 separate blocks): each 1/9 of 1149 D med helm, 1305 DLS, 1377 DBA, 1434 D mace, 4151 whip, 4587 D scim, 5698 DDS, 7158 D2h, 15352 Dragon boots | – | NH:1341,1371,1376 |
| 1575 Skeleton Hellhound, 2000 | 532 13/17; 14506 3rd age vambraces, 14507, 14508, 14509 (unknown) 1/17 each | – | NH:1351 |
| 84 Black Demon, 2000 | 532 14/17; 14503 3rd age top, 14504 3rd age legs, 14505 3rd age coif 1/17 each | – | NH:1356 |
| 111 Ice giant, 2400 | 1543 Red key / 1545 Yellow / 1546 Blue / 1548 Green key, 1/4 each | – | NH:1361 |
| 2919 Agrith Naar, 3000 | 532 16/18; 3140 Dragon chainbody 1/18; 7449 "Allstar's Hammer" 1/18 | – | NH:1366 |
| 2881 Dagannoth Supreme, 2000 | 532 15/17; 15185 Dragonfire shield 1/17; 15195 Dragon full helm 1/17 | – | NH:1381 |
| 2882 Dagannoth Prime, 2000 | 532 15/17; 15334 Bandos godsword 1/17; 15350 Bandos boots 1/17 | – | NH:1386 |
| 2883 Dagannoth Rex, 2000 | 532 16/18; 15348 Bandos chestplate 1/18; 15349 Bandos tassets 1/18 | – | NH:1391 |
| 50 King Black Dragon, 2600 | 1/6 each: 4087 D platelegs, 4585 D plateskirt, 14519 Glory(t), 15195 Dragon full helm, 15334 Bandos godsword, 15352 Dragon boots | – | NH:1396 |
| 188 Monk of Zamorak | 16 Magic whistle 100 % (188 not spawned) | – | NH:1401 |
| 1625 Smokedevil, 170 | `Item.randomSlayeritem65` **and** `randomSlayeritem75` | – | NH:1406,1413 |
| 2035 Giant crypt spider, 140 | `Item.randomSlayeritem65` | – | NH:1406 |
| 1605 Aberrant specter (2), 220 | `Item.randomSlayer99item` (n=73): 4834 Ourg bones 63/73; 2587 Black full helm(t) 2/73; 1/73 each: 2577 Ranger boots, 2593, 2595, 2597 black (g), 2651 Pirate hat, 2653, 2655, 3054 Mystic lava staff | – | NH:1419 |
| 2026 Dharok / 2030 Verac / 2029 Torag / 2028 Karil / 2027 Guthan / 2025 Ahrim | one random piece of **that brother's own set** (helm/weapon/body/legs, 1/4 each) — 100 % per kill | – | NH:1424-1453 |

`Item.randomSlayeritem65` (n=891): 4830 Fayrg bones 873/891, 3187 Bones 13/891, 4716 Dharok helm 2/891, 4732 Karil coif 2/891, 2682 clue 1/891.
`Item.randomSlayeritem75` (n=927): 3187 Bones 279, 4830 Fayrg bones 234, 2352 noted iron bar 201, 2360 noted mith bar 43, 985 key half 40, 4131 rune boots 21, 987 key half 19, 1450 blood talisman 15, 1165 black full helm 11, 4153 granite maul 10, 1127 rune plate 8, 1149/2663/4506/4751 5 each, 1456/6527 4 each, 2643/2682/4087/4722/4755/4757 2 each, 65/1187/2669/4714/4720/6524 1 each (all /927).

Tables defined but unused by NPC drops: `Item2.randomRuneRock` (mining), `randomFish`, `randomwell` (wishing well §8.5), `WolfDrop`, `randomchaos`, `randomSlayer135/120item`, etc.

Drop-chain minigames built from these teleports are described in §8.

### 2.7 NPC forced chat (overhead text) — CUSTOM (NH:495-900)

Chance per cycle: "2/30" = `r2(30) <= 2` (6.7 %/cycle ≈ every 7.5 s); "1/30" = `r2(30)==1`; cows `r2(50)==1`.

| NPC id (name) | text | chance |
|---|---|---|
| 81, 397, 1766, 1767, 1768 (cows) | "Moo" | 1/50 |
| 409 Genie | "Welcome to Allstar-Scape!" | 2/30 |
| 364 King Lathas | "Mod & Admin Portal Only!" | 2/30 |
| 280 Brother Cedric | "Strength Guild, 99 strength to Enter!" | 2/30 |
| 172 Dark wizard | "Range/Magic Guild, 99 Range and Magic to Enter!" | 2/30 |
| 212 King Percival | "Welcome to the Mod/Admin Zone..Keep up the Good Work!" | 2/30 |
| 945 RuneScape Guide | "You Finally Made It here..Keep up the Good Work!" | 2/30 |
| 225 Bonzo | "Icon Minigame!" | 2/30 |
| 648 King Roald | "Welcome to Training Made To Own N33bs!" | 2/30 |
| 793 Alfonse the waiter | "Enchanted Minigame!" | 2/30 |
| 2253 Wise Old Man | "Clan Wars Portal!!" | 2/30 |
| 541 Zeke | "Shittywok Shop!" | 2/30 |
| 2821 [ali_the_farmer] | "Fishing Portal!" | 2/30 |
| 2304 Sarah | "Farming Shop!By seed's for patch's!" | 2/30 |
| 461 Magic store owner | "Magic Shop!" | 2/30 |
| 0 Hans | "Welcome to Allstar-Scape's Shopping Area!" | 2/30 |
| 57 Fairy | "Players Online: <count>" | 1/30 |
| 550 Lowe | "Allstar's Pking Shop!" | 2/30 |
| 1759 Farmer | "Shops Here!" | 2/30 |
| 1699 Ghost shopkeeper | "Pur3 Sh0p!" | 2/30 |
| 920 Prince Ali | "Barrows Portal!" | 2/30 |
| 2475 Frog princess | "Training Portal!" | 2/30 |
| 28 Zoo keeper | "Train Your Skills Here!" | 2/30 |
| 1917 Bandit shopkeeper | "God Armor Shop!" | 2/30 |
| 522 Shop keeper | "General Storez0r!" | 2/30 |
| 548 Thessalia | "Gloves, Robes, Boots Shop!" | 2/30 |
| 530 Shop keeper | "Skillers Shop!" | 2/30 |
| 528 Shop keeper | "Helmet Shop!" | 2/30 |
| 213 Merlin | "You need the frozen key to get in this portal! Kill the troll for key!" | 2/30 |
| 520 Shop keeper | "Allstar's Ownage Shop!" | 2/30 |
| 524 | "Silab Member Shop!" | 2/30 |
| 555 Shop keeper | "Skill Cape Shop!" | 2/30 |
| 561 Shop keeper | "Hood Shop!" | 2/30 |
| 538 Peksa | "Slayer Shop!" | 2/30 |
| 529 | "Farming Shop!" | 2/30 |
| 3117 [macro_sandwich_lady_npc] | "Click the chests for slayer exp .." | 2/30 |
| 866 Skavid | "Et .. Phone .. Home!" | 2/30 |
| 549 Horvik | "Smithin' Shop" | 2/30 |
| 558 Gerrant | "3rd Age Armor Shop" | 2/30 |
| 1451 Sleeping Monkey, 33 Door man | "Tele to varrock" | 1/30 |
| 37 Sigbert | "Tele to tzhaar caves" | 1/30 |
| 1201 Elf warrior | "DO YOU DARE ENTER THE BLACK DRAGONS LAIR?" | 1/30 |
| 1199 Elf Tracker | "GO THROUGH THIS DOOR TO TELEPORT TO THE BLACK DRAGON CAVE" | 1/30 |
| 2301 Monkey | "Tele to the monkey training area" | 1/30 |
| 1659 Skullball | "Go to www.projectdestiny.co.nr to buy and sell things!" | 1/30 |
| 1552 Santa | "I shoulda never sold that crack! Ho HO HO!!" (`r2(50) <= 3`); the "Mod Allstar is ONLINE/OFFLINE" variant is unreachable (duplicate else-if) | 3/50 |

### 2.8 Boss / special NPC summary (all CUSTOM placements & stats)

HP = npc.cfg value (→ max hit floor(HP/100) unless overridden in §2.4). "Safe" = inside a `nonWild()` rectangle (§4.2). Locations = Appendix A lines.

| Boss | Spawns (x,y,h) | HP / max hit | Behaviour | Req to melee | Drop |
|---|---|---|---|---|---|
| King Black Dragon 50 | 3219,2786 & 3219,2794 (Training area, safe) | 2600 / r(26) | melee anim 91, block 1186, death 2304, no fire | Str 75 | KBD table |
| Kalphite Queen 1158 | 3483,9490 (KQ lair, safe; walk 1183 = static) | 800 / 4+r(35) | **aggressive ≤20 tiles**, melee anim 1184, block 1186, death 1187, no 2nd form | – | KQ table (1/43 each) |
| TzTok-Jad 2745 | 3210,3423 (Varrock sq.); 2837,9556; 3477,9495 (KQ lair); 3106,3933 ×3 (wilderness, wanders 3103-3109×3930-3936) | 700 / 4+r(25..35) | **aggressive ≤20 tiles**, melee only (3 anims §2.4), block 2653, death 2654 | – | Fire cape 100 % |
| Chaos Elemental 3200 | 2464,4821; 2454,4833; 2473,4833 (Law altar room, safe) | 800 / r(8) | hits from any range, never moves, 1/4 weapon-strip + poison | – | Silvchest key (4 keys) |
| Dagannoth Supreme/Prime/Rex 2881/2882/2883 | Supreme ×3 (3510,9673; 3515,9673; 3513,9669), Prime ×2 (3507,9685; 3513,9686), Rex ×2 (3496,9687; 3502,9687) ("Strength guild", safe) | 2000 / r(20) | generic melee anim 806, no style mechanics | – | own tables |
| Agrith Naar 2919 | 3503,9678; 3497,9678 (same area) | 3000 / r(30) | generic melee | – | own table |
| Flambeed 3494 | 2792,9328 | 1300 / r(13) | generic | – | 3 keys |
| Black Demon 84 ×4, Skeleton Hellhound 1575 ×4, Arzinian Being 1859 ×4 | 3243-3253, 9357-9372 ("Range/Magic guild", safe) | 2000/r(20), 2000/r(20), 2500/r(25) | generic | – | own tables (+10M Tokkul) |
| Jogre 113 ×8 | 3212-3216, 2788-2792 (Training, safe) | 700 / r(7) | generic | Attack 55 | 3 rolls/kill |
| Soldier 35 ×13 | 3205-3209,2789-2793 & 2892-2894,9902-9905 | 400 / r(4) | generic | – | soldier table |
| Ice giant 111 ×3 | 2866,9954; 2869,9950; 2867,9946 | 2400 / r(24) | generic | – | coloured key |
| Rock Crab 1265 ×13 | 2670-2685, 3720-3731 (Rellekka, safe) | **5000 / r(50)** | wake from Rocks 1266 at ≤2 tiles | – | none |
| Elementals 1019-1022 ×4 each | Air 2840-2848,4830-4838; Earth 2654-2662,4837-4845; Water 2712-2720,4832-4840; Fire 2581-2589,4834-4842 (altar rooms, safe) | 400 / r(4) | generic | – | teleport chain |
| Black dragon 54 | (not autospawned) | 175 / 2+r(96) magic any range | – | – | none |
| Barrows brothers 2025-2030 | ~10-12 each around 3553-3577,3273-3300 (several at bogus y=3000) | 110-150 / r(1) (Dharok/Guthan/Torag/Verac 4+r(15)) | anims 2067/2080/2068/2062 | – | own-set piece 100 % |
| Pest monsters 3758/3760/3771 + portals 3777-3780 | 2646-2679, 2572-2591 (PC island) | 3000 / r(30) (ids missing from npc.cfg) | generic, static | – | none |
| Fight-cave monsters 2741/2743/2746 | 2382-2414, 5131-5162 | 3000 / r(30) (missing from npc.cfg) | generic | – | none |

Other combat-special NPCs: 1645 Infernal Mage (spawned by quest: drop Heart crystal 744 at 2780,3515 while `q3stage==5`, C:23421) mage 6+r(43); Hero 21 (3000 HP, 4+r(9)); Paladin 2256 (4+r(8)).

### 2.9 npc.cfg customisations

- **Names**: no Allstar renames in npc.cfg. All 173 name differences vs LC are stock 317-cfg placeholder/debug names (e.g. `toms_*`, `plaguesheep_1`, `Tracker_gnome_`, `--NO_IDEA--`) — JUNK. NPC display names come from the client cache; npc.cfg names are only used in server messages. (No "Allstar's ..." NPC exists in the server source; the only "Allstar's" names are item 7449 "Allstar's Hammer" and forced-chat strings.) Ids used by spawns but **missing from npc.cfg** (→ HP 3000, max hit 30): 2741, 2743, 2746, 2821, 3117, 3758, 3760, 3771, 3777-3780.
- **Combat level column** differences (server-side only, no gameplay effect): 113 Jogre 145 (LC 53); 124 Earth warrior 150 (51); 1019-1023 elementals 150 (34/35); 1265 Rock Crab 200 (13); 3494 Flambeed 200 (149); 3499 Gelatinnoth Mother 600 (130); 18 Al-Kharid warrior 10 (9); 90 Skeleton 25 (22) / 92 Skeleton 22 (25) (swapped); 21 Hero 0 (69); 172 Dark wizard 0 (20); 748 Giant rat 6 (3); 751 Zombie 25 (24); 2919 Agrith Naar 99 (100); plus a few 0/hidden mismatches (200, 881-884, 1090, 1217, 1305, 1850/1853/1856, 2371). The CUSTOM ones intended as bosses: 113, 124, 1019-1023, 1265, 3494, 3499.
- **HP overrides** (the gameplay-relevant customisation, also sets NPC max hit): full list in **Appendix B** (168 rows where Allstar HP ≠ LC hitpoints or LC has none). Clearly custom boss values: KBD 2600, Black Demon 2000, Ice giant 2400, Soldier 400, Guardian of Armadyl 400/1000, Khazard warlord 1400, Stranger 1700, Nazastarool 800, Lesser demon(752) 520, Ice Queen 300, Kalphite Queen 800/1100/1100, Skeleton Hellhound 2000, Arzinian Being 2500, Dagannoth kings 2000, Agrith Naar 3000, Rock Crab 5000, Flambeed 1300, Gelatinnoth Mother 1000, Jogre 700, Zamorak/Saradomin Wizard 400, Elementals 400, Chaos Ele 800, Jad 700, Battle mages 200, Cave bug 200, Crawling hand 150, Jelly 300, Infernal mage 450/250, shopkeepers/customers 2000 (Nulodion 209, 535, 551, 553 Aubury, 555, 1552 Santa, 2167, 2168, 2262, 2301). Every NPC with cfg HP 0 spawns with 3000 HP (e.g. Hero 21, all banks/shops).

### 2.10 Summoned NPCs — CUSTOM/JUNK

- `newSummonedNPC` is never called. The only summon mechanism is **`::follownpc <npcSlotIndex>`** (C:13687, inside the `rights >= 3 || name "Fatality"` command block C:13382-13793) which makes any existing NPC follow the player (`followPlayer/followingPlayer`). A following NPC attacks whatever **player** its owner is attacking (`AttackingOn`), otherwise walks to the tile beside the owner every cycle (`FollowPlayer`, NH:198). Other players can't attack it ("You can't attack a player's summoned npc!") unless `inwildy2` (always true → so they can). On owner logout all their followers are set `IsDead` (→ normal death, drop, respawn at spawn point). `Player.summonedNPCS` counter decremented on death, never incremented.
- `::npc <id>` (C:13655) spawns any NPC (non-respawning, wander box ±10) and `::a` spawns a KBD — both also inside the rights-3/"Fatality" block (the `rights <= 51` test on `::a` is meaningless). Admin tools.

### 2.11 NPC click teleports / misc (for completeness; dialogue & shops belong to the shop/dialogue inventory)

First-click (C:18900-19160): 1051 (Nature spirit) = alternative starter: if `starter==0` → 15,000,000 coins + 1,500 noted manta rays (392), `starter=1`; else broadcast "<name> is really greedy trying to type ::starter again". 1451 → 3250,3423; 57 Fairy → 2438,5169; 70 Turael → 2413,5117; 33 Door man → 2438,5169; 37 Sigbert → 3254,3436; 2301 Monkey → 2715,9161. Fishing-spot NPCs 233/234/235/236 have custom level gates (90/40/1/75) (skills inventory). Second-click pickpocket (C:19597-19632 → C:24715-24767, always succeeds, anim 881): 18 Al-Kharid warrior (Thieving ≥25) → 1800 coins + 250 Thieving XP, 10 cyc; 2256 Paladin (≥50) → 8000 coins + 220 XP, 4 cyc; 7 Farmer (≥70, "farmers") → 3000 coins + 274 XP, 4 cyc. `robfarmer` (2301 coins) unused.

---

## 3. Player combat (exact formulas) — CUSTOM throughout

### 3.1 Melee

- **Max hit** `CalculateMaxHit()` (C:29387): `StrBonus = playerBonus[10]`, `Str = playerLevel[2]` (current, boosted level):
  - Accurate(1)/Defensive(4): `max = (StrBonus + Str) / 6.8275862068965517`
  - Aggressive(2): `/ 6.6551724137931034`
  - Controlled(3): `/ 6.7586206896551724`
  - `+ Str*0.0014 / *0.0205` for StrPotion 1/2 and `+ Str*0.005/0.01/0.015` for StrPrayer 1/2/3 — **both variables are never set → no effect** (JUNK).
  - Full Dharok (4716 helm, 4720 body, 4722 legs, 4718 axe): `+ (maxHP − curHP) / 2` (integer division; maxHP from half-curve).
  - `playerMaxHit = floor(max)`. E.g. 99 Str + 0 bonus accurate = 14; 99 + 100 aggressive = 29.
  - Bonus array order (C:10254): 0 stab,1 slash,2 crush,3 magic,4 range (attack); 5 stab,6 slash,7 crush,8 magic,9 range (defence); 10 strength; 11 prayer. Bonuses come from item.cfg columns (items inventory).
  - Recalculated on equip change (`WriteBonus`), on Strength XP gain, and at the start of every `Attack()`/`AttackNPC()`.
- **Hit** = `r(playerMaxHit)` uniform 0..max. **No accuracy roll, no attack/defence bonus use, no defence of target, no prayer reduction** (PvP or PvM). Clamped to target current HP.
- **FightType** (C:23903-23953): button → 1 accurate {9125, 22228, 48010, 21200, 1080, 6168, 6236, 17102, 8234}; 4 defensive {9126, 22229, 21201, 1078, 6169, 33019, 18078, 8235}; 3 controlled {9127, 48009, 33018, 6234, 18077, 18080, 18079, 17100}; 2 aggressive {9128, 22230, 21203, 21202, 1079, 6171, 6170, 33020, 6235, 17101, 8237, 8236}. Default 1.
- **Attack speed**: every melee weapon is forced to `PkingDelay = 6` (the per-weapon values 1/5/8/10/16/80 set just before are overwritten) → **PvP one hit per 6 cyc (3.0 s); PvM one hit per 5 cyc (2.5 s)** (PvM loop has no PkingDelay gate; hit when `LoopAttDelay <= 1`). Dark bow 15156 and rune scimitar 1333 also set `actionTimer = 8`.
- **Range of melee**: Chebyshev distance ≤ 1 (diagonals allowed). No path/clip checks.
- **Special-case normal hits**: DDS 5698 in PvP → every hit poisons target and re-rolls `r(maxHit)` (C:24973); Dark bow 15156 (treated as melee, must be adjacent): when `actionTimer == 0` → hit `4 + r(20)` and `actionTimer = 8`, otherwise normal `r(maxHit)` (C:24805, 28740).
- **Animations** `GetWepAnim()` (C:27365): unarmed 422 (kick style 423); whip 4151 / "cat toy" 8447 / mouse toy 6541 → 1658; throwing knives 868 → 385; 6527 → 2927; dark bow 15156, bows 4214/859/861/6724 → 426; DLS 1305, d axe 6739, scimitars 1321-1333, d scim 4587, dark dagger 746, bone club 5018, rune claws 3101 → 451; godswords 15334/15336 → 407; anchor 14915, AGS 15333, SGS 15335 → 406; halberds 3204/3202, bow-sword 6818 → 440; g maul 4153, 7449 → 1665; obby maul 6528 → 2661; DBA 1377, rune b-axe 1373, d mace 1434, rubber chicken 4566 → 1833; spears 5730/4726 → 2080; Dharok 4718 → 2067; Torag 4747 → 2068; Verac 4755 → 2062; Karil 4734 → 2075; crossbows 837/10431 → 427; daggers 1215/1231/5680/5698 → 402; 2h swords 6609/1307-1319, d2h 7158 → 407; scythe 1419 → 408; default 806. Block `GetBlockAnim(weapon)` (C:27728): Verac 2063; whip/defender 1659; shields 1171/1185/1187/1191/1201/2659/2667/2675/3122/3488/4156/6524 → 403; g maul/scythe 1666; default 1834.

### 3.2 Ranged

- Bow list: PvP `UseBow` only for **861 magic shortbow** (all other bows go through the melee branch; 4214 crystal bow, 859, 839-857 may hit from any distance there, 15156 must be adjacent). PvM `UseBow` for 4214, 861, 859, 6724, 839-857 (odd ids); distance-exempt in PvM: 859, 4214, 839-857, 6724 (**not 861 → magic shortbow must be adjacent in PvM**).
- **Arrow check BUG** `CheckArrows` (C:4476): loops 880..892 but overwrites the flag each iteration → **only Rune arrows (892) or a crystal bow (4214) count as ammo**. Each shot: −1 arrow (not crystal bow) and 1 arrow dropped on the target tile (owned by shooter).
- Damage: `CalculateRange` (C:29445: `1.05 + playerBonus[5]*Range*0.00175 + Range*0.1`, note [5] is *stab defence*) is computed then **overwritten**: **PvP hit = r(20), PvM hit = r(15)** regardless of level/bow/arrow.
- Speed: PvP 861 = 5 cyc (2.5 s). PvM: 861 and 839-857 = 4 cyc (2.0 s); 859, 6724, 4214 = 9 cyc (4.5 s). Anim 426.
- PvP bow hit sets victim `KillerId = shooter + 10` (BUG: death credit/drops go to player slot shooter+10).

### 3.3 Magic

**PvP** (packet 249, C:21269 → `AttackMage` C:27980):
- Allowed only if caster and target are both outside `nonWild()` and target is **not praying Protect from Magic**; one cast per **20 cyc (10 s)** (`mageTimer`). `CheckWildrange` is computed but not enforced.
- Always: caster anim 711, face target. Final (C:28699): damage clamped to target HP; **XP: Magic += 500 × dmg, Hitpoints += 1 × dmg**; `target.KillerId = caster`.
- Standard strike/bolt/blast/wave spells are commented out → they do nothing on players. Implemented spells (spellID = client button id):

| spellID | Allstar spell | Requirement | Runes (check → consume) | Target damage | Other effects |
|---|---|---|---|---|---|
| 1158 | "Shock Wave" (Fire Strike button) | **current Hitpoints ≥ 80** (bug: not Magic) | via ProjectileSpellPlayer: 1 soul, 1 mind, 3 fire (fails only if all three missing) | 5 + r(25) (the projectile's own r(30) hit is overwritten) | AoE: r(30) to every player within 4 tiles not in a safe zone and every NPC within 4 tiles (NPCs with HP 1000 skipped); gfx 448→100→101 projectile, 481+453 on target; +4 Magic XP/dmg extra |
| 1190 | Saradomin Strike | Magic ≥ 60 and `q3stage >= 0` — i.e. allowed for everyone who has **not** finished "Spells Of The Gods"; completing it sets `q3stage = -1` and then blocks all three god spells (inverted check, BUG) | 25 blood | 5 + r(25) | gfx 83 on the 4 tiles around caster, 76 on target |
| 1191 | Claws of Guthix | Magic ≥ 60 | 25 blood | 5 + r(25) | gfx 83 ×4, 77 |
| 1192 | Flames of Zamorak | Magic ≥ 99 | 25 blood | 5 + r(25) | gfx 83 ×4, 78 |
| 12975 | Smoke barrage | Magic ≥ 95 (msg 96) | 10 death, 5 blood, 15 fire, 15 air | 5 + r(25) + poison | anim 1979; AoE r(39) gfx 391 to all non-safe players within 10 |
| 12881 | Ice burst | none (`>= -74`) | 10 death, 10 blood, 15 fire | 5 + r(13) + poison | anim 1979, gfx 363, "freeze" (no effect) |
| 12891 | Ice barrage | Magic > 93 | error check 40 death/40 blood/60 **water**, success check 40 death/40 blood/60 **fire** → needs both; consumes 40 death, 40 blood, 60 (buggy slot) | 5 + r(25) + poison | anim 1979, gfx 369, "freeze" |
| 12929 | Blood barrage | Magic ≥ 92 | 30 death, 30 blood, 10 soul | 6 + r(24) | anim 1979; AoE r(39) gfx 377 within 10; caster heals dmg/2 (capped at max HP) |
| 13023 | Shadow barrage | Magic ≥ 88 | 10 death, 5 blood, 10 air (also deletes 10 soul unchecked) | 9 + r(21) | anim 1979; AoE r(39) gfx 382 within 10; caster **+10 HP uncapped** |
| 12871 | Ice blitz | Magic ≥ 89 (msg 90) | 20 death, 10 blood, 30 water | 6 + r(20) | anim 1978, gfx 368 (caster), 367 (target), "freeze" |
| 12911 | Blood blitz | Magic ≥ 81 (msg 82) | 20 death, 30 blood | 6 + r(24) | anim 1978, caster heals dmg (capped) |
| 1592 | Entangle | Magic ≥ 78 (msg 79) | 8 nature, 10 earth, 10 water | 0 | gfx 179, "bind" (no effect) |
| 12445 | Tele Block | Magic ≥ 85 | none | 0 | anim 1819; target `teleblock = true` **until logout** (blocks all teleports/tele commands) |
| 1152 | "Mod Strike" (Wind Strike button) | rights ≥ 1 | none checked (tries to delete 4 death/2 blood/6) | 5 + r(38) | anim 439, gfx 187/77×4/582/346 |
| 1154 | "Admin Strike" (Water Strike) | rights ≥ 2 | none | 5 + r(50) + poison | anim 439, gfx 76×4/547 |
| 1156 | "Owner Strike" (Earth Strike) | rights ≥ 3 | none | 5 + r(65) + poison + **teleblock** | anim 1914, gfx 292×5/311/287/305 |
| 12037 | "Slayer Dart" (Magic Dart) | rights ≥ 3 | none | 5 + r(80) + poison | anim 2927; AoE r(10) gfx 437 within 10; ~60 gfx |
| 1539 | "levitate/electrocute" (Iban Blast button) | rights 1-3 | none | 0 (sets 1+r(6) then overwritten by 0) | 1st cast: anim 1500 + walk/stand anims 1501; later casts anim 1502, target anim 3170 |
| 12455 / 12435 / 12425 | Tele Other Camelot / Falador / "Lumbridge" (sends Falador) | level checks always pass | none | – | shows accept interface 12468 to target |

- "Freeze": `entangle/uberentangle/rush/burst/blitz/barrage/rapture` only set `EntangleDelay` = 20/40/40/50/60/80/160, which is **never read** → no movement lock (JUNK). Poison = §3.6.
- AoE helpers (C:5448-5500): `attackPlayersWithin(gfx,max,range)` hits every player (not caster, not in `nonWild`) within Euclidean `range` for r(max); `attackNPCSWithin` hits every living NPC within range (skips NPCs whose current HP == 1000).

**PvM** (packet 131, C:21341-22557): no cast delay (limited only by client clicks); requires NPC not NPC-dueling, not someone else's summon, slayer reqs (§2.5), NPC HP ≠ 10000. Sets NPC `StartKilling/RandomWalk=false/IsUnderAttack`. Rune check uses `== false ||` for the error and `== true &&` for success (Water strike has an `||` bug: 1 water + 1 air **or** 1 mind suffices). Final (C:22536): clamp to NPC HP, **Magic XP += 1000 × dmg** (+ per-spell XP below), `Killing[player] += dmg`. Blood spells heal the caster by the **unclamped** roll with no max-HP cap.

| id | spell | Magic lvl | runes | damage | gfx on NPC | anim | extra XP |
|---|---|---|---|---|---|---|---|
| 1152 | Wind strike | 1 | 1 mind, 1 air | 1+r(6) | 92 | 711 | 15×lvl |
| 1154 | Water strike | 5 | 1 water, 1 air, 1 mind | 1+r(8) | 95 | 711 | – |
| 1156 | Earth strike | 9 | 2 earth, 1 air, 1 mind | r(8) | 98 | 711 | 35×lvl |
| 1158 | Fire strike | 13 | 3 fire, 2 air, 1 mind | r(10) | 101 | 711 | 45×lvl |
| 1160 | Wind bolt | 13 | 2 air, 1 chaos | r(16) | 119 | 711 | 60×lvl |
| 1163 | Water bolt | 23 | 2 water, 2 air, 1 chaos | r(18) | 122 | 711 | 70×lvl |
| 1166 | Earth bolt | 29 | 3 earth, 2 air, 1 chaos | r(20) | 125 | 711 | 85×lvl |
| 1169 | Fire bolt | 35 | 4 fire, 3 air, 1 chaos | r(22) | 128 | 711 | 100×lvl |
| 1172 | Wind blast | 41 | 3 air, 1 death | r(24) | 134 | 711 | 120×lvl |
| 1175 | Water blast | 47 | 3 water, 3 air, 1 death | r(26) | 137 | 711 | 135×lvl |
| 1177 | Earth blast | 53 | 3 water, 4 earth, 1 death | r(28) | 140 | 711 | 150×lvl |
| 1181 | Fire blast | 59 | 4 water, 5 fire, 1 death | r(30) | 131 | 711 | 165×lvl |
| 1183 | Wind wave | 62 | 5 air, 1 blood | r(34) | 160 | 711 | 200×lvl |
| 1185 | Water wave | 65 | 5 air, 1 blood, 7 water | r(35) | 163 | 711 | 225×lvl |
| 1188 | Earth wave | 70 | 5 air, 1 blood, 7 earth | r(36) | 166 | 711 | 250×lvl |
| 1189 | Fire wave | 75 | 5 air, 1 blood, 7 fire | r(38) | 157 | 711 | 300×lvl |
| 1190 | Saradomin strike | 60 | 2 fire, 2 blood, 4 air + Saradomin staff 2415 **in inventory** | 1+r(40) | 76 | 811 | 500×lvl |
| 1191 | Claws of Guthix | 60 | 1 fire, 2 blood, 4 air | 1+r(40) | 77 | 811 | 500×lvl |
| 1539 | Iban blast | 50 | 5 fire, 1 death | r(20) | 87, 88 | 708 | 500×lvl |
| 12939 | Smoke rush | 50 | 2 death, 2 chaos, 1 fire, 1 air | 5+r(10) | 385 | – | 200×lvl |
| 12963 | Smoke burst | 62 | 2 death, 4 chaos, 2 fire, 2 air | 5+r(13) | 389 | – | 250×lvl |
| 12951 | Smoke blitz | 74 | 2 death, 2 blood, 2 fire, 2 air | 5+r(15) | 389 | – | 250×lvl |
| 12975 | Smoke barrage | 86 | 4 death, 2 blood, 4 fire, 4 air | 5+r(25) | 391 | – | 600×lvl |
| 12861 | Ice rush | 58 | 2 death, 2 blood, 2 water | 5+r(10) | 361 | – | 200×lvl |
| 12881 | Ice burst | 69 | 2 death, 4 chaos, 4 water | 5+r(13) | 363 | – | 300×lvl |
| 12871 | Ice blitz | 82 | 2 death, 2 blood, 3 water | 6+r(14) | 368 (caster), 367 | 1978 | 500×lvl |
| 12891 | Ice barrage | 94 | 4 death, 2 blood, 6 water | 5+r(25) | 369 | 1979 | 800×lvl |
| 12987 | Shadow rush | 52 | 2 death, 2 chaos, 1 air, 1 soul | 5+r(8) | 379 | – | 200×lvl |
| 13011 | Shadow burst | 64 | 2 death, 4 chaos, 2 air, 2 soul | 5+r(10) | 382 | – | 250×lvl |
| 12999 | Shadow blitz | 76 | 2 death, 2 blood, 2 air, 2 soul | 5+r(13) | 381 | – | 300×lvl |
| 13023 | Shadow barrage | 88 | 4 death, 2 blood, 4 air, 3 soul | 5+r(25) | 383 | – | 600×lvl |
| 12901 | Blood rush | 56 | 2 death, 1 blood, 2 chaos | 6+r(10), heal | 373 | – | 200×lvl |
| 12919 | Blood burst | 68 | 2 death, 2 blood, 4 chaos | 6+r(13), heal | 376 | – | 300×lvl |
| 12911 | Blood blitz | 80 | 2 death, 4 blood | 6+r(14), heal | 375 | – | 400×lvl |
| 12929 | Blood barrage | 90 (msg 92) | 4 death, 4 blood, 1 soul | 6+r(25), heal | 377 | – | 700×lvl |
| 12037 | Magic dart | 50 | 20 death, 30 water | 6+r(20) | 331 | 1978 | – |

(`lvl` = current Magic level at cast time. Rune ids: air 556, water 555, earth 557, fire 554, mind 558, chaos 562, death 560, blood 565, soul 566, nature 561.) `ProjectileSpell`/`ProjectileSpellPlayer` helpers (C:5735-5883: damage r(max), 4 Magic XP/dmg ×2, rune check passes unless *all* runes missing) are only used by the PvP Shock Wave.

### 3.4 Special attacks

- Energy `specialAmount` starts at **100 on every login** (not saved), +1 every 4 cyc (2 s) while ≤ 99 (`specialDelay` 4, C:17002). Spec bar UI refresh `specialAttacks()..specialAttacks6()` (C:16036-16755) = the same bar drawn on 6 weapon interfaces (12335 whip, 7586, 7611, 7561, 8505, 7511) — UI only.
- Toggle: buttons 29113 (bows), 33033 (halberds), 29163 (swords), 29138 (daggers), 48023 (whip) toggle `usingSpecial` (C:23487); button 29063 (axes) fires the **DBA** spec immediately. After any special-block run `usingSpecial` is cleared even if nothing fired. Specials are only processed in the **melee branch**, so any `UseBow` weapon (MSB 861 in PvP; all bows in PvM) can never special.
- `calculateSpecial()` (C:16756) — cost / animation / `specialDamage` ("sD") / side calls:

| Weapon | Cost (min) | Anim | sD | calls |
|---|---|---|---|---|
| 4153 Granite maul | 50 | 1667 | 30+r(10) | maulSpec() |
| 6739 Dragon axe | 100 | 2876 | r(80) | – |
| 3204 Dragon halberd | 100 | 1667 | 35+r(10) | hally() |
| 861 Magic shortbow | 75 if ≥100; **also runs when ≤50** (charges 75, can go negative) | 426 | 20+r(10) | DDZ() (no-op, needs 4214) |
| 15156 Dark bow | 50 | 426 | – | darkbow() |
| 4214 Crystal bow | 50 | 426 | – | DDZ() (never reached) |
| 5698 DDS(p++) | 25 | (1062 via DDSSpecial) | – | DDSSpecial() |
| 4151 Abyssal whip | 50 | 1658 | 20+r(10) | – |
| 1305 Dragon longsword | 50 | 451 | 18+r(5) | – |
| 15334 Bandos godsword | 50 | 2890 | 40+r(5) | – |
| 15336 Zamorak godsword | 50 | 1499 + gfx 437/293/379 on self, "Everything starts to burn around you!!" | 40+r(5) | – |
| 14915 Barrelchest anchor | 50 | 405 | 40+r(5) | – |
| 1434 Dragon mace | 40 | 1060 | r(60) | – |
| 7158 Dragon 2h | 40 | 3157 | r(60) | – |
| 4587 Dragon scimitar | 75 | 451 | 30+r(5) | – |
| 746 Dark dagger | 100 | 451 | 40+r(5) | – |
| 6541 Mouse toy | 75 | 451 | 30+r(5) | – |
| 4755 / 4734 / 4718 / 4726 / 4747 Barrows weapons, 47 | 100 | player attack anim | 10+r(5) | – |
| 1377 Dragon battleaxe (button 29063) | 100 | 1670 + gfx 246 on self | none | no stat boost |

Helper hits: `SpecDamg(m)` = PvP target hit r(m); `SpecDamgNPC(m)` = NPC hit r(m) (also sets NPC in combat, **not** added to `Killing`). `maulSpec()`: PvP SpecDamg(30) / PvM SpecDamgNPC(30)×2, anim 1667; `hally()`: 30 / 30×2, anim 440; `DDZ()` (4214 only): 32 / 32 then 30, anims 462/426; `darkbow()` (15156 only): SpecDamg(50)×2 / SpecDamgNPC(45)×2, anim 426; `DDSSpecial()` (5698 only): SpecDamg(31) / SpecDamgNPC(31)×2, anim 1062. Each of these sets `DDS2Damg` → **2 cycles later a second hit of r(25)** on the same target (`SpecDamg(25)`/`SpecDamgNPC(25)`, C:16974-16981) if still attacking.
Within one cycle only the **last** `hitDiff` written to a target is applied.

**Effective result** (what actually hits):

| Weapon | PvP (Attack, C:24993-25216; target hit was already set to the normal roll N before the spec block) | PvM (AttackNPC, C:28895-29110; NPC hit = local hitDiff written after the block) |
|---|---|---|
| Whip 4151 | **N only** (spec cosmetic: gfx 341 on target) | 20..30 |
| Dark dagger 746 | N only (gfx 433) | 40..45 |
| Dark bow 15156 | r(50) now, +r(25) 2 cyc later (projectile gfx 380) | N now, +r(25) later; if energy ≥100 the block runs twice and drains 100 |
| DLS 1305 | N only (gfx 248) | 18..23 |
| BGS 15334 | N only (gfx 436) | 40..45 |
| ZGS 15336 | N only (gfx 282+497) | 40..45 (gfx 436) |
| Anchor 14915 | N only (gfx 282) | 40..45 |
| D halberd 3204 | r(30) now, +r(25) later (gfx 282) | 35..45 (+ r(25) later) |
| D scim 4587 / Mouse toy 6541 | N only (gfx 347) | 30..35 |
| D mace 1434 | N only (gfx 251) | 0..60 |
| D2h 7158 | N only (gfx 479) | 0..60 |
| DDS 5698 | r(31) now + poison, +r(25) later (gfx 252 ×2) | N now + NPC poison, +r(25) later |
| G maul 4153 | r(30) now, +r(25) later (gfx 340) | N now, +r(25) later |
| D axe 6739 | N only | 0..80 |
| Barrows weapons | N only, **drains target's spec energy to 0** (gfx 432) | 10..15 |
| MSB 861, crystal bow 4214, DBA 1377 | nothing (energy may still be spent: DBA 100) | nothing |

Authenticity: every special here is CUSTOM (costs/damages differ from 2006 RS; godswords, dark bow, anchor, dark dagger, mouse toy and Barrows specials did not exist). Dead helpers: `bowSpecc`, `DDZZ`, `DragonLongSpecial`, elemental robe procs `earthrobes/firerobes/airrobes/waterrobes` (1/6 chance 0..40 + gfx) are never called — JUNK.

### 3.5 Prayers (C:24194-24412, C:17447-17463, C:5010-5055)

- Drain: `PrayerTimer` counts down every cycle; when ≤ 1 and any prayer active, −1 prayer point and reset to `PrayerDrain` (so the real period is `PrayerDrain − 1` cycles). `newdrain()` keeps the smaller (faster) interval when stacking. Out of points → all prayers reset, "You have run out of prayer points".
- Intervals (cyc per point): Thick Skin 40, Burst of Strength 40, Clarity 40, Rock Skin 30, Superhuman Str 30, Improved Reflexes 30, Rapid Restore 20, Rapid Heal 20 (no `newdrain` call), Protect Item 20 (only toggles on if no prayer active), Steel Skin 20, Ultimate Str 20, Incredible Reflexes 20, Protect from Magic/Missiles/Melee 15 (each resets the others; head icons 4/2/1).
- **Effects**: only the protection prayers do anything, and only in PvP: while **any** of the three is active the player **cannot be attacked by melee/ranged players at all** (C:24936); Protect from Magic blocks **all PvP magic** (C:21292). **No effect vs NPCs.** All stat prayers, Protect Item, Rapid Heal/Restore: no effect (JUNK). No level requirements. Altar object 61 (several spawned: 2843,2964; 2854,3957; 3114,9836) recharges prayer (anim 645).

### 3.6 Poison

- Player (C:9182-9228): `PoisonPlayer()` → `PoisonDelay = 40`; a hit happens when it reaches ≤ 1, i.e. first hit after 39 cyc, then every 39 cyc: damage `1 + r(5)` (1..6), orange/green splat type 2, max 15 hits; reaching 0 HP from poison → death (§4.4). Sources: DDS normal hits & spec (PvP), Chaos Elemental weapon strip, Smoke barrage, Ice burst/barrage, Admin/Owner strike, Slayer dart.
- NPC (NH:297-313): `PoisonNPC` (DDS spec in PvM): every 39 cyc `3 + r(15)` (3..18), max 15 hits.

### 3.7 Rings & jewellery

| Item | Effect | Tag |
|---|---|---|
| 2570 Ring of life | Checked every cycle (C:17795) and on NPC/PvP hits: if HP ≤ `(int)(maxHP/10 + 0.5)` → `ApplyRingOfLife` (C:25679): anim 1816 (0x718), "Ring of Life saved your life !", ring deleted, after 4 cyc teleport to **3254,3420** (Varrock) | AUTH mechanic, CUSTOM destination |
| 6583 Ring of stone [enchanted_onyx_ring] | player turns into NPC 1266 (Rocks) — only executed in the "drunk wears off" branch (C:17358), i.e. practically only after being drunk | AUTH idea, BUG |
| 2568 Ring of forging | iron-ore smelting never fails (else 50 % fail) (C:31165) | AUTH |
| 2552-2566 Ring of dueling (Rub) | menu "Jad" → **2837,9581** ("TzTok-Jad's lair") / "Runecraft" → **3040,4840** (abyss rift); unlimited charges; blocked by teleblock (C:18380, 24060, 24132) | CUSTOM |
| 1712 Amulet of glory (Rub) | → **2852,3863** "Home, sweet home" (C:18366) | CUSTOM |
| 2550 recoil, 2572 wealth | no effect | – |
| `ApplyRingz()` (C:25700) | NOT a ring effect: death helper (teleport to 2853,3591 after 4 cyc) used only by dead `ApplyDeadz()` | JUNK |

### 3.8 Combat XP (all CUSTOM; `CombatExpRate = 1`)

| Source | XP per damage point |
|---|---|
| Melee vs NPC (C:29116-29142) | style skill 750 (controlled: 700 → Strength only) + Hitpoints 200 |
| Ranged vs NPC (C:29163-29170) | Ranged 820 + Hitpoints 300 |
| Magic vs NPC (C:22541) | Magic 1000 + per-cast bonus `N × magicLevel` (table §3.3) |
| Melee/Ranged vs player (C:24991, 25251) | Hitpoints 1 only |
| Magic vs player (C:28703) | Magic 500 + Hitpoints 1 (+4 for Shock Wave projectile) |
| Special-attack extra hits (`SpecDamg*`), AoE hits, poison | 0 |

(RS 2006: melee 4 + 1.33 HP per damage → Allstar ≈ 187× / 150×; plus the halved level curve.)

---

## 4. PvP / wilderness / safe zones / death — CUSTOM

### 4.1 PvP model

- **The whole map is a PvP zone except the `nonWild()` safe rectangles** (C:851) and **any tile on height level 1**. `checkwildy()/checkwildy2()` set `inwildy/inwildy2 = true` in both branches (always "in wilderness"); `IsInWilderness(x,y,type)` (C:24690, y 3520/3512..3967, x 2942..3392) is never called; `WildyLevel` stays 0; `CheckWildrange` (±wild level combat range) is computed for magic but never enforced → **no combat-level restriction, no wilderness levels**. `IsInWilderness = true` is set at login and unused.
- **No single/multi-combat distinction anywhere** (any number of players/NPCs may attack one target).
- Attack player (packet 73, C:20882): only if `PkingDelay <= 1` and both players outside safe zones. Each melee/range swing (C:24936) re-checks: attacker or target in safe zone, **or target has any protection prayer on** → the swing silently does nothing and `IsAttacking` stays set, retrying every 6 cyc (the "This player is in a safe zone and cannot be attacked" branch inside `Attack()` is unreachable; the magic path does print it). Magic: §3.3.
- Walk-in overlay: in safe zone every cycle the client gets walkable interface 197 with text "@gre@Safe"; outside: 197 "@red@Wild" (C:16952, C:4497). Server panel (`::serverpanel`, interface 15892) line 15900 shows "Safe"/"Un-safe" (C:89-131).
- **Skull**: none (no skull icon, no skull timer, no item-protection change). `::testskull` just calls `inCombat()`.
- `inCombat()` sets `LogoutDelay = 2` (both sides on every hit); logout button refused while ≥ 1 ("You must wait 10 seconds after combat to log out!", C:23955).
- Right-click options sent at login (C:10923-10957): "Trade with" (slot 4), "Follow" (slot 2, rights ≤ 2) or "Ban" (slot 2, rights 3), "Attack" (slot 3, top), "Kick" (slot 5, rights > 0 or name "D D 3"). All coloured green/white text.

### 4.2 Safe zones (`nonWild()`, C:851-926) — 67 rectangles + height 1

`x1..x2, y1..y2` inclusive. Labels are inferred from spawns/teleports in the same area. Rectangles marked **(dead)** have min > max and never match.

| # | x | y | inferred area |
|---|---|---|---|
| 1 | 3249..3258 | 3438..3431 **(dead)** | Varrock east bank |
| 2 | 2847..2874 | 9830..9854 | Taverley dungeon section |
| 3 | 2401..2405 | 3098..3102 | Castle Wars lobby |
| 4 | 2820..2876 | 2950..3004 | Shilo/"shop area" (home portal 4156/4389 → 2852,2955) |
| 5 | 2667..2684 | 3717..3732 | Rellekka rock crabs |
| 6 | 3033..3036 | 4842..4844 | Abyss centre |
| 7 | 2687..2677 | 3720..3733 **(dead)** | rock crabs |
| 8 | 3229..3242 | 9796..9807 | Varrock sewers |
| 9 | 2442..2487 | 4808..4855 | Law altar = Chaos Elemental room |
| 10-13 | 2581..2589×4834..4842; 2712..2720×4832..4840; 2654..2662×4837..4845; 2837..2851×4826..4842 | | Fire / Water / Earth / Air altar rooms (elemental minigame) |
| 14-15 | 2859..2868×9881..9883; 2880..2943×9884..9923 | | Taverley dungeon (soldiers) |
| 16 | 3039..3111 | 3475..3523 | Edgeville/Monastery |
| 17 | 2790..2855 | 3418..3466 | Catherby |
| 18 | 2584..2612 | 3153..3169 | Icon minigame start |
| 19 | 2935..3066 | 2935..3399 | Port Sarim/Rimmington/Falador south/Karamja strip |
| 20-23 | 3249..3260×3435..3437; 3249..3253×3431..3437; 3250..3257×3419..3423 (×2) | | Varrock square/bank |
| 24-29 | 2747..2758×2794..2802; 2764..2776×2793..2802; 2773..2780×2766..2770; 2751..2770×2764..2777; 2785..2809×2771..2801; 2732..2740×2789..2796 | | Ape Atoll |
| 30 | 2861..2872 | 10186..10212 | underground (Keldagrim?) |
| 31 | 2490..2631 | 3836..3904 | Miscellania shops island (shop portal → 2540,3890) |
| 32 | 2883..2902 | 3501..3518 | Burthorpe |
| 33 | 3409..3452 | 3532..3575 | Slayer Tower |
| 34 | 2435..2447 | 3080..3099 | Castle Wars |
| 35 | 3267..3332 | 3149..3270 | Al Kharid |
| 36 | 3151..3182 | 3220..3272 | west of Lumbridge |
| 37 | 3032..3063 | 3424..3457 | Barbarian/Gmaul area (gmaul chest 3054,3437) |
| 38 | 3476..3501 | 9483..9505 | Kalphite Queen lair |
| 39 | 2942..2992 | 3390..3414 | Falador |
| 40 | 2420..2431 | 3072..3083 | Castle Wars |
| 41 | 3071..3122 | 3456..3523 | Edgeville |
| 42 | 3101..3124 | 9825..9849 | Edgeville dungeon (god capes) |
| 43 | 2585..2605 | 3153..3169 | Icon minigame |
| 44 | 2853..2926 | 3530..3577 | Burthorpe/Death Plateau |
| 45 | 2579..2622 | 3841..3902 | Miscellania |
| 46 | 2887..2699 | 2939..2741 **(dead)** | – |
| 47 | 2742..2815 | 3146..3235 | Brimhaven/Karamja |
| 48 | 2692..2810 | 2690..2808 | Ape Atoll |
| 49 | 2437..2446 | 3082..3098 | Castle Wars |
| 50 | 2805..2878 | 3222..3313 | Karamja north/Crandor |
| 51 | 2394..2398 | 3106..3109 | Castle Wars |
| 52 | 3231..3257 | 3507..3520 | Varrock north (ditch) |
| 53 | 2722..2755 | 3455..3481 | Seers'/Camelot shopping area (Hans, shops) |
| 54 | 2371..2387 | 3416..3447 | Gnome Stronghold (fletching shop) |
| 55 | 3544..3583 | 3263..3316 | Barrows |
| 56 | 3221..3244 | 9306..9327 | "member portal" area (3228,9318) |
| 57 | 3201..3230 | 2774..2814 | **Training area** (KBD, Jogres, soldiers) |
| 58 | 2487..2556 | 2997..3051 | Enchanted minigame |
| 59 | 2856..2882 | 9932..9965 | Icon minigame ice giants |
| 60 | 3267..3286 | 2763..2778 | Mod & Admin zone |
| 61 | 2836..2887 | 3558..3611 | **HOME** (spawn 2852,3591) |
| 62 | 3483..3525 | 9662..9702 | "Strength guild" (Dagannoth kings, Agrith Naar) |
| 63 | 3236..3259 | 9351..9381 | "Range/Magic guild" (black demons etc.) |
| 64 | 3303..3308 | 9370..9380 | PkBox teleport spot (3306,9375) |
| 65 | 2751..2765 | 3492..3504 | guild portals (2756/2759,3498) |
| 66 | 3437..3430 | 9772..9777 **(dead)** | PkBox 2 |
| 67 | 3430..3437 | 9772..9777 | PkBox 2 bank booths (3432-3435,9772) |
| – | any x,y | height 1 | everything on plane 1 |

Consequence: almost all Allstar content (home, shops, bosses, minigames) is safe; PvP happens in the rest of the world (real Wilderness, Edgeville pk teleport 3094,3498 is inside #41 → safe!, "::pkbox" 3306,9375 inside #64 → safe on arrival).

### 4.3 PK points and rewards (`PKz` C:25287, `checkPKReward` C:966)

- On a player death with a valid `KillerId ≠ self`: killer gets **pk points** = 1 if killer combat > victim, 2 if equal, 3 if killer combat < victim; `killcount++` (NB `killcount` is a **static field** shared by all players — BUG). No points if the killer's previous kill was the same victim ("You recieve no pk points as you have pked X twice in a row"). Messages to killer + global broadcast "`<killer>` has FUCKEN OWNED `<victim>`, `<killer>` now has N pk points and K kills!". `deathcount = +1` (assigns 1 instead of incrementing — BUG).
- Rewards when pk points **equal exactly** (points jump by 1-3, so thresholds can be skipped): 100,000 → Blue partyhat 1042; 150,000 → Green 1044; 200,000 → Purple 1046; 300,000 → White 1048; 500,000 → Red 1038 **and** Fire cape 6570; 750,000 → Yellow 1040. Saved in moreinfo (`character-pkpoints/killcount/deathcount`).

### 4.4 Player death (`ApplyDead` C:25392; `youdied` C:9123)

Trigger: `IsDead && NewHP <= 1` (C:17807) — `IsDead` is set when a hit update brings HP ≤ 0; poison reaching 0 calls it directly. Death is **instant** (no death animation delay; `pEmote = 2304` for the stand anim):
1. Compute kept items (`keepItem1..3`): **BUG-exact algorithm** — `highest` is re-declared inside the loop, so each pass keeps the **last non-empty inventory slot whose item has shop value > 0** (item.cfg value via `GetItemShopValue`; ids missing from item.cfg count as 1, so in practice simply the last slots): keep1 = last such item (whole stack), keep2 = last such item with a different id, keep3 = last with an id different from both. Equipment is never kept. No skull/Protect Item modifiers. Those 3 stacks are removed from the inventory.
2. `youdied`: unequip every equipped item into the inventory (fails silently if full), drop **every inventory item** on the death tile owned by `KillerId` (visible to killer 30 s then everyone), clear inventory; done twice. Message "ROFL BETTER LUCK NEXT TIME!".
3. `PKz` (§4.3).
4. Teleport to **2853,3591** (home; new players start at 2852,3591), reset animation, HP restored to max, poison cleared, `KillerId = self`, kept stacks re-added.
- Area death hazards (C:9230-9326): `KBDLair()` area x 2630-2650, y 9517-9546: `MonsterDelay` 40 → a 3..81 hit every 39 cyc ("You get hit!"); `Dungeon1()` area x 2549-2625, y 9476-9535 (Brimhaven dungeon): `MonsterDelay` 20 → 3..23 every 19 cyc ("Poison from the dungeon starts to kill you!"). They also track a separate `currentHealth` counter: when it hits 0 **all items are deleted (not dropped)**, teleport 2889,3557 (KBDLair) or 3254,3420 (Dungeon1), "Oh dear you are dead!", HP displayed as 99. CUSTOM/BUG.
- Random event: every cycle `r2(3000000)==123` → teleport to 3387,9786 (C:17182).
- `ApplyDeadz()` (with `ApplyRingz`) is unused (JUNK).

---

## 5. Login, new player, saves, rights, membership, bans

### 5.1 Login sequence (`client.run()` C:10669-11031)

1. Handshake (317 RS2, RSA off). `playerName` read (the `.toLowerCase()` result is discarded → names keep client case; all name comparisons use `equalsIgnoreCase`).
2. returnCode **7** if `playerCount >= 200`; **4** if name starts/ends with a space; **4** if name listed in `data/bannedusers.txt` or IP/host (`connectedFrom`) in `data/bannedips.txt` (both case-insensitive, one entry per line; both files empty in this copy).
3. `readSave()`: update running → **14**; already online → **5**; `loadGame` → password mismatch → **3** (username and password compared **case-insensitively**, plaintext); file missing → **new account** (code 2).
4. For a successful login: `loadmoreinfo` (creates `moreinfo/<name>.txt` with defaults if missing), `loadquestinterface`, `loadweather` (`data/weather.txt`, currently `Weather = 3` = none), append IP to `connectedfrom/<name>.txt`, friends-list online notifications.
5. HP fix: if level-for-XP(HP) < 11 → HP XP = 1155 (= level 14 on the Allstar curve, so new accounts are unaffected).
6. **Global login broadcast** (C:10863-10890): name `"Mod Allstar "` (with trailing space — never matches) → "Owner & Coder X has logged in"; names Skillerzmine / Fatality / Mod Mike → "Co-owner X has logged in"; else rights 3 → "Owner & Coder X…", 2 → "Server Administrator X…", 1 → "Moderator X…", 0 or 4 → "X has logged in". Logout of a rights-0 player broadcasts "X has logged out" (C:11291).
7. Anti-impersonation: name starts with "Mod Allstar", isn't exactly it, and not from 127.0.0.1 → server sends gfx 9999 (client crash). CUSTOM/JUNK.
8. Right-click options (§4.1). Weather filters restored.
9. **Membership**: `playerIsMember = 1` iff name is in `data/Members.txt` (currently "ember", "maxmager"), else 0 (overrides the saved flag). The flag gates **nothing** in the source (no member checks). `::membership <name>` (no rights check) sets it for the session; `::makemem <name>` (no rights check) appends to members.txt. Login packet always says "members world" (frame 249 value 1).
10. Rights: **only from the save file** (`character-rights`). The hard-coded name→rights assignments are `equalsIgnoreCase("")` (dead) and the moderators/administrators/staff.txt checks are commented out. Rights 3 is sent to the client as 2 (admin crown). Rights are changed in-game by `::giveadmin` (→2), `::givemod` (→1), `::demote` (→0) [rights 3], `::giveowner` (→3) [name "Mod Allstar" only]; target is saved and kicked, global broadcast "X is now an Administrator/Moderator/co-owner" / "…no longer a member of staff".
11. `initialize()` (C:15507): skills sent; sidebars 1 3917, 2 638, 3 3213, 4 1644, 5 5608, 6 = 1151 (modern) or 12855 if `ancients==1`, 8 5065, 9 5715, 10 2449, 11 904, 12 147, 13 1, 0 2423; mute check (§5.4); IP-ban re-check; welcome messages (below); `ScanItems()` dupe flagging (≥10 of any partyhat/ fire cape noted ids 6571/1053/4152/3141/7159 or ≥10,000,000 coins in bank/inventory → writes `flagged/<name>.txt` "This account might contain duped items" + password); name "Motherload11" gets bank+inventory wiped once (`hasset`); macro-warned names (`data/macrowarn.txt`) get a 3-line black-mark warning; quest tab 2450 "Allstar-Scape"; bank title "The Official Bank Of <name>" (5383); every `update()` sets 180 "@blu@Home" and 2458 "Log Out.. Come Back!".
12. Welcome text (CUSTOM): rights 0: "Allstar-Scape" / "Welcome to Allstar-Scape" / "Info on becoming mod type ::modinfo" / "Go to forums at allstarscapeforums.smfforfree2.com" / "Type ::Starter To Begin" / "Server Created By Mod Allstar"; rights 1/2/3 variants (C:15633-15659: shop directions, "::suggest", admin "Feel free to spawn w/e u want...", owner "::m to get unlimited money"). Then interface **8134** (rights 0: "How to Become Mod/Admin" rules, `MainHelpMenu` C:9000) and interface **15944** (`newWelc` C:238: "~~~ Allstar-Scape ~~~", "Server created by - Mod Allstar", "Reputation: N", "Latest Update - New PkBox!", "Have Fun..."). The character-design screen 3559 is only shown if the body parts equal (0,10,18,26,72,42,33) — never for defaults (use `::char`).

### 5.2 New player defaults (Player.java constructor P:24-139, client fields)

| Field | Value | Tag |
|---|---|---|
| Position | **2852, 3591, h0** ("home", Death Plateau/Burthorpe area) | CUSTOM |
| Stats | all skills level 1 / 0 XP except **Hitpoints: current level 98, XP 1155** (= base level 14 on the half curve) → new players start at 98/14 HP, decaying 1 per 125 s | CUSTOM/BUG |
| Equipment (worn at creation) | hat 2910 "Hat" [wolfenhat_crimson], cape 4405 Team-46 cape, amulet 6585 Amulet of fury, body 2906 Robe top [wolfenrobetop_crimson], shield 3842 Unholy book, legs 2495 Red d'hide chaps, gloves 2912, boots 2904, weapon **4587 Dragon scimitar** (amounts 0 in save; shown as 1) | CUSTOM |
| Inventory / bank | empty (bank 350 usable of 800 slots) | – |
| Look | `playerLook = {0 male, 0 hair col, 1 torso col, 2 legs col, 0 feet col, 0 skin}`; head 7, torso 25, arms 29, hands 35, legs 39, feet 44, beard −1 | CUSTOM |
| Run energy | 0 (regens 1/cycle); special energy 100; spellbook modern; `starter = 0`; reputation 0; pk points 0 | – |
| Starter kit | `::starter` once (`starter` flag in moreinfo): **25,000,000 coins, 15,000 noted Manta ray (392), Tzhaar-ket-om (6528), 20,000 each of fire 554, water 555, blood 565, air 556, earth 557, death 560, nature 561, chaos 562, law 563, soul 566, mind 558**, message "Allstar-Scape Starter Package", then forced save. Second attempt → "Sorry." + broadcast "X Is a noob and is trying to get a extra starter!! :p" (C:11596). Alternative via NPC 1051 (§2.11): 15,000,000 coins + 1,500 noted mantas. | CUSTOM |

### 5.3 Save formats (all plaintext, no hashing) — CUSTOM

**`characters/<name>.txt`** (written by `client.savechar()` C:34744 and `PlayerHandler.savechar()` PH:404 on logout, auto-save every 10 s; read by `loadGame` C:34554; a second source `ftp://whitescape:password@81.165.211.142:2500/<name>.txt` is also tried via FileReader — always fails, JUNK):
```
[ACCOUNT]
character-username = <name>
character-password = <plaintext>
[CHARACTER]
character-height / character-posx / character-posy / character-rights / character-ismember /
character-messages / character-lastconnection (IP) / character-lastlogin (yyyy*10000+month0*100+day) /
character-energy / character-gametime / character-gamecount
[EQUIPMENT]   character-equip = <slot 0-13> TAB <itemId or -1> TAB <amount> TAB
[LOOK]        character-look = <0-5> TAB <value>
[SKILLS]      character-skill = <0-24> TAB <currentLevel> TAB <xp>
[ITEMS]       character-item = <slot> TAB <itemId+1> TAB <amount>      (only non-empty)
[BANK]        character-bank = <slot> TAB <itemId+1> TAB <amount>
[FRIENDS]     character-friend = <i> TAB <long name hash>
[IGNORES]     character-ignore = <i> TAB <long>
[EOF]
```
Equipment slots: 0 hat, 1 cape, 2 amulet, 3 weapon, 4 body, 5 shield, 7 legs, 9 hands, 10 feet, 12 ring, 13 ammo. Skill index: 0 Att, 1 Def, 2 Str, 3 HP, 4 Rng, 5 Pray, 6 Mage, 7 Cook, 8 WC, 9 Fletch, 10 Fish, 11 FM, 12 Craft, 13 Smith, 14 Mine, 15 Herb, 16 Agil, 17 Thiev, 18 Slayer, 19 Farming, 20 RC (21-24 unused).

**`moreinfo/<name>.txt`** (`savemoreinfo` C:34228 / `loadmoreinfo` C:34013):
```
[MOREINFO] character-clueid, -cluelevel, -cluestage, -lastlogin (IP), -lastlogintime (date int),
           -reputation, -ancients (0/1), -starter (0/1), -hasegg, -hasset, -pkpoints, -killcount,
           -deathcount, -mutedate, -height
[QUESTS]   character-questpoints, -quest_1, -quest_2, -quest_3   (custom quest stages)
[LOOK]     character-look = i TAB v, then character-head/-torso/-arms/-hands/-legs/-feet/-beard
           (the whole body block is repeated 6×, once per look entry — harmless)
[FRIENDS] / [IGNORES] (again)
[HIDDEN]   character-points (hidden places found), character-foundz[1..12]
[EOF]
```
Also written: `savedGames/<name>.dat` (Java-serialized `PlayerSave`: pass, name, pos, height, rights, items, equipment, bank, levels, XP — PH:602, legacy "mythscape" format read only by the unused `secondaryload`), `charbackup/`, `charbackupmyth/` (backup commands), `flagged/`, `flaggedauto/` (autoclick detector: same-click counts 10/15/30/50), `connectedfrom/<name>.txt`, `saveStats()` hiscore dump to a hard-coded `C:/Documents and Settings/User/My Documents/Copy of Pimpscape/savedgames<name>.dat`, logs under `logs/` (ban, ipban, kick, getpass, rep). `data/weather.txt` is global.

### 5.4 Bans, mutes, moderation (rules that affect players)

- **Name ban**: `::banuser <name>` (rights ≥1) → appended to `data/bannedusers.txt` (underscores → spaces), kick, broadcast "Administrator X is banning Y". `::unban <name>` (rights ≥2) rewrites the file (buggy: opens writer before reading → empties file). **IP ban**: `::ipban <name>` (rights 3 or names Mod Allstar/Skillerzmine/Soz r4nged/rawr) → victim's `connectedFrom` appended to `data/bannedips.txt`, broadcast "X: HAS IP BANNED THE PLAYER: …". `::kick <name>` (rights ≥3 or "Fatality"; a second variant broadcasts "X: Kicking Player: Y").
- **Mute**: only via the Report-Abuse interface (packet 218) with "mute" ticked by rights ≥1: target `mutedate = <moderator's lastlogintime>`, `muted = 1`, "You have been muted for 48 hours by X". At every login `muted = (today − mutedate ≥ 2 ? 0 : 1)` (date ints yyyy*10000+month0*100+day). A rights-0 player sending the mute flag is **auto-banned**.
- **Honeypot commands** (auto-ban + broadcast "X tried to cheat/noclip/clientdrop/setitem and has been autobanned!"): `::noclip`, `::mute`, `::mz`, `::modzone` (except "Mod Allstar"), `::cp`, `::si` (except "D D 3"). `badNames()` (C:8: bans names containing symbols, "admin", "owner", "null", swear words, "SYI"…) is **never called** (JUNK).
- **Reputation**: `::rep <name>`: same IP as target → −5 own rep; otherwise needs own rep ≥1 (or rights ≥2) and gives target +1 rep once per session. Shown on the welcome interface.
- Hard-coded privileged names (CUSTOM, decide whether to keep): "Mod Allstar" (owner exceptions: giveowner, getpass, owner gfx, hide/show, honeypot exemptions), "Mod Mike", "Skillerzmine", "Fatality" (co-owner login text; Fatality = rights-3 command block), "D D 3" (dev commands, Kick option), "Mod Steve" (setxp etc.), "Purez" (item spawn), "Soz r4nged", "rawr" (ipban), "admin" (debug println), "kaitnieks"/"sythe" (blocked from legacy load), "Motherload11" (one-time wipe).

---

## 6. XP, levels, skills

### 6.1 Level curve — CUSTOM (the single biggest global XP rule)

- `client.getLevelForXP(exp)` (C:13999) uses `points += floor(lvl + 150 * 2^(lvl/7))` (RS uses **300**), `output = floor(points/4)`, returns the first `lvl` with `output >= exp`, capped at **99**. Because `client` overrides `Player.getLevelForXP`, this half curve is used everywhere for players (skills tab, combat level, max HP, hit bars). `getXPForLevel` (authentic 300 curve, C:13984) is never used. `NPCHandler.getLevelForXP` (authentic, cap 135) is used only for the ring-of-life threshold.
- XP needed ≈ **half** of RS at every level (a global ×2 XP multiplier):

| Level | RS XP | Allstar XP |
|---|---|---|
| 2 | 83 | 41 |
| 10 | 1,154 | 582 |
| 20 | 4,470 | 2,257 |
| 30 | 13,363 | 6,734 |
| 40 | 37,224 | 18,707 |
| 50 | 101,333 | 50,816 |
| 60 | 273,742 | 137,088 |
| 70 | 737,627 | 369,111 |
| 80 | 1,986,068 | 993,424 |
| 90 | 5,346,332 | 2,673,661 |
| 99 | 13,034,431 | **6,517,816** |

  (Allstar's `>=` test means a player with exactly the threshold XP is still the lower level — off by one XP.)
- **Max XP**: `addSkillXP` refuses ("Max XP value reached") if current XP > 2,000,000,000 or the sum overflows negative. Levels cap at 99 (from XP); *current* levels can exceed via boosts/blood spells/cape emotes. 25 skill slots are saved (21-24 unused).

### 6.2 `addSkillXP(amount, skill)` (C:14014)

No multiplier inside: XP is added as passed. If the skill's level-for-XP rose, that skill's current level is set to the new base level (any drain/boost on it is overwritten) and `levelup()` fires once (even for multi-level jumps); then skills tab refresh; Strength XP triggers `CalculateMaxHit`. All rates live at the call sites (302 calls). Summary by skill (rates are XP per action; "×lvl" = multiplied by the player's **current** level in that skill; all CUSTOM unless noted):

| Skill | Sources (ref) |
|---|---|
| Attack / Strength / Defence | melee vs NPC 750/dmg to style skill (controlled: 700 → Strength) (C:29119); training objects: Strength 20×lvl (C:3794, 3812), 1×lvl Str/Rng/Att/Def dummies (C:3832-3885); `::pure`/`::master` admin XP |
| Hitpoints | melee vs NPC 200/dmg, ranged vs NPC 300/dmg, any hit on a player 1/dmg, PvP magic 1/dmg |
| Ranged | vs NPC 820/dmg; skill chest object 2513: 1700×lvl (+cash) (C:3595) |
| Magic | vs NPC 1000/dmg + spell bonus 15..800×lvl (§3.3); vs player 500/dmg; teleports ×lvl: Varrock 20, Falador 30, Lumbridge 40, Camelot 50, Ardougne 120, Watchtower 150, Trollheim 400, Ape Atoll 400, Paddewwa 150, Senntisten 200, Kharyrll 25, Lasaar 350, Carrallangar 400, Annakarl 550, Ghorrock 650 (C:5885-5995); enchant/superheat flat 18-78/53 (C:21104-21259); alchemy 65×lvl / 320×lvl (C:21064, 21086); minigame chest keys +300,000×lvl (§8); custom quest "Spells Of The Gods" completion (Wizard Mizgog 706 dialogue 326) gives 1,000,000 flat + item 6603 (C:33025) |
| Prayer | two burying paths fire on one click (packet 122, C:19798): (a) `CheckForSkillUse3` → `prayer()` next cycle **only if a weapon is wielded**, deletes the whole stack in that slot, XP ×1: bones 526/528/2859/530 4-5, big/Jogre bones 15, baby dragon 30, dragon 72, Shaikahan 25, monkey 5, zogre 22-23, fayrg 87, raurg 96, **ourg 5000**; (b) `buryBones` (C:9969) immediately for ids 532/536/4812/4830/4832/4834/clues: dragon 72, zogre 25, fayrg 80, raurg 100, **ourg 8000**, big bones 0 (impossible condition). Net per bone e.g. Ourg ≈ 13,000, dragon 144, big 15, normal 4-5 (chickens drop Ourg bones 100 %). Bone grinder object 5284 ×lvl: 4834 240, 4832 190, 4830 170, 4812 115, 534 120, 536 152 (C:18812-18847) |
| Cooking | range object 4172: shrimp 100×lvl, lobster 150×lvl, shark 200×lvl, manta 300×lvl (C:18745-18805); generic `cooking()` base XP × 1 |
| Woodcutting | `Woodcutting(...)` XPamount per log, `woodcutting()` base ×1 |
| Fletching | item-on-item 40/60/80/100/120/140×lvl (reqs 1/20/40/50/60/80) and flat 15/25/40/65/90/120 (C:20098-20205); `fletching()` base ×1 |
| Fishing | custom spots: 17000×lvl (`make`), 10000×lvl (`lob`), 200×lvl (`manta`), 70×lvl (`turtle`), 10×lvl (`carb`) (C:9682-9745); 300/150/500/750×lvl (C:19157-19198); `fishing()` base ×1 |
| Firemaking | `firemaking[2]×1` per log; skill chest 1700×lvl |
| Crafting | pot 8×lvl, flax 15×lvl, leather 20..140×lvl, skill chest 3816 1700×lvl, `crafting()` base ×1 |
| Smithing | smelting at custom furnaces ×lvl: copper/tin 5, iron 10, silver 15, gold 15, mithril 20, adamant 30, rune 45 (C:9747-9863); anvil chest 2781 1700×lvl; `smelting()/smithing()` base ×1 |
| Mining | `Mining()` flat: clay 5, copper/tin 18, limestone 27, essence 5, blurite 18, iron 35, silver 40, coal 50, gold/gems 65, mithril 80, adamant 95, runite 125 (C:9591-9670); `mining()` base ×1 (+65 on gem); skill chest 2111 1700×lvl |
| Herblore | skill chest 1700×lvl (C:3656) |
| Agility | Brimhaven monkey bars/ledge 40×lvl (req 80) (C:3295, 3322); `Agility()` course XP; skill chest 2287 1700×lvl |
| Thieving | stalls `TheifStall` XP; pickpocket 220-274 flat (§2.11) |
| Slayer | **no XP from kills**; `stick` 14×lvl (C:9761); slayer chest 1700×lvl (C:3846) ("Click the chests for slayer exp") |
| Farming | seeds ×lvl: guam 5, marrentill 10, tarromin 15, harralander 38, ranarr 47, toadflax 60, irit 70, avantoe 150, kwuarm 200, snapdragon 555, cadantine 915, lantadyme 1225, dwarf weed 1375, torstol 1700 (C:2360-2528); milking cow object 8689 12×lvl; seed-dibber flat 15-200 (C:19996-20065) |
| Runecrafting | `runecraft(req, xp, ...)` e.g. law altar 600×lvl, multiples of essence at thresholds (C:750); rift crafting; skill chest 7133 1700×lvl |

Admin XP commands: `::pure` (rights ≥2) +486,000,000 XP to every skill except Defence and Prayer; `::master` (rights ≥2) +14,910,000 to every skill; `::addxp` ("D D 3"), `::setxp`/`::setall` ("Mod Steve").

### 6.3 Level-up handling & rewards (`levelup` C:5067) — CUSTOM

- Attack/Strength/Defence/Hitpoints/Ranged/Prayer/Magic: level-up chatbox interface (6247/6206/6253/6216/4443/6242/6211) + gfx 199 (sent with swapped x/y → wrong tile) + message; skills 7-20: game message only.
- On reaching **99** (only possible once, since 99 is the cap): items + global broadcast "`<name>` has just gotten 99 `<skill>`!" (defence text prints the strength level — BUG):

| Skill | Reward item ids (all custom ids ≥14000 → need custom obj defs) |
|---|---|
| Attack | 14073 Att cape, 14074 Att cape (t), 14075 Att hood |
| Strength | 14076, 14077, 14078 |
| Defence | 14079, 14080, 14081 |
| Hitpoints | 14094, 14095, 14096 |
| Ranged | 14082, 14083, 14084 |
| Prayer | 14085, 14086, 14087 |
| Magic | 14088 Magic cape + **5×** 14089 Magic cape (t) |
| Cooking | 10,000,000 coins + 14128 Cooking cape (t) |
| Woodcutting | 14133, 14134, 14135 |
| Fletching | 14109, 14111 |
| Fishing | 14124, 14125, 14126 + 10,000,000 coins |
| Firemaking | 14130, 14131, 14132 |
| Crafting | 14106, 14107, 14108 |
| Smithing | 14121, 14122, 14123 |
| Mining | 14118, 14119, 14120 |
| Herblore | 14100, 14101, 14102 |
| Agility | none ("Congratulations, there is no agility skillcape") |
| Thieving | 14103, 14104, 14105 |
| Slayer | 14112, 14113, 14114 |
| Farming | 14136, 14137, 14138 |
| Runecrafting | 14091, 14092, 14093 |

- **Skill-cape emote** (emote button 161 → `capeEmote` C:1066): per worn cape: gfx list + anim + sets that skill's current level to **base + 1**: Att 14073/14074 (gfx 346,427,83; anim 2890; Attack+1), Str 14076/14077 (406,327,436; 750; Str+1), Def 14079/14080 (8,57,240; 2720; Def+1), HP 14094/14095 (444,574,199,293; 1500; HP+1), Range 14082/14083 (472,474,325,0; 426; Rng+1), Prayer 14085/14086 (293,281,327,431; 1331; Pray+1), Magic 14088 (409,498,497; 811; Mage+1), Cooking 14127/14128 (563 north tile; 883; Cook+1), WC 14133/14134 (187,247; WC+1), Fletch 14109/14110 (588; +1), Fish 14124 (stand anim 0x2575, gfx 68; +1), FM 14130 (453,446), Craft 14105 (239), Smith 14121 (436; +1), Mining 14118 (287), Herb 7638 (267,255,259,352), Agility 7634 (422,60,62; 747), Thieving 14103/14104 (421,143; +1), Slayer 14112/14113 (466,468; +1), Farming 14136 (568,569,593), RC 14091 (111,185,186), "Summoning" 15713/15714 (as Attack), "Hunter" 7676 (350,448,474). Text overhead via `txt4` ("An attack skill cape." etc.).

### 6.4 Combat level (P:897-926) — AUTH-like

With levels from the half curve: `base = 0.25·Def + 0.25·HP + 0.125·Prayer`; `mag = 1.5·Ranged(skill 4)`, `ran = 1.5·Magic(skill 6)` (names swapped in code); if `1.5·Magic > Att+Str` → `base + 0.4875·Magic`; else if `1.5·Ranged > Att+Str` → `base + 0.4875·Ranged`; else `base + 0.325·(Att+Str)`; truncated to int. Differences vs RS: prayer not floored to /2, magic has priority over ranged when both exceed melee (RS takes the max), no flooring of the 1.5× terms. `::combat N` (rights ≥2) overrides the displayed `combat` field until next appearance update.

---

## 7. Global rules, broadcasts, timers

- **Global message channel**: `PlayerHandler.messageToAll` (one String). At the start of the next `PlayerHandler.process` it is copied to every player's `globalMessage` and cleared; each player prints it as a normal game message in its own `process()`. **Only one broadcast per cycle survives** (later writes in the same cycle overwrite earlier ones). CUSTOM.
- **Yell** (C:13129): `::yell <text>` — any rights, blocked only if muted ("You are muted and cannot yell!"); broadcast `"<name> - <text>"` (no rank tag, no cooldown; the "no-ip"/"servegame" censor lines are no-ops). A second yell implementation at C:13880 is nested inside `::mypos` → unreachable.
- **Staff announcements**: `::alert <text>` (rights ≥1) → `"[~!ANNOUNCEMENT!~]: " + command.substring(8)` (drops the first 2 characters of the text — BUG); `::lupdate <text>` (rights ≥3) → `"[LATESTUPDATE]:" + text`.
- **Automatic broadcasts** (full list): staff/player login (§5.1) and rights-0 logout; every 99 (§6.3); every PK (§4.3); second `::starter` or NPC-1051 greed; rights changes; bans/ip-bans/kicks; honeypot autobans. **No timed/periodic announcements, no double-XP or other scheduled events** exist.
- **Server panel** (`::serverpanel` toggles; walkable interface 15892 via `WritePlayers`, C:89): "ServerPanel:", "Owner: Your name here", "Co-Owner: Your name here", "Players Online: N", "Made by: Tico135", Safe/Un-safe. Player-count overlay `writePlayers` (6570 "Players - N", 6572 "Allstar-Scape", walkable 6673) exists but is never called.
- **Weather/lighting filters**: `IsSnowing` overlays (1 snow 11877, 4 dizzy 4504, 5 dust 13103, 6 afternoon 12416, 7 evening 12418, 8 night 12414, 3 = clear) applied only in safe zones; global value in `data/weather.txt` (= 3). `randomWeather()` always returns 3 and the clock fields are never refreshed → effectively always clear. Commands `::snowingzz 1/2`, `::nosnow`, `::dust`, `::snow`, etc. JUNK/cosmetic.
- **Run energy**: +1 % per cycle while below 100 (`server.EnergyRegian = 0`, C:17572); −1 % per cycle while running (P:632); at 0 running stops. The run-energy text always shows "100%" (C:29327).
- **Bank interest**: code intends +4 % coins per 24 h of `playerGameTime`, but looks for bank id 995 (bank stores id+1) → **never pays** (JUNK). `playerGameCount` increments per cycle; `playerGameTime` +1 every 120,000 cycles.
- **Anti-cheat**: `ScanItems` dupe flags (§5.1); autoclick flag files at identical-click counts 10/15/30/50; `actionAmount > 25` kick; honeypot commands; report-abuse mute abuse = autoban; IP/name ban files.
- Stat restore / HP: **no natural HP regeneration and no natural restore of drained stats**; boosted skills 0-6 decay 1 per 250 cyc (Strength shares Defence's timer — BUG); prayer only via altars/potions; `restorePot()` (C:1024) resets skills 0-2, 4, 6-17, 20 to base (and Prayer if super restore).
- Max HP shown in hit bars = level-for-XP(HP) (half curve).

---

## 8. Custom minigames & PvM activities

Home portal row (objects placed by `makeGlobalObject`, C:1818-2330; signpost NPCs with forced chat §2.7):

| Object @ tile | NPC beside it | Destination / effect |
|---|---|---|
| 2466 red portal @2855,3598 | 2253 Wise Old Man "Clan Wars Portal!!" | menu: "Saradomin's Clan" → 2387,3116 / "Zamorak's Clan" → 2412,3091 (Castle Wars teams, no game logic) |
| 7324 blue portal @2856,3598 | 2821 "Fishing Portal!" | → 2572,3852 fishing area |
| 7325 @2857,3598 | 225 Bonzo "Icon Minigame!" | → 2607,3166 **Icon minigame** |
| 7352 @2858,3598 | 793 Alfonse "Enchanted Minigame!" | → 2502,3011 **Enchanted minigame** |
| 7319 @2860,3599 (also 3228,9318) | 920 Prince Ali "Barrows Portal!" | → 3565,3306 Barrows brothers |
| 2465 @2861,3599 | 2475 Frog princess "Training Portal!" | → 3209,2801 Training area (KBD ×2, Jogres, Soldiers — safe) |
| 2467 @2862,3599 | 28 Zoo keeper "Train Your Skills Here!" | → 2380,3427 "Skill Area" (Gnome stronghold) |
| 2472 @2864,3599 (also 3303,3123) | 364 King Lathas "Mod & Admin Portal Only!" | rights ≥1 → 3281,2766 Mod & Admin zone |
| 7315 @2756,3498 | 280 Brother Cedric | Strength ≥ 99 → 3492,9670 "Strength Guild" (Dagannoth kings ×7, Agrith Naar ×2) |
| 7316 @2759,3498 | 172 Dark wizard | **Ranged** ≥ 99 (message says Range and Magic) → 3243,9361 "Range/Magic Guild" (Black demons, Skeleton hellhounds, Arzinian Beings) |
| 4389 @2852,2953 | – | → 2540,3890 shops (Miscellania) |
| 4156 @3565,3308 | – | → 2852,2955 ("You teleport Home") |
| 2474 | – | → 3094,3498 Edgeville "Sick-like-a-Dick Town" pk/shop area |
| 884 well @2860,3591 | – | **Wishing well** (below) |
| 61 altar @2843,2964 / 2854,3957 / 3114,9836 | – | restore Prayer |

The "Allstar's Slave" referred to in autospawn.cfg is only the ignored description of the two **Genie 409** spawns at 2855,3593 and 2855,3590 (forced chat "Welcome to Allstar-Scape!").

### 8.1 Icon minigame (drop-chain) — CUSTOM
Entry: portal 7325 → **2607,3166** (safe zone #18/#43).
1. **Guardian of Armadyl (F) 275** @2610,3166 (1000 HP, max 10) → drops Chest key 4273, teleports the fight starter to 2608,3163.
2. **Khazard warlord 477** @2610,3163 (1400 HP, max 14) → teleport 2608,3159.
3. **Stranger 1919** @2610,3159 (1700 HP, max 17) → teleport **2866,9952** (safe #59).
4. **Ice giants 111** ×3 @2866,9954 / 2869,9950 / 2867,9946 (2400 HP, max 24) → each kill drops one of Red 1543 / Yellow 1545 / Blue 1546 / Green 1548 key (1/4 each).
5. Use key on chest **4119 @2866,9956** (C:18625-18660): Red → 14643, Blue → 14645, Yellow → 14644, Green → 14646 (custom item ids, not in item.cfg), message "Well done, you have just finished your mini game, here's your reward :)", teleport home 2853,3591.
(NPCs respawn after 35 s like every NPC; no instancing; anyone can join mid-chain.)

### 8.2 Enchanted minigame (drop-chain) — CUSTOM
Entry: portal 7352 → **2502,3011** (safe #58).
1. **Guardian of Armadyl (M) 274** @2502,3013 (400, max 4) → teleport 2540,3019.
2. **Ice Queen 795** @2540,3018 (300, max 3) → drops Zealot's key 4078 (unused), teleport 2551,3043.
3. **Lesser demon 752** @2551,3046 (520, max 5) → teleport 2542,3029.
4. **Nazastarool 509** @2542,3033 (800, max 8) → drops New key 6104, teleport **2792,9325**.
5. **Flambeed 3494** @2792,9328 (1300, max 13) → drops one of New key 6104 / Muddy key 991 / Crystal key 989 (1/3 each).
6. Use key on chest **4121 @2794,9326**: 6104 → Enchanted hat 7400; 989 → Enchanted top 7399; 991 → Enchanted robe 7398 (but deletes a 6104 instead of the 991 — BUG); teleport home 2853,3591.

### 8.3 Godsword / Elemental minigame ("::gsmini") — CUSTOM
Entry: `::gsmini` (anyone) → **2845,4832** Air altar room ("Welcome godsword mini game, kill the monsters to advance rounds" / "The monsters hp starts at 150 then next monster is 250 and so on" (not true) / "If you PK here YOUR BANNED!"). Also reachable through the Abyss rift objects (7139 air @3047,4825 → 2845,4832; 7130 earth @3031,4825 → 2660,4839; 7137 water @3051,4833 → 2713,4836; 7129 fire @3029,4830 → 2584,4836; 7135 law @3049,4839 → 2464,4834; 7131 body → 2527,4833; 7132 cosmic → 2162,4833). All rooms are safe zones.
1. **Air elementals 1021** ×4 (2840-2848, 4830-4838; 400 HP, max 4) → kill teleports to **2660,4839** (Earth altar).
2. **Earth elementals 1020** ×4 → **2713,4836** (Water altar).
3. **Water elementals 1022** ×4 → **2584,4836** (Fire altar).
4. **Fire elementals 1019** ×4 → **2464,4834** (Law altar).
5. **Chaos Elementals 3200** ×3 (2464,4821; 2454,4833; 2473,4833; 800 HP, r(8) from any range, weapon strip) → drop one key: 601 Keep key / 758 Key / 788 Glough's key / 983 Brass key (1/4 each).
6. Use key on "silver chest" **4126 @2465,4817** (C:18562-18597): 601 → **Zamorak godsword 15336** + 300,000×Magic-level Magic XP; 758 → **Bandos godsword 15334** + same XP; 788 → 30,000,000 coins + same XP; 983 → 10,000,000 coins (0 XP). Then teleport back to 2845,4832.

### 8.4 Granite maul chain — CUSTOM
River troll 391 @2890,3547 (100 HP) drops Frozen key 3741 (4/23) → use on portal **7288 @2890,3545** → teleport 3052,3440 ("Kill the unicorn for the prison key…") → **Unicorn 89** drops Prison key 6966 (1/19) → use on chest **4483 @3054,3437** → Granite maul 4153. (Merlin 213 @2890,3544 advertises it.)

### 8.5 Other key/chest rewards — CUSTOM
- **Kalphite chest 76 @3469,9488** (KQ lair): Crystal key 989 (KQ 1/43, Flambeed 1/3) → Bunny ears 1037 + Santa hat 1050 + Fire cape 6570.
- **Wishing well** (object 884, e.g. @2860,3591): use coins with ≥70,000,000 → −70M, one random of {15195 Dragon full helm, 15185 Dragonfire shield, 15348 Bandos chestplate, 14520 Amulet of strength(t), 15334 Bandos godsword, 7449 "Allstar's Hammer", 15346 Armadyl chestplate} (1/7 each), `actionTimer = 3600` (30 min; message says 1 hour) (C:18754).
- **Barrel 2182 @3231,3501** (object placed @3231,3499): "U G3T TH3 LOOT AND SCRAM" → Bow-sword 6818 + teleport home (end of the custom secret-commands quest route; quest inventory).

### 8.6 Static "minigame" areas without game logic
- **Pest Control**: `::pest` (anyone) → 2657,2639. Pest monsters 3758 ×12, 3760 ×11, 3771 ×9 and portals 3777-3780 are permanently spawned on the island (2646-2679, 2572-2591), 3000 HP / max 30 each, no rewards, no points, no boats/void knight logic. CUSTOM training spot.
- **Castle Wars**: `::cwars` → 2397,3108 "CastleWars Pk area!"; clan portal teams (above); CW thieving tables @2425,3078 (thieving inventory); lobby partly safe; team/score variables `CWA/CWT/SS/ZS/Winner/playerIsSara/playerIsZammy/CWon` are never used — **no game**.
- **Fight Caves / TzHaar**: TzHaar city NPCs wander 2435-2493, 5120-5182; fight-cave monsters 2741/2743/2746 statically placed at 2382-2414, 5131-5162 (3000 HP); NPC teleports 70 Turael → 2413,5117, 57 Fairy/33 Door man → 2438,5169, 37 Sigbert → 3254,3436. No waves, no Jad in the cave (Jads are elsewhere, §2.8). Ring of dueling "Jad" → 2837,9581.
- **Duel Arena, Fight Pits, Clan Wars (real), Pest Control logic**: **not implemented** (duel variables in Player.java unused; no packets handled).
- **PkBox**: `::pkbox` (also a button) → 3306,9375 (itself inside safe rect #64; PvP around it), second pkbox bank booths @3432-3435,9772 (safe rect #67). "Latest Update - New PkBox!".
- Other teleports that feed PvM/PvP spots (commands inventory has the full list): `::relleka` → 2680,3718 rock crabs; `::kqueen` → 3485,9483 KQ lair; `::testminigame` → 3114,9928; `::home` → 3565,3306 (Barrows); `::cather`, `::mining`, `::wc`, etc.
- Custom quests (q1 "Invisible armour", q2, q3 "Spells Of The Gods") are in the quest inventory; relevant here: q3 drop of Heart crystal 744 at 2780,3515 spawns Infernal Mage 1645 (C:23421); q1 guard gate check at 2790-2791,10216 (C:17541).

---

## 9. JUNK / dead code list (do not port)

NPCHandler: `newSummonedNPC`, `AttackPlayerRanged`, NPC-vs-NPC branches, `worldmap[][]` (walkable list), `MonsterDropItems`/`npcdrops.cfg`, `IsDropping` guard, `remove` field, forced-chat second Santa branch, poison after 999,999 cycles. ItemHandler `loadDrops`/`drops.cfg`. client: `nonattackable()`, `badNames()`, `ApplyDeadz()`/`ApplyRingz()`, `bowSpecc`, `DDZZ`, `DragonLongSpecial`, elemental robe procs, `StrPotion/StrPrayer`, all non-protection prayers, `EntangleDelay` (freezes), `CheckWildrange`/`WildyLevel`/`IsInWilderness(x,y,t)`, weather timers, bank interest, Castle Wars variables, `writePlayers()`, `loadsave()/secondaryload()/loadMythgame` (legacy save), FTP save path, `checkstarter()` (absolute path), `saveStats()` hiscore file, `getXPForLevel`, `Reptimer` decrement, `antilag` restart, frame test helpers (`frame60`…`frame117`), `Killedqueen` quest flag (never set), `playerIsMember` gating (none). Duplicate if-blocks (Jogre ×3 drop is *reachable* and must be kept for 1:1).

---

## Appendix A — autospawn.cfg, all 492 rows

Format: `L<cfg line> <npcId> <npc.cfg name> @x,y,h w<walkType> [box=x<min>-<max>,y<min>-<max>] [WANDERS = spawn inside box, walk type 1/2 and all four range values > 0] hp<effective HP> [LC debugname] "<description column>"`. Effective HP = npc.cfg health, or 3000 if 0/missing; NPC max hit = floor(HP/100) unless §2.4 overrides. 84 rows can wander (1×1 boxes cannot actually move); all others are stationary. Order = file order (the server spawns in this order, so NPC slot numbers follow it). The description column is ignored by the server (e.g. "Allstar's Slave" on the two Genie 409 rows).

```
L2 2821 ? @2856,3599,0 w1 hp3000 [ali_the_farmer] "Zeke"
L3 2475 Frog_princess @2861,3600,0 w1 hp3000 [macro_frog_princess] "Frog"
L4 0 Hans @2737,3468,0 w1 hp3000 [hans] "hans"
L5 0 Hans @2738,3468,0 w1 hp3000 [hans] "hans"
L6 0 Hans @2740,3468,0 w1 hp3000 [hans] "hans"
L7 0 Hans @2735,3468,0 w1 hp3000 [hans] "hans"
L8 57 Fairy @2851,3593,0 w1 hp3000 [fairy] "hans"
L9 541 Zeke @2848,2965,0 w1 hp3000 [zeke] "Zeke"
L10 225 Bonzo @2857,3599,0 w1 hp3000 [bonzo] "Zeke"
L11 945 RuneScape_Guide @3283,2764,0 w1 hp3000 [newbie_basics_instructor] "Zeke"
L12 945 RuneScape_Guide @3279,2764,0 w1 hp3000 [newbie_basics_instructor] "Zeke"
L13 212 King_Percival @3285,2777,0 w1 hp3000 [king_percival] "Zeke"
L14 212 King_Percival @3277,2777,0 w1 hp3000 [king_percival] "Zeke"
L15 364 King_Lathas @2864,3600,0 w1 hp3000 [kinglathas] "Zeke"
L16 280 Brother_Cedric @2756,3499,0 w1 hp3000 [brother_cedric] "Zeke"
L17 172 Dark_wizard @2759,3499,0 w1 hp3000 [bearded_dark_wizard] "Dark_Mage"
L18 793 Alfonse_the_waiter @2858,3599,0 w1 hp3000 [alfonse_the_waiter] "someone"
L19 648 King_Roald @3209,2803,0 w1 hp3000 [king_roald] "someone"
L20 3758 ? @2670,2573,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_4a] "pc monster"
L21 3760 ? @2679,2589,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_5a] "pc monster"
L22 3771 ? @2646,2572,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_defiler_5b] "pc monster"
L23 2745 Tztok-Jad @3210,3423,0 w2 box=x3573-3577,y3296-3300 hp700 [tzhaar_fightcave_swarm_boss] "Tzok Jad"
L24 3758 ? @2670,2573,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_4a] "pc monster"
L25 3760 ? @2679,2589,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_5a] "pc monster"
L26 3771 ? @2646,2572,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_defiler_5b] "pc monster"
L27 1158 Kalphite_Queen @3483,9490,0 w1183 box=x3890-3480,y9500-9490 hp800 [kalphite_queen] "Kalph Queen"
L28 3771 ? @2679,2591,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_defiler_5b] "pc monster"
L29 3758 ? @2670,2573,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_4a] "pc monster"
L30 3758 ? @2670,2573,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_4a] "pc monster"
L31 683 Bow_and_Arrow_salesman @2736,3473,0 w1 box=x3320-3321,y3193-3194 hp3000 [ranging_guild_bow_salesman] "Arrow E bow shop"
L32 1759 Farmer @2852,2952,0 w1 hp3000 [farmer_farming] "Hero"
L33 2304 Sarah @2820,3460,0 w1 hp3000 [farming_shopkeeper_1] "Hero"
L34 461 Magic_Store_owner @2741,3464,0 w1 hp3000 [magic_store_owner] "Rune Store"
L35 554 Fancy_dress_shop_owner @2730,3468,0 w1 hp3000 [tailorp] "Gilded Store"
L36 550 Lowe @3305,9373,0 w1 hp3000 [lowe] "Range Sfthop"
L37 550 Lowe @3246,3516,0 w1 hp3000 [lowe] "Range Shop"
L38 520 Shop_keeper @2745,3468,0 w1 hp3000 [generalshopkeeper1] "Member Shop"
L39 1699 Ghost_Shopkeeper @2743,3466,0 w1 hp3000 [ahoy_ghost_shopkeeper] "Pure Shop"
L40 1783 Richard @2000,3468,0 w1 hp3000 [wilderness_capeseller_6] "Team Capes"
L41 521 Shop_assistant @2738,3463,0 w1 hp3000 [generalassistant1] "Helm Shop"
L42 1917 Bandit_shopkeeper @2742,3473,0 w1 hp3000 [dt_bandit_shopkeeper] "Rune Armor Shop"
L43 522 Shop_keeper @2517,3861,0 w1 hp3000 [generalshopkeeper2] "General Store"
L44 548 Thessalia @2736,3461,0 w1 hp3000 [thessalia] "Noob Store"
L45 528 Shop_keeper @2732,3471,0 w1 hp3000 [generalshopkeeper5] "Woodcutting Shop"
L46 551 Shop_keeper @3478,9484,0 w1 hp2000 [swordshop1] "Kalphite Food Shop"
L47 530 Shop_keeper @2380,3432,0 w1 hp3000 [generalshopkeeper6] "Fletching Shop"
L48 555 Shop_keeper @2731,3464,0 w1 hp2000 [khazard_shopkeeper] "Skill Cape Shop"
L49 561 Shop_keeper @2733,3464,0 w1 hp3000 [lathas_shopkeeper] "Hood Shop"
L50 538 Peksa @3422,3534,0 w1 hp3000 [peksa] "Slayer Shop"
L51 558 Gerrant @2744,3475,0 w1 hp3000 [gerrant] "Postilyte Shop"
L52 2026 Dharok_the_Wretched @3565,3286,0 w1 box=x3573-3577,y3296-3300 hp150 [barrows_dharok] "Dharok"
L53 2030 Verac_the_Defiled @3556,3000,0 w1 box=x3556-3558,y3295-3299 hp150 [barrows_verac] "Verac"
L54 2027 Guthan_the_Infested @3556,3000,0 w1 box=x3563-3567,y3273-3276 hp150 [barrows_guthan] "Ghutan"
L55 2029 Torag_the_Corrupted @3573,3297,0 w1 box=x3563-3567,y3286-3290 hp150 [barrows_torag] "Torag"
L56 2026 Dharok_the_Wretched @3553,3000,0 w1 box=x3573-3577,y3296-3300 hp150 [barrows_dharok] "Dharok"
L57 2030 Verac_the_Defiled @3553,3000,0 w1 box=x3556-3558,y3295-3299 hp150 [barrows_verac] "Verac"
L58 2027 Guthan_the_Infested @3575,3283,0 w1 box=x3563-3567,y3273-3276 hp150 [barrows_guthan] "Ghutan"
L59 82 Lesser_demon @3286,3163,1 w1 box=x3292-3294,y3163-3163 hp80 [lesser_demon] "Lesser"
L60 2304 Sarah @3285,3173,0 w1 box=x3285-3286,y3172-3173 WANDERS hp3000 [farming_shopkeeper_1] "pc monster"
L61 2256 Paladin @3300,3175,0 w1 box=x3300-3301,y3174-3175 WANDERS hp65 [paladin2] "pc monster"
L62 2256 Paladin @3300,3172,0 w1 box=x3300-3301,y3171-3172 WANDERS hp65 [paladin2] "pc monste"
L63 21 Hero @3296,3163,0 w1 box=x3296-3297,y3162-3163 WANDERS hp3000 [hero] "Hero"
L64 21 Hero @3290,3163,0 w1 box=x3290-3291,y3162-3163 WANDERS hp3000 [hero] "Hero"
L65 18 Al-Kharid_warrior @3291,3177,0 w1 box=x3293-3295,y3162-3163 hp38 [al_kharid_warrior] "Al-k'harid Warrior"
L66 82 Lesser_demon @3288,3164,1 w1 box=x3286-3288,y3164-3163 hp80 [lesser_demon] "Hero"
L67 18 Al-Kharid_warrior @3294,3177,0 w1 box=x3294-3295,y3176-3177 WANDERS hp38 [al_kharid_warrior] "Al-k'harid Warrior"
L68 545 Dommik @3273,3192,0 w1 box=x3273-3274,y3191-3192 WANDERS hp3000 [dommik] "shop"
L69 18 Al-Kharid_warrior @3295,3168,0 w1 box=x3294-3296,y3167-3168 WANDERS hp38 [al_kharid_warrior] "Al-k'harid Warrior"
L70 18 Al-Kharid_warrior @3290,3168,0 w1 box=x3288-3291,y3167-3168 WANDERS hp38 [al_kharid_warrior] "Al-k'harid Warrior"
L71 18 Al-Kharid_warrior @2509,3883,0 w1 box=x3297-3298,y3172-3173 hp38 [al_kharid_warrior] "Al-k'harid Warrior"
L72 18 Al-Kharid_warrior @2517,3881,0 w1 box=x3287-3287,y3170-3172 hp38 [al_kharid_warrior] "Al-k'harid Warrior"
L73 3758 ? @2670,2573,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_4a] "pc monster"
L74 3758 ? @2670,2573,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_4a] "pc monster"
L75 3758 ? @2670,2573,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_4a] "pc monster"
L76 3758 ? @2670,2573,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_4a] "pc monster"
L77 3760 ? @2679,2589,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_5a] "pc monster"
L78 3771 ? @2646,2572,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_defiler_5b] "pc monster"
L79 3771 ? @2646,2572,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_defiler_5b] "pc monster"
L80 3771 ? @2646,2572,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_defiler_5b] "pc monster"
L81 3771 ? @2646,2572,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_defiler_5b] "pc monster"
L82 3771 ? @2646,2572,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_defiler_5b] "pc monster"
L83 3771 ? @2646,2572,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_defiler_5b] "pc monster"
L84 3758 ? @2670,2573,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_4a] "pc monster"
L85 3758 ? @2670,2573,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_4a] "pc monster"
L86 3758 ? @2670,2573,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_4a] "pc monster"
L87 3758 ? @2670,2573,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_4a] "pc monster"
L88 3760 ? @2679,2589,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_5a] "pc monster"
L89 3760 ? @2679,2589,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_5a] "pc monster"
L90 3760 ? @2679,2589,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_5a] "pc monster"
L91 3760 ? @2679,2589,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_5a] "pc monster"
L92 3760 ? @2679,2589,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_5a] "pc monster"
L93 3760 ? @2679,2589,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_5a] "pc monster"
L94 3760 ? @2679,2589,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_5a] "pc monster"
L95 3760 ? @2679,2589,0 w1 box=x3262-3262,y3424-3424 hp3000 [pest_torcher_5a] "pc monster"
L96 3777 ? @2680,2588,0 w0 hp3000 [pest_portal_1_active] "pc gate"
L97 3779 ? @2669,2570,0 w0 hp3000 [pest_portal_3_active] "pc gate"
L98 3780 ? @2645,2569,0 w0 hp3000 [pest_portal_4_active] "pc gate"
L99 1001 Dark_mage @3302,3200,0 w1 box=x3262-3262,y3424-3424 hp3000 [upassmage] "pc monster"
L100 3778 ? @2628,2591,0 w0 hp3000 [pest_portal_2_active] "pc gate"
L101 494 Banker @2811,3443,0 w1 hp3000 [banker1] "Catherbay East Bank Male Banker"
L102 495 Banker @2810,3443,0 w1 hp3000 [banker2] "Catherbay East Bank Female Banker"
L103 494 Banker @2809,3443,0 w1 hp3000 [banker1] "Catherbay East Bank Male Banker"
L104 494 Banker @2807,3443,0 w1 hp3000 [banker1] "Catherbay East Bank Male Banker"
L105 527 Shop_assistant @2804,3432,0 w2 hp3000 [generalassistant4] "Catherbay General Store Shop Keeper"
L106 494 Banker @3096,3489,0 w1 hp3000 [banker1] "Edgeville East Bank Male Banker"
L107 495 Banker @3096,3491,0 w1 hp3000 [banker2] "Edgeville East Bank Female Banker"
L108 494 Banker @3098,3492,0 w1 hp3000 [banker1] "Edgeville East Bank Male Banker"
L109 494 Banker @3096,3492,0 w1 hp3000 [banker1] "Edgeville East Bank Male Banker"
L110 527 Shop_assistant @3080,3509,0 w2 hp3000 [generalassistant4] "Edgeville General Store Shop Keeper"
L111 585 Rommik @2949,3205,0 w1 box=x2946-2952,y3202-3208 WANDERS hp3000 [rommik] "Rimmington Crafting Shop"
L112 2745 Tztok-Jad @2837,9556,0 w2651 hp700 [tzhaar_fightcave_swarm_boss] "Jad"
L113 209 Nulodion @2739,3474,0 w2 hp2000 [nulodion] "dragon shop"
L114 551 Shop_keeper @2815,3184,0 w2 hp2000 [swordshop1] "food shop"
L115 555 Shop_keeper @2801,3195,0 w2 hp2000 [khazard_shopkeeper] "Random St00f dude"
L116 2262 Dark_mage @2795,3180,0 w2 hp2000 [rcu_zammy_mage2] "ghostly shop"
L117 2168 Customer @2797,3177,0 w2 hp2000 [dwarf_city_library_customer_human] "team capes 1"
L118 2167 Customer @2809,3186,0 w2 hp2000 [dwarf_city_library_customer] "team capes 2"
L119 554 Fancy_dress_shop_owner @3315,3165,0 w1 box=x3315-3317,y3163-3165 WANDERS hp3000 [tailorp] "Weapon and Armor shop keeper"
L120 944 Combat_Instructor @2800,3180,0 w1 hp3000 [newbie_combat_instructor] "Weapon and Armor shop keeper"
L121 549 Horvik @2377,3442,0 w1 hp3000 [horvik_the_armourer] "smithing shop"
L122 550 Lowe @2801,3175,0 w1 hp3000 [lowe] "range shop"
L123 550 Lowe @2823,3443,0 w1 hp3000 [lowe] "range shop"
L124 3117 ? @2799,3180,0 w1 hp3000 [macro_sandwich_lady_npc] "noob armor shop"
L125 553 Aubury @2743,3470,0 w1 hp2000 [aubury] "skillin shop"
L126 112 Moss_giant @2824,3253,0 w1 hp60 [mossgiant] "moss giant"
L127 112 Moss_giant @2832,3246,0 w1 hp60 [mossgiant] "moss giant"
L128 112 Moss_giant @2833,3243,0 w1 hp60 [mossgiant] "moss giant"
L129 112 Moss_giant @2825,3250,0 w1 hp60 [mossgiant] "moss giant"
L130 112 Moss_giant @2830,3244,0 w1 hp60 [mossgiant] "moss giant"
L131 941 Green_dragon @2714,9821,0 w1 hp100 [green_dragon] "green dragon"
L132 941 Green_dragon @2718,9823,0 w1 hp100 [green_dragon] "green dragon"
L133 941 Green_dragon @2720,9820,0 w1 hp100 [green_dragon] "green dragon"
L134 83 Greater_demon @2920,2727,0 w1 hp100 [greater_demon] "greater demon"
L135 83 Greater_demon @2919,2721,0 w1 hp100 [greater_demon] "greater demon"
L136 83 Greater_demon @2921,2714,0 w1 hp100 [greater_demon] "greater demon"
L137 83 Greater_demon @2831,9564,0 w1 hp100 [greater_demon] "greater demon"
L138 83 Greater_demon @2839,9552,0 w1 hp100 [greater_demon] "greater demon"
L139 83 Greater_demon @2844,9557,0 w1 hp100 [greater_demon] "greater demon"
L140 83 Greater_demon @2926,2721,0 w1 hp100 [greater_demon] "greater demon"
L141 1852 Arzinian_Avatar_of_Strength @2837,3297,0 w1 hp60 [dwarf_rock_avatar_warrior_yellow] "avatar of strength"
L142 1855 Arzinian_Avatar_of_Ranging @2839,3295,0 w1 hp60 [dwarf_rock_avatar_archer_yellow] "avatar of ranged"
L143 1858 Arzinian_Avatar_of_Magic @2843,3298,0 w1 hp60 [dwarf_rock_avatar_mage_yellow] "avatar of magic"
L144 1852 Arzinian_Avatar_of_Strength @2844,3295,0 w1 hp60 [dwarf_rock_avatar_warrior_yellow] "avatar of strength"
L145 1858 Arzinian_Avatar_of_Magic @2841,3296,0 w1 hp60 [dwarf_rock_avatar_mage_yellow] "avatar of magic"
L146 55 Blue_dragon @2711,9817,0 w1 hp125 [blue_dragon] "blue dragon"
L147 55 Blue_dragon @2713,9815,0 w1 hp125 [blue_dragon] "blue dragon"
L148 55 Blue_dragon @2605,3856,0 w1 hp125 [blue_dragon] "blue dragon"
L149 53 Red_dragon @2720,9808,0 w1 hp150 [red_dragon] "red dragon"
L150 53 Red_dragon @2722,9810,0 w1 hp150 [red_dragon] "red dragon"
L151 53 Red_dragon @2716,9807,0 w1 hp150 [red_dragon] "red dragon"
L152 1659 Skullball @2804,3178,0 w1 hp3000 [waa_skullball] "skull ball"
L153 50 King_black_dragon @3219,2786,0 w1 hp2600 [king_dragon] "kbd"
L154 50 King_black_dragon @3219,2794,0 w1 hp2600 [king_dragon] "kbd"
L155 49 Hellhound @2839,9613,0 w1 hp135 [hellhound] "hellhound"
L156 49 Hellhound @2603,3895,0 w1 hp135 [hellhound] "hellhound"
L157 49 Hellhound @2607,3891,0 w1 hp135 [hellhound] "hellhound"
L158 233 Fishing_spot @2560,3892,0 w1 hp3000 [0_41_53_compofishspot] "Fishing Spot3"
L159 236 Fishing_spot @2564,3892,0 w1 hp3000 [0_41_53_joshuafishspot] "Fishing Spot1"
L160 234 Fishing_spot @2571,3886,0 w1 hp3000 [0_41_53_sinisterfishspot] "Fishing Spot2"
L161 235 Fishing_spot @2576,3882,0 w1 hp3000 [0_41_53_bigdavefishspot] "Fishing Spot3"
L162 236 Fishing_spot @2574,3884,0 w1 hp3000 [0_41_53_joshuafishspot] "Fishing Spot1"
L163 235 Fishing_spot @2576,3874,0 w1 hp3000 [0_41_53_bigdavefishspot] "Shrimp Spot"
L164 234 Fishing_spot @2774,3169,0 w1 hp3000 [0_41_53_sinisterfishspot] "Fishing Spot3"
L165 233 Fishing_spot @2777,3169,0 w1 hp3000 [0_41_53_compofishspot] "Fishing Spot4"
L166 236 Fishing_spot @2852,3423,0 w1 hp3000 [0_41_53_joshuafishspot] "Fishing Spot1"
L167 235 Fishing_spot @2846,3429,0 w1 hp3000 [0_41_53_bigdavefishspot] "Shrimp Spot"
L168 234 Fishing_spot @2843,3429,0 w1 hp3000 [0_41_53_sinisterfishspot] "Fishing Spot3"
L169 233 Fishing_spot @2838,3431,0 w1 hp3000 [0_41_53_compofishspot] "Fishing Spot4"
L170 235 Fishing_spot @2582,3854,0 w1 hp3000 [0_41_53_bigdavefishspot] "Shrimp Spot"
L171 235 Fishing_spot @2581,3854,0 w1 hp3000 [0_41_53_bigdavefishspot] "Shrimp Spot"
L172 235 Fishing_spot @2580,3854,0 w1 hp3000 [0_41_53_bigdavefishspot] "Shrimp Spot"
L173 234 Fishing_spot @2577,3854,0 w1 hp3000 [0_41_53_sinisterfishspot] "Lobster"
L174 234 Fishing_spot @2576,3854,0 w1 hp3000 [0_41_53_sinisterfishspot] "Lobster"
L175 236 Fishing_spot @2574,3855,0 w1 hp3000 [0_41_53_joshuafishspot] "Shark"
L176 236 Fishing_spot @2574,3856,0 w1 hp3000 [0_41_53_joshuafishspot] "Shark"
L177 233 Fishing_spot @2573,3860,0 w1 hp3000 [0_41_53_compofishspot] "Manta"
L178 233 Fishing_spot @2572,3860,0 w1 hp3000 [0_41_53_compofishspot] "Manta"
L179 82 Lesser_demon @2837,3280,0 w1 hp80 [lesser_demon] "lesser demon"
L180 82 Lesser_demon @2835,3275,0 w1 hp80 [lesser_demon] "lesser demon"
L181 82 Lesser_demon @2831,3267,0 w1 hp80 [lesser_demon] "lesser demon"
L182 82 Lesser_demon @2833,3269,0 w1 hp80 [lesser_demon] "lesser demon"
L183 114 Ogre @2845,3271,0 w1 hp60 [ogre] "ogre"
L184 114 Ogre @2847,3270,0 w1 hp60 [ogre] "ogre"
L185 114 Ogre @2846,3267,0 w1 hp60 [ogre] "ogre"
L186 114 Ogre @2847,3265,0 w1 hp60 [ogre] "ogre"
L187 114 Ogre @2845,3264,0 w1 hp60 [ogre] "ogre"
L188 114 Ogre @2845,3261,0 w1 hp60 [ogre] "ogre"
L189 114 Ogre @2912,9906,0 w1 hp60 [ogre] "ogre"
L190 114 Ogre @2908,9905,0 w1 hp60 [ogre] "ogre"
L194 86 Giant_rat @2889,9910,0 w1 hp5 [giantrat] "rat"
L195 86 Giant_rat @2890,9907,0 w1 hp5 [giantrat] "rat"
L196 86 Giant_rat @2889,9905,0 w1 hp5 [giantrat] "rat"
L197 86 Giant_rat @2888,9907,0 w1 hp5 [giantrat] "rat"
L198 86 Giant_rat @2895,3551,0 w1 hp5 [giantrat] "rat"
L199 86 Giant_rat @2894,3553,0 w1 hp5 [giantrat] "rat"
L200 86 Giant_rat @2892,3554,0 w1 hp5 [giantrat] "rat"
L201 86 Giant_rat @2890,3000,0 w1 hp5 [giantrat] "rat"
L202 2026 Dharok_the_Wretched @3118,9840,0 w1 hp150 [barrows_dharok] "dharok"
L203 2026 Dharok_the_Wretched @3567,3289,0 w1 hp150 [barrows_dharok] "dharok"
L204 2026 Dharok_the_Wretched @3562,3289,0 w1 hp150 [barrows_dharok] "dharok"
L205 2026 Dharok_the_Wretched @3565,3291,0 w1 hp150 [barrows_dharok] "dharok"
L206 2026 Dharok_the_Wretched @3117,9840,0 w1 hp150 [barrows_dharok] "dharok"
L207 2026 Dharok_the_Wretched @3119,9840,0 w1 hp150 [barrows_dharok] "dharok"
L208 2026 Dharok_the_Wretched @2915,9914,0 w1 hp150 [barrows_dharok] "dharok"
L209 2026 Dharok_the_Wretched @2915,9913,0 w1 hp150 [barrows_dharok] "dharok"
L210 2026 Dharok_the_Wretched @2915,9912,0 w1 hp150 [barrows_dharok] "dharok"
L211 113 Jogre @3212,2792,0 w1 hp700 [jogre] "mage"
L212 275 Guardian_of_Armadyl @2610,3166,0 w1 hp1000 [ikov_guardianfemale] "guardian"
L213 477 Khazard_warlord @2610,3163,0 w1 hp1400 [khazard_warlord] "guardian"
L214 1919 Stranger @2610,3159,0 w1 hp1700 [fourdiamonds_assasin] "guardian"
L215 111 Ice_giant @2866,9954,0 w1 hp2400 [icegiant] "guardian"
L216 111 Ice_giant @2869,9950,0 w1 hp2400 [icegiant] "guardian"
L217 111 Ice_giant @2867,9946,0 w1 hp2400 [icegiant] "guardianspawn = 113 3214 2792 0 0 0 0 0 1 mage"
L218 113 Jogre @3216,2792,0 w1 hp700 [jogre] "mage"
L219 113 Jogre @3214,2790,0 w1 hp700 [jogre] "mage"
L220 113 Jogre @3216,2790,0 w1 hp700 [jogre] "mage"
L221 113 Jogre @3212,2790,0 w1 hp700 [jogre] "mage"
L222 113 Jogre @3212,2788,0 w1 hp700 [jogre] "archer"
L223 113 Jogre @3214,2788,0 w1 hp700 [jogre] "spider"
L224 113 Jogre @3216,2788,0 w1 hp700 [jogre] "spider"
L225 35 Soldier @3207,2793,0 w1 hp400 [yanille_soldier] "soldier"
L226 35 Soldier @3209,2793,0 w1 hp400 [yanille_soldier] "soldier"
L227 35 Soldier @3209,2791,0 w1 hp400 [yanille_soldier] "soldier"
L228 35 Soldier @3207,2791,0 w1 hp400 [yanille_soldier] "soldier"
L229 35 Soldier @3205,2791,0 w1 hp400 [yanille_soldier] "soldier"
L230 35 Soldier @3205,2789,0 w1 hp400 [yanille_soldier] "soldier"
L231 35 Soldier @3207,2789,0 w1 hp400 [yanille_soldier] "soldier"
L232 35 Soldier @3209,2789,0 w1 hp400 [yanille_soldier] "soldier"
L233 35 Soldier @2893,9902,0 w1 hp400 [yanille_soldier] "soldier"
L234 35 Soldier @2894,9903,0 w1 hp400 [yanille_soldier] "soldier"
L235 35 Soldier @2892,9903,0 w1 hp400 [yanille_soldier] "soldier"
L236 35 Soldier @2893,9904,0 w1 hp400 [yanille_soldier] "soldier"
L237 35 Soldier @2892,9905,0 w1 hp400 [yanille_soldier] "soldier"
L238 84 Black_Demon @3252,9371,0 w1 hp2000 [black_demon] "Black_Demon"
L239 84 Black_Demon @3252,9367,0 w1 hp2000 [black_demon] "Black_Demon"
L240 84 Black_Demon @3250,9372,0 w1 hp2000 [black_demon] "Black_Demon"
L241 84 Black_Demon @3250,9367,0 w1 hp2000 [black_demon] "Black_Demon"
L242 1575 Skeleton_Hellhound @3253,9361,0 w1 hp2000 [skeleton_hellhound] "SH"
L243 1575 Skeleton_Hellhound @3253,9357,0 w1 hp2000 [skeleton_hellhound] "SH"
L244 1575 Skeleton_Hellhound @3250,9357,0 w1 hp2000 [skeleton_hellhound] "SH"
L245 1575 Skeleton_Hellhound @3250,9361,0 w1 hp2000 [skeleton_hellhound] "SH"
L246 1859 Arzinian_Being_of_Bordanzan @3243,9372,0 w1 hp2500 [dwarf_rock_actual_demon] "Wiz"
L247 1859 Arzinian_Being_of_Bordanzan @3243,9368,0 w1 hp2500 [dwarf_rock_actual_demon] "Wiz"
L248 1859 Arzinian_Being_of_Bordanzan @3246,9368,0 w1 hp2500 [dwarf_rock_actual_demon] "Wiz"
L249 1859 Arzinian_Being_of_Bordanzan @3246,9372,0 w1 hp2500 [dwarf_rock_actual_demon] "Wiz"
L250 920 Prince_Ali @2860,3600,0 w1 hp3000 [prince_ali_prison] "princeali"
L251 920 Prince_Ali @3227,9318,0 w1 hp3000 [prince_ali_prison] "princeali"
L252 274 Guardian_of_Armadyl @2502,3013,0 w1 hp400 [ikov_guardianmale] "frogprincess"
L253 2029 Torag_the_Corrupted @3000,3157,0 w1 hp150 [barrows_torag] "babyred"
L254 2029 Torag_the_Corrupted @2602,3157,0 w1 hp150 [barrows_torag] "torag"
L255 795 Ice_Queen @2540,3018,0 w1 hp300 [ice_queen] "armadly"
L256 2881 Dagannoth_Supreme @3510,9673,0 w1 hp2000 [dagcave_ranged_boss] "torag"
L257 2881 Dagannoth_Supreme @3515,9673,0 w1 hp2000 [dagcave_ranged_boss] "torag"
L258 2882 Dagannoth_Prime @3507,9685,0 w1 hp2000 [dagcave_magic_boss] "torag"
L259 2882 Dagannoth_Prime @3513,9686,0 w1 hp2000 [dagcave_magic_boss] "torag"
L260 2883 Dagannoth_Rex @3496,9687,0 w1 hp2000 [dagcave_melee_boss] "torag"
L261 2883 Dagannoth_Rex @3502,9687,0 w1 hp2000 [dagcave_melee_boss] "torag"
L262 2881 Dagannoth_Supreme @3513,9669,0 w1 hp2000 [dagcave_ranged_boss] "torag"
L263 2029 Torag_the_Corrupted @2602,3158,0 w1 hp150 [barrows_torag] "torag"
L264 3494 Flambeed @2792,9328,0 w1 hp1300 [hundred_minion2] "torag"
L265 2919 Agrith Naar @3503,9678,0 w1 hp3000 [agrith_naar] "torag"
L266 2919 Agrith Naar @3497,9678,0 w1 hp3000 [agrith_naar] "torag"
L267 752 Lesser_demon @2551,3046,0 w1 hp520 [dragonslayer_demon] "torag"
L268 2029 Torag_the_Corrupted @2602,3159,0 w1 hp150 [barrows_torag] "torag"
L269 2029 Torag_the_Corrupted @2917,9914,0 w1 hp150 [barrows_torag] "torag"
L270 2029 Torag_the_Corrupted @3575,3295,0 w1 hp150 [barrows_torag] "torag"
L271 2029 Torag_the_Corrupted @3573,3297,0 w1 hp150 [barrows_torag] "torag"
L272 2029 Torag_the_Corrupted @3576,3300,0 w1 hp150 [barrows_torag] "torag"
L273 2029 Torag_the_Corrupted @3577,3297,0 w1 hp150 [barrows_torag] "torag"
L274 114 Ogre @2594,3156,0 w1 hp60 [ogre] "ogre"
L275 17 Barbarian_woman @3217,2806,0 w1 hp80 [barbarian_woman] "barbarian"
L276 17 Barbarian_woman @3219,2806,0 w1 hp80 [barbarian_woman] "barbarian"
L277 17 Barbarian_woman @3221,2806,0 w1 hp80 [barbarian_woman] "barbarian"
L278 17 Barbarian_woman @3223,2806,0 w1 hp80 [barbarian_woman] "barbarian"
L279 17 Barbarian_woman @3223,2804,0 w1 hp80 [barbarian_woman] "barbarian"
L280 17 Barbarian_woman @3221,2804,0 w1 hp80 [barbarian_woman] "barbarian"
L281 17 Barbarian_woman @3219,2804,0 w1 hp80 [barbarian_woman] "barbarian"
L282 17 Barbarian_woman @3217,2804,0 w1 hp80 [barbarian_woman] "barbarian"
L283 17 Barbarian_woman @3217,2802,0 w1 hp80 [barbarian_woman] "barbarian"
L284 17 Barbarian_woman @3219,2802,0 w1 hp80 [barbarian_woman] "barbarian"
L285 17 Barbarian_woman @3221,2802,0 w1 hp80 [barbarian_woman] "barbarian"
L286 17 Barbarian_woman @3223,2802,0 w1 hp80 [barbarian_woman] "barbarian"
L287 17 Barbarian_woman @2900,9908,0 w1 hp80 [barbarian_woman] "barbarian"
L288 17 Barbarian_woman @2896,9913,0 w1 hp80 [barbarian_woman] "barbarian"
L289 17 Barbarian_woman @2900,9911,0 w1 hp80 [barbarian_woman] "barbarian"
L290 17 Barbarian_woman @2898,9911,0 w1 hp80 [barbarian_woman] "barbarian"
L291 17 Barbarian_woman @2897,9910,0 w1 hp80 [barbarian_woman] "barbarian"
L292 17 Barbarian_woman @2898,9909,0 w1 hp80 [barbarian_woman] "barbarian"
L293 17 Barbarian_woman @2895,9911,0 w1 hp80 [barbarian_woman] "barbarian"
L294 17 Barbarian_woman @2895,9908,0 w1 hp80 [barbarian_woman] "barbarian"
L295 17 Barbarian_woman @2897,9907,0 w1 hp80 [barbarian_woman] "barbarian"
L296 17 Barbarian_woman @2597,3168,0 w1 hp80 [barbarian_woman] "barbarian"
L297 17 Barbarian_woman @2598,3165,0 w1 hp80 [barbarian_woman] "barbarian"
L298 17 Barbarian_woman @2596,3164,0 w1 hp80 [barbarian_woman] "barbarian"
L299 17 Barbarian_woman @2599,3166,0 w1 hp80 [barbarian_woman] "barbarian"
L300 17 Barbarian_woman @2594,3165,0 w1 hp80 [barbarian_woman] "barbarian"
L301 17 Barbarian_woman @2589,3167,0 w1 hp80 [barbarian_woman] "barbarian"
L302 17 Barbarian_woman @2589,3165,0 w1 hp80 [barbarian_woman] "barbarian"
L303 28 Zoo_keeper @2862,3600,0 w1 hp3000 [zoo_keeper] "zookeeper"
L304 2745 Tztok-Jad @3477,9495,0 w1 hp700 [tzhaar_fightcave_swarm_boss] "jad"
L305 509 Nazastarool @2542,3033,0 w1 hp800 [zq_mainzombie3] "jad"
L306 2253 Wise_Old_Man @2855,3599,0 w1 hp3000 [wise_old_man] "wiseoldman"
L307 2027 Guthan_the_Infested @3113,9832,0 w1 hp150 [barrows_guthan] "guthan"
L308 2027 Guthan_the_Infested @3111,9831,0 w1 hp150 [barrows_guthan] "guthan"
L309 2027 Guthan_the_Infested @3110,9833,0 w1 hp150 [barrows_guthan] "guthan"
L310 2027 Guthan_the_Infested @2919,9912,0 w1 hp150 [barrows_guthan] "guthan"
L311 2027 Guthan_the_Infested @2919,9911,0 w1 hp150 [barrows_guthan] "guthan"
L312 2027 Guthan_the_Infested @2919,9910,0 w1 hp150 [barrows_guthan] "guthan"
L313 2027 Guthan_the_Infested @3577,3285,0 w1 hp150 [barrows_guthan] "guthan"
L314 2027 Guthan_the_Infested @3579,3283,0 w1 hp150 [barrows_guthan] "guthan"
L315 2027 Guthan_the_Infested @3577,3281,0 w1 hp150 [barrows_guthan] "guthan"
L316 2028 Karil_the_Tainted @3107,9831,0 w1 hp150 [barrows_karil] "karil"
L317 2028 Karil_the_Tainted @3106,9829,0 w1 hp150 [barrows_karil] "karil"
L318 2028 Karil_the_Tainted @3106,9827,0 w1 hp150 [barrows_karil] "karil"
L319 2028 Karil_the_Tainted @2912,9912,0 w1 hp150 [barrows_karil] "karil"
L320 2028 Karil_the_Tainted @2912,9911,0 w1 hp150 [barrows_karil] "karil"
L321 2028 Karil_the_Tainted @2912,9910,0 w1 hp150 [barrows_karil] "karil"
L322 2028 Karil_the_Tainted @3557,3296,0 w1 hp150 [barrows_karil] "karil"
L323 2028 Karil_the_Tainted @3559,3298,0 w1 hp150 [barrows_karil] "karil"
L324 2028 Karil_the_Tainted @3554,3298,0 w1 hp150 [barrows_karil] "karil"
L325 2028 Karil_the_Tainted @3557,3300,0 w1 hp150 [barrows_karil] "karil"
L326 2025 Ahrim_the_Blighted @3098,9829,0 w1 hp110 [barrows_ahrim] "ahrim"
L327 2025 Ahrim_the_Blighted @3099,9833,0 w1 hp110 [barrows_ahrim] "ahrim"
L328 2025 Ahrim_the_Blighted @3100,9833,0 w1 hp110 [barrows_ahrim] "ahrim"
L329 2025 Ahrim_the_Blighted @2922,9916,0 w1 hp110 [barrows_ahrim] "ahrim"
L330 2025 Ahrim_the_Blighted @2922,9915,0 w1 hp110 [barrows_ahrim] "ahrim"
L331 2025 Ahrim_the_Blighted @2922,9914,0 w1 hp110 [barrows_ahrim] "ahrim"
L332 2025 Ahrim_the_Blighted @3566,3278,0 w1 hp110 [barrows_ahrim] "ahrim"
L333 2025 Ahrim_the_Blighted @3568,3276,0 w1 hp110 [barrows_ahrim] "ahrim"
L334 2025 Ahrim_the_Blighted @3566,3274,0 w1 hp110 [barrows_ahrim] "ahrim"
L335 2025 Ahrim_the_Blighted @3564,3276,0 w1 hp110 [barrows_ahrim] "ahrim"
L336 2030 Verac_the_Defiled @3105,983,0 w1 hp150 [barrows_verac] "verac"
L337 2030 Verac_the_Defiled @3107,9836,0 w1 hp150 [barrows_verac] "verac"
L338 2030 Verac_the_Defiled @3106,9834,0 w1 hp150 [barrows_verac] "verac"
L339 2030 Verac_the_Defiled @2924,9916,0 w1 hp150 [barrows_verac] "verac"
L340 2030 Verac_the_Defiled @2924,9915,0 w1 hp150 [barrows_verac] "verac"
L341 2030 Verac_the_Defiled @2924,9914,0 w1 hp150 [barrows_verac] "verac"
L342 2030 Verac_the_Defiled @3552,3283,0 w1 hp150 [barrows_verac] "verac"
L343 2030 Verac_the_Defiled @3554,3285,0 w1 hp150 [barrows_verac] "verac"
L344 2030 Verac_the_Defiled @3556,3283,0 w1 hp150 [barrows_verac] "verac"
L345 2030 Verac_the_Defiled @3554,3281,0 w1 hp150 [barrows_verac] "verac"
L346 89 Unicorn @3051,3437,0 w1 hp100 [unicorn] "unicorn"
L347 213 Merlin @2890,3544,0 w1 hp3000 [merlin2] "Some Dude"
L348 391 River_troll @2890,3547,0 w1 hp100 [macro_rivertrollguardian_1] "Troll"
L349 912 Battle_mage @3574,3306,0 w1 hp200 [zamorak_mage] "Battlemage"
L350 913 Battle_mage @3575,3305,0 w1 hp200 [saradomin_mage] "battlemage"
L351 914 Battle_mage @3573,3307,0 w1 hp200 [guthix_mage] "battlemage"
L352 912 Battle_mage @3571,3307,0 w1 hp200 [zamorak_mage] "battlemage"
L353 913 Battle_mage @3572,3304,0 w1 hp200 [saradomin_mage] "battlemage"
L354 41 Chicken @3423,3538,0 w1 hp3 [chicken] "chicken"
L355 41 Chicken @3420,3539,0 w1 hp3 [chicken] "chicken"
L356 41 Chicken @3419,3536,0 w1 hp3 [chicken] "chicken"
L357 90 Skeleton @3411,3548,0 w1 hp100 [skeleton_unagressive] "skeleton"
L358 90 Skeleton @3412,3546,0 w1 hp100 [skeleton_unagressive] "skeleton"
L359 90 Skeleton @3410,3549,0 w1 hp100 [skeleton_unagressive] "skeleton"
L360 1648 Crawling_Hand @3419,3544,0 w1 hp150 [slayer_crawling_hand_1] "hand"
L361 1648 Crawling_Hand @3421,3543,0 w1 hp150 [slayer_crawling_hand_1] "hand"
L362 1648 Crawling_Hand @3417,3546,0 w1 hp150 [slayer_crawling_hand_1] "hand"
L363 1832 Cave_Bug @3418,3557,0 w1 hp200 [swamp_cave_bug] "cavebug"
L364 1832 Cave_Bug @3417,3560,0 w1 hp200 [swamp_cave_bug] "cavebug"
L365 1832 Cave_Bug @3415,3557,0 w1 hp200 [swamp_cave_bug] "cavebug"
L366 1637 Jelly @3415,3573,0 w1 hp300 [slayer_jelly_1] "jellie"
L367 1637 Jelly @3418,3572,0 w1 hp300 [slayer_jelly_1] "jellie"
L368 1637 Jelly @3413,3575,0 w1 hp300 [slayer_jelly_1] "jellie"
L369 1604 Aberrant_specter @3434,3572,0 w1 hp220 [slayer_abberant_spectre_1] "spector"
L370 1615 Abyssal_demon @3438,3561,0 w1 hp250 [slayer_abyssal] "abbysald"
L371 2783 Dark_Beast @3439,3537,0 w1 hp350 [mourning_dark_beast] "beast"
L372 3117 ? @3431,3538,0 w1 hp3000 [macro_sandwich_lady_npc] "sandwichlady"
L373 1021 Air_elemental @2844,4830,0 w1 hp400 [elemental_air] "Air elemental"
L374 1021 Air_elemental @2848,4834,0 w1 hp400 [elemental_air] "Air elemental"
L375 1021 Air_elemental @2840,4834,0 w1 hp400 [elemental_air] "Air elemental"
L376 1021 Air_elemental @2844,4838,0 w1 hp400 [elemental_air] "Air elemental"
L377 1020 Earth_elemental @2658,4837,0 w1 hp400 [elemental_earth] "Earth elemental"
L378 1020 Earth_elemental @2662,4841,0 w1 hp400 [elemental_earth] "Earth elemental"
L379 1020 Earth_elemental @2658,4845,0 w1 hp400 [elemental_earth] "Earth elemental"
L380 1020 Earth_elemental @2654,4841,0 w1 hp400 [elemental_earth] "Earth elemental"
L381 1022 Water_elemental @2716,4832,0 w1 hp400 [elemental_water] "Water elemental"
L382 1022 Water_elemental @2712,4836,0 w1 hp400 [elemental_water] "Water elemental"
L383 1022 Water_elemental @2716,4840,0 w1 hp400 [elemental_water] "Water elemental"
L384 1022 Water_elemental @2720,4836,0 w1 hp400 [elemental_water] "Water elemental"
L385 1019 Fire_elemental @2585,4834,0 w1 hp400 [elemental_fire] "Fire elemental"
L386 1019 Fire_elemental @2581,4838,0 w1 hp400 [elemental_fire] "Fire elemental"
L387 1019 Fire_elemental @2585,4842,0 w1 hp400 [elemental_fire] "Fire elemental"
L388 1019 Fire_elemental @2589,4838,0 w1 hp400 [elemental_fire] "Fire elemental"
L389 3200 Chaos_Elemental @2464,4821,0 w1 hp800 [chaoselemental] "Chaos elemental"
L391 2743 ? @2391,5162,0 w2 box=x2391-2391,y5162-5162 WANDERS hp3000 [tzhaar_fightcave_swarm_5a] "Ket-Zek"
L392 2743 ? @2405,5162,0 w2 box=x2405-2405,y5162-5162 WANDERS hp3000 [tzhaar_fightcave_swarm_5a] "Ket-Zek"
L393 2743 ? @2414,5155,0 w2 box=x2414-2414,y5155-5155 WANDERS hp3000 [tzhaar_fightcave_swarm_5a] "Ket-Zek"
L394 2743 ? @2382,5151,0 w2 box=x2382-2382,y5151-5151 WANDERS hp3000 [tzhaar_fightcave_swarm_5a] "Ket-Zek"
L395 2743 ? @2386,5135,0 w2 box=x2386-2386,y5135-5135 WANDERS hp3000 [tzhaar_fightcave_swarm_5a] "Ket-Zek"
L396 2743 ? @2399,5135,0 w2 box=x2399-2399,y5135-5135 WANDERS hp3000 [tzhaar_fightcave_swarm_5a] "Ket-Zek"
L397 2743 ? @2410,5132,0 w2 box=x2410-2410,y5132-5132 WANDERS hp3000 [tzhaar_fightcave_swarm_5a] "Ket-Zek"
L398 2741 ? @2398,5155,0 w2 box=x2398-2398,y5155-5155 WANDERS hp3000 [tzhaar_fightcave_swarm_4a] "Yt-Mejkot"
L399 2741 ? @2387,5161,0 w2 box=x2387-2387,y5161-5161 WANDERS hp3000 [tzhaar_fightcave_swarm_4a] "Yt-Mejkot"
L400 2741 ? @2409,5160,0 w2 box=x2409-2409,y5160-5160 WANDERS hp3000 [tzhaar_fightcave_swarm_4a] "Yt-Mejkot"
L401 2741 ? @2414,5142,0 w2 box=x2414-2414,y5142-5142 WANDERS hp3000 [tzhaar_fightcave_swarm_4a] "Yt-Mejkot"
L402 2741 ? @2386,5142,0 w2 box=x2386-2386,y5142-5142 WANDERS hp3000 [tzhaar_fightcave_swarm_4a] "Yt-Mejkot"
L403 2741 ? @2406,5134,0 w2 box=x2406-2406,y5134-5134 WANDERS hp3000 [tzhaar_fightcave_swarm_4a] "Yt-Mejkot"
L404 2741 ? @2384,5135,0 w2 box=x2384-2384,y5135-5135 WANDERS hp3000 [tzhaar_fightcave_swarm_4a] "Yt-Mejkot"
L405 2746 ? @2404,5151,0 w2 box=x2404-2404,y5151-5151 WANDERS hp3000 [tzhaar_fightcave_swarm_boss_cleric] "Yt-HurKot"
L406 2746 ? @2393,5151,0 w2 box=x2393-2393,y5151-5151 WANDERS hp3000 [tzhaar_fightcave_swarm_boss_cleric] "Yt-HurKot"
L407 2746 ? @2392,5143,0 w2 box=x2392-2392,y5143-5143 WANDERS hp3000 [tzhaar_fightcave_swarm_boss_cleric] "Yt-HurKot"
L408 2746 ? @2404,5141,0 w2 box=x2404-2404,y5141-5141 WANDERS hp3000 [tzhaar_fightcave_swarm_boss_cleric] "Yt-HurKot"
L409 2746 ? @2387,5132,0 w2 box=x2387-2387,y5132-5132 WANDERS hp3000 [tzhaar_fightcave_swarm_boss_cleric] "Yt-HurKot"
L410 2746 ? @2409,5131,0 w2 box=x2409-2409,y5131-5131 WANDERS hp3000 [tzhaar_fightcave_swarm_boss_cleric] "Yt-HurKot"
L411 2745 Tztok-Jad @3106,3933,0 w2 box=x3103-3109,y3930-3936 WANDERS hp700 [tzhaar_fightcave_swarm_boss] "Tok-Xil"
L412 2745 Tztok-Jad @3106,3933,0 w2 box=x3103-3109,y3930-3936 WANDERS hp700 [tzhaar_fightcave_swarm_boss] "Tok-Xil"
L413 2591 TzHaar-Mej @2450,5146,0 w2 box=x2447-2453,y5143-5149 WANDERS hp100 [tzhaar_mej1] "TzHaar-Mej"
L414 2592 TzHaar-Mej @2455,5141,0 w2 box=x2452-2458,y5138-5144 WANDERS hp100 [tzhaar_mej2] "TzHaar-Mej"
L415 2605 TzHaar-Xil @2461,5141,0 w2 box=x2458-2464,y5138-5144 WANDERS hp110 [tzhaar_xil2] "TzHaar-Xil"
L416 2612 TzHaar-Ket @2470,5144,0 w2 box=x2467-2473,y5141-5147 WANDERS hp110 [tzhaar_ket3] "TzHaar-Ket"
L417 2616 TzHaar-Ket @2483,5157,0 w2 box=x2480-2486,y5154-5160 WANDERS hp110 [tzhaar_ket7] "TzHaar-Ket"
L418 2607 TzHaar-Xil @2476,5152,0 w2 box=x2473-2479,y5149-5155 WANDERS hp110 [tzhaar_xil4] "TzHaar-Xil"
L419 2591 TzHaar-Mej @2478,5166,0 w2 box=x2475-2481,y5163-5169 WANDERS hp100 [tzhaar_mej1] "TzHaar-Mej"
L420 2599 TzHaar-Hur @2468,5166,0 w2 box=x2465-2471,y5163-5169 WANDERS hp90 [tzhaar_hur2] "TzHaar-Hur"
L421 2599 TzHaar-Hur @2463,5163,0 w2 box=x2460-2466,y5160-5166 WANDERS hp90 [tzhaar_hur2] "TzHaar-Hur"
L422 2600 TzHaar-Hur @2457,5160,0 w2 box=x2454-2460,y5157-5163 WANDERS hp90 [tzhaar_hur3] "TzHaar-Hur"
L423 2605 TzHaar-Xil @2454,5152,0 w2 box=x2451-2457,y5149-5155 WANDERS hp110 [tzhaar_xil2] "TzHaar-Xil"
L424 2591 TzHaar-Mej @2451,5166,0 w2 box=x2448-2454,y5163-5169 WANDERS hp100 [tzhaar_mej1] "TzHaar-Mej"
L425 2615 TzHaar-Ket @2443,5170,0 w2 box=x2440-2446,y5167-5173 WANDERS hp110 [tzhaar_ket6] "TzHaar-Ket"
L426 2617 TzHaar-Mej-Jal @2400,5179,0 w2 box=x2397-2403,y5176-5182 WANDERS hp110 [tzhaar_fightcave_master] "TzHaar-Mej-Jal"
L427 2613 TzHaar-Ket @2441,5134,0 w2 box=x2438-2444,y5131-5137 WANDERS hp110 [tzhaar_ket4] "TzHaar-Ket"
L428 2613 TzHaar-Ket @2438,5129,0 w2 box=x2435-2441,y5126-5132 WANDERS hp110 [tzhaar_ket4] "TzHaar-Ket"
L429 2620 TzHaar-Hur-Tel @2464,5149,0 w2 box=x2461-2467,y5146-5152 WANDERS hp110 [tzhaar_merchant_equipment] "TzHaar-Hur-Tel"
L430 2621 TzHaar-Hur-Koz @2477,5147,0 w2 box=x2474-2480,y5144-5150 WANDERS hp110 [npc_2621] "TzHaar-Hur-Koz"
L431 2622 TzHaar-Hur-Lek @2461,5125,0 w2 box=x2458-2464,y5122-5128 WANDERS hp110 [tzhaar_merchant_oreandgem] "TzHaar-Hur-Lek"
L432 2611 TzHaar-Ket @2455,5123,0 w2 box=x2452-2458,y5120-5126 WANDERS hp110 [tzhaar_ket2] "TzHaar-Ket"
L433 2616 TzHaar-Ket @2457,5137,0 w2 box=x2454-2460,y5134-5140 WANDERS hp110 [tzhaar_ket7] "TzHaar-Ket"
L434 2616 TzHaar-Ket @2490,5159,0 w2 box=x2487-2493,y5156-5162 WANDERS hp110 [tzhaar_ket7] "TzHaar-Ket"
L435 2616 TzHaar-Ket @2489,5156,0 w2 box=x2486-2492,y5153-5159 WANDERS hp110 [tzhaar_ket7] "TzHaar-Ket"
L436 2616 TzHaar-Ket @2490,5174,0 w2 box=x2487-2493,y5171-5177 WANDERS hp110 [tzhaar_ket7] "TzHaar-Ket"
L437 2616 TzHaar-Ket @2488,5171,0 w2 box=x2485-2491,y5168-5174 WANDERS hp110 [tzhaar_ket7] "TzHaar-Ket"
L438 2745 Tztok-Jad @3106,3933,0 w2 box=x3103-3109,y3930-3936 WANDERS hp700 [tzhaar_fightcave_swarm_boss] "Tok-Xil"
L439 2591 TzHaar-Mej @2450,5146,0 w2 box=x2447-2453,y5143-5149 WANDERS hp100 [tzhaar_mej1] "TzHaar-Mej"
L440 2592 TzHaar-Mej @2455,5141,0 w2 box=x2452-2458,y5138-5144 WANDERS hp100 [tzhaar_mej2] "TzHaar-Mej"
L441 2605 TzHaar-Xil @2461,5141,0 w2 box=x2458-2464,y5138-5144 WANDERS hp110 [tzhaar_xil2] "TzHaar-Xil"
L442 2612 TzHaar-Ket @2470,5144,0 w2 box=x2467-2473,y5141-5147 WANDERS hp110 [tzhaar_ket3] "TzHaar-Ket"
L443 2616 TzHaar-Ket @2483,5157,0 w2 box=x2480-2486,y5154-5160 WANDERS hp110 [tzhaar_ket7] "TzHaar-Ket"
L444 2607 TzHaar-Xil @2476,5152,0 w2 box=x2473-2479,y5149-5155 WANDERS hp110 [tzhaar_xil4] "TzHaar-Xil"
L445 2591 TzHaar-Mej @2478,5166,0 w2 box=x2475-2481,y5163-5169 WANDERS hp100 [tzhaar_mej1] "TzHaar-Mej"
L446 2599 TzHaar-Hur @2468,5166,0 w2 box=x2465-2471,y5163-5169 WANDERS hp90 [tzhaar_hur2] "TzHaar-Hur"
L447 2599 TzHaar-Hur @2463,5163,0 w2 box=x2460-2466,y5160-5166 WANDERS hp90 [tzhaar_hur2] "TzHaar-Hur"
L448 2600 TzHaar-Hur @2457,5160,0 w2 box=x2454-2460,y5157-5163 WANDERS hp90 [tzhaar_hur3] "TzHaar-Hur"
L449 2605 TzHaar-Xil @2454,5152,0 w2 box=x2451-2457,y5149-5155 WANDERS hp110 [tzhaar_xil2] "TzHaar-Xil"
L450 2591 TzHaar-Mej @2451,5166,0 w2 box=x2448-2454,y5163-5169 WANDERS hp100 [tzhaar_mej1] "TzHaar-Mej"
L451 2615 TzHaar-Ket @2443,5170,0 w2 box=x2440-2446,y5167-5173 WANDERS hp110 [tzhaar_ket6] "TzHaar-Ket"
L452 2617 TzHaar-Mej-Jal @2400,5179,0 w2 box=x2397-2403,y5176-5182 WANDERS hp110 [tzhaar_fightcave_master] "TzHaar-Mej-Jal"
L453 2613 TzHaar-Ket @2441,5134,0 w2 box=x2438-2444,y5131-5137 WANDERS hp110 [tzhaar_ket4] "TzHaar-Ket"
L454 2613 TzHaar-Ket @2438,5129,0 w2 box=x2435-2441,y5126-5132 WANDERS hp110 [tzhaar_ket4] "TzHaar-Ket"
L455 2620 TzHaar-Hur-Tel @2464,5149,0 w2 box=x2461-2467,y5146-5152 WANDERS hp110 [tzhaar_merchant_equipment] "TzHaar-Hur-Tel"
L456 2621 TzHaar-Hur-Koz @2477,5147,0 w2 box=x2474-2480,y5144-5150 WANDERS hp110 [npc_2621] "TzHaar-Hur-Koz"
L457 2622 TzHaar-Hur-Lek @2461,5125,0 w2 box=x2458-2464,y5122-5128 WANDERS hp110 [tzhaar_merchant_oreandgem] "TzHaar-Hur-Lek"
L458 2611 TzHaar-Ket @2455,5123,0 w2 box=x2452-2458,y5120-5126 WANDERS hp110 [tzhaar_ket2] "TzHaar-Ket"
L459 2616 TzHaar-Ket @2457,5137,0 w2 box=x2454-2460,y5134-5140 WANDERS hp110 [tzhaar_ket7] "TzHaar-Ket"
L460 2616 TzHaar-Ket @2490,5159,0 w2 box=x2487-2493,y5156-5162 WANDERS hp110 [tzhaar_ket7] "TzHaar-Ket"
L461 2616 TzHaar-Ket @2489,5156,0 w2 box=x2486-2492,y5153-5159 WANDERS hp110 [tzhaar_ket7] "TzHaar-Ket"
L462 2616 TzHaar-Ket @2490,5174,0 w2 box=x2487-2493,y5171-5177 WANDERS hp110 [tzhaar_ket7] "TzHaar-Ket"
L463 2616 TzHaar-Ket @2488,5171,0 w2 box=x2485-2491,y5168-5174 WANDERS hp110 [tzhaar_ket7] "TzHaar-Ket"
L470 17 Barbarian_woman @2512,3887,0 w1 hp80 [barbarian_woman] "barbarian"
L471 17 Barbarian_woman @2518,3888,0 w1 hp80 [barbarian_woman] "barbarian"
L472 17 Barbarian_woman @2517,3885,0 w1 hp80 [barbarian_woman] "barbarian"
L473 17 Barbarian_woman @2504,3881,0 w1 hp80 [barbarian_woman] "barbarian"
L474 1591 Iron_dragon @2853,9835,0 w1 box=x3320-3321,y3193-3194 hp390 [iron_dragon] "Iron Drag"
L475 1590 Bronze_dragon @2857,9835,0 w1 box=x3320-3321,y3193-3194 hp380 [bronze_dragon] "Bronze Drag"
L476 1591 Iron_dragon @2856,9839,0 w1 box=x3320-3321,y3193-3194 hp390 [iron_dragon] "Iron Drag"
L477 1590 Bronze_dragon @2861,9842,0 w1 box=x3320-3321,y3193-3194 hp380 [bronze_dragon] "Bronze Drag"
L478 1591 Iron_dragon @2857,9848,0 w1 box=x3320-3321,y3193-3194 hp390 [iron_dragon] "Iron Drag"
L479 1590 Bronze_dragon @2863,9851,0 w1 box=x3320-3321,y3193-3194 hp380 [bronze_dragon] "Bronze Drag"
L480 1591 Iron_dragon @2865,9846,0 w1 box=x3320-3321,y3193-3194 hp390 [iron_dragon] "Iron Drag"
L481 1590 Bronze_dragon @2869,9839,0 w1 box=x3320-3321,y3193-3194 hp380 [bronze_dragon] "Bronze Drag"
L482 1591 Iron_dragon @2865,9846,0 w1 box=x3320-3321,y3193-3194 hp390 [iron_dragon] "Iron Drag"
L483 1590 Bronze_dragon @2869,9829,0 w1 box=x3320-3321,y3193-3194 hp380 [bronze_dragon] "Bronze Drag"
L484 1592 Steel_dragon @2852,9850,0 w1 box=x3320-3321,y3193-3194 hp400 [steel_dragon] "Bronze Drag"
L485 681 Weapon_poison_salesman @2682,3717,0 w1 hp3000 [ranging_guild_poison_salesman] "Bandit Shop Keeper"
L488 1265 Rock_Crab @2681,3720,0 w1 box=x2609-2608,y3845-3845 hp5000 [horror_rockcrab] "Rock Crab"
L489 1265 Rock_Crab @2685,3722,0 w1 box=x2612-2611,y3846-3846 hp5000 [horror_rockcrab] "Rock Crab"
L490 1265 Rock_Crab @2683,3724,0 w1 box=x2615-2614,y3845-3845 hp5000 [horror_rockcrab] "Rock Crab"
L491 1265 Rock_Crab @2681,3722,0 w1 box=x2616-2614,y3845-3845 hp5000 [horror_rockcrab] "Rock Crab"
L492 1265 Rock_Crab @2685,3726,0 w1 box=x2614-2614,y3845-3845 hp5000 [horror_rockcrab] "Rock Crab"
L493 1265 Rock_Crab @2680,3727,0 w1 box=x2615-2614,y3845-3845 hp5000 [horror_rockcrab] "Rock Crab"
L494 1265 Rock_Crab @2678,3729,0 w1 box=x2615-2614,y3845-3845 hp5000 [horror_rockcrab] "Rock Crab"
L495 1265 Rock_Crab @2680,3731,0 w1 box=x2615-2614,y3845-3845 hp5000 [horror_rockcrab] "Rock Crab"
L496 1265 Rock_Crab @2675,3731,0 w1 box=x2615-2614,y3845-3845 hp5000 [horror_rockcrab] "Rock Crab"
L497 1265 Rock_Crab @2673,3728,0 w1 box=x2615-2614,y3845-3845 hp5000 [horror_rockcrab] "Rock Crab"
L498 1265 Rock_Crab @2672,3726,0 w1 box=x2615-2614,y3845-3845 hp5000 [horror_rockcrab] "Rock Crab"
L499 1265 Rock_Crab @2670,3726,0 w1 box=x2615-2614,y3845-3845 hp5000 [horror_rockcrab] "Rock Crab"
L500 1265 Rock_Crab @2670,3724,0 w1 box=x2615-2614,y3845-3845 hp5000 [horror_rockcrab] "Rock Crab"
L501 409 Genie @2855,3593,0 w1 box=x2615-2614,y3845-3845 hp3000 [macro_geni] "Allstar's Slave"
L502 409 Genie @2855,3590,0 w1 box=x2615-2614,y3845-3845 hp3000 [macro_geni] "Allstar's Slave"
L503 3200 Chaos_Elemental @2454,4833,0 w1 hp800 [chaoselemental] "Chaos elemental"
L504 3200 Chaos_Elemental @2473,4833,0 w1 hp800 [chaoselemental] "Chaos elemental"
L505 2253 Wise_Old_Man @2514,3861,0 w1 hp3000 [wise_old_man] "Wise old man"
```

## Appendix B — npc.cfg HP values that differ from LC 377 hitpoints (or LC has none)

"NPC max hit" = floor(HP/100) (min 1), used when the NPC has no per-type override in §2.4. "spawned" = appears in autospawn.cfg. LC HP '–' = the LC definition has no hitpoints yet (compare against RS data when porting). Rows with Allstar HP 0 are omitted (they spawn with 3000 HP).

| id name | Allstar HP | LC HP | NPC max hit | spawned |
|---|---|---|---|---|
| 17 Barbarian woman | 80 | 14 | 1 | Y |
| 18 Al-Kharid warrior | 38 | 19 | 1 | Y |
| 35 Soldier | 400 | 22 | 4 | Y |
| 49 Hellhound | 135 | 116 | 1 | Y |
| 50 King black dragon | 2600 | 240 | 26 | Y |
| 53 Red dragon | 150 | 140 | 1 | Y |
| 54 Black dragon | 175 | 190 | 1 |  |
| 55 Blue dragon | 125 | 105 | 1 | Y |
| 64 Ice spider | 100 | 65 | 1 |  |
| 75 Zombie | 40 | 30 | 1 |  |
| 77 Summoned Zombie | 50 | 22 | 1 |  |
| 82 Lesser demon | 80 | 79 | 1 | Y |
| 83 Greater demon | 100 | 87 | 1 | Y |
| 84 Black Demon | 2000 | 157 | 20 | Y |
| 89 Unicorn | 100 | 19 | 1 | Y |
| 90 Skeleton | 100 | 17 | 1 | Y |
| 92 Skeleton | 100 | 29 | 1 |  |
| 101 Goblin | 30 | 12 | 1 |  |
| 111 Ice giant | 2400 | 70 | 24 | Y |
| 113 Jogre | 700 | 60 | 7 | Y |
| 122 Hobgoblin | 40 | 29 | 1 |  |
| 123 Hobgoblin | 78 | 49 | 1 |  |
| 124 Earth warrior | 91 | 54 | 1 |  |
| 125 Ice warrior | 60 | 59 | 1 |  |
| 132 Monkey | 40 | 6 | 1 |  |
| 142 Wolf | 75 | 34 | 1 |  |
| 189 Monk of Zamorak | 20 | 10 | 1 |  |
| 190 Monk of Zamorak | 20 | 40 | 1 |  |
| 209 Nulodion | 2000 | – | 20 | Y |
| 274 Guardian of Armadyl | 400 | 50 | 4 | Y |
| 275 Guardian of Armadyl | 1000 | 40 | 10 | Y |
| 391 River troll | 100 | 25 | 1 | Y |
| 477 Khazard warlord | 1400 | 170 | 14 | Y |
| 509 Nazastarool | 800 | 80 | 8 | Y |
| 535 Fairy shop assistant | 2000 | – | 20 |  |
| 551 Shop keeper | 2000 | – | 20 | Y |
| 553 Aubury | 2000 | – | 20 | Y |
| 555 Shop keeper | 2000 | – | 20 | Y |
| 749 Ghost | 90 | 25 | 1 |  |
| 752 Lesser demon | 520 | 79 | 5 | Y |
| 795 Ice Queen | 300 | 104 | 3 | Y |
| 912 Battle mage | 200 | 120 | 2 | Y |
| 913 Battle mage | 200 | 120 | 2 | Y |
| 914 Battle mage | 200 | 120 | 2 | Y |
| 941 Green dragon | 100 | 75 | 1 | Y |
| 1007 Zamorak Wizard | 400 | 76 | 4 |  |
| 1019 Fire elemental | 400 | 30 | 4 | Y |
| 1020 Earth elemental | 400 | 35 | 4 | Y |
| 1021 Air elemental | 400 | 30 | 4 | Y |
| 1022 Water elemental | 400 | 30 | 4 | Y |
| 1023 Earth elemental | 400 | 35 | 4 |  |
| 1158 Kalphite Queen | 800 | 255 | 8 | Y |
| 1159 Kalphite Queen | 1100 | – | 11 |  |
| 1160 Kalphite Queen | 1100 | 255 | 11 |  |
| 1172 The Shaikahan | 260 | – | 2 |  |
| 1241 Loar Shade | 150 | – | 1 |  |
| 1246 Riyl Shade | 240 | – | 2 |  |
| 1264 Saradomin Wizard | 400 | – | 4 |  |
| 1265 Rock Crab | 5000 | – | 50 | Y |
| 1266 Rocks | 50 | – | 1 |  |
| 1267 Rock Crab | 50 | – | 1 |  |
| 1268 Rocks | 50 | – | 1 |  |
| 1455 Monkey Guard | 117 | – | 1 |  |
| 1457 Monkey Archer | 90 | – | 1 |  |
| 1458 Monkey Archer | 90 | – | 1 |  |
| 1459 Monkey Guard | 150 | – | 1 |  |
| 1460 Monkey Guard | 150 | – | 1 |  |
| 1463 Monkey | 30 | – | 1 |  |
| 1465 Monkey Zombie | 90 | – | 1 |  |
| 1466 Monkey Zombie | 90 | – | 1 |  |
| 1467 Monkey Zombie | 90 | – | 1 |  |
| 1552 Santa | 2000 | – | 20 |  |
| 1575 Skeleton Hellhound | 2000 | – | 20 | Y |
| 1589 Baby red dragon | 200 | – | 2 |  |
| 1590 Bronze dragon | 380 | 122 | 3 | Y |
| 1591 Iron dragon | 390 | 165 | 3 | Y |
| 1592 Steel dragon | 400 | – | 4 | Y |
| 1604 Aberrant specter | 220 | 90 | 2 | Y |
| 1605 Aberrant specter | 220 | 90 | 2 |  |
| 1615 Abyssal demon | 250 | 150 | 2 | Y |
| 1625 Smokedevil | 170 | – | 1 |  |
| 1637 Jelly | 300 | 75 | 3 | Y |
| 1645 Infernal Mage | 450 | 60 | 4 |  |
| 1646 Infernal Mage | 250 | 60 | 2 |  |
| 1648 Crawling Hand | 150 | 16 | 1 | Y |
| 1655 Crawling Hand | 60 | 18 | 1 |  |
| 1677 Experiment | 100 | – | 1 |  |
| 1678 Experiment | 100 | – | 1 |  |
| 1693 Giant Lobster | 140 | – | 1 |  |
| 1766 Cow calf | 6 | – | 1 |  |
| 1768 Cow calf | 6 | – | 1 |  |
| 1832 Cave Bug | 200 | 6 | 2 | Y |
| 1852 Arzinian Avatar of Strength | 60 | – | 1 | Y |
| 1855 Arzinian Avatar of Ranging | 60 | – | 1 | Y |
| 1858 Arzinian Avatar of Magic | 60 | – | 1 | Y |
| 1859 Arzinian Being of Bordanzan | 2500 | – | 25 | Y |
| 1919 Stranger | 1700 | – | 17 | Y |
| 2025 Ahrim the Blighted | 110 | – | 1 | Y |
| 2026 Dharok the Wretched | 150 | – | 1 | Y |
| 2027 Guthan the Infested | 150 | – | 1 | Y |
| 2028 Karil the Tainted | 150 | – | 1 | Y |
| 2029 Torag the Corrupted | 150 | – | 1 | Y |
| 2030 Verac the Defiled | 150 | 100 | 1 | Y |
| 2031 Bloodworm | 50 | – | 1 |  |
| 2035 Giant crypt spider | 140 | – | 1 |  |
| 2167 Customer | 2000 | – | 20 | Y |
| 2168 Customer | 2000 | – | 20 | Y |
| 2256 Paladin | 65 | – | 1 | Y |
| 2262 Dark mage | 2000 | – | 20 | Y |
| 2301 Monkey | 2000 | – | 20 |  |
| 2591 TzHaar-Mej | 100 | – | 1 | Y |
| 2592 TzHaar-Mej | 100 | – | 1 | Y |
| 2593 TzHaar-Mej | 100 | – | 1 |  |
| 2594 TzHaar-Mej | 100 | – | 1 |  |
| 2595 TzHaar-Mej | 100 | – | 1 |  |
| 2596 TzHaar-Mej | 100 | – | 1 |  |
| 2597 TzHaar-Mej | 100 | – | 1 |  |
| 2598 TzHaar-Hur | 90 | – | 1 |  |
| 2599 TzHaar-Hur | 90 | – | 1 | Y |
| 2600 TzHaar-Hur | 90 | – | 1 | Y |
| 2601 TzHaar-Hur | 90 | – | 1 |  |
| 2602 TzHaar-Hur | 90 | – | 1 |  |
| 2603 TzHaar-Hur | 90 | – | 1 |  |
| 2604 TzHaar-Xil | 110 | 120 | 1 |  |
| 2605 TzHaar-Xil | 110 | 120 | 1 | Y |
| 2606 TzHaar-Xil | 110 | 120 | 1 |  |
| 2607 TzHaar-Xil | 110 | 120 | 1 | Y |
| 2608 TzHaar-Xil | 110 | 120 | 1 |  |
| 2609 TzHaar-Xil | 110 | 120 | 1 |  |
| 2610 TzHaar-Ket | 110 | 140 | 1 |  |
| 2611 TzHaar-Ket | 110 | 140 | 1 | Y |
| 2612 TzHaar-Ket | 110 | 140 | 1 | Y |
| 2613 TzHaar-Ket | 110 | 140 | 1 | Y |
| 2614 TzHaar-Ket | 110 | 140 | 1 |  |
| 2615 TzHaar-Ket | 110 | 140 | 1 | Y |
| 2616 TzHaar-Ket | 110 | 140 | 1 | Y |
| 2617 TzHaar-Mej-Jal | 110 | – | 1 | Y |
| 2618 TzHaar-Mej-Kah | 110 | – | 1 |  |
| 2619 TzHaar-Ket-Zuh | 110 | – | 1 |  |
| 2620 TzHaar-Hur-Tel | 110 | – | 1 | Y |
| 2621 TzHaar-Hur-Koz | 110 | – | 1 | Y |
| 2622 TzHaar-Hur-Lek | 110 | – | 1 | Y |
| 2623 TzHaar-Mej-Roh | 100 | – | 1 |  |
| 2624 TzHaar-Ket | 100 | – | 1 |  |
| 2625 TzHaar-Ket | 100 | – | 1 |  |
| 2627 Tz-Kih | 20 | – | 1 |  |
| 2628 Tz-Kih | 20 | – | 1 |  |
| 2629 Tz-Kek | 60 | – | 1 |  |
| 2630 Tz-Kek | 60 | – | 1 |  |
| 2631 Tok-Xil | 100 | – | 1 |  |
| 2632 Tok-Xil | 100 | – | 1 |  |
| 2740 Tok-Xil | 100 | – | 1 |  |
| 2745 Tztok-Jad | 700 | – | 7 | Y |
| 2783 Dark Beast | 350 | – | 3 | Y |
| 2803 Lizard | 180 | 40 | 1 |  |
| 2880 Dagannoth Fledgeling | 185 | – | 1 |  |
| 2881 Dagannoth Supreme | 2000 | – | 20 | Y |
| 2882 Dagannoth Prime | 2000 | – | 20 | Y |
| 2883 Dagannoth Rex | 2000 | – | 20 | Y |
| 2885 Giant Rock Crab | 220 | – | 2 |  |
| 2892 Spinolyp | 200 | – | 2 |  |
| 2919 Agrith Naar | 3000 | – | 30 | Y |
| 3070 Skeletal Wyvern | 380 | – | 3 |  |
| 3200 Chaos Elemental | 800 | – | 8 | Y |
| 3340 Giant Mole | 550 | – | 5 |  |
| 3494 Flambeed | 1300 | – | 13 | Y |
| 3499 Gelatinnoth Mother | 1000 | – | 10 |  |
| 3500 Gelatinnoth Mother | 260 | – | 2 |  |
