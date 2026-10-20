# {{name}}

A scoreboard made with [nuikit](https://github.com/belibathan/nuikit), from the `scoreboard` block. It shows:
- who's online, with server IDs, names, jobs and ping (coloured past 100 and 200 ms);
- a search by name, ID or job;
- how full the server is;
- which activities can start, given who's on duty.

It's built from the kit (Panel, Meter, Badge, shadcn Input) and follows the server's nuikit theme.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=players|standalone|alone
{{pm}} run build  # production build into web/dist
```

**In game:** `ensure nuikit` first, then `ensure {{name}}`. Press HOME or run `/{{name}}`; players can rebind
the key in Settings → Key Bindings → FiveM. Type to search, Esc closes. It refreshes every 3 s while open.

## Jobs and activities

The server only knows names and pings by itself. For jobs, and for counting who's on duty for
`Config.activities`, fill in `Config.job` in `config.lua`. There are commented versions for Qbox, QBCore
and ESX. Until then the job column stays empty and every activity that needs a job shows as unavailable.
The function runs protected, so a framework that isn't running can't break the board.

## Files

| | |
|---|---|
| `config.lua` | Title, key, activities and what they need, `Config.job` |
| `client/main.lua` | Opens and refreshes the board. `nk.surface` |
| `server/main.lua` | The player list, pings, jobs and activities (one answer a second per player at most) |
| `web/src/components/blocks/scoreboard/` | The block: `scoreboard.tsx` (UI), `nui.ts` (messages), `fixtures.ts` (every state) |
| `web/src/dev.tsx` | The fake game for browser development |
