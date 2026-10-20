# nuikit_pause: 3D map, character stand-in and live key bindings

The pause menu grows from one screen into four views, all on the kit (`panel`, `menu-row`, `stat`,
`meter`, `hud-chip`) and all opt-in from `config.lua`:

| View | What the player sees |
|---|---|
| **Home** | The rail (server, actions, links), the player card, server stats, and the player's own character standing in the middle of the screen, framed by a scripted camera. |
| **Map** | The real game world seen from a scripted camera high above it: drag to pan, right-drag to rotate, wheel to zoom, click to pick a spot. The UI floats on top: places list with search, the picked spot's street and distance, set or clear the waypoint, recenter, top-down. GTA's own map stays one button away. |
| **Controls** | The server's key bindings, read live from the game so a rebound key shows its new key. |
| **Info** | Server pages from config (rules, how to join the Discord, …) as plain text. |

This is a nuikit design written from scratch. It needs no image assets: the map is the game world.

## Behaviour

### Home: the stand-in

- On foot only. In a vehicle, dead, ragdolling or in water, Home shows no character (the old blur look).
- A local, non-networked clone of the player ped is created at the player's exact position and
  heading. The real ped is hidden for this client only (`SetEntityLocallyInvisible` every frame),
  so other players see nothing change and nothing can clip: the clone stands where the player stands.
- The clone plays a calm idle and turns to face the camera. Dragging on the empty middle of the
  screen turns it (`pause:preview:rotate`).
- A scripted camera frames the clone so its body fills the rectangle the UI reports
  (`pause:preview:frame`, normalised 0–1 screen coordinates of the empty stage area). The game's
  screen blur is not used while the stand-in shows (it would blur the character); the UI's scrim
  darkens the sides instead.
- Leaving Home, closing the menu, the resource stopping or the player dying deletes the clone and
  gives the gameplay camera back.

### Map: the camera over the world

- Camera state: a ground target `(x, y, z)`, a distance `d` (80 m to 6 km), a pitch (−89° top-down
  to −25°) and a heading. Every frame the live state eases toward the goal state; the camera sits at
  `target + d · (sin h · cos p, −cos h · cos p, −sin p)` and points at the target.
- Opening the map starts above the player (or the waypoint, if one is set) at 900 m, pitch −60°.
- While the map is open, for this client only: the radar and HUD are hidden, the world streams
  around the camera target (`SetFocusPosAndVel`, cleared on exit), peds and vehicles near the target
  are made locally invisible so the streets read clearly, and an optional clear-air timecycle
  removes distance fog (`Config.map.clearView`).
- Inputs (from the UI, batched to at most one call per animation frame):
  - `pan {dx, dy}`: screen fractions; moves the target along the ground relative to the heading,
    scaled by distance.
  - `rotate {dx, dy}`: heading and pitch.
  - `zoom {delta}`: multiplies the distance.
  - `pick {u, v}`: a ray from the camera through that screen point to the ground; returns the point,
    its street (and crossing), zone label and distance from the player.
  - `focus {id}`: fly to a configured place. `recenter`: fly to the player. `topdown {on}`.
  - `waypoint {x, y}` sets GTA's waypoint; `waypoint {clear: true}` removes it.
- Markers: the player, the waypoint and every configured place are projected to the screen
  (`GetScreenCoordFromWorldCoord`) and sent as `pause:map:frame` about 20 times a second, only when
  something moved. The UI draws them with the kit's HUD chips, so they follow the theme.
- Closing the map eases the camera back to the gameplay camera (600 ms) and restores everything.

### Controls

`Config.keybinds` lists what to show: a label and either a FiveM command (`+handsup`, `radialmenu`)
or a GTA control index. Each entry is resolved when the view opens with
`GetControlInstructionalButton`; command bindings use the command's hash with the high bit set. The
returned `t_X` / `b_NNN` codes become key names (`E`, `F1`, `Mouse 4`, `Wheel up`…). Unbound
commands show "Not bound". Rebinding stays in GTA's Key bindings page (scripts can't change keys),
which the view links to.

### Info

`Config.pages`: `{ id, title, icon, body }`, where `body` is plain text with blank lines between
paragraphs and `- ` list items. Shown in a scrolling panel.

### Server stats

The server adds its uptime (since the resource started), the player's ping and, from
`Config.restarts` (`{ '06:00', '18:00' }`, server time), the next scheduled restart. Shown on Home
as `Stat`s next to the player count.

## Contract (nui.d.ts)

Surface `pause` data gains `views`, `places`, `pages`; new events and callbacks:

| Direction | Name | Payload |
|---|---|---|
| Lua → UI | `pause:map:frame` | `{ markers: {id, x, y, onScreen}[], player: {x, y, heading} \| null, waypoint: {x, y} \| null, zone, street, heading, topdown }` |
| Lua → UI | `pause:keys` | `{ label, key \| null, group? }[]` |
| UI → Lua | `pause:view` | `{ view: "home" \| "map" \| "keys" \| "info" }` → `{ ok, preview?: boolean }` |
| UI → Lua | `pause:preview:frame` | `{ x, y, w, h }` |
| UI → Lua | `pause:preview:rotate` | `{ dx }` |
| UI → Lua | `pause:map:pan` / `rotate` / `zoom` | `{ dx, dy }` / `{ dx, dy }` / `{ delta }` |
| UI → Lua | `pause:map:pick` | `{ u, v }` → `{ ok, point?, street?, zone?, distance? }` |
| UI → Lua | `pause:map:focus` / `recenter` / `topdown` | `{ id }` / `{}` / `{ on }` |
| UI → Lua | `pause:map:waypoint` | `{ x, y }` or `{ clear: true }` |
| UI → Lua | `pause:gamemap` | `{}`: GTA's own map, as the old Map button |

## Config

```lua
Config.views = { map = true, keys = true, info = true, preview = true }
Config.map = { clearView = true, hidePeds = true, startHeight = 900.0 }
Config.places = { { id = 'pillbox', label = 'Pillbox Hospital', category = 'Services', icon = 'hospital', coords = vec3(298.6, -584.5, 43.3) }, … }
Config.keybinds = { { label = 'Radial menu', command = '+radialmenu' }, { label = 'Phone', control = 288 }, … }
Config.pages = { { id = 'rules', title = 'Rules', icon = 'scroll', body = [[…]] } }
Config.restarts = { '06:00', '18:00' }
```
