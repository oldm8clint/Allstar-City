# Allstar-City porting tracker

Goal: a 1:1 recreation of Allstar-Scape v2 (2008, Moparscape/317) on the Lost City engine, with
the revision 377 (May 2006) game data, played in a web browser. The original Java source in
`allstar/legacy` is the specification (`allstar/spec` explains it): every behaviour there is
reproduced, and Lost City gameplay that Allstar-Scape did not have is removed.
How to contribute: `allstar/CONTRIBUTING.md`. Owner-requested extras: `allstar/QUIRKS.md`.

## Layout

| Path | What |
| --- | --- |
| `engine/` | Lost City Engine-TS `289` (git subtree) + 377 data support + Allstar-City engine changes |
| `content/` | Lost City Content `377-wip` (git subtree) + Allstar-City content |
| `content/scripts/allstar/` | Allstar-Scape gameplay in RuneScript |
| `webclient/` | Lost City Client-TS `289` web client (git subtree) + 377 support; built into `engine/public/client` |
| `allstar/legacy/` | Original Allstar-Scape v2 source (logs and player data removed) |
| `allstar/spec/` | Behaviour inventory of the original source (commands, NPC/item handlers, objects/buttons, dialogues/quests, NPCs/combat/rules, items) |
| `allstar/tools/` | `generate.mjs` (+ `gen/` steps), `lookup.mjs`, `build-client.mjs` |
| `allstar/tests/` | Headless test bot and tests |

## Engine changes

| Change | Why |
| --- | --- |
| `NODE_TICKRATE` (default 600) | Allstar-Scape ran 500ms cycles |
| `NODE_ALLSTAR_XP` | Allstar-Scape xp: whole xp (2B cap), half curve (99 at 6,517,817), strict thresholds |
| `::input` → `[proc,cmd__input]`, `::name` → `[proc,cmd_name]` for every player | Allstar-Scape commands were open to all players; scripts check rank |
| Script commands `findname`, `playerall`, `world_broadcast`, `setstaffmodlevel`, `p_kick`, `ipaddress`, `namelist_*`, `allstar_log`, `world_reboot` | commands, broadcasts, bans and logs |
| Login refused for names/IPs in `data/allstar/bannedusers.txt` / `bannedips.txt` | `::banuser`, `::ipban` |
| Build snapshot race fix | incremental builds sometimes missed new configs |
| `engine/.env` overrides `data/config/world.json` on every start | each checkout keeps its ports in `.env` |
| The web socket takes the player address from `CF-Connecting-IP` / `X-Forwarded-For` on loopback connections; management, setup, login, friend and logger servers listen on 127.0.0.1 | hosting behind a tunnel (`allstar/HOSTING.md`) |

## Platform: 377 content on the 289 web stack

The game data is Lost City's 377 content; the engine and web client are Lost City's revision 289
ones (the newest with a browser client), extended where 377 data or 377 client behaviour needs it:

| Area | 289 | Allstar-City |
| --- | --- | --- |
| Packers | 289 config/interface/media formats | 377 formats: flo `mapcolour`, loc `ldmodel` and varp `multivar`, npc `multivar`/`multinpc`/`active`, interface type 8, slayer/farming stats, one media sprite per png |
| Models, anims, maps, textures, midi, sounds | same file formats as 377 | unchanged |
| Protocol | 289 | 289 plus: npc types in 13 bits (not 11), 16 player head icon bits (not 8), `IF_SETANGLE`, `IF_SETROTATION`, `IF_OPENFULL` (opcodes 186, 3, 5), report abuse reason 12 |
| Script commands | 289 | plus 377's `if_setangle`, `if_setrotation`, `if_openfull`, `npc_telejump` |
| Web client | Client-TS 289 | 377 config decoding and client behaviour ported from Client-Java 377 (see the `Allstar-City:` comments in `webclient/src`) |

Player head icon bits (`headicons_set`): 0 skull, 1 multiway, 2 hint, 3 protect from melee,
4 protect from missiles, 5 protect from magic, 6 duel skull, 7 hint 2, 8 retribution, 9 smite,
10 redemption. Npc `headicon=` indexes the 377 prayer icons.

## Workstreams

Each runs in its own git worktree (`D:\Desktop\Allstar-City.worktrees\<name>`, branch `port/<name>`).

| Workstream | Scope | Status |
| --- | --- | --- |
| lead (main) | world spawns, login/new player, command framework, XP, engine commands, generator, test bot | done |
| shops | every shop, Allstar pricing and sell rules, shop-opening NPC options | merged |
| npcs | NPC clicks, 71 dialogues, banks, pickpocketing, quests, clue scrolls | in progress |
| objects | 509 placed / 67 removed objects, object clicks (coin trees, stalls, chests, stairs, doors...), item-on-object | merged |
| items | item data from item.cfg, equipment rules, food/potions/bones, item-on-item, bank, trade | merged |
| combat | NPC system (HP, max hit, respawn, aggression), drops, player combat, specials, prayers, death, PvP zones, magic | in progress |
| ui | remaining commands, emote-tab teleports, level-ups, 99 broadcasts, tabs/texts | merged |
| customitems | items with ids >= 7956: 154 objs `allstar_item_<id>` (obj id = Allstar id), enum `allstar_items`, models converted from the OSRS cache by `allstar/tools/models` (can also read a 317 client cache); stand-ins: Summoning cape/(t)/hood, 9540, 14819, 15181 | merged |
| platform | 377 content on the 289 engine + Lost City web client | in progress |
| lead (after merge) | QUIRKS dupes, remove leftover Lost City gameplay, hosting setup, docs | todo |

## Known deviations from Allstar-Scape

Reviewed with the owner after major progress.

- The client is Lost City's web client with the 377 game data, not Allstar-Scape's custom 317
  client, so interfaces look like May 2006 RuneScape.
- 377 client features the web client does not have yet (no Allstar content uses them): full-screen
  interfaces (`if_openfull` opens a normal main interface), the 377 welcome screen (client codes
  660-668), clickable tutorial chat interfaces, the name input dialog, instanced map regions, and
  some low-memory rendering details.
- The world map for the map editor is not built (the 377 content has no worldmap fonts).
- 6 autospawn.cfg spawns sit outside the game map (e.g. `2000,3468`); they were unreachable in
  Allstar-Scape too and are skipped.
- The welcome interface (317 interface 15944) is shown on the 377 text scroll for now.
- Lost City's staff commands (`::tele`, `::give`, ...) still exist for staff; Allstar commands of
  the same name take precedence.
