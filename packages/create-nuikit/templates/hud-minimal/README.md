# {{name}}

A HUD made with [nuikit](https://github.com/belibathan/nuikit), from the `hud-minimal` block: health,
armor, hunger, thirst and stress with the voice range and radio bottom left, cash, bank and job top
right, and a speedometer with seatbelt and engine warnings while driving. It's built from the kit
(Meter, Stat, HudChip, Speedometer) and follows the server's nuikit theme, vital colours included.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=warnings&drive=1 picks a state
{{pm}} run build  # production build into web/dist
```

**In game:** `ensure nuikit` first, then `ensure {{name}}`. The HUD shows once a character is loaded; get
in a car for the speedometer.

## Where the data comes from

| | From | You send |
|---|---|---|
| Health, armor, hunger, thirst, stress, cash, bank, job, voice | nuikit's player bridge (`nk.player`): Qbox, QBCore, ESX or standalone, pma-voice | Nothing |
| Gear, fuel, engine, seatbelt | `client/main.lua` → `hud:vehicle`, on change | Already wired; `seatbelt` reads `LocalPlayer.state.seatbelt` |
| Speed, rpm | `client/main.lua` → `nk.stream` live values, ≤ 30 a second | Already wired |

Turn off the needs with `<HudMinimalSurface needs={false} />` in `web/src/App.tsx`. Full-screen screens
(pause, death, loading) from any nuikit resource hide the HUD while they're open.

## Files

| | |
|---|---|
| `client/main.lua` | When the HUD shows, and the vehicle. `nk.surface`, `nk.player`, `nk.stream`, `nk.send` |
| `fxmanifest.lua` | Imports the nuikit runtime: `shared_script '@nuikit/init.lua'` (needs the `nuikit` resource running) |
| `web/src/components/blocks/hud-minimal/` | The block: `hud-minimal.tsx` (UI), `nui.ts` (messages), `fixtures.ts` (every state) |
| `web/src/nui.d.ts` | Your own messages, if you add any |
| `web/src/dev.tsx` | The fake game for browser development |
| `web/src/App.tsx` | Mounts the HUD |
