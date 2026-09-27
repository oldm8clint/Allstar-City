# Allstar-City porting tracker

Goal: a 1:1 recreation of Allstar-Scape v2 (2008, Moparscape/317) on the Lost City
engine, with the revision 377 (May 2006) game data, played in a web browser. The original Java
source in `allstar/legacy` is the specification: every behavior there is reproduced, and Lost City
gameplay that Allstar-Scape did not have is removed.

## Layout

| Path | What |
| --- | --- |
| `engine/` | Lost City Engine-TS `289` (git subtree) + 377 data support + Allstar-City engine changes |
| `content/` | Lost City Content `377-wip` (git subtree) + Allstar-City content |
| `content/scripts/allstar/` | Allstar-Scape gameplay in RuneScript |
| `webclient/` | Lost City Client-TS `289` web client (git subtree) + 377 support; built into `engine/public/client` |
| `allstar/legacy/` | Original Allstar-Scape v2 source (logs and player data removed) |
| `allstar/tools/generate.mjs` | Regenerates data-driven content (spawns, shops, drops, ...) from `allstar/legacy` |
| `allstar/generated/` | Generator output bookkeeping (map edit manifest, report) |

## Engine changes

| Change | Why |
| --- | --- |
| `NODE_TICKRATE` env (default 600) | Allstar-Scape ran 500ms cycles (`server.java` `cycleTime = 500`) |
| `::<name>` runs `[proc,cmd_<name>]` for every player | Allstar-Scape commands were available to players; each script checks rank |
| `NODE_ALLSTAR_XP`, Allstar script commands, ban lists | see `CONTRIBUTING.md` |
| `engine/.env` overrides `data/config/world.json` on every start | each checkout keeps its ports in `.env` |

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

## Systems

Status: `todo` / `wip` / `done` / `n/a`.

| System | Legacy source | Status | Notes |
| --- | --- | --- | --- |
| NPC spawns | `autospawn.cfg`, `NPCHandler.loadAutoSpawn` | done | all Lost City spawns removed; 486 placed, 6 were off-map in the original too |
| Ground item spawns | `itemspawnpoints.java` | done | god capes; `drops.cfg` was never loaded by Allstar-Scape |
| Custom objects | `client.NewObjects`, `WorldObjects.cfg` | todo | |
| Doors | `Config/objects.cfg`, `data/Objects.cfg` | todo | |
| Login / new players | `client.initialize`, `Player.java` | todo | |
| Commands | `client.customCommand` | todo | |
| Shops | `shops.cfg`, `ShopHandler.java` | todo | |
| NPC clicks / dialogues | `client.parseIncomingPackets`, `UpdateNPCChat` | todo | |
| NPC combat, drops, respawn | `NPCHandler.java`, `npcdrops.cfg` | todo | |
| Player combat, specials, prayer | `client.Attack*`, `calculateSpecial` | todo | |
| Magic (spells, teleports) | `client.AttackMage`, `Teleport.cfg`, button handler | todo | |
| Emote-tab teleports | button handler | todo | |
| Skills | `client.*` skill methods | todo | |
| Items (eat, drink, bury, ...) | packet handlers | todo | |
| Custom items (id >= 7956) | `item.cfg` | todo | need models from later caches |
| Clue scrolls, quests | `Clues.java`, `client.quest/clue` | todo | |
| Minigames | | todo | |
| Remove Lost City-only gameplay | | todo | quests, tutorial, random events, etc. |

## Known deviations from Allstar-Scape

Things that cannot be (or are not yet) identical; reviewed with the owner after major progress.

- The client is Lost City's web client with the 377 game data, not Allstar-Scape's custom 317
  client, so interfaces look like May 2006 RuneScape.
- 377 client features the web client does not have yet (no Allstar content uses them): full-screen
  interfaces (`if_openfull` opens a normal main interface), the 377 welcome screen (client codes
  660-668), clickable tutorial chat interfaces, the name input dialog, instanced map regions, and
  some low-memory rendering details.
- The world map for the map editor is not built (the 377 content has no worldmap fonts).
- 6 autospawn.cfg spawns sit outside the game map (e.g. `2000,3468`); they were unreachable in
  Allstar-Scape too and are skipped.
