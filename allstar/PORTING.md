# Allstar-City porting tracker

Goal: a 1:1 recreation of Allstar-Scape v2 (2008, Moparscape/317) on the Lost City
engine (revision 377, May 2006 cache). The original Java source in `allstar/legacy` is the
specification: every behavior there is reproduced, and Lost City gameplay that Allstar-Scape
did not have is removed.

## Layout

| Path | What |
| --- | --- |
| `engine/` | Lost City Engine-TS `377-wip` (git subtree) + Allstar-City engine changes |
| `content/` | Lost City Content `377-wip` (git subtree) + Allstar-City content |
| `content/scripts/allstar/` | Allstar-Scape gameplay in RuneScript |
| `client/` | Lost City Client-Java `377` (git subtree) |
| `allstar/legacy/` | Original Allstar-Scape v2 source (logs and player data removed) |
| `allstar/tools/generate.mjs` | Regenerates data-driven content (spawns, shops, drops, ...) from `allstar/legacy` |
| `allstar/generated/` | Generator output bookkeeping (map edit manifest, report) |

## Engine changes

| Change | Why |
| --- | --- |
| `NODE_TICKRATE` env (default 600) | Allstar-Scape ran 500ms cycles (`server.java` `cycleTime = 500`) |
| `::<name>` runs `[proc,cmd_<name>]` for every player | Allstar-Scape commands were available to players; each script checks rank |

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

- The client is the Lost City 377 Java client, not Allstar-Scape's custom 317 client, so
  interfaces look like May 2006 RuneScape.
- 6 autospawn.cfg spawns sit outside the game map (e.g. `2000,3468`); they were unreachable in
  Allstar-Scape too and are skipped.
