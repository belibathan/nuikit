# Reference screens (Figma)

**File:** [nuikit — reference screens](https://www.figma.com/design/V9Jk9pgpzBEuh5o0xcs620) (Quarry Studio team, Figma).
**Exports:** `bench/figma/reference/<identity>/*.jpg` (1920×1080), `anatomy/`, `showcase/`. JPEG q88 instead of
PNG so the set stays at ~13 MB; the Figma frames are the lossless source.

What a nuikit server looks like, per identity, at 1920×1080 over a Los Santos-style scene. These frames are the
target every code lane compares against (design v2, [`v2.md`](v2.md)) and the imagery for the README, the site
and the launch. They are drawn from the shipped UIs on `base/071` (`bench/hud/shots/`, `bench/components/shots/`,
`bench/identity/`, the `systems/*` and `addons/*` sources) and then pushed to what *should* ship; the gaps are
listed per screen below.

## Pages

| Page | Frames | What it is the reference for |
|---|---|---|
| `Graphite`, `Signal`, `Velvet`, `Vector` | 10 each, 1920×1080: HUD on foot, HUD in vehicle, Pause menu, Notifications, Context menu, Input dialog, Progress + skill check, Death screen, Inventory, Loading screen | The same screens in the four identities (`packages/core/themes/*.css`). Each frame is the look-and-layout reference for that screen in that identity. |
| `Anatomy` | 5 (Graphite): HUD, Pause menu, Notifications, Context menu, Death screen | Each numbered part with the tokens that control it (identity tokens change every part; component tokens override one). The names match `docs/tokens.md` and the `--nk-*` component tokens from design v2 step 1. |
| `Showcase` | 8: one hero per identity at 1600×900 (site) and 1280×640 (README / social preview) | HUD on foot + a toast stack + a context menu on one scene. |
| `Assets` | 2 generated scenes (street at golden hour, coastal road at dusk), `LIB` and `SCREENS` text nodes | The scenes are original Figma AI renders (no game screenshot). `LIB` / `SCREENS` are the builder scripts: every frame is generated from them through `use_figma`, so a layout change is one edit and a rebuild (`new Function("figma", "return (async () => {" + lib + "})()")`). |

Frame names are `<Identity> / <Screen>`; parts inside use the kit names (`nk-panel-header`, `nk-row`, `nk-chip`,
`vital/Health`, `map-cluster`, `vehicle-cluster`, `toast-stack`, `incapacitated-band`…) so a code lane can find the
part it is implementing.

## Identity values used

The frames use the identity files on `base/071` converted to sRGB (OKLCH → hex) and the identity flags that
matter for shape and HUD style. Fonts are the closest Figma has: Signal body is Inter (Barlow is not in Figma;
Barlow Condensed is used for display, numerals and labels), Vector body is Inter and display / numerals are
JetBrains Mono (IBM Plex Sans and Chakra Petch are not available), Velvet body is Inter (DM Sans not available)
with Fraunces for display and numerals, Graphite is Inter throughout (Inter Tight not available).

| | Graphite | Signal | Velvet | Vector |
|---|---|---|---|---|
| Surface | `#171717` @ .96, soft shadow, 1px edge | `#0f0e0c` @ .98, 12px cut corners, 3px brand top edge | `#1e1018` @ .96, 10% gradient, deep shadow, 6% brand tint | `#071015` @ .94, brand hairline @ 16%, corner brackets, glow |
| Brand | `#e5e5e5` | `#f5e21c` | `#e6c188` | `#4dece4` |
| Row indicator | bar | fill, radius 0 | fill, radius full | outline |
| Gauge | arc, ticks | **bar** (segmented) | arc, no ticks | digital (segments) |
| Labels | uppercase, +6% | uppercase, +8% | sentence case | uppercase mono, +12% |

## Gaps: reference vs what ships today

Per screen, what the frame shows against what ships. **Closed** items landed on `feat/reference-polish`
(screenshots next to the frames in `bench/polish/<screen>/compare.jpg`, per identity, HUD at three resolutions;
`node bench/polish/shots.mjs` remakes them). **Kept** items are deliberate: the shipped behaviour has a functional
reason, so the frame is the one to change. **Open** items wait on another lane or the owner.

**HUD on foot** (`systems/nuikit_hud`, compact layout)
- Closed: health, armor, hunger and thirst are labelled pills (coloured icon, label, value) with the level line under
  the whole pill; stress stays a status dot. They still show only on change or past a threshold in `auto` mode.
- Closed: the street, then `cross street · zone postal` under it; the heading reads `NW 300°`; the waypoint tag sits
  on the ring's lower outer shoulder (5 o'clock on a right-hand map).
- Open (owner, 0.7.0 note B): ammo shows a weapon glyph beside `12 / 48`; the frame shows the weapon's name as a
  caption instead. Whether nuikit draws glyphs or reuses the inventory's item image decides which.
- Money column: identical.

**HUD in vehicle**
- Closed: the speed sits inside a small rpm arc, the gear is a brand chip under it, fuel is a line (pump, line, %)
  under the gauge, the telltale column is on the gauge's left. The identity's `--nk-gauge-style` picks the drawing in
  the compact layout too: Signal gets its plate with a segmented bar, Vector segmented ticks, the others the arc.
- Kept: seatbelt is a destructive telltale in the column, not a worded chip left of the cluster; the compact layout
  has no worded warnings (v2 §4: show on need, no floating chips). Reconsider if the in-game test says the icon is
  missed.

**Pause menu** (`systems/nuikit_pause`)
- Closed: the server name in the identity's display face; the row indicator checked in all four identities.
- Kept: the rail footer shows `data.lines` (whatever the server sends), not a fixed players / id / ping `dl`; the
  Home panel (player card) stays, the frame leaves the centre to the camera. Both are content the server controls.

**Notifications** (`addons/ox_lib` notify + the item slab)
- Already shipped: the duration line in the kind's colour.
- Closed: `×N` beside the title when the same toast arrives again while it is on screen (same title, description,
  type and position, no `id`); the item slab from a `notify` with `item = { name, count, icon?, image? }` (a nuikit
  extension: ox_lib's Lua never sends it). The 0.7 notification service takes both over when it lands.
- Kept: the kit's item slab is one line (tile, name, delta), not the frame's two-line panel.

**Context menu** (`addons/ox_lib`)
- Open (Components lane): keyboard focus on the identity indicator, hover on `--accent`; the key chip on a row is a
  nuikit-menu-only affordance (ox_lib options have no key field).

**Input dialog** (`addons/ox_lib`)
- Closed: the `Enter` chip on the dialog's Confirm button (and the alert's, when Enter is Confirm).
- Open (Components lane, `form-field`): `‹ ›` steppers inside the number field; shipped keeps the `+ / −` buttons
  beside it (the field is a registry component).

**Progress + skill check** (`addons/ox_lib`)
- Closed: the progress slab is the label, a live percentage and, with `canCancel = true` in the `progress` message
  (nuikit extension; ox_lib's own payload has no cancel field, X is handled in its Lua), the `X` key chip over a thin
  line. POST payloads and timings unchanged (`bench/polish/ox_lib/{before,after}.json`).
- Skill check matches shipped; ring ticks follow `--nk-gauge-ticks` (shipped).

**Death screen** (`systems/nuikit_death`)
- Closed: the full-width band along the bottom edge (state, phase and the clock in the numeric face). It keeps to the
  last 2.5rem of the screen so the medical resources' own text above it stays clear; `Config.band = false` removes
  it. Unproven in game: that qbx / qb's text really sits above it.
- Already shipped: the clock in `--font-numeric` (Countdown uses `--nk-num-font`).

**Inventory** (`addons/ox_inventory`): open (Screens lane). The frame's 72px line-icon slots stand in for the item
images the game provides; the hint row (`Tab` close, `Drag` move, `Ctrl` split) is the part to take.

**Loading screen** (`systems/nuikit_loading`): open (Screens lane): the players-online chip and the stage line.

## Unproven

- Everything here is a drawing: none of it has been rendered in Chromium 103 or tested in game. Surface effects
  (Velvet's gradient and deep shadow, Vector's glow and brackets, Signal's `clip-path` cuts) are exactly the
  effects design v2 lists as unproven on the game at 60 fps; the frames show the intended look if they pass.
- Font substitutions above mean Signal body, Vector body / display and Velvet body are approximations.
- The scenes are generated art, not game captures; HUD legibility over the real sky must be checked in game
  (`--nk-hud-text-shadow`, `--nk-hud-opacity`).

## Rebuilding

Open the `Assets` page, read the `LIB` and `SCREENS` text nodes, and run them through `use_figma`:

```js
const lib = (await figma.getNodeByIdAsync("5:2")).characters;
const src = (await figma.getNodeByIdAsync("7:2")).characters;
const L = await (new Function("figma", "return (async () => {" + lib + "})()"))(figma);
await L.useIdentity("Graphite");            // Graphite | Signal | Velvet | Vector
const S = (new Function("figma", "L", src))(figma, L);
const frame = S.builders.hudFoot();         // hudVehicle, pause, notifications, contextMenu, inputDialog,
                                            // progressSkill, death, inventory, loading
```

`LIB` holds the identity table (`IDS`), the lucide icon paths and the part builders (`panel`, `row`, `chip`,
`vital`, `minimap`, `cluster`, `notify`…); `SCREENS` composes them into the ten screens and records the anatomy
marks (`L.MARKS`) that the Anatomy page turns into numbered badges.
