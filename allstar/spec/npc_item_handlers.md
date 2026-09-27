# Allstar-Scape v2: NPC and item interaction handlers (`client.java` `parseIncomingPackets`, 18149–24440)

**Legend.** Each item carries a class tag:
- **[C]** CUSTOM: specific to Allstar.
- **[A]** AUTHENTIC-looking: a re-implementation of RuneScape content. It is still recorded exactly here, and the ways it differs from real RuneScape are noted.
- **[J]** JUNK: debug code, broken code or an exploit.

The scope change means every behaviour is recorded 1:1, bugs included. Bugs are flagged **BUG**.

Other conventions:
- "cyc" means one server cycle.
- `Lnnnn` is a line in `client.java` unless another file is named.
- Item and NPC names come from `item.cfg` and `npc.cfg` in the root folder.
- Dialogue text belongs to the dialogue agent. This report records the dialogue id that starts, plus the effects: teleports, shops, rewards and state changes.

---
## 0. Engine facts these handlers rely on

**Tick and packet order**
- **The cycle is 500 ms** (`server.cycleTime`, server.java:16).
- In each cycle, each player runs `process()` first. That covers timers, pending-action range checks and skill ticks. Then **all** of that player's queued packets are parsed (PlayerHandler.java:149-156).
- A pending NPC action therefore resolves at the earliest in the `process()` of the next cycle.
- **Any exception thrown while a packet is parsed disconnects the player** (L18056-18059). Several handlers below can throw a null-pointer exception (NPE) and disconnect the player this way.

**Range helpers**
- `GoodDistance(a,b,d)` means Chebyshev distance ≤ d, a square around the target.
- `GoodDistance2(a,b,d)` means the player is on the same row or the same column, within d tiles (a plus-shaped area).
- Neither helper checks height.

**Pending NPC actions.** An NPC click sets one of these flags, and `process()` consumes it (L17737-17753, 17955-17974). Walking does **not** cancel them. The next click overwrites them.
- `WanneShop=N` calls `openUpShop(N)` once the player is within Chebyshev 1 of the tile where the NPC stood *at click time* (`skillX/Y`).
- `WanneBank=r` calls `openUpBank()` once the player is within Chebyshev r.
- `NpcWanneTalk=D` sets `NpcDialogue=D`, and sets `NpcTalkTo` to the NPC standing on skillX/Y, once `GoodDistance2` ≤ 2. `UpdateNPCChat()` (L32265) then renders the dialogue.

Everything else in the NPC handlers runs **immediately, with no distance check**. That covers teleports, fishing spots 233–236, pickpocketing, the starter and the gnome and TzHaar bankers.

**What walking resets.** Packets 98, 164 and 248 reset `NpcDialogue`, close the shop (`MyShopID=0`) and the bank, decline any trade, and set `attacknpc=-1`. They also restore the weapon slot for mining, smelting, fishing, smithing and firemaking.

**Timers.** `actionTimer` drops by 1 each cycle (L17028). `healTimer` does too, but nothing ever sets it.

**XP (`addSkillXP(xp, skill)`, L14014).** XP is added raw, with no rate multiplier. **The level curve is custom:** `getLevelForXP` (L13999) uses `lvl + 150·2^(lvl/7)`, where real RuneScape uses 300. Each level therefore needs about half the RuneScape XP:

| Level | XP needed |
|---|---|
| 2 | 42 |
| 10 | 583 |
| 20 | 2,258 |
| 30 | 6,735 |
| 40 | 18,708 |
| 50 | 50,817 |
| 60 | 137,089 |
| 70 | 369,112 |
| 80 | 993,425 |
| 90 | 2,673,662 |
| 99 | 6,517,817 |

Wherever this report says "base level", it means the level on this curve.

**Inventory helpers**
- `addItem(id,n)` (L14850):
  - For a non-stackable item, n is forced to 1.
  - It needs a free slot unless a stack of the same stackable item already exists.
  - If n < 1, it is treated as 1.
  - On failure it sends "Not enough space in your inventory." and **the item is lost**. Callers never check the result, so XP and other effects still apply.
  - Stacks are capped at 999,999,999.
- `deleteItem(id,slot,n)` (L14949) acts only if that slot holds `id`. If n ≥ the stack size, it clears the whole slot.

**RNG.** `misc.random(n)` returns 0..n inclusive. `random2(n)` returns 1..n. `random3(n)` returns 0..n−1.

**Names in messages.** `GetItemName` returns the first `item.cfg` entry for the id, with `_` turned into a space. An unknown id gives `!! NOT EXISTING ITEM !!! - ID:<id>`.

**Item property data.** The `data/*.dat` files are `stackable`, `notes` (0 means noted), `twohanded` and `sellable` (0 means sellable). They cover ids 0–6799 only. Ids ≥ 6800 are treated as non-stackable, un-noted, one-handed and **unsellable**. The exception is 164 custom ids that are forced sellable (Item.java 398-561).

---
## 1. NPC id → click options (op1 = packet 155 "first/Talk", op2 = packet 17 "second")

**How dispatch works**
- Both options call `faceNPC`, then run an **if / else-if chain on `npcType`**. The first match wins. Later duplicates are dead code and are listed in the note after the table.
- op1 also has independent `if` blocks:
  - NPC 1051 is checked before the chain.
  - NPCs 233–236 are checked after the chain (§2.2).
  - The clue/quest NPCs (1686, 903, 549, 278, 527, 220, 542, 2253, 548, 546) form an else-chain hanging off `if (id==233 && fishing<90)`.
- An NPC id missing from a column means that option does nothing; only an admin debug print happens.

**Other conventions in the table**
- "spawn" comes from `autospawn.cfg`, the **only** NPC spawn source (NPCHandler.java:24). "—" means never spawned, so the handler can only be reached with an admin-spawned NPC.
- Shop names are the `shops.cfg` names with colour codes stripped. Stock and prices are in Appendix A.
- "clue Lx/Sy/idz" means `cluelevel/cluestage/clueid` (§9).

| NPC | npc.cfg name | spawn (x,y,h "autospawn desc") | op1 (155) | op2 (17) | cls |
|---|---|---|---|---|---|
| 0 | Hans | 2735/2737/2738/2740,3468,0 "hans" | dialogue **1339** (§2.8) | — | C |
| 7 | Farmer | — | — | pickpocket, Thieving 70 (§2.4) | C |
| 18 | Al-Kharid warrior | 3291,3177; 3294,3177; 3295,3168; 3290,3168; 2509,3883; 2517,3881 | — | pickpocket, Thieving 25 | C |
| 33 | Door man | — | teleport → 2438,5169,0 | — | C |
| 37 | Sigbert the Adventurer | — | teleport → 3254,3436,0 | — | C |
| 57 | Fairy | 2851,3593 "hans" | teleport → 2438,5169,0 | — | C |
| 70 | Turael | — | teleport → 2413,5117,0 | — | C |
| 166 | Gnome banker | — | `openUpBank()` immediately | — | C |
| 209 | Nulodion | 2739,3474 "dragon shop" | shop **79** (undefined: blank title, no stock, buys anything, never restocks) | shop 40 "Dragon shop" | C |
| 220 | The Fisher King | — | clue L1/S4/id1 → dlg 31; else "The Fisher King isn't interested in talking right now..." | — | C |
| 233 | Fishing spot | 2560,3892; 2777,3169; 2838,3431; 2573,3860; 2572,3860 | instant Manta ray (Fishing 90) §2.2 | — | C |
| 234 | Fishing spot | 2571,3886; 2774,3169; 2843,3429; 2577,3854; 2576,3854 | instant Lobster (40) | — | C |
| 235 | Fishing spot | 2576,3882; 2576,3874; 2846,3429; 2580/2581/2582,3854 | instant Shrimps (1) | — | C |
| 236 | Fishing spot | 2564,3892; 2574,3884; 2852,3423; 2574,3855; 2574,3856 | instant Shark (75) | — | C |
| 278 | Cook | — | Cook's Assistant (q2) §2.9 | — | C |
| 300 | Sedridor | — | — | teleport 3088,3489, height unchanged, `Essence=1` §2.6 | J |
| 309 | Fishing spot | — | fly fishing §2.3 | bait fishing | A/J |
| 312 | Fishing spot | — | lobster pot | harpoon (tuna/swordfish) | A/J |
| 313 | Fishing spot | — | big-net table **but needs rod+bait (BUG)** | harpoon → shark | A/J |
| 316 | Fishing spot | — | small net | bait | A/J |
| 319 | Fishing spot | — | net → Frog spawn | bait → eels | A/J |
| 376 | Captain Tobias | — | dialogue **40** (free boat to Karamja) | — | A-ish |
| 380 | Customs officer | — | dialogue **42** (free boat to Port Sarim) | — | A-ish |
| 460 | Wizard Frumscone | — | shop 36 "sara stuff" | — | C |
| 461 | Magic Store owner | 2741,3464 "Rune Store" | — | shop 34 "Magic Shop" | C |
| 462 | Wizard Distentor | — | shop 35 "zammy stuff" | teleport 3088,3489, `Essence=3` | C/J |
| 494 | Banker | 2807/2809/2811,3443 Catherby E bank; 3096,3489; 3098,3492; 3096,3492 Edgeville | dialogue **1** (bank / PIN menu) | bank, `WanneBank=2` | A |
| 495 | Banker | 2810,3443; 3096,3491 | dialogue 1 | bank, `WanneBank=2` | A |
| 519 | Bob | — | — | shop 23 "Bob's Brilliant Axes." | A-data |
| 520 | Shop keeper | 2745,3468 "Member Shop" | — | shop 50 "Allstar's Shop!" | C |
| 521 | Shop assistant | 2738,3463 "Helm Shop" | — | shop 53 "God Shop" | C |
| 522 | Shop keeper | 2517,3861 "General Store" | — | shop 55 "General Store" | C |
| 524 | Shop keeper | — | — | shop 60 (undefined, empty, buys anything) | J |
| 525 | Shop assistant | — | — | shop 26 "Al-Kharid General Store" | A-data |
| 527 | Shop assistant | 2804,3432 Catherby; 3080,3509 Edgeville ("General Store Shop Keeper") | clue L1/S1/id4 → 31; else "The shop assistant isn't interested in talking right now..." | **nothing (no shop!)** | C |
| 528 | Shop keeper | 2732,3471 "Woodcutting Shop" | — | shop 57 "Helmet Shop" | C |
| 529 | Shop assistant | — | — | shop 63 (undefined) | J |
| 530 | Shop keeper | 2380,3432 "Fletching Shop" | — | shop 59 "Skills Shop" | C |
| 535 | Fairy shop assistant | — | — | shop 39 "Pure shop" | C |
| 538 | Peksa | 3422,3534 "Slayer Shop" | — | shop 64 "Slayer Shop" | C |
| 541 | Zeke | 2848,2965 | — | shop 24 "Zeke's Super Shop." | C |
| 542 | Louie legs | — | clue L1/S4/id2 → 31; L2/S1/id5 → 31; L2/S5/id2 → 32; else "The shop keeper isn't interested in talking right now..." | shop 27 | C |
| 544 | Ranael | — | — | shop 28 | A-data |
| 545 | Dommik | 3273,3192 "shop" | — | shop 25 "Domminick's Fletching  Store." | C |
| 546 | Zaff | — | clue L3/S3/id1 → 31; L3/S5/id5 → 32; else "Zaff isn't interested in talking right now..." | shop 7 "Skillz shop" | C |
| 548 | Thessalia | 2736,3461 "Noob Store" | clue L2/S4/id2 → 31; else "Thessalia isn't interested in talking right now..." | shop 56 "Boots & Gloves" | C |
| 549 | Horvik | 2377,3442 "smithing shop" | clue L1/S1/id1 → 31; else Invisible Armour (q1) §2.9 | shop 38 "Bar Shop" | C |
| 550 | Lowe | 3305,9373; 3246,3516; 2801,3175; 2823,3443 ("range shop") | dialogue **550** (leftover q1 line) | shop 49 "Allstar's Pk Shop" | C |
| 551 | Shop keeper | 3478,9484 "Kalphite Food Shop"; 2815,3184 "food shop" | — | shop 58 "Kalphite Food Shop" | C |
| 552 | Shop assistant | — | — | shop 9 "Varrock Swordshop." | A-data |
| 553 | Aubury | 2743,3470 "skillin shop" | clue L2/S2/id1 → 31; else dialogue **3** (→ shop 2) | shop 2 "Gold & Trimmed Armor" | C |
| 554 | Fancy dress shop owner | 2730,3468 "Gilded Store"; 3315,3165 | — | shop 48 "Rares Shop!" | C |
| 555 | Shop keeper | 2731,3464 "Skill Cape Shop"; 2801,3195 "Random St00f dude" | — | shop 61 "Skill Cape Shop" (both spawns) | C |
| 556 | Grum | — | — | shop 20 | A-data |
| 557 | Wydin | — | — | shop 32 "Robez 'n st00f" | C |
| 558 | Gerrant | 2744,3475 "Postilyte Shop" | — | shop 65 "3rd Age Shop" | C |
| 559 | Brian | — | — | shop 19 | A-data |
| 561 | Shop keeper | 2733,3464 "Hood Shop" | — | shop 62 "Hood Shop" | C |
| 577 | Cassie | — | — | shop 4 | A-data |
| 580 | Flynn | — | — | shop 5 | A-data |
| 581 | Wayne | — | — | shop 13 | A-data |
| 583 | Betty | — | — | shop 21 | A-data |
| 584 | Herquin | — | — | shop 12 | A-data |
| 585 | Rommik | 2949,3205 | — | shop 14 | A-data |
| 587 | Jatix | — | — | shop 46 "Herblore Shop" | C |
| 599 | Make-over mage | — | dialogue **14600** (makeover for 10,000 gp) | — | C |
| 652 | Wizard | — | shop 37 "guthix stuff" | — | C |
| 681 | Weapon poison salesman | 2682,3717 "Bandit Shop Keeper" | shop 66 "Brett's Relleka Shop" | — | C |
| 683 | Bow and Arrow salesman | 2736,3473 "Arrow E bow shop" | — | shop 11 "Range Shop" | C |
| 706 | Wizard Mizgog | — | Spells Of The Gods (q3) §2.9 | — | C |
| 844 | Wizard Cromperty | — | — | teleport 3088,3489, `Essence=2` | J |
| 903 | Lundail | — | clue L2/S1/id1 → 31; else "Lundail ain't in the mood to talk, but he will sell runes for a small price." | shop 29 (cfg line malformed ⇒ **no stock**) | C |
| 944 | Combat Instructor | 2800,3180 "Weapon and Armor shop keeper" | shop 42 "Pking Gear" | — | C |
| 1001 | Dark mage | 3302,3200 "pc monster" | dialogue **4444** "Welcome to the Thieving Area :)" | — | C |
| 1051 | Nature Spirit | — | one-time starter §2.1 | — | C |
| 1305 | Agnar | — | shop 30 "Food Store." (defined with **no items**) | — | C |
| 1451 | Sleeping Monkey | — | teleport → 3250,3423,0 | — | C |
| 1552 | Santa | — | shop 31 "santa's holiday stuff" | — | C |
| 1686 | Ghost Disciple | — | q1stage==2 → dialogue **6889** (Scythe every time); else "The ghost isn't interested in talking at the moment." | — | C |
| 1699 | Ghost Shopkeeper | 2743,3466 "Pure Shop" | — | shop 51 "Pure Shop" | C |
| 1783 | Richard | 2000,3468 "Team Capes" | — | shop 52 "Richards F2p Shop" | C |
| 1860 | Brian | — | — | shop 16 | A-data |
| 1917 | Bandit shopkeeper | 2742,3473 "Rune Armor Shop" | — | shop 54 "God Armor Shop" | C |
| 1964 | Mummy | — | `NpcWanneTalk=7777`, which has no dialogue ⇒ nothing (code comment says "Robin") | — | J |
| 2167 | Customer | 2809,3186 "team capes 2" | shop 33 "Allstar's Pking Shop" | — | C |
| 2168 | Customer | 2797,3177 "team capes 1" | shop 34 "Magic Shop" | — | C |
| 2253 | Wise Old Man | 2855,3599; 2514,3861 | clue L1/S5/id2 → 32; else "This man isn't interested in talking right now..." | — | C |
| 2256 | Paladin | 3300,3175; 3300,3172 ("pc monster") | — | pickpocket, Thieving 50 | C |
| 2259 | Mage of Zamorak | — | dialogue **2259** (abyss teleport) | — | C |
| 2262 | Dark mage | 2795,3180 "ghostly shop" | shop 32 "Robez 'n st00f" | — | C |
| 2301 | Monkey | — | teleport → 2715,9161,**1** | — | C |
| 2304 | Sarah | 2820,3460 "Hero"; 3285,3173 "pc monster" | — | shop 45 "Farming Shop" | C |
| 2619 | TzHaar-Ket-Zuh | — | `WanneBank=3` and `openUpBank()` immediately | bank, `WanneBank=2` | C |
| 2621 | TzHaar-Hur-Koz | 2477,5147 (twice) | shop 41 "Obsidian Stuff" | shop 41 | C |
| 3117 | (not in npc.cfg) | 2799,3180 "noob armor shop"; 3431,3538 "sandwichlady" | shop 44 "Armour Shop" | — | C |

**Dead chain entries (never reached):**
- op1: the second 652 entry and the second 2619 entry.
- op2:
  - 551 → shop 1
  - 549 → shop 10
  - 550 → shop 11
  - 555 → shop 3
  - 538 → shop 6
  - 548 → shop 8
  - 554 → shop 47
  - 558 → shop 18
  - 520/521 → shop 22
  - 1917 → shop 31
  - the second 2619 entry (bank)
  - 683 is live, because it comes after everything else.
- The comments beside these lines ("Gilded Shop", "Rimmington Crafting", etc.) do not match the actual shop names.

---
## 2. NPC option details

### 2.1 Nature Spirit 1051: starter [C] (L18908-18922)
- **When `starter==0`:**
  - Adds 995 Coins ×15,000,000.
  - Adds 392 Manta ray (noted) ×1,500.
  - Sends "Get more food from the store owner:zeek".
  - Sets `starter=1`, then calls `savemoreinfo(); savechar()`.
  - If the inventory is full the items are lost, but the flag is still set.
- **When `starter==1`:** sends "Why do you have to be greedy?" and broadcasts to all players "`<name>` is really greedy trying to type ::starter again".
- There is no range check.

### 2.2 Instant fishing spots 233–236 [C] (L19153-19205)

| NPC | Fishing level (current) | anim | gives | XP | message |
|---|---|---|---|---|---|
| 235 | ≥1 | 622 | 317 Raw shrimps | 150 × Fishing level | "You fish a shrimp" |
| 234 | ≥40 | 619 | 377 Raw lobster | 300 × level | "You fish a lobster" |
| 236 | ≥75 | 618 | 383 Raw shark | 500 × level | "You fish a shark" |
| 233 | ≥90 | 618 | 389 Raw manta ray | 750 × level | "You fish a manta ray" |

- A catch happens only when `actionTimer==0`. It then sets `actionTimer=5` (2.5 s).
- Each click gives one catch; there is no auto-repeat.
- There is no tool, bait or range check.
- A full inventory means the fish is lost, but the XP is still given.
- Below the level, these messages are sent, even while `actionTimer>0`:
  - "You need a fishing level of 40 to fish lobsters."
  - "You need a fishing level of 1 to fish shrimp."
  - "You need a fishing level of 75 to fish shark."
  - "You need a fishing level of 90 to fish manta ray."

### 2.3 Standard fishing spots 309/312/313/316/319 [A; unspawned and broken ⇒ effectively J]

A click checks for the required items. If they are missing it sends "You need a `<tool>` and `<bait>` to fish here." or "You need a `<tool>` to fish here.". Otherwise it sets `fishing[]` and `IsUsingSkill`. After that, `fishing()` (L30011) runs every cycle while the player is within `GoodDistance2` 1 of the spot.

| NPC/op | needs | catch (item Lreq/XP) | bait consumed | anim |
|---|---|---|---|---|
| 309 op1 | 309 Fly fishing rod + 314 Feather | random: 335 trout 20/50, 349 pike 25/60, 331 salmon 30/70 | 314 | 622 |
| 309, 316 op2 | 307 Fishing rod + 313 Fishing bait | random: 327 sardine 5/10, 345 herring 10/30 | 313 | 622 |
| 312 op1 | 301 Lobster pot | 377 lobster 40/90 | — | 621 |
| 312 op2 | 311 Harpoon | random: 359 tuna 35/80, 371 swordfish 50/100 | — | 618 |
| 313 op1 | 307 + 313 (**BUG**) | random big net: 353 mackerel 16/20, 407 oyster 16/10, 405 casket 16/10, 401 seaweed 16/1, 341 cod 23/45, 363 bass 46/100 | 313 | 622 |
| 313 op2 | 311 | 383 shark 76/110 | — | 618 |
| 316 op1 | 303 Small fishing net | random: 317 shrimps 1/10, 321 anchovies 15/40 | — | 621 |
| 319 op1 | 303 | 5004 Frog spawn 33/75 | — | 621 |
| 319 op2 | 307 + 313 | random: 3379 slimy eel 28/65, 5001 raw cave eel 36/80 | 313 | 622 |

- The spot's level requirement is the first table entry's level.
- `fishing()` needs Fishing ≥ that level **and a wielded weapon** (`equip[weapon] ≥ 0`). Otherwise it sends "You need `<lvl>` fishing to fish here." and resets.
- It needs a free slot, otherwise "Not enough space in your inventory.".
- **First tick:** the tool is drawn in the shield slot, the weapon slot is set to −1, the anim plays, and "You start fishing with your `<tool>`..." is sent.
- **Each tick:** the catch chance is 1/max(2, 99 − Fishing level).
- **On a catch:**
  - Bait is consumed. If it has run out: "You have run out of `<bait>`." and fishing stops.
  - For a random table, entries are picked uniformly until one is at or below the player's level.
  - The fish is added.
  - XP = the fish's XP.
  - "You catch a `<fish>`." is sent.
- **BUG:** on the second tick the weapon slot is already −1, so the weapon check fails. The player gets the level message, fishing resets, **and the weapon is never restored** (it is lost).

### 2.4 Pickpocketing (op2) [C] (L19597-19632, 24715-24753)

| NPC | Thieving | success | actionTimer | failure message |
|---|---|---|---|---|
| 18 Al-Kharid warrior | ≥25 | +1,800 coins, +250 XP, "You pickpocket the warrior." | 10 (5 s) | "You need 25 theiving to pickpocket warriors." |
| 2256 Paladin | ≥50 | +8,000 coins, +220 XP, "You pickpocket the paladin." | 4 (2 s) | "You need 50 theiving to pickpocket paladins." |
| 7 Farmer (`robhero`) | ≥70 | +3,000 coins, +274 XP, "You pickpocket the farmer." | 4 | "You need 70 theiving to pickpocket farmers." |

- A pickpocket runs only when `actionTimer==0`; otherwise the click is silently ignored.
- Anim 881.
- **It always succeeds.** There is no failure roll, stun, damage or range check, and the current level is used.
- `robfarmer()` (2,301 coins / 250 XP) exists but nothing calls it.
- **BUG:** the `rob*()` methods read an extra word of stale packet bytes as an NPC index to face. A null slot throws an NPE and disconnects the player, after the reward has been given.

### 2.5 Teleport NPCs (op1) [C]
These teleports are instant, with no message, anim or teleblock check:

| NPC | destination |
|---|---|
| 1451 | 3250,3423,0 |
| 57 | 2438,5169,0 |
| 70 | 2413,5117,0 |
| 33 | 2438,5169,0 |
| 37 | 3254,3436,0 |
| 2301 | 2715,9161,1 |

### 2.6 "Essence" wizards (op2) [J]
NPCs 300, 844 and 462 set `teleportTo 3088,3489` (height unchanged) and `Essence = 1/2/3`. `Essence` is only read by stair types 25 and 26 (L24636-24645):
- **Mine spots:** 2893,4846 / 2921,4846 / 2911,4832 / 2926,4817 / 2899,4817.
- **Returns (by `Essence`):** [0] 3253,3401 · [1] 3105,9571 · [2] 2681,3325 · [3] 2591,3086.

No teleport to the essence mine ever happens.

### 2.7 Banks
- Bankers 494 and 495: op1 opens dialogue 1 (§2.8); op2 sets `WanneBank=2`.
- Gnome banker 166, op1: opens the bank immediately.
- TzHaar-Ket-Zuh 2619:
  - op1: opens the bank immediately and also sets `WanneBank=3` (so the bank re-opens near the stale skillX/Y).
  - op2: sets `WanneBank=2`.
- `openUpBank()`: interface 5292 with inventory 5063, refreshes 5064, sets `IsBanking=true`. There is no PIN system.

### 2.8 Dialogue flows started by NPC clicks (effects)

**Continue button: packet 40 (L18166).**
- `NpcDialogue+1` for: {1, 3, 5, 40, 42, 1001, 1002, 2259, 2260, 301, 305, 308, 309, 313, 314, 317, 318, 319, 322, 323, 14600, 14602, 550, 1694, 1339}.
- Close for: {6, 7, 300, 303, 304, 307, 310, 311, 312, 315, 316, 320, 321, 324, 325, 326, 14604}.
- 31 and 30: `newclue(cluelevel)`, then close.
- 32: `givereward(cluelevel)`, then close.
- Anything else: close.

**Menu buttons.** Option 1 = button 9157, option 2 = button 9158 (L23997-24156).

| start dlg | NPC | flow → effect |
|---|---|---|
| 1 | 494/495 | NPC: "Good day, how can I help you?" → dlg 2, a menu titled "What would you like to say?":<br>• "I'd like to access my bank account, please." → `openUpBank()`<br>• "I'd like to check my PIN settings." → `openUpPinSettings()` (interface 14924, static text only) |
| 3 | 553 | NPC: "Do you want to buy some runes?" → dlg 4 menu:<br>• "Yes please!" → `openUpShop(2)`, the Gold & Trimmed Armor shop<br>• "Oh it's a rune shop. No thank you, then." → dlg 5 (the player says it) → dlg 6: "Well, if you find somone who does want runes, please" / "send them my way." → close |
| 40 | 376 | NPC: "Do you want to go on a trip to Karjama?" / "It's free." → dlg 41 menu:<br>• "Yes, please" → "You board the ship.", `travelboat1`, `traveltime=30`<br>• "No, Thank you." → close |
| 42 | 380 | NPC: "Do you want to go on a trip to Port Sarim?" / "It's free." → dlg 43, the same menu → `travelboat2` |
| (boat) | | **Every cycle during travel:** teleport to 9999,9999 and show interface `sendFrame248(3281,3213)`.<br>**Arrival:** when `traveltime` reaches ≤1, about 29 cyc (14.5 s). Karamja arrival is 2956,3146 with "The boat arrives at Karamja."; Port Sarim arrival is 3029,3217 with "The boat arrives at Port Sarim.". The trip is free. |
| 550 | 550 | Player: "Ok, where can I find the Consecration seed?" → dlg 551, which is undefined and shows nothing → close |
| 1339 | 0 | NPC: "Welcome To Mod Allstarscape !!" / "Click here to Get shot by Hans" → dlg 1340 menu:<br>• "Yea i wanna go own n00bs!": 9157 has no case for 1340, so nothing happens unless the `duelring` flag is set (§6)<br>• "Nah im really scared!" → writes "Fine, you suck!" to line 4885 and closes |
| 2259 | 2259 | NPC: "Hello, would you like me to tele you to the abyss?" → dlg 2260 menu:<br>• "Hell yeah!" → "You teleport to the abyss." and teleport to 3040,4842<br>• "No thanks." → close |
| 4444 | 1001 | NPC: "Welcome to the Thieving Area :)" → close.<br>Nothing starts the Dark-mage conversion dialogues 1001/1002. Their effect: dlg 1002 option 1 shows gfx 435 and toggles the magic sidebar between ancients (12855, "The dark mage converts you to ancient magicks!") and normal (1151, "The dark mage converts back to normal magic!"). |
| 7777 | 1964 | undefined ⇒ nothing |
| 14600 | 599 | NPC: "Yo you want a make over?" → dlg 14601 menu "Sure" / "Nope" → 14602: "Ok that'll be 10000 coins" → 14603 menu "Ok" / "Gay..." → 14604:<br>• With ≥10,000 coins: removes 10,000 coins and opens the character-design interface 3559. Packet 101 then applies gender, 7 body parts and 5 colours.<br>• Otherwise: "You got no money, bitch," / "come back when you got some." |
| 6889 | 1686 (while q1stage 2) | "Happy Halloween from Mod Allstarscape v3!" and adds 1419 Scythe **every time the dialogue opens** |
| 31 / 32 | clue NPCs | 31: "Heres your next clue, goodluck" → `newclue()`.<br>32: "Congratulations! Heres your last reward!" → `givereward()`.<br>See §9. |

- **9157 quirk:** 9157 checks `NpcDialogue==0` before `duelring`. If a two-option menu is open while `NpcDialogue==0`, option 1 sets `NpcDialogue=1340`, writes "Mmk thanks for reading!" and closes. The result is that Hans' 1340 menu pops up.

### 2.9 Quest NPCs [C]
This section gives the conditions, the dialogue started, and the state changes and rewards (inside `UpdateNPCChat`).

**Horvik 549 (op1).** The branches are an else-if chain, checked after the clue check:

| condition | dialogue | effect |
|---|---|---|
| q1stage 0 | 100 | q1stage=1 |
| q1stage 1, missing any of 451 Runite ore / 2339 Palm leaf / 1777 Bow string | 101 | — |
| q1stage 2, no 6889 Mage Book | 102 | — |
| q1stage 3 | 103 | — |
| q1stage 4, no 4206 Consecration seed | 104 | — |
| q1stage 1, has all three items | 1101 | deletes them; q1stage=2 |
| q1stage 2, has 6889 | 1102 | deletes it; q1stage=3 |
| q1stage 4, has 4206 | 1105 | deletes 4206; +6656 (absent from item.cfg); "Quest complete!"; quest screen "Invisible Armour", 3 QP; q1stage=−1 |
| none of the above | — | "Horvik isn't interested in talking right now..." |

q1stage goes from 3 to 4 at L17536.

**Cook 278 (op1)**

| condition | dialogue | effect |
|---|---|---|
| q2stage 0 | 200 | q2stage=1 |
| q2stage 1, missing any of 1944 Egg / 1927 Bucket of milk / 1933 Pot of flour | 201 | — |
| q2stage 1, has all three | 2001 | deletes them; +775 Cooking gauntlets; "Quest complete!"; "Cook's Assistant", 2 QP; q2stage=−1 |
| none of the above | — | "The cook isn't interested in talking right now..." |

**Wizard Mizgog 706 (op1).** These are independent `if` statements, so the last true one wins:

| q3stage | without the item | with the item |
|---|---|---|
| 0 | 301 | — |
| 1 (84 Staff of armadyl) | 304 | 305 |
| 2 (4703 Magic stone) | 311 | 308 |
| 3 (3006 Firework) | 312 | 313 |
| 4 (744 Heart crystal) | 316 | 317 |
| 5 (6070 Mourner cloak) | 321 | 322 |
| ≥6 (793 Daconia rock) | 325 | — |
| 7 with 793 | — | 326 |

- Dialogue 326 is the reward:
  - q3stage=−1.
  - +1,000,000 Magic XP.
  - +6603 magic staff.
  - "You are rewarded 1 million magic experience!" and "You can now use all 3 god spells! (Level 99 magic needed)".
  - Quest screen "Spells Of The Gods", 4 QP.
- Stage changes inside the dialogues:
  - dlg 302, option 1 → dlg 303 and q3=1
  - 305 → 2
  - 308 → 3
  - 313 → 4
  - 317 → 5
  - 322 → 6
  - 325 → 6
  - stage 6 → 7 happens at L17373
- Item-side steps are in §7B, §8 (packet 79), §10 (drop of 744) and §11 (6070).

**Ghost Disciple 1686:** see §2.8 (dialogue 6889).

---
## 3. Attack NPC (packet 72) restrictions [C] (L19647-19774)

1. If `attacknpc > 0` already: "You are already attacking an npc!" and the packet is ignored.
2. Set `attacknpc` to the NPC index. If that NPC is itself fighting an NPC (`npc.attacknpc>0`): "You can't attack a dueling npc!" and the attack is blocked.
3. Level gates, checked against current levels. On failure the message is sent and the attack is blocked:

| npcType | needs | message |
|---|---|---|
| 41 Chicken | Slayer 5 | "You need a slayer level of 5 to attack chickens." |
| 90 Skeleton | Slayer 20 | "You need a slayer level of 20 to attack skeletons." |
| 1648 Crawling Hand | Slayer 30 | "You need a slayer level of 30 to attack crawling hands." |
| 1832 Cave Bug | Slayer 40 | "You need a slayer level of 40 to attack cave bugs." |
| 1637 Jelly | Slayer 50 | "You need a slayer level of 50 to attack jellys." |
| 1604 Aberrant specter | Slayer 65 | "You need a slayer level of 65 to attack aberrant specters." |
| 1615 Abyssal demon | Slayer 82 | "You need a slayer level of 82 to attack abbysal demons." |
| 2783 Dark Beast | Slayer 99 | "You need a slayer level of 99 to attack dark beasts." |
| 50 King black dragon | Strength 75 | "You need a strength level of 75 to attack King Black Dragon's." |
| 113 Jogre | Attack 55 | "You need a attack level of 55 to attack Jogre's." |

4. If the attack is allowed and the NPC is either free (`followPlayer<1`), already on this player, or the player is flagged `inwildy2`: combat starts. That means `IsAttackingNPC`, `npc.StartKilling=me`, `RandomWalk=false`, `IsUnderAttack=true`, and the player faces the NPC.
   - Otherwise the player is sent an **empty message ""** and combat does not start. **BUG:** `attacknpc` stays set, so the next attack click says "already attacking" until the player walks.
   - Blocked attacks from steps 2 and 3 call `ResetAttackNPC()`.

## 4. NPC option 3 (packet 18) [J]
This only prints `Packet 18: <word>` to the console.

---
## 5. Item first click (packet 122) (L19798-19817)

- If the slot holds the item, the handler **always** calls `CheckForSkillUse3(id,slot)` (L26197).
- For the ids {2681, 2682, 2683, 952, 532, 3125, 3127–3133, 536, 4812, 4830, 4832, 4834} it **also** calls `buryBones(slot)` (L9969).
- Ids with no case in `CheckForSkillUse3` get "Nothing interesting is happening.". That includes clue scrolls, the spade and bones 3127–3133, which get the message and then the `buryBones` behaviour as well.

### 5.1 Food (`healing()`, L30889)
- `CheckForSkillUse3` sets `healing[min,max,leftover]` and calls `healing()` straight away.
- **A wielded weapon is required** (`equip[weapon] ≥ 0`). Without one, nothing happens and the bite stays pending. `process()` eats it on the first cycle after a weapon is wielded.
- With a weapon, eating is instant:
  - Anim 829.
  - One of the item is deleted (from the first slot holding it).
  - Heal = min + `random(0..max−min)`; new HP = min(HP+heal, base HP).
  - The leftover item is added.
  - Message "You eat the `<item name>`." (used for drinks too).
- **There is no eat delay.**

**Items and heal amounts** (name heal → leftover):

| Group | Items |
|---|---|
| Fish | 315 Shrimps 3 · 319 Anchovies 1 · 325 Sardine 4 · 329 Salmon 9 · 333 Trout 7 · 339 Cod 7 · 347 Herring 5 · 351 Pike 8 · 355 Mackerel 6 · 361 Tuna 10 · 365 Bass 13 · 373 Swordfish 14 · 379 Lobster 12 · 385 Shark 20 · 391 Manta ray 25 · 397 Sea turtle 25 |
| Cakes | 1891 Cake 4 → 1893 · 1893 2/3 cake 4 → 1895 · 1895 Slice of cake 4 · 1897 Chocolate cake 5 → 1899 · 1899 2/3 chocolate cake 5 → 1901 · **1901 Chocolate slice: inedible** (empty case) |
| Pizzas | 2289 Plain pizza 7 → 2291 · 2291 1/2 plain pizza 7 · 2293 Meat pizza 8 → 2295 · 2295 1/2 meat pizza 8 · 2297 Anchovy pizza 9 → 2299 · 2299 1/2 anchovy pizza 9 · 2301 Pineapple pizza 11 → 2303 · 2303 1/2pineapple pizza 11 |
| Pies | 2323 Apple pie 7 → 2335 · 2335 Half an apple pie 7 · 2327 Meat pie 6 → 2331 · 2331 Half a meat pie 5 · 2333 Half a redberry pie 4 · **3225 Cloth 5 → 2333** (**BUG**: meant Redberry pie 2325, which is unhandled) |
| Drinks and dishes | 1885 Ugthanki kebab 19 · 2011 Curry 19 · 1977 Chocolatey milk 4 · 2309 Bread 5 · 1993 Jug of wine 11 (no jug back) · 2003 Stew 11 (no bowl back) · 4242 Cup of tea 3 |
| Other | 1961 Easter egg 35 (also `setAnimation(1835)`, `resetanim=6`) · 2149 Lava eel 14 · 2343 Cooked oomlie wrap 14 · 2878 Cooked chompy 10 · 3144 and 3146 Cooked karambwan 18 · 3369 Thin, 3371 Lean and 3373 Fat snail meat 5–9 · 3381 Cooked slimy eel 6–10 · 4291 Cooked chicken 3 · 4293 Cooked meat 3 · 5003 Cave eel 7–11 · 6297 Spider on stick and 6299 Spider on shaft 7–10 |
| Broken | **5988 Sweetcorn:** its formula `floor((HP/100)*10+0.5)` uses integer division and gives 0, so it is **never eaten** |

The authentic cooked chicken and cooked meat ids (2140, 2142) are not handled.

### 5.2 Potions [C formulas]
**How a dose works**
- A dose is instant: no anim, no message, no delay.
- The current level is first **reset to the base level** and the boost is then added. Boosts do not stack, and drinking cures any drain.
- Integer division throughout.

| potion (4)(3)(2)(1) ids | skill | boost | chain |
|---|---|---|---|
| Super strength 2440, 157, 159, 161 | Str | 2×(base/5) for (4)(3)(1); **(2) 159 uses 2×(base/10)**; min 2 | 2440→157→159→161→229 Vial |
| Strength potion 113, 115, 117, 119 | Str | base/5 + (base/5)/2, min 2 | →115→117→119→229 |
| Super defence 2442, 163, 165, 167 | Def | 2×(base/10), min 2 | →163→165→167→229 |
| Defence potion 2432, 133, 135, 137 | Def | base/10 + (base/10)/2, min 2 | →133→135→137→229 |
| Super attack 2436, 145, 147, 149 | Att | 2×(base/10), min 2 | →145→147→149→229 |
| Attack potion 121, 123, 125 | Att | base/10 + (base/10)/2, min 2 | 121→123→125→229 |
| Attack potion(4) 2428 | **BUG** | Boosts **Defence** by the attack formula (computed from Attack base), shows the value on the Strength frame 4006 in white, deletes **161 Super strength(1)** if present instead of itself, and adds a Vial. 2428 is therefore never consumed. | — |
| Magic potion 3040, 3042, 3044, 3046 | Mag | +4 flat | →3042→3044→3046→229 |
| Ranging potion 2444, 169, 171, 173 | Rng | base/10 + 3 (no minimum) | →169→171→173→229 (173 displays the Magic level: visual bug) |

At base 99 these give:
- Super strength +38 (level 137).
- Strength potion +28.
- Super attack and super defence +18.
- Attack and defence potions +13.
- Ranging +12.
- Magic +4.

**Drain-back (`process`, L17060-17107)**
- For skills 0–6: if the current level is above base and `potTimerN==0`, the level drops by 1 and `potTimerN` gains 250. `potTimerN` drops by 1 each cycle.
- The first −1 therefore happens on the next cycle, then another −1 every 250 cyc (125 s).
- **BUG:** the Strength branch adds its 250 to `potTimer1` (Defence) instead of `potTimer2`. Boosted Strength therefore **drops 1 per cycle** (a +38 boost is gone in 19 s), and every Strength drop delays Defence decay by 250 cyc.
- The `strPot`, `attPot`, etc. flags and their timers are set but never used.

### 5.3 Antipoison 2446 (4), 175 (3), 177 (2), 179 (1)
- Each dose sets `PoisonDelay=9,999,999`, which stops poison, and plays anim 829.
- Doses (4) to (2) send "You drink a dose of the antipoison." and turn into the next dose.
- Dose (1) sends "You drink the last dose of the antipoison." and leaves no vial.

### 5.4 Bones: two independent XP paths
- **Path P** (`prayer()`, L31100, run by `process()`):
  - Needs a wielded weapon with id ≥ 1 and `actionTimer==0`. Otherwise the bury stays pending.
  - Deletes the **whole stack** in the clicked slot.
  - Gives the XP shown, sends "You bury the bones." and plays anim 829.
  - The Prayer level is never checked.
- **Path B** (`buryBones`, immediate): only for the listed ids, and only when the slot holds exactly 1. It gives XP, deletes 1, and sends no message.

| id name | P XP | B XP | total when wielding a weapon |
|---|---|---|---|
| 526 Bones, 528 Burnt bones, 2859 Wolf bones | 4 or 5 (50/50) | — | 4–5 |
| 530 Bat bones | 4 (1/3) or 5 (2/3) | — | 4–5 |
| 532 Big bones, 3125 Jogre bones | 15 | 0 (deletes; the `&&` condition is impossible) | 15 |
| 3127 Burnt jogre, 3128/3129/3131/3132 Pasty jogre, 3130/3133 Marinated j' bones | — ("Nothing interesting is happening.") | 0 (deleted) | **0, bone destroyed** |
| 534 Babydragon bones | 30 | — | 30 |
| 536 Dragon bones | 72 (plus anim 829) | 72 | **144** |
| 3123 Shaikahan bones | 25 | — | 25 |
| 3179 Monkey bones | 5 | — | 5 |
| 4812 Zogre bones | 22 or 23 (50/50) | 25 | 47–48 |
| 4830 Fayrg bones | 87 | 80 | 167 |
| 4832 Raurg bones | 96 | 100 | 196 |
| 4834 Ourg bones | 5000 | 8000 | **13,000** (sold for 400 gp in shops 24 and 59) |

- Without a weapon, only path B happens. Path P fires later, when a weapon is wielded.
- **Dead code** inside `buryBones`, which packet 122 never reaches:
  - Heals for 379 Lobster (12), 365 Bass (8), 385 Shark (20), 397 Turtle (30) and 391 Manta ray (25, but the message says 45). Their messages follow the pattern "You eat the lobster, it heals 12 hitpoints.".
  - 347 Herring teleports to 3040,4842 with "You teleport to the abyss.". Above y 3672 it says "You can't use this above level 20 wilderness." instead.

### 5.5 Other first-click items

| id | item | effect |
|---|---|---|
| 9540 | Home teletab (custom; not in item.cfg) | Deletes 1, anim 1816, teleport 2515,3863 (height unchanged), overhead text "You teleport to home". No teleblock or wilderness check. [C] |
| 2520, 2522, 2524, 2526 | Toy horsey | Anims 918, 919, 920, 921 with overhead "Come on Swifty, we can win the race!", "Come on Alex, …", "Come on Vegeta, …" and "Come on MrWicked, …" respectively. Not consumed. [C] |
| 1917 | Beer | "You drink the beer, and feel a bit drunk!". `drunkTimer += 80` (40 s of stand anim 2770 and walk anim 2769, then the normal anims return). The beer is deleted and no glass is returned. [C] |
| 4079 | Yo-yo | Anim 1457 ("play"). [A] |
| 2681, 2682, 2683 | Clue scroll L1, L2, L3 | §9 |
| 952 | Spade | If `cluelevel>0`: `dig()` (§9). Then a new spade is added to the first free slot and the spade in the clicked slot is deleted. With a free slot the spade is kept; with a **full inventory it is lost** (BUG). |
| 405 | Casket | Unhandled: "Nothing interesting is happening." |

---
## 6. Alternative item options (packet 75 = "option 1" / 4th menu slot; packet 16 = "option 2" / 3rd slot) (L18343-18446)

Both call `checkwildy()` first.

**Packet 75**
- **4079 Yo-yo:** anim 1460 ("Crazy").
- **1712 Amulet of glory(4)** [C]:
  - If teleblocked: "You are currently teleblocked and cannot teleport".
  - Otherwise: teleport to 2852,3863,0 and "Home, sweet home".
  - Unlimited charges, no wilderness limit, and only the (4) id is handled.
- **Ring of dueling (8)…(2)** (2552, 2554, 2556, 2558, 2560, 2562, 2564; (1) 2566 is not handled) [C]:
  - Teleblock message as above.
  - Otherwise: sets `duelring=true` and opens menu 2459, "Where would you like to go?", with options "Jad" and "Runecraft" (colour-coded), plus a blank third line.
  - **Option 2 (9158):** teleport to 3040,4840,0 with "You teleport to the abyssal rift" and "You can feel the magical aura in the air". **BUG:** `duelring` is not reset.
  - **Option 1 (9157):** hits the `NpcDialogue==0` branch first, which opens Hans' 1340 menu ("Yea i wanna go own n00bs!" / "Nah im really scared!").
    - Picking option 1 there reaches the `duelring` branch: teleport to 2837,9581,0 with "You teleport to the TzTok-Jad's lair" and "As you materialize, you feel the air around you grow hot", and `duelring=false`.
  - No charges are ever used.

**Packet 16**
- **God books** 3840 Holy book / 3842 Unholy book / 3844 Book of balance [A-text]:
  - Opens menu 2480, "Select an Option", with "Wedding rights", "Last rights", "Blessing" and "Preach". Sets `holyBook`, `unholyBook` or `balanceBook`.
  - Buttons 9178, 9179, 9180 and 9181 each close the menu and start a sequence of overhead lines, **7 cyc (3.5 s) apart**. The table below shows the lines.
  - After the last line comes an anim (Saradomin 1335, Zamorak 1336, Guthix 1337) and the flags reset.
  - **BUG:** Guthix "Preach" never plays its anim or resets its flag.

| book / button | lines |
|---|---|
| Sara 9178 | "In the name of Saradomin," → "Protector of us all," → "I now join you in the eyes of Saradomin." |
| Sara 9179 | "Thy cause was false, thine skills did lack," → "See you in Lumbridge when you get back." |
| Sara 9180 | "Go in peace in the name of Saradomin," → "May his glory shine upon you like the sun." |
| Sara 9181 | "Protect yourself, protect your friends," → "Mine is the glory that never ends," → "This is Saradomin's wisdom." |
| Zam 9178 | "Two great warriors, joined by hand," → "To spread destruction across the land," → "In Zamorak's name, now two are one." |
| Zam 9179 | "The weak deserve to die," → "So that the strong may flourish," → "This is the creed of Zamorak." |
| Zam 9180 | "May your bloodthirst be never sated," → "And may all your battles be glorious," → "May Zamorak bring you strength." |
| Zam 9181 | "Strike fast, strike hard, strike true," → "The strength of Zamorak will be with you," → "Zamorak give me strength." |
| Gut 9178 | "Light and dark, day and night," → "Balance arises from contrast," → "I unify thee in the name of Guthix." |
| Gut 9179 | "Thy death was not in vain," → "For it brought some balance to the world." → "May Guthix bring you rest." |
| Gut 9180 | "May you walk the path, and never fall," → "For Guthix walks beside thee on thy journey." → "May Guthix bring you balance." |
| Gut 9181 | "The trees, the earth, the sky, the waters," → "All play their part upon this land." → "May Guthix bring you balance." (no anim) |

- **4079 Yo-yo:** anim 1459 ("Walk").
- **BUG:** case 16 has no `break`, so it falls into case 192 (item on object), which re-reads stale bytes. Every packet-16 click normally ends with "Nothing interesting happens.".

---
## 7. Item on item (packet 53) (L19964-20271)

- `itemUsed` is the item selected first with "Use" (the 2nd word in the packet). `useWith` is the item clicked on.
- **Only the listed direction works**, unless a combination says "either order".
- All combinations are instant and XP is raw. Any other pair does nothing and sends no message.

**A. "Farming" [C].** Use the 5340 Watering can(8) on a seed:
- Deletes 1 seed, gives +5 coins and Farming XP.
- The can is not charged.
- 5313 Willow seed is not handled.

| seed | Farming req | XP | failure message |
|---|---|---|---|
| 5312 Acorn | none | 15 | — |
| 5314 Maple seed | 25 | 20 | "25 Farming Needed!" |
| 5315 Yew seed | 40 | 30 | "40 Farming Needed!" |
| 5316 Magic seed | 50 | 35 | "50 Farming Needed!" |
| 5317 Spirit seed | 60 | 45 | "60 Farming Needed!" |
| 5318 Potato seed | 75 | 150 | "75 Farming Needed!" |
| 5319 Onion seed | 85 | 175 | "85 Farming Needed!" |
| 5320 Sweetcorn seed | 90 | 185 | "90 Farming Needed!" |
| 5321 Watermelon seed | 95 | 200 | "95 Farming Needed!" |

**B. Spells Of The Gods (q3) [C]**
- **4653 Fire object + 4703 Magic stone**, either order:
  - Sends "You rub the strong fire into the magic stone to create a firework.", deletes both and adds 3006 Firework.
  - **BUG (operator precedence):** `q3stage==3` is only checked for the "4703 used on 4653" order.
- **590 Tinderbox + 3006 Firework**, either order:
  - Deletes the Firework and drops 744 Heart crystal on the player's tile, owned by the player.
  - The `q3stage==4` check applies to one order only.

**C. Else-if chain (first match)**

*Unicorn horn [A]:* 233 Pestle and mortar on 237 Unicorn horn → 235 Unicorn horn dust. The horn is deleted; no level, no XP.

*Knife on logs [A-ish, custom XP].* Uses 946 Knife. XP = k × current Fletching level. On failure: "You need a fletching level of N to make this bow."

| log | → product | Fletching req | XP |
|---|---|---|---|
| 1511 Logs | 48 Longbow (u) | 1 | 40×lvl |
| 1521 Oak logs | 56 Oak longbow (u) | 20 | 60×lvl |
| 1519 Willow logs | 58 Willow longbow (u) | 40 | 80×lvl |
| 1517 Maple logs | 62 Maple longbow (u) | 50 | 100×lvl |
| 1515 Yew logs | 66 Yew longbow (u) | 60 | 120×lvl |
| 1513 Magic logs | 70 Magic longbow (u) | 80 | 140×lvl |

*Stringing:* the unstrung bow (used) on 1777 Bow string. It deletes both and gives flat XP. Same failure message.

| unstrung | → bow | req | XP |
|---|---|---|---|
| 48 | 839 Longbow | 1 | 15 |
| 56 | 845 Oak longbow | 20 | 25 |
| 58 | 847 Willow longbow | 40 | 40 |
| 62 | 851 Maple longbow | 50 | 65 |
| 66 | 855 Yew longbow | 60 | 90 |
| 70 | 859 Magic longbow | 80 | 120 |

There are no shortbows, arrows or darts here.

*Leather crafting:* 1733 Needle ↔ 1741 Leather (either order) opens interface 2311 with no checks. Its buttons are handled by packet 185 (L23517-23605). Thread (1734) is stackable. Leather is not, so a `deleteItem(…,2/3)` removes only one leather.

| button | product | Crafting req | thread required / removed | leather removed | XP | message |
|---|---|---|---|---|---|---|
| 33190 | 1059 Leather gloves | 0 | ≥1 / 1 | 1 | 20×lvl | "You make some gloves!" |
| 33193 | 1061 Leather boots | 4 | ≥1 / 1 | 1 | 40×lvl | "You make some boots!" |
| 33205 | 1167 Leather cowl | 9 | ≥2 / 2 | 1 | 60×lvl | "You make a leather cowl!!" |
| 33196 | 1063 Leather vambraces | 14 | ≥2 / 2 | 1 | 80×lvl | "You make some leather vambraces!" |
| 33199 | 1095 Leather chaps | 34 | ≥6, plus leather ≥1 / 4 | 1 | 140×lvl | "You make some leather chaps!!" |
| 33187 | 1129 Leather body | 29 | ≥15, plus leather ≥1 / 5 | 1 | 120×lvl | "You make a leather body!!" |
| 33202 | 1169 Coif | 34 | ≥2, plus leather ≥1 / 2 | 1 | 140×lvl | "You make a coif!!" |

Failure messages:
- The first four send "You havnt got any thread!", even when the level is what is too low.
- Chaps: "You need 6 thread and 1 piece of soft leather to make this!".
- Body: "You need 15 thread and 1 pieces of soft leather to make this!".
- Coif: "You need 2 thread and 1 piece of soft leather to make this!".

**BUG:** the first four do not check for leather, so they can be made from thread alone.

*Gem on robe (recolour) [C]:* use the gem on the piece. Both are deleted and the new piece is added. No level, no XP.

| gem | 656 Hat → | 636 Robe top → | 646 Robe bottoms → |
|---|---|---|---|
| 1603 Ruby | 2910 | 2906 | 2908 |
| 1605 Emerald | 658 | 638 | 648 |
| 1601 Diamond | 662 | 642 | 652 |
| 1607 Sapphire | 660 | 640 | 650 |

---
## 8. Other item-target packets

**57, item on NPC [J]:** prints four words to the console. No effect.

**25, item on ground item [J]; 234 [J]:** console prints only.

**14, item on player [C]** (L20504-20580)
- Every use logs "[`<name>`] gives/uses item [`<id>`] on player: [`<target>`]" to `logs/giveitemlogs.txt`. A second log file is at a hard-coded Windows path, and writing to it fails.
- 4567 Gold helmet or 6656: "You can't trade this item.".
- 1481 Orb of light:
  - If absY<3523 and absX<2954: "Move into the wilderness to use this spell on a player.".
  - If both players have absY ≥ 3523:
    - The user gets "You spam the enemy!".
    - The target gets interface 8134 with the title "@dre@SPAM" and three "@dbl@SPAM" lines, plus the message "You have been spammed!".
    - The orb is not consumed and there is no cooldown.
- Item giving is commented out.
- A null target throws an NPE and disconnects.

**181, Telekinetic Grab (spell 1168) on a ground item [A-ish]** (L19873-19927)
- Prints debug to the console.
- Needs Magic ≥33. If Magic is ≤32: "You need a magic level of 21 to cast this spell.".
- "You do not have enough runes to cast this spell." is sent if there is no 563 Law rune, **or** if there are fewer than 5 × 556 Air runes and no air staff (1381, 1397, 1405).
- The spell casts if (Law and 5 Air) **or** an air staff is wielded. **BUG:** an air staff alone is enough; no Law rune is needed.
- The cast adds the whole ground stack to the inventory at any distance. It shows gfx 142 on the player, plays anim 711, shows gfx 144 on the item's tile, and stops movement.
- Runes are removed even if the cast failed: 1 Law with an air staff, otherwise 1 Law + 1 Air (only one Air).
- No Magic XP.

**79, light a ground item [C, q3]** (L23386-23406)
- Prints "itemID2: `<id>`" to the console.
- Only 3006 Firework at 3288,3886 with q3stage 4 is handled:
  - It needs a 590 Tinderbox, otherwise "You need a tinderbox to light the firework.".
  - Success: "You light the fireworks", the firework is removed, and a 744 Heart crystal spawns on that tile.

---
## 9. Clue scroll system [C] (L8163-8477, dig() L35601-35920, UpdateNPCChat 31/32, objects L4354-4380, Clues.java)

**State.** `cluelevel`, `cluestage` (1–5) and `clueid` (1–5, uniform random via `randomClue()`). Saved with `savemoreinfo()`. The scroll ids are 2681 (L1), 2682 (L2) and 2683 (L3). How players obtain scrolls is not in these handlers.

**Reading a scroll** (packet 122 → `buryBones`)
1. "Nothing interesting is happening." is sent.
2. `clue()` runs. If any of level, id or stage is 0, `newclue()` runs first: a random id, stage+1, and it **deletes one each of 2681, 2682 and 2683**.
3. Then it shows the hint for the current level, stage and id. On a brand-new scroll the level is still 0, so no hint is shown.
4. Then `cluelevel` is set from the scroll id, the scroll is re-added, and the item in the clicked slot is deleted.
   - **BUG:** on the first read, the scroll usually ends up deleted, because the re-added copy lands in the freed slot.
   - With a full inventory, the scroll is also lost.
   - Reading a scroll of a different level switches `cluelevel`.

**Hint UI.** The quest scroll interface 8134, titled "@dre@Clue Scroll", with the subtitle "Coordinates of next clue". It shows either:
- "X Coordinate: `<x>`" / "Y Coordinate: `<y>`", or
- two text lines.

Both end with "GOOD LUCK!" (colour codes included).

**Dig** (click the 952 Spade while `cluelevel>0`)
- `dig()` always sends "Dig working - cheezy".
- It also sends "Clue level N found." and, for L1 only, "Clue stage N found." for stages 1, 2 and 4.
- At the exact tile for a stage below 5: "You find another clue!", the scroll of that level is added, and `newclue()` runs (id re-rolled, stage+1, one of each scroll deleted, so the count is net unchanged).
- At stage 5: "Congratulations you have completed the treasure trail!", the scroll is deleted, and `givereward(level)` runs.
- **NPC step (dlg 31):** showing the dialogue does nothing by itself. Pressing continue (packet 40) calls `newclue()`, which deletes the scroll and does not re-add it, so the player has no scroll left.
- **NPC step (dlg 32):** `givereward()` runs as soon as the dialogue is shown. Pressing continue calls `givereward()` again, but by then `cluereward()` has reset `cluelevel` to 0, so nothing more is given.
- **Object steps:**
  - Obj 348 at 2611,3323 (L1/S2/id3): "You find another clue!" + `newclue`.
  - Obj 356 at 2424,3081 (L1/id4, **any stage**): same, but it **adds a level-2 scroll 2682**.
  - Obj 357 at 2757,2951 (L2/S2/id5): same as obj 348.

**Trail table.** Each cell reads: id → completion [hint shown]. "dig X,Y" means stand on that exact tile. "–" means no hint is shown.

**Level 1 (2681)**
- **S1:** 1 → talk Horvik 549 [–] · 2 → dig 3213,3684 [X3211 Y3688] · 3 → dig 3110,3295 ["Head to the crossroad located" / "south of the haunted house"] · 4 → talk Shop assistant 527 [–] · 5 → dig 2684,3286 [2684,3286]
- **S2:** 1 → dig 3191,3363 [same] · 2 → dig 2947,3450 ["The old anvil would be a very" / "good place to check..."] · 3 → search obj 348 at 2611,3323 ["Search the drawers of a house containing" / "a sink in East Ardougne"] · 4 → obj 356 at 2424,3081 ["Search the boxes in castle wars" / "for your next clue."] · 5 → dig 3008,3889 [same]
- **S3:** 1 → dig 2424,3081 ["Your next clue lies where the ghost of" / "Camelot lives..."] · 2 → dig 2966,3381 · 3 → dig 3008,3889 · 4 → dig 2658,3338 · 5 → dig 3226,3368 ["A dolmen is always a good place to check" / "when doing treasure trails."]
- **S4:** 1 → talk Fisher King 220 [–] · 2 → talk Louie legs 542 [–] · 3 → dig 3235,3294 · 4 → dig 3258,3243 · 5 → dig 3225,3218 ["Try and check outside of the" / "castle in Lumbridge."]
- **S5 (reward):** 1 → dig 3225,3218 [same Lumbridge text] · 2 → talk Wise Old Man 2253 (dlg 32) [–] · 3 → dig 3141,3425 · 4 → dig 3098,3405 · 5 → dig 3113,3961

**Level 2 (2682)**
- **S1:** 1 → talk Lundail 903 [–] · 2 → dig 3213,3686 [**shows 3288,3886**, because a later hint overwrites the first] · 3 → dig 3157,3961 [shows 2884,3160] · 4 → dig 2839,3596 [shows 2802,2976] · 5 → talk Louie legs 542 ["Search the crates at the south west" / "of Karamja island, above the thick jungle."]
- **S2 (no hints):** 1 → talk Aubury 553 · 2 → dig 3288,3886 · 3 → dig 2884,3160 · 4 → dig 2802,2976 · 5 → dig 2839,3596 or obj 357 at 2757,2951
- **S3:** 1 → dig 2599,3176 · 2 → dig 2619,3499 · 3 → dig 2601,3490 ["At the end of the track." / "......."] · 4 → dig 2757,3477 · 5 → dig 2987,3388 ["The left flower patch" / "contains 4 flowers and your next clue."]
- **S4:** 1 → dig 3058,3353 · 2 → talk Thessalia 548 [–] · 3 → dig 3288,3465 · 4 → dig 3314,3719 · 5 → dig 3311,3768 ["The abandoned outpost near the poisonous" / "spiders holds your final clue."]
- **S5 (reward):** 1 → dig 3203,3424 ["The gypsy tent is the location of your" / "final reward."] · 2 → talk Louie legs 542 (dlg 32) · 3 → dig 3113,3961 · 4 → dig 3225,3218 [dolmen text] · 5 → dig 2424,3078 ["The table full of bandages contains the" / "final reward."]

**Level 3 (2683)**
- **S1:** 1 → dig 3022,3952 ["Go to the skeletons at the dead ship." / "!!!..........!!!"] · 2 → dig 3211,3685 [3211,3688] · 3 → dig 3211,3685 [3211,3688] · 4 → dig 2774,3515 (**gives 2682**) ["Your next clue lies where the ghost of" / "Camelot lives..."] · 5 → dig 3191,3963 ["The hut that lies in the wilderness" / "is your next destination"]
- **S2:** 1 → dig 3280,3955 ["The pillars of stone in the north eastern coast" / "is a good place to go."] · 2 → dig 3092,3963 · 3 → dig 3065,3904 ["Just south of the lava snake lies" / "your next clue..."] · 4 → dig 3213,3687 [3211,3688] · 5 → dig 3047,10342
- **S3:** 1 → talk Zaff 546 [–] · 2 → dig 3213,3687 [3211,3688] · 3 → dig 2961,3251 · 4 → dig 2988,3434 · 5 → dig 3105,3959
- **S4:** 1 → dig 3153,3923 ["The teleport lever is the way to your" / "next and final clue"] · 2 → dig 2569,3278 ["Head to the gateway to the garden of the house" / "in south-west Ardougne."] · 3 → dig 2599,3271 · 4 → dig 2958,3820 ["Find the sheltered altar in deep wilderness" / "for your final clue..."] · 5 → dig 2952,3790
- **S5:** **BUG:** a dig **anywhere** at L3/S5 gives the reward. The "Congratulations…" message only appears for id 1 at 2352,3294. id 5 → talk Zaff 546 (dlg 32). Hints: id1 2352,3294 · id2 dead-ship text · id3 track text · id4 "Read the sign up in the dangerous" / "mountains..." · id5 –

**Reward** (`givereward` → `cluereward`)
- Contents: 2 × random from `clueN` (×1 each), 2 × random from `nonclueN` (×1 each), and 1 rune type from `runesN` ×500.
- The rewards are listed on interface 8134: "Congratz, you have completed the treasure trail!", then "Reward:", then one "`<name>` (`<amt>`)" line per item.
- Items are added with `addItem`, so a full inventory loses them.
- The clue state resets.
- Draws are uniform over the array entries; duplicates add weight.
- **Weights.** The number after each name is its weight; the total is the pool size n.

**clue1 (n=39)**

| item | weight |
|---|---|
| 2587 Black full helm (t) | 3 |
| 2585 Black platelegs (t) | 2 |
| 2583 Black platebody (t) | 3 |
| 2589 Black kiteshield (t) | 3 |
| 2595 Black full helm (g) | 3 |
| 2593 Black platelegs (g) | 3 |
| 2591 Black platebody (g) | 2 |
| 2597 Black kiteshield (g) | 3 |
| 7332 Black kiteshield(h) | 1 |
| 7390 Wizard robe (g) | 1 |
| 7386 Blue skirt (g) | 1 |
| 7394 Wizard hat (g) | 1 |
| 7392 Wizard robe (t) | 1 |
| 7388 Blue skirt (t) | 2 |
| 7396 Wizard hat (t) | 3 |
| 7362 Studded body (g) | 1 |
| 7366 Studded chaps (g) | 2 |
| 7364 Studded body (t) | 2 |
| 7368 Studded chaps (t) | 2 |

**clue2 (n=27)**

| item | weight |
|---|---|
| 2605 Adam full helm (t) | 3 |
| 2601 Adam platelegs (t) | 2 |
| 2599 Adam platebody (t) | 3 |
| 2603 Adam kiteshield (t) | 2 |
| 2613 Adam full helm (g) | 2 |
| 2609 Adam platelegs (g) | 2 |
| 2607 Adam platebody (g) | 2 |
| 2611 Adam kiteshield (g) | 2 |
| 7334 Adam kiteshield(h) | 1 |
| 7327 Black boater | 1 |
| 7319 Red boater | 1 |
| 7323 Green boater | 1 |
| 7321 Orange boater | 1 |
| 7370 D-hide body(g) | 1 |
| 7378 D-hide chaps (g) | 1 |
| 7372 D-hide body (t) | 1 |
| 7380 D-hide chaps (t) | 1 |

**clue3 (n=88)**

| item | weight |
|---|---|
| 2619 Rune full helm (g) | 3 |
| 2627 Rune full helm (t) | 3 |
| 2621 Rune kiteshield (g) | 2 |
| 2629 Rune kiteshield (t) | 1 |
| 2639 Tan cavalier | 1 |
| 2615 Rune platebody (g) | 2 |
| 2623 Rune platebody (t) | 3 |
| 2617 Rune platelegs (g) | 2 |
| 2625 Rune platelegs (t) | 2 |
| 3476 Rune plateskirt (g) | 3 |
| 3477 Rune plateskirt (t) | 1 |
| 2657 Zamorak full helm | 4 |
| 2659 Zamorak kiteshield | 4 |
| 2653 Zamorak platebody | 1 |
| 2655 Zamorak platelegs | 3 |
| 3478 Zamorak plateskirt | 4 |
| 2667 Saradomin kite | 3 |
| 2661 Saradomin plate | 3 |
| 2663 Saradomin legs | 2 |
| 3479 Saradomin skirt | 2 |
| 2673 Guthix full helm | 2 |
| 2675 Guthix kiteshield | 4 |
| 2669 Guthix platebody | 3 |
| 2671 Guthix platelegs | 4 |
| 3480 Guthix plateskirt | 4 |
| 3486 Gilded full helm | 4 |
| 3488 Gilded kiteshield | 4 |
| 3481 Gilded platebody | 2 |
| 3483 Gilded platelegs | 3 |
| 3485 Gilded plateskirt | 2 |
| 7400 Enchanted hat | 1 |
| 7398 Enchanted robe | 1 |
| 7399 Enchanted top | 1 |
| 7374 D-hide body (g) | 1 |
| 7376 D-hide body (t) | 1 |
| 7382 D-hide chaps (g) | 1 |
| 7384 D-hide chaps (t) | 1 |

**nonclue1 (n=17)**

| item | weight |
|---|---|
| 1165 Black full helm | 3 |
| 1077 Black platelegs | 2 |
| 1125 Black platebody | 1 |
| 1195 Black kiteshield | 2 |
| 61 Willow shortbow (u) | 4 |
| 59 Willow longbow (u) | 3 |
| 1147 Rune med helm | 2 |

**nonclue2 (n=12)**

| item | weight |
|---|---|
| 1161 Adamant full helm | 1 |
| 1073 Adamant platelegs | 1 |
| 1123 Adamant platebody | 1 |
| 1199 Adamant kiteshield | 1 |
| 857 Yew shortbow | 3 |
| 855 Yew longbow | 2 |
| 2503 Dragonhide body | 1 |
| 1147 Rune med helm | 2 |

**nonclue3 (n=11)**

| item | weight |
|---|---|
| 1163 Rune full helm | 1 |
| 1079 Rune platelegs | 1 |
| 1127 Rune platebody | 1 |
| 1201 Rune kiteshield | 1 |
| 861 Magic shortbow | 2 |
| 859 Magic longbow | 2 |
| 2503 Dragonhide body | 3 |

**Rune pools (each rune weight 1):**
- runes1: Fire, Water, Air, Earth, Mind (554–558).
- runes2: runes1 + Chaos 562 + Death 560.
- runes3: runes2 + Blood 565 + Soul 566.

**Debug:** button 24135 turns on `cluedebug` ("Clue debugging set to true."), which prints level, stage, id and X/Y on each dig.

---
## 10. Ground items

**Pickup (236)** (L20802-20820)
- Requires that the item exists at x,y and that the player stands exactly on that tile. Otherwise nothing happens, with no retry.
- It then calls `pickUpItem()`, which needs a free slot **and** a current local position equal to the first waypoint of the last walk packet (`poimiX/Y`).
- **BUG:** the ground item is removed whether or not `pickUpItem` succeeded, so on failure the item is destroyed.
- There are no ownership or other custom restrictions.

**Drop (87)** (L23408-23429)
1. If the item is untradable (the only one is 6384 Fighter Torso): "You drop the Fighter Torso, it vanishes into the ground." and the whole stack is deleted.
2. If the item is 744 Heart crystal at exactly 2780,3515 with q3stage 5: spawns NPC 1645 Infernal Mage at x+1 (walk range ±3, respawn off). The crystal is not dropped.
3. Otherwise, when not mid-equip (`wearing==false`) and the slot matches: `dropItem`, which drops the whole slot amount as an item owned by the player.

---
## 11. Equip (41) and unequip (145, interface 1688)

**Packet 41**
- The code loops over `twoHanderz` = {7158 Dragon 2h Sword, 1319 Rune 2h sword, 6528 Tzhaar-ket-om, 14915 Barrelchest Anchor}, 4 iterations. Each iteration does one of:
  1. If **inventory slot**==5 and the current weapon == `twoHanderz[i]` (i is a client field, normally 0, which means 7158): "Two handed item = You cant equip a 2hander with a shield".
  2. Else if a shield is worn and the clicked item == `twoHanderz[I]`: "You cant equip a 2hander with a shield".
  3. Else: `wear()`.
- **Net effect:** `wear()` is attempted up to 4 times, so the item **is still equipped** and the block is cosmetic. The message still shows.

**`wear(id, slot)` (L15025)**
1. The slot must hold the item.
2. **6070 Mourner cloak:** the player's appearance becomes NPC 1645 (`isNpc`). This happens *before* the requirement checks.
3. The equipment slot comes from the Item4 lists (cape, hat, boots, gloves, shield, amulet, arrows, ring, body, legs; anything else is a weapon).
4. The GetCL* requirements are checked against **current** levels. Each unmet one sends "You need `<N>` `<skill>` to equip this item.", where `<skill>` is the lowercase `statName`, and any failure aborts.
5. The swap puts the old item back in the inventory. A stackable of the same id is merged instead.
6. If the new weapon is two-handed per `twohanded.dat` and a shield is worn, the shield is removed to the inventory. The two-handed ids are 829–861, 1307–1319, 4153, 4212–4223, 4236, 4710, 4718, 4726, 4734, 4747, 4755 and 4827.
   - 7158, 6528 and 14915 are **not** in that list, so they can be worn with a shield.
7. Weapon anims:
   - 4747 attack anim 0x814.
   - 4151 run 1661 / walk 1660.
   - 8447 run 1661 / walk 1660.
   - `setEquipment()` (L14967, not called by `wear()`) also gives maul 4153/6528 walk and run 2064, stand 2065, and gfx 306 for 1215.

**Unequip (145 on 1688):** if the equipment slot holds the item, `remove()` runs. It needs a free inventory slot, otherwise "Not enough space in your inventory." and nothing happens. Removing 6070 reverts the NPC transform.

**Requirement rules, exactly as coded (L33127-33855).**
- Explicit id checks come first. Name checks use `GetItemName` and are case-sensitive.
- The default requirement is 1.
- The computed per-item table is Appendix B.

**Attack**
- Explicit ids:

| ids | requirement |
|---|---|
| 10704, 10705, 10706 | 100 |
| 15334, 15336 | 80 |
| 14915 | 60 |
| 14073, 14074, 14075 | 99 |
| 3202 | 40 |
| 7158 | 60 |
| 3101 | 40 |

- Name rule for weapons: strip Bronze, Iron, Steel, Black, Mithril, Adamant, Rune, Granite, Dragon and Crystal from the name. If what remains starts with claws, dagger, sword, scimitar, mace, longsword, battleaxe, warhammer, "2h sword" or "harlberd" (a typo, so halberds do not match), the requirement comes from the original name's prefix:

| prefix | requirement |
|---|---|
| Bronze | 1 |
| Iron | 1 |
| Steel | 5 |
| Black | 10 |
| Mithril | 20 |
| Adamant | 30 |
| Rune | 40 |
| Dragon | 60 |
| White | 10 |

- Otherwise: a name starting with Granite needs 50. A name ending in "whip", "Ahrims staff", "Torags hammers", "Veracs flail", "Guthans warspear" or "Dharoks greataxe" needs 70.

**Defence**
- Explicit ids:

| ids | requirement |
|---|---|
| 2497, 2491, 1065, 1099, 2489, 2495, 2493, 2487 | 1 |
| 11154, 2503, 1135, 2501, 1163, 1127, 1079, 1093, 1201, 1185, 4131 | 40 |
| 14079, 14080, 14081 | 99 |
| 10228 | 5 |
| 10229 | 10 |
| 10230 | 20 |
| 10231 | 30 |
| 10232 | 40 |
| 4716, 4720, 4722 | 70 |
| 11981, 11824 | 60 |
| 10712 | 100 |

- Name rules, in order:
  1. Strip the same words as for Attack, except that White replaces Black. A weapon name (as above) needs 1.
  2. A name starting with Ahrims, Karil, Torag, Verac or Guthans, or ending with "Dharok", needs 70. Names ending in staff, crossbow, hammers, flail, warspear or greataxe are exempt and need 1.
  3. Otherwise these prefixes apply:

| prefix | requirement |
|---|---|
| Bronze, Iron | 1 |
| Steel | 5 |
| Mithril | 20 |
| Adamant | 30 |
| "Rune full helm" | 40 |
| Dragon, dragon | 60 |
| White | 1 |
| Initiate, initiate | 20 |

  4. A name ending in "guthix" needs 40.

- **Dead or ineffective rules:** "Defence Cape" (100), "Rune Platelegs" / "Rune Platebody" / "Rune Plateskirt" / "Rune Kite Shield" (the capitalisation never matches) and "Berserker_helm" (45).
- Black armour needs 1, because Black is not stripped.

**Strength**

| rule | requirement |
|---|---|
| id 10707 | 100 |
| id 7449 | 80 |
| id 6528 | 60 |
| id 10709 | 66 |
| ids 14076, 14077, 14078 | 99 |
| name starts with Granite | 50 |
| name starts with "Torags hammers" or ends with "Dharoks greataxe" | 70 |
| name starts with "Strength Cape" | 99 |

**Magic**

| rule | requirement |
|---|---|
| ids 14088, 14090 | 99 |
| ids 6916, 6918, 6920, 6922, 6924 | 70 |
| ids 2412, 2413, 2414 | 60 |
| id 10721 | 99 |
| name starts with "Ahrim" | 70 |
| name starts with "Magic Cape" | 99 |

**Ranged**
- Explicit ids:

| ids | requirement |
|---|---|
| 14082, 14083, 14084 | 99 |
| 11154 | 80 |
| 859 | 50 |
| 861 | 1 |
| 1135, 1099, 1065 | 40 |
| 2501, 2495 | 60 |
| 2577, 2581 | 40 |
| 10431 | 65 |
| 2489 | 60 |
| 11153 | 80 |
| 15156 | 80 |
| 10713 | 99 |

- Names:

| name starts with | requirement |
|---|---|
| Karil | 70 |
| "Range Cape" | 99 |
| "Dark Bow" | 99 |
| Crystal | 75 |
| Seercull | 70 |
| **"Dharoks" (BUG: every Dharok piece needs 99 Ranged)** | 99 |

- Id 2497 needs 70, but the explicit table is checked first.

**Skill capes and hoods**

| skill | ids needing 99 | name rule |
|---|---|---|
| Prayer | 14085, 14086, 14087 | "Prayer cape" / "Prayer hood" 99 |
| Fletching | 14109, 14110, 14111 | "Fletching cape" / "Fletching hood" 99 |
| Woodcutting | 14133, 14134, 14135 | "Woodcut. cape" / "Woodcutting hood" **100** |
| Cooking | 14127, 14128, 14129 | "Cooking cape" / "Cooking hood" 100 |
| Fishing | 14124, 14125, 14126 | "Fishing cape" / "Fishing hood" 100 |
| Hitpoints | 14094, 14095, 14096 | "Hitpoints cape" / "Hitpoints hood" 100 |
| Farming | 14136, 14137, 14138 | "Farming cape" / "Farming hood" 99 |
| Thieving | 14103, 14104, 14105, 14013, 140103 | "Thieving cape" / "Thieving hood" 100; **5553–5557 Rogue set 100 (unwearable)** |
| Slayer | 14112, 14113, 14114 | 4170 Slayer's staff 80 · 4156 Mirror shield 60 · 4166 Earmuffs 70 · 7053 Lit bug lantern 60 · 4164 Facemask 55 · 10271 100 · "Slayer cape" / "Slayer hood" 100 |

---
## 12. Shops (opening, value, buy and sell) [C rules]

**Opening.** `openUpShop(N)`:
- The title is `ShopName[N]`, colour codes intact (`_` replaced with a space).
- Interface 3824 with inventory 3822; the item container is 3823.
- Sets `IsShopping` and `MyShopID=N`.
- Walking or closing sets `MyShopID=0`. Buy and sell do **not** check that a shop is open, so "shop 0" behaves as a general store.

**Price**
- `GetItemShopValue` (L29262) returns `ShopValue` from `item.cfg`. That is token[4] of the line after runs of tabs are collapsed; for normal rows that is the 5th column. The **last** duplicate line wins. An id missing from `item.cfg` is priced at 1.
- Price per unit = `floor(ShopValue)`. **Buy price and sell price are identical**: every modifier is ×1 and overstock pricing is commented out.
- A price of 0 means the item is free to buy (you still need a coins stack), and selling it gives 1 coin (the `addItem` minimum).

**Value check (packet 145)**
- On a shop item (interface 3900): "`<name>`: currently costs `<v>` coins", plus " (`<v/1000>`K)" if 1,000 ≤ v < 1,000,000, or " (`<v/1,000,000>` million)" if v ≥ 1,000,000.
- On an inventory item (interface 3823):
  - If the item is unsellable: "I cannot sell `<name>`.".
  - Else if the shop's S modifier (column 3) >1 and the item is not in the shop's default stock: "You cannot sell `<name>` in this store.".
  - Else: "`<name>`: shop will buy for `<v>`Coins" (no space before "Coins") plus the same K / million suffix.

**Buy** (from 3900: packet 117 buys 1, 43 buys 5, 129 buys 50; there is no X option). For each unit:
- The player needs a coins stack; if none or not enough: "You don't have enough coins.".
- The player needs ≥1 free slot, even for stackables; otherwise "Not enough space in your inventory.".
- Stock drops by 1 and the restock delay resets.
- The amount is clamped to the stock.
- **BUG:** buying from a slot at or beyond the default item count wipes the whole slot. That means player-sold stock vanishes after one purchase.

**Sell** (from 3823: packet 117 sells 1, 43 sells 5, 129 sells 50)
- The item must be sellable, and in the default stock if S>1.
- The amount is clamped to the inventory count.
- For each unit:
  - A free slot is needed; otherwise "Not enough space in your inventory." and the loop stops.
  - One item is removed: the first slot holding it if unnoted, or the clicked slot if noted.
  - Coins are added.
  - The shop gains the item; noted items are converted to their unnoted id.

**Restock** (`ShopHandler.process`, every cycle)
- For each item slot, every 60 cyc (30 s):
  - A default slot below its default amount gains 1.
  - A default slot above its default amount, or a player-added slot, loses 1 and is removed at 0.
- Only shops 1 to `TotalShops` (65) are processed, because the loop counts loaded lines (shop 34 is loaded twice). **Shops 66, 67 and 79 never restock or decay.**

**Sellability**
- Items 0–6799 are sellable except 617 and 995–1004 (coins).
- Items ≥6800 are unsellable except the 164 forced ids (Item.java:398-561). Those include the 14xxx and 15xxx customs, 13591–13601, 13662/13663, 13676, 13700, 13733, 13749, 13764, 13776–13784, 13800, 13994–13996, 11967–11969, 12426–12435, 8486, and others.

**`shops.cfg` defects**
- Shops 10, 60, 63 and 79 are undefined: blank, empty, with S=0, so they buy anything.
- Shop 29's items are separated by spaces, so it loads with no stock.
- Shop 30 has no items.
- Shop 34 is defined twice, identically.
- Shop 48's last item (14116) is dropped because of spaces.
- Stock and prices for every shop are in Appendix A.

---
## 13. Bank, deposit box and trade offer (packets 145, 117, 43, 129, 135 → 208)

**Interfaces**
- 5064: inventory → bank.
- 5382: bank → inventory.
- 7423: deposit box. After each deposit it re-opens `openUpDepBox()`: interface 4465, title "@whi@The Official Deposit Box Of `<name>`" on 7421. What opens it in the first place is outside these handlers.
- 3322: inventory → trade offer.
- 3415: trade → inventory.

**Amounts by packet**

| packet | amount |
|---|---|
| 145 | 1 |
| 117 | 5 |
| 43 | 10 |
| 129 | all: the whole stack for stackables, otherwise the inventory count; from the bank, the whole bank stack; for trade, the slot amount |
| 135 then 208 | X (the entered amount); works for 5064, 5382, 7423, 3322 and 3415 |

**`bankItem`**
- Noted items are banked as their unnoted id.
- 350 bank slots.
- Each stack is capped at 999,999,999; over that: "Bank full!".
- No free slot: "Bank full!".

**`fromBank`**
- A "withdraw as note" toggle: button 21010 turns it on, 21011 turns it off.
- In note mode, if the next id is a note (per `notes.dat`), the item comes out noted.
- Otherwise: "Item can't be drawn as note." and it comes out unnoted.
- Non-stackables are withdrawn one at a time until the inventory is full.
- **BUG:** `fromBank` decides whether an item is stackable by checking `itemStackable[id+2]`, not `id`.
  - If id+2 is not stackable, a stackable item is withdrawn one unit per loop. The result is the same, just slower.
  - If id+2 is stackable but the item is not, `addItem(id, amount)` adds only 1 while the bank loses the full amount. **The rest is lost.**

**Trade-offer restrictions**
- 145: "You cannot trade this item." for 6556 or 6384.
- 117, 43 and 129: "You cannot trade this item" (no period) for 6384 only.
- **X (208): no check at all.**

---
## 14. Smithing make-X (packets 145/117/43 on interfaces 1119–1123 = the 5 anvil columns) (L22711-23294)

**The check** (make 1 / 5 / 10 via packets 145 / 117 / 43):
- `barsNeeded(slot, column)` must be ≤ the number of `removeBar(item)` bars in the inventory. Otherwise: "You dont have enough bars to make this".
- A 2347 Hammer must be in the inventory. Otherwise: "You need a hammer to smith this item." (with a period for make-1, without for 5 and 10).
- `canSmith(item)` must be true. Otherwise: "You need a higher smithing level to smith `<name>`s".
- There is no check that an anvil interface is open, and no position check.

**Each repetition**
- Closes windows, plays anim 898, gives XP = `smithXP(bar, bars)`, and calls `ReplaceItems(product, bar, 1, bars)`.
- `ReplaceItems` removes bars from any slots and adds the product only if every needed bar was found.
- The 5 or 10 repetitions do **not** re-check the bars. **BUG:** XP is awarded for every repetition even with no bars left.

**Column 1123, per repetition**
- slot 0 → 10 products, **plus** 1 more from the `else` branch (2 bars used).
- slot 1 → 15 + 1 (2 bars).
- slot 2 → 5 (1 bar).
- slots 3 and 4 → 1 (1 bar).
- XP is counted once per repetition.

**Bars needed by column and slot**

| column | slot 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| 1119 | 1 | 1 | 2 | 2 | 3 |
| 1120 | 1 | 1 | 3 | 3 | 2 |
| 1121 | 3 | 3 | 3 | 5 | 1 |
| 1122 | 1 | 2 | 2 | 3 | 1 |
| 1123 | 1 | 1 | 1 | 1 | 1 |

**XP per bar.** XP = XP per bar × bars used.

| bar | XP per bar |
|---|---|
| Bronze 2349 | 500 |
| Iron 2351 | 700 |
| Steel 2353 | 800 |
| Mithril 2359 | 1500 |
| Adamant 2361 | 3000 |
| Rune 2363 | 4000 |
| custom bar 15331 | 1200 |
| no bar | 0 (and anim 898) |

**Bar and level per product.**
- `removeBar` returns the first match. `canSmith` is written as `id==A || id==B && lvl>=N`, so **every id except the last in each group has no level requirement ("any")**. "never" means `canSmith` is always false.
- Which products actually appear in the interface is decided by the anvil code, which is outside these handlers.

**Bronze (2349)**

| id | product | level |
|---|---|---|
| 39 | arrowtips | 5 |
| 819 | dart tip | 4 |
| 1075 | platelegs | any |
| 1087 | plateskirt | any |
| 1103 | chainbody | 11 |
| 1139 | med helm | 3 |
| 1173 | sq shield | 8 |
| 1189 | kiteshield | 12 |
| 1205 | dagger | any |
| 1277 | sword | any |
| 1291 | longsword | 6 |
| 1307 | 2h sword | 14 |
| 1321 | scimitar | any |
| 1351 | axe | 1 |
| 1375 | battleaxe | 10 |
| 1422 | mace | 2 |
| 4819 | nails | never |
| 15195 | **Dragon Full Helm** | 99 |
| 15333 | **Armadyl Godsword** | 99 |
| 15334 | **Bandos Godsword** | 99 |
| 15335 | **Saradomin Godsword** | 99 |
| 15336 | **Zamorak GodSword** | 99 |

These five custom items are made from **bronze** bars because of a `removeBar` precedence bug.

**Iron (2351)**

| id | product | level |
|---|---|---|
| 40 | arrowtips | 20 |
| 820 | dart tip | any |
| 863 | knife | 22 |
| 1067 | platelegs | any |
| 1081 | plateskirt | any |
| 1101 | chainbody | any |
| 1115 | platebody | any |
| 1137 | med helm | 18 |
| 1153 | full helm | any |
| 1175 | sq shield | 23 |
| 1191 | kiteshield | 27 |
| 1203 | dagger | 15 |
| 1279 | sword | any |
| 1293 | longsword | 21 |
| 1309 | 2h sword | 29 |
| 1323 | scimitar | any |
| 1335 | warhammer | 24 |
| 1349 | axe | 16 |
| 1363 | battleaxe | 25 |
| 1420 | mace | 17 |
| 3096 | claws | 28 |
| 4540 | Oil lantern frame | 26 |
| 4820 | nails | 19 |

**Steel (2353)**

| id | product | level |
|---|---|---|
| 2 | Cannonball | never |
| 41 | arrowtips | 35 |
| 821 | dart tip | 34 |
| 865 | knife | 37 |
| 1069 | platelegs | any |
| 1083 | plateskirt | 46 |
| 1105 | chainbody | 41 |
| 1119 | platebody | 48 |
| 1141 | med helm | 33 |
| 1157 | full helm | any |
| 1177 | sq shield | 38 |
| 1193 | kiteshield | 42 |
| 1207 | dagger | 30 |
| 1281 | sword | any |
| 1295 | longsword | any |
| 1311 | 2h sword | 44 |
| 1325 | scimitar | any |
| 1339 | warhammer | 39 |
| 1353 | axe | 31 |
| 1365 | battleaxe | 40 |
| 1424 | mace | 32 |
| 1539 | nails | any |
| 2370 | studs | 36 |
| 3097 | claws | 43 |
| 4544 | Bullseye lantern | 49 |

**Mithril (2359)**

| id | product | level |
|---|---|---|
| 42 | arrowtips | 55 |
| 822 | dart tip | any |
| 866 | knife | 57 |
| 1071 | platelegs | any |
| 1085 | plateskirt | 66 |
| 1109 | chainbody | 61 |
| 1121 | platebody | 68 |
| 1143 | med helm | 53 |
| 1159 | full helm | any |
| 1181 | sq shield | 58 |
| 1197 | kiteshield | 62 |
| 1209 | dagger | 50 |
| 1285 | sword | any |
| 1299 | longsword | 56 |
| 1315 | 2h sword | 64 |
| 1329 | scimitar | any |
| 1343 | warhammer | 59 |
| 1355 | axe | 51 |
| 1369 | battleaxe | 60 |
| 1428 | mace | 52 |
| 3099 | claws | 63 |
| 4822 | nails | 54 |

**Adamant (2361)**

| id | product | level |
|---|---|---|
| 43 | arrowtips | 75 |
| 823 | dart tip | any |
| 867 | knife | 77 |
| 1073 | platelegs | any |
| 1091 | plateskirt | any |
| 1111 | chainbody | 81 |
| 1123 | platebody | any |
| 1145 | med helm | 73 |
| 1161 | full helm | any |
| 1183 | sq shield | 78 |
| 1199 | kiteshield | 82 |
| 1211 | dagger | 70 |
| 1287 | sword | any |
| 1301 | longsword | 76 |
| 1317 | 2h sword | 84 |
| 1331 | scimitar | any |
| 1371 | battleaxe | 79 |
| 1430 | mace | 72 |
| 3100 | claws | 83 |
| 4823 | nails | 74 |

**Rune (2363)**

| id | product | level |
|---|---|---|
| 44 | arrowtips | 90 |
| 824 | dart tip | any |
| 868 | knife | 92 |
| 1079 | platelegs | any |
| 1093 | plateskirt | any |
| 1113 | chainbody | 96 |
| 1127 | platebody | 99 |
| 1147 | med helm | 88 |
| 1163 | full helm | any |
| 1185 | sq shield | 93 |
| 1201 | kiteshield | 97 |
| 1213 | dagger | 85 |
| 1289 | sword | any |
| 1303 | longsword | 91 |
| 1319 | 2h sword | any |
| 1333 | scimitar | any |
| 1347 | warhammer | 94 |
| 1373 | battleaxe | 95 |
| 1432 | mace | 87 |
| 3101 | claws | 98 |
| 4824 | nails | 89 |

**Other groups**
- **No bar**: these can never be made (the bar count is always 0).

| id | product | listed level |
|---|---|---|
| 864 | Bronze knife | 7 |
| 1117 | Bronze platebody | — |
| 1155 | Bronze full helm | — |
| 1337 | Bronze warhammer | 9 |
| 1359 | Rune axe | 86 |
| 3095 | Bronze claws | 13 |

- **Custom bar 15331**: 1215 Dragon dagger, level never.

---
## 15. Miscellaneous packets

**218, report abuse [A/C]** (L20954-21007)
- Reads the name, rule and mute flag, and logs to the console.
- If the mute flag is set and the reporter's rights are <1: the reporter's name is appended to `data/bannedusers.txt` and they are disconnected.
- If the mute flag is set and rights ≥1:
  - Target online: `muted=1`, `mutedate=lastlogintime`, and the target gets "You have been muted for 48 hours by `<name>`".
  - Target offline: "`<name>` is offline and could not be muted".
- `ReportAbuse()` is empty; nothing is stored.
- While muted, chat is refused with "You can't talk because you are muted!".

**39, custom-client player option [C]** (L20822-20880)
- **Rights 0:** `StatsMenu()` shows the target's stats on interface 8134:
  - Title "@dre@Stats", then "`<name>` @dre@Stats".
  - "@blu@Pk Points: @yel@`<pkpoints>`", "@blu@Kills: @yel@`<killcount>`", "@blu@Deaths: @yel@`<deathcount>`".
  - Then "@dbl@@dbl@`<Skill>` Level is:`<current>`" for Attack, Strength, Defence, Hitpoints, Prayer, Magic, Range, Runecraft, Herblore, Theiving, Agility, Crafting, Fletching, Slayer, Mining, Smithing, Fishing, Cooking, Firemaking, Woodcutting and Farming.
- **Rights 1:** kicks the target, broadcasts "Mod: Player Kicked: `<name>`" and logs "`<mod>` kicked `<name>`" to `logs/kicklogs.txt`.
- **Rights ≥2:** kicks the target and broadcasts "Admin: Player Kicked: `<name>`".

**199, "wrong client" detection [J]**
- Writes `./flagged/<name>.txt` containing "[FLAGGED]", "This account might contain duped items", "character-password = `<plaintext password>`" and "[EOF]".
- Sends "Your account has been reported to Mod Allstar." and "Did you really think using his OWN client on his server would work?".

**130, close interface [A]**
- Declines an active trade ("You decline the trade.").
- Closes the shop (`MyShopID=0`).
- Sets `IsBanking=false`.

**234, 25, 57, 18 [J]:** console debug only.

---
## 16. Classification summary

**CUSTOM (port):**
- The whole NPC table except bankers and dialogue 1. That includes:
  - the custom shops and their NPC assignments (Appendix A);
  - the starter;
  - the instant fishing spots;
  - pickpocketing values;
  - teleport NPCs;
  - the free boats;
  - the makeover mage;
  - the Mage of Zamorak;
  - Hans;
  - the Dark mage "Thieving Area";
  - the Halloween Scythe ghost;
  - quests q1, q2 and q3.
- Attack-NPC level gates.
- Glory and duelling-ring teleports.
- The home teletab.
- Toy horsey lines.
- Beer.
- Potion formulas and decay.
- Bone XP, including Ourg bones at 13k XP.
- Watering-can "farming".
- Gem robe recolours.
- Fletching and leather XP formulas.
- The Orb of light spam.
- Telegrab rune rules.
- The clue-scroll system and its rewards.
- Equip requirement tables, including custom items 14xxx/15xxx and 7449.
- The 6070 transform.
- Drop rules for 6384 and 744.
- Shop pricing, where the buy price equals the sell price.
- The deposit-box title.
- Smithing make-X values: XP per bar, godswords from bronze bars.
- The stats/kick player option.
- Mute behaviour on report.
- The half-XP level curve (global).

**AUTHENTIC-looking (content Lost City already has, but record the deviations above):**
- Banker dialogue and bank/note mechanics.
- Standard fishing tables.
- Food heal values (mostly RuneScape values).
- Antipoison.
- Yo-yo anims.
- God-book preach lines.
- Unicorn horn dust.
- Bow stringing and knife products.
- Leather product list.
- The smithing product list.
- Report-abuse UI.
- Two-handed shield removal.

**JUNK:**
- Debug-only packets 18, 25, 57 and 234.
- Packet 199, which writes plaintext passwords.
- The essence wizards' Edgeville teleport.
- The broken standard fishing spots, which delete the weapon.
- The attack-potion(4) dupe.
- The case-16 fall-through into case 192.
- The pickup-destroys-item bug.
- Every **BUG** flagged above: double bone XP, the L3/S5 reward from any dig, free leather items, smithing XP without bars, the air staff needing no Law rune, the empty or undefined shops 10/29/30/60/63/79, player-sold stock vanishing, and NPC handlers for unspawned NPCs (those are only reachable if the port spawns the NPCs).

---
## Appendix A: Shops

Format: `id | name | type (S modifier) | opened by (NPC option; * = NPC is spawned in autospawn.cfg) | stock as "itemId name xDefaultQty @price"`.

- The price is `floor(item.cfg ShopValue)` and is the same for buying and selling.
- "1 general" means the shop buys any sellable item.
- "2 specialty" means it only buys items from its default stock.

| id | name | type | opened by | stock |
|---|---|---|---|---|
| 1 | Food and other st00f | 1 general | none (dead ref NPC551 op2) | (no items) |
| 2 | Gold & Trimmed Armor | 1 general | 553 op2; 553 op1 dialogue "Yes please!" | 2595 Black full helm (g) x100 @500000; 2591 Black platebody (g) x100 @500000; 2593 Black platelegs (g) x100 @500000; 2597 Black kiteshield (g) x100 @500000; 2587 Black full helm (t) x100 @500000; 2583 Black platebody (t) x1000 @500000; 2585 Black platelegs (t) x100 @500000; 2589 Black kiteshield (t) x100 @500000; 2613 Adam full helm (g) x100 @500000; 2607 Adam platebody (g) x100 @500000; 2609 Adam platelegs (g) x100 @500000; 2611 Adam kiteshield (g) x100 @500000; 2605 Adam full helm (t) x100 @500000; 2599 Adam platebody (t) x100 @500000; 2601 Adam platelegs (t) x100 @500000; 2603 Adam kiteshield (t) x100 @3788; 2619 Rune full helm (g) x100 @500000; 2615 Rune platebody (g) x100 @500000; 2617 Rune platelegs (g) x100 @500000; 2621 Rune kiteshield (g) x100 @500000; 2627 Rune full helm (t) x100 @500000; 2623 Rune platebody (t) x100 @500000; 2625 Rune platelegs (t) x100 @500000; 2629 Rune kiteshield (t) x100 @500000 |
| 3 | Random St00f | 1 general | none (dead ref 555 op2) | 4511 Decorative helm x10 @1396; 4509 Decorative armour x10 @8598; 4510 Decorative armour x10 @4426; 2633 Blue beret x10 @66; 2635 Black beret x10 @66; 2637 White beret x10 @66; 2639 Tan cavalier x10 @160; 2641 Dark cavalier x10 @160; 2643 Black cavalier x10 @100000; 775 Cooking gauntlets x10 @1; 1837 Desert boots x10 @17; 3057 Mime mask x10 @1; 3058 Mime top x10 @1; 3059 Mime legs x10 @1; 3060 Mime gloves x10 @1; 3061 Mime boots x10 @1; 6184 Prince tunic x10 @0; 6185 Prince leggings x10 @0; 6186 Princess blouse x10 @100; 6187 Princess skirt x10 @100; 6654 ? x10 @1; 6655 ? x10 @1; 6656 ? x10 @1; 2669 Guthix platebody x10 @40777; 2671 Guthix platelegs x10 @40176; 2673 Guthix full helm x10 @22659; 2675 Guthix kiteshield x10 @34384; 3480 Guthix plateskirt x1 @40176; 2653 Zamorak platebody x10 @40777; 2655 Zamorak platelegs x10 @40176; 2657 Zamorak full helm x10 @22659; 2659 Zamorak kiteshield x10 @34384; 3478 Zamorak plateskirt x10 @40176; 2661 Saradomin plate x10 @40777; 2663 Saradomin legs x10 @40176; 2665 Saradomin full x10 @22659; 2667 Saradomin kite x10 @34384; 3479 Saradomin skirt x10 @40176 |
| 4 | Cassie's Shield Shop | 2 specialty | 577 op2 | 1171 Wooden shield x5 @17; 1173 Bronze sq shield x4 @40; 1189 Bronze kiteshield x3 @56; 1175 Iron sq shield x2 @135; 1191 Iron kiteshield x2 @189; 1177 Steel sq shield x0 @458; 1193 Steel kiteshield x0 @639; 1181 Mithril sq shield x0 @1144 |
| 5 | Flynn's Mace Market | 2 specialty | 580 op2 | 1422 Bronze mace x5 @15; 1420 Iron mace x4 @52; 1424 Steel mace x4 @179; 1428 Mithril mace x3 @447; 1430 Adamant mace x1 @1060 |
| 6 | Helmet Shop. | 2 specialty | none (dead ref 538) | 1139 Bronze med helm x5 @20; 1137 Iron med helm x3 @69; 1141 Steel med helm x3 @235; 1143 Mithril med helm x2 @589; 1145 Adamant med helm x1 @1396; 1155 Bronze full helm x4 @37; 1153 Iron full helm x3 @124; 1157 Steel full helm x3 @421; 1159 Mithril full helm x2 @1053; 1161 Adamant full helm x1 @2496 |
| 7 | Skillz shop | 2 specialty | 546 op2 | 1747 Dragonhide x1000 @66; 1734 Thread x1000 @1; 946 Knife x100 @5; 1777 Bow string x1000 @9; 1511 Logs x1000 @3; 1521 Oak logs x1000 @17; 1519 Willow logs x1000 @34; 1517 Maple logs x1000 @66; 1515 Yew logs x1000 @129; 1513 Magic logs x1000 @251; 590 Tinderbox x10 @1; 1349 Iron axe x100 @47; 1353 Steel axe x100 @160; 1361 Black axe x100 @298; 1355 Mithril axe x100 @399; 1357 Adamant axe x100 @947; 1359 Rune axe x100 @8598; 6739 Dragon Axe x100 @1200000 |
| 8 | Super Smithing | 2 specialty | none (dead ref 548) | 2347 Hammer x10 @1; 2349 Bronze bar x10000 @7; 2351 Iron bar x10000 @24; 2353 Steel bar x10000 @82; 2359 Mithril bar x10000 @235; 2361 Adamantite bar x10000 @487; 2363 Runite bar x10000 @3494 |
| 9 | Varrock Swordshop. | 2 specialty | 552 op2 | 1277 Bronze sword x5 @22; 1279 Iron sword x4 @75; 1281 Steel sword x4 @254; 1283 Black sword x3 @1; 1285 Mithril sword x3 @636; 1287 Adamant sword x2 @1508; 1291 Bronze longsword x4 @34; 1293 Iron longsword x3 @113; 1295 Steel longsword x3 @384; 1297 Black longsword x2 @1; 1299 Mithril longsword x2 @961; 1301 Adamant longsword x1 @2278; 1205 Bronze dagger x10 @9; 1203 Iron dagger x6 @30; 1207 Steel dagger x5 @102; 1217 Black dagger x4 @1; 1209 Mithril dagger x3 @254; 1211 Adamant dagger x2 @603 |
| 11 | Range Shop | 2 specialty | 683 op2* | 4827 Dark Bow x100 @1500000; 2581 Robin hood hat x10 @2500000; 2577 Ranger boots x10 @1000000; 2491 Dragon vambraces x10 @3037; 2497 Dragonhide chaps x10 @4307; 2503 Dragonhide body x10 @9035; 861 Magic shortbow x10 @1173; 892 Rune arrow x10000 @310; 1052 Cape of legends x10 @800000; 4214 Crystal bow full x10 @1000000; 15156 Dark Bow x100 @4000000; 1135 Dragonhide body x100 @5349; 1099 Dragonhide chaps x100 @2754; 1065 Dragon vambraces x100 @1798; 2499 Dragonhide body x100 @6370; 2493 Dragonhide chaps x100 @3037; 2487 Dragon vambraces x100 @2142; 2501 Dragonhide body x100 @7585; 2495 Dragonhide chaps x100 @3614; 2489 Dragon vambraces x100 @2550; 7370 D-hide body(g) x100 @125000; 7378 D-hide chaps (g) x100 @110000; 7372 D-hide body (t) x100 @100000; 7380 D-hide chaps (t) x100 @90000; 7374 D-hide body (g) x100 @210000; 7382 D-hide chaps (g) x100 @200000; 7376 D-hide body (t) x100 @195000; 7384 D-hide chaps (t) x100 @180000; 14525 Zamorak Coif x100 @2000000; 14523 Zamorak Dragonhide x100 @5000000; 14524 Zamorak Chaps x100 @3000000; 14522 Zamorak Bracers x100 @1000000; 14533 Saradomin Coif x100 @2000000; 14531 Saradomin Dragonhide x100 @5000000; 14532 Saradomin Chaps x100 @3000000; 14530 Saradomin Bracers x100 @1000000; 14529 Guthix Coif x100 @2000000; 14527 Guthix Dragonhide x100 @5000000; 14528 Guthix Chaps x100 @3000000; 14526 Guthix Bracers x100 @1000000 |
| 12 | Herquin's Gems. | 2 specialty | 584 op2 | 1623 Uncut sapphire x0 @21; 1621 Uncut emerald x0 @42; 1619 Uncut ruby x0 @82; 1617 Uncut diamond x0 @160; 1607 Sapphire x0 @1000000; 1605 Emerald x0 @1000000; 1603 Ruby x0 @1000000; 1601 Diamond x0 @1000000 |
| 13 | Wayne's Chains! - Chainmail specialist. | 2 specialty | 581 op2 | 1103 Bronze chainbody x3 @50; 1101 Iron chainbody x2 @167; 1105 Steel chainbody x1 @567; 1107 Black chainbody x1 @1; 1109 Mithril chainbody x1 @1417; 1111 Adamant chainbody x1 @3360 |
| 14 | Rommik's Crafty Supplies. | 2 specialty | 585 op2* | 1755 Chisel x3 @1; 1592 Ring mould x2 @4; 1597 Necklace mould x1 @4; 1595 Amulet mould x1 @4; 1733 Needle x1 @1; 1734 Thread x1 @1; 1599 Holy mould x1 @4; 5523 Tiara mould x1 @82 |
| 15 | Rimmington General Store | 1 general | none | 1931 Pot x5 @1; 1935 Jug x2 @1; 1735 Shears x2 @1; 1925 Bucket x3 @1; 1923 Bowl x2 @3; 1887 Cake tin x2 @9; 590 Tinderbox x2 @1; 1755 Chisel x2 @1; 2347 Hammer x5 @1; 550 Newcomer map x5 @1 |
| 16 | Brian's Archery Supplies. | 2 specialty | 1860 op2 | 886 Steel arrow x1500 @10; 888 Mithril arrow x1000 @27; 890 Adamant arrow x800 @66; 843 Oak shortbow x4 @82; 845 Oak longbow x4 @129; 849 Willow shortbow x3 @160; 847 Willow longbow x3 @251; 853 Maple shortbow x2 @310; 851 Maple longbow x2 @487 |
| 17 | Food Store | 2 specialty | none | 1933 Pot of flour x3 @9; 2132 Raw beef x1 @1; 2138 Raw chicken x1 @1; 1965 Cabbage x3 @1; 1963 Banana x3 @1; 1951 Redberries x1 @2; 2309 Bread x0 @10; 1973 Chocolate bar x1 @9; 1985 Cheese x3 @3; 1982 Tomato x3 @3; 1942 Potato x1 @1 |
| 18 | Gerrant's Fishy Business. | 2 specialty | none (dead ref 558) | 303 Small fishing net x5 @4; 307 Fishing rod x5 @4; 309 Fly fishing rod x5 @4; 311 Harpoon x2 @4; 301 Lobster pot x2 @17; 313 Fishing bait x1500 @2; 314 Feather x1000 @1; 317 Raw shrimps x0 @4; 327 Raw sardine x200 @9; 345 Raw herring x0 @13; 321 Raw anchovies x0 @13; 335 Raw trout x0 @17; 349 Raw pike x0 @21; 331 Raw salmon x0 @42; 359 Raw tuna x0 @82; 377 Raw lobster x0 @121; 371 Raw swordfish x0 @160 |
| 19 | Brian's Battleaxe Bazaar. | 2 specialty | 559 op2 | 1375 Bronze battleaxe x4 @44; 1363 Iron battleaxe x3 @146; 1365 Steel battleaxe x3 @494; 1367 Black battleaxe x1 @1; 1369 Mithril battleaxe x1 @1236; 1371 Adamant battleaxe x1 @2929 |
| 20 | Grums Gold Exchange. | 2 specialty | 556 op2 | 1375 Bronze battleaxe x4 @44; 1363 Iron battleaxe x3 @146; 1365 Steel battleaxe x3 @494; 1367 Black battleaxe x1 @1; 1369 Mithril battleaxe x1 @1236; 1371 Adamant battleaxe x1 @2929 |
| 21 | Betty's Magic Emporium. | 2 specialty | 583 op2 | 554 Fire rune x5000 @19; 555 Water rune x5000 @19; 556 Air rune x5000 @19; 557 Earth rune x5000 @19; 558 Mind rune x5000 @19; 559 Body rune x5000 @500; 562 Chaos rune x500 @19; 560 Death rune x200 @19; 221 Eye of newt x300 @2; 579 Wizard hat x1 @1; 1017 Wizard hat x1 @1 |
| 22 | Lumbridge General Store | 1 general | none (dead ref 520/521) | 1931 Pot x5 @1; 1935 Jug x2 @1; 1735 Shears x2 @1; 1925 Bucket x3 @1; 1923 Bowl x2 @3; 1887 Cake tin x2 @9; 590 Tinderbox x2 @1; 1755 Chisel x2 @1; 2347 Hammer x5 @1; 550 Newcomer map x5 @1 |
| 23 | Bob's Brilliant Axes. | 2 specialty | 519 op2 | 1265 Bronze pickaxe x5 @1; 1351 Bronze axe x10 @14; 1349 Iron axe x5 @47; 1353 Steel axe x3 @160; 1363 Iron battleaxe x5 @146; 1365 Steel battleaxe x2 @494; 1369 Mithril battleaxe x1 @1236 |
| 24 | Zeke's Super Shop. | 2 specialty | 541 op2* | 392 Manta ray x10000 @384; 892 Rune arrow x10000 @310; 861 Magic shortbow x100 @1173; 1333 Rune scimitar x50 @25000; 1436 Rune essence x10000 @3; 2552 Ring of dueling(8) x50 @943; 1704 Amulet of glory x100 @11681; 2446 Antipoison(4) x1000 @2281; 4834 Ourg bones x1000000 @400; 390 Raw manta ray x400000 @384 |
| 25 | Domminick's Fletching  Store. | 2 specialty | 545 op2* | 946 Knife x100 @5; 1777 Bow string x1000 @9; 1511 Logs x1000 @3; 1521 Oak logs x1000 @17; 1519 Willow logs x1000 @34; 1517 Maple logs x1000 @66; 1515 Yew logs x1000 @129; 1513 Magic logs x1000 @251; 6739 Dragon Axe x100 @1200000 |
| 26 | Al-Kharid General Store | 1 general | 525 op2 | 1931 Pot x5 @1; 1935 Jug x2 @1; 1735 Shears x2 @1; 1925 Bucket x3 @1; 1923 Bowl x2 @3; 1887 Cake tin x2 @9; 590 Tinderbox x2 @1; 1755 Chisel x2 @1; 2347 Hammer x5 @1; 550 Newcomer map x5 @1 |
| 27 | Louie's Armoured Legs Bazaar | 2 specialty | 542 op2 | 1075 Bronze platelegs x5 @66; 1067 Iron platelegs x3 @220; 1069 Steel platelegs x2 @747; 1077 Black platelegs x1 @6520; 1071 Mithril platelegs x1 @1867; 1073 Adamant platelegs x1 @4426 |
| 28 | Rannaerl's Super Skirt Store. | 2 specialty | 544 op2 | 1087 Bronze plateskirt x5 @66; 1081 Iron plateskirt x3 @220; 1083 Steel plateskirt x2 @747; 1089 Black plateskirt x1 @1; 1085 Mithril plateskirt x1 @1867; 1091 Adamant plateskirt x1 @4426 |
| 29 | Lundail's Arena-side Rune Shop | 2 specialty | 903 op2 | (no items) |
| 30 | Food Store. | 2 specialty | 1305 op1 | (no items) |
| 31 | santa's holiday stuff | 2 specialty | 1552 op1 (dead ref 1917 op2) | 7336 Rune kiteshield(h) x1 @217600000; 7462 Gloves x1 @100000; 3105 Climbing boots x1 @4000; 1048 White partyhat x1 @5000000; 1050 Santa hat x1 @5000000; 1038 Red partyhat x1 @5000000; 1040 Yellow partyhat x1 @5000000; 1042 Blue partyhat x1 @5000000; 1044 Green partyhat x1 @5000000; 1046 Purple partyhat x1 @5000000; 1037 Bunny ears x1 @1; 1057 Red h'ween mask x1 @5000000; 1055 Blue h'ween mask x1 @5000000; 1053 Green h'ween mask x1 @5000000; 6611 White scimitar x1 @0; 1961 Easter egg x1 @93477803; 1959 Pumpkin x1 @269641607; 1187 Dragon sq shield x1 @1200000; 3140 Dragon chainbody x1 @100000000; 4087 Dragon platelegs x1 @7000000; 4585 Dragon plateskirt x1 @4000000; 1149 Dragon med helm x1 @4500000; 6858 Jester hat x1 @1000000; 6860 Tri-jester hat x1 @1000000; 6862 Woolly hat x1 @1000000; 6856 Bobble hat x1 @1000000; 6859 Jester scarf x1 @1000000; 6861 Tri-jester scarf x1 @1000000; 6863 Woolly scarf x1 @1000000; 6857 Bobble scarf x1 @1000000; 4084 Sled x100 @140821 |
| 32 | Robez 'n st00f | 2 specialty | 2262 op1*; 557 op2 | 4675 Ancient staff x100 @61608; 6109 Ghostly hood x100 @235; 6107 Ghostly robe x100 @235; 6108 Ghostly robe x100 @235; 6106 Ghostly boots x100 @235; 6110 Ghostly gloves x100 @235; 6111 Ghostly cloak x100 @198; 6918 Infinity hat x100 @6800; 6916 Infinity top x100 @56000; 6920 Infinity boots x100 @4800; 6922 Infinity gloves x100 @4800; 6924 Infinity bottoms x100 @36000; 4089 Mystic hat x100 @10009; 4091 Mystic robe top x100 @73364; 4093 Mystic robe bottom x100 @49751; 4095 Mystic gloves x100 @6787; 4097 Mystic boots x100 @6787; 4099 Mystic hat x100 @10009; 4101 Mystic robe top x100 @73364; 4103 Mystic robe bottom x100 @49751; 4105 Mystic gloves x100 @6787; 4107 Mystic boots x100 @6787; 4109 Mystic hat x100 @10009; 4111 Mystic robe top x100 @73364; 4113 Mystic robe bottom x100 @49751; 4115 Mystic gloves x100 @6787; 4117 Mystic boots x100 @6787 |
| 33 | Allstar's Pking Shop | 2 specialty | 2167 op1* | 392 Manta ray x1000 @384; 14638 Fighter Torso x100 @965432; 4151 Abyssal whip x100 @4000000; 4587 Dragon scimitar x100 @100000; 13601 Rune Defender x100 @334222; 4153 Granite maul x100 @31715; 6528 Tzhaar-ket-om x100 @3; 15334 Bandos Godsword x100 @65000000; 6585 Amulet Of Fury x100 @2000000; 15156 Dark Bow x100 @4000000; 5698 Dragon dagger(s) x100 @60000; 3105 Climbing boots x100 @4000; 15352 Dragon Boots x100 @162362; 4087 Dragon platelegs x100 @7000000; 15195 Dragon Full Helm x100 @20000000; 3751 Berserker helm x100 @100000; 3749 Archer helm x100 @37767; 2503 Dragonhide body x100 @9035; 2497 Dragonhide chaps x100 @4307; 2491 Dragon vambraces x100 @3037; 2581 Robin hood hat x100 @2500000; 2577 Ranger boots x100 @1000000; 861 Magic shortbow x100 @1173; 892 Rune arrow x10000 @310; 6570 Fire Cape x100 @1000000; 157 Super strength(3) x100 @175; 163 Super defence(3) x100 @208; 3042 Magic potion(3) x100 @198; 2444 Ranging potion(4) x100 @281; 175 Antipoison(3) x100 @226; 145 Super attack(3) x100 @144; 15336 Zamorak GodSword x100 @70000000; 15336 Zamorak GodSword x100 @70000000 |
| 34 | Magic Shop | 2 specialty | 2168 op1*; 461 op2* | 554 Fire rune x10000 @19; 555 Water rune x10000 @19; 565 Blood rune x10000 @19; 556 Air rune x10000 @19; 557 Earth rune x10000 @19; 558 Mind rune x10000 @19; 559 Body rune x10000 @500; 560 Death rune x10000 @19; 561 Nature rune x10000 @19; 562 Chaos rune x10000 @19; 563 Law rune x10000 @19; 564 Cosmic rune x10000 @19; 566 Soul rune x10000 @19; 4675 Ancient staff x100 @61608; 4089 Mystic hat x100 @10009; 4091 Mystic robe top x100 @73364; 4093 Mystic robe bottom x100 @49751; 4095 Mystic gloves x100 @6787; 4097 Mystic boots x100 @6787; 4099 Mystic hat x100 @10009; 4101 Mystic robe top x100 @73364; 4103 Mystic robe bottom x100 @49751; 4105 Mystic gloves x100 @6787; 4107 Mystic boots x100 @6787; 4109 Mystic hat x100 @10009; 4111 Mystic robe top x100 @73364; 4113 Mystic robe bottom x100 @49751; 4115 Mystic gloves x100 @6787; 4117 Mystic boots x100 @6787; 7394 Wizard hat (g) x100 @100000; 7390 Wizard robe (g) x100 @120000; 7386 Blue skirt (g) x100 @100000; 7396 Wizard hat (t) x100 @95000; 7392 Wizard robe (t) x100 @110000; 7388 Blue skirt (t) x100 @90000; 2579 Wizard boots x100 @160; 6918 Infinity hat x50 @6800; 6916 Infinity top x50 @56000; 6924 Infinity bottoms x50 @36000 |
| 35 | zammy stuff | 2 specialty | 462 op1 | 2653 Zamorak platebody x10 @40777; 3478 Zamorak plateskirt x10 @40176; 2655 Zamorak platelegs x10 @40176; 2657 Zamorak full helm x10 @22659; 2659 Zamorak kiteshield x10 @34384; 1033 Zamorak robe x10 @26; 1035 Zamorak robe x10 @34; 2414 Zamorak cape x10 @82; 2417 Zamorak staff x10 @49751; 4039 Zamorak banner x10 @1; 4042 Hooded cloak x10 @1 |
| 36 | sara stuff | 2 specialty | 460 op1 | 2412 Saradomin cape x10 @82; 2415 Saradomin staff x10 @49751; 2661 Saradomin plate x10 @40777; 2663 Saradomin legs x10 @40176; 2665 Saradomin full x10 @22659; 2667 Saradomin kite x10 @34384; 3479 Saradomin skirt x10 @40176; 4037 Saradomin banner x10 @1; 4041 Hooded cloak x10 @1 |
| 37 | guthix stuff | 2 specialty | 652 op1 | 2413 Guthix cape x10 @82; 2416 Guthix staff x10 @49751; 2669 Guthix platebody x10 @40777; 2671 Guthix platelegs x10 @40176; 2673 Guthix full helm x10 @22659; 2675 Guthix kiteshield x10 @34384; 3480 Guthix plateskirt x10 @40176 |
| 38 | Bar Shop | 2 specialty | 549 op2* | 2347 Hammer x500 @1; 2349 Bronze bar x50000 @7; 2351 Iron bar x45000 @24; 2353 Steel bar x40000 @82; 2359 Mithril bar x30000 @235; 2361 Adamantite bar x20000 @487; 2363 Runite bar x15000 @3494 |
| 39 | Pure shop | 2 specialty | 535 op2 | 4151 Abyssal whip x10 @4000000; 6585 Amulet Of Fury x10 @2000000; 1153 Iron full helm x10 @124; 1115 Iron platebody x10 @429; 3842 Unholy book x10 @15000; 3840 Holy book x10 @15000; 3844 Book of balance x10 @15000; 6568 Obsidian cape x10 @50000; 7462 Gloves x10 @100000; 4587 Dragon scimitar x10 @100000; 5698 Dragon dagger(s) x10 @60000; 3105 Climbing boots x10 @4000; 544 Monk's robe x100 @34; 542 Monk's robe x100 @26; 6735 Warrior Ring x100 @6000; 6731 Seers Ring x100 @6000; 391 Manta ray x1000 @384 |
| 40 | Dragon shop | 2 specialty | 209 op2* | 1149 Dragon med helm x10 @4500000; 3140 Dragon chainbody x10 @100000000; 4087 Dragon platelegs x10 @7000000; 4585 Dragon plateskirt x10 @4000000; 1187 Dragon sq shield x10 @1200000; 1305 Dragon longsword x10 @100000; 1377 Dragon battleaxe x10 @200000; 1434 Dragon mace x10 @50000; 3204 Dragon halberd x10 @5000000; 4587 Dragon scimitar x10 @100000; 5698 Dragon dagger(s) x10 @60000; 5730 Dragon spear(s) x10 @150000; 6739 Dragon Axe x10 @1200000; 7158 Dragon 2h Sword x10 @3000000 |
| 41 | Obsidian Stuff | 2 specialty | 2621 op1+op2* | 6522 Toktz-xil-ul x10000 @198; 6523 Toktz-xil-ak x100 @25611; 6524 Toktz-ket-xil x100 @28670; 6525 Toktz-xil-ek x100 @16327; 6526 Toktz-mej-tal x100 @2253654; 6527 Tzhaar-ket-em x100 @1944272; 6528 Tzhaar-ket-om x100 @3; 6569 Obsidian cape x100 @50000; 6571 Uncut onyx x100 @80000; 6572 Uncut onyx x100 @80000; 6573 Onyx x100 @80000; 6575 Onyx ring x100 @80400; 6577 Onyx necklace x100 @80400; 6579 Onyx amulet x100 @80400; 6581 Onyx amulet x100 @80400 |
| 42 | Pking Gear | 2 specialty | 944 op1* | 5574 Initiate helm x100 @2142; 5575 Initiate platemail x100 @6787; 5576 Initiate platelegs x100 @3494; 1163 Rune full helm x100 @22659; 1127 Rune platebody x100 @40777; 1079 Rune platelegs x100 @45000; 1093 Rune plateskirt x100 @40176; 1201 Rune kiteshield x100 @34384; 1333 Rune scimitar x100 @25000; 3751 Berserker helm x100 @100000; 3105 Climbing boots x100 @4000; 6568 Obsidian cape x100 @50000; 1712 Amulet of glory(4) x100 @11681; 5698 Dragon dagger(s) x100 @60000; 4587 Dragon scimitar x100 @100000; 1305 Dragon longsword x100 @100000; 4153 Granite maul x100 @31715; 6131 Third Age Helm x100 @500000; 6130 Third Age Platelegs x100 @400000; 6129 Third Age Platebody x100 @600000; 3755 Farseer helm x100 @37767; 3749 Archer helm x100 @37767 |
| 43 | Trimming Shop | 2 specialty | none | 2949 Golden hammer x100 @235; 2347 Hammer x100 @1; 2951 Golden needle x100 @235; 1804 Silver needle x100 @1; 1133 Studded body x100 @639; 1097 Studded chaps x100 @567; 1135 Dragonhide body x100 @5349; 1099 Dragonhide chaps x100 @2754; 2499 Dragonhide body x100 @6370; 2493 Dragonhide chaps x100 @3037; 1165 Black full helm x100 @6520; 1125 Black platebody x100 @6520; 1077 Black platelegs x100 @6520; 1089 Black plateskirt x100 @1; 1195 Black kiteshield x100 @6520; 1161 Adamant full helm x100 @2496; 1123 Adamant platebody x100 @8598; 1073 Adamant platelegs x100 @4426; 1091 Adamant plateskirt x100 @4426; 1199 Adamant kiteshield x100 @3788; 1163 Rune full helm x100 @22659; 1127 Rune platebody x100 @40777; 1079 Rune platelegs x100 @45000; 1093 Rune plateskirt x100 @40176; 1201 Rune kiteshield x100 @34384 |
| 44 | Armour Shop | 2 specialty | 3117 op1* | 1321 Bronze scimitar x100 @27; 1155 Bronze full helm x100 @37; 1117 Bronze platebody x100 @129; 1075 Bronze platelegs x100 @66; 1189 Bronze kiteshield x100 @56; 1323 Iron scimitar x100 @91; 1153 Iron full helm x100 @124; 1115 Iron platebody x100 @429; 1067 Iron platelegs x100 @220; 1191 Iron kiteshield x100 @189; 1325 Steel scimitar x100 @310; 1157 Steel full helm x100 @421; 1119 Steel platebody x100 @1452; 1069 Steel platelegs x100 @747; 1193 Steel kiteshield x100 @639; 1329 Mithril scimitar x100 @776; 1159 Mithril full helm x100 @1053; 1121 Mithril platebody x100 @3627; 1071 Mithril platelegs x100 @1867; 1197 Mithril kiteshield x100 @1598; 1331 Adamant scimitar x100 @1840; 1161 Adamant full helm x100 @2496; 1123 Adamant platebody x100 @8598; 1073 Adamant platelegs x100 @4426; 1199 Adamant kiteshield x100 @3788 |
| 45 | Farming Shop | 2 specialty | 2304 op2* | 5291 Guam seed x10000 @3; 5292 Marrentill seed x10000 @4; 5293 Tarromin seed x10000 @6; 5294 Harralander seed x8000 @10; 5295 Ranarr seed x10000 @16; 5296 Toadflax seed x10000 @29; 5297 Irit seed x10000 @53; 5298 Avantoe seed x10000 @53; 5299 Kwuarm seed x10000 @53; 5300 Snapdragon seed x10000 @53; 5301 Cadantine seed x10000 @53; 5302 Lantadyme seed x10000 @53; 5303 Dwarf weed seed x10000 @53; 5304 Torstol seed x10000 @53; 5340 Watering can(8) x10000 @1 |
| 46 | Herblore Shop | 1 general | 587 op2 | 227 Vial of water x2000 @1; 221 Eye of newt x2000 @2; 235 Unicorn horn dust x2000 @17; 225 Limpwurt root x2000 @6; 223 Red spiders' eggs x2000 @6; 1975 Chocolate dust x2000 @1; 239 White berries x2000 @9; 231 Snape grass x2000 @9; 2970 Mort myre fungi x2000 @1; 241 Dragon scale dust x2000 @44; 245 Wine of zamorak x2000 @1; 247 Jangerberries x2000 @1; 3138 Potato cactus x2000 @1 |
| 47 | Fancy Shop! | 1 general | none (dead ref 554) | 5028 Woven top x1000 @494; 5046 Shorts x1000 @303; 5032 Shirt x1000 @458; 5044 Shorts x1000 @281; 5030 Shirt x1000 @348; 5042 Shorts x1000 @220; 2643 Black cavalier x20 @100000; 6186 Princess blouse x1000 @100; 6187 Princess skirt x1000 @100 |
| 48 | Rares Shop! | 1 general | 554 op2* | 1038 Red partyhat x100 @5000000; 1040 Yellow partyhat x100 @5000000; 1042 Blue partyhat x100 @5000000; 1044 Green partyhat x100 @5000000; 1046 Purple partyhat x100 @5000000; 1048 White partyhat x100 @5000000; 1050 Santa hat x100 @5000000; 1053 Green h'ween mask x100 @5000000; 1055 Blue h'ween mask x100 @5000000; 1057 Red h'ween mask x100 @5000000; 6862 Woolly hat x100 @1000000; 6860 Tri-jester hat x100 @1000000; 6856 Bobble hat x100 @1000000; 6858 Jester hat x100 @1000000; 6857 Bobble scarf x100 @1000000; 6859 Jester scarf x100 @1000000; 6861 Tri-jester scarf x100 @1000000; 6863 Woolly scarf x100 @1000000; 2994 Chompy bird hat x100 @900000; 2992 Chompy bird hat x100 @900000; 2990 Chompy bird hat x100 @900000; 14519 Amulet of glory(t) x100 @30000000; 14521 Amulet of magic(t) x100 @30000000; 14520 Amulet of strength(t) x100 @30000000; 3486 Gilded full helm x100 @500000; 3481 Gilded platebody x100 @1000000; 3483 Gilded platelegs x100 @1000000; 3485 Gilded plateskirt x100 @401764; 3488 Gilded kiteshield x100 @750000; 6623 White full helm x100 @850000; 6617 White platebody x100 @1000000; 6625 White platelegs x100 @950000; 6627 White plateskirt x100 @900000; 6633 White kiteshield x100 @900000 |
| 49 | Allstar's Pk Shop | 2 specialty | 550 op2* | 392 Manta ray x1000 @384; 14638 Fighter Torso x100 @965432; 4151 Abyssal whip x100 @4000000; 4587 Dragon scimitar x100 @100000; 13601 Rune Defender x100 @334222; 4153 Granite maul x100 @31715; 6528 Tzhaar-ket-om x100 @3; 15334 Bandos Godsword x100 @65000000; 6585 Amulet Of Fury x100 @2000000; 15156 Dark Bow x100 @4000000; 5698 Dragon dagger(s) x100 @60000; 3105 Climbing boots x100 @4000; 15352 Dragon Boots x100 @162362; 4087 Dragon platelegs x100 @7000000; 15195 Dragon Full Helm x100 @20000000; 3751 Berserker helm x100 @100000; 3749 Archer helm x100 @37767; 2503 Dragonhide body x100 @9035; 2497 Dragonhide chaps x100 @4307; 2491 Dragon vambraces x100 @3037; 2581 Robin hood hat x100 @2500000; 2577 Ranger boots x100 @1000000; 861 Magic shortbow x100 @1173; 892 Rune arrow x10000 @310; 6570 Fire Cape x100 @1000000; 157 Super strength(3) x100 @175; 163 Super defence(3) x100 @208; 3042 Magic potion(3) x100 @198; 2444 Ranging potion(4) x100 @281; 175 Antipoison(3) x100 @226; 145 Super attack(3) x100 @144 |
| 34 (DUPLICATE line; later def overwrites) | Magic Shop | 2 specialty | 2168 op1*; 461 op2* | 554 Fire rune x10000 @19; 555 Water rune x10000 @19; 565 Blood rune x10000 @19; 556 Air rune x10000 @19; 557 Earth rune x10000 @19; 558 Mind rune x10000 @19; 559 Body rune x10000 @500; 560 Death rune x10000 @19; 561 Nature rune x10000 @19; 562 Chaos rune x10000 @19; 563 Law rune x10000 @19; 564 Cosmic rune x10000 @19; 566 Soul rune x10000 @19; 4675 Ancient staff x100 @61608; 4089 Mystic hat x100 @10009; 4091 Mystic robe top x100 @73364; 4093 Mystic robe bottom x100 @49751; 4095 Mystic gloves x100 @6787; 4097 Mystic boots x100 @6787; 4099 Mystic hat x100 @10009; 4101 Mystic robe top x100 @73364; 4103 Mystic robe bottom x100 @49751; 4105 Mystic gloves x100 @6787; 4107 Mystic boots x100 @6787; 4109 Mystic hat x100 @10009; 4111 Mystic robe top x100 @73364; 4113 Mystic robe bottom x100 @49751; 4115 Mystic gloves x100 @6787; 4117 Mystic boots x100 @6787; 7394 Wizard hat (g) x100 @100000; 7390 Wizard robe (g) x100 @120000; 7386 Blue skirt (g) x100 @100000; 7396 Wizard hat (t) x100 @95000; 7392 Wizard robe (t) x100 @110000; 7388 Blue skirt (t) x100 @90000; 2579 Wizard boots x100 @160; 6918 Infinity hat x50 @6800; 6916 Infinity top x50 @56000; 6924 Infinity bottoms x50 @36000 |
| 50 | Allstar's Shop! | 2 specialty | 520 op2* | 6920 Infinity boots x50 @4800; 6922 Infinity gloves x50 @4800; 6585 Amulet Of Fury x30 @2000000; 6528 Tzhaar-ket-om x15 @3; 7158 Dragon 2h Sword x30 @3000000; 1149 Dragon med helm x100 @4500000; 3140 Dragon chainbody x100 @100000000; 4087 Dragon platelegs x100 @7000000; 4585 Dragon plateskirt x100 @4000000; 1187 Dragon sq shield x100 @1200000; 14915 Barrelchest Anchor x100 @11232321; 15334 Bandos Godsword x100 @65000000; 14860 Helmet of Neitznot x1000 @15000000; 15348 Bandos Chestplate x10 @45000000; 15349 Bandos Tasset x10 @32000000; 15350 Bandos Boots x10 @15000000; 15195 Dragon Full Helm x10 @20000000; 15345 Armadyl Helmettttt x10 @130000000; 15346 Armadyl chestplate x10 @130000000; 15347 Armadyl Plate legs x10 @130000000; 15185 Dragon fire Shield x300000 @40000000; 15352 Dragon Boots x100 @162362; 6570 Fire Cape x100 @1000000; 6735 Warrior Ring x100 @6000; 3122 Granite shield x100 @3500000; 7449 Allstar's Hammer x100 @100000000; 15336 Zamorak GodSword x100 @70000000 |
| 51 | Pure Shop | 2 specialty | 1699 op2* | 1115 Iron platebody x50 @429; 1153 Iron full helm x50 @124; 1067 Iron platelegs x50 @220; 1081 Iron plateskirt x50 @220; 1323 Iron scimitar x100 @91; 4153 Granite maul x100 @31715; 1434 Dragon mace x50 @50000; 1305 Dragon longsword x50 @100000; 5698 Dragon dagger(s) x50 @60000; 4587 Dragon scimitar x50 @100000; 542 Monk's robe x100 @26; 544 Monk's robe x100 @34; 1725 Amulet of strength x50 @1469; 6568 Obsidian cape x100 @50000; 3105 Climbing boots x100 @4000; 3840 Holy book x50 @15000; 3842 Unholy book x50 @15000; 3844 Book of balance x50 @15000; 775 Cooking gauntlets x100 @1; 7462 Gloves x50 @100000; 4151 Abyssal whip x15 @4000000; 13601 Rune Defender x50 @334222; 13600 Adament Defender x50 @145321; 13599 Mithril Defender x50 @99554; 13598 Black Defender x50 @32432; 13597 Steel Defender x50 @121222; 13596 Iron Defender x50 @50000; 13595 Bronze Defender x50 @30000; 14638 Fighter Torso x100 @965432; 6109 Ghostly hood x100 @235; 6107 Ghostly robe x100 @235; 6108 Ghostly robe x100 @235; 6111 Ghostly cloak x100 @198; 6106 Ghostly boots x100 @235; 6110 Ghostly gloves x100 @235; 4405 Team-46 cape x100 @42; 4385 Team-36 cape x100 @42; 4345 Team-16 cape x100 @42; 4365 Team-26 cape x100 @42; 4325 Team-6 cape x100 @42 |
| 52 | Richards F2p Shop | 2 specialty | 1783 op2* | 1333 Rune scimitar x50 @25000; 1319 Rune 2h sword x50 @40176; 379 Lobster x1000 @121; 1167 Leather cowl x50 @20; 1129 Leather body x50 @18; 1063 Leather vambraces x50 @15; 1061 Leather boots x50 @5; 1095 Leather chaps x50 @17; 1059 Leather gloves x50 @5 |
| 53 | God Shop | 2 specialty | 521 op2* | 14525 Zamorak Coif x100 @2000000; 14523 Zamorak Dragonhide x100 @5000000; 14524 Zamorak Chaps x100 @3000000; 14522 Zamorak Bracers x100 @1000000; 14533 Saradomin Coif x100 @2000000; 14531 Saradomin Dragonhide x100 @5000000; 14532 Saradomin Chaps x100 @3000000; 14530 Saradomin Bracers x100 @1000000; 14529 Guthix Coif x100 @2000000; 14527 Guthix Dragonhide x100 @5000000; 14528 Guthix Chaps x100 @3000000; 14526 Guthix Bracers x100 @1000000; 14565 ? x100 @1; 14569 Guthix Robe top x100 @600000; 14571 Guthix Robe Legs x100 @600000; 14562 Guthix Cloak x100 @600000; 14564 Saradomin Mitre x100 @600000; 14567 Saradomin Robe Top x100 @600000; 14570 Saradomin Robe Legs x100 @600000; 14561 Saradomin Cloak x100 @600000; 14566 Zamorak Mitre x100 @600000; 14568 Zamorak Robe Top x100 @600000; 14572 Zamorak Robe Legs x100 @600000; 14563 Zamorak Cloak x100 @600000 |
| 54 | God Armor Shop | 1 general | 1917 op2* | 1163 Rune full helm x100 @22659; 1127 Rune platebody x100 @40777; 1079 Rune platelegs x100 @45000; 1093 Rune plateskirt x100 @40176; 1201 Rune kiteshield x100 @34384; 1185 Rune sq shield x100 @24629; 1319 Rune 2h sword x100 @40176; 1333 Rune scimitar x100 @25000; 1373 Rune battleaxe x100 @26592; 3101 Rune claws x100 @8082; 3202 Rune halberd x100 @40176; 4131 Rune boots x100 @8405; 2665 Saradomin full x100 @22659; 2661 Saradomin plate x100 @40777; 2663 Saradomin legs x100 @40176; 2667 Saradomin kite x100 @34384; 3479 Saradomin skirt x100 @40176; 2412 Saradomin cape x100 @82; 2657 Zamorak full helm x100 @22659; 2653 Zamorak platebody x100 @40777; 2655 Zamorak platelegs x100 @40176; 2659 Zamorak kiteshield x100 @34384; 3478 Zamorak plateskirt x100 @40176; 2414 Zamorak cape x100 @82; 2673 Guthix full helm x100 @22659; 2669 Guthix platebody x100 @40777; 2671 Guthix platelegs x100 @40176; 2675 Guthix kiteshield x100 @34384; 3480 Guthix plateskirt x100 @40176; 2413 Guthix cape x100 @82; 5574 Initiate helm x100 @2142; 5575 Initiate platemail x100 @6787; 5576 Initiate platelegs x100 @3494; 14023 Proselyte tasset x100 @716321; 1837 Desert boots x100 @17; 775 Cooking gauntlets x100 @1; 1052 Cape of legends x100 @800000; 2415 Saradomin staff x100 @49751; 2416 Guthix staff x100 @49751; 2417 Zamorak staff x100 @49751 |
| 55 | General Store | 1 general | 522 op2* | 1436 Rune essence x10000 @3; 2347 Hammer x10 @1; 1925 Bucket x10 @1 |
| 56 | Boots & Gloves | 2 specialty | 548 op2* | 628 Boots x100 @160; 630 Boots x100 @160; 632 Boots x100 @160; 2924 Boots x100 @384; 2934 Boots x100 @384; 626 Boots x100 @160; 2894 Boots x100 @384; 634 Boots x100 @160; 4310 Boots x100 @62; 3791 Fremennik boots x100 @384; 2914 Boots x100 @384; 2904 Boots x100 @384; 2912 Gloves x100 @384; 2902 Gloves x100 @384; 2922 Gloves x100 @384; 2932 Gloves x100 @384; 2942 Gloves x100 @384; 3799 Gloves x100 @384; 4308 Gloves x100 @62; 1580 Ice gloves x100 @5; 2910 Hat x100 @384; 2920 Hat x100 @384; 2930 Hat x100 @384; 2940 Hat x100 @384; 658 Hat x100 @129; 660 Hat x100 @129; 662 Hat x100 @129; 3797 Fremennik hat x100 @384; 664 Hat x100 @129; 656 Hat x100 @2000000; 2906 Robe top x100 @384; 2916 Robe top x100 @384; 2926 Robe top x100 @384; 2936 Robe top x100 @384; 638 Robe top x100 @144; 640 Robe top x100 @144; 642 Robe top x100 @144; 644 Robe top x100 @144; 636 Robe top x100 @3000000; 3793 Fremennik robe x100 @384 |
| 57 | Helmet Shop | 2 specialty | 528 op2* | 7534 Fishbowl helmet x50 @100000; 5013 Mining helmet x50 @458; 3748 Third Age Helmz x100 @500000; 3749 Archer helm x100 @37767; 3751 Berserker helm x100 @100000; 3753 Warrior helm x100 @37767; 3755 Farseer helm x100 @37767 |
| 58 | Kalphite Food Shop | 2 specialty | 551 op2* | 391 Manta ray x10000 @384 |
| 59 | Skills Shop | 2 specialty | 530 op2* | 946 Knife x100 @5; 1511 Logs x10000 @3; 1521 Oak logs x10000 @17; 1519 Willow logs x10000 @34; 1517 Maple logs x10000 @66; 1515 Yew logs x10000 @129; 1513 Magic logs x10000 @251; 1351 Bronze axe x100 @14; 1349 Iron axe x100 @47; 1353 Steel axe x100 @160; 1355 Mithril axe x100 @399; 1357 Adamant axe x100 @947; 1361 Black axe x100 @298; 1359 Rune axe x100 @8598; 6739 Dragon Axe x100 @1200000; 6182 Lederhosen hat x100 @1; 6180 Lederhosen top x100 @1; 6181 Lederhosen shorts x100 @1; 6656 ? x100 @1; 6654 ? x100 @1; 6655 ? x100 @1; 390 Raw manta ray x10000 @384; 4834 Ourg bones x100000 @400; 1437 Rune essence x10000 @3; 5304 Torstol seed x10000 @53 |
| 61 | Skill Cape Shop | 2 specialty | 555 op2* | 14073 Att Cape x100 @100000; 14074 Att Cape (t) x100 @200000; 14076 Str Cape x100 @100000; 14077 Str Cape (t) x100 @200000; 14079 Def Cape x100 @100000; 14080 Def Cape (t) x100 @200000; 14082 Range Cape x100 @100000; 14083 Range Cape (t) x100 @200000; 14085 Pray Cape x100 @100000; 14086 Prayer Cape (t) x100 @200000; 14088 Magic Cape x100 @100000; 14089 Magic Cape (t) x100 @200000; 14094 Hp Cape x100 @100000; 14095 Hitpoints Cape (t) x100 @200000; 14103 Thieve Cape x100 @100000; 14104 Thieving Cape (t) x100 @200000; 14106 Crafting Cape (t) x100 @200000; 14107 Crafting Cape (t) x100 @200000; 14109 Fletch Cape x100 @100000; 14110 Fletching Cape (t) x100 @200000; 14112 Slayer Cape x100 @100000; 14113 Slayer Cape (t) x100 @200000; 14118 Mining Cape x100 @200000; 14119 Mining Cape (t) x100 @200000; 14121 Smith Cape x100 @200000; 14122 Smithing Cape (t) x100 @200000; 14124 Fish Cape x100 @200000; 14125 Fishing Cape (t) x100 @200000; 14127 Cook Cape x100 @100000; 14128 Cooking Cape (t) x100 @200000; 14130 Firemaking Cape x100 @200000; 14131 Firemaking Cape (t) x100 @200000; 14133 Wc Cape x100 @100000; 14134 Woodcutting Cape (t) x100 @200000; 14136 Farming Cape x100 @200000; 14137 Farming Cape (t) x100 @200000; 14139 Quest Points Cape x100 @20000000; 15714 Summoning Skillcape x100 @20000000; 14091 Runecrafting Cape x100 @200000; 14092 Runecrafting Cape (t) x100 @200000 |
| 62 | Hood Shop | 2 specialty | 561 op2* | 14075 Att Hood x100 @100000; 14078 Str Hood x100 @100000; 14081 Def Hood x100 @100000; 14084 Range Hood x100 @100000; 14087 Pray Hood x100 @100000; 14090 Magic Hood x100 @100000; 14096 HP Hood x100 @100000; 14108 Crafting Hood x100 @100000; 14111 Fletch Hood x100 @100000; 14114 Slayer Hood x100 @100000; 14120 Mining Hood x100 @100000; 14123 Smith Hood x100 @100000; 14126 Fish Hood x100 @100000; 14129 Cook Hood x100 @100000; 14132 Firemaking Hood x100 @100000; 14135 Wc Hood x100 @100000; 14138 Farming Hood x100 @100000; 14140 Quest Point Hood x100 @100000; 15715 Summoning Skillhood x100 @4000000; 14117 Construct. Hood x100 @100000; 14093 ? x100 @1; 14105 Thieve Hood x100 @100000; 14102 Herblore Hood x100 @200000; 14100 Herblore Cape x100 @200000; 14101 Herblore Cape (t) x100 @200000 |
| 64 | Slayer Shop | 2 specialty | 538 op2* | 4170 Slayer's staff x100 @13815; 7053 Lit bug lantern x100 @52; 4164 Facemask x100 @160; 13640 Black Mask x100 @30000000; 4156 Mirror shield x100 @3494 |
| 65 | 3rd Age Shop | 2 specialty | 558 op2* | 14513 3rd Age Fullhelm x100 @600000; 14512 3rd Age Platebody x100 @1000000; 14511 3rd Age Platelegs x100 @900000; 14514 3rd Age Kiteshield x100 @600000; 14505 3rd Age Coif x100 @25000000; 14504 3rd age Legs x100 @27000000; 14503 3rd Age Topp x100 @34000000; 14506 3rd age vambraces x100 @15000000; 14507 3rd Age Robe Top x100 @600000; 14508 3rd Age Robe x100 @600000; 14509 ? x100 @1 |
| 66 | Brett's Relleka Shop | 2 specialty | 681 op1* | 391 Manta ray x1000000 @384; 4151 Abyssal whip x1000 @4000000; 14511 3rd Age Platelegs x100 @900000; 14512 3rd Age Platebody x100 @1000000; 14513 3rd Age Fullhelm x100 @600000 |
| 67 | Mod & Admin Shop | 2 specialty | none | 15183 ? x100 @1; 15181 ? x100 @1; 14819 ? x100 @1; 14868 ? x100 @1; 14869 ? x100 @1; 14870 ? x100 @1 |
| 10, 60, 63, 79 | (undefined in shops.cfg) | S=0 → general | 60: 524 op2; 63: 529 op2; 79: 209 op1*; 10: dead ref | (no items; blank title) |

## Appendix B — Equip requirements computed by emulating GetCL* over item.cfg (equipment with bonuses + capes/hoods/custom ids; format `id name [reqs]`; items not listed need nothing)

802 Steel thrownaxe [Def 5]; 803 Mithril thrownaxe [Def 20]; 809 Mithril dart [Def 20]; 810 Adamant dart [Def 30]; 827 Steel javelin [Def 5]; 828 Mithril javelin [Def 20]; 829 Adamant javelin [Def 30]; 859 Magic longbow [Rng 50]; 865 Steel knife [Def 5]; 866 Mithril knife [Def 20]; 867 Adamant knife [Def 30]; 886 Steel arrow [Def 5]; 888 Mithril arrow [Def 20]; 890 Adamant arrow [Def 30]; 1065 Dragon vambraces [Rng 40]; 1069 Steel platelegs [Def 5]; 1071 Mithril platelegs [Def 20]; 1073 Adamant platelegs [Def 30]; 1079 Rune platelegs [Def 40]; 1083 Steel plateskirt [Def 5]; 1085 Mithril plateskirt [Def 20]; 1091 Adamant plateskirt [Def 30]; 1093 Rune plateskirt [Def 40]; 1099 Dragonhide chaps [Rng 40]; 1105 Steel chainbody [Def 5]; 1109 Mithril chainbody [Def 20]; 1111 Adamant chainbody [Def 30]; 1119 Steel platebody [Def 5]; 1121 Mithril platebody [Def 20]; 1123 Adamant platebody [Def 30]; 1127 Rune platebody [Def 40]; 1135 Dragonhide body [Def 40, Rng 40]; 1141 Steel med helm [Def 5]; 1143 Mithril med helm [Def 20]; 1145 Adamant med helm [Def 30]; 1149 Dragon med helm [Def 60]; 1157 Steel full helm [Def 5]; 1159 Mithril full helm [Def 20]; 1161 Adamant full helm [Def 30]; 1163 Rune full helm [Def 40]; 1177 Steel sq shield [Def 5]; 1181 Mithril sq shield [Def 20]; 1183 Adamant sq shield [Def 30]; 1185 Rune sq shield [Def 40]; 1187 Dragon sq shield [Def 60]; 1193 Steel kiteshield [Def 5]; 1197 Mithril kiteshield [Def 20]; 1199 Adamant kiteshield [Def 30]; 1201 Rune kiteshield [Def 40]; 1207 Steel dagger [Att 5]; 1209 Mithril dagger [Att 20]; 1211 Adamant dagger [Att 30]; 1213 Rune dagger [Att 40]; 1215 Dragon dagger [Att 60]; 1218 Black dagger [Att 10]; 1234 Black dagger(p) [Att 10]; 1241 Steel spear [Def 5]; 1243 Mithril spear [Def 20]; 1245 Adamant spear [Def 30]; 1249 Dragon spear [Def 60]; 1250 Dragon spear [Def 60]; 1281 Steel sword [Att 5]; 1284 Black sword [Att 10]; 1285 Mithril sword [Att 20]; 1287 Adamant sword [Att 30]; 1289 Rune sword [Att 40]; 1295 Steel longsword [Att 5]; 1298 Black longsword [Att 10]; 1299 Mithril longsword [Att 20]; 1301 Adamant longsword [Att 30]; 1303 Rune longsword [Att 40]; 1305 Dragon longsword [Att 60]; 1311 Steel 2h sword [Att 5]; 1314 Black 2h sword [Att 10]; 1315 Mithril 2h sword [Att 20]; 1317 Adamant 2h sword [Att 30]; 1319 Rune 2h sword [Att 40]; 1325 Steel scimitar [Att 5]; 1328 Black scimitar [Att 10]; 1329 Mithril scimitar [Att 20]; 1331 Adamant scimitar [Att 30]; 1333 Rune scimitar [Att 40]; 1334 Rune scimitar [Att 40]; 1339 Steel warhammer [Att 5]; 1342 Black warhammer [Att 10]; 1343 Mithril warhammer [Att 20]; 1347 Rune warhammer [Att 40]; 1353 Steel axe [Def 5]; 1355 Mithril axe [Def 20]; 1357 Adamant axe [Def 30]; 1365 Steel battleaxe [Att 5]; 1368 Black battleaxe [Att 10]; 1369 Mithril battleaxe [Att 20]; 1371 Adamant battleaxe [Att 30]; 1373 Rune battleaxe [Att 40]; 1377 Dragon battleaxe [Att 60]; 1424 Steel mace [Att 5]; 1427 Black mace [Att 10]; 1428 Mithril mace [Att 20]; 1430 Adamant mace [Att 30]; 1432 Rune mace [Att 40]; 1434 Dragon mace [Att 60]; 2412 Saradomin cape [Mag 60]; 2413 Guthix cape [Mag 60]; 2414 Zamorak cape [Mag 60]; 2489 Dragon vambraces [Rng 60]; 2495 Dragonhide chaps [Rng 60]; 2497 Dragonhide chaps [Rng 70]; 2499 Dragonhide body [Def 60]; 2501 Dragonhide body [Def 40, Rng 60]; 2503 Dragonhide body [Def 40]; 2577 Ranger boots [Rng 40]; 2581 Robin hood hat [Rng 40]; 3097 Steel claws [Att 5]; 3098 Black claws [Att 10]; 3099 Mithril claws [Att 20]; 3100 Adamant claws [Att 30]; 3101 Rune claws [Att 40]; 3122 Granite shield [Att 50, Str 50]; 3140 Dragon chainbody [Def 60]; 3194 Steel halberd [Def 5]; 3198 Mithril halberd [Def 20]; 3200 Adamant halberd [Def 30]; 3202 Rune halberd [Att 40]; 3204 Dragon halberd [Def 60]; 3763 Magic Cape [Mag 99]; 3777 Strength Cape [Str 99]; 3783 Defence Cape [Def 100]; 3789 Range Cape [Rng 99]; 4087 Dragon platelegs [Def 60]; 4123 Steel boots [Def 5]; 4127 Mithril boots [Def 20]; 4129 Adamant boots [Def 30]; 4131 Rune boots [Def 40]; 4151 Abyssal whip [Att 70]; 4153 Granite maul [Att 50, Str 50]; 4214 Crystal bow full [Rng 75]; 4215 Crystal bow 9/10 [Rng 75]; 4216 Crystal bow 8/10 [Rng 75]; 4217 Crystal bow 7/10 [Rng 75]; 4218 Crystal bow 6/10 [Rng 75]; 4219 Crystal bow 5/10 [Rng 75]; 4220 Crystal bow 4/10 [Rng 75]; 4221 Crystal bow 3/10 [Rng 75]; 4222 Crystal bow 2/10 [Rng 75]; 4223 Crystal bow 1/10 [Rng 75]; 4226 Crystal shield 9/10 [Rng 75]; 4227 Crystal shield 8/10 [Rng 75]; 4228 Crystal shield 7/10 [Rng 75]; 4229 Crystal shield 6/10 [Rng 75]; 4230 Crystal shield 5/10 [Rng 75]; 4231 Crystal shield 4/10 [Rng 75]; 4232 Crystal shield 3/10 [Rng 75]; 4233 Crystal shield 2/10 [Rng 75]; 4234 Crystal shield 1/10 [Rng 75]; 4585 Dragon plateskirt [Def 60]; 4587 Dragon scimitar [Att 60]; 4708 Ahrims hood [Def 70, Mag 70]; 4709 Ahrims hood [Def 70, Mag 70]; 4710 Ahrims staff [Att 70, Mag 70]; 4712 Ahrims robetop [Def 70, Mag 70]; 4714 Ahrims robeskirt [Def 70, Mag 70]; 4716 Dharoks helm [Def 70, Rng 99]; 4718 Dharoks greataxe [Att 70, Str 70, Rng 99]; 4720 Dharoks platebody [Def 70, Rng 99]; 4722 Dharoks platelegs [Def 70, Rng 99]; 4724 Guthans helm [Def 70]; 4726 Guthans warspear [Att 70]; 4728 Guthans platebody [Def 70]; 4730 Guthans chainskirt [Def 70]; 4732 Karils coif [Def 70, Rng 70]; 4734 Karils crossbow [Rng 70]; 4736 Karils leathertop [Def 70, Rng 70]; 4738 Karils leatherskirt [Def 70, Rng 70]; 4745 Torags helm [Def 70]; 4747 Torags hammers [Att 70, Str 70]; 4748 Torags hammers [Att 70, Str 70]; 4749 Torags platebody [Def 70]; 4751 Torags platelegs [Def 70]; 4753 Veracs helm [Def 70]; 4755 Veracs flail [Att 70]; 4757 Veracs brassard [Def 70]; 4759 Veracs plateskirt [Def 70]; 4827 Dark Bow [Rng 99]; 4856 Ahrims hood 100 [Def 70, Mag 70]; 4857 Ahrims hood 75 [Def 70, Mag 70]; 4858 Ahrims hood 50 [Def 70, Mag 70]; 4859 Ahrims hood 25 [Def 70, Mag 70]; 4860 Ahrims hood 0 [Def 70, Mag 70]; 4861 Ahrims hood 0 [Def 70, Mag 70]; 5553 Rogue top [Thiev 100]; 5554 Rogue mask [Thiev 100]; 5555 Rogue trousers [Thiev 100]; 5556 Rogue gloves [Thiev 100]; 5557 Rogue boots [Thiev 100]; 5574 Initiate helm [Def 20]; 5575 Initiate platemail [Def 20]; 5576 Initiate platelegs [Def 20]; 5698 Dragon dagger(s) [Att 60]; 5730 Dragon spear(s) [Def 60]; 6528 Tzhaar-ket-om [Str 60]; 6724 Seercull [Rng 70]; 6739 Dragon Axe [Def 60]; 7158 Dragon 2h Sword [Att 60, Def 60]; 7449 Allstar's Hammer [Str 80]; 10228 (not in item.cfg) [Def 5]; 10229 (not in item.cfg) [Def 10]; 10230 (not in item.cfg) [Def 20]; 10231 (not in item.cfg) [Def 30]; 10232 (not in item.cfg) [Def 40]; 10271 (not in item.cfg) [Slay 100]; 10431 (not in item.cfg) [Rng 65]; 10704 (not in item.cfg) [Att 100]; 10705 (not in item.cfg) [Att 100]; 10706 (not in item.cfg) [Att 100]; 10707 (not in item.cfg) [Str 100]; 10709 (not in item.cfg) [Str 66]; 10712 (not in item.cfg) [Def 100]; 10713 (not in item.cfg) [Rng 99]; 10721 (not in item.cfg) [Mag 99]; 11153 (not in item.cfg) [Rng 80]; 11154 (not in item.cfg) [Def 40, Rng 80]; 11824 (not in item.cfg) [Def 60]; 11981 (not in item.cfg) [Def 60]; 13597 Steel Defender [Def 5]; 13599 Mithril Defender [Def 20]; 14013 (not in item.cfg) [Thiev 99]; 14073 Att Cape [Att 99]; 14074 Att Cape (t) [Att 99]; 14075 Att Hood [Att 99]; 14076 Str Cape [Str 99]; 14077 Str Cape (t) [Str 99]; 14078 Str Hood [Str 99]; 14079 Def Cape [Def 99]; 14080 Def Cape (t) [Def 99]; 14081 Def Hood [Def 99]; 14082 Range Cape [Rng 99]; 14083 Range Cape (t) [Rng 99]; 14084 Range Hood [Rng 99]; 14085 Pray Cape [Pray 99]; 14086 Prayer Cape (t) [Pray 99]; 14087 Pray Hood [Pray 99]; 14088 Magic Cape [Mag 99]; 14089 Magic Cape (t) [Mag 99]; 14090 Magic Hood [Mag 99]; 14094 Hp Cape [Hp 99]; 14095 Hitpoints Cape (t) [Hp 99]; 14096 HP Hood [Hp 99]; 14103 Thieve Cape [Thiev 99]; 14104 Thieving Cape (t) [Thiev 99]; 14105 Thieve Hood [Thiev 99]; 14109 Fletch Cape [Fletch 99]; 14110 Fletching Cape (t) [Fletch 99]; 14111 Fletch Hood [Fletch 99]; 14112 Slayer Cape [Slay 99]; 14113 Slayer Cape (t) [Slay 99]; 14114 Slayer Hood [Slay 99]; 14124 Fish Cape [Fish 99]; 14125 Fishing Cape (t) [Fish 99]; 14126 Fish Hood [Fish 99]; 14127 Cook Cape [Cook 99]; 14128 Cooking Cape (t) [Cook 99]; 14129 Cook Hood [Cook 99]; 14133 Wc Cape [WC 99]; 14134 Woodcutting Cape (t) [WC 99]; 14135 Wc Hood [WC 99]; 14136 Farming Cape [Farm 99]; 14137 Farming Cape (t) [Farm 99]; 14138 Farming Hood [Farm 99]; 14915 Barrelchest Anchor [Att 60]; 15145 Dragon Arrow [Def 60]; 15156 Dark Bow [Rng 80]; 15185 Dragon fire Shield [Def 60]; 15195 Dragon Full Helm [Def 60]; 15334 Bandos Godsword [Att 80]; 15336 Zamorak GodSword [Att 80]; 15352 Dragon Boots [Def 60]; 140103 (not in item.cfg) [Thiev 99]
