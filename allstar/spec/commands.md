# Allstar-Scape v2 — `::` command inventory (1:1 reference)

Source: `D:\Desktop\allstar.scape.v2\client.java`, `public void customCommand(String command)` **L11299–L13890** (method ends L13890). All `Lnnnnn` = client.java unless another file is named. Item/NPC names from item.cfg / npc.cfg. Spawn notes from autospawn.cfg (±16 tiles, ±45 where noted).

Class legend: **CUSTOM** = Allstar-specific, port. **CUSTOM-staff** = Allstar staff tool (port as staff cmd). **CUSTOM-cheat** = staff spawn kit (port for 1:1; dev/staff-only). **AUTHENTIC** = real-RS behaviour Lost City already has. **JUNK** = debug/broken/exploit/pointless (recorded anyway for 1:1). ⚡ = handler has no try/catch → bad/missing arg or offline target name throws → issuer **disconnected** (see §0).

---

## 0. Engine facts that govern every command (1:1-critical)

| Topic | Behaviour |
|---|---|
| Tick | `server.java:16 cycleTime = 500` ms. All timers below are in cycles (1 cycle = 0.5 s). |
| Dispatch | `case 103` L22589: `String playerCommand = inStream.readString(); println_debug("playerCommand: " + playerCommand); customCommand(playerCommand);` — no rights gate, no command log (logs/commandlogs.txt exists, never written). A standard 317 client sends the text after `::` as typed (client source not in this folder). |
| Other callers | Emote-tab buttons (packet 185) call `customCommand("<literal>")` — §10. |
| Match types | Column "M": **S** = `startsWith` (case-SENSITIVE prefix), **E** = `equalsIgnoreCase` (exact, any case), **X** = `equals` (exact, case-sensitive). So `::Home` works, `::Pest` does not; `::pestxyz` triggers `pest`. |
| Chains | Method = ~45 independent `if`/`else if` chains run top-to-bottom; one input can fire several handlers (duplicates §9); inside a chain first match wins (shadowing noted). |
| Arg parsing | Fixed `substring(n)` offsets, no trimming; `Integer.parseInt` rejects spaces. Syntax column shows the exact layout that works. |
| Exceptions | Uncaught exception → `packetProcess()` catch L18056 → `__ex.printStackTrace(); disconnected = true; System.out.println("pimpscape Server [fatal] - exception")` → issuer kicked (saved). |
| Flood counter | L11300 `actionAmount++` per command (also per emote-button call). PlayerHandler.java:149 decrements 1/cycle, floor 0 (L17025). `> 25` → `"Kicked for acting too fast!"` + console `Client acts too fast - disconnecting it` + disconnect (L17031). |
| No-op filter | L11302-11304 `command.replaceAll("no-ip","imgay"); command.replaceAll("servegame","imgay"); command.trim();` — results discarded → **no effect** (same no-op in yell L13131-13133). |
| **Owner coin bug** | L11567 `if (command.startsWith("m") && playerRights >= 3) addItem(995, 999999999);` → for rights ≥3 EVERY command beginning with lowercase `m` also adds 999,999,999 Coins (addItem caps at maxItemAmount): m, mod, master, mining (+ its emote button), mypk, mystats, mypos, modinfo, mainmenu, male, maxhit, make, makemem, membership, mask1, m1001/2, m4001-7, msk100/400, mute/mz/modzone. Advertised at login to rights 3: `"::m to get unlimited money"` (L15656). |
| Teleports | Commands only set `teleportToX/Y`; applied in the same cycle by `getNextPlayerMovement()` (Player.java:489, called PlayerHandler.java:158): instant, no anim/gfx/delay, walk queue reset, **heightLevel unchanged** (only xteleto/xteletome/goupz/godownz touch height). **No wilderness-level check on any command.** |
| Teleblock | "Chain F" teleports (L11701-11866) and `az` check `teleblock` → `"A magical force stops you from teleporting."`. `teleblock` (L4981) set only by `Teleblock()` L4961 (spells L28329, L28685: msg `"A teleblock has been cast on you!"`, gfx 345) and **never cleared → lasts until relog**. `pest`, `testminigame`, `relleka`, `cwars`, `gsmini`, `nc`, `tele`, `xteleto` ignore it. |
| Global msg | `PlayerHandler.messageToAll` = single static String; delivered as `globalMessage` to players[1..maxPlayers-1] at start of next PlayerHandler.process (PlayerHandler.java:117-127) → shown via sendMessage (L18000). Two in one cycle → last wins. |
| Kick | `PlayerHandler.kickNick = name` → that player `kick()` → `isKicked = true` (PlayerHandler.java:160; Player.java:1225). `kickAllPlayers = true` → all isKicked next cycle (PlayerHandler.java:128). |
| addItem | L14850: non-stackable items always added ×1 regardless of amount. |
| showInterface | L10212 also calls `resetAnimation()` (stand anim ← playerSE) — side effect of every scroll/interface command. |

### 0.1 playerRights mapping (confirmed)
| Value | Rank | Evidence |
|---|---|---|
| 0 | Player | Player.java:27 default; login broadcast `"<name> has logged in"` L10887 |
| 1 | Moderator | L10879 `"Moderator <name> has logged in"`; `givemod` → `"<name> is now a Moderator"`; welcome L15633-15640 (`"Your a Mod... Respect your moderator status"`) |
| 2 | Server Administrator | L10875 `"Server Administrator <name> has logged in"`; `giveadmin` → `"is now an Administrator"`; welcome L15642-15649 (`"Feel free to spawn w/e u want... NOTHING to other players (cept mods)"`) |
| 3 | Owner & Coder / co-owner | L10871 `"Owner & Coder <name> has logged in"`; `giveowner` → `"is now a co-owner"`; login response sends crown **2** to client (L11014 "Crown fixup"); welcome L15651-15658 |
| 4 | unused | only L10883 plain login broadcast |

Storage: `character-rights` in `characters/<name>.txt` — loaded `loadGame` L34630, saved `savechar` L34774 and PlayerHandler.saveGame (PlayerHandler.java:437). Changed in-game only by giveadmin/givemod/giveowner/demote. Legacy rank files `data/moderators.txt`, `administrators.txt`, `staff.txt` (all empty) — loader commented out L10981-10991 (stale comment "1 = mod, 2 = staff, 3 = admin"). L10993-10999 `playerName.equalsIgnoreCase("")` rights grants = no-ops. Login broadcast override L10867: names `Skillerzmine`, `Fatality`, `Mod Mike` → `"Co-owner <name> has logged in"`; L10863 `"Mod Allstar "` (trailing space, never matches) → "Owner & Coder …".
Right-click player options sent at login (not commands, L10923-10957): slot 4 "Trade with"; slot 2 "Follow" (rights ≤2) / "Ban" (rights ≥3); slot 3 "Attack"; slot 5 "Kick" (rights >0 or name "D D 3").
**Owner block** L13382: `if ((playerRights >= 3) || playerName.equalsIgnoreCase("Fatality")) { … }` wraps §5b owner-block commands (L13384-13792).

### 0.2 Hard-coded usernames (all `equalsIgnoreCase`)
| Name | Command powers |
|---|---|
| `Mod Allstar` (creator) | giveowner, owner, getpass, projz, hide, show (no rights needed); alt-access to clicks, ipban, macrowarn, xteleto; exempt from noclip/mute/mz/modzone honeypots |
| `D D 3` / `d d 3` (dev) | text4, sidebar, setsb, sbloop, sbfast, 99hp, loop, teleport(broken), setemote (+rights≥1); alt-access checkip; exempt from cp/si honeypots; inside owner block: item, addxp, goupz, godownz, nick. Also gets "Kick" right-click. |
| `Mod Steve` | owner block: setxp(+nested setall), object, sq, sendqz, sendzq2, sendquestduel, sendquesttest; loadbackup (no rights) |
| `Fatality` | whole owner block without rights; co-owner login msg |
| `Skillerzmine`, `Soz r4nged`, `rawr` | ipban |
| `Purez` | item (owner block) |
| `zezima` | teleport (broken) |
| Outside commands | `Mod Mike` (co-owner login msg), `Motherload11` (bank+inv wiped once at login L15663), `kaitnieks`/`sythe` (login refused L11207), `admin` (debug prints; getPass never reveals "admin"). |

### 0.3 Timers / cooldowns touched by commands (cycles)
| Timer | Value | Notes |
|---|---|---|
| Reptimer (rep) | set 3600 (=1800 s) | **Never decremented anywhere** (refs only L11337-11345, L16947) → 1 successful rep per login session; message claims "1 hour". Field resets to 0 at login. |
| starter flag | persistent | `character-starter` in moreinfo file (L34263/L34076); shared with NPC 1051 starter. |
| actionAmount | +1/cmd, −1/cycle | >25 → kick. |
| teleblock | until relog | never reset. |
| LogoutDelay (testskull) | 2 | decremented 1/cycle (L17110); logout button msg `"You must wait 10 seconds after combat to log out!"` (L23956). |
| update N | wall clock (N+1) s | then kick all + `server.ShutDown`; server loop exits after ShutDownCounter ≥100 cycles (~50 s) (server.java:86-91). Client timer = frame 114 value (N+1)*50/30, sent once (PlayerHandler.java:324). |
| mute | 48 h (not a command) | set only via Report-Abuse mute checkbox by rights ≥1 (L20993-21000, msg `"You have been muted for 48 hours by <mod>"`); cleared at login if `GetLastLogin(mutedate) >= 2` (L15611). Non-mod sending mute flag → autobanned (L20974). |
| yell | none | no cooldown. |

---

## 1. Player teleport commands (anyone)
TB = teleblock check. Height kept. All TB failures print `"A magical force stops you from teleporting."`. Area names are my labels from coordinates (coords are authoritative); spawn lists are verified from autospawn.cfg.

| Cmd | M | Rights | Dest x,y | Messages (verbatim) | TB | Line | Class | Area / spawns (autospawn.cfg) |
|---|---|---|---|---|---|---|---|---|
| `pest` | S | any | 2657,2639 | — | no | 11314 | CUSTOM | Void Knights' Outpost (Pest Control lander area); no spawns within 45; PC is a 2006 release — verify region exists in rev-377 cache |
| `testminigame` | E | any | 3114,9928 | — | no | 11545 | JUNK (test) | Edgeville Dungeon wilderness section; no spawns within 45 |
| `relleka` | E | any | 2680,3718 | `You teleport to the Rock crab training area` | no | 11550 | CUSTOM | 13× Rock_Crab(1265), Weapon_poison_salesman(681) |
| `cwars` | E | any | 2397,3108 | `CastleWars Pk area!` | no | 11556 | CUSTOM | Castle Wars battlefield used as PK arena (needs PvP zone in LC). Related object 2466 (L4215) chooser: Saradomin → 2387,3116 `"Welcome to Saradomin's team!"` (L24069); Zamorak → 2412,3091 `"Welcome to Zamorak's team!"` (L24139) |
| `home` | E | any | 2853,3591 | `You teleport to Home.` | yes | 11701 | CUSTOM | Death Plateau N of Burthorpe = **death respawn** (ApplyDead L25417) = emote btn 168. Spawns: Genie(409)×2, Fairy(57), Wise_Old_Man(2253), Bonzo(225), Alfonse_the_waiter(793), Frog_princess(2475), Prince_Ali(920), Zoo_keeper(28), King_Lathas(364), npc 2821. Objects: cosmic rift 2467@2862,3599 → Skill Area (L4194), 2466 clan chooser |
| `jad` | E | any | 3204,3424 | `WELCOME TO THE JAD!!!!!!KILL HIM FOR A FIRECAPE` | yes | 11709 | CUSTOM | Varrock square; Tztok-Jad(2745)@3210,3423 |
| `Drags` | E | any | 2858,9844 | `You Teleport to the Metal Dragon Lair` | yes | 11717 | CUSTOM | Taverley Dungeon; Bronze_dragon(1590)×5, Iron_dragon(1591)×5, Steel_dragon(1592)×1 |
| `wc` | E | any | 2544,3878 | `Grab Axe And Start Cutting Trees.` | yes | 11725 | CUSTOM | Miscellania; no NPCs |
| `kqueen` | E | any | 3485,9483 | `You teleport to the kalphite area.` | yes | 11733 | CUSTOM | Kalphite Lair: Kalphite_Queen(1158)@3483,9490, 2nd Tztok-Jad(2745)@3477,9495, Shop_keeper(551)@3478,9484 |
| `cather` | E | any | 2842,3439 | `You teleport to fishing/cooking area.` | yes | 11741 | CUSTOM | Catherby beach, fishing spots 233-236 |
| `3rdage` | E | any | 3232,9801 | `You teleport to the 3rdage area.Kill the guy's for 3rd age.` | yes | 11749 | CUSTOM (likely dead dest) | under S Varrock; no spawns within 45 |
| `edge` | E | any | 3086,3511 | `You teleport to the EdgeVille Pk area, Pk Here!` | yes | 11757 | CUSTOM | Edgeville S of ditch; Shop_assistant(527)@3080,3509 |
| `pkbox` | E | any | 3306,9375 | `You teleport to the PkBox` | yes | 11766 | CUSTOM | Smoke Dungeon (Pollnivneach) E end; Lowe(550)@3305,9373; welcome screen `"Latest Update - New PkBox!"`; non-wild in RS → needs PvP zone |
| `zammy` | E | any | 2412,3091 + addItem 4515 Castlewars_hood (Zamorak) ×1, 4516 Castlewars_cloak (Zamorak) ×1 (only when not TB'd) | `You teleport to Zamorak's Clan` | yes | 11775 | CUSTOM | = Zamorak side of object-2466 chooser (which gives no items); no Saradomin equivalent command |
| `slayer` | E | any | 3428,3536 | `You teleport to slayer tower, hit the chests for slayer exp!` | yes | 11786 | CUSTOM | Slayer Tower entrance: Peksa(538), Chicken(41)×3, Skeleton(90), Crawling_Hand(1648)×3, Dark_Beast(2783), npc 3117; "chests" = custom objects |
| `smith` | E | any | 3227,3438 | `You teleport to the smithing area, grab a hammer and start smithin'!` | yes | 11795 | CUSTOM | Varrock NE of square; no NPCs |
| `guilds` | E | any | 2757,3496 | `You teleport to the Guild Portals!` | yes | 11804 | CUSTOM | Camelot courtyard; Brother_Cedric(280), Dark_wizard(172); portals = objects |
| `shops` | E | any | 2738,3464 | `You teleport to the Shopping Area!` | yes | 11813 | CUSTOM | S of Camelot; 18 shop NPCs: Hans(0)×4, 683, 461, 554, 520, 1699, 521, 1917, 548, 528, 555, 561, 558, 209, 553 |
| `teampk` | E | any | 3243,3517 | `You teleport to the Team Pk area!` | yes | 11822 | CUSTOM | N Varrock at wild ditch; Lowe(550)@3246,3516 |
| `train` | E | any | 3209,2801 | `You teleport to the Training Area!` | yes | 11831 | CUSTOM | SW Kharidian desert: King_Roald(648), King_black_dragon(50)×2, Jogre(113)×8, Soldier(35)×8, Barbarian_woman(17)×12 |
| `skill` | E | any | 2380,3427 | `You teleport Allstar-Scape's Skill Area!` | yes | 11840 | CUSTOM | W Gnome Stronghold; Shop_keeper(530), Horvik(549) |
| `barrows` | E | any | 3565,3306 | `You teleport to the Barrows!` | yes | 11849 | CUSTOM | overworld brothers: Torag(2029)×5, Dharok(2026)×1, Karil(2028)×4, Battle_mage(912/913/914)×5 |
| `mining` | E | any | 2823,3001 | `You teleport to the Shilo Village Mining!` | yes | 11858 | CUSTOM | Shilo gem mine |
| `gsmini` | S | any | 2845,4832 | `Welcome godsword mini game, kill the monsters to advance rounds` / `The monsters hp starts at 150 then next monster is 250 and so on` / `If you PK here YOUR BANNED!` | **no** | 11891 | CUSTOM | Air altar interior, Air_elemental(1021)×4. Rounds = NPC-death teleports of killer in NPCHandler.java:1124-1201 (1021→2660,4839; 1020→2713,4836; 1022→2584,4836; 1019→2464,4834; also 752/275/477/1919/509/274/795 → other coords) |
| `nc` | X | rights **<2** | `teleportToX += 103; teleportToY -= 52` on −1 → (102,−53) void | — | no | 11562 | JUNK (anti-"noclip" trap) | |

Structure: L11690-11889 is ONE chain: `sweet`(rights≥1 kit) → home … mining → `makemem`. The dead `mypk` (L11867) sits inside the `mining` branch.

---

## 2. Player utility & info commands (anyone)

| Cmd / syntax | M | Rights | Exact behaviour & messages (verbatim) | Line | Class |
|---|---|---|---|---|---|
| `starter` | E | any, once | If `starter==0`: addItem 995 Coins ×25,000,000; 392 Manta_ray(noted) ×15,000; 6528 Tzhaar-ket-om ×1; 554 Fire, 555 Water, 565 Blood, 556 Air, 557 Earth, 560 Death, 561 Nature, 562 Chaos, 563 Law, 566 Soul, 558 Mind rune ×20,000 each; msg `Allstar-Scape Starter Package`; starter=1; `savemoreinfo(); savechar();`. Else: `Sorry.` + GLOBAL `<name> Is a noob and is trying to get a extra starter!! :p`. Alt: talk-to NPC 1051 Nature_Spirit (L18908, not spawned) → 995×15,000,000 + 392×1,500, `Get more food from the store owner:zeek`; repeat → `Why do you have to be greedy?` + GLOBAL `<name> is really greedy trying to type ::starter again`. Login msg rights 0: `Type ::Starter To Begin`. | 11596 | CUSTOM |
| `rep <name>` | S | any | ⚡(offline/no arg). Order: (1) my IP == target IP (incl. self): `You are double logging in, you are laggin server, and cheating. -5 rep.` reputation −5 (mine); (2) Reptimer≥1: `You have already gaven a rep point please wait 1 hour`; (3) `(Reptimer==0 && reputation>=1) \|\| (rights>=2 && Reptimer==0)`: `You just gave <arg>, a reputation point.`, target reputation +1, target gets `You recieved rep from <me>`, Reptimer=3600; (4) else silent. ALWAYS appends `logs/repLogs.txt`: `[---<arg> was given rep by <me>---]` (close err `Error reporting user.`). Rep 0 non-admins can never give rep. Rep saved `character-reputation` (L34255), shown on login welcome interface 15944 child 15952 `Reputation: @whi@<n>` (newWelc L238). | 11328 | CUSTOM |
| `yell <text>` | S, len>5 | any | muted==1 → `You are muted and cannot yell!`; else GLOBAL `<me> - <substring(5)>` (raw; no rank tag, no cooldown, filter no-op). | 13129 | CUSTOM |
| `tell <name> <msg…>` | S | any | StringTokenizer; name `_`→space; msg = concat of `" "+token`. If online: loop `i=1..` while `players[i].playerName != name && i<100` (⚡NPE if any null slot before target); target.globalMessage `<me> Tells you: <msg>` (msg has leading space → 2 spaces); self `You tell <Name>: <msg>`. Offline: `Player not currently online! If you know they are, their name must have a space in it` + `If that is the case, replace the spaces with _'s`. Missing tokens: `Error - Message not sent`. | 12981 | JUNK (LC has real PM) |
| `pass <new>` | S, len>5 | any | `playerPass = substring(5)` (no validation, saved at logout); msg `Your new pass is "<new>"` | 13794 | JUNK/infra (this is the "changepass") |
| `empty` | S | any | `removeAllItems()` (all 28 slots → 0, resetItems 3214). Fires twice (L12840 + L13797). | 12840/13797 | JUNK-QoL |
| `players` | E | any | (1) L12897 `playerMenu()` L8979: clears scroll; for each non-null slot i: 8144 `@dre@Players`, 8146 `@red@Allstar-Scape`, child 8147+i `@red@<name>` (slot-indexed); sendQuestSomething(8143); showInterface(8134). (2) L13871 `There are currently <n> players!` | 12897/13871 | CUSTOM-QoL |
| `mypos` | S | any | L12899 `You are standing on X=<x> Y=<y>`; L13875 `You are standing on X=<x> Y=<y> Your Height=<h>` + `CurrentX: <cx> CurrentY: <cy>` (owners also get `mypos 2` §5b) | 12899/13875 | JUNK-debug |
| `mystats` | E | any | L12842: `UserName:  <name>`, `Password:  <pass>`, `UserID:  <slot>`, `Rights:  <r>`, `Location X=<x> Y=<y>`; then L13848: `Total lvl:  <n>` (bug: sums skills 0,1,…,10,**0**,11…15,**6**,17…20 — Agility omitted, Attack & Magic doubled), same 5 lines again, `PkPts: <p> Kills: <k> Deaths: <d>` | 12842/13848 | JUNK (shows own password) |
| `mypk` | E | any | `PkPts - <pkpoints>`, `Kills - <killcount>`, `Deaths - <deathcount>` | 13844 | CUSTOM (PK-points system, PKz L25287) |
| `suggest <text>` | S | any | ⚡(no arg). `Sending...`, `Suggestion Succesfully Sent To Mod Allstar!` (before write); appends `suggestions.txt`: `<me>: <text>`; close err `Error Suggesting` | 11916 | CUSTOM |
| `serverpanel` | E | any | `CheckServerPanel()` L76 toggles per-player `serverpanel` (default true): → `You have turned the server panel off. Type ::serverpanel to get it back.` / `You have turned the server panel back on. Type ::serverpanel if you wish to turn it off.` Overlay drawn by `WritePlayers()` L89 on packet 121 (region load, L19781): walkable 15892 (or −1 when off); 15894 `ServerPanel:`, 15895 `Owner: Your name here`, 15897 `Co-Owner: Your name here`, 15898 `Players Online: @gre@<n>`, 15899 `Made by: Tico135`, 15900 `Safe`/`Un-safe` (nonWild), 15901-15906 blank. Note L19783: in non-wild the walkable is immediately replaced by 197 with 199=`@yel@Safe`. Is the else-branch after `mod` (chain G). | 12054 | CUSTOM (HUD) |
| `char` | S | any (`rights<=441`) | `showInterface(3559)` (character design). Owner dup L13549. | 13045 | AUTHENTIC-ish (design screen) |
| `male` | S | any | `You're now a man...`; pHead=1,pBeard=10,pTorso=18,pArms=26,pHands=33,pLegs=36,pFeet=42; appearance update (gender byte unchanged) | 12818 | JUNK-QoL |
| `female` | S | any | `You're now a girl...`; pHead=50,pTorso=57,pArms=62,pHands=68,pLegs=72,pFeet=80 (beard & gender unchanged) | 12830 | JUNK-QoL |
| `normal` | S | any | isNpc=false, appearance update (undo pnpc) | 13346 | JUNK |
| `savebackup` | E | any | `savecharbackupmyth()` called 3× → serialized PlayerSave to `./charbackupmyth/<name>.dat`; `Character backup file successfully saved` / `Error saving backup file!`; exception `Fatal error saving backup file` | 13799 | JUNK |
| `updatestats` | S | any | `saveStats()` L8659 → `C:/Documents and Settings/User/My Documents/Copy of Pimpscape/savedgames<name>.dat` (22 lines `<skill> - <lvl> - <xp>`; silently fails if dir missing); msg `Stats saved to highscores.` (owners: also hits `update` in owner block ⚡) | 12901 | JUNK |
| `makemem<name>` | S | **any** | `disconnected=false`; victim=`substring(7)` (with the space → `" Bob"`); echoes victim; appends to `data/members.txt`; IOException → console `membership.txt: error loading file.` + disconnect. Login `checkmembers()` L35524 exact-matches → leading space breaks it. `playerIsMember` has no gameplay use (only saved). | 11871 | JUNK |
| `membership <name>` | S | **any** | ⚡(no arg). `Player <name> has become a Member!` (issuer only); sets `playerIsMember=1` on online match (saved, unused) | 11901 | JUNK |

### 2b. Info-scroll commands (anyone) — quest scroll 8134 (title 8144, `clearQuestInterface()` L10206 blanks 8145, 8147-8195, 12174-12223 — not 8144/8146; `sendQuestSomething(8143)` = frame 79 scroll reset). Full text §12.
| Cmd | M | Opens | Line | Class |
|---|---|---|---|---|
| `armorhelp` | S | ElementalHelpMenu L8762 (Elemental armour guide) | 11306 | CUSTOM-info |
| `modinfo` | E (`rights>=0`) | inline rules scroll L12060-12077 (`substring(5)` unused) | 12058 | CUSTOM-info |
| `mainmenu` | E | MainHelpMenu L9000 (text only if rights ≤0; also opens design 3559 if look is default) | 12866 | CUSTOM-info |
| `info` | E | MainHelpMenu | 13869 | CUSTOM-info (alias) |
| `questmenu` | E | QuestHelpMenu L9030 | 12869 | CUSTOM-info |
| `slayerinfo` | E | SlayerHelpMenu L8723 | 12872 | CUSTOM-info |
| `theifmenu` | E | TheifHelpMenu L8787 | 12875 | CUSTOM-info |
| `castlewars` | E | CastlewarsHelpMenu L8816 | 12878 | CUSTOM-info |
| `servermenu` | E | ServerHelpMenu L8846 (stale PimpScape data) | 12881 | JUNK-info |
| `smeltingmenu` | E | SmeltingHelpMenu L8878 (mentions nonexistent `::smelt`) | 12884 | CUSTOM-info (stale) |
| `fishing` | E | FishingHelpMenu L8895 (mentions nonexistent `::fish`) | 12887 | CUSTOM-info (stale) |
| `updates` | E | inline L13228-13243 | 13227 | CUSTOM-info |

---

## 3. Item / stat spawning

| Cmd / syntax | M | Rights | Exact behaviour & messages | Line | Class |
|---|---|---|---|---|---|
| `m…` (any m-prefix) | S `m` | ≥3 | addItem(995 Coins, 999,999,999); no msg | 11567 | CUSTOM-cheat (bug-prone) |
| `pickup IIIII N` | S | ≥2 | id=`substring(7,12)` (exactly 5 chars, zero-pad e.g. `pickup 04151 1`), amt=`substring(13)`; 0≤id≤30000 → addItem(id,amt) else `That Item Doesn't Exist`; parse err `Cmon Type IT AGIAN ! ` | 11581 | CUSTOM-cheat |
| `notedbarrows` | S | ≥1 | addItem ×1000 each, noted: 4717 Dharoks_helm, 4719 Dharoks_greataxe, 4721 Dharoks_platebody, 4723 Dharoks_platelegs, 4709 Ahrims_hood, 4711 Ahrims_staff, 4713 Ahrims_robetop, 4715 Ahrims_robeskirt, 4754 Veracs_helm, 4756 Veracs_flail, 4758 Veracs_brassard, 4760 Veracs_plateskirt, 4746 Torags_helm, 4748 Torags_hammers, 4750 Torags_platebody, 4752 Torags_platelegs, 4733 Karils_coif, 4735 Karils_crossbow, 4737 Karils_leathertop, 4739 Karils_leatherskirt, 4727 Guthans_warspear, 4729 Guthans_platebody, 4731 Guthans_chainskirt, 4725 Guthans_helm. No msg. | 11401 | CUSTOM-cheat |
| `sweet` | S | ≥1 | addItem ×1: 775 Cooking_gauntlets, 1837 Desert_boots, 4151 Abyssal_whip, 1052 Cape_of_legends, 1704 Amulet_of_glory, 4712 Ahrims_robetop, 4714 Ahrims_robeskirt, 4708 Ahrims_hood, 6524 Toktz-ket-xil, 385 Shark (`amount 19` → 1). No msg. | 11690 | CUSTOM-cheat |
| `mod` | E | ≥1 | addItem ×1: 1048 White_partyhat, 6585 Amulet_Of_Fury, 2503 Dragonhide_body, 4151 Abyssal_whip, 2497 Dragonhide_chaps, 1837 Desert_boots, 775 Cooking_gauntlets, 3840 Holy_book, 1052 Cape_of_legends; `The Allstar-Scape, ModLook package!` | 12040 | CUSTOM-cheat |
| `Food` | E | ≥1 | addItem 392 Manta_ray(noted) ×200; `Some Food` | 12035 | CUSTOM-cheat |
| `rich` | E | ≥2 | addItem ×1: 1042 Blue, 1044 Green, 1046 Purple, 1048 White, 1040 Yellow, 1038 Red partyhat. No msg. | 12890 | CUSTOM-cheat |
| `pure` | E | ≥2 | addSkillXP(486,000,000) to skill idx 0,2,3,4,6…24 (idx 1 Defence & 5 Prayer get +0; 21-24 = unused XP slots); `N33b!.` | 11372 | CUSTOM-cheat |
| `master` | E | ≥2 | addSkillXP(14,910,000) to idx 0…23; `<me> .. your a nerd.` | 11939 | CUSTOM-cheat |
| `setlvls <xp>` | S | ≥2 | ⚡parse into unused locals; `saveStats()` only → no in-game effect | 12305 | JUNK |
| `combat<N>` | S | ≥2 | `combat=substring(6)` — must have NO space (`combat 5` ⚡; admins typing `combatz` also ⚡); saveStats(); value overwritten at next appearance update (Player.java:922) | 12330 | JUNK |
| `setxp SS XXXX` | S | owner-block + `Mod Steve` | stat=`substring(6,8)`, `playerXP[stat]=xp`, level recomputed, setSkillLevel; stat 2 → CalculateMaxHit. (Nested `setall`/`kn`/`kick` unreachable §8.) ⚡ | 13391 | JUNK-dev |
| `addxp SS XXXX` | S | owner-block + `d d 3` | addSkillXP(`substring(9)`, `substring(6,8)`); `Your experience has been changed as you asked.`; err `You messed up the command, try again` | 13581 | JUNK-dev |
| `item <id>` | S | owner-block + `D D 3`/`Purez` | ground item at own tile: `ItemHandler.addItem(id, absX, absY, playerItemsN[1], playerId, false)` (amount = stack size of inventory slot 1!) + `itemExists`; id<0 `No such item`; parse `Bad item ID` | 13490 | JUNK-dev |

Skill idx: 0 Att, 1 Def, 2 Str, 3 HP, 4 Rng, 5 Pray, 6 Mag, 7 Cook, 8 WC, 9 Fletch, 10 Fish, 11 FM, 12 Craft, 13 Smith, 14 Mine, 15 Herb, 16 Agil, 17 Thiev, 18 Slay, 19 Farm, 20 RC (XP array size 25). addSkillXP rejects when `amount+xp<0 || xp>2,000,000,000` (`Max XP value reached`).

---

## 4. Moderator commands (rights ≥1)

| Cmd / syntax | M | Rights | Exact behaviour & messages | Line | Class |
|---|---|---|---|---|---|
| `alert <text>` | S | ≥1 | GLOBAL `[~!ANNOUNCEMENT!~]: ` + `substring(8)` (**bug: first 2 chars of text dropped**); self `You have successfully sent an announcement.`; len<8 → `Wrong syntax! Use ::announce [ANNOUNCEMENT].` | 11427 | CUSTOM-staff |
| `az` | S | ≥1 | TB check; tele 3281,2766; `You teleport to the Mod & Admin Zone.` + `GREAT JOB YOU FINALLY EARNED MOD or ADMIN!` | 11439 | CUSTOM-staff (Sophanem staff zone: RuneScape_Guide(945)×2, King_Percival(212)×2) |
| `sit` | S | ≥1 | `pEmote` (stand anim) = 2939; no update flag (shows on next appearance update; undone by any showInterface/resetAnimation) | 11448 | CUSTOM-cosmetic |
| `banuser <name>` | S | ≥1 | ⚡(no arg). kickNick=name (kicked); GLOBAL `Administrator <me> is banning <name>`; `Player <name> successfully banned`; `appendToBanned(name)` → `data/bannedusers.txt` (`_`→space); logs `logs/banlogs.txt` `<me> banned<name>` and `C:/Documents and Settings/Jordan.pimp/My Documents/my server stuff/adminpk/banlogs.txt` (close err `Error logging bans!`). Enforced at login (checkbannedusers L35488). | 12126 | CUSTOM-staff |
| `xteleto <name>` | S | ≥1 or `Mod Allstar` (L12943); ==2 (L11644) | me → target absX/absY + target heightLevel; `Teleto: You teleport to <TargetName>`; exception `Try entering a name you want to tele to..`; unknown name silent. Rights 2 fires twice. Mods typing `xteletome x` hit this (arg `me x` → silent). | 12943 | CUSTOM-staff |
| `emote <id>` | S | ≥1 | 0<id<3217 → startAnimation(id), else/parse err `Bad emote ID`. Owners then also get owner-block `emote` (stand anim). | 13254 | JUNK-debug |
| `emotz<id>` | S | ≥1 | startAnimation(`substring(6)`) ⚡ | 12342 | JUNK-debug |
(Also rights≥1 spawn kits: notedbarrows, sweet, mod, Food — §3.)

---

## 5. Admin / Owner / name-locked

### 5a. Admin (rights ≥2)
| Cmd / syntax | M | Rights | Exact behaviour & messages | Line | Class |
|---|---|---|---|---|---|
| `pnpc <id>` | S | ≥2 (owner dup L13713) | 0≤id≤10000 → npcId=id, isNpc=true, appearance update; else `No such P-NPC.`; parse `Wrong Syntax! Use as ::pnpc #` | 11464 | JUNK/staff |
| `god` | E | ≥2 | startAnimation(1500); playerSE=1501; playerSEW=playerSER=playerSEA=1851; playerEnergy=99,999,999; playerLevel[3]=99,999,999; frame126 `99999999%`→149; `God mode on`; appearance update (SE applied on next resetAnimation; weapon change recomputes anims). **HP write is reverted next cycle** by process() L17811 (`if (NewHP < 136) playerLevel[3] = NewHP`, NewHP untouched) unless a hit lands in the same cycle — so in practice only energy + anims stick | 11665 | JUNK-cheat |
| `godoff` | E | ≥2 | `god mode off`; SE=808, SEW=819, SER=824, SEA=806; energy 100; playerLevel[3]=level for XP (also reverted to NewHP next cycle); frame126 `100%`→149 | 11677 | JUNK-cheat |
| `xteletome <name>` | S | ==2 (L11624) and ≥2 (L12923) | target → my absX/absY + my heightLevel; target msg `You have been teleported to <me>`; not found `The name doesnt exist.`; exception `Try entering a name you want to tele to you..` | 11624/12923 | CUSTOM-staff |
| `tele XXXX,YYYY` | S `tele` | ≥2 | `teleportToX=substring(5,9)`, `Y=substring(10,14)` (any 1-char separator). ⚡ no try: any other shape (5-digit, `teleto`, `teleport`…) disconnects | 12913 | CUSTOM-staff (LC has own) |
| `unban <name>` | S | ≥2 | If `./data/bannedusers.txt` exists: `Player <substring(5)> successfully unbanned` (2 spaces); then opens FileReader **and FileWriter (truncating)** on the same file, never flushes/closes the writer → **entire ban list wiped** (everyone unbanned). File missing → console `Error unbanning user`. | 12172 | CUSTOM-staff (buggy) |
| `macrowarn <name>` | S | ≥2 or `Mod Allstar` | ⚡. kickNick=name (kicked); console `Admin:<me> is warning <name>`; `Player <name> successfully given macro warning`; appends `data/macrowarn.txt`; logs banlogs.txt `<me> warned<name>` + Jordan path (err `Error logging warning!`). Victim at every login while listed (L15688): `You have 1 black mark as you have been caught autoing...` / `If you are caught autoing again this WILL result in further action being taken` / `against your account.` | 12200 | CUSTOM-staff |
| `clicks` | S | ≥2 or `Mod Allstar` | static LoggingClicks set true then false → always `Logging clicks set to false` | 12082 | JUNK |
| `checkip <name>` | S | ≥2 or `D D 3` | `<name>'s ip address is <ip>`; err `Try entering a name you want to check ip on.` | 12964 | CUSTOM-staff |
| `gfx <id>` | S | ≥2 | ⚡ stillgfx(`substring(5)` — skips 1st digit) at own tile, broadcast ≤60 tiles; `Testing GrApHiCs cODE!!` | 12803 | JUNK-debug |

### 5b. Owner (rights ≥3) — outside owner block
| Cmd / syntax | M | Rights | Exact behaviour & messages | Line | Class |
|---|---|---|---|---|---|
| `eat <name>` | S | **==3** | ⚡. `victim.ApplyDead()` (full death routine L25392: keep 3 items, drop rest to victim's KillerId, PKz pk-points, respawn 2853,3591); victim `You have been eaten by <me>!`; me startAnimation(829) | 11319 | JUNK/fun |
| `lupdate <text>` | S | ≥3 | GLOBAL `[LATESTUPDATE]:<text>` (no space); `You have successfully sent an announcement.`; err `Wrong syntax! Use ::lupdate [update].` | 11451 | CUSTOM-staff |
| `giveadmin <name>` | S | ≥3 | ⚡(no arg). target rights=2, `savemoreinfo(); savechar();`, target disconnected; GLOBAL `<name> is now an Administrator`; fail `<name> either isn't online or doesn't exist` | 11481 | CUSTOM-staff |
| `givemod <name>` | S | ≥3 | same, rights=1, `<name> is now a Moderator` | 11496 | CUSTOM-staff |
| `giveowner <name>` | S | name `Mod Allstar` only | same, rights=3, `<name> is now a co-owner` | 11511 | CUSTOM-staff |
| `demote <name>` | S | ≥3 | same, rights=0, `<name> is no longer a member of staff` | 11527 | CUSTOM-staff |
| `alltome` | X | ≥3 | every online player (incl. me) teleportTo my absX/absY (their heights unchanged); no msg | 11570 | CUSTOM-staff |
| `ipban <name>` | S | ≥3 or `Mod Allstar`/`Skillerzmine`/`Soz r4nged`/`rawr` | ⚡(offline). `appendToBannedIps(target IP)` → `data/bannedips.txt`; target disconnected; `player successfully ip banned`; GLOBAL `<me>: HAS IP BANNED THE PLAYER: ` + `substring(5)` (→ 2 spaces); log `logs/ipbanlogs.txt` `<me> banned<name>` (err `Error logging ip bans!`). At login a banned IP also appends the name to bannedusers (L10840/L15616). | 12094 | CUSTOM-staff |

### 5b'. Owner block (rights ≥3 OR name `Fatality`), L13382-13792
Chain M (first match wins): update → setxp → item → object → sq → sendqz → sendzq2 → sendquestduel → sendquesttest → char → newhead → `mypos 2` → bank → guardz → tele → reboot → addxp → interface → inter → make → `snowingzz 1` → `snowingzz 2` → nosnow → dust → emote → goupz → godownz → npc → a → follownpc → unpc → xslime → pnpc. Chain N: kick → bootall → nick → kickall.

| Cmd / syntax | M | Extra gate | Exact behaviour & messages | Line | Class |
|---|---|---|---|---|---|
| `update <sec>` | S, len>7 | — | ⚡ non-numeric (e.g. owner typing `updatestats`, `update1z …` disconnects). `PlayerHandler.updateSeconds=sec+1; updateAnnounced=false; updateRunning=true; updateStartTime=now` → frame 114 `(sec+1)*50/30` sent once to all online; after (sec+1) s `kickAllPlayers=true; server.ShutDown=true` → JVM loop exits after 100 more cycles | 13384 | AUTHENTIC (system update) |
| `bank` | E | — | `openUpBank()`: sendFrame248(5292,5063), resetItems(5064), IsBanking=true — anywhere | 13564 | JUNK-staff |
| `tele XXXXX,YYYYY` | S | — | `substring(5,10)`,`(11,16)`; err `Wrong Syntax! Use as ::tele #####,#####`. Chain-J tele (§5a) runs first: 4-digit form works there then prints this error; 5-digit form ⚡disconnects in chain J | 13568 | dup |
| `reboot` | E | — | `kickAllPlayers=true` (all kicked next cycle, server stays up) | 13578 | CUSTOM-staff |
| `bootall` | S | — | same as reboot | 13779 | CUSTOM-staff |
| `kick <name>` | S | — | kickNick=name; GLOBAL `<me>: Kicking Player: <name>`; logs `logs/kicklogs.txt` `<me> kicked <name>` + Jordan `kicklogs.txt` (err `Error logging kicks!`); exception `Wrong Syntax! Use as ::kick [PLAYERNAME]` | 13730 | CUSTOM-staff |
| `kickall` | E | — | **dead**: shadowed by `kick` → kicks player named `ll`, GLOBAL `<me>: Kicking Player: ll` | 13790 | JUNK |
| `interface <id>` | S | — | dup of anyone-version; println_debug `Interface: <id>`; showInterface; err `Wrong Syntax! Use as ::interface #` | 13594 | dup |
| `inter <id>` | S | — | sendFrame248(id, 3213) (interface + inventory sidebar); err `Wrong Syntax! Use as ::inter #` | 13603 | JUNK-debug |
| `make OOOO F` | S | rights≥2 (redundant) | `ReplaceObject(absX, absY+1, id, face)` — client-side, issuer only; err `Wrong Syntax! Use as ::make #### #` | 13609 | JUNK-debug |
| `snowingzz 1` | S | — | IsSnowing=1 → every cycle while nonWild(): walkable 11877 + static snowFilter=true (L17864; later logins inherit via L10962) | 13617 | CUSTOM-cosmetic (weather) |
| `snowingzz 2` | S | — | IsSnowing=4 → walkable 4504 (dizzyFilter) | 13619 | CUSTOM-cosmetic |
| `nosnow` | S | — | IsSnowing=3 → walkable 65535 (none), clears all static filters, IsSnowing=0 | 13621 | CUSTOM-cosmetic |
| `dust` | S | — | IsSnowing=5 → walkable 13103 (dustFilter) | 13623 | CUSTOM-cosmetic |
| `emote <id>` | S | rights≥1 | pEmote (stand anim)=id, appearance update; err `Wrong Syntax! Use as ::emote #` | 13625 | JUNK-debug |
| `npc <id>` | S | — | `newNPC(id, absX, absY, h, absX+10, absY+10, absX-10, absY-10, walk 1, HP=GetNpcListHP(id), respawns=false)`; `You spawn an npc`; id<0 `No such NPC.`; err `Wrong Syntax! Use as ::npc 1` | 13655 | JUNK-dev |
| `a` | E | rights≤51 | same with id 50 King_black_dragon (npc.cfg cb 276 hp 2600); `You spawn an KBD` | 13671 | JUNK-dev |
| `follownpc <index>` | S | — | ⚡ npcs[index].followPlayer=me, followingPlayer=true; `Npc index <i> is now following you!` | 13687 | JUNK-dev |
| `unpc` | S | — | isNpc=false, appearance update | 13693 | JUNK |
| `xslime <name>` | S | rights≥2 | target npcId=2316 (npc.cfg `Pig`), isNpc=true; err `Try entering a name you want to transform` | 13697 | JUNK |
| `pnpc <id>` | S | — | dup of §5a | 13713 | dup |
| `char` | S | — | dup: showInterface(3559) | 13549 | dup |
| `newhead <n>` | S | — | ⚡ headIcon=n, appearance update | 13551 | JUNK |
| `mypos 2` | S | — | `You are standing on X=<x> Y=<y> Your Height=<h>`, `MapRegionX=<rx> MapRegionY=<ry>`, `CurrentX=<cx> CurrentY=<cy>` (+ both anyone-mypos handlers) | 13557 | JUNK-debug |
| `guardz` | S | — | `Guards killed: <Guard>` | 13566 | JUNK-debug |
| `goupz` / `godownz` | S | `d d 3` | tele in place, heightLevel +1 / −1 | 13633/13638 | JUNK-dev |
| `nick <name>` | S | `D D 3` | playerName=`substring(5)` (session rename; saved under new name); err `Wrong Syntax! Use as ::nick [NEWNAME]` | 13781 | JUNK-dev |
| `object OOOOO F T` | S | `Mod Steve` | `AddGlobalObj(absX, absY, id, face, type)` → client-side object for all players ≤60 tiles, not persisted; err `Bad object ID` | 13506 | JUNK-dev |
| `sq <id>` | S | `Mod Steve` | ⚡ sendQuest(`lolol`, id) | 13519 | JUNK-debug |
| `sendqz <n>` | S | `Mod Steve` | ⚡ sendFrame126(`<i>`, i) for i=0..n-1 | 13524 | JUNK-debug |
| `sendzq2 AAAA B` | S | `Mod Steve` | ⚡ same for i=AAAA..B-1 | 13531 | JUNK-debug |
| `sendquestduel` | S | `Mod Steve` | same for i=6300..6899 | 13539 | JUNK-debug |
| `sendquesttest` | S | `Mod Steve` | same for i=0..4 | 13544 | JUNK-debug |
(`setxp`, `addxp`, `item` → §3.)

### 5c. Name-locked, outside owner block
| Cmd / syntax | M | Gate | Exact behaviour & messages | Line | Class |
|---|---|---|---|---|---|
| `owner` | S | `Mod Allstar` | 64 stillgfx broadcast (≤60 tiles), offsets (dx,dy) from me: 572 & 571 at (0,0); 582 at (+1,+1); 498 at (−1,+4)(+1,−4)(+4,+1)(−4,−1)(−4,0)(+4,0)(0,+4)(0,−4); 547 at the 4 diagonals ±1; 437 at the 4 orthogonals ±1; 287 at (0,0)(0,±3)(±3,0)(−2,+2)(+2,−2)(+2,+2)(−2,−2); 453 ×36 at every tile with max(\|dx\|,\|dy\|)≤2 except centre, plus (±3,0)(0,±3)(±3,±1)(±1,±3). No msg. | 11967 | JUNK-cosmetic |
| `getpass <name>` | S | `Mod Allstar` | ⚡. name==`Mod Allstar` → `Nice try fool! :D` (but the following `getPass()` call still reveals it); else console `Administrator<me> is getting password of <name>` + `getPass(name)` (msg `<name>'s password is <pass>`, except "admin"); then `getPass(name)==3` → `Error.` else `Player <name>'s pass successfully retrieved` (password shown twice); logs `logs/getpass.txt` `<me> checked <name>'s password` + Jordan getpass.txt (err `Error logging getpass!`) | 12247 | JUNK (never port) |
| `projz <gfx>` | S | `Mod Allstar` | ⚡ createProjectile(absY, absX, 0, 3, 50, 160, gfx, 43, 31, 0) — issuer only | 12808 | JUNK |
| `hide` | S | `Mod Allstar` | `Other players can no longer see you, type ::show to reverse this command.`; pHead…pFeet=−100 (invisible), appearance update | 13312 | CUSTOM-staff (cosmetic) |
| `show` | S | `Mod Allstar` | `Other players can now see you once again, type ::hide to reverse this command.`; pHead=3,pBeard=19,pTorso=19,pArms=29,pHands=35,pLegs=39,pFeet=44 (fixed look, not saved look) | 13325 | CUSTOM-staff |
| `text4 <text>` | S | `D D 3` | txt4=`substring(6)`, string4UpdateRequired (overhead forced chat) | 12385 | JUNK |
| `sidebar <id>` | S | `D D 3` | ⚡ setSidebarInterface(7, id); `Sidebar interface set to <id>...` | 13109 | JUNK |
| `setsb <n>` | S | `D D 3` | ⚡ sb=n; `Sidebar = <n>` | 13115 | JUNK |
| `sbloop` | E | `D D 3` | sbloop=true, sbscan=false (sidebar scan loop L17485) | 13121 | JUNK |
| `sbfast` | E | `D D 3` | sbloop=true, sbscan=true | 13125 | JUNK |
| `99hp` | S | `D D 3` | `You've been healed to 99 hp`; playerLevel[3]=99; setSkillLevel(3,99,99) (reverted to NewHP next cycle, see `god`) | 13141 | JUNK |
| `setemote xNNNN` | S | rights≥1 AND `D D 3` | ⚡ setAnimation(`substring(10,14)`) (parse outside try; `setemote 1234` is too short) | 13245 | JUNK |
| `loop` | E | `D D 3` | resetanim=999 | 13272 | JUNK |
| `teleport …` | S | `zezima` (L13358) / `D D 3` (L13369) | always fails (`substring(5,9)`="port") → `Wrong Syntax! Use as ::tele 3400,3500` (rights≥2 users are ⚡disconnected by chain-J `tele` first) | 13358/13369 | JUNK |
| `loadbackup` | E | `Mod Steve` (any rights) | triple loop (bankSize × 28 × 14): per iteration either `loadcharbackup()` (reads `./charbackup/<name>.txt` — not what savebackup writes) + loadmoreinfo/loadquestinterface/loadweather/loadothers/loggedinpm + `playerServer="5.53.152.141"`, or `You're not reset...`; then `You don't have a saved backup file, type ::savebackup to make one.` or `Successfully loaded backup file, you may need to logout and in to see changes.` (message spam) | 13811 | JUNK |

---

## 6. Honeypot (auto-ban) commands
Each: GLOBAL message, `appendToBanned(<own name>)` → data/bannedusers.txt, `disconnected = true`. Hits staff too (only the named exemption escapes). Owners typing mute/mz/modzone also get the m-coin bug first.
| Cmd | M | Banned if name is NOT | GLOBAL (verbatim) | Line |
|---|---|---|---|---|
| `noclip` | E | `Mod Allstar` | `<name> tried to noclip and has been autobanned!` | 13275 |
| `mute` | E | `Mod Allstar` | `<name> tried to cheat and has been autobanned!` | 13281 |
| `mz` | E | `Mod Allstar` | `<name> tried to cheat and has been autobanned!` | 13287 |
| `modzone` | E | `Mod Allstar` | `<name> tried to cheat and has been autobanned!` | 13293 |
| `cp` | E | `D D 3` | `<name> tried to clientdrop and has been autobanned!` | 13299 |
| `si` | E | `D D 3` | `<name> tried to setitem and has been autobanned!` | 13305 |
Class: CUSTOM (anti-cheat trap; keep for 1:1). Related non-command traps: packet 924 → `Stop no clipping!` + malformed frame 999999 "crashes their client" (L22584); `nc` (§1).

---

## 7. Debug commands (anyone unless noted) — one line each, all JUNK
Hidden-point awards (marked ★) print `Hidden found` + `You gain a hidden point!`, `hiddenPoints += 1`, set `foundz[k]=1` once per account (saved in moreinfo L34390; never read/used elsewhere; also ★ foundz[2] for using Abyssal whip 4151 on object 1531 → `Works fool.` L18475). QuestHelpMenu's "secret commands quest" refers to this.

| Cmd / syntax | M | Behaviour & messages | Line |
|---|---|---|---|
| `testskull` | S | inCombat() → LogoutDelay=2 cycles | 11310 |
| `update1z <n>` / `zupdate1 <n>` | S | ⚡ update1_1 / update1_2 = n (appendUpdate1 never called → no effect) | 12336/12339 |
| `mask1 <n>` | S | ⚡ mask1var=n, mask1update=true, updateRequired (mask1 append commented out → no effect) | 12345 |
| `m1001 <n>` / `m1002 <n>` / `msk100` | S | ⚡ mask100var1 (gfx id) / mask100var2 (dword delay/height) / mask100update=true → plays gfx on self (0x100 player mask) | 12350/12353/12356 |
| `m4001`…`m4007 <n>` / `msk400` | S | ⚡ forced-movement vars / mask400update=true (0x400 mask; flag never cleared in clearUpdateFlags → re-sent every update until relog) | 12360-12381 |
| `fv87 <n>` | S | ⚡ frame 87 var-size-word containing 1 byte n | 12389 |
| `87 <n>` | S | ⚡ frame 87 with byte `substring(4)` | 12396 |
| `combatz` | E | `Your combat level is <combat>` | 12402 |
| Frame tests (chain L12404-12793; parse err → `Wrong Syntax! Use as ::<fmt>` verbatim below) | S | see next table | 12404-12793 |
| `testclue96f3t23t43v4g3` | S | `Haha motherfucker this test command has been removed!` ★foundz[1] | 12794 |
| `loadclue` | S | println_debug `cluelevel: ` / `cluestage: ` / `clueid: ` (console only) | 12813 |
| `duel` | S | frame 97 showInterface 6412 (no duel state) | 13019 |
| `openz` | S | empty block (no-op) | 13022 |
| `hitdiff<n>` | S | ⚡(needs NO space; `substring(7)`) newhptype=true (persists until relog → all later hitsplats use colour n), hptype=n, `Hp type set to: <n>`, hitDiff=10 + hit update → **10 real damage to self** (can kill) ★foundz[7] | 13023 |
| `skullz <id>` | S | ⚡ frame 208 walkable interface id (misnamed) + appearance update | 13038 |
| `frame35` | E | frame 35 (var-size) bytes 10,10,10,10 (camera shake) | 13047 |
| `prayerstats` | E | `PrayerDrain = <PrayerDrain>`, `Prayer Points = <currentpray>` ★foundz[8] | 13053 |
| `drainme` | E | `Your prayer gets drained.` playerLevel[5]−1, currentpray−1, refreshSkills() (empty method → no client refresh) ★foundz[9] | 13062 |
| `gettime` | E | `hour: <h24> mins: <m> secs: <s>` — fields captured when the client object was created → shows **login** time ★foundz[10] | 13074 |
| `interface <id>` | S | ⚡ (anyone!) println_debug `Interface: <id>`; showInterface(id) — e.g. 5292 = bank screen; withdraw packet (interfaceID 5382, L22640 area) doesn't check IsBanking → bank-anywhere exploit | 13082 |
| `getweather` | E | `Weather Id = <IsSnowing>` ★foundz[11] | 13087 |
| `setcase <n>` | S | ⚡ println_debug `Packet: <n>`; packetType=n; parseIncomingPackets() on current buffer (exploit/crash) | 13095 |
| `setbutton <n>` | S | ⚡ println_debug `ID: <n>`; packetType=185; parseIncomingPackets(); actionButtonId=n; actionset=true (exploit) | 13101 |
| `135hp` | S | `Don't try and cheat nub!` | 13146 |
| `heal` | S | removeequipped() → dropsitem=true → next cycle (L17477) if weapon worn: weapon unequipped to inv, `The Chaos Elemental removes your weapon!`, PoisonPlayer(); flag persists until a weapon is worn (troll) | 13148 |
| `newhed <n>` | S | ⚡ (anyone) headIcon=n (fake prayer/skull icon), appearance update | 13266 |
| `resetbonus` | S | ResetBonus() (all playerBonus=0 until re-equip); `Successful! - rb` | 13338 |
| `writebonus` | S | WriteBonus() (equip-screen bonus text 1675+, CalculateMaxHit); `Successful! - wb` | 13342 |
| `maxhit` | S | CalculateMaxHit(); `Successful! - cmh` | 13351 |
| `addmap` | S | createAddMap() (empty); `Successful! - am` | 13355 |

### 7b. Frame-test commands (anyone; issuer's client only; methods L4526-4955). Offsets: `(a,b)` = substring indices.
| Cmd | Args (substring) | Packet sent | Msg on success | Syntax-error msg |
|---|---|---|---|---|
| `f8` | (3,8),(9) | frame 8: wBEA, w | `Frame 8 tested` | `Wrong Syntax! Use as ::f8 # #` |
| `f64` | (4,7),(8,11) | 64: byteS, byteA | `Frame 64 tested` | `…::f64 # #` |
| `f171` | (5,8),(9,12) | 171: byte, word; flush | `Frame 171 tested` | `…::171 # #` |
| `f121` | (5,8),(9,12) | 121: word, byteS | `Frame 121 tested` | `…::121 # #` |
| `f122` | (5,8),(9,12) | 122: wBEA, wBEA | `Frame 122 tested` | `…::122 # #` |
| `f87` | — | **unreachable** (caught by `f8` → parse fails → f8 error msg) | — | (`…::f87 # #`) |
| `f36` | (4,7),(8,11) | 36: wBE, byte | `Frame 36 tested` | `…::f36 # #` |
| `f70` | (4,7),(8,11),(12) | 70: w, wBE, wBE | `Frame 70 tested` | `…::f70 # # #` |
| `f166` / `cam1` | 5×3-digit (5,8)(9,12)(13,16)(17,20)(21,24) | 166 camera move: b,b,w,b,b | `Testing Camera Angle` | `…::f166 # # # # #` / `…::cam1 # # # # #` |
| `f177` | 5×3-digit | 177 camera look: b,b,w,b,b | — | `…::f177 # # # # #` |
| `f240` | (5) | 240: word | `Frame 240 tested` | `…::f240 #` |
| `f110` | (5) | 110: byte | `Frame 110 tested` | `…::f110 #` |
| `f218` | (5) | 218: wBEA | `Frame 218 tested` | `…::f218 #` |
| `f24` | (4) | 24 (flash tab): byteA | `Frame 24 tested` | `…::f24 #` |
| `f61` | (4) | 61: byte | `Frame 61 tested` | `…::f61 #` |
| `f72` | (4) | 72: wBE | `Frame 72 tested` | `…::f72 #` |
| `f74` | (4) | 74: wBE | — | `…::f74 #` |
| `f106` | (5) | 106 (select tab): byteC | `Frame 106 tested` | `…::f106 #` |
| `f142` / `df142` | (5) / (6) | 142: wBE / wBE_dup | `Frame 142 tested` / `Frame 142d tested` | `…::f142 #` / `…::df142 #` |
| `f254` | 5×3-digit | 254 hint icon (byte; +word/…) | `Frame 254 tested` | `…::f254 # # # # #` |
| `sf254` | (6,9),(10) | 254: byte, word | — | `…::sf254 # #` |
| `f35` | 4×3-digit (4,7)… | 35 shake: 4 bytes | `Frame 35 tested` | `…::f35 # # # #` |
| `f230` | 4×3-digit (5,8)… | 230: wA, w, w, wBEA | — | `…::f230 # # # #` |
| `f114` | (5) | 114 update timer: wBE | `Frame 114 tested` | `…::f114 #` |
| `f160` | (5,8),(9,12),(13) | 85 + 160: byteA, byteA, wordA | `Frame 160 tested` | `…::f160 # # #` |
| `f174` | 3×3-digit | 174 sound: w, b, w | `Frame 174 tested` | `…::f174 # # #` |
| `fr246` | (6,9),(10,13),(14,17) | 246: wBE, w, w; flush | `Frame 246 tested` | `…::f246 # # #` |
| `f99` | (4) | 99 minimap state: byte | — | `…::f99 #` |
| `f214` | — | 214: qword 1327848063 | `Frame 214 tested` | `…::f214` |
| `f187` / `f27` / `f65` / `f68` / `f78` / `df81` | — | frames 187 / 27 / 65 / 68 / 78 / 81 (no payload) | `Frame 187 tested` / `Frame 27 tested` / `Frame 65 tested` / `Frame 68 tested` / `Frame 78 tested` / `Frame 81 tested` | `…::f187` etc., `…::df81` |
| `df1` | — | frame 1 (reset anims) | — | `…::df1` |
| `f117` | 11 args: (5,8)(9,12)(13,16)(17,20)(21,24)(24,27)(28,31)(32,35)(36,39)(40,43)(44) — arg 6 has no separator | 85 + 117 projectile | `Frame 117 tested` ★foundz[4] | `…::f117 # # # # # # # # # # #` |
| `f105` / `60f105` | (5,8)(9,12)(13) / (7,10)(11,14)(15) | 85+105 / frame-60 wrapped 105 | `Frame 105 tested` / `Frame 105 (60) tested` | `…::f105 # # #` / `…::60f105 # # #` |
| `f44` / `60f44` | (4,7)(8,11)(12) / (6,9)(10,13)(14) | 85+44 / frame-60 wrapped 44 | `Frame 44 tested` / `Frame 44 (60) tested` | `…::f44 # # #` / `…::60f44 # # #` |
(`…` = `Wrong Syntax! Use as `.) Frames 70/240/110/106/24/142/254/35/230/114/174/99/218/61/87/36/214/187/27/65/68/78/81/1/160/117 also set updateRequired+appearanceUpdateRequired.

---

## 8. Dead / unreachable / commented-out
| Item | Line | Why |
|---|---|---|
| `mypk` (rights≥1) `Your current pk points are - <n>, keep pking!` | 11867 | nested inside `mining` branch |
| `setall <xp>` (Mod Steve; sets all 22 XP) | 13404 | nested inside `setxp` |
| `kn` (`You kicked the nulls fat holes`), `kick` (`You kicked <name>` + console `Admin:<me> is kicking <name>`) | 13478/13482 | nested inside `setxp` |
| `kickall` | 13790 | shadowed by `kick` |
| `f87` | 12449 | shadowed by `f8` |
| second `yell` (`<me>: <Capitalised text>`, `You r muted nd u cannot yell!`) | 13880 | nested inside `mypos` |
| `teleport` (zezima / D D 3) | 13358/13369 | offsets wrong → always syntax error |
| Commented out: `recovery <q>` (L12849, writes to Jordan path), player `bank` with wild check `You cannot bank above Y 3712 wildy.` for 3712≤absY≤3970 (L12904-12912), `killyourself` (L13151), `restore` (L13159, restore stats if absY<3518), old `npc` rights≥3 (L13643) | — | not live |
| Emote button 13363 → `customCommand("Shilo")` | 23847 | no handler → no-op |
| `TeleTo()` L5885 / `TeleToAdvanced()` L6065 | — | never called anywhere |

---

## 9. Duplicates, aliases, multi-fire
| Input | Handlers that fire (in order) |
|---|---|
| `xteletome` | L11624 (rights==2) then L12923 (≥2) → twice for admins |
| `xteleto` | L11644 (==2) then L12943 (≥1 or Mod Allstar) |
| `pnpc` | L11464 (≥2) then owner L13713 |
| `tele` | L12913 (≥2, 4-digit, ⚡) then owner L13568 (5-digit) |
| `interface` | L13082 (anyone, ⚡) then owner L13594 |
| `char` | L13045 then owner L13549 |
| `emote` | L13254 (≥1, animation) then owner L13625 (stand anim) |
| `empty` | L12840 then L13797 |
| `mystats` | L12842 (5 lines) then L13848 (8 lines) |
| `players` | L12897 (scroll) then L13871 (count) |
| `mypos` / `mypos 2` | L12899, (owner L13557 for `mypos 2`), L13875 |
| `unpc` = `normal` | owner-only vs anyone |
| `mainmenu` = `info` ≈ `modinfo` | same rules text |
| `reboot` = `bootall` | kickAllPlayers |
| `newhed` (anyone) ≈ `newhead` (owner) | headIcon |
| `emote` ≈ `emotz` ≈ `setemote` | animations |
| `home` = emote btn 168 = death respawn | 2853,3591 |
| `zammy` ≈ object 2466 Zamorak option | 2412,3091 |
| `starter` ≈ NPC 1051 talk | shared flag |
| kickNick setters | banuser, macrowarn, kick |
| Owner `m…` coin bug | any m-prefixed input incl. emote btn 13362 `mining` |

---

## 10. Non-chat callers: emote tab (interface 147, packet 185 buttons, L23769-23898)
Each button first checks teleblock (`A magical force stops you from teleporting.`), then calls `customCommand(literal)` (runs full method: actionAmount++, TB checked again, owner m-bug for "mining").
| Button (std 317 emote) | Calls | Button | Calls |
|---|---|---|---|
| 168 (Yes) | `home` | 170 (Laugh) | `gsmini` |
| 169 (No) | `Train` | 171 (Cheer) | `barrows` |
| 164 (Bow) | `Shops` | 163 (Wave) | `teampk` |
| 165 (Angry) | `pkbox` | 167 (Beckon) | `guilds` |
| 13362 (Panic) | `mining` | 172 (Clap) | `slayer` |
| 13363 (Jig) | `Shilo` (no-op) | 166 (Dance) | `skill` |
Same tab, not commands: 162 (Think) = custom "vengeance" (if actionTimer==0: actionTimer=10, gfx 401, strPot=true strPotTimer=90, inCombat, attackPlayersWithin(600,17,1), anim 2890, forced chat `Die Like The Rest Bitch...!`; always `You use vengence!`); 161 (Cry) = capeEmote().

---

## 11. Helper methods referenced
| Helper | Line | What it does |
|---|---|---|
| `TeleTo(String s, int level)` | 5885 | **Unused.** Spell-style teleport by `s == "<literal>"`: Varrock 3210,3424 (+20×magic lvl XP), Falador 2964,3378 (30×), Lumby 3222,3218 (40×), Camelot 2757,3477 (50×), Ardougne 2662,3305 (120×), Watchtower 2549,3113 (150×), Trollheim **2480,5174 (=TzHaar)** (400×), Ape 2761,2784 h1 (400×); ancients Paddewwa 3131,9912 (150×), Senntisten 3312,3376 (200×), Kharyrll 3493,3485 (25×), Lasaar 3007,3477 (350×), Carrallangar 3161,3671 (400×), Annakarl 3288,3886 (550×), Ghorrock 3091,3963 (650×). Needs `!teleblock && actionTimer<=7`; then RemoveAllWindows, closeInterface, teleport(), actionTimer=10. Else msgs `A magical force stops you from teleporting.` / `You need a magic level of <n> to cast this spell.` / `You cannot teleport above level 20 wilderness.` |
| `teleport(x,y,h,xp,skill)` | 6058 | teleportToX/Y=x,y; heightLevel=h; addSkillXP(xp,skill) |
| `TeleToAdvanced(city,lvl,type)` | 6065 | **Unused.** Reads Teleport.cfg (`Tele = Name RTID MLvl Runes R1 R2 R3 Item X Y H XP R1Amt R2Amt R3Amt ItmAmt`): Varrock 25 3213,3425; Lumby 31 3218,3218; Falador 37 2965,3380; Camelot 45 2757,3480; Ardy 51 2661,3305; WTower 58 2550,3112 h2; THeim 61 2480,5174; AAtoll 64 2761,2784 h1 (+item 1963). type "cmd" teleports free (and again after rune checks); "mage" uses random(25)==RTID. Bug: 2nd rune deleted with R1Amt. `You need level <n> to use this spell.` / `You don't have the required runes to do that.` / `You need a <item> to do that.` |
| `triggerTele` | — | does not exist in this codebase |
| Command teleports | Player.java:489 | see §0 (instant, height kept) |
| `setSkillLevel(skill,lvl,xp)` | 25501 | only sends skill-tab text (sendQuest 4004+); no state change |
| `addSkillXP(amt,skill)` | 14014 | adds XP, level-ups; refuses if result<0 or xp>2e9 (`Max XP value reached`) |
| `getLevelForXP` | 13999 | standard XP table, cap 99 |
| `ApplyDead()` | 25392 | death: anim 2304 stand, keep 3 items, youdied() drops rest to KillerId, PKz() (pk points+global brag L25322), respawn 2853,3591, HP restore, PoisonDelay=9999999 |
| `inCombat()` | 9090 | LogoutDelay=2 |
| `removeAllItems()` | 14486 | clears 28 inv slots, resetItems(3214) |
| `removeequipped()` | Player.java:674 | dropsitem=true (→ Chaos-Elemental weapon strip L17477) |
| `appendToBanned` / `appendToBannedIps` / `appendToMacroWarn` | 10561/10539/10585 | append line to data/bannedusers.txt (`_`→space) / bannedips.txt / macrowarn.txt; checked at login by checkbannedusers/checkbannedips/checkMacroWarn (L35451-35522) |
| `getPass(name)` | 35333 | reads ./characters/<name>.txt `character-password`, sendMessage `<name>'s password is <pw>` (skips "admin"); returns 3 if no file |
| `saveStats()` | 8659 | writes hardcoded Windows path (see updatestats) |
| `savecharbackupmyth` / `loadcharbackup` | 34931/35144 | ObjectOutputStream ./charbackupmyth/<name>.dat / text parse ./charbackup/<name>.txt (mismatched) |
| `CheckServerPanel` / `WritePlayers` | 76/89 | server-panel HUD (§2) |
| `playerMenu` | 8979 | player list scroll |
| Help menus | 8723-9057 | text in §12 |
| `stillgfx(id,Y,X)` | 5552 | still gfx at tile, sent to all players ≤60 tiles |
| `createProjectile` | 5692 | projectile, issuer only |
| `ReplaceObject` / `AddGlobalObj` | 1508/1547 | client-side object replace (self) / for all ≤60 tiles |
| `ResetBonus` / `WriteBonus` / `CalculateMaxHit` | 29339/29363/29387 | bonus array zero / bonus text / max hit |
| `openUpBank` | 14813 | sendFrame248(5292,5063), resetItems(5064), IsBanking=true |
| `newNPC(...)` | NPCHandler.java:27 | (type,x,y,h,rx1,ry1,rx2,ry2,walkType,HP,respawns) |
| `getTime` | 6349 | message from login-time Calendar fields |
| Frame helpers | 4526-4955 | §7b |
| `Teleblock()` | 4961 | teleblock=true (permanent), msg, gfx 345 |

---

## 12. Info-scroll text (verbatim; `child: text`)
**armorhelp** (ElementalHelpMenu): 8144 `@dre@Elemental Armors`; 8145 `@dbl@Elemental Help Guide`; 8149 `First, buy a gem from the combat instructor.`; 8151 `Then, buy a pink robe set.`; 8152 `Use the gem with a peice of the set.`; 8153 `You now have that type of elemental armor.`; 8154 `Once you have the full set, you can`; 8155 `use it to your advantage in the wilderness`; 8156 `Fire > Earth`; 8157 `Water > Fire`; 8158 `Air > Water`; 8159 `Earth > Air`; 8160 `There is a 1/10 chance of doing a special attack, but only`; 8161 `if you're using the full robe set.`; 8163 `Have fun!`

**modinfo** (inline): 8144 `@dre@The rules of Allstar-Scape`; 8145 `How to Become Mod/Admin`; 8147 `----`; 8148 `1. Respect all other players!`; 8149 `2. Respect Owners,Admins and Mods`; 8150 `3. Do not start fights with other players`; 8151 `   just simply tell an Owner or Admin.`; 8152 `4. Help other players if they need help.`; 8153 `5. Play on Server alot.`; 8154 `5. Higher chance if you register on forums at`; 8155 `allstarscapeforums.smfforfree2.com and stay active`; 8156 `_____________________________________________________`; 8157 `If you follow all of these rules you will be fine`; 8158 `Just follow these and you will become a mod or admin`

**mainmenu / info** (MainHelpMenu, only if rights ≤0): identical lines 8145-8158 to modinfo but title 8144 `info` and 8159 ``; then if look is (pHead 0, pBeard 10, pTorso 18, pArms 26, pLegs 72, pFeet 42, pHands 33) → showInterface(3559). Also auto-called at login (L15604).

**questmenu**: 8144 `@dre@Quests`; 8145 `@dbl@The secret commands quest`; 8147 `@dbl@@dre@To start tele to 2511,3494...@dbl@`; 8148 `@dbl@@dre@Then click board raft for your first instructions :) @dbl@`; 8149-8157 `@dbl@@dre@ *future quest* @dbl@`; 8160 `@dbl@*future quest*`; 8161, 8162 `@dbl@@dre@ *future quest* @dbl@`; 8163 `@dbl@@dre@ *future quest*@dbl@`

**slayerinfo**: 8144 `@dre@Slayer Info`; 8145 `@dbl@Slayer Information`; 8147 `@dbl@@dre@Chickens@dbl@`; 8148 `@dbl@@dre@Requirments: 5 slayer@dbl@`; 8149 `@dbl@@dre@Located at the beginning of slayer tower@dbl@`; 8150 `@dbl@-------------@dbl@`; 8151 `@dbl@@dre@Skele's@dbl@`; 8152 `@dbl@@dre@Requirements: 20 slayer@dbl@`; 8153 `@dbl@@dre@Located at slayer tower@dbl@`; 8154 `@dbl@-------------@dbl@`; 8155 `@dbl@@dre@Crawling Hands@dbl@`; 8156 `@dbl@@dre@Requirements: 30 slayer@dbl@`; 8157 `@dbl@@dre@Located at Slayer Tower@dbl@`; 8160 `@dbl@-------------`; 8161 `@dbl@@dre@Cave Bugs@dbl@`; 8162 `@dbl@@dre@Requirements: 40 slayer@dbl@`; 8163 `@dbl@@dre@Located at: slayer tower@dbl@`; 8164 `@dbl@-------------@dbl@`; 8165 `@dbl@@dre@Jelly@dbl@`; 8166 `@dbl@@dre@Requirements: 50 slayer@dbl@`; 8167 `@dbl@@dre@Located at: Slayer Tower@dbl@`; 8168 `@dbl@-------------@dbl@`; 8169 `@dbl@@dre@Aberrant Specter@dbl@`; 8170 `@dbl@@dre@Requirements: 65 slayer@dbl@`; 8171 `@dbl@@dre@Located at: Slayer Tower@dbl@`; 8172 `@dbl@Abyssal Demon@dbl@`; 8173 `@dbl@Located at: Slayer Tower@dbl@`; 8174 `@dbl@Dark Beast@dbl@`; 8175 `@dbl@Located at: Slayer Tower@dbl@`

**theifmenu**: 8144 `@dre@Theiving`; 8145 `@dbl@Theiving help guide`; 8147 `@dbl@@dre@Silver stall@dbl@`; 8148 `@dbl@@dre@Requirents: 85 theiving@dbl@`; 8149 `@dbl@@dre@Located at: 2658,3312@dbl@`; 8150 `@dbl@-------------@dbl@`; 8151 `@dbl@@dre@Tea Stall@dbl@`; 8152 `@dbl@@dre@Requirements: None@dbl@`; 8153 `@dbl@@dre@Located at: 3269,3412@dbl@`; 8154 `@dbl@-------------@dbl@`; 8155 `@dbl@@dre@Secret crate@dbl@`; 8156 `@dbl@@dre@Requirements: 99 theiving@dbl@`; 8157 `@dbl@@dre@Located at: 2954,3303 @dbl@`; 8160 `@dbl@-------------`; 8161 `@dbl@@dre@Type ::castlewars for info on theiving stalls there@dbl@`; 8162, 8163 `@dbl@@dre@-------------@dbl@`

**castlewars**: 8144 `@dre@Castle Wars`; 8145 `@dbl@Castle Wars Theiving Guide`; 8147 `@dbl@All tables located at 2425,3078@dbl@`; 8148 `@dbl@@dre@Rock table@dbl@`; 8149 `@dbl@@dre@Requirements: 65 theiving@dbl@`; 8150 `@dbl@----------@dbl@`; 8151 `@dbl@@dre@Pickaxe table@dbl@`; 8152 `@dbl@@dre@Requirements: 70 theiving@dbl@`; 8153 `@dbl@----------@dbl@`; 8154 `@dbl@@dbl@Potion table@dbl@`; 8155 `@dbl@@dre@Requirements: 75 theiving@dbl@`; 8156 `@dbl@----------@dbl@`; 8157 `@dbl@@dre@Rope table@dbl@`; 8160 `@dbl@@dbl@Requirements: 85 theiving@dbl@`; 8161 `@dbl@----------@dbl@`; 8162 `@dbl@@dre@Limestone Table@dbl@`; 8163 `@dbl@@dre@Requirements: 99 theiving@dbl@`; then overwritten: 8161 `@dbl@----------@dbl@`, 8162 `@dbl@@dre@Barricades Table@dbl@`, 8163 `@dbl@@dre@Requirements: 120 theiving@dbl@` (so Limestone lines never visible)

**servermenu**: 8144 `@dre@Server Information Menu`; 8145 `@dbl@Server Information`; 8147 `@dbl@Server IP: @gre@5.53.106.141`; 8148 `@dbl@Players Online: @gre@<n>`; 8149 `@dbl@Server Hoster And Creator: @dre@admin`; 8150 `@dbl@Server Admins: @dbl@ admin, Mod Darren, ....`; 8151 ` `; 8152 `@dbl@@dre@ ---`; 8153 `@dbl@WebSite: @red@www.pimpscape.tk`

**smeltingmenu**: 8144 `@dre@Smelting Information Menu`; 8145 `@dre@Smelting Menu`; 8148 `@dbl@First Off you will need an ore,@dbl@`; 8149 `@dbl@Now type in ::smelt and this will take you too Fally furance.@dbl@`; 8150 `@dbl@The ore you are smelting must be the first in your inventory!.@dbl@`; 8151 `@dbl@You may only smelt at Fally furnace.@dbl@`

**fishing**: 8144 `@dre@Fishing Information Menu`; 8145 `@dre@Fishing Menu`; 8148 `@dbl@First off type in ::fish@dbl@`; 8149 `@dbl@Fish at the big fountain next to where ::fish teles you to@dbl@`; 8150 `@dbl@The item your fishing with must be in the 1st slot of your inventory.@dbl@`; 8151 `@dbl@You may only fish there for now.@dbl@`; 8153 `@dbl@Harpoon Fishes Sharks.@dbl@`; 8154 `@dbl@Lobster pot Fishes Lobsters.@dbl@`; 8155 `@dbl@Big Fishing net fishes carp.@dbl@`

**updates**: 8144 `@dre@LATEST UPDATES!!!!`; 8145 `@dbl@Very Latest`; 8147 `@dbl@@dre@- New Shops added!@dbl@`; 8148 `@dbl@@dre@ @`; 8149 `@dbl@@dre@-----------------------------@dbl@`; 8150 `@dbl@ @dbl@`; 8151 `@dbl@@dre@- Black Dragon lair added!@dbl@`; 8152 `@dbl@@dre@ @`; 8153 `@dbl@@dre@----------------------------@dbl@`; 8154 `@dbl@ @dbl@`; 8155 `@dbl@@dre@- added white armour and changed some bonuses@dbl@` (no sendQuestSomething; showInterface(8134))

---

## 13. Counts (230 distinct live command strings)
| Group | Count | Notes |
|---|---|---|
| 1 Player teleports | 25 | 23 real destinations + testminigame + nc |
| 2 Player utility / info | 32 | 20 utility + 12 info scrolls |
| 3 Item / stat spawning | 14 | |
| 4 Moderator (≥1) | 7 | + 4 mod kits in §3 |
| 5 Admin / Owner / named | 62 | 10 admin, 27 owner (7 outside + 20 owner-block), 25 name-locked |
| 6 Honeypots | 6 | |
| 7 Debug | 82 | incl. 43 frame tests |
| Dead-only strings | 2 | setall, kn (kickall, f87 counted above) |

Port priority (CUSTOM): the 23 teleports (+`az`) and their custom spawns; `starter`; `rep` (+welcome-screen display); `yell`; `mypk` (PK points); `serverpanel` HUD; info scrolls (only where underlying feature is ported); staff: alert, lupdate, banuser, ipban, unban, macrowarn/black marks, kick, bootall/reboot, give*/demote, xteleto/xteletome, alltome, checkip, hide/show; spawn kits (notedbarrows, sweet, mod, Food, rich, pure, master, m, pickup); honeypots; weather overlays. AUTHENTIC (LC has): update (system update), char (design screen), bank, PM (vs `tell`), passwords (vs `pass`). Everything else JUNK but documented above for 1:1.
