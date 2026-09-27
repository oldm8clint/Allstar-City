# Allstar-Scape v2 — Dialogues, Quests, Clue Scrolls, Text & Menus (1:1 inventory)

Source: `D:\Desktop\allstar.scape.v2` (read-only; nothing modified). Line numbers refer to `client.java` unless another file is named.

**How to read this document**
- Every player-facing string is **verbatim**, written as the Java literal/expression it came from (including RS colour tags such as `@red@`, `@dbl@`, typos, double spaces, trailing spaces). The strings were extracted with a comment/string-aware parser, not retyped.
- `` `4885` "text" `` means `sendFrame126("text", 4885)` / `sendQuest("text", 4885)` (both are server packet 126 "set interface text"; component id first).
- `GetItemName(n)[=X]` / `GetNpcName(n)[=X]`: the string is built at runtime; `X` is what it resolves to. **Item names have `_` replaced by spaces; NPC names do NOT** (`GetNpcName` returns the raw `npc.cfg` token, e.g. `Wizard_Mizgog`, `Make-over_mage`), so NPC names in chat headers and journal text literally show underscores.
- Interface/component ids are **317-client ids**. Lost City (rev 377) has different component ids, so each needs remapping, or the equivalent LC chat helper (`~chatnpc`, `~chatplayer`, `~p_choice2`, …) should be used with the same text.
- Classification tags: **CUSTOM** (Allstar-specific, must port), **AUTHENTIC** (real RS behaviour/text LC already has), **JUNK** (dead/unused/infrastructure).

---

## 0. Summary table

| Feature | Class | Status in Allstar (as shipped) |
|---|---|---|
| Dialogue engine (`NpcWanneTalk` → `NpcDialogue` → `UpdateNPCChat()`, continue = packet 40, options = buttons 9157/9158) | infra (behaviour to replicate) | live |
| `dialogues.cfg` | JUNK | never loaded by any code; leftover of "Project Czar" (§3.2) |
| Banker chat (1→2) | AUTHENTIC | live |
| Aubury chat (3→4→5→6) | AUTHENTIC text (typo "somone") | live |
| Hans welcome (1339→1340) | CUSTOM | live; option 1 does nothing |
| Clue NPC lines (31 / 32) | CUSTOM | live |
| Boat trips Captain Tobias / Customs officer (40–43) | CUSTOM variant (free, "Karjama") | NPCs not spawned |
| Lowe line (550) | CUSTOM (Quest 1 leftover) | live, text written to wrong component |
| Dark mage "Thieving Area" (4444) | CUSTOM | live |
| Ghost Disciple Halloween Scythe (6889) | CUSTOM | NPC not spawned |
| Make-over mage (14600–14604, 10000 coins) | CUSTOM | NPC not spawned |
| Mage of Zamorak → Abyss (2259/2260) | CUSTOM | NPC not spawned |
| Dark-mage ancients convert (1001/1002), Robin/Mummy (1694/1964), 254, 7, 9292, 11021/11022 | JUNK (unreachable) | dead code; transcribed anyway |
| Quest 1 "Invisible Armour" (Horvik) | CUSTOM | startable; **cannot be completed** (§5.5) |
| Quest 2 "Cook's Assistant" (Cook) | name AUTHENTIC, implementation CUSTOM (different text/rewards) | Cook not spawned |
| Quest 3 "Spells Of The Gods" (Wizard Mizgog) | CUSTOM | start NPC not spawned; several items have no source |
| Quest 4 "The Story Of Ramen" | CUSTOM name only | no implementation |
| "The secret commands quest" | CUSTOM, advertised only | no implementation |
| Quest tab (`loadquestinterface`) used as a welcome note | CUSTOM | live |
| Quest journal (`quest()`/`loadquest`) | CUSTOM text | **dead** (journal buttons are no-ops) |
| Clue scrolls (3 levels × 5 stages × 5 ids) | CUSTOM system (not RS treasure trails) | only level-2 scrolls drop; many steps broken |
| God-book preach menus + lines | AUTHENTIC text | live |
| Juna / team-select object 2466 / Ring of dueling menus | CUSTOM | live, option 1 usually hijacked (§4.4) |
| Login messages, welcome interface, broadcasts, right-click options | CUSTOM (server identity) | live |
| Help/info menus (::modinfo, ::info, ::updates, ::questmenu, …) | CUSTOM | live |
| Emote tab relabelled as teleport menu | CUSTOM | live |
| `TextHandler.process()` interface relabels | mostly CUSTOM (spell text partly AUTHENTIC) | live |
| `MenuHandler` skill guides | JUNK | class never instantiated |
| `misc.java` | JUNK | no player-facing text |
| `levelup()` | CUSTOM (99 rewards: skillcapes 14073–14138, +10M coins cooking/fishing, broadcasts) | live |
| NPC overhead chat (NPCHandler) | CUSTOM | live |

Server identity strings: `"Allstar-Scape"` (login, quest tab, welcome, player counter), owner `"Mod Allstar"`, NPC chat says `"Mod Allstarscape v3"`, console prints `"- Allstar-Scape v1 -"`, forums `allstarscapeforums.smfforfree2.com`, website `www.pimpscape.tk`, server IP text `5.53.106.141`, server-panel credit `"Made by: Tico135"`, preloaded names `admin`, `Mod Darren`, `Mod Mike`, `Skillerzmine`, `Fatality`, `Mod Steve`, `D D 3`, `xero`, `Motherload11`.

---

## 1. Dialogue engine (behaviour to reproduce)

**Start.** NPC first-click (packet 155, l.18900) stores the NPC's tile in `skillX/skillY` and sets `NpcWanneTalk = <dialogue id>`. Every tick (`process()`, l.17955):
- `NpcWanneTalk == 2` (bank booth object 2213, l.2774): when within distance 1 → `NpcDialogue = 1`, `NpcTalkTo = GetNPCID(skillX, skillY-1)` (the NPC standing south of the booth).
- any other `NpcWanneTalk > 0`: when within distance 2 → `NpcDialogue = NpcWanneTalk`, `NpcTalkTo = GetNPCID(skillX, skillY)` (NPC *type* at that tile).
- `NpcWanneTalk == 9292` (random event, distance 1, NPC at y-1) — never assigned.
- then `if (NpcDialogue > 0 && NpcDialogueSend == false) UpdateNPCChat();` (l.17990). Each case sets `NpcDialogueSend = true` so it renders once.

**`UpdateNPCChat()`** (l.32265–33124) always starts with `sendFrame126("", 976)`, then `switch (NpcDialogue)`. Chatbox templates used:

| Tag | Chatbox | Components |
|---|---|---|
| NPC-chat 4882 | `sendFrame164(4882)` | `sendFrame200(4883, 591)` (talk anim 591 on head), `4884` = `GetNpcName(NpcTalkTo)`, `4885`/`4886` = lines, `sendFrame75(NpcTalkTo, 4883)` (NPC chathead) |
| NPC-chat 4900 | `sendFrame164(4900)` | `4902` = `GetNpcName(NpcTalkTo)`, `4903`..`4906` = lines (4903 and 4906 are always `""`), `sendFrame75(NpcTalkTo, 4901)`; no anim frame |
| PLAYER-chat 973 | `sendFrame164(973)` | `sendFrame200(615, 974)` (as written; args look swapped), `975` = `playerName`, `976` = line, `sendFrame185(974)` (player chathead) |
| 2-OPTION 2459 | `sendFrame164(2459)` | `sendFrame171(1, 2465)`, `sendFrame171(0, 2468)`, `2460` = title, `2461` = option 1 (**button 9157**), `2462` = option 2 (**button 9158**) |
| 4-OPTION 2480 | `sendFrame164(2480)` | `2481` = title, `2482`..`2485` = options (**buttons 9178..9181**) |

`selectoption(question, s1, s2, s3)` (l.10219) = the 2-OPTION template: `sendFrame171(1,2465)`, `sendFrame171(0,2468)`, `2460`=question, `2461`=s1, `2462`=s2, `2463`=s3 (2459 is the 2-option box, so this third string presumably never shows; every caller passes `""`), `sendFrame164(2459)`.

**Continue click = packet 40** (l.18166–18341), evaluated top to bottom:
1. `NpcDialogue ∈ {1, 3, 5, 40, 42, 1001, 1002, 2259, 2260, 301, 305, 308, 309, 313, 314, 317, 318, 319, 322, 323, 14600, 14602, 550, 1694, 1339}` → `NpcDialogue += 1`, `NpcDialogueSend = false` (next id renders next tick).
2. `∈ {6, 7, 300, 303, 304, 307, 310, 311, 312, 315, 316, 320, 321, 324, 325, 326, 14604}` → `NpcDialogue = 0`, `RemoveAllWindows()`.
3. Special branches (re-send the same text, do side effects; `NpcDialogue` is **not** reset): `31||30` → `newclue(cluelevel)` + close; `32` → `givereward(cluelevel)` + close; `100`,`101` → `q1stage=1`, `loadquestinterface()`, close; `102` → `q1stage=2`, `loadquestinterface()`, close; `103`,`104` → close; `1101` → `q1stage=2`, `loadquestinterface()`, close; `1102` → `q1stage=3`, `loadquestinterface()` (window stays open); `1694` (dead: caught by rule 1); `1105 && q1stage==4` (dead in practice).
4. anything else → `NpcDialogue = 0`, `RemoveAllWindows()`.

Alternate texts that only exist in the packet-40 branches (re-sent on continue):
- `31`/`30`: `` `4885` "Heres your next clue, goodluck" `` · `32`: `` `4885` "Congratulations! Heres your last reward!" `` · `100`–`104`, `1101`, `1102`: identical to the `UpdateNPCChat` texts (see §3).
- `1694` (dead): `` `4885` "Happy Halloween from Mod Allstar..!" ``
- `1105 && q1stage==4` (dead): `` `4885` "Thanks for helping me with this project," `` / `` `4886` "heres your reward, also look out for more of this armour..." `` + `showQuestCompleted("Invisible Armour", 3)`, `q1stage = -1`, `loadquestinterface()` (no item).

**Option buttons** (packet 185, l.23997–24156). `if / else if` chains, first match wins:

| Button | Condition (in order) | Action |
|---|---|---|
| 9157 (opt 1) | `NpcDialogue == 2` | `NpcDialogue=0`; `openUpBank()` |
| | `== 4` | `NpcDialogue=0`; `openUpShop(2)` |
| | `== 41` | `NpcDialogue=0`; close; `sendMessage("You board the ship.")`; `travelboat1=true`; `traveltime=30` |
| | `== 43` | same with `travelboat2` |
| | `== 302` | `NpcDialogue=303`; `q3stage=1` |
| | `== 306` | `NpcDialogue=307` |
| | `== 0` | `NpcDialogue=1340`; `` `4885` "Mmk thanks for reading!" ``; close; renders 1340 next tick (**hijack bug, §4.4**) |
| | `== 14601` | → 14602 |
| | `== 14603` | → 14604 |
| | `== 2260` | `NpcDialogue=0`; `sendMessage("You teleport to the abyss.")`; teleport (3040, 4842) |
| | `== 1002` | `NpcDialogue=0`; `stillgfx(435, absY, absX)`; close; ancients toggle (see case 1002) |
| | `duelring` | teleport (2837, 9581, h0); `sendMessage("You teleport to the TzTok-Jad's lair")`; `sendMessage("As you materialize, you feel the air around you grow hot")`; `duelring=false`; close |
| | `OptionObject == 2466` | `sendMessage("Welcome to Saradomin's team!")`; teleport (2387, 3116); `OptionObject=-1`; close |
| | `JunaTele == 1` | close; teleport (3253, absY); `JunaTele=-1` |
| | `JunaTele == 2` | close; teleport (3251, absY); `JunaTele=-1` |
| 9158 (opt 2) | `NpcDialogue == 2` | `NpcDialogue=0`; `openUpPinSettings()` |
| | `== 4` | `NpcDialogue=5` |
| | `== 41` / `== 43` | `NpcDialogue=0`; close |
| | `== 1340` | `NpcDialogue=0`; `` `4885` "Fine, you suck!" ``; close |
| | `== 2260` | `NpcDialogue=0`; close |
| | `== 1002` | `NpcDialogue=0`; `NpcDialogueSend=true`; close |
| | `== 302` | `NpcDialogue=300` |
| | `== 305` | `NpcDialogue=0`; `NpcDialogueSend=true`; close (305 is an NPC line, so this is effectively dead; **306 has no opt-2 handler**) |
| | `== 14601` / `== 14603` | `NpcDialogue=0`; `NpcDialogueSend=true`; close |
| | `duelring` | teleport (3040, 4840, h0); `sendMessage("You teleport to the abyssal rift")`; `sendMessage("You can feel the magical aura in the air")`; close (`duelring` is **not** reset) |
| | `OptionObject == 2466` | `sendMessage("Welcome to Zamorak's team!")`; teleport (2412, 3091); `OptionObject=-1`; close |
| | then, separately: `JunaTele == 1 \|\| JunaTele == 2` | PLAYER-chat 973: `sendFrame200(615, 974)`, `` `975` playerName ``, `` `976` "Ya ma." ``, `sendFrame185(974)`, `sendFrame164(973)`; `NpcDialogueSend=true`; `JunaTele=-1` |
| 9178–9181 | god books | §4.3b |

Any movement/interface close is not explicitly handled; `NpcDialogue` just keeps its last value until reset (relevant for §4.4).

---

## 2. NPC → dialogue trigger map (first click = "Talk-to", packet 155, l.18900–19351)

Spawns are from `autospawn.cfg` (only source of spawns besides `::npc`; "not spawned" = no entry). Names are raw `npc.cfg` names.

| NPC id | npc.cfg name | Spawn(s) (x,y,h) | Condition → `NpcWanneTalk` (dialogue id) | Otherwise |
|---|---|---|---|---|
| 494, 495 | Banker | Catherby 2807–2811,3443 · Edgeville 3096–3098,3489–3492 (data/staticnpcs.dat also lists 3094,3244 but that file is never loaded) | → 1 | — |
| — (object 2213 bank booth) | — | — | → 2 = special: renders dialogue 1 with banker at (x, y-1) | — |
| 0 | Hans | 2735,3468 · 2737,3468 · 2738,3468 · 2740,3468 (h0) | → 1339 | — |
| 550 | Lowe | 3305,9373 · 3246,3516 · 2801,3175 · 2823,3443 | → 550 | — |
| 553 | Aubury | 2743,3470 | `cluelevel==2 && cluestage==2 && clueid==1` → 31 | → 3 |
| 380 | Customs_officer | not spawned | → 42 | — |
| 376 | Captain_Tobias | not spawned | → 40 | — |
| 2259 | Mage_of_Zamorak | not spawned | → 2259 | — |
| 1001 | Dark_mage | 3302,3200 | → 4444 | — |
| 1964 | Mummy (comment "Robin") | not spawned | → 7777 (no such case → nothing) | — |
| 706 | Wizard_Mizgog | not spawned | Quest 3 table (§5.7) | nothing if q3stage==-1 |
| 599 | Make-over_mage | not spawned | → 14600 | — |
| 1686 | Ghost_Disciple | not spawned | `q1stage==2` → 6889 | `sendMessage("The ghost isn't interested in talking at the moment.")` |
| 903 | Lundail | not spawned | clue L2/S1/id1 → 31 | `sendMessage("Lundail ain't in the mood to talk, but he will sell runes for a small price.")` |
| 549 | Horvik | 2377,3442 | clue L1/S1/id1 → 31; else Quest 1 table (§5.5) | `sendMessage("Horvik isn't interested in talking right now...")` |
| 278 | Cook | not spawned | Quest 2 table (§5.6) | `sendMessage("The cook isn't interested in talking right now...")` |
| 527 | Shop_assistant | 2804,3432 · 3080,3509 | clue L1/S1/id4 → 31 | `sendMessage("The shop assistant isn't interested in talking right now...")` |
| 220 | The_Fisher_King | not spawned | clue L1/S4/id1 → 31 | `sendMessage("The Fisher King isn't interested in talking right now...")` |
| 542 | Louie_legs | not spawned | clue L1/S4/id2 → 31; L2/S1/id5 → 31; L2/S5/id2 → 32 | `sendMessage("The shop keeper isn't interested in talking right now...")` |
| 2253 | Wise_Old_Man (comment "Rich guy") | 2855,3599 · 2514,3861 | clue L1/S5/id2 → 32 | `sendMessage("This man isn't interested in talking right now...")` |
| 548 | Thessalia | 2736,3461 | clue L2/S4/id2 → 31 | `sendMessage("Thessalia isn't interested in talking right now...")` |
| 546 | Zaff | not spawned | clue L3/S3/id1 → 31; L3/S5/id5 → 32 | `sendMessage("Zaff isn't interested in talking right now...")` |
| 1051 | Nature_Spirit | not spawned | starter giver (no chatbox): if `starter==0` → `addItem(995, 15000000)`, `addItem(392, 1500)` (Manta ray), `sendMessage("Get more food from the store owner:zeek")`, `starter=1`, save; if `starter==1` → `sendMessage("Why do you have to be greedy?")` + broadcast `playerName + " is really greedy trying to type ::starter again"` | — |

Other first-click NPC actions in the same handler (not dialogues, listed for completeness): fishing spots 309/312/313/316/319 (fishing); click-fishing 234 lobster (lvl 40, `"You fish a lobster"`, else `"You need a fishing level of 40 to fish lobsters."`), 235 shrimp (lvl 1), 236 shark (lvl 75), 233 manta ray (lvl 90) with matching messages; shop openers 1305→30, 1552→31, 2262→32, 944→42, 3117→44, 2167→33, 2621→41, 209→79, 2168→34, 462→35, 460→36, 652→37, 681→66; bankers 166 (gnome) and 2619 (TzHaar) → bank; teleporter NPCs 1451→(3250,3423,0), 57→(2438,5169,0), 70→(2413,5117,0), 33→(2438,5169,0), 37→(3254,3436,0), 2301→(2715,9161,1). Second click (packet 17) of dialogue NPCs opens shops: Aubury 553→2, Horvik 549→38, Lowe 550→49, Thessalia 548→56, Zaff 546→7, Louie 542→27, Lundail 903→29.

---

## 3. Dialogue transcripts

### 3.1 `UpdateNPCChat()` — every case, verbatim, in source order

Each case lists the chatbox template, every text write (`component` text), every side effect, then a **Flow** line (trigger, what continue/options lead to, reachability, classification).


#### case 1 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Good day, how can I help you?"
- **Flow:** TRIGGER: Banker 494/495 first-click; bank-booth object 2213 (NpcTalkTo = NPC on tile (x, y-1) of the booth). CONTINUE -> 2. [AUTHENTIC text]

#### case 2 — 2-OPTION menu 2459 (title 2460, opt1 2461=btn 9157, opt2 2462=btn 9158)
- `2460` "What would you like to say?"
- `2461` "I'd like to access my bank account, please."
- `2462` "I'd like to check my PIN settings."
- **Flow:** OPT1 (btn 9157) -> openUpBank(). OPT2 (btn 9158) -> openUpPinSettings(). [AUTHENTIC]

#### case 3 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Do you want to buy some runes?"
- **Flow:** TRIGGER: Aubury 553 first-click (unless clue L2/S2/id1 active -> 31). CONTINUE -> 4. [AUTHENTIC text; Aubury 2nd-click opens shop 2 directly]

#### case 4 — 2-OPTION menu 2459 (title 2460, opt1 2461=btn 9157, opt2 2462=btn 9158)
- `2460` "Select an Option"
- `2461` "Yes please!"
- `2462` "Oh it's a rune shop. No thank you, then."
- **Flow:** OPT1 -> openUpShop(2). OPT2 -> 5.

#### case 5 — PLAYER-chat 973 (head 974 anim 615, name 975, line 976)
- `975` playerName
- `976` "Oh it's a rune shop. No thank you, then."
- **Flow:** Player line. CONTINUE -> 6.

#### case 6 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Well, if you find somone who does want runes, please"
- `4886` "send them my way."
- **Flow:** CONTINUE -> close (NpcDialogue=0). Typo 'somone' is verbatim.

#### case 7 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Well, if you find somone who does want runes, please"
- `4886` "send them my way."
- **Flow:** UNREACHABLE (never assigned). Copy of 6; source comment: 'NEED TO CHANGE FOR GUARD'.

#### case 1339 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Welcome To Mod Allstarscape !!"
- `4886` "Click here to Get shot by Hans"
- **Flow:** TRIGGER: Hans (NPC 0) first-click (4 spawns at 2735/2737/2738/2740,3468 h0). CONTINUE -> 1340. [CUSTOM]

#### case 1340 — 2-OPTION menu 2459 (title 2460, opt1 2461=btn 9157, opt2 2462=btn 9158)
- `2460` "Select an Option"
- `2461` "Yea i wanna go own n00bs!"
- `2462` "Nah im really scared!"
- **Flow:** OPT1 'Yea i wanna go own n00bs!' -> **no handler** for NpcDialogue==1340 on btn 9157 -> nothing happens, menu stays open (bug; intent unknown, probably a PvP teleport). OPT2 -> sendFrame126("Fine, you suck!", 4885) then NpcDialogue=0 + RemoveAllWindows (text never visible). ALSO reachable via btn 9157 while NpcDialogue==0 (see 4.4 hijack bug), which first sends "Mmk thanks for reading!" to 4885, closes windows, then renders 1340.

#### case 31 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Heres your next clue, goodluck"
- **Flow:** TRIGGER: clue NPC step (see 6.4). On CONTINUE (packet-40 special branch): re-sends the same NPC text, calls newclue(cluelevel) (stage+1, new random clueid 1-5, deletes one each of 2681/2682/2683, savemoreinfo), RemoveAllWindows. NpcDialogue is NOT reset. [CUSTOM]

#### case 32 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Congratulations! Heres your last reward!"
- givereward(cluelevel)
- **Flow:** TRIGGER: final clue NPC step. givereward(cluelevel) runs **when the chat is rendered** (opens reward scroll 8134, gives items, resets clue vars). CONTINUE -> re-sends text + givereward(cluelevel) again (no-op: cluelevel already 0) + RemoveAllWindows. [CUSTOM]

#### case 40 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Do you want to go on a trip to Karjama?"
- `4905` "It's free."
- `4906` ""
- **Flow:** TRIGGER: Captain_Tobias 376 first-click (NOT spawned in autospawn.cfg). CONTINUE -> 41. ['Karjama' typo verbatim; free trip is a CUSTOM deviation from RS 30gp]

#### case 41 — 2-OPTION menu 2459 (title 2460, opt1 2461=btn 9157, opt2 2462=btn 9158)
- `2460` "Select an Option"
- `2461` "Yes, please"
- `2462` "No, Thank you."
- **Flow:** OPT1 -> RemoveAllWindows; msg "You board the ship."; travelboat1=true, traveltime=30; every tick while traveltime>=1: teleport to (9999,9999) + sendFrame248(3281, 3213); when traveltime<=1: travel(1) = teleport (2956,3146), msg "The boat arrives at Karamja.", closeInterface(). OPT2 -> close.

#### case 42 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Do you want to go on a trip to Port Sarim?"
- `4905` "It's free."
- `4906` ""
- **Flow:** TRIGGER: Customs_officer 380 first-click (NOT spawned). CONTINUE -> 43.

#### case 43 — 2-OPTION menu 2459 (title 2460, opt1 2461=btn 9157, opt2 2462=btn 9158)
- `2460` "Select an Option"
- `2461` "Yes, please"
- `2462` "No, Thank you."
- **Flow:** OPT1 -> like 41 but travelboat2 -> travel(2) = teleport (3029,3217), msg "The boat arrives at Port Sarim.". OPT2 -> close.

#### case 550 — PLAYER-chat 973 (head 974 anim 615, name 975, line 976)
- `975` playerName
- `977` "Ok, where can I find the " + GetItemName(4206)[=Consecration seed] + "?"
- **Flow:** TRIGGER: Lowe 550 first-click (spawns 3305,9373 / 3246,3516 / 2801,3175 / 2823,3443). Player-head chat but the line is written to component **977** (973's text line is 976) -> chatbox likely shows only the name. CONTINUE -> 551 (no case: nothing rendered); 2nd CONTINUE -> close. Leftover of Q1 (intended pair 11021 -> 11022). [CUSTOM]

#### case 11021 — PLAYER-chat 973 (head 974 anim 615, name 975, line 976)
- `975` playerName
- `977` "Ok, where can I find the " + GetItemName(4206)[=Consecration seed] + "?"
- **Flow:** UNREACHABLE (only referenced by a commented-out `// NpcDialogue = 11021;` after 1102). Same text as 550.

#### case 11022 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "It can be found in the caves of Relleka, north "
- `4886` "of Camelot, but be warned, evil monsters lie there..."
- **Flow:** UNREACHABLE. Intended Horvik reply about where the Consecration seed is.

#### case 100 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Hey I need help with making some invisible armour..."
- `4886` "and you're gonna help me."
- q1stage = 1
- **Flow:** Q1 Invisible Armour stage 0 (Horvik 549, q1stage==0). Sets q1stage=1 on render. CONTINUE -> special branch: re-send, q1stage=1, loadquestinterface(), close.

#### case 101 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "I'll add the list of materials I need to your"
- `4886` "quest log, as I'm too busy to talk."
- q1stage = 1
- **Flow:** Q1 q1stage==1 & missing any of 451/2339/1777. CONTINUE -> special: re-send, q1stage=1, loadquestinterface(), close.

#### case 102 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Why are you still here...go get the materials"
- q1stage = 2
- **Flow:** Q1 q1stage==2 & no 6889. CONTINUE -> special: re-send, q1stage=2, loadquestinterface(), close.

#### case 103 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Get me the " + GetItemName(4206)[=Consecration seed] + " please!"
- **Flow:** Q1 q1stage==3. CONTINUE -> special: re-send, close.

#### case 104 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "You lost it?!?! Go get it again man."
- q1stage = 3
- **Flow:** Q1 q1stage==4 & no 4206. **Regresses q1stage to 3** on render. CONTINUE -> special: re-send, close.

#### case 1101 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Thanks for getting me these, I've updated"
- `4886` "your quest log for my next request."
- q1stage = 2
- deleteItem(451, getItemSlot(451), 1)
- deleteItem(2339, getItemSlot(2339), 1)
- deleteItem(1777, getItemSlot(1777), 1)
- **Flow:** Q1 q1stage==1 & has Runite ore 451 + Palm leaf 2339 + Bow string 1777 -> takes one of each, q1stage=2. CONTINUE -> special: re-send, q1stage=2, loadquestinterface(), close.

#### case 1102 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Thanks giving me the " + GetItemName(6889)[=Mage Book] + ", now all I need"
- `4886` "is the " + GetItemName(4206)[=Consecration seed] + " to add the power to the armour."
- q1stage = 3
- deleteItem(6889, getItemSlot(6889), 1)
- **Flow:** Q1 q1stage==2 & has 6889 -> takes it, q1stage=3. CONTINUE -> special: re-send, q1stage=3, loadquestinterface(); window is NOT closed.

#### case 4444 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Welcome to the Thieving Area :)"
- **Flow:** TRIGGER: Dark_mage 1001 first-click (spawn 3302,3200 h0, autospawn label 'pc monster'). CONTINUE -> close. [CUSTOM]

#### case 1694 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Happy Halloween from Mod Allstarscape v3!"
- addItem(1419, 1)
- **Flow:** UNREACHABLE (nothing sets NpcWanneTalk=1694). Would give Scythe 1419. Its packet-40 branch ("Happy Halloween from Mod Allstar..!") is also dead because 1694 is in the +1 list (-> 1695, no case).

#### case 1105 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- if (q1stage == 4)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Thanks for helping me with this project,"
- `4886` "heres your Mother.. i freshly fucked her =0, also look out for more of this armour..."
- showQuestCompleted("Invisible Armour", 3)
- q1stage = -1
- addItem(6656, 1)
- sendMessage("Quest complete!")
- loadquestinterface()
- deleteItem(4206, getItemSlot(4206), 1)
- **Flow:** Q1 completion (q1stage==4 & has 4206). Rewards: showQuestCompleted("Invisible Armour", 3) -> +3 QP; addItem(6656) (6656 not in item.cfg; in the RS cache it is the Camo helmet - Item.java lists 6654/6655/6656 in the body/legs/head arrays); msg "Quest complete!"; takes the seed. **No `break` outside the `if`** -> with q1stage!=4 it would fall through into case 200 (unreachable in practice). CONTINUE -> default close (the packet-40 branch with the clean text "heres your reward, also look out for more of this armour..." is dead because q1stage is already -1).

#### case 200 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Yo, I'll add what I need to your quest log"
- q2stage = 1
- loadquestinterface()
- **Flow:** Q2 Cook's Assistant start (Cook 278, q2stage==0): q2stage=1, loadquestinterface(). CONTINUE -> close.

#### case 201 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Come back when you have the ingredients."
- **Flow:** Q2 q2stage==1 & missing any of 1944/1927/1933. CONTINUE -> close.

#### case 2001 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- if (q2stage == 1)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Thanks for getting me the ingredients!"
- showQuestCompleted("Cook's Assistant", 2)
- q2stage = -1
- addItem(775, 1)
- sendMessage("Quest complete!")
- loadquestinterface()
- deleteItem(1927, getItemSlot(1927), 1)
- deleteItem(1944, getItemSlot(1944), 1)
- deleteItem(1933, getItemSlot(1933), 1)
- **Flow:** Q2 completion (q2stage==1 & has Egg 1944 + Bucket of milk 1927 + Pot of flour 1933): showQuestCompleted("Cook's Assistant", 2) -> +2 QP; Cooking gauntlets 775; msg "Quest complete!"; takes the 3 items. **No `break` outside `if`** -> would fall into case 14600 if q2stage!=1 (unreachable in practice). CONTINUE -> close.

#### case 14600 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Yo you want a make over?"
- `4905` ""
- `4906` ""
- **Flow:** TRIGGER: Make-over_mage 599 first-click (NOT spawned). CONTINUE -> 14601. [CUSTOM text/price]

#### case 14601 — 2-OPTION menu 2459 (title 2460, opt1 2461=btn 9157, opt2 2462=btn 9158)
- `2460` "Select an Option"
- `2461` "Sure"
- `2462` "Nope"
- **Flow:** OPT1 -> 14602. OPT2 -> NpcDialogue=0, NpcDialogueSend=true, close.

#### case 14602 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Ok that'll be 10000 coins"
- `4905` ""
- `4906` ""
- **Flow:** CONTINUE -> 14603.

#### case 14603 — 2-OPTION menu 2459 (title 2460, opt1 2461=btn 9157, opt2 2462=btn 9158)
- `2460` "Select an Option"
- `2461` "Ok"
- `2462` "Gay..."
- **Flow:** OPT1 -> 14604. OPT2 -> NpcDialogue=0, NpcDialogueSend=true, close.

#### case 14604 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- if (playerHasItemAmount(995, 10000))
- deleteItem(995, getItemSlot(995), 10000)
- showInterface(3559)
- NpcDialogue = 0
- else
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "You got no money, bitch,"
- `4905` "come back when you got some."
- `4906` ""
- **Flow:** If player has >=10000 coins (995 in one stack): delete 10000 coins, showInterface(3559) (character design screen), NpcDialogue=0 (no chat). Else render the 'no money' lines. CONTINUE -> close.

#### case 300 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Oh ok if you to tell me ok."
- `4905` ""
- `4906` ""
- **Flow:** Q3: reached via 302 OPT2. CONTINUE -> close (q3stage stays 0).

#### case 301 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Hi there, you don't happen to of seen a staff"
- `4905` "with a pink orb, have you?"
- `4906` ""
- **Flow:** Q3 start: Wizard_Mizgog 706 first-click with q3stage==0 (706 is NOT spawned in autospawn.cfg). CONTINUE -> 302.

#### case 302 — 2-OPTION menu 2459 (title 2460, opt1 2461=btn 9157, opt2 2462=btn 9158)
- `2460` "Select an Option"
- `2461` "No but maybe I can help?"
- `2462` "Nope"
- **Flow:** OPT1 'No but maybe I can help?' -> 303 and **q3stage=1**. OPT2 'Nope' -> 300.

#### case 303 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "You will? Well I think it's located in a"
- `4905` "dungeon to the east of Ardougne, try there."
- `4906` ""
- **Flow:** CONTINUE -> close.

#### case 304 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Go get the staff of Armadyl!"
- `4905` ""
- `4906` ""
- **Flow:** Q3 q3stage==1 & no Staff of armadyl 84. CONTINUE -> close.

#### case 305 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Thanks! Now you'll need to get me"
- `4905` "the magic stone, which Kalrag owns."
- `4906` ""
- q3stage = 2
- **Flow:** Q3 q3stage==1 & has 84 -> q3stage=2 (staff is NOT taken). CONTINUE -> 306.

#### case 306 — 2-OPTION menu 2459 (title 2460, opt1 2461=btn 9157, opt2 2462=btn 9158)
- `2460` "Select an Option"
- `2461` "Where is Kalrag?"
- `2462` "Ok bye."
- **Flow:** OPT1 -> 307. OPT2 'Ok bye.' -> **no handler** (btn 9158 has a branch for 305, not 306) -> nothing happens.

#### case 307 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Kalrag can be found in Lumbridge Swamp,"
- `4905` "good luck " + playerName + "!"
- `4906` ""
- **Flow:** CONTINUE -> close.

#### case 308 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Ok good, you have the magic stone,"
- `4905` "now you'll need to make a firework..."
- `4906` ""
- q3stage = 3
- **Flow:** Q3 q3stage==2 & has Magic stone 4703 -> q3stage=3 (stone NOT taken). CONTINUE -> 309.

#### case 309 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "To do this get a gnome bowl and use it"
- `4905` "with a fire to create an item named fire..."
- `4906` ""
- **Flow:** CONTINUE -> 310.

#### case 310 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Then you'll need to use that with the magic"
- `4905` "stone to make a firework and then return to me"
- `4906` ""
- **Flow:** CONTINUE -> close.

#### case 311 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Go get the magic stone bitch!"
- `4905` ""
- `4906` ""
- **Flow:** Q3 q3stage==2 & no 4703. CONTINUE -> close.

#### case 312 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "You forgot to go get the firework."
- `4905` ""
- `4906` ""
- **Flow:** Q3 q3stage==3 & no Firework 3006. CONTINUE -> close.

#### case 313 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Good you got it, aiightz now you need"
- `4905` "to go to level 40+ wilderness where the..."
- `4906` ""
- q3stage = 4
- **Flow:** Q3 q3stage==3 & has 3006 -> q3stage=4 (firework NOT taken). CONTINUE -> 314.

#### case 314 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "abberant spectors are, and light the"
- `4905` "firework on the red circle to spawn the..."
- `4906` ""
- **Flow:** CONTINUE -> 315.

#### case 315 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "heart crystal which you'll need later..."
- `4905` "Good luck!"
- `4906` ""
- **Flow:** CONTINUE -> close.

#### case 316 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Good luck getting the heart crystal!"
- `4905` ""
- `4906` ""
- **Flow:** Q3 q3stage==4 & no Heart crystal 744. CONTINUE -> close.

#### case 317 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Great! You got the crystal! Now all that needs"
- `4905` "doing is getting your disguise for when you..."
- `4906` ""
- q3stage = 5
- **Flow:** Q3 q3stage==4 & has 744 -> q3stage=5. CONTINUE -> 318.

#### case 318 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "sneak into the mage guild, to do that"
- `4905` "you'll need to head to Camelot Castle, then..."
- `4906` ""
- **Flow:** CONTINUE -> 319.

#### case 319 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "head into the North East section of the garden,"
- `4905` "and into the shelter, and then drop the..."
- `4906` ""
- **Flow:** CONTINUE -> 320.

#### case 320 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "heart crystal on the red circle to spawn the"
- `4905` "Infernal Mage, kill him and take the disguise!"
- `4906` ""
- **Flow:** CONTINUE -> close.

#### case 321 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Come back with the disguise in your inventory..."
- `4905` ""
- `4906` ""
- **Flow:** Q3 q3stage==5 & no Mourner cloak 6070. CONTINUE -> close.

#### case 322 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Good, you have the diguise, now all you need to do"
- `4905` "is put it on the disguise and..."
- `4906` ""
- q3stage = 6
- **Flow:** Q3 q3stage==5 & has 6070 -> q3stage=6. CONTINUE -> 323.

#### case 323 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "head to the Mage Guild located in Yanille."
- `4905` "Go in wearing the disguise and look for the"
- `4906` ""
- **Flow:** CONTINUE -> 324 (sentence continues).

#### case 324 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "daconia rock, which is needed to complete the staff"
- `4905` "and return to me for you reward."
- `4906` ""
- **Flow:** CONTINUE -> close.

#### case 325 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Go get the rock bitch!"
- `4905` ""
- `4906` ""
- q3stage = 6
- **Flow:** Q3 q3stage>=6 & no Daconia rock 793 -> sets q3stage=6. CONTINUE -> close.

#### case 326 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Thanks so much! I'll now give you the"
- `4905` "power of the Gods and your reward!"
- `4906` ""
- q3stage = -1
- savemoreinfo()
- showQuestCompleted("Spells Of The Gods", 4)
- addSkillXP(1000000, 6)
- addItem(6603, 1)
- sendMessage("You are rewarded 1 million magic experience!")
- sendMessage("You can now use all 3 god spells! (Level 99 magic needed)")
- **Flow:** Q3 completion: q3stage==7 & has 793 -> q3stage=-1, savemoreinfo(), showQuestCompleted("Spells Of The Gods", 4) -> +4 QP, addSkillXP(1000000, 6) = +1,000,000 Magic XP, item 6603 ('magic staff' in item.cfg: examine 'a nooby staff k.', +100 magic attack, +10 strength bonus), then the 2 chat messages. Rock NOT taken. CONTINUE -> close.

#### case 254 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Hey I need help with making some invisible armour..."
- `4886` "and you're gonna help me."
- **Flow:** UNREACHABLE duplicate of 100 (no stage change).

#### case 2259 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Hello, would you like me to tele you to the abyss?"
- `4905` ""
- `4906` ""
- **Flow:** TRIGGER: Mage_of_Zamorak 2259 first-click (NOT spawned). CONTINUE -> 2260. [CUSTOM]

#### case 2260 — 2-OPTION menu 2459 (title 2460, opt1 2461=btn 9157, opt2 2462=btn 9158)
- `2460` "Select an Option"
- `2461` "Hell yeah!"
- `2462` "No thanks."
- **Flow:** OPT1 'Hell yeah!' -> NpcDialogue=0, msg "You teleport to the abyss.", teleport (3040,4842) (height unchanged). OPT2 -> close.

#### case 1001 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Hello...are you wishing to be converted?"
- `4905` ""
- `4906` ""
- **Flow:** UNREACHABLE (Dark mage NPC 1001 is routed to 4444). CONTINUE -> 1002.

#### case 1964 — NPC-chat 4900 (head 4901 no anim, name 4902, lines 4903-4906)
- `4902` GetNpcName(NpcTalkTo)
- `4903` ""
- `4904` "Happy Halloween from Mod Allstarscape v3!"
- `4905` ""
- `4906` ""
- addItem(1491, 1)
- **Flow:** UNREACHABLE (NPC 1964 - source comment 'Robin', npc.cfg 'Mummy' - is routed to NpcWanneTalk 7777, which has no case). Would give Witches cat 1491.

#### case 1002 — 2-OPTION menu 2459 (title 2460, opt1 2461=btn 9157, opt2 2462=btn 9158)
- `2460` "Select an Option"
- `2461` "Of course...but only if you suck my cock first!."
- `2462` "Nope, im not gay."
- **Flow:** UNREACHABLE. OPT1 -> stillgfx(435), close; toggle: if ancients==1 -> setSidebarInterface(6,1151), ancients=0, msg "The dark mage converts back to normal magic!" else setSidebarInterface(6,12855), ancients=1, msg "The dark mage converts you to ancient magicks!". OPT2 -> NpcDialogue=0, NpcDialogueSend=true, close.

#### case 9292 — 2-OPTION menu 2459 (title 2460, opt1 2461=btn 9157, opt2 2462=btn 9158)
- `2460` "one of those evil monks stole my wistle "
- `2461` "and i just happened to see you when i used my."
- `2462` "scrying orb so your getting it back for me, Oh yeh ill suck ur cock"
- **Flow:** UNREACHABLE random event (source comment: 'for random event by pimp'); process() checks NpcWanneTalk==9292 (distance 1, NPC on tile y-1) but it is never assigned. Uses the 2-option frame as 3 text lines.

#### case 6889 — NPC-chat 4882 (head 4883 anim 591, name 4884, lines 4885-4886)
- `4884` GetNpcName(NpcTalkTo)
- `4885` "Happy Halloween from Mod Allstarscape v3!"
- addItem(1419, 1)
- **Flow:** TRIGGER: Ghost_Disciple 1686 first-click only when q1stage==2 (else msg "The ghost isn't interested in talking at the moment."); 1686 is NOT spawned. Gives Scythe 1419 **every time**. Source comment says 'Robin'. CONTINUE -> close. [CUSTOM Halloween]


### 3.2 `dialogues.cfg` — JUNK (never loaded)

No Java file reads it (the only case-insensitive "dialogues" hits are the substring of `NpcDialogueSend`). It is a Project-Czar leftover (other leftovers: hard-coded log paths `C:/Documents and Settings/Administrator/My Documents/Project Czar/...`). Verbatim (tabs shown as spaces):

```
/npc speaks
//---------id---type----nextdia-dialoguetext1-------------------------------------------dialoguetext2-------------------dialoguetext3
dialogue = 550	1	0	Come_back_when_you_have_the_ingredients.	EMPTY	EMPTY
dialogue = 1694	1	0	Happy_Halloween_from_Project_Czar!		EMPTY	EMPTY
//player speaks (same as 1)
//---------id---type----nextdia-dialoguetext1-------------------------------------------dialoguetext2-------------------dialoguetext3

//player must choose
//---------id---type----nexto1--nexto2--nexto3--swclose-swfar---question------------------------option1-----------------------------------------option2-----------------------------------------option3
dialogue = 306	2	5	0	0	1	0	Select_an_option	Where_is_Kalrag?	Okay_bye.	EMPTY	307	
dialogue = 1002	2	6	0	0	1	0	Select_an_option	Of_course	Nope.	EMPTY	0
dialogue = 2260	2	7	0	0	1	0	Select_an_option	Hell_yeah!	No_Thanks.	EMPTY	0
dialogue = 9001	2	5	0	0	1	0	Select_an_option	Sure	Nope	EMPTY	9002
dialogue = 9003	2	8	0	0	1	0	Select_an_option	Okay.	Gay...	EMPTY	0
dialogue = 370	2	1	0	0	1	0	Select_an_option	FFS_you_homo.	lol.	EMPTY	0
[ENDOFDIALOGUELIST] 
```

---

## 4. Non-NPC dialogue menus (objects / items)

### 4.1 Juna the snake — object 6657, first click (l.3416) — CUSTOM
`selectoption("Hello what do you want?", "Can I go through please?", "Ya ma.", "")`; sets `JunaTele = 1` if `absX < objectX`, `JunaTele = 2` if `absX > objectX`.
- Opt 1 → teleport to (3253, absY) [JunaTele 1] or (3251, absY) [JunaTele 2] (blocked by §4.4 when `NpcDialogue == 0`).
- Opt 2 → player chat 973: `` `975` playerName ``, `` `976` "Ya ma." ``.

### 4.2 Team-select object 2466, first click (l.4215, only if `actionTimer == 0`) — CUSTOM
`selectoption("@whi@W@gre@h@whi@e@gre@r@whi@e @whi@d@gre@o @whi@y@gre@o@whi@u @whi@w@gre@a@whi@n@gre@t @whi@t@gre@o @whi@g@gre@o@whi@?", "@red@Saradomin's Clan", "@red@Zamorak's Clan", "")`; `OptionObject = 2466`.
- Opt 1 → `"Welcome to Saradomin's team!"`, teleport (2387, 3116) (blocked by §4.4 when `NpcDialogue == 0`).
- Opt 2 → `"Welcome to Zamorak's team!"`, teleport (2412, 3091).

### 4.3 Ring of dueling (items 2552/2554/2556/2558/2560/2562/2564 = Ring of dueling(8)…(2)), item option packet 75 (l.18380) — CUSTOM destinations
If `teleblock`: `"You are currently teleblocked and cannot teleport"`. Else `duelring = true`; `selectoption("Where would you like to go?", "@whi@J@gre@a@whi@d", "@whi@R@gre@u@whi@n@gre@e@whi@c@gre@r@whi@a@gre@f@whi@t", "")`.
- Opt 1 "Jad" → (2837, 9581, h0), `"You teleport to the TzTok-Jad's lair"`, `"As you materialize, you feel the air around you grow hot"` (blocked by §4.4 when `NpcDialogue == 0`).
- Opt 2 "Runecraft" → (3040, 4840, h0), `"You teleport to the abyssal rift"`, `"You can feel the magical aura in the air"`.
- No charge is consumed. (Same packet: Amulet of glory(4) 1712 → teleport (2852, 3863, h0) + `"Home, sweet home"`, or `"You are currently teleblocked and cannot teleport"`.)

### 4.3b God books — Holy book 3840 / Unholy book 3842 / Book of balance 3844, item option packet 16 (l.18406) — AUTHENTIC text
4-OPTION 2480: `sendFrame171(1, 2465)`, `sendFrame171(0, 2468)`, `` `2481` "Select an Option" ``, `` `2482` "Wedding rights" ``, `` `2483` "Last rights" ``, `` `2484` "Blessing" ``, `` `2485` "Preach" ``, `sendFrame164(2480)`, `NpcDialogueSend = true`, sets `holyBook` / `unholyBook` / `balanceBook`.
Buttons 9178–9181 (l.23607) close the menu and start forced overhead chat (`txt4`), one line every 7 ticks (`preachTimer = 7`), then `preaching = 1` → `preaching()` plays anim 1335 (holy) / 1336 (unholy) / 1337 (balance) and resets flags:

| Book | 9178 "Wedding rights" | 9179 "Last rights" | 9180 "Blessing" | 9181 "Preach" |
|---|---|---|---|---|
| Holy (3840) | `"In the name of Saradomin,"` → `"Protector of us all,"` → `"I now join you in the eyes of Saradomin."` | `"Thy cause was false, thine skills did lack,"` → `"See you in Lumbridge when you get back."` | `"Go in peace in the name of Saradomin,"` → `"May his glory shine upon you like the sun."` | `"Protect yourself, protect your friends,"` → `"Mine is the glory that never ends,"` → `"This is Saradomin's wisdom."` |
| Unholy (3842) | `"Two great warriors, joined by hand,"` → `"To spread destruction across the land,"` → `"In Zamorak's name, now two are one."` | `"The weak deserve to die,"` → `"So that the strong may flourish,"` → `"This is the creed of Zamorak."` | `"May your bloodthirst be never sated,"` → `"And may all your battles be glorious,"` → `"May Zamorak bring you strength."` | `"Strike fast, strike hard, strike true,"` → `"The strength of Zamorak will be with you,"` → `"Zamorak give me strength."` |
| Balance (3844) | `"Light and dark, day and night,"` → `"Balance arises from contrast,"` → `"I unify thee in the name of Guthix."` | `"Thy death was not in vain,"` → `"For it brought some balance to the world."` → `"May Guthix bring you rest."` | `"May you walk the path, and never fall,"` → `"For Guthix walks beside thee on thy journey."` → `"May Guthix bring you balance."` | `"The trees, the earth, the sky, the waters,"` → `"All play their part upon this land."` → `"May Guthix bring you balance."` (last line never sets `preaching=1` → no animation) |

### 4.4 Option-1 hijack bug (important for 1:1 behaviour)
In the button-9157 chain the branch `NpcDialogue == 0` (→ opens Hans' 1340 menu with `` `4885` "Mmk thanks for reading!" `` sent first) comes **before** the `duelring`, `OptionObject == 2466` and `JunaTele` branches. `NpcDialogue` is 0 in the normal idle state, so option 1 of the Ring-of-dueling, team-select and Juna menus normally opens `"Select an Option" / "Yea i wanna go own n00bs!" / "Nah im really scared!"` instead of acting. They only work when a previous dialogue left `NpcDialogue` non-zero (e.g. after quest-1 or clue dialogues, whose continue branches never reset it). Option 2 of those menus works because 9158 has no `== 0` branch.

---

## 5. Quests

### 5.1 State and persistence
- Fields (l.7872): `questid` (only used by the dead journal), `q1stage`, `q2stage`, `q3stage`, `q4stage` (never changed, never saved), `totalqp`. Stage convention: `0` not started, `1..n` in progress, `-1` completed.
- Saved by `savemoreinfo()` to `./moreinfo/<playerName>.txt`: section `[QUESTS]` with `character-questpoints = totalqp`, `character-quest_1 = q1stage`, `character-quest_2 = q2stage`, `character-quest_3 = q3stage`; section `[MOREINFO]` holds `character-clueid`, `character-cluelevel`, `character-cluestage` (plus lastlogin, lastlogintime, reputation, ancients, starter, hasegg, hasset, pkpoints, killcount, deathcount, mutedate, height).
- Quest points are only awarded by `showQuestCompleted` (3 + 2 + 4 = 9 max) and are shown only on the completion scroll (quest tab line 682 is blanked).

### 5.2 Quest tab (`loadquestinterface()`, l.8528) — CUSTOM, doubles as a welcome note
Called at login (after `loadmoreinfo()`), by `::loadbackup`, and by the quest-1/quest-2 dialogue branches. Clicking quest names does nothing (buttons 28164–28180 are empty cases, l.23443).

| Component | Text (condition) |
|---|---|
| `640` | `"@red@Allstar-Scape"` |
| `663` | `"@whi@Info"` |
| `682` | `""` |
| `7332` | `q1stage == -1`: `"@gre@Invisible Armour"` · `q1stage >= 1`: `"@yel@Invisible Armour"` · `q1stage == 0`: `"@whi@Thank you for choosing"` |
| `7333` | `q2stage == -1`: `"@red@Allstar-Scape"` · `q2stage >= 1`: `"@red@Allstar-Scape"` · `q2stage == 0`: `"@yel@Allstar-Scape"` |
| `7334` | `q3stage == -1`: `"@gre@Spells Of The Gods"` · `q3stage >= 1`: `"@yel@Spells Of The Gods"` · `q3stage == 0`: `"@whi@We hope you have a great"` |
| `7336` | `q4stage == -1`: `"@gre@The Story Of Ramen"` · `q4stage >= 1`: `"@yel@The Story Of Ramen"` · `q4stage == 0`: `"@whi@Good time on our server =)"` |
| `7339` | `"          - Mod Allstar"` (10 leading spaces) |

Blanked (`""`), in call order: 682, 7383, 7338, 7340, 7346, 7341, 7342, 7337, 7343, 7335, 7344, 7345, 7347, 7348, 12772, 7352, 12129, 8438, 12852, 7354, 7355, 7356, 8679, 7459, 7357, 12836, 7358, 7359, 14169, 10115, 14604, 7360, 12282, 13577, 12839, 7361, 11857, 7362, 7363, 7364, 10135, 4508, 11907, 7365, 7366, 7367, 13389, 7368, 11132, 7369, 12389, 13974, 7370, 8137, 7371, 12345, 7372, 8115, 8576, 12139, 7373, 7374, 8969, 7375, 7376, 1740, 3278, 7378, 6518, 7379, 7380, 7381, 11858, 9927, 7349, 7350, 7351, 13356. (Every stock quest name is hidden.)

Fresh account therefore reads: **Allstar-Scape / Info / Thank you for choosing / Allstar-Scape / We hope you have a great / Good time on our server =) / - Mod Allstar**. Cook's Assistant never shows its own name (7333 stays "Allstar-Scape", only the colour changes).

### 5.3 Quest-complete scroll (`showQuestCompleted(questName, rewardqp)`, l.8031)
`totalqp += rewardqp`; `showInterface(297)`; `` `299` "Congratulations!" ``, `` `300` "Close Window" ``, `` `6156` "You are awarded" ``, `` `6158` "Earned QP:" ``, `` `303` "Total QP:" ``, `` `301` "You have completed " + questName ``, `` `4444` "" + rewardqp ``, `` `304` "" + totalqp ``. (No reward-item model, no jingle.)

### 5.4 Quest journal (`quest()` l.7880 + `loadquest()` l.8044) — CUSTOM text, DEAD code
Nothing sets `questid` (the only assignment is commented out at l.24442), so the journal never opens. Template `loadquest(name, l1..l9)`: `` `8144` "@dre@Quest" ``, `clearQuestInterface()` (blanks 8145, 8147–8195, 12174–12223), `` `8145` "@dbl@" + questname ``, `8147`..`8155` = `"@dbl@@dre@" + lineN + "@dbl@"`, `sendQuestSomething(8143)`, `showInterface(8134)`. Journal lines (empty trailing lines omitted):

| Quest / stage | Journal lines (verbatim) |
|---|---|
| Invisible Armour, q1=0 | `"To start this quest talk with " + GetNpcName(549)[=Horvik]` · `"who can be found in Varrock Armour"` · `"shop, good luck."` |
| q1=1 | `GetNpcName(549)[=Horvik] + " has asked me to collect the resources"` · `"needed to make the armour"` · `"These include:"` · `GetItemName(451)[=Runite ore]` · `GetItemName(2339)[=Palm leaf]` · `GetItemName(1777)[=Bow string]` |
| q1=2 | `"I now need to collect the " + GetItemName(6889)[=Mage Book]` · `"so that " + GetNpcName(549)[=Horvik] + " can make the armour."` |
| q1=3 | `"All " + GetNpcName(549)[=Horvik] + " needs now is"` · `"a " + GetItemName(4206)[=Consecration seed] + " to add the power to the armour."` · `"The crystal can be found in the caves"` · `"of Relleka, North of Camelot."` · `"But be careful, as there is many dangerous"` · `"creatures there..."` |
| q1=4 | `"You have the " + GetItemName(4206)[=Consecration seed] + "."` · `"Return to Horvik for your reward!"` |
| q1=-1 | `"@gre@QUEST COMPLETE!"` |
| Cook's Assistant, q2=0 | `"To start this quest talk with the " + GetNpcName(278)[=Cook]` · `"who can be found in Lumbridge castle"` · `"good luck."` |
| q2=1 | `GetNpcName(278)[=Cook] + " has asked me to collect the following"` · `"ingredients for his cake:"` · `GetItemName(1933)[=Pot of flour]` · `GetItemName(1944)[=Egg]` · `GetItemName(1927)[=Bucket of milk]` |
| q2=-1 | `"@gre@QUEST COMPLETED!"` |
| Spells Of The Gods, q3=0 | `"To start this quest talk with " + GetNpcName(706)[=Wizard_Mizgog]` · `"who can be found in the Wizards"` · `"Tower good luck."` |
| q3=1 | `GetNpcName(706)[=Wizard_Mizgog] + " has asked me to the Lesser Demon"` · `"which can be found in a dungeon to the"` · `"East of Ardougne to retrieve "` · `"the Staff of Armadyl."` |
| q3=2 | `"I now need to kill Kalrag to get"` · `"the magic stone, he can be"` · `" found in the Lumbridge Swamps."` |
| q3=3 | `GetNpcName(706)[=Wizard_Mizgog] + " Now needs me to collect a firework"` · `" I can make one by using a gnome bowl"` · `" with a fire to create the item fire, and"` · `"then use the fire with the magic stone to"` · `"make an armed firework."` |
| q3=4 | `"I now need to light the firework in the red"` · `"circled spot where the abberant spectors"` · `"are, in level 40+ wilderness to"` · `"spawn the heart crystal."` |
| q3=5 | `GetNpcName(706)[=Wizard_Mizgog] + " says I should drop the heart crystal"` · `"on the red circle in the small"` · `"sheler located North East of Camelot"` · `"Castle's garden to summon the"` · `"infernal mage, which I must kill"` · `"in order to get the disguise."` |
| q3=6 | `"I now have the Infernal Mage disguise, I"` · `"must infiltrate the Mage Guild and"` · `"find the Daconia Rock which is the"` · `"final part to the staff"` |
| q3=7 | `"I now have the Daconia Rock!"` · `"I can now return to " + GetNpcName(706)[=Wizard_Mizgog] + " for my reward"` |
| q3=-1 | `"@gre@QUEST COMPLETE!"` |

### 5.5 Quest 1 — "Invisible Armour" (CUSTOM, 3 QP)
- **Giver:** Horvik (NPC 549), spawned at (2377, 3442, h0) (autospawn label "smithing shop"; journal says Varrock armour shop). First-click routing (l.19225, `else if` chain, first match wins): clue L1/S1/id1 → 31; `q1stage==0` → **100**; `q1stage==1` missing any of 451/2339/1777 → **101**; `q1stage==2` without 6889 → **102**; `q1stage==3` → **103**; `q1stage==4` without 4206 → **104**; `q1stage==1` with all three → **1101**; `q1stage==2` with 6889 → **1102**; `q1stage==4` with 4206 → **1105**; else `"Horvik isn't interested in talking right now..."`.
- **Steps:** (1) talk → stage 1. (2) bring Runite ore 451 + Palm leaf 2339 + Bow string 1777 → taken, stage 2. (3) bring Mage Book 6889 → taken, stage 3. (4) stage 3 → 4 happens in `process()` (l.17534): `if (Killedqueen == true && q1stage == 3) q1stage = 4;` (5) bring Consecration seed 4206 → reward.
- **Side content:** Ghost_Disciple 1686 at stage 2 gives a Scythe (dialogue 6889, not the book). Lowe 550 says the player line about the seed (550). Guard gate in `process()`: `if (Guard == 2) guardsdead = true;` and `if (guardsdead == false && (absX == 2790 || absX == 2791) && absY == 10216)` → `sendMessage("The guards kick you out the way.")`, teleport (2790, 10214).
- **Reward (dialogue 1105):** `showQuestCompleted("Invisible Armour", 3)`, item **6656** (Camo helmet in the RS cache; missing from item.cfg), `"Quest complete!"`, seed removed. The dialogue line promises more of the armour (Camo top 6654 / bottoms 6655 would be the set; never given).
- **Why it cannot be completed as shipped:** `Killedqueen` (Player.java l.277) and `Guard` are never assigned anywhere → stage 3 never advances and the guard gate never opens; Mage Book 6889 has no live source (only `npcdrops.cfg` "npcdrop = 795 3 6889 1" for Ice_Queen 795, but the npcdrops-driven drop code `MonsterDropItems` is commented out); Consecration seed 4206 has no source. Intended design (from names): kill the Ice Queen (Ice_Queen 795 spawned at 2540,3018 with label "armadly") past guards in "the caves of Relleka, north of Camelot" to get the seed.

### 5.6 Quest 2 — "Cook's Assistant" (name AUTHENTIC, implementation CUSTOM, 2 QP)
- **Giver:** Cook (NPC 278) — **not spawned**. Routing (l.19256): `q2stage==0` → **200** (sets stage 1); `q2stage==1` missing any of Egg 1944 / Bucket of milk 1927 / Pot of flour 1933 → **201**; `q2stage==1` with all → **2001**; else `"The cook isn't interested in talking right now..."`.
- **Reward:** `showQuestCompleted("Cook's Assistant", 2)` (+2 QP), Cooking gauntlets 775, `"Quest complete!"`, the three ingredients removed. (Real RS: 1 QP + 300 Cooking XP.) This conflicts with LC's authentic Cook's Assistant — a 1:1 port has to replace its dialogue/reward.

### 5.7 Quest 3 — "Spells Of The Gods" (CUSTOM, 4 QP)
- **Giver:** Wizard_Mizgog (NPC 706) — **not spawned**. Routing (l.19028) is a series of independent `if`s (last match wins): `q3stage==0` → 301; `1` & no 84 → 304; `1` & has 84 → 305; `2` & no 4703 → 311; `2` & 4703 → 308; `3` & no 3006 → 312; `3` & 3006 → 313; `4` & no 744 → 316; `4` & 744 → 317; `5` & no 6070 → 321; `5` & 6070 → 322; `>=6` & no 793 → 325; `7` & 793 → 326. (`q3stage==6` with the rock renders nothing, but `process()` l.17372 auto-sets `q3stage = 7` whenever the player holds Daconia rock 793 at stage 6.)
- **Step mechanics outside dialogue:**
  1. Staff of armadyl (84) from "the Lesser Demon … in a dungeon to the East of Ardougne" — **no drop/spawn code** (Lesser_demon 82 spawns exist at 3286,3163 h1 and 2831–2837,3267–3280 but have no 84 drop).
  2. Magic stone (4703) from Kalrag (NPC 997) in Lumbridge Swamp — **Kalrag not spawned, no drop code**.
  3. Use Gnomebowl mould 2166 on object 2732 → `addItem(4653, 1)` ("Fire object"; no message, no quest check, l.18857). Use 4653 with 4703 → `sendMessage("You rub the strong fire into the magic stone to create a firework.")`, removes both, gives Firework 3006. Condition as written: `(itemUsed == 4653 && useWith == 4703) || (itemUsed == 4703 && useWith == 4653) && q3stage == 3` (Java precedence: fire-on-stone works at any stage).
  4. Heart crystal (744): drop the firework and use the ground-item "light" option (packet 79) on it at exactly (3288, 3886) with `q3stage == 4`: with Tinderbox 590 in inventory → `sendMessage("You light the fireworks")`, firework removed, Heart crystal spawned on that tile; without → `sendMessage("You need a tinderbox to light the firework.")`. Shortcut (same precedence bug): Tinderbox 590 used on Firework 3006 (any stage) or firework on tinderbox (stage 4) → firework deleted and Heart crystal dropped at your feet, no message.
  5. Drop the Heart crystal at exactly (2780, 3515) with `q3stage == 5` → spawns Infernal_Mage 1645 at (x+1, y) (walk box ±3, HP from npc list = 450, mage attack gfx 369, hit 6–49); the crystal stays in the inventory. The disguise (Mourner cloak 6070) has **no drop code**.
  6. Daconia rock (793) "in the Mage Guild located in Yanille" — **no source**.
- **Reward (326):** q3stage −1, +4 QP, +1,000,000 Magic XP, item 6603 (`magic_staff`, examine `a_nooby_staff_k.`, +100 magic attack, +10 strength in item.cfg), messages `"You are rewarded 1 million magic experience!"`, `"You can now use all 3 god spells! (Level 99 magic needed)"`.
- **God-spell gate (combat code, l.28108–28204, player targets):** Saradomin Strike (spell 1190) and Claws of Guthix (1191) need Magic 60, Flames of Zamorak (1192) Magic 99; each costs 25 Blood runes (565) and hits 5–30; messages `"You do not have enough runes to cast this spell."`, `"You need 25 " + getItemName(565)`, `"SARA STRIKE!"`, `"CLAWS OF GUTHIX!!"`, `"You need a magic level of 60 to cast this spell."`, `"You need a magic level of 99 to cast this spell."`, `"You need to of completed Spells Of The Gods quest to use this spell."`. **Bug:** the gate is `if (q3stage >= 0)`, so anyone who has *not* finished may cast and finishers (−1) are refused. The NPC-target versions (l.21921) do not check the quest at all. Spellbook text (TextHandler) labels all three "Level 99".

### 5.8 Quest 4 "The Story Of Ramen" and "The secret commands quest"
- "The Story Of Ramen": only the quest-tab label at 7336; `q4stage` is never changed or saved → always shows `"@whi@Good time on our server =)"`. No implementation.
- "The secret commands quest": only advertised by `::questmenu` (§7.2): tele to 2511,3494 and "click board raft". No object handler exists for a raft there (no code for 2509–2511,3494) → not implemented.

---

## 6. Clue scrolls (CUSTOM system; `clue()` l.8206, `dig()` l.35601, `Clues.java`)

### 6.1 Items, state, obtaining
- Scrolls: 2681 (level 1), 2682 (level 2), 2683 (level 3) — all named "Clue scroll". Spade 952. State `cluelevel`, `cluestage` (1–5), `clueid` (1–5); `clueid = randomClue()` picks uniformly from `{1, 2, 3, 4, 5}` **at every stage**; saved in `[MOREINFO]`.
- Drops (NPCHandler l.1406): every kill of Smokedevil 1625, Aberrant specter 1604 (spawned once at 3434,3572) or Giant crypt spider 2035 rolls `Item.slayeritems65` (2682 is 1 of 891 entries); 1625 and 1604 additionally roll `Item.slayeritems75` (2682 is 2 of 927). ≈ 1/305 per Aberrant-specter/Smokedevil kill, 1/891 per crypt spider. Level-3 scroll 2683 exists only in `Item3.slayeritems85` (1 of 1634), which is never called; level-1 scroll has no source. (Castle-wars box bug below also hands out 2682.)

### 6.2 Reading a scroll (item first option → `buryBones`, packet 122)
`2681`: `clue()` then `cluelevel = 1; addItem(2681, 1)` (then the clicked slot is deleted); same for 2682 (`cluelevel = 2`) and 2683 (`cluelevel = 3`). `clue()` first calls `newclue(0)` if `cluelevel == 0 || clueid == 0 || cluestage == 0` (so the **first read of a fresh scroll shows no hint**, only rolls stage 1). Hint interfaces (quest scroll 8134):
- `sendclue1(x, y)`: `` `8144` "@dre@Clue Scroll" ``, `clearQuestInterface()`, `` `8145` "@dbl@Coordinates of next clue" ``, `` `8147` "@dbl@X Coordinate:@dre@ " + clueX + "@dbl@" ``, `` `8148` "@dbl@Y Coordinate:@dre@ " + clueY + "@dbl@" ``, `` `8149` "@dbl@@dre@ GOOD LUCK! @dbl@" ``, `sendQuestSomething(8143)`, `showInterface(8134)`.
- `sendclue3(a, b)`: `` `8144` "@dre@Clue Scroll" ``, `clearQuestInterface()`, `` `8145` "@dbl@Coordinates of next clue" ``, `` `8147` "@dbl@@dre@" + a + "@dbl@" ``, `` `8148` "@dbl@@dre@" + b + "@dbl@" ``, `` `8149` "@dbl@@dre@ GOOD LUCK! @dbl@" ``, `sendQuestSomething(8143)`, `showInterface(8134)`.

Item bookkeeping (net effects): `newclue()` = `clueid = random`, `cluestage += 1`, delete one each of 2681/2682/2683, `savemoreinfo()`. First read of a fresh scroll usually consumes it (it is re-added into the first empty slot and then the clicked slot is deleted); later reads keep it (it may move slots); dig steps are net 0 (`addItem` then `newclue` deletes one); NPC/object steps consume the scroll (no re-add). Players therefore often end up with no scroll mid-trail; the trail state survives and the spade still works.

### 6.3 Step types and messages
- **Dig:** use Spade 952 (item first option) while `cluelevel > 0` → `dig()`; afterwards the spade is re-added. `dig()` always prints `"Dig working - cheezy"`, then per level `"Clue level 1 found."` / `"Clue level 2 found."` / `"Clue level 3 found."`, and for level 1 only the stage banners `"Clue stage 1 found."` (S1), `"Clue stage 2 found."` (S2), `"Clue stage 4 found."` (S4). Correct tile: `"You find another clue!"` + `addItem(<same-level scroll>)` + `newclue()`; final stage: `"Congratulations you have completed the treasure trail!"` + delete scroll + `givereward(level)`. Wrong tile: nothing else. With clue debug on, also `"Clue Level: " + cluelevel`, `"Clue Stage: " + cluestage`, `"Clue ID: " + clueid`, `"X coord: " + absX`, `"Y coord: " + absY`.
- **NPC:** talk to the NPC → dialogue 31 `"Heres your next clue, goodluck"` (continue → `newclue`) or 32 `"Congratulations! Heres your last reward!"` (reward).
- **Object search** (objectClick2 = second option, l.4354): object 348 at (2611,3323) when L1/S2/id3 → `"You find another clue!"` + `newclue`; object 356 at (2424,3081) when `cluelevel == 1 && clueid == 4` (any stage) → `"You find another clue!"` + `newclue` + `addItem(2682, 1)` (**gives a level-2 scroll**); object 357 at (2757,2951) when L2/S2/id5 → `"You find another clue!"` + `newclue`.
- **Debug:** buttons 24135 → `"Clue debugging set to true."`, 24134 → `"Clue debugging set to false."`; labels via `loadothers()` (only called from `::loadbackup`): `` `6288` " Clue debug" ``, `` `6289` "Off" ``, `` `6290` "On" ``. `::loadclue` prints the three vars to the server console only.

### 6.4 Full step matrix (hint = what reading shows; step = what actually completes the stage)
"—" = `clue()` shows nothing for that combination. ⚠ = hint/step mismatch or broken step. Unspawned NPCs (Lundail, Fisher King, Louie legs, Zaff) make their steps impossible; since the id is re-rolled only on success, such a trail is stuck.

**Level 1 (2681)**

| St | id | Hint (verbatim) | Step |
|---|---|---|---|
| 1 | 1 | — | NPC Horvik 549 → 31 |
| 1 | 2 | coords 3211, 3688 | dig (3213, 3684) ⚠ |
| 1 | 3 | "Head to the crossroad located" / "south of the haunted house" | dig (3110, 3295) |
| 1 | 4 | — | NPC Shop_assistant 527 → 31 |
| 1 | 5 | coords 2684, 3286 | dig (2684, 3286) |
| 2 | 1 | coords 3191, 3363 | dig (3191, 3363) |
| 2 | 2 | "The old anvil would be a very" / "good place to check..." | dig (2947, 3450) |
| 2 | 3 | "Search the drawers of a house containing" / "a sink in East Ardougne" | search obj 348 at (2611, 3323) |
| 2 | 4 | "Search the boxes in castle wars" / "for your next clue." | search obj 356 at (2424, 3081) ⚠ gives 2682 |
| 2 | 5 | coords 3008, 3889 | dig (3008, 3889) |
| 3 | 1 | "Your next clue lies where the ghost of" / "Camelot lives..." | dig (2424, 3081) ⚠ (Castle Wars) |
| 3 | 2 | coords 2966, 3381 | dig (2966, 3381) |
| 3 | 3 | coords 3008, 3889 | dig (3008, 3889) |
| 3 | 4 | coords 2658, 3338 | dig (2658, 3338) |
| 3 | 5 | "A dolmen is always a good place to check" / "when doing treasure trails." | dig (3226, 3368) |
| 4 | 1 | — | NPC The_Fisher_King 220 → 31 ⚠ not spawned |
| 4 | 2 | — | NPC Louie_legs 542 → 31 ⚠ not spawned |
| 4 | 3 | coords 3235, 3294 | dig (3235, 3294) |
| 4 | 4 | coords 3258, 3243 | dig (3258, 3243) |
| 4 | 5 | "Try and check outside of the" / "castle in Lumbridge." | dig (3225, 3218) |
| 5 | 1 | "Try and check outside of the" / "castle in Lumbridge." | dig (3225, 3218) → reward |
| 5 | 2 | — | NPC Wise_Old_Man 2253 → 32 reward |
| 5 | 3 | coords 3141, 3425 | dig (3141, 3425) → reward |
| 5 | 4 | coords 3098, 3405 | dig (3098, 3405) → reward |
| 5 | 5 | coords 3113, 3961 | dig (3113, 3961) → reward |

**Level 2 (2682)** — `clue()` has two `if (clueid == 2/3/4)` blocks inside stage 1 and **no stage-2 block**, so stage-1 hints are overwritten by what look like stage-2 hints, and stage-2 reads show nothing.

| St | id | Hint actually displayed | Step |
|---|---|---|---|
| 1 | 1 | — | NPC Lundail 903 → 31 ⚠ not spawned |
| 1 | 2 | coords 3288, 3886 (3211, 3688 is sent first, then overwritten) | dig (3213, 3686) ⚠ |
| 1 | 3 | coords 2884, 3160 (3157, 3961 overwritten) | dig (3157, 3961) ⚠ |
| 1 | 4 | coords 2802, 2976 ("Read the sign up in the dangerous" / "mountains..." overwritten) | dig (2839, 3596) ⚠ |
| 1 | 5 | "Search the crates at the south west" / "of Karamja island, above the thick jungle." | NPC Louie_legs 542 → 31 ⚠ |
| 2 | 1 | — | NPC Aubury 553 → 31 |
| 2 | 2 | — | dig (3288, 3886) |
| 2 | 3 | — | dig (2884, 3160) |
| 2 | 4 | — | dig (2802, 2976) |
| 2 | 5 | — | dig (2839, 3596) or search obj 357 at (2757, 2951) |
| 3 | 1 | coords 2599, 3176 | dig (2599, 3176) |
| 3 | 2 | coords 2619, 3499 | dig (2619, 3499) |
| 3 | 3 | "At the end of the track." / "......." | dig (2601, 3490) |
| 3 | 4 | coords 2757, 3477 | dig (2757, 3477) |
| 3 | 5 | "The left flower patch" / "contains 4 flowers and your next clue." | dig (2987, 3388) |
| 4 | 1 | coords 3058, 3353 | dig (3058, 3353) |
| 4 | 2 | — | NPC Thessalia 548 → 31 |
| 4 | 3 | coords 3288, 3465 | dig (3288, 3465) |
| 4 | 4 | coords 3314, 3719 | dig (3314, 3719) |
| 4 | 5 | "The abandoned outpost near the poisonous" / "spiders holds your final clue." | dig (3311, 3768) |
| 5 | 1 | "The gypsy tent is the location of your" / "final reward." | dig (3203, 3424) → reward |
| 5 | 2 | — | NPC Louie_legs 542 → 32 reward ⚠ not spawned |
| 5 | 3 | coords 3113, 3961 | dig (3113, 3961) → reward |
| 5 | 4 | "A dolmen is always a good place to check" / "when doing treasure trails." | dig (3225, 3218) → reward |
| 5 | 5 | "The table full of bandages contains the" / "final reward." | dig (2424, 3078) → reward |

**Level 3 (2683)**

| St | id | Hint (verbatim) | Step |
|---|---|---|---|
| 1 | 1 | "Go to the skeletons at the dead ship." / "!!!..........!!!" | dig (3022, 3952) |
| 1 | 2 | coords 3211, 3688 | dig (3211, 3685) ⚠ |
| 1 | 3 | coords 3211, 3688 | dig (3211, 3685) ⚠ |
| 1 | 4 | "Your next clue lies where the ghost of" / "Camelot lives..." | dig (2774, 3515) ⚠ gives 2682 |
| 1 | 5 | "The hut that lies in the wilderness" / "is your next destination" | dig (3191, 3963) |
| 2 | 1 | "The pillars of stone in the north eastern coast" / "is a good place to go." | dig (3280, 3955) |
| 2 | 2 | coords 3092, 3963 | dig (3092, 3963) |
| 2 | 3 | "Just south of the lava snake lies" / "your next clue..." | dig (3065, 3904) |
| 2 | 4 | coords 3211, 3688 | dig (3213, 3687) ⚠ |
| 2 | 5 | coords 3047, 10342 | dig (3047, 10342) |
| 3 | 1 | — | NPC Zaff 546 → 31 ⚠ not spawned |
| 3 | 2 | coords 3211, 3688 | dig (3213, 3687) ⚠ |
| 3 | 3 | coords 2961, 3251 | dig (2961, 3251) |
| 3 | 4 | coords 2988, 3434 | dig (2988, 3434) |
| 3 | 5 | coords 3105, 3959 | dig (3105, 3959) |
| 4 | 1 | "The teleport lever is the way to your" / "next and final clue" | dig (3153, 3923) |
| 4 | 2 | "Head to the gateway to the garden of the house" / "in south-west Ardougne." | dig (2569, 3278) |
| 4 | 3 | coords 2599, 3271 | dig (2599, 3271) |
| 4 | 4 | "Find the sheltered altar in deep wilderness" / "for your final clue..." | dig (2958, 3820) |
| 4 | 5 | coords 2952, 3790 | dig (2952, 3790) |
| 5 | 1 | coords 2352, 3294 | ⚠ dig **anywhere** → reward (congrats message only at 2352, 3294) |
| 5 | 2 | "Go to the skeletons at the dead ship." / "!!!..........!!!" | ⚠ dig anywhere → reward (intended 3022, 3952) |
| 5 | 3 | "At the end of the track." / "......." | ⚠ dig anywhere → reward (intended 2601, 3490) |
| 5 | 4 | "Read the sign up in the dangerous" / "mountains..." | ⚠ dig anywhere → reward (intended 2839, 3596) |
| 5 | 5 | — | NPC Zaff 546 → 32 reward (or dig anywhere) |

(Level-3 stage 5 brace bug: `else if (cluestage == 5) { if (clueid == 1 && at 2352,3294) msg; deleteItem(2683); givereward(3); } else if (clueid == 2 && at 3022,3952) … else if (clueid == 3 && at 2601,3490) … else if (clueid == 4 && at 2839,3596) …` — the id 2–4 branches are chained to the stage test and only run when `cluestage` is outside 1–5.)

### 6.5 Rewards (`givereward(level)` → `cluereward(...)`, `Clues.java`)
Reward = 2 × `randomClueN()` (1 each) + 2 × `randomNonClueN()` (1 each) + 1 × `randomRunesN()` × **500**; each roll uniform over the array (duplicates weight the odds); items may repeat. Then clue vars reset and `savemoreinfo()`. Scroll interface: `` `8144` "@dre@Clue Scroll" ``, `clearQuestInterface()`, `` `8145` "@dbl@Congratz, you have completed the treasure trail!" ``, `` `8146` "@dbl@Reward:" ``, `8147`..`8151` = `"@dbl@" + GetItemName(itemN) + "@dre@ (" + amountN + ")@dbl@"`, `sendQuestSomething(8143)`, `showInterface(8134)`.

| Table | Entries → odds per roll (count/total) |
|---|---|
| clue1 (39) | 2587 Black full helm (t) 3 · 2585 Black platelegs (t) 2 · 2583 Black platebody (t) 3 · 2589 Black kiteshield (t) 3 · 2595 Black full helm (g) 3 · 2593 Black platelegs (g) 3 · 2591 Black platebody (g) 2 · 2597 Black kiteshield (g) 3 · 7332 Black kiteshield(h) 1 · 7390 Wizard robe (g) 1 · 7386 Blue skirt (g) 1 · 7394 Wizard hat (g) 1 · 7392 Wizard robe (t) 1 · 7388 Blue skirt (t) 2 · 7396 Wizard hat (t) 3 · 7362 Studded body (g) 1 · 7366 Studded chaps (g) 2 · 7364 Studded body (t) 2 · 7368 Studded chaps (t) 2 |
| nonclue1 (17) | 1165 Black full helm 3 · 1077 Black platelegs 2 · 1125 Black platebody 1 · 1195 Black kiteshield 2 · 61 Willow shortbow (u) 4 · 59 Willow longbow (u) 3 · 1147 Rune med helm 2 |
| runes1 (5) | 554 Fire · 555 Water · 556 Air · 557 Earth · 558 Mind (1 each) ×500 |
| clue2 (27) | 2605 Adam full helm (t) 3 · 2601 Adam platelegs (t) 2 · 2599 Adam platebody (t) 3 · 2603 Adam kiteshield (t) 2 · 2613 Adam full helm (g) 2 · 2609 Adam platelegs (g) 2 · 2607 Adam platebody (g) 2 · 2611 Adam kiteshield (g) 2 · 7334 Adam kiteshield(h) 1 · 7327 Black boater 1 · 7319 Red boater 1 · 7323 Green boater 1 · 7321 Orange boater 1 · 7370 D-hide body(g) 1 · 7378 D-hide chaps (g) 1 · 7372 D-hide body (t) 1 · 7380 D-hide chaps (t) 1 |
| nonclue2 (12) | 1161 Adamant full helm 1 · 1073 Adamant platelegs 1 · 1123 Adamant platebody 1 · 1199 Adamant kiteshield 1 · 857 Yew shortbow 3 · 855 Yew longbow 2 · 2503 Dragonhide body 1 · 1147 Rune med helm 2 |
| runes2 (7) | 554, 555, 556, 557, 558, 562 Chaos, 560 Death (1 each) ×500 |
| clue3 (88) | 2619 Rune full helm (g) 3 · 2627 Rune full helm (t) 3 · 2621 Rune kiteshield (g) 2 · 2629 Rune kiteshield (t) 1 · 2639 Tan cavalier 1 · 2615 Rune platebody (g) 2 · 2623 Rune platebody (t) 3 · 2617 Rune platelegs (g) 2 · 2625 Rune platelegs (t) 2 · 3476 Rune plateskirt (g) 3 · 3477 Rune plateskirt (t) 1 · 2657 Zamorak full helm 4 · 2659 Zamorak kiteshield 4 · 2653 Zamorak platebody 1 · 2655 Zamorak platelegs 3 · 3478 Zamorak plateskirt 4 · 2667 Saradomin kite 3 · 2661 Saradomin plate 3 · 2663 Saradomin legs 2 · 3479 Saradomin skirt 2 · 2673 Guthix full helm 2 · 2675 Guthix kiteshield 4 · 2669 Guthix platebody 3 · 2671 Guthix platelegs 4 · 3480 Guthix plateskirt 4 · 3486 Gilded full helm 4 · 3488 Gilded kiteshield 4 · 3481 Gilded platebody 2 · 3483 Gilded platelegs 3 · 3485 Gilded plateskirt 2 · 7400 Enchanted hat 1 · 7398 Enchanted robe 1 · 7399 Enchanted top 1 · 7374 D-hide body (g) 1 · 7376 D-hide body (t) 1 · 7382 D-hide chaps (g) 1 · 7384 D-hide chaps (t) 1 |
| nonclue3 (11) | 1163 Rune full helm 1 · 1079 Rune platelegs 1 · 1127 Rune platebody 1 · 1201 Rune kiteshield 1 · 861 Magic shortbow 2 · 859 Magic longbow 2 · 2503 Dragonhide body 3 |
| runes3 (9) | 554, 555, 556, 557, 558, 562, 560, 565 Blood, 566 Soul (1 each) ×500 |

NPC final step (dialogue 32) calls `givereward` on render; dig final step calls `deleteItem(scroll)` then `givereward` (which deletes one more scroll of that level).

---

## 7. Text & menus

### 7.1 Login sequence (player-visible order)
1. Successful load (l.10851): `loadmoreinfo()`, `loadquestinterface()`, `loadweather()`, `appendConnected()`, `loggedinpm()`. Broadcast (`PlayerHandler.messageToAll` → every other player's chat, no prefix), first matching rule:
   - `playerName.equalsIgnoreCase("Mod Allstar ")` (trailing space; never matches) → `"Owner & Coder " +playerName+ " has logged in"`
   - name `Skillerzmine` / `Fatality` / `Mod Mike` → `"Co-owner " +playerName+ " has logged in"`
   - else by rights: 3 → `"Owner & Coder " +playerName+ " has logged in"`; 2 → `"Server Administrator " +playerName+ " has logged in"`; 1 → `"Moderator " +playerName+ " has logged in"`; 4 → `playerName+ " has logged in"`; 0 → `playerName+ " has logged in"`.
2. Player right-click options (frame 104): slot 4 `"@whi@T@gre@r@whi@a@gre@d@whi@e @whi@w@gre@i@whi@t@gre@h"`; slot 2 `"@whi@F@gre@o@whi@l@gre@l@whi@o@gre@w"` if rights ≤ 2, else `"@whi@B@gre@a@whi@n"`; slot 3 (top) `"@whi@A@gre@t@whi@t@gre@a@whi@c@gre@k"`; slot 5 `"@whi@K@gre@i@whi@c@gre@k"` if rights > 0 or name `D D 3`. (317 slot→packet: 1→128, 2→153 Follow, 3→73 Attack, 4→139 Trade, 5→39. Packet 39 (code comment "highscores") opens `StatsMenu()` for rights 0 — who have no slot-5 option, so it is effectively unreachable — and kicks the target for rights 1: broadcast `"Mod:" + " Player Kicked: " + p5.playerName`.)
3. `initialize()` (l.15507): sidebars (tab 2 = 638 quest tab, tab 6 = 1151 or 12855 if `ancients == 1`, tab 12 = 147 emote tab used as teleport menu, …); `MainHelpMenu()` (opens the rules scroll for rights ≤ 0; opens character design 3559 if the look is still default) — for rights 0–3 both are immediately replaced by `newWelc()` below (rights 4 get no welcome block).
4. Chat messages by rights (verbatim, in order), each block followed by `newWelc()`:
   - rights 0: `"Allstar-Scape"`, `"Welcome to Allstar-Scape"`, `"Info on becoming mod type ::modinfo"`, `"Go to forums at allstarscapeforums.smfforfree2.com"`, `"Type ::Starter To Begin"`, `"Server Created By Mod Allstar"`
   - rights 1: `"Welcome to Allstar-Scape"`, `"To shop go east then up north the trail and you will find the shop's"`, `"Latest Update:   ::suggest (your suggestion)"` (3 spaces), `"Go to forums at allstarscapeforums.smfforfree2.com"`, `"Your a Mod... Respect your moderator status"`, `"Server Created By Mod Allstar"`
   - rights 2: `"Welcome to Allstar-Scape"`, `"To shop go east then up north the trail and you will find the shop's"`, `"Feel free to spawn w/e u want... NOTHING to other players (cept mods)"`, `"Go to forums at allstarscapeforums.smfforfree2.com"`, `"Your Account is Admin...Respect your admin status"`, `"Server Created By Mod Allstar"`
   - rights 3: `"Welcome to Allstar-Scape"`, `"Do whatever you want"`, `"Go Own some Noobs owner"`, `"Go to forums at allstarscapeforums.smfforfree2.com"`, `"::m to get unlimited money"`, `"Server Created By Mod Allstar"`
5. Welcome interface `newWelc()` (l.238) → `showInterface(15944)`: `` `15950` "@gre@~~~ @gre@A@whi@l@gre@l@whi@s@gre@t@whi@a@gre@r@whi@-@gre@S@whi@c@gre@a@whi@p@gre@e @gre@~~~" ``, `` `15960` "" ``, `` `15961` "" ``, `` `15959` "Server created by - Mod Allstar" ``, `` `15951` "" ``, `` `15952` "Reputation: @whi@" + Rep `` (`Rep = "" + reputation`), `` `15953` "Latest Update - New PkBox!" ``, `` `15954` "Have Fun..." ``, `15955`–`15958` `""`. (Unused locals: `owner = "Mod Allstar"`, `LU = "Elemental Armor"`.)
6. Name `Motherload11` with `hasset == 0`: bank and inventory wiped + `"Your bank has been reset for abusing dupe/spawn bugs"`, `"The only reason you're not banned is cos you're my friend"`, `"So don't abuse any item bugs or expect the same to happen (H) - xero"`.
7. `` `2450` "Allstar-Scape" ``, `` `2451` "" ``, `` `2452` "" `` (logout tab text). If `checkMacroWarn() == 5`: `"You have 1 black mark as you have been caught autoing..."`, `"If you are caught autoing again this WILL result in further action being taken"`, `"against your account."`.
8. `update()`: `` `180` "@blu@Home" ``, `` `2458` "Log Out.. Come Back!" ``; then `TextHandler.process()` (§7.4; it sets 180 back to `""`); then `` `5383` "@whi@The Official Bank Of "+playerName+"" `` (bank title). Deposit box title (`openUpDepBox`): `` `7421` "@whi@The Official Deposit Box Of "+playerName+"" ``.
9. Region loaded (packet 121): `WritePlayers()` server panel (walkable 15892 if `serverpanel`, default true): `` `15900` "Safe" `` / `"Un-safe"`, `` `15894` "ServerPanel:" ``, `` `15895` "Owner: Your name here" ``, `` `15897` "Co-Owner: Your name here" ``, `` `15898` "Players Online: @gre@"+players ``, `` `15899` "Made by: Tico135" ``, `15901`, `15896`, `15902`–`15906` `""`; if safe: walkable 197 + `` `199` "@yel@Safe" ``; `writePlayers()`: walkable 6673, `` `6570` "@gra@Players - " + players ``, `` `6572` "@gre@A@whi@l@gre@l@whi@s@gre@t@whi@a@gre@r@whi@-@gre@S@whi@c@gre@a@whi@p@gre@e" ``, `` `6664` "" ``. Every tick `process()` then sets walkable 197 with `` `199` "@gre@Safe" `` (safe zones) and `WriteWildyLevel()` walkable 197 with `` `199` "@red@Wild" `` (wilderness), which override the region-load overlays. `::serverpanel` toggles: `"You have turned the server panel off. Type ::serverpanel to get it back."` / `"You have turned the server panel back on. Type ::serverpanel if you wish to turn it off."`.
10. Starter: `::starter` (`starter == 0`) → 25,000,000 coins, 15,000 Manta ray, Tzhaar-ket-om 6528, 20,000 each of runes 554, 555, 565, 556, 557, 560, 561, 562, 563, 566, 558 + `"Allstar-Scape Starter Package"`; repeat → `"Sorry."` + broadcast `playerName + " Is a noob and is trying to get a extra starter!! :p"`. (Nature Spirit 1051 variant in §2.)
11. Console only (server.java): `"- Allstar-Scape v1 -"`, `" ..  Online!"`.

### 7.2 Quest-scroll info menus (interface 8134; title 8144, lines 8145+, `sendQuestSomething(8143)`)
All below call `clearQuestInterface()` right after the title (`playerMenu()` clears first); ids not listed are blank. Note `clearQuestInterface()` clears 8145 and 8147–8195 / 12174–12223 but **not 8146**, so text last written to 8146 (`"@dbl@Reward:"` from a clue reward, `"@red@Allstar-Scape"` from `playerMenu()`) lingers on later scrolls.

**`MainHelpMenu()`** (login for rights ≤ 0; `::info`, `::mainmenu`) — only if `playerRights <= 0`: `` `8144` "info" ``, `` `8145` "How to Become Mod/Admin" ``, `` `8147` "----" ``, `` `8148` "1. Respect all other players!" ``, `` `8149` "2. Respect Owners,Admins and Mods" ``, `` `8150` "3. Do not start fights with other players" ``, `` `8151` "   just simply tell an Owner or Admin." `` (3 leading spaces), `` `8152` "4. Help other players if they need help." ``, `` `8153` "5. Play on Server alot." ``, `` `8154` "5. Higher chance if you register on forums at" ``, `` `8155` "allstarscapeforums.smfforfree2.com and stay active" ``, `` `8156` "_____________________________________________________" ``, `` `8157` "If you follow all of these rules you will be fine" ``, `` `8158` "Just follow these and you will become a mod or admin" ``, `` `8159` "" ``. Then, for any rights, if look is default (`pHead 0, pBeard 10, pTorso 18, pArms 26, pLegs 72, pFeet 42, pHands 33`) → `showInterface(3559)`.

**`::modinfo`** (l.12058, any rights): same lines as MainHelpMenu 8145–8158 but title `` `8144` "@dre@The rules of Allstar-Scape" `` (no 8159).

**`QuestHelpMenu()`** (`::questmenu`): `` `8144` "@dre@Quests" ``, `` `8145` "@dbl@The secret commands quest" ``, `` `8147` "@dbl@@dre@To start tele to 2511,3494...@dbl@" ``, `` `8148` "@dbl@@dre@Then click board raft for your first instructions :) @dbl@" ``, `8149`–`8157` and `8161`, `8162` = `"@dbl@@dre@ *future quest* @dbl@"`, `` `8160` "@dbl@*future quest*" ``, `` `8163` "@dbl@@dre@ *future quest*@dbl@" ``.

**`::updates`** (l.13227; no `sendQuestSomething`): `` `8144` "@dre@LATEST UPDATES!!!!" ``, `` `8145` "@dbl@Very Latest" ``, `` `8147` "@dbl@@dre@- New Shops added!@dbl@" ``, `` `8148` "@dbl@@dre@ @" ``, `` `8149` "@dbl@@dre@-----------------------------@dbl@" ``, `` `8150` "@dbl@ @dbl@" ``, `` `8151` "@dbl@@dre@- Black Dragon lair added!@dbl@" ``, `` `8152` "@dbl@@dre@ @" ``, `` `8153` "@dbl@@dre@----------------------------@dbl@" ``, `` `8154` "@dbl@ @dbl@" ``, `` `8155` "@dbl@@dre@- added white armour and changed some bonuses@dbl@" ``.

**`ServerHelpMenu()`** (`::servermenu`): `` `8144` "@dre@Server Information Menu" ``, `` `8145` "@dbl@Server Information" ``, `` `8147` "@dbl@Server IP: @gre@" + "5.53.106.141" ``, `` `8148` "@dbl@Players Online: @gre@" + PlayerHandler.getPlayerCount() ``, `` `8149` "@dbl@Server Hoster And Creator: @dre@" + "admin" ``, `` `8150` "@dbl@Server Admins: @dbl@" + " admin, Mod Darren, ...." ``, `` `8151` " " ``, `` `8152` "@dbl@@dre@" + " ---" ``, `` `8153` "@dbl@WebSite: @red@" + "www.pimpscape.tk" ``.

**`SlayerHelpMenu()`** (`::slayerinfo`): `` `8144` "@dre@Slayer Info" ``, `` `8145` "@dbl@Slayer Information" ``, `` `8147` "@dbl@@dre@Chickens@dbl@" ``, `` `8148` "@dbl@@dre@Requirments: 5 slayer@dbl@" ``, `` `8149` "@dbl@@dre@Located at the beginning of slayer tower@dbl@" ``, `` `8150` "@dbl@-------------@dbl@" ``, `` `8151` "@dbl@@dre@Skele's@dbl@" ``, `` `8152` "@dbl@@dre@Requirements: 20 slayer@dbl@" ``, `` `8153` "@dbl@@dre@Located at slayer tower@dbl@" ``, `` `8154` "@dbl@-------------@dbl@" ``, `` `8155` "@dbl@@dre@Crawling Hands@dbl@" ``, `` `8156` "@dbl@@dre@Requirements: 30 slayer@dbl@" ``, `` `8157` "@dbl@@dre@Located at Slayer Tower@dbl@" ``, `` `8160` "@dbl@-------------" ``, `` `8161` "@dbl@@dre@Cave Bugs@dbl@" ``, `` `8162` "@dbl@@dre@Requirements: 40 slayer@dbl@" ``, `` `8163` "@dbl@@dre@Located at: slayer tower@dbl@" ``, `` `8164` "@dbl@-------------@dbl@" ``, `` `8165` "@dbl@@dre@Jelly@dbl@" ``, `` `8166` "@dbl@@dre@Requirements: 50 slayer@dbl@" ``, `` `8167` "@dbl@@dre@Located at: Slayer Tower@dbl@" ``, `` `8168` "@dbl@-------------@dbl@" ``, `` `8169` "@dbl@@dre@Aberrant Specter@dbl@" ``, `` `8170` "@dbl@@dre@Requirements: 65 slayer@dbl@" ``, `` `8171` "@dbl@@dre@Located at: Slayer Tower@dbl@" ``, `` `8172` "@dbl@Abyssal Demon@dbl@" ``, `` `8173` "@dbl@Located at: Slayer Tower@dbl@" ``, `` `8174` "@dbl@Dark Beast@dbl@" ``, `` `8175` "@dbl@Located at: Slayer Tower@dbl@" ``.

**`TheifHelpMenu()`** (`::theifmenu`): `` `8144` "@dre@Theiving" ``, `` `8145` "@dbl@Theiving help guide" ``, `` `8147` "@dbl@@dre@Silver stall@dbl@" ``, `` `8148` "@dbl@@dre@Requirents: 85 theiving@dbl@" ``, `` `8149` "@dbl@@dre@Located at: 2658,3312@dbl@" ``, `` `8150` "@dbl@-------------@dbl@" ``, `` `8151` "@dbl@@dre@Tea Stall@dbl@" ``, `` `8152` "@dbl@@dre@Requirements: None@dbl@" ``, `` `8153` "@dbl@@dre@Located at: 3269,3412@dbl@" ``, `` `8154` "@dbl@-------------@dbl@" ``, `` `8155` "@dbl@@dre@Secret crate@dbl@" ``, `` `8156` "@dbl@@dre@Requirements: 99 theiving@dbl@" ``, `` `8157` "@dbl@@dre@Located at: 2954,3303 @dbl@" ``, `` `8160` "@dbl@-------------" ``, `` `8161` "@dbl@@dre@Type ::castlewars for info on theiving stalls there@dbl@" ``, `` `8162` "@dbl@@dre@-------------@dbl@" ``, `` `8163` "@dbl@@dre@-------------@dbl@" ``.

**`CastlewarsHelpMenu()`** (`::castlewars`; later writes overwrite 8161–8163): `` `8144` "@dre@Castle Wars" ``, `` `8145` "@dbl@Castle Wars Theiving Guide" ``, `` `8147` "@dbl@All tables located at 2425,3078@dbl@" ``, `` `8148` "@dbl@@dre@Rock table@dbl@" ``, `` `8149` "@dbl@@dre@Requirements: 65 theiving@dbl@" ``, `` `8150` "@dbl@----------@dbl@" ``, `` `8151` "@dbl@@dre@Pickaxe table@dbl@" ``, `` `8152` "@dbl@@dre@Requirements: 70 theiving@dbl@" ``, `` `8153` "@dbl@----------@dbl@" ``, `` `8154` "@dbl@@dbl@Potion table@dbl@" ``, `` `8155` "@dbl@@dre@Requirements: 75 theiving@dbl@" ``, `` `8156` "@dbl@----------@dbl@" ``, `` `8157` "@dbl@@dre@Rope table@dbl@" ``, `` `8160` "@dbl@@dbl@Requirements: 85 theiving@dbl@" ``, `` `8161` "@dbl@----------@dbl@" ``, `` `8162` "@dbl@@dre@Limestone Table@dbl@" ``, `` `8163` "@dbl@@dre@Requirements: 99 theiving@dbl@" ``, then `` `8161` "@dbl@----------@dbl@" ``, `` `8162` "@dbl@@dre@Barricades Table@dbl@" ``, `` `8163` "@dbl@@dre@Requirements: 120 theiving@dbl@" `` (final visible: Barricades / 120).

**`ElementalHelpMenu()`** (`::armorhelp`): `` `8144` "@dre@Elemental Armors" ``, `` `8145` "@dbl@Elemental Help Guide" ``, `` `8149` "First, buy a gem from the combat instructor." ``, `` `8151` "Then, buy a pink robe set." ``, `` `8152` "Use the gem with a peice of the set." ``, `` `8153` "You now have that type of elemental armor." ``, `` `8154` "Once you have the full set, you can" ``, `` `8155` "use it to your advantage in the wilderness" ``, `` `8156` "Fire > Earth" ``, `` `8157` "Water > Fire" ``, `` `8158` "Air > Water" ``, `` `8159` "Earth > Air" ``, `` `8160` "There is a 1/10 chance of doing a special attack, but only" ``, `` `8161` "if you're using the full robe set." ``, `` `8163` "Have fun!" ``.

**`SmeltingHelpMenu()`** (`::smeltingmenu`): `` `8144` "@dre@Smelting Information Menu" ``, `` `8145` "@dre@Smelting Menu" ``, `` `8148` "@dbl@First Off you will need an ore,@dbl@" ``, `` `8149` "@dbl@Now type in ::smelt and this will take you too Fally furance.@dbl@" ``, `` `8150` "@dbl@The ore you are smelting must be the first in your inventory!.@dbl@" ``, `` `8151` "@dbl@You may only smelt at Fally furnace.@dbl@" ``.

**`FishingHelpMenu()`** (`::fishing`): `` `8144` "@dre@Fishing Information Menu" ``, `` `8145` "@dre@Fishing Menu" ``, `` `8148` "@dbl@First off type in ::fish@dbl@" ``, `` `8149` "@dbl@Fish at the big fountain next to where ::fish teles you to@dbl@" ``, `` `8150` "@dbl@The item your fishing with must be in the 1st slot of your inventory.@dbl@" ``, `` `8151` "@dbl@You may only fish there for now.@dbl@" ``, `` `8153` "@dbl@Harpoon Fishes Sharks.@dbl@" ``, `` `8154` "@dbl@Lobster pot Fishes Lobsters.@dbl@" ``, `` `8155` "@dbl@Big Fishing net fishes carp.@dbl@" ``.

**`StatsMenu()`** (packet 39 for rights 0; target player `p2`): `` `8144` "@dre@Stats" ``, `` `8145` p2.playerName + " @dre@Stats" ``, `` `8148` "@blu@Pk Points: @yel@" + pkpoints1 ``, `` `8149` "@blu@Kills: @yel@" + killcount1 ``, `` `8150` "@blu@Deaths: @yel@" + deathcount1 ``, then `8151`–`8171` = `"@dbl@@dbl@<Skill> Level is:" + level` for Attack, Strength, Defence, Hitpoints, Prayer, Magic, Range, Runecraft, Herblore, Theiving, Agility, Crafting, Fletching, Slayer, Mining, Smithing, Fishing, Cooking, Firemaking, Woodcutting, Farming (in that order; spelling "Theiving" verbatim; values are current, possibly boosted levels).

**`playerMenu()`** (`::players` at l.12897; scoreboard object 3192 also sends `"Players Online!"`, `"For The Win!"`): `clearQuestInterface()`, then per online player *i*: `` `8144` "@dre@Players" ``, `` `8146` "@red@Allstar-Scape" ``, `sendQuest("@red@"+playerName, 8147+i)` (slot index based, so gaps appear). (A second `::players` branch at l.13872 sends `"There are currently " + PlayerHandler.getPlayerCount() + " players!"`.)

**`SpamMenu()`** (shown to a target hit by Orb of light 1481 in the wilderness; sender gets `"You spam the enemy!"`, target `"You have been spammed!"`; outside wild: `"Move into the wilderness to use this spell on a player."`): `` `8144` "@dre@SPAM" ``, `` `8145` "@dbl@SPAM" ``, `` `8147` "@dbl@SPAM" ``, `` `8148` "@dbl@SPAM" ``.

### 7.3 Emote tab (interface 147) relabelled as a teleport menu — CUSTOM
Labels (TextHandler; `update()` sets 180 first, TextHandler then blanks it): `` `180` "" `` (was `"@blu@Home"`), `` `181` "@Whi@Train" ``, `` `178` "@red@Veng" ``, `` `175` "@yel@Shops" ``, `` `177` "@red@PkBox" ``, `` `185` "@gre@GSMINI" ``, `` `186` "@gre@Barrow" ``, `` `173` "@red@TeamPK" ``, `` `179` "@gre@Guilds" ``, `` `187` "@gre@Slayer" ``, `` `176` "@gre@Skills" ``, `` `13371` "@gre@Mining" ``, `` `182` "@gre@Sklcpe" ``; blanked: 13372–13374, 13376, 13378, 13380–13382, 11102, 13379, 13377, 13375, 11103.
Button actions (l.23769): 168 → `customCommand("home")`, 169 → `"Train"`, 164 → `"Shops"`, 165 → `"pkbox"`, 13362 → `"mining"`, 13363 → `"Shilo"`, 170 → `"gsmini"`, 171 → `"barrows"`, 163 → `"teampk"`, 167 → `"guilds"`, 172 → `"slayer"`, 166 → `"skill"` — each first checks `teleblock` → `"A magical force stops you from teleporting."`. 162 → "vengeance" (if `actionTimer == 0`: `actionTimer = 10`, gfx 401, strength-potion boost, `attackPlayersWithin(600, 17, 1)`, anim 2890, forced chat `"Die Like The Rest Bitch...!"`, close windows; `sendMessage("You use vengence!")` is sent on every click regardless). 161 → `capeEmote()` (§9.2). (Destinations belong to the commands inventory.)

### 7.4 `TextHandler.process()` — interface relabels sent at every login (CUSTOM unless noted)
Called once from `initialize()`. All 368 writes below, in source order (`p.sendQuest` / `p.sendFrame126`, both packet 126). Groups: prayer tab title 687; attack-style tabs (2425–2448, 5856–5874, 12292–12310, 1768–1778, 331–355, 7761 "Spec"/"Special Attack"); 1084 `"@whi@U T Z"`, 1117 `"@gre@Smith Like a Beast!"`; options tab (918–960: brightness/mouse/chat effects/split chat); 174 players online; 3649 design-screen caption; bank labels 5388–5391, 8132–8133; friends/ignore relabels ("Hommie List", "Haters List", "Add Hommie", "Del Friend", "Add Name", "Del Name"); shop hint 3903; equipment-bonus headers 1673/1674/1685; emote-tab teleport labels (§7.3) and run/walk panel labels 148–160, 3902 `"@whi@Closewindow"`; spellbook names/descriptions (ancient 12863–13098, modern 1200–18473; mostly AUTHENTIC wording, CUSTOM entries: `15879` `"@gre@Level 60 : Ores to Bars"` / `15880` `"@whi@Turns Ores Into Bars"`, the three god spells labelled `"Level 99"`, and every teleport renamed `"@gre@Teleporting Spell"` with blank description); skill-tab XP hover labels 4042–13920 (typo `"@gre@Smihing XP:"`). Note: the attack-style ids 2437–2448 are written twice (the second "IDK" block wins: `"@gre@Stab!"`, `"@whi@Smash!"`, `"@gre@Chop it up!"`, `"@whi@Blockit up!"`, 2441–2448 blank); 5858–5874 are written twice identically except 7761 (`"Spec"` then `"Special Attack"`).

| id | text | id | text | id | text |
|---|---|---|---|---|---|
| `687` | `"@whi@ Prayer"` | `2437` | `"@whi@"` | `2438` | `"@gre@"` |
| `2439` | `"@whi@"` | `2427` | `"@whi@Attack Style :"` | `2425` | `"@gre@Weapon: "` |
| `2440` | `"@gre@"` | `2441` | `"@whi@Attack"` | `2445` | `"@whi@Accurate"` |
| `2442` | `"@whi@Defence"` | `2443` | `"@gre@Strength"` | `2444` | `""` |
| `2446` | `""` | `2447` | `""` | `2448` | `""` |
| `1084` | `"@whi@U T Z"` | `1117` | `"@gre@Smith Like a Beast!"` | `12466` | `"@whi@Yes"` |
| `12467` | `"@whi@No"` | `918` | `"@gre@Mouse Buttons"` | `919` | `"@whi@Dark"` |
| `920` | `"@whi@Normal"` | `921` | `"@whi@Bright"` | `922` | `"@whi@V-Bright"` |
| `923` | `"@gre@Mouse Buttons"` | `925` | `"@whi@One"` | `924` | `"@whi@Two"` |
| `926` | `"@gre@Chat Effects"` | `928` | `"@whi@On"` | `927` | `"@whi@Off"` |
| `960` | `"@whi@No"` | `959` | `"@whi@Yes"` | `956` | `"@gre@Split Chat"` |
| `940` | `"@whi@"` | `946` | `"@whi@"` | `947` | `"@whi@"` |
| `948` | `"@whi@"` | `949` | `"@whi@"` | `950` | `"@whi@"` |
| `174` | `"@whi@ Players Online: "+PlayerHandler.getPlayerCount()` | `3649` | `" Change your character looks!"` | `5390` | `"Rearrange mode:"` |
| `5388` | `"Withdraw as -"` | `8133` | `"Swap"` | `8132` | `"Insert"` |
| `5389` | `"Withdraw"` | `5391` | `"Note"` | `4450` | `""` |
| `1776` | `"Accurate!"` | `1777` | `"Rapid!"` | `1778` | `"Long Range"` |
| `1768` | `"Attacking Style:"` | `332` | `"@gre@Attacking Style:"` | `340` | `"@gre@Crush"` |
| `341` | `"@whi@Crunch!"` | `342` | `"@gre@Block that!"` | `351` | `"@whi@attack with"` |
| `352` | `"iN0n3!"` | `354` | `"Ch00s3"` | `355` | `"Sp3ll"` |
| `343` | `""` | `344` | `""` | `345` | `""` |
| `346` | `""` | `347` | `""` | `348` | `""` |
| `2427` | `"@gre@Attacking Style:"` | `2439` | `"@gre@Stab!"` | `2438` | `"@whi@Smash!"` |
| `2437` | `"@gre@Chop it up!"` | `2440` | `"@whi@Blockit up!"` | `2441` | `""` |
| `2442` | `""` | `2443` | `""` | `2444` | `""` |
| `2445` | `""` | `2446` | `""` | `2447` | `""` |
| `2448` | `""` | `5067` | `"@whi@Hommie List"` | `5717` | `"@gre@Haters List"` |
| `5070` | `"@whi@Add Hommie"` | `5071` | `"@gre@Del Friend"` | `5720` | `"@whi@Add Name"` |
| `5721` | `"@gre@Del Name"` | `3903` | `"@whi@Right click to buy, Choose ammount you want, Click item for the price."` | `1673` | `"@gre@Attack bonus"` |
| `1674` | `"@gre@Defence bonus"` | `1685` | `"@gre@Other bonuses"` | `5858` | `"@gre@Choose Attack Style"` |
| `5866` | `"@whi@Punch!"` | `5867` | `"@gre@Kick"` | `5868` | `"@whi@Block"` |
| `5869` | `""` | `5870` | `""` | `5871` | `""` |
| `5872` | `""` | `5873` | `""` | `5874` | `""` |
| `5856` | `"Weapon:"` | `7761` | `"Spec"` | `5858` | `"@gre@Choose Attack Style"` |
| `5866` | `"@whi@Punch!"` | `5867` | `"@gre@Kick"` | `5868` | `"@whi@Block"` |
| `5869` | `""` | `5870` | `""` | `5871` | `""` |
| `5872` | `""` | `5873` | `""` | `5874` | `""` |
| `5856` | `"Weapon:"` | `7761` | `"Special Attack"` | `12294` | `"@gre@Choose Attack Style"` |
| `12302` | `"@whi@Flick"` | `12303` | `"@gre@Lash"` | `12304` | `"@whi@Deflect"` |
| `12305` | `""` | `12306` | `""` | `12307` | `""` |
| `12308` | `""` | `12309` | `""` | `12310` | `""` |
| `12292` | `"Weapon:"` | `180` | `""` | `181` | `"@Whi@Train"` |
| `178` | `"@red@Veng"` | `175` | `"@yel@Shops"` | `177` | `"@red@PkBox"` |
| `185` | `"@gre@GSMINI"` | `186` | `"@gre@Barrow"` | `173` | `"@red@TeamPK"` |
| `179` | `"@gre@Guilds"` | `187` | `"@gre@Slayer"` | `176` | `"@gre@Skills"` |
| `13371` | `"@gre@Mining"` | `13372` | `""` | `13373` | `""` |
| `13374` | `""` | `13376` | `""` | `13378` | `""` |
| `13380` | `""` | `13381` | `""` | `13382` | `""` |
| `11102` | `""` | `13379` | `""` | `13377` | `""` |
| `13375` | `""` | `11103` | `""` | `160` | `"@whi@Walk"` |
| `159` | `"@whi@Run"` | `148` | `"@whi@Energy Left:"` | `158` | `"@whi@Move Speed"` |
| `155` | `"@whi@Auto Retaliate"` | `182` | `"@gre@Sklcpe"` | `3902` | `"@whi@Closewindow"` |
| `157` | `"@whi@On"` | `156` | `"@whi@Off"` | `12941` | `"@gre@Level 50 : Smoke Rush"` |
| `12942` | `"@whi@A single target smoke attack"` | `12989` | `"@gre@Level 52 : Shadow Rush"` | `12990` | `"@whi@A single target shadow attack"` |
| `13037` | `"@gre@Teleporting Spell"` | `13038` | `"@whi@"` | `12903` | `"@gre@Level 56 : Blood Rush"` |
| `12904` | `"@whi@A single target blood attack"` | `12863` | `"@gre@Level 58 : Ice Rush"` | `12864` | `"@whi@A single target ice attack"` |
| `13047` | `"@gre@Teleporting Spell"` | `13048` | `"@whi@"` | `12965` | `"@gre@Level 62 : Smoke Burst"` |
| `12966` | `"@whi@A multi-target smoke attack"` | `13013` | `"@gre@Level 64 : Shadow Burst"` | `13014` | `"@whi@A multi-target shadow attack"` |
| `13055` | `"@gre@Teleporting Spell"` | `13056` | `"@whi@"` | `12921` | `"@gre@Level 68 : Blood Burst"` |
| `12922` | `"@whi@A multi-target blood attack"` | `12883` | `"@gre@Level 70 : Ice Burst"` | `12884` | `"@whi@A multi-target ice attack"` |
| `13063` | `"@gre@Level 72 : Lassar Teleport"` | `13064` | `"@whi@Ice mountain"` | `12953` | `"@gre@Level 74 : Smoke Blitz"` |
| `12954` | `"@whi@A single target strong smoke attack"` | `13001` | `"@gre@Level 76 : Shadow Blitz"` | `13002` | `"@whi@A single target strong shadow attack"` |
| `13071` | `"@gre@Teleporting Spell"` | `13072` | `"@whi@"` | `12913` | `"@gre@Level 80 : Blood Blitz"` |
| `12914` | `"@whi@A single target strong blood attack"` | `12873` | `"@gre@Level 82 : Ice Blitz"` | `12874` | `"@whi@A single target strong ice attack"` |
| `13081` | `"@gre@Teleporting Spell"` | `13082` | `"@whi@"` | `12977` | `"@gre@Level 86 : Smoke Barrage"` |
| `12978` | `"@whi@A multi-target strong smoke attack"` | `13025` | `"@gre@Level 88 : Shadow Barrage"` | `13026` | `"@whi@A multi-target strong shadow attack"` |
| `13089` | `"@gre@Teleporting Spell"` | `13090` | `"@whi@"` | `12931` | `"@gre@Level 92 : Blood Barrage"` |
| `12932` | `"@whi@A multi-target strong blood attack"` | `12893` | `"@gre@Level 94 : Ice Barrage"` | `12894` | `"@whi@A multi-target strong ice attack"` |
| `13097` | `"@gre@Teleporting Spell"` | `13098` | `"@whi@"` | `1200` | `"@gre@Level 1 : Wind Strike"` |
| `1201` | `"@whi@A basic Air missile"` | `1207` | `"@gre@Level 3 : Confuse"` | `1208` | `"@whi@Reduces your target's attack by 5%"` |
| `1216` | `"@gre@Level 5 : Water Strike"` | `1217` | `"@whi@A basic Water missile"` | `1225` | `"@gre@Level 7 : Lvl-1 Enchant"` |
| `1226` | `"@whi@For use on sapphire jewellery"` | `1232` | `"@gre@Level 9 : Earth Strike"` | `1233` | `"@whi@A basic Earth missile"` |
| `1241` | `"@gre@Level 11 : Weaken"` | `1242` | `"@whi@Reduces your target's str by 5%"` | `1250` | `"@gre@Level 13 : Fire Strike"` |
| `1251` | `"@whi@A basic Fire missile"` | `1259` | `"@gre@Level 15 : Bones to Bananas"` | `1260` | `"@whi@Changes held bones to bananas"` |
| `1268` | `"@gre@Level 17 : Wind Bolt"` | `1269` | `"@whi@A low level Air missile"` | `1275` | `"@gre@Level 19 : Curse"` |
| `1276` | `"@whi@Reduces your target's def by 5%"` | `1574` | `"@gre@Level 20 : Bind"` | `1575` | `"@whi@Holds you target for 5 seconds"` |
| `1284` | `"@gre@Level 21 : Low Level Alchemy"` | `1285` | `"@whi@Converts an item into gold"` | `1291` | `"@gre@Level 23 : Water Bolt"` |
| `1292` | `"@whi@A low level Water missile"` | `1300` | `"@gre@Teleporting Spell"` | `1301` | `"@whi@"` |
| `1309` | `"@gre@Level 27 : Lvl-2 Enchant"` | `1310` | `"@whi@For use on emerald jewellery"` | `1316` | `"@gre@Level 29 : Earth Bolt"` |
| `1317` | `"@whi@A low level Earth missile"` | `1325` | `"@gre@Teleporting Spell"` | `1326` | `"@whi@"` |
| `1334` | `"@gre@Level 33 : Telekinetic Grab"` | `1336` | `"@whi@Take an item you can't reach"` | `1341` | `"@gre@Level 35 : Fire Bolt"` |
| `1342` | `"@whi@A low level Fire missile"` | `1350` | `"@gre@Teleporting Spell"` | `1351` | `"@whi@"` |
| `1359` | `"@gre@Level 39 : Crumble Undead"` | `1360` | `"@whi@Hits un-dead monsters hard"` | `1368` | `"@gre@Level 41 : Wind Blast"` |
| `1369` | `"@whi@A medium level Wind missile"` | `1375` | `"@gre@Level 43 : Superheat Item"` | `1376` | `"@whi@Smelt ore without a furnace"` |
| `1382` | `"@gre@Teleporting Spell"` | `1383` | `"@whi@"` | `1389` | `"@gre@Level 47 : Water Blast"` |
| `1390` | `"@whi@A medium level Water missile"` | `1398` | `"@gre@Level 49 : Lvl-3 Enchant"` | `1399` | `"@whi@For use on ruby jewellery"` |
| `1405` | `"@gre@Level 50 : Iban Blast"` | `1406` | `"@whi@Summons the wrath of Iban"` | `1584` | `"@gre@Level 50 : Snare"` |
| `1585` | `"@whi@Holds your target for 10 seconds"` | `12039` | `"@gre@Level 50 : Magic Dart"` | `12040` | `"@whi@A magic dart of slaying"` |
| `1415` | `"@gre@Teleporting Spell"` | `1416` | `"@whi@"` | `1422` | `"@gre@Level 53 : Earth Blast"` |
| `1423` | `"@whi@A medium level Earth missile"` | `1431` | `"@gre@Level 55 : High Level Alchemy"` | `1432` | `"@whi@Converts an item into more gold"` |
| `1438` | `"@gre@Level 56 : Charge Water Orb"` | `1439` | `"@whi@Cast on a Water obelisk"` | `1447` | `"@gre@Level 57 : Lvl-4 Enchant"` |
| `1448` | `"@whi@For use on diamond jewellery"` | `1454` | `"@gre@Teleporting Spell"` | `1455` | `"@whi@"` |
| `1461` | `"@gre@Level 59 : Fire Blast"` | `1462` | `"@whi@A medium level Fire missile"` | `1470` | `"@gre@Level 60 : Charge Earth Orb"` |
| `1471` | `"@whi@Cast on a Earth obelisk"` | `15879` | `"@gre@Level 60 : Ores to Bars"` | `15880` | `"@whi@Turns Ores Into Bars"` |
| `1603` | `"@gre@Level 99 : Saradomin Strike"` | `1604` | `"@whi@The power of Saradomin"` | `1614` | `"@gre@Level 99 : Claws of Guthix"` |
| `1615` | `"@whi@The power of Guthix"` | `1625` | `"@gre@Level 99 : Flames of Zamorak"` | `1626` | `"@whi@The power of Zamorak"` |
| `7457` | `"@gre@Teleporting Spell"` | `7458` | `"@whi@"` | `1479` | `"@gre@Level 62 : Wind Wave"` |
| `1480` | `"@whi@A high level Air missile"` | `1486` | `"@gre@Level 63 : Charge Fire Orb"` | `1487` | `"@whi@Cast on a Fire obelisk"` |
| `18472` | `"@gre@Teleporting Spell"` | `18473` | `"@whi@"` | `1495` | `"@gre@Level 65 : Water Wave"` |
| `1496` | `"@whi@A high level Water missile"` | `1504` | `"@whi@Level 66 : Charge Air Orb"` | `1505` | `"@whi@Cast on a Air obelisk"` |
| `1513` | `"@gre@Level 66 : Vulnerability"` | `1514` | `"@whi@Reduces your target's def by 10%"` | `1522` | `"@gre@Level 68 : Lvl-5 Enchant"` |
| `1523` | `"@whi@For use on dragonstone jewellery"` | `1531` | `"@gre@Level 70 : Earth Wave"` | `1532` | `"@whi@A high level Earth missile"` |
| `1545` | `"@gre@Level 73 : Enfeeble"` | `1546` | `"@whi@Reduces your target's str by 10%"` | `12427` | `"@gre@Teleporting Spell"` |
| `12428` | `"@whi@"` | `1554` | `"@gre@Level 75 : Fire Wave"` | `1555` | `"@whi@A high level Fire missile"` |
| `1594` | `"@gre@Level 79 : Entangle"` | `1595` | `"@whi@Holds your target for 15 seconds"` | `1564` | `"@gre@Level 80 : Stun"` |
| `1565` | `"@whi@Reduces your target's att by 10%"` | `1636` | `"@gre@Level 80 : Charge"` | `1637` | `"@whi@Charges God spells"` |
| `12437` | `"@gre@Teleporting Spell"` | `12438` | `"@whi@"` | `12447` | `"@gre@Teleporting Spell"` |
| `12448` | `"@whi@"` | `6005` | `"@gre@Level 87 : Lvl-6 Enchant"` | `6006` | `"@whi@For use on onyx jewellery"` |
| `12457` | `"@gre@Teleporting Spell"` | `12458` | `"@whi@"` | `4042` | `"@gre@Attack XP:"` |
| `4043` | `"@gre@Next Lvl At:"` | `4048` | `"@gre@Strength XP:"` | `4049` | `"@gre@Next Lvl At:"` |
| `4054` | `"@gre@Defence XP:"` | `4055` | `"@gre@Next Lvl At:"` | `4060` | `"@gre@Ranged XP:"` |
| `4061` | `"@gre@Next Lvl At:"` | `4066` | `"@gre@Prayer XP:"` | `4067` | `"@gre@Next Lvl At:"` |
| `4072` | `"@gre@Magic XP:"` | `4073` | `"@gre@Next Lvl At:"` | `4155` | `"@gre@Runecraft XP:"` |
| `4156` | `"@gre@Next Lvl At:"` | `4078` | `"@gre@Hitpoints XP:"` | `4079` | `"@gre@Next Lvl At:"` |
| `4084` | `"@gre@Agility XP:"` | `4085` | `"@gre@Next Lvl At:"` | `4090` | `"@gre@Herblore XP:"` |
| `4091` | `"@gre@Next Lvl At:"` | `4096` | `"@gre@Theiving XP:"` | `4097` | `"@gre@Next Lvl At:"` |
| `4102` | `"@gre@Crafting XP:"` | `4103` | `"@gre@Next Lvl At:"` | `4108` | `"@gre@Fletching XP:"` |
| `4109` | `"@gre@Next Lvl At:"` | `12169` | `"@gre@Slayer XP:"` | `12170` | `"@gre@Next Lvl At:"` |
| `4114` | `"@gre@Mining XP:"` | `4115` | `"@gre@Next Lvl At:"` | `4120` | `"@gre@Smihing XP:"` |
| `4121` | `"@gre@Next Lvl At:"` | `4126` | `"@gre@Fishing XP:"` | `4127` | `"@gre@Next Lvl At:"` |
| `4132` | `"@gre@Cooking XP:"` | `4133` | `"@gre@Next Lvl At:"` | `4138` | `"@gre@Firemaking XP:"` |
| `4139` | `"@gre@Next Lvl At:"` | `4144` | `"@gre@Woodcutting XP:"` | `4145` | `"@gre@Next Lvl At:"` |
| `13919` | `"@gre@Farming XP:"` | `13920` | `"@gre@Next Lvl At:"` |  |  |

(368 assignments)

### 7.5 `MenuHandler.java` — skill-guide menus (JUNK: the class is never instantiated or called; interface 8714 is never opened elsewhere)
Transcribed for completeness. Each menu writes the texts, then `p.clearQuestInterface()`, `p.sendFrame246(8715, zoom, item)` (model), `p.showInterface(8714)`. Notable CUSTOM values: Attack lists Barrows 70 and Abyssal 70; Defence lists Granite 50; Ranged lists Crystal Bow 70; Magic "Mystic Armour" at 20; Agility "Werewolf Course" at 30.

**attackMenu()** — header `8716`="@whi@Attack" `8718`="@whi@Level" `8719`="@whi@Advancement"; clearQuestInterface() [called AFTER the texts; clears only quest-scroll ids 8145, 8147-8195, 12174-12223, i.e. none of the 87xx/88xx ids]; sendFrame246(8715, zoom 700, item 4587 = Dragon scimitar); showInterface(8714)

| lvl id | level | name id | unlock |
|---|---|---|---|
| `8720` | `"@cya@1"` | `8760` | `"@cya@Bronze"` |
| `8721` | `"@cya@1"` | `8761` | `"@cya@Iron"` |
| `8722` | `"@cya@5"` | `8762` | `"@cya@Steel"` |
| `8723` | `"@cya@10"` | `8763` | `"@cya@Black"` |
| `8724` | `"@cya@20"` | `8764` | `"@cya@Mithril"` |
| `8725` | `"@cya@30"` | `8765` | `"@cya@Adamentite"` |
| `8726` | `"@cya@40"` | `8766` | `"@cya@Rune"` |
| `8727` | `"@cya@60"` | `8767` | `"@cya@Dragon"` |
| `8728` | `"@cya@70"` | `8768` | `"@cya@Barrows"` |
| `8729` | `"@cya@70"` | `8769` | `"@cya@Abyssal"` |
| `8730` | `" "` | `8770` | `" "` |

Other ids: `8846`="Attack", `8849`=" ", `8823`="Defense", `8824`="Ranged", `8827`="Magic", `8837`=" ", `8840`=" ", `8843`=" ", `8859`=" ", `8862`=" ", `8865`=" ", `15303`=" ", `15306`=" ", `15309`=" "

**defenseMenu()** — header `8716`="@whi@Defense" `8718`="@whi@Level" `8719`="@whi@Advancement"; clearQuestInterface() [called AFTER the texts; clears only quest-scroll ids 8145, 8147-8195, 12174-12223, i.e. none of the 87xx/88xx ids]; sendFrame246(8715, zoom 600, item 1187 = Dragon sq shield); showInterface(8714)

| lvl id | level | name id | unlock |
|---|---|---|---|
| `8720` | `"@cya@1"` | `8760` | `"@cya@Bronze"` |
| `8721` | `"@cya@1"` | `8761` | `"@cya@Iron"` |
| `8722` | `"@cya@5"` | `8762` | `"@cya@Steel"` |
| `8723` | `"@cya@10"` | `8763` | `"@cya@Black"` |
| `8724` | `"@cya@20"` | `8764` | `"@cya@Mithril"` |
| `8725` | `"@cya@30"` | `8765` | `"@cya@Adamentite"` |
| `8726` | `"@cya@40"` | `8766` | `"@cya@Rune"` |
| `8727` | `"@cya@50"` | `8767` | `"@cya@Granite"` |
| `8728` | `"@cya@60"` | `8768` | `"@cya@Dragon"` |
| `8729` | `"@cya@70"` | `8769` | `"@cya@Barrows"` |
| `8730` | `" "` | `8770` | `" "` |

Other ids: `8846`="Attack", `8849`=" ", `8823`="Defense", `8824`="Ranged", `8827`="Magic", `8837`=" ", `8840`=" ", `8843`=" ", `8859`=" ", `8862`=" ", `8865`=" ", `15303`=" ", `15306`=" ", `15309`=" "

**rangeMenu()** — header `8716`="@whi@Ranged" `8718`="@whi@Level" `8719`="@whi@Advancement"; clearQuestInterface() [called AFTER the texts; clears only quest-scroll ids 8145, 8147-8195, 12174-12223, i.e. none of the 87xx/88xx ids]; sendFrame246(8715, zoom 600, item 4212 = New crystal bow); showInterface(8714)

| lvl id | level | name id | unlock |
|---|---|---|---|
| `8720` | `"@cya@1"` | `8760` | `"@cya@Short Bow"` |
| `8721` | `"@cya@1"` | `8761` | `"@cya@Long Bow"` |
| `8722` | `"@cya@5"` | `8762` | `"@cya@Oak Bows"` |
| `8723` | `"@cya@20"` | `8763` | `"@cya@Willow Bows"` |
| `8724` | `"@cya@30"` | `8764` | `"@cya@Maple Bows"` |
| `8725` | `"@cya@40"` | `8765` | `"@cya@Yew Bows"` |
| `8726` | `"@cya@50"` | `8766` | `"@cya@Magic Bows"` |
| `8727` | `"@cya@70"` | `8767` | `"@cya@Crystal Bow"` |
| `8728` | `" "` | `8768` | `" "` |
| `8729` | `" "` | `8769` | `" "` |
| `8730` | `" "` | `8770` | `" "` |

Other ids: `8846`="Attack", `8849`=" ", `8823`="Defense", `8824`="Ranged", `8827`="Magic", `8837`=" ", `8840`=" ", `8843`=" ", `8859`=" ", `8862`=" ", `8865`=" ", `15303`=" ", `15306`=" ", `15309`=" "

**mageMenu()** — header `8716`="@whi@Magic" `8718`="@whi@Level" `8719`="@whi@Advancement"; clearQuestInterface() [called AFTER the texts; clears only quest-scroll ids 8145, 8147-8195, 12174-12223, i.e. none of the 87xx/88xx ids]; sendFrame246(8715, zoom 600, item 560 = Death rune); showInterface(8714)

| lvl id | level | name id | unlock |
|---|---|---|---|
| `8720` | `"@cya@NA"` | `8760` | `"@cya@See Spell Book"` |
| `8721` | `"@cya@20"` | `8761` | `"@cya@Mystic Armour"` |
| `8722` | `" "` | `8762` | `" "` |
| `8723` | `" "` | `8763` | `" "` |
| `8724` | `" "` | `8764` | `" "` |
| `8725` | `" "` | `8765` | `" "` |
| `8726` | `" "` | `8766` | `" "` |
| `8727` | `" "` | `8767` | `" "` |
| `8728` | `" "` | `8768` | `" "` |
| `8729` | `" "` | `8769` | `" "` |
| `8730` | `" "` | `8770` | `" "` |

Other ids: `8846`="Attack", `8849`=" ", `8823`="Defense", `8824`="Ranged", `8827`="Magic", `8837`=" ", `8840`=" ", `8843`=" ", `8859`=" ", `8862`=" ", `8865`=" ", `15303`=" ", `15306`=" ", `15309`=" "

**prayMenu()** — header `8716`="@whi@Prayer" `8718`="@whi@Level" `8719`="@whi@Advancement"; clearQuestInterface() [called AFTER the texts; clears only quest-scroll ids 8145, 8147-8195, 12174-12223, i.e. none of the 87xx/88xx ids]; sendFrame246(8715, zoom 600, item 3840 = Holy book); showInterface(8714)

| lvl id | level | name id | unlock |
|---|---|---|---|
| `8720` | `"@cya@NA"` | `8760` | `"@cya@See Prayer Book"` |
| `8721` | `" "` | `8761` | `" "` |
| `8722` | `" "` | `8762` | `" "` |
| `8723` | `" "` | `8763` | `" "` |
| `8724` | `" "` | `8764` | `" "` |
| `8725` | `" "` | `8765` | `" "` |
| `8726` | `" "` | `8766` | `" "` |
| `8727` | `" "` | `8767` | `" "` |
| `8728` | `" "` | `8768` | `" "` |
| `8729` | `" "` | `8769` | `" "` |
| `8730` | `" "` | `8770` | `" "` |

Other ids: `8846`="Attack", `8849`=" ", `8823`="Defense", `8824`="Ranged", `8827`="Magic", `8837`=" ", `8840`=" ", `8843`=" ", `8859`=" ", `8862`=" ", `8865`=" ", `15303`=" ", `15306`=" ", `15309`=" "

**runecraftMenu()** — header `8716`="@whi@Runecrafting" `8718`="@whi@Level" `8719`="@whi@Advancement"; clearQuestInterface() [called AFTER the texts; clears only quest-scroll ids 8145, 8147-8195, 12174-12223, i.e. none of the 87xx/88xx ids]; sendFrame246(8715, zoom 600, item 1458 = Law talisman); showInterface(8714)

| lvl id | level | name id | unlock |
|---|---|---|---|
| `8720` | `"@cya@1"` | `8760` | `"@cya@Air Runes"` |
| `8721` | `"@cya@2"` | `8761` | `"@cya@Mind Runes"` |
| `8722` | `"@cya@5 "` | `8762` | `"@cya@Water Runes"` |
| `8723` | `"@cya@9"` | `8763` | `"@cya@Earth Runes"` |
| `8724` | `"@cya@14"` | `8764` | `"@cya@Fire Runes"` |
| `8725` | `"@cya@20"` | `8765` | `"@cya@Body Runes"` |
| `8726` | `"@cya@27"` | `8766` | `"@cya@Cosmic Runes"` |
| `8727` | `"@cya@35"` | `8767` | `"@cya@Chaos Runes"` |
| `8728` | `"@cya@44"` | `8768` | `"@cya@Nature Runes"` |
| `8729` | `"@cya@54"` | `8769` | `"@cya@Law Runes"` |
| `8730` | `"@cya@65"` | `8770` | `"@cya@Death Runes"` |

Other ids: `8846`="Attack", `8849`=" ", `8823`="Defense", `8824`="Ranged", `8827`="Magic", `8837`=" ", `8840`=" ", `8843`=" ", `8859`=" ", `8862`=" ", `8865`=" ", `15303`=" ", `15306`=" ", `15309`=" "

**agilityMenu()** — header `8716`="@whi@Agility" `8718`="@whi@Level" `8719`="@whi@Advancement"; clearQuestInterface() [called AFTER the texts; clears only quest-scroll ids 8145, 8147-8195, 12174-12223, i.e. none of the 87xx/88xx ids]; sendFrame246(8715, zoom 600, item 3107 = Spiked boots); showInterface(8714)

| lvl id | level | name id | unlock |
|---|---|---|---|
| `8720` | `"@cya@1"` | `8760` | `"@cya@Gnome Course"` |
| `8721` | `"@cya@30"` | `8761` | `"@cya@Werewolf Course "` |
| `8722` | `" "` | `8762` | `" "` |
| `8723` | `" "` | `8763` | `" "` |
| `8724` | `" "` | `8764` | `" "` |
| `8725` | `" "` | `8765` | `" "` |
| `8726` | `" "` | `8766` | `" "` |
| `8727` | `" "` | `8767` | `" "` |
| `8728` | `" "` | `8768` | `" "` |
| `8729` | `" "` | `8769` | `" "` |
| `8730` | `" "` | `8770` | `" "` |

Other ids: `8846`="Attack", `8849`=" ", `8823`="Defense", `8824`="Ranged", `8827`="Magic", `8837`=" ", `8840`=" ", `8843`=" ", `8859`=" ", `8862`=" ", `8865`=" ", `15303`=" ", `15306`=" ", `15309`=" "


### 7.6 NPC overhead chat (NPCHandler.java l.495–870, runs every NPC tick) — CUSTOM
`npcs[i].textUpdate = <text>` when the random check passes (`misc.random2(30) <= 2` ≈ 2/30 per 500 ms tick unless noted). Names are npc.cfg names (2821 and 3117 are beyond npc.cfg).

| NPC id (npc.cfg name) | Chance | Text (verbatim) |
|---|---|---|
| 81, 397 Cow · 1766, 1768 Cow_calf · 1767 Cow | `random2(50) == 1` | `"Moo"` |
| 409 Genie | 2/30 | `"Welcome to Allstar-Scape!"` |
| 364 King_Lathas | 2/30 | `"Mod & Admin Portal Only!"` |
| 280 Brother_Cedric | 2/30 | `"Strength Guild, 99 strength to Enter!"` |
| 172 Dark_wizard | 2/30 | `"Range/Magic Guild, 99 Range and Magic to Enter!"` |
| 212 King_Percival | 2/30 | `"Welcome to the Mod/Admin Zone..Keep up the Good Work!"` |
| 945 RuneScape_Guide | 2/30 | `"You Finally Made It here..Keep up the Good Work!"` |
| 225 Bonzo | 2/30 | `"Icon Minigame!"` |
| 648 King_Roald | 2/30 | `"Welcome to Training Made To Own N33bs!"` |
| 793 Alfonse_the_waiter | 2/30 | `"Enchanted Minigame!"` |
| 2253 Wise_Old_Man | 2/30 | `"Clan Wars Portal!!"` |
| 541 Zeke | 2/30 | `"Shittywok Shop!"` |
| 2821 (autospawn "Zeke") | 2/30 | `"Fishing Portal!"` |
| 2304 Sarah | 2/30 | `"Farming Shop!By seed's for patch's!"` |
| 461 Magic_Store_owner | 2/30 | `"Magic Shop!"` |
| 0 Hans | 2/30 | `"Welcome to Allstar-Scape's Shopping Area!"` |
| 57 Fairy | `random2(30) == 1` | `"Players Online: " + players` |
| 550 Lowe | 2/30 | `"Allstar's Pking Shop!"` |
| 1759 Farmer | 2/30 | `"Shops Here!"` |
| 1699 Ghost_Shopkeeper | 2/30 | `"Pur3 Sh0p!"` |
| 920 Prince_Ali | 2/30 | `"Barrows Portal!"` |
| 2475 Frog_princess | 2/30 | `"Training Portal!"` |
| 28 Zoo_keeper | 2/30 | `"Train Your Skills Here!"` |
| 1917 Bandit_shopkeeper | 2/30 | `"God Armor Shop!"` |
| 522 Shop_keeper | 2/30 | `"General Storez0r!"` |
| 548 Thessalia | 2/30 | `"Gloves, Robes, Boots Shop!"` |
| 530 Shop_keeper | 2/30 | `"Skillers Shop!"` |
| 528 Shop_keeper | 2/30 | `"Helmet Shop!"` |
| 213 Merlin | 2/30 | `"You need the frozen key to get in this portal! Kill the troll for key!"` |
| 520 Shop_keeper | 2/30 | `"Allstar's Ownage Shop!"` |
| 524 Shop_keeper | 2/30 | `"Silab Member Shop!"` |
| 555 Shop_keeper | 2/30 | `"Skill Cape Shop!"` |
| 561 Shop_keeper | 2/30 | `"Hood Shop!"` |
| 538 Peksa | 2/30 | `"Slayer Shop!"` |
| 529 Shop_assistant | 2/30 | `"Farming Shop!"` |
| 3117 (armor shop) | 2/30 | `"Click the chests for slayer exp .."` |
| 866 Skavid | 2/30 | `"Et .. Phone .. Home!"` |
| 549 Horvik | 2/30 | `"Smithin' Shop"` |
| 558 Gerrant | 2/30 | `"3rd Age Armor Shop"` |
| 1451 Sleeping_Monkey | `random2(30) == 1` | `"Tele to varrock"` |
| 33 Door_man | `random2(30) == 1` | `"Tele to varrock"` |
| 37 Sigbert_the_Adventurer | `random2(30) == 1` | `"Tele to tzhaar caves"` |
| 1201 Elf_warrior | `random2(30) == 1` | `"DO YOU DARE ENTER THE BLACK DRAGONS LAIR?"` |
| 1199 Elf_Tracker | `random2(30) == 1` | `"GO THROUGH THIS DOOR TO TELEPORT TO THE BLACK DRAGON CAVE"` |

Commented-out NPC combat taunts (l.455–479, JUNK): `"I had ya ma last night bitch"`, `"Haha I own you neeb"`, `"Cmon then bitch"`, `"ARGHH!"`, `"Owch that hurt!"`.

### 7.7 `misc.java` — JUNK
Pure utilities (name/long conversion, hex, random, text pack/unpack, direction tables). No player-facing text.

---

## 8. Level-up messages (`levelup(int skill)` l.5067; called from `addSkillXP` l.14046, which maps xp-index 2 (Strength) → `levelup(1)` and xp-index 1 (Defence) → `levelup(2)`) — CUSTOM 99 rewards

Cases 0–6 open a level-up chatbox (`sendFrame164`), play gfx 199 (`stillgfx(199, absX, absY)`), set `NpcDialogueSend = true`, and write two lines; cases 7–20 only send the chat message (their interface code is commented out). At level ≥ 99 (i.e. on reaching 99) items are added, a 99 message is sent, and a broadcast goes to everyone else (`playerName + " has just gotten " + level + " <skill>!"`).

| case | Skill | Chatbox | Line 1 | Line 2 | Chat message | At 99: items | 99 message | Broadcast suffix |
|---|---|---|---|---|---|---|---|---|
| 0 | Attack | 6247 | `6248` `"Congratulations, you just advanced an attack level!"` | `6249` `"Your attack level is now " + playerLevel[0] + " ."` | `"Congratulations, you just advanced an attack level."` | 14073 Att Cape, 14074 Att Cape (t), 14075 Att Hood | `"Congratulations, you just recived Attack skill capes and hood!"` | `playerLevel[0] + " attack!"` |
| 1 | Strength | 6206 | `6207` `"Congratulations, you just advanced a strength level!"` | `6208` `"Your strength level is now " + playerLevel[2] + " ."` | `"Congratulations, you just advanced a strength level."` | 14076 Str Cape, 14077 Str Cape (t), 14078 Str Hood | `"Congratulations, you just recived Strength skill capes and hood!"` | `playerLevel[2] + " strength!"` |
| 2 | Defence | 6253 | `6254` `"Congratulations, you just advanced a defence level!"` | `6255` `"Your defence level is now " + playerLevel[1] + " ."` | `"Congratulations, you just advanced a defence level."` | 14079 Def Cape, 14080 Def Cape (t), 14081 Def Hood | `"Congratulations, you just recived the Defence skill cape and hood!"` | `playerLevel[2] + " defence!"` (bug: prints the Strength level) |
| 3 | Hitpoints | 6216 | `6217` `"Congratulations, you just advanced a hitpoints level!"` | `6218` `"Your hitpoints level is now " + playerLevel[3] + " ."` | `"Congratulations, you just advanced a hitpoints level."` | 14094 Hp Cape, 14095 Hitpoints Cape (t), 14096 HP Hood | `"Congratulations, you just recived Hitpoints skill capes and hood!"` | `" hitpoints!"` |
| 4 | Ranged | 4443 | `4444` `"Congratulations, you just advanced a ranged level!"` | `4445` `"Your ranged level is now " + playerLevel[4] + " ."` | `"Congratulations, you just advanced a ranging level."` | 14082 Range Cape, 14083 Range Cape (t), 14084 Range Hood | `"Congratulations, you just recived the Range skill cape and hood!"` | `" ranged!"` |
| 5 | Prayer | 6242 | `6243` `"Congratulations, you just advanced a prayer level!"` | `6244` `"Your prayer level is now " + playerLevel[5] + " ."` | `"Congratulations, you just advanced a prayer level."` | 14085 Pray Cape, 14086 Prayer Cape (t), 14087 Pray Hood | `"Congratulations, you just recived the Prayer skill cape and hood!"` | `" prayer!"` |
| 6 | Magic | 6211 | `6212` `"Congratulations, you just advanced a magic level!"` | `6213` `"Your magic level is now " + playerLevel[6] + " ."` | `"Congratulations, you just advanced a magic level."` | 14088 Magic Cape ×1, **14089 Magic Cape (t) ×5** (no hood) | `"Congratulations, you just recived the Mage skill cape"` | `" magic!"` |
| 7 | Cooking | — | — | — | `"Congratulations, you just advanced a cooking level."` | **10,000,000 coins** + 14128 Cooking Cape (t) | `"Congratulations, you just recived the cooking skill cape and hood!"` | `" cooking!"` |
| 8 | Woodcutting | — | — | — | `"Congratulations, you just advanced a woodcutting level."` | 14133 Wc Cape, 14134 Woodcutting Cape (t), 14135 Wc Hood | `"Congratulations, you just recived the woodcutting skill cape and hood!"` | `" woodcutting!"` |
| 9 | Fletching | — | — | — | `"Congratulations, you just advanced a fletching level."` | 14109 Fletch Cape, 14111 Fletch Hood | `"Congratulations, you just recived the fletching skill cape and hood!"` | `" fletching!"` |
| 10 | Fishing | — | — | — | `"Congratulations, you just advanced a fishing level."` | 14124 Fish Cape, 14125 Fishing Cape (t), 14126 Fish Hood + **10,000,000 coins** | `"Congratulations, you just recived the fishing skill cape and hood!"` | `" fishing!"` |
| 11 | Firemaking | — | — | — | `"Congratulations, you just advanced a fire making level."` | 14130 Firemaking Cape, 14131 Firemaking Cape (t), 14132 Firemaking Hood | `"Congratulations, you just recived the firemaking skill cape and hood!"` | `" firemaking!"` |
| 12 | Crafting | — | — | — | `"Congratulations, you just advanced a crafting level."` | 14106 "Crafting Cape (t)", 14107 Crafting Cape (t), 14108 Crafting Hood | `"Congratulations, you just recived the crafting skill cape and hood!"` | `" crafting!"` |
| 13 | Smithing | — | — | — | `"Congratulations, you just advanced a smithing level."` | 14121 Smith Cape, 14122 Smithing Cape (t), 14123 Smith Hood | `"Congratulations, you just recived the smithing skill cape and hood!"` | `" smithing!"` |
| 14 | Mining | — | — | — | `"Congratulations, you just advanced a mining level."` | 14118 Mining Cape, 14119 Mining Cape (t), 14120 Mining Hood | `"Congratulations, you just recived the mining skill cape and hood!"` | `" mining!"` |
| 15 | Herblore | — | — | — | `"Congratulations, you just advanced a herblore level."` | 14100 Herblore Cape, 14101 Herblore Cape (t), 14102 Herblore Hood | `"Congratulations, you just recived the herblore skill cape and hood!"` | `" herblore!"` |
| 16 | Agility | — | — | — | `"Congratulations, you just advanced an agility level."` | none (14097–14099 exist but are not given) | `"Congratulations, there is no agility skillcape"` | `" agility!"` |
| 17 | Thieving | — | — | — | `"Congratulations, you just advanced a thieving level."` | 14103 Thieve Cape, 14104 Thieving Cape (t), 14105 Thieve Hood | `"Congratulations, you just recived the Thieveing skill cape and hood!"` | `" thieveing!"` |
| 18 | Slayer | — | — | — | `"Congratulations, you just advanced a slayer level."` | 14112 Slayer Cape, 14113 Slayer Cape (t), 14114 Slayer Hood | `"Congratulations, you just recived the Slayer skill cape and hood!"` | `" Slayer!"` |
| 19 | Farming | — | — | — | `"Congratulations, you just advanced a farming level."` | 14136 Farming Cape, 14137 Farming Cape (t), 14138 Farming Hood | `"Congratulations, you just recived the Farming skill cape and hood!"` | `" Farming!"` |
| 20 | Runecrafting | — | — | — | `"Congratulations, you just advanced a runecrafting level."` | 14091 Runecrafting Cape, 14092 Runecrafting Cape (t), 14093 (not in item.cfg) | `"Congratulations, you just recived the runecrafting skill cape and hood"` (no "!") | `" runecrafting!"` |

Item ids 14073–14138 are custom (from Allstar's client cache; item.cfg names shown). Other `addSkillXP` message: `"Max XP value reached"` (xp overflow).

---

## 9. Appendices (other player-facing texts touched while tracing; mostly owned by other inventories)

### 9.1 Other server-set interface texts (outside dialogue/quest scope)
- Bank PIN settings (`openUpPinSettings()`, AUTHENTIC-style): `` `15038` "Customers are reminded" ``, `` `15039` "that they should NEVER" ``, `` `15040` "tell anyone their Bank" ``, `` `15041` "PINs or passwords, nor" ``, `` `15042` "should they ever enter" ``, `` `15043` "their PINs on any website" ``, `` `14044` "from." `` (id typo, should be 15044), `` `15045` "" ``, `` `15046` "Have you read the PIN" ``, `` `15047` "Frequently Asked" ``, `` `15048` "Questions on the" ``, `` `15049` "Website?" ``, `` `15105` "No PIN set" ``, `` `15107` "3 days" ``.
- Special-attack bar `12335` (per energy step): `"S P E C I A L  A T T A C K"`, `"@bla@S P E @bla@C I A L  A T T A C K"`, `"@bla@S P E C I A L@bla@  A T T A C K"`, `"@bla@S P E C I A L  A T T A @bla@C K"`, `"@bla@S P E C I A L  A T T A C K"`, `"@yel@S P E @bla@C I A L  A T T A C K"`, `"@yel@S P E C I A L@bla@  A T T A C K"`, `"@yel@S P E C I A L  A T T A @bla@C K"`, `"@yel@S P E C I A L  A T T A C K"` (two spaces between words).
- Trade: `` `3417` "Trading With: " + name ``, `` `3431` "Waiting for other player..." `` / `"Other player has accepted."` / `""`, `` `3535` "Waiting for other player..." `` / `"Other player has accepted."`, `3557`/`3558` = item lists.
- Run energy `` `149` "@whi@1@gre@0@whi@0@gre@%" `` (and `playerEnergy + "%"` for `::god`/`::godoff`). Coordinates panel: `` `183` "Your coordinates" ``, `` `184` "X: " + absX + " Y: " + absY ``. Shop title `3901` = shop name. Weapon name on attack tab via `SendWeapon` (components 5857, 12293, 1767, 331, 4449, 2279, 5573, 1701, 8463, 4682, 7764, 2426). Skill-tab numbers via `setSkillLevel` (4004–4039, 4152/4153, 12166/12167, 13926/13927). Smithing interface (`initSmithing`, 348 writes of item names/bars; `OpenSmithingFrame`). Debug commands for Mod Steve (`::sq` writes `"lolol"`; `::sendqz`, `::sendzq2`, `::sendquestduel`, `::sendquesttest` write component numbers).

### 9.2 Skill-cape emote (`capeEmote()`, emote-tab button 161) — forced overhead chat
Each cape plays gfx/anim, sets `txt4` (overhead text) and often boosts the skill by +1 (writing the value to component 4016, a bug). Verbatim texts: 14073/14074 `"An attack skill cape."` (+1 Attack) · 14076/14077 `"A strength skill cape."` (+1 Str) · 14079/14080 `"A defence skill cape."` (+1 Def) · 14094/14095 `"A hitpoints skill cape."` (+1 HP) · 14082/14083 `"A ranging skill cape."` (+1 Ranged) · 14085/14086 `"A prayer skill cape."` (+1 Prayer) · 14088 `"A magic skill cape."` (+1 Magic) · 14127/14128 `"A cooking skill cape."` (+1) · 14133/14134 `"A woodcutting skill cape."` (+1) · 14109/14110 `"A fletching skill cape."` (+1) · 14124 `"A fishing skill cape."` (+1) · 14130 `"A firemaking skill cape."` · 14105 (Thieve Hood!) `"A crafting skill cape."` · 14121 `"A smithing skill cape."` (+1) · 14118 `"A mining skill cape."` · 7638 `"An herblore skill cape."` · 7634 `"An agility skill cape."` · 14103/14104 `"A thieving skill cape."` (+1) · 14112/14113 `"A slayer skill cape."` (+1) · 14136 `"A farming skill cape."` · 14091 `"A runecrafting skill cape."` · 15713/15714 `"A Summoning skill cape."` (+1 Attack) · 7676 `"A hunter skill cape."`.

### 9.3 Other custom forced-chat strings seen
Toy horsey items (`CheckForSkillUse3`): 2520 `"Come on Swifty, we can win the race!"` (anim 918), 2522 `"Come on Alex, we can win the race!"` (919), 2524 `"Come on Vegeta, we can win the race!"` (920), 2526 `"Come on MrWicked, we can win the race!"` (921) (RS uses Dobbin/etc.; names are CUSTOM). Home teletab 9540: `"You teleport to home"` (overhead), teleport (2515, 3863).

---

## 10. Porting notes / open issues
1. Nearly every "quest" is unfinishable as shipped (unspawned givers, items without sources, `Killedqueen`/`Guard` never set). A 1:1 port must decide between reproducing the broken state or filling the gaps using the intent documented above (journal text + dialogue).
2. Chat headers show raw npc.cfg names with underscores (e.g. `Wizard_Mizgog`); LC's `~chatnpc` uses the cache name. Decide whether to replicate.
3. Allstar's Cook's Assistant, Aubury, banker and boat texts collide with LC's authentic content (same NPCs, different text/rewards).
4. Clue system hint/step mismatches, the level-2 missing stage-2 block and the level-3 stage-5 "dig anywhere" bug are real Allstar behaviour; flagged ⚠ in §6.4.
5. Component ids are 317; LC is 377 — map by function (chatbox templates, quest scroll 8134, quest tab 638, welcome 15944, level-up boxes), not by number.
