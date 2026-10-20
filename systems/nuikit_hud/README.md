# nuikit_hud

The HUD for `[nuikit]`: vitals, voice, money and job; a vehicle cluster with a real gauge for cars,
bikes and boats and flight instruments for aircraft; a themed frame around GTA's minimap, a location
strip and a heading strip. Everything is anchored to GTA's safe zone and the minimap's real rectangle,
styled only by the server's theme (`nuikit/theme.css`), and every element can be turned off in
`config.lua`.

Works on **Qbox**, **QBCore**, **ESX** or **standalone** (the nuikit bridge detects it; force one with
`setr nuikit_framework qbox`). Presentation only: nuikit draws the seatbelt and cruise state that other
resources report, it never ejects anyone or holds a speed.

## Install

1. Put it in `resources/[nuikit]/` next to the `nuikit` resource.
2. Stop the HUD it replaces. Qbox starts `qbx_hud` through a category (`ensure [qbx]`), so add `stop qbx_hud` after that line in server.cfg.
3. `ensure nuikit` then `ensure nuikit_hud`.
4. **Qbox / QBCore:** stress gain and its screen effects live inside `qbx_hud` / `qb-hud`, so stopping them turns stress off. `ensure nuikit_stress` (same events, same metadata) to keep it.

## Features

| Area | What it shows | Where |
|---|---|---|
| Vitals | Health, armor, hunger, thirst, stress: a ring with the icon inside and the value beside it. In `auto` each shows when it changes or crosses its threshold (≤ 25 %, stress ≥ 60 %), then fades; critical ones get an outline and a slow pulse. Icon + colour + value, never colour alone. | Beside the map's bottom edge, or bottom left on foot |
| Voice | Range (pma-voice's mode name, or the distance) while talking or when it changes; the radio channel while on one | End of the vitals row |
| Wallet | Cash (always) and bank (on change) with the difference (+$500 / −$500); job, grade and duty | Top right |
| Vehicle cluster | Speed (mph / km/h, per player), RPM on an arc with ticks and a redline zone, a needle on the fill, gear (R / N / 1–n), five shift lights that flash at the redline, fuel, turn signals and hazards | Bottom right |
| Telltales | Lights (low / high beam), seatbelt, cruise (with its speed), handbrake, engine and body damage. Lit in their colour; unlit ones stay faintly in place so the row never jumps | Under the gauge |
| Warnings | "Fasten seatbelt" (moving, unbuckled), "Low fuel 7 %", "Engine 18 %" | Under the telltales |
| Gauge styles | `arc`, `bar`, `digital`, from the identity's `--nk-gauge-style` (or forced in config) | |
| Aircraft | Airspeed (knots), a heading rose, altitude (ft / m); landing gear, lights, engine, fuel | Bottom right |
| Boats | The gauge in knots with the heading where the gear would be | Bottom right |
| Minimap | GTA's radar placed and framed in the panel surface (square or circle), north in the brand colour; the 0.5.0 fixes (own mask, big-map flick, placed only once in the world) are kept | Bottom left |
| Location | Heading badge (NE / 32°), street, cross street and zone, postal (nearest-postal), waypoint distance | Above the map, or bottom left on foot |
| Heading strip | A compass tape with ticks, N/NE/E… and the bearing | Top centre, in vehicles (or on foot with `compass.onFoot`) |

Player command (with `Config.playerUnits`): `/hud units mph` or `/hud units kmh`, kept between sessions.

## Config

Everything is in `config.lua` with a comment on each line. The main switches:

| Key | Values |
|---|---|
| `units`, `playerUnits` | `'mph'` / `'kmh'`; let players choose |
| `radar` | `'vehicle'`, `'always'`, `'never'` |
| `layout.source` | `'game'` (read GTA's HUD alignment, fall back when it looks wrong) or `'stage'` (the 0.5.0 rule) |
| `minimap.enabled` | `false` leaves GTA's radar alone; the HUD still lines up beside its stock rectangle |
| `minimap.shape`, `size`, `band`, `anchor`, `compass`, `location` | as in 0.5.0 |
| `vitals.enabled`, `vitals.health` … `vitals.stress` | `'auto'`, `'always'`, `false`; `low`, `high`, `linger` (ms) |
| `needs`, `voice` | hide hunger/thirst/stress, hide voice |
| `wallet.cash`, `wallet.bank`, `wallet.job` | `'always'`, `'change'`, `false` |
| `vehicle.enabled`, `gauge` | `'theme'`, `'arc'`, `'bar'`, `'digital'` |
| `vehicle.rpm`, `gear`, `shiftLight`, `fuel`, `damage`, `lights`, `indicators`, `handbrake` | `true` / `false` |
| `vehicle.seatbelt`, `vehicle.cruise` | `'auto'` (shown once a resource reports it), `true`, `false` |
| `vehicle.redline`, `bicycles`, `airUnits`, `boatUnits` | rpm 0.2–1; show on bicycles; `'kts'` or `'units'` |
| `fuel` | `'auto'`, `'ox_fuel'`, `'LegacyFuel'`, `'cdn-fuel'`, `'ps-fuel'`, `'lc_fuel'`, `'native'`, `false` |
| `location.enabled`, `onFoot`, `crossing`, `zone`, `postal`, `waypoint` | `postal`: `'auto'` (nearest-postal), a resource name, `false` |
| `compass.enabled`, `compass.onFoot` | the heading strip |

The look is the identity's: colours from the theme tokens, and these identity / component tokens when
the theme sets them (design v2): `--brand`, `--font-display`, `--font-numeric`, `--nk-label-case`,
`--nk-tracking-label`, `--nk-weight-display`, `--nk-hud-opacity`, `--nk-hud-text-shadow`
(`none` / `soft` / `strong`), `--nk-glow`, `--nk-chip-bg`, `--nk-chip-foreground`, `--nk-chip-radius`,
`--nk-meter-track`, `--nk-gauge-style`, `--nk-gauge-track`, `--nk-gauge-ticks`, `--nk-gauge-fill`,
`--nk-gauge-needle`, `--nk-gauge-redline`. Without them it falls back to tokens v1.

## Hook events

Seatbelt and cruise have no standard across frameworks, so any resource reports them (client side):

```lua
TriggerEvent('nuikit_hud:seatbelt', true)       -- buckled (false: unbuckled)
TriggerEvent('nuikit_hud:cruise', true, 80)     -- cruise on, at 80 (the HUD's units, optional)
TriggerEvent('nuikit_hud:cruise', false)
exports.nuikit_hud:setSeatbelt(true)
exports.nuikit_hud:setCruise(true, 80)
```

Also read without any change to your scripts: `LocalPlayer.state.seatbelt` and `LocalPlayer.state.cruise`
(boolean, or the cruise speed as a number), and qb-smallresources' `seatbelt:client:ToggleSeatbelt`.
Leaving the vehicle resets both. Until something reports them, the seatbelt and cruise telltales stay
hidden (`'auto'`).

## Adapters

| What | Order |
|---|---|
| Fuel (0–100) | `ox_fuel` (the vehicle's `fuel` state bag) → `LegacyFuel`, `cdn-fuel`, `ps-fuel`, `lc_fuel` (`GetFuel` export) when started → `GetVehicleFuelLevel` ÷ the tank size. A source that errors falls back to the native. Picked again when a resource starts or stops. |
| Postal | `nearest-postal`'s `getPostal` export when it's started (or the resource named in `location.postal`) |
| Vitals | the nuikit bridge (`nk.player`): sent to the page only when a value changed |

## Messages

Live values (protocol §5.7, `NUI.stream`, ≤ 30 a second and only when they change): `hud:vehicle:speed`
(whole units), `hud:vehicle:rpm` (0.01), `hud:vehicle:heading` (1°, aircraft and boats),
`hud:vehicle:altitude` (1 ft / m, ≤ 15 a second), `hud:minimap:heading` (the camera's bearing, 0.1°).
Everything else is sent on change: `hud:vehicle`, `hud:location`, `hud:minimap`, `hud:minimap:frame`,
`hud:layout`, `nuikit:player`. The contract is `web/src/nui.d.ts`.

## Cost

**Estimated, not yet measured in resmon.** Budget: ≤ 0.02 ms idle on foot, ≤ 0.08 ms driving.

| Loop | On foot | Driving |
|---|---|---|
| Vehicle (`main.lua`) | every 400 ms: one `GetVehiclePedIsIn` | every 33 ms: 2–4 natives + `push` (sends only on change); every 150 ms: ~15 natives + a flat-table compare, `hud:vehicle` only on change |
| Radar, pause, location (`main.lua`) | every 500 ms: ~8 natives, `hud:location` only on change | every 250 ms |
| Radar visibility (`minimap.lua`) | every 500 ms: 3 natives | every 250 ms |
| Compass | every 33 ms while shown: 1 native + `push`, a message only while the camera turns | same |
| HUD area / minimap placement | every 1.5 s: 2 natives (re-placed only on a change) | same |
| Bridge (`nk.player`) | every 250 ms: ~8 natives + one `json.encode` | same |

How that adds up (resmon averages a resource's script time over frames): a woken thread with a few
natives costs roughly 0.005–0.02 ms. On foot that is about 2 + 2 + 4 + 0.7 slow wakes a second plus the
compass at 30 a second, ≈ 0.4–0.6 ms of script time a second, which at 60 fps is **≈ 0.007–0.01 ms per
frame**, and less with the camera still. Driving adds the 30 Hz live loop and the 150 ms read, ≈ 1.5–2.5 ms
a second, **≈ 0.03–0.045 ms per frame** at 60 fps (half that at 120 fps). No loop runs every frame
(`Wait(0)`), and no message is sent when nothing changed. The page paints live values with
`requestAnimationFrame` only while they move. The owner measures with `resmon 1`; the numbers go here.

## Unproven in game

- **Ultrawide.** The HUD area comes from `GetScriptGfxPosition` under 'L','B' alignment (the alignment
  the minimap components use). Its answer at 21:9 and 32:9 hasn't been seen in game; if it looks wrong
  the HUD falls back to the 0.5.0 rule, and `layout.source = 'stage'` forces that. `Config.debug` prints
  both to F8.
- **Compass direction.** The bearing is GTA's camera yaw negated (GTA's 90° faces west). By the maths the
  0.5.0 compass used the yaw as is, which would put east and west the wrong way round on the round
  frame. Check: face east, the strip and the badge read E / 090, and N sits on your left.
- **Natives** `GetVehicleIndicatorLights`, `GetVehicleHighGear`, `GetLandingGearState` and the
  `fPetrolTankVolume` handling field are read through `pcall` where they might be missing.
- **Fuel exports** are called as `exports[name]:GetFuel(vehicle)`; a fork with another signature falls
  back to the native.

## Edit it

The UI is a normal Vite + React app in `web/`. The HUD's own pieces are in `web/src/hud/` (cluster,
aircraft, vitals, location, wallet), its CSS in `web/src/hud.css`, so you own every line:

```bash
cd web && npm install && npm run dev   # browser, with devtools (press `)
npm run build                          # writes web/dist for the game
```

Browser fixtures (`web/src/dev.tsx`): `?fixture=foot|low|idle|cruise|redline|reverse|damaged|plane|boat|wide`,
`&gauge=arc|bar|digital`, `&identity=signal|vector`, `&theme=ember`, `&shape=circle`, `&rule=stage`,
`&scene=<image url>`.
