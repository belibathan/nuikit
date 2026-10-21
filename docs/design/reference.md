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

Per screen, what the frame shows that the shipped UI on `base/071` does not (or does differently). Each is a
decision for the lane that owns the screen; nothing here is implemented by this lane.

**HUD on foot** (`systems/nuikit_hud`, compact layout)
- Vitals pills carry a coloured 14px icon, the label and the value, with the level line under the whole pill;
  shipped pills are caption + value with a thinner line and no icon colour. Hunger and thirst are shown in the
  frame (as if changed / below threshold); shipped shows them only in `auto` mode on change, which is the rule.
- Street and the "cross street · zone postal" line sit under the ring as two lines; shipped puts zone + postal on a
  caption line *above* the street. Pick one (the frame's order reads top-down: where, then detail).
- The waypoint tag sits on the ring's bottom-right; shipped places it on the left of the ring (8 o'clock).
- Ammo shows the weapon name as a caption over `12 / 48`; shipped shows a weapon icon beside the numbers.
- Money column: identical (deltas, cash, bank, job with the duty dot).

**HUD in vehicle**
- Gear is a brand chip under the speed; shipped draws the gear in the arc's top centre. Fuel is a line under the
  gauge with a percentage; shipped draws fuel as an inner arc. Both are a choice, the frame's reads at a glance.
- Signal uses its own `--nk-gauge-style: bar` (speed + segmented rpm bar + gear) in the compact layout; shipped
  compact keeps the arc for every identity and only classic uses the bar. The identity should win.
- Seatbelt / engine warning chips sit left of the cluster, telltale column on the gauge's left: as shipped.
- Vector's gauge is segmented (`digital`) with glow; shipped Vector shows the arc.

**Pause menu** (`systems/nuikit_pause`)
- Server name is set in the identity's display font; shipped uses the body font at `text-xl`.
- Rail footer is a three-line `dl` (players, server ID, ping); shipped shows whatever `data.lines` carries.
- The player card is the shipped Home panel (avatar, role with duty dot, 2-column stats, footer with players online
  and server ID). The frame leaves the centre to the 3D camera with a faint brand glow on the stage.
- Row indicator follows the identity (`bar` / `fill` / `outline`); shipped `MenuRow` has the v2 token hook from the
  identity PR but the pause rail should be checked in all four.

**Notifications** (`addons/ox_lib` notify + the item slab)
- Duration line is drawn in the kind's colour (success / info / warning); shipped uses `muted-foreground` at 40%.
- Dedupe count `×2` on the right of the title; shipped has no dedupe (that is the 0.7 notification service).
- The item delta slab (tile + name + `+2`) is in the stack as its own transient (v2 §4.5); shipped has no slab in
  the ox_lib lane (the `nk-slab` utilities exist since the identity PR; nothing emits one yet).

**Context menu** (`addons/ox_lib`)
- Rows can carry a key chip (`L`); ox_lib options have no key field, so this is a nuikit-menu-only affordance.
- The active row uses the identity indicator; shipped hover uses `--accent`. Keyboard focus should show the
  indicator, hover may stay accent.
- Metadata panel beside the hovered row, mono for the plate: as shipped (`right-full mr-2 w-64`).

**Input dialog** (`addons/ox_lib`)
- Number field shows `‹ ›` steppers inside the field; shipped uses `+ / −` buttons. Primary button carries the
  `Enter` key chip; shipped has no key chip on dialog actions.

**Progress + skill check** (`addons/ox_lib`)
- Progress slab is label + percentage + cancel key chip over a thin line (v2 §4.5); shipped is label + bar, no
  percentage, no key chip.
- Skill check matches shipped (popover track, border rings, brand zone, foreground needle, key in the centre) and
  adds ring ticks for identities with `--nk-gauge-ticks: 1`.

**Death screen** (`systems/nuikit_death`)
- Adds the full-width "Incapacitated" band at the bottom (v2 §4.5 band slab: icon, state, where and when);
  shipped has no band.
- Clock in `--font-numeric` (Fraunces in Velvet, JetBrains Mono in Vector); shipped uses the body font with
  `nk-num`.

**Inventory** (`addons/ox_inventory`)
- Slots are 72px with a line icon, count top-right, name under, durability line; shipped uses the item images
  (game assets, not drawable here) at ox_inventory's own slot size. Hot slot has a brand outline.
- Hint row (`Tab` close, `Drag` move, `Ctrl` split) under the hotbar; shipped shows no hint row.

**Loading screen** (`systems/nuikit_loading`)
- Adds a players-online chip top right and a stage line ("Loading world / Streaming Vinewood") over the progress
  line's right end; shipped has the header, tips with dots and the progress line.

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
