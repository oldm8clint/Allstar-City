# Hosting Allstar-City

Players only need a browser and the address of the server's web port: the server serves the web
client itself (`/rs2.cgi`) and the client opens its WebSocket back to the same address (`wss://`
when the page is `https://`). Nothing else has to be reachable from the internet.

## Ports

| Port (`engine/.env`) | Who needs it |
| --- | --- |
| `WEB_PORT` | everyone: the web client and its WebSocket. The only port to publish. |
| `NODE_PORT` | the Java client only. Leave it unpublished. |
| `WEB_MANAGEMENT_PORT`, login 43500, friend 45099, logger 43501 | this machine only. They have no authentication, so the engine listens on 127.0.0.1 for them. |

## Production settings

A dev world (the default) logs everyone in at staff level 4, with Lost City's destructive developer
commands, and never checks passwords. Before anyone else connects, set in `engine/.env`:

```
NODE_PRODUCTION=true
LOGIN_SERVER=true
FRIEND_SERVER=true
LOGGER_SERVER=true
EASY_STARTUP=true
WEBSITE_REGISTRATION=false
WEB_PORT=81
NODE_PORT=43595
WEB_MANAGEMENT_PORT=8899
```

(Allstar-Scape's own settings, the 500 ms cycle, its xp curve and its combat model, are the engine's
defaults and need no lines here.)

- `EASY_STARTUP` runs the login, friend and logger servers inside the game process.
- `WEBSITE_REGISTRATION=false`: a new name creates its account (with that password) at its first
  login, as in Allstar-Scape. A wrong password is refused.
- Pick free ports for `WEB_PORT`/`NODE_PORT`/`WEB_MANAGEMENT_PORT` if another server runs on the
  same machine.

## First start

```
cd engine
npm install
npm run sqlite:migrate
npm run build
npx tsx src/app.ts
```

`sqlite:migrate` creates the account database, `engine/db.sqlite` (once). Stop the server with
Ctrl+C: it saves every player before it exits. Killing the process loses progress since the last
autosave.

## The owner account

Log in once with the owner's name and password, log out, then:

```
node allstar/tools/setrank.mjs "Your Name" 3
```

The rank (0 player, 1 moderator, 2 administrator, 3 owner) applies at the next login. After that the
owner promotes and demotes in game (`::giveadmin`, `::givemod`, `::demote`).

## Hosting on a Windows PC without opening router ports

Run a tunnel on the same PC and point it at `http://localhost:<WEB_PORT>`. Players then open
`https://<tunnel address>/rs2.cgi`. The engine reads each player's real address from the tunnel's
`CF-Connecting-IP` / `X-Forwarded-For` header (only for connections from the PC itself), so bans,
`::checkip` and login rate limits see real players.

- Tailscale Funnel: free, no domain needed; the address is `https://<pc>.<tailnet>.ts.net`.
  Install Tailscale, sign in, allow Funnel in the admin console, then
  `tailscale funnel --bg <WEB_PORT>`.
- Cloudflare Tunnel: free, needs a domain on Cloudflare; adds Cloudflare's DDoS protection. Create a
  tunnel in the Cloudflare dashboard, install `cloudflared` as a service with its token and route a
  hostname (e.g. `play.example.com`) to `http://localhost:<WEB_PORT>`.

Keep the PC awake (sleep: never) while it hosts, and do not accept Windows' firewall prompt for
public networks: the tunnel connects over localhost.

## Backups

Back up `engine/data/players/` (the saves) and `engine/db.sqlite` (accounts and passwords), with
the server stopped or with `sqlite3 engine/db.sqlite ".backup <file>"`. Ban lists and logs are in
`engine/data/allstar/`.

## Moving off the PC later

The same steps work on a Linux VPS (Node 24+): run `npx tsx src/app.ts` from `engine/` under a
service manager with a stop timeout of a minute or more (SIGTERM saves players), publish only the
web port (or use the same tunnels), and copy `engine/data/players/`, `engine/data/allstar/` and
`engine/db.sqlite` across.
