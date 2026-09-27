# Allstar-City porting tracker

Goal: a 1:1 recreation of Allstar-Scape v2 (2008, Moparscape/317) on the Lost City engine. The
original Java source in `allstar/legacy` is the specification (`allstar/spec` explains it): every
behaviour there is reproduced, and Lost City gameplay that Allstar-Scape did not have is removed.
How to contribute: `allstar/CONTRIBUTING.md`. Owner-requested extras: `allstar/QUIRKS.md`.

## Platform

- Content: Lost City `377-wip` (May 2006 cache) — the only branch with every NPC and item
  Allstar-Scape used.
- Players use Lost City's browser client. Lost City has no 377 web client, so the 377 content is
  packed with Lost City's 289 engine for the 289 web client (Client-TS), extending the packer and
  client where 377 data exceeds 289 (workstream `platform`, in progress).

## Layout

| Path | What |
| --- | --- |
| `engine/` | Lost City Engine-TS (git subtree) + Allstar-City engine changes |
| `content/` | Lost City Content `377-wip` (git subtree) + Allstar-City content |
| `content/scripts/allstar/` | Allstar-Scape gameplay in RuneScript |
| `client/` | Lost City Client-Java `377` (development/testing; being replaced by the web client) |
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

## Workstreams

Each runs in its own git worktree (`D:\Desktop\Allstar-City.worktrees\<name>`, branch `port/<name>`).

| Workstream | Scope | Status |
| --- | --- | --- |
| lead (main) | world spawns, login/new player, command framework, XP, engine commands, generator, test bot | done |
| shops | every shop, Allstar pricing and sell rules, shop-opening NPC options | in progress |
| npcs | NPC clicks, 71 dialogues, banks, pickpocketing, quests, clue scrolls | in progress |
| objects | 509 placed / 67 removed objects, object clicks (coin trees, stalls, chests, stairs, doors...), item-on-object | in progress |
| items | item data from item.cfg, equipment rules, food/potions/bones, item-on-item, bank, trade | in progress |
| combat | NPC system (HP, max hit, respawn, aggression), drops, player combat, specials, prayers, death, PvP zones, magic | in progress |
| ui | remaining commands, emote-tab teleports, level-ups, 99 broadcasts, tabs/texts | in progress |
| customitems | items with ids >= 7956: 154 objs `allstar_item_<id>` (obj id = Allstar id), enum `allstar_items`, models converted from the OSRS cache by `allstar/tools/models` (can also read a 317 client cache); stand-ins: Summoning cape/(t)/hood, 9540, 14819, 15181 | merged |
| platform | 377 content on the 289 engine + Lost City web client | in progress |
| lead (after merge) | QUIRKS dupes, remove leftover Lost City gameplay, hosting setup, docs | todo |

## Known deviations from Allstar-Scape

Reviewed with the owner after major progress.

- 6 autospawn.cfg spawns sit outside the game map (e.g. `2000,3468`); unreachable in Allstar-Scape
  too, so skipped.
- The welcome interface (317 interface 15944) is shown on the 377 text scroll for now.
- Lost City's staff commands (`::tele`, `::give`, ...) still exist for staff; Allstar commands of
  the same name take precedence.
