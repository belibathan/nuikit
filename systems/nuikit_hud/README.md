# nuikit_hud

The HUD for `[nuikit]`: vitals, voice, money and job; ammo; a vehicle cluster for cars, bikes and boats
and flight instruments for aircraft; GTA's minimap with the compass on its ring, and the location. Everything is anchored to GTA's safe zone and the minimap's real rectangle,
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

## Layouts

`Config.layout` places the same parts two ways. Each part is its own component (`web/src/hud/*`): move it,
restyle it through tokens, or replace it.

| Part | `compact` (default) | `classic` (0.6) |
|---|---|---|
| Map | A 12rem circle top right on the safe area: a thin ring, cardinals and ticks that turn on it, the heading (`NW 300°`) above a lubber mark, the waypoint distance as a tag on the ring's lower outer shoulder (its arrow points at the waypoint) | A framed square bottom left, N on the frame |
| Location | Under the map: the street, then `cross street · zone postal` smaller | A strip above the map with a heading badge |
| Money and job | Under the location | Top right |
| Vitals | Bottom left: one icon-only chip per vital (health, armor, hunger, thirst, stress), its level traced along the chip outline; a mic chip and the radio channel | The same chips, a size larger, beside the map |
| Vehicle | Bottom right: the speed with dimmed leading zeros inside a small rpm arc (`arc`: a thin arc over faint ticks; `digital`: segmented ticks; `bar`: a plate with a segmented bar, from the identity's `--nk-gauge-style`), the gear as a brand chip under it, a fuel line (pump, line, %) under the gauge, telltales as a column on the left lit only when on | The large arc / bar / digital gauge, shift lights, telltale row, worded warnings |
| Ammo | Over the vehicle, bottom right | Under the money, top right |
| Heading strip | None (the ring carries it) | Top centre |

A 0.6 `config.lua` (`layout = { source = … }`) keeps `classic`. Aircraft use the flight instruments in both.

## Features

| Area | What it shows | Where |
|---|---|---|
| Vitals | Health, armor, hunger, thirst, stress: the same icon-only chip for every vital, in the identity's chip shape (rounded, pill, Signal's chamfer); the level is drawn along the chip's own outline, clockwise from the top. In `auto` each shows when it changes or crosses its threshold (≤ 25 %, stress ≥ 60 %), then fades; past it the whole outline takes the vital's colour. Icon + level + outline, never colour alone; the value is in the meter's label. | Beside the map's bottom edge, or bottom left on foot |
| Voice | Range (pma-voice's mode name, or the distance) while talking or when it changes; the radio channel while on one | End of the vitals row |
| Wallet | Cash (always) and bank (on change) with the difference (+$500 / −$500); job, grade and duty | Top right |
| Vehicle cluster | Speed (mph / km/h, per player), RPM on an arc with ticks and a redline zone, a needle on the fill, gear (R / N / 1–n), five shift lights that flash at the redline, fuel, turn signals and hazards | Bottom right |
| Ammo | `12 / 48` (clip / reserve) with a weapon glyph; thrown weapons show the count. Only while armed with a gun or a throwable; an empty clip turns the warning colour | See Layouts |
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
| `layout` | `'compact'` (default) or `'classic'` (see Layouts) |
| `area` | `'game'` (read GTA's HUD alignment, fall back when it looks wrong) or `'stage'` (the 0.5.0 rule); was `layout.source` |
| `minimap.style` | `'ring'` (default: nuikit places GTA's radar and draws the ring or frame) or `'stock'` (GTA's radar untouched, put back to GTA's own placement; the HUD lays out around it). `enabled = false` is the 0.6 spelling of `'stock'` |
| `minimap.yieldTo` | Minimap resources nuikit gives way to: when one is started the style becomes `'stock'` and F8 says so once. `nil` = the built-in list (`circleminimap`, `squaremap`, `minimap`, `jg-hud`, `ps-hud`, `qb-hud`, `qbx_hud`), `{}` = never |
| `minimap.shape`, `size`, `band`, `anchor` | `nil` takes the layout's value (compact: circle, 12rem, 0.125rem, top-right; classic: square, 15rem, 0.375rem, bottom-left) |
| `minimap.compass`, `location` | cardinals and heading on the ring / frame; the location next to the map |
| `ammo` | `false` hides the ammo |
| `vitals.enabled`, `vitals.health` … `vitals.stress` | `'auto'`, `'always'`, `false`; `low`, `high`, `linger` (ms) |
| `needs`, `voice` | hide hunger/thirst/stress, hide voice |
| `wallet.cash`, `wallet.bank`, `wallet.job` | `'always'`, `'change'`, `false` |
| `vehicle.enabled`, `gauge` | `'theme'`, `'arc'`, `'bar'`, `'digital'` |
| `vehicle.rpm`, `gear`, `shiftLight`, `fuel`, `damage`, `lights`, `indicators`, `handbrake` | `true` / `false` |
| `vehicle.seatbelt`, `vehicle.cruise` | `'auto'` (shown once a resource reports it), `true`, `false` |
| `vehicle.redline`, `bicycles`, `airUnits`, `boatUnits` | rpm 0.2–1; show on bicycles; `'kts'` or `'units'` |
| `fuel` | `'auto'`, `'ox_fuel'`, `'LegacyFuel'`, `'cdn-fuel'`, `'ps-fuel'`, `'lc_fuel'`, `'native'`, `false` |
| `location.enabled`, `onFoot`, `crossing`, `zone`, `postal`, `waypoint` | `postal`: `'auto'` (nearest-postal), a resource name, `false` |
| `compass.enabled`, `compass.onFoot` | the heading strip (classic) |

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
(boolean, or the cruise speed as a number), and qb-smallresources' `seatbelt:client:ToggleSeatbelt`, and qbx_smallresources' `qbx_cruise`, which only fires
`seatbelt:client:ToggleCruise` (no arguments) on and off: the HUD follows the toggle and shows the speed
the car had when it turned on.
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
Everything else is sent on change: `hud:vehicle`, `hud:location` (with the waypoint's bearing in 5° steps),
`hud:weapon`, `hud:minimap`, `hud:minimap:frame`, `hud:layout`, `nuikit:player`. The contract is `web/src/nui.d.ts`.

## Cost

**Estimated, not yet measured in resmon.** Budget: ≤ 0.02 ms idle on foot, ≤ 0.08 ms driving.

| Loop | On foot | Driving |
|---|---|---|
| Vehicle (`main.lua`) | every 400 ms: one `GetVehiclePedIsIn` | every 33 ms: 2–4 natives + `push` (sends only on change); every 150 ms: ~15 natives + a flat-table compare, `hud:vehicle` only on change |
| Radar, pause, location (`main.lua`) | every 500 ms: ~8 natives, `hud:location` only on change | every 250 ms |
| Radar visibility (`minimap.lua`) | every 500 ms: 3 natives | every 250 ms |
| Compass | every 33 ms while shown (compact: while the radar shows; classic: also the strip and badge): 1 native + `push`, a message only while the camera turns | same |
| Weapon (`weapon.lua`) | every 500 ms unarmed: 1 native; every 100 ms armed: 3–4 natives, `hud:weapon` only on change | same |
| HUD area / minimap placement | every 1.5 s: 2 natives (re-placed only on a change) | same |
| Bridge (`nk.player`) | every 250 ms: ~8 natives + one `json.encode` | same |

How that adds up (resmon averages a resource's script time over frames): a woken thread with a few
natives costs roughly 0.005–0.02 ms. On foot that is about 2 + 2 + 4 + 2 + 0.7 slow wakes a second (10
more while armed) plus the compass at 30 a second while the radar shows, ≈ 0.4–0.6 ms of script time a second, which at 60 fps is **≈ 0.007–0.01 ms per
frame**, and less with the camera still. Driving adds the 30 Hz live loop and the 150 ms read, ≈ 1.5–2.5 ms
a second, **≈ 0.03–0.045 ms per frame** at 60 fps (half that at 120 fps). No loop runs every frame
(`Wait(0)`), and no message is sent when nothing changed. The page paints live values with
`requestAnimationFrame` only while they move. The owner measures with `resmon 1`; the numbers go here.

## Unproven in game

- **Ultrawide.** The HUD area comes from `GetScriptGfxPosition` under 'L','B' alignment (the alignment
  the minimap components use). Its answer at 21:9 and 32:9 hasn't been seen in game; if it looks wrong
  the HUD falls back to the 0.5.0 rule, and `area = 'stage'` forces that. `Config.debug` prints
  both to F8.
- **Compass direction.** The bearing is GTA's camera yaw negated (GTA's 90° faces west). By the maths the
  0.5.0 compass used the yaw as is, which would put east and west the wrong way round on the round
  frame. Check: face east, the strip and the badge read E / 090, and N sits on your left.
- **Compact map.** The ring is drawn from the rectangle Lua sends, the same numbers that place the radar,
  so it should sit exactly on the circle; the heading room above it (1.75rem) and the waypoint arrow's
  direction (bearing − camera heading) are browser-checked only.
- **Radar width.** Component x/w are in 16:9-width units (height × 16/9) at every aspect; the in-game test
  at 1.88:1 showed the measured HUD width left the radar 16 px short. `Config.debug` prints the radar's
  width on screen next to the hole's.
- **Putting the radar back.** `'stock'` and a resource stop restore GTA's frontend.xml placements
  (minimap −0.0045 0.002 0.150 0.188888, mask 0.020 0.032 0.111 0.159, blur −0.03 0.022 0.266 0.237),
  the square clip, GTA's mask and the north blip. On a stop the big-map flick that makes GTA re-read them
  can't wait a frame; if the radar stays put until the next vehicle exit, that's why.
- **Handbrake.** Lit from `GetVehicleHandbrake` or the driver holding INPUT_VEH_HANDBRAKE (76).
- **Weapon groups.** `client/weapon.lua` maps `GetWeapontypeGroup` hashes (pistol, SMG, rifle, MG,
  shotgun, sniper, heavy, thrown) to glyphs; melee, the stun gun and the petrol can show nothing.
  `GetAmmoInClip` for thrown weapons isn't used (their count is the reserve).
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
