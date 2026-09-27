# Porting guide

How to port a piece of Allstar-Scape to Allstar-City. Read this before changing content.

## The rule

Allstar-City is a **1:1 recreation of Allstar-Scape v2**. The original Java source in
`allstar/legacy` is the specification; `allstar/spec/*.md` explains it with line references.

- Reproduce Allstar-Scape's behaviour exactly: numbers, messages (verbatim, including typos),
  timings, odds, requirements and quirks.
- Do **not** keep Lost City (authentic RuneScape) behaviour that Allstar-Scape did not have. When
  you port a system, remove or replace the Lost City scripts for it.
- Reachable original bugs marked `BUG` in the spec: reproduce them when they are part of normal
  play; otherwise note them in your report. `JUNK` (dead code, broken debug) is not ported.
- Behaviours the owner asked for that are not in the source are listed in `allstar/QUIRKS.md`.
- Anything you cannot make identical goes in your report under "Deviations".

## Layout

| Path | Use |
| --- | --- |
| `content/scripts/allstar/<system>/configs/` | configs (`.obj .npc .loc .inv .varp .enum .param .constant ...`) |
| `content/scripts/allstar/<system>/scripts/` | RuneScript (`.rs2`) |
| `content/scripts/allstar/scripts/core.rs2` | shared helpers (owned by the lead; ask before changing) |
| `allstar/tools/gen/<system>.mjs` | data generators run by `node allstar/tools/generate.mjs` (register in `gen/index.mjs`) |
| `allstar/tests/<system>.test.ts` | headless bot tests |

Files must sit in a folder named `configs` or `scripts` (the build checks this).

## Units and ids

- **Ticks:** Allstar-City runs 500 ms cycles (`NODE_TICKRATE=500`), exactly Allstar-Scape's
  cycle. A delay of N cycles in the Java code is `N` in RuneScript (`p_delay`, timers, queues).
- **XP:** whole xp (`NODE_ALLSTAR_XP=true`). Pass Allstar's numbers straight to `stat_advance`.
  Lost City content passes tenths; never copy its xp values.
- **Ids:** Allstar-Scape (317) item, NPC and object ids are identical in the 377 cache. Scripts
  use Lost City debug names: `node allstar/tools/lookup.mjs obj 995 4151` (also `npc`, `loc`).
- **Coordinates:** Java `absX, absY, heightLevel` = RuneScript `coordx, coordz, coordy`. Coord
  literals are `level_mx_mz_lx_lz` (mx = x >> 6, lx = x & 63).
- **Stackable, noted, prices:** Allstar-Scape used its own flag files and `item.cfg` (see
  `allstar/spec/custom_items.md` section 6 and `allstar/spec/allstar_items.csv`).

## Helpers and engine commands

`content/scripts/allstar/scripts/core.rs2`:
- `~allstar_additem(namedobj, count)(boolean)` — Java `addItem` (non-stackables added one at a
  time, a free slot always needed, stacks cap at 999,999,999, "Not enough space in your inventory.").
- `~allstar_telejump(x, z)` — command-style teleport: instant, keeps height.
- `~allstar_teleblocked()(boolean)`, `~allstar_is_named(string)(boolean)`,
  `~allstar_hidden_point(slot)`, `~allstar_scroll_clear`, `~allstar_scroll_child(317 child id, text)`.

Allstar engine commands (`content/scripts/engine.rs2`, bottom): `findname`/`.findname`,
`playerall` (iterate with `huntnext`/`.huntnext`), `world_broadcast`, `setstaffmodlevel`,
`p_kick`, `ipaddress`, `namelist_add/del/has/clear`, `allstar_log`, `world_reboot`.

Ranks: `%allstar_rights` (0 player, 1 mod, 2 admin, 3 owner). Test staff checks against
`%allstar_rights`, not `staffmodlevel` (dev worlds give everyone staff 4).

Commands: `::name args` runs `[proc,cmd_name](typed args)` for every player; `[proc,cmd__input]`
sees every raw input first. A trailing `string` parameter receives the rest of the line.

## RuneScript notes

- Arithmetic inside arguments needs `calc(...)`: `max(0, calc($a - $b))`.
- Typed queue arguments: `strongqueue*(name, delay)(args...)`.
- Strings: `compare(a, b) = 0`; prefix: `string_indexof_string("m", $s) = 0`.
- `testbit` returns int. Protected player actions (teleport, inventory from queues) need
  `p_finduid(uid)` or run inside a queue.
- Trigger lookup is exact type, then category, then default. A duplicate trigger is a compile
  error: delete or rewrite the Lost City one.
- `^constants` live in `.constant` files; varps in `.varp` (`scope=perm` to save,
  `protect=no` to write without protected access).

## Build, run, test

```bash
cd engine
npm install            # first time
npm run build          # compile content (incremental)
npx tsx src/app.ts     # run the server with engine/.env
npx tsx ../allstar/tests/<name>.test.ts
```

Play in a browser at `http://localhost:<WEB_PORT>/rs2.cgi` (any username and password on a dev
world). The web client (`webclient/`, Lost City Client-TS 289 with 377 support) is prebuilt in
`engine/public/client`; after changing `webclient/src` rebuild it with
`node allstar/tools/build-webclient.mjs` (needs [Bun](https://bun.sh); `--dev` for a readable
bundle). On localhost, `rs2.cgi?debug=1` exposes `window.allstar.cheat('home')` for browser
automation.

`engine/.env` (not committed) for development. It is read on every start and overrides
`engine/data/config/world.json` (the 289 engine's setup page):
```
BUILD_VERIFY=false
BUILD_VERIFY_PACK=false
NODE_DEBUG=true
NODE_TICKRATE=500
NODE_ALLSTAR_XP=true
NODE_PORT=43595
WEB_PORT=81
WEB_MANAGEMENT_PORT=8899
```
The web client talks to the server through a WebSocket on `WEB_PORT`; `NODE_PORT` is the TCP port
of the test bot, which reads both from `engine/.env` (override with `BOT_PORT`, `BOT_WEB_PORT` or
`Bot.connect({ port, webPort })`). Stop your server when you finish testing.

New config names get ids automatically (`BUILD_VERIFY=false`) and are appended to the tracked
`content/pack/*.pack` files; do not renumber existing ids.

Bot (`allstar/tests/Bot.ts`, 289 protocol): `Bot.connect({ username, port, webPort })`, `cheat(text)`,
`opNpc(op, nid)`, `opLoc(op, x, z, loc)`, `opHeld(op, obj, slot, com)`, `invButton(...)`,
`ifButton(com)`, `resumePauseButton(com)`, `waitForMessage(regex, timeout, since)`, `coord()`,
`messages`, `invs` (inventory = component 3214), `stats`, `main`, `side`, `chat`, `texts`.
