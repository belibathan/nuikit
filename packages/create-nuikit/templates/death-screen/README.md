# {{name}}

A death screen made with [nuikit](https://github.com/belibathan/nuikit), from the `death-screen` block:
a countdown, the keys to call EMS and to respawn (held, with a live bar), and red at the edges of the
screen. It's built from the kit (Meter, HudChip, Kbd) and follows the server's nuikit theme.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=dead-respawn picks a state
{{pm}} run build  # production build into web/dist
```

**In game:** `ensure nuikit` first, then `ensure {{name}}`. Die (or run `/{{name}}:die`) to see it; when
the timer ends, hold E to get up. G calls EMS (`callEms` in `client/main.lua` is where your dispatch goes).

## Make it yours

- `client/main.lua` holds the rules: when the screen opens, the timers, the keys and what respawning
  does. On a server with a medical resource (qbx_medical, qb-ambulancejob, esx_ambulancejob…), keep the
  surface and the hold stream and fill the screen's data from that resource instead.
- Vanilla servers: if `spawnmanager` respawns players on its own, turn that off
  (`exports.spawnmanager:setAutoSpawn(false)`) so the screen gets to decide.
- The screen is in `web/src/components/blocks/death-screen/`: `death-screen.tsx` (the UI), `nui.ts` (the
  messages: the `death` surface's data and the `death:hold` live value) and `fixtures.ts` (every state,
  for the browser).

| Phase | What the player sees |
|---|---|
| `down` | "You are down", the bleed-out timer in red under 30 s, call EMS, "another player can revive you" |
| `dead` | "You are unconscious", the respawn timer, then "Hold E to respawn" with a bar and the bill |

## Files

| | |
|---|---|
| `client/main.lua` | When the screen shows and what it says. `nk.surface`, `nk.stream`, `nk.state` |
| `fxmanifest.lua` | Imports the nuikit runtime: `shared_script '@nuikit/init.lua'` (needs the `nuikit` resource running) |
| `web/src/components/blocks/death-screen/` | The block: UI, messages, fixtures |
| `web/src/nui.d.ts` | Your own messages, if you add any |
| `web/src/dev.tsx` | The fake game for browser development |
| `web/src/App.tsx` | Mounts the screen |
