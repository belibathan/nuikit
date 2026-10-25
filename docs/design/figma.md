# The Figma design system

**File:** [nuikit — design system](https://www.figma.com/design/IroNuj1YQL223JPzfxJ1ok). The variables mirror the spec
(`packages/core/src/spec`): three collections (identity, semantic, component), modes **Default · Neon Pop · Flat · Square**,
245 / 41 / 314 variables, names 1:1 with the DTCG file. The repo is the source; Figma is the reference.

**Status (Oct 25, 2026):** the variable data is regenerated for tokens revision 2; the file itself still holds the 1.2
variables until the scripts run. `bench/figma/README.md` has the three commands and the six paste-ready scripts
(`bench/figma/out/figma-*.js`, run in order in a session with Figma write access).

## Structure

| Page | What |
|---|---|
| `v2 · Tokens` | One documentation frame per tier (identity, semantic, component): every variable with its CSS name, what it controls or how it is derived (the derivation rules, floors and contrast checks from `docs/tokens.md`), and a live value cell. Below them a themed specimen board: the semantic swatch grid and the type scale, bound to the variables. |
| `v2 · Primitives` | The kit utilities as component sets, built only on the variables: Key, Menu row, Panel, HUD chip, Meter, Vital, Stat, Notice, Key prompt, Confirm, Countdown, Form field, Slab (85 variants). Variant axes follow the registry components' cva props (`registry/nuikit/ui/*`): state and size; density is a token, so it comes from the mode. Each set carries a description naming the registry component and its tokens. |
| `v2 · Make it yours` | The same scene twice: Graphite on the main collections, and **Ember**, a fifth identity built from identity-tier values only, with the list of tokens touched. |

Switching mode: select the page (or any frame) and set the mode of the three `nuikit ·` collections to the same identity.
Everything bound re-themes: colours, fonts and weights, sizes, radii, row indicator, panel edge, elevation, glow, meter
segments, brackets. The exported sheets in `bench/figma/` show every page in every mode.

## Collections and modes

| Collection | Variables | Modes | Holds |
|---|---|---|---|
| `nuikit · 1 identity` | 44 | Default · Neon Pop · Flat · Square | `color/brand`, `color/brand-foreground`, `font/*`, `radius`, every `nk/*` identity token (type, shape, surface, density, motion, HUD, rows), plus `figma/style-*` (Figma only) |
| `nuikit · 2 semantic` | 40 | same | Every other `color/*`: shadcn base, status, game (`hud`, `scrim`, `world-*`), vitals |
| `nuikit · 3 component` | 264 (21 aliases among the 127 levers) | same | The `--nk-*` component tokens the kit reads (`kit.css` `:root`, 137), plus every 1.5-1.7 lever (127: scale, the five type roles, tile, plate, fill, accent, motion distances, hygiene, baseline, selection), resolved per mode, or an alias where the CSS is a plain `var()` |
| `nuikit · yours (Graphite) · identity` / `· component` | 44 / 264 | Graphite | The "yours" pair: Graphite, the original identity, standing in for a server's own. The semantic tier is shared with the main collection |

**Why four modes.** The Professional plan caps a collection at four modes: Default, Neon Pop, Flat and Square use them.
A fifth identity lives in its own pair of collections (identity + component) and shares the semantic collection; the
pair holds Graphite. On an Organization plan it would be a fifth mode.

**Levers.** Names are `--nk-<name>` → `nk/<name>`, the same rule as before. The value per mode is what the theme
(treatment included) sets, else the `kit.css` default, else the lever's documented fallback, evaluated to px / a colour
/ a string (`bench/figma/resolve.mjs`). Aliases are made only when the CSS is a plain `var()` that points at the same
Figma variable in every mode (`nk/space-1` → `nk/space-unit`, `nk/tile-key` → `color/primary`, `nk/plate-radius` →
`nk/r-surface`). Exceptions: letter-spacing levers (`nk/type-*-tracking`) are percent of em and never alias (the older
tracking variables are px at their role's size); a lever that is a colour in one mode and a gradient in another
(`nk/tile-active`, `nk/accent-gradient`) is a `STRING`; shadows (`nk/plate-drop`) are the resolved CSS `STRING`. The two
levers retired in 1.7 (`nk-row-marker-width`, `nk-row-tint-reach`) are left out.

## Variable ↔ token mapping

Names mirror the DTCG file (`packages/core/tokens/nuikit.tokens.json`) 1:1: `color.<token>` → `color/<token>`,
`font.<x>` → `font/<x>`, `radius` → `radius`, `nk.<name>` → `nk/<name>`. Every variable's **WEB code syntax is the CSS
custom property** (`var(--nk-density)`), so a sync in either direction is a lookup by name. Component tokens, which the
DTCG file leaves out (compiling derives them), are `nk/<name>` for `--nk-<name>`.

The full table (every variable, tier, type, CSS name and the value per identity) is generated:
[`bench/figma/variables.md`](../../bench/figma/variables.md).

Units and types in Figma:

| CSS | Figma |
|---|---|
| Colours (`rgb` / `rgba`, compiled from OKLCH) | `COLOR` with alpha |
| Lengths in rem / px | `FLOAT` in px at 1080p (`1rem = 16px`) |
| Letter-spacing in em | `FLOAT` in **px at the role's size** (Figma binds letter-spacing in px, not percent): `nk/tracking-display` = em × `nk/text-display`, `nk/tracking-label` = em × `nk/text-label`, `nk/heading-tracking` at `nk/text-title`, `nk/num-tracking` at 16px |
| Durations in ms | `FLOAT` (ms) |
| Keywords (`nk-elevation`, `nk-row-indicator`, `nk-motion-feel`, `nk-label-case`…) and easings | `STRING` |
| Font families | `STRING`, the first family of the stack (Figma has no Inter Tight: `font/display` holds `Inter` for Graphite) |
| CSS weights (`nk-weight-*`) | Kept as `FLOAT`; the **`figma/style-*`** strings (`Semi Bold` for Inter, `SemiBold` for Barlow…) are what text nodes bind for `fontStyle`, per role and per identity. Figma only; not a token |
| Shadows and edges (`--nk-panel-shadow`, `--nk-panel-edge`, `--nk-key-shadow`, glows, the HUD text shadow) | Decomposed into `nk/<name>/<layer>/{color,y,blur,spread}` (`COLOR` + `FLOAT`), which Figma effects bind. The CSS name sits on the first layer's colour; the rest are "Figma only" |
| Formulas (`calc()`, `max()`) | Resolved per mode (numbers) or an alias (`→`) when the formula is a plain `var()` reference |

Scopes are set on every variable (fills, text, strokes, radius, gap/size, font family/style/size, letter-spacing,
effects, opacity); keywords and pure numbers are hidden from pickers.

## Make it yours: Graphite

Proof of the flexibility claim in `docs/tokens.md#flexibility`, in Figma: the same scene twice, once on the main
collections (Default) and once on the `yours (Graphite)` pair. Graphite is `packages/core/themes/graphite.css`
unchanged, so the page shows how far apart two identity-tier sets sit while the semantic tier stays shared. (The 1.2
file used Ember, a fifth identity built from 25 identity-tier lines; `ember.css` is retired, a server's own identity
is the point and Graphite is the stand-in.)

## Regenerating

```
pnpm --filter nuikit-core build
node bench/figma/gen.mjs      # out/vars.json, bench/figma/variables.md  (44 / 40 / 264)
node bench/figma/emit.mjs     # out/data-*.json: compact rows per collection (out/ is git-ignored)
```

Repopulating the file (the one step left):

1. In the file, rename the modes of the three `nuikit ·` collections, in order, to `Default`, `Neon Pop`, `Flat`,
   `Square`; rename the yours pair's mode to `Graphite` and the pair itself to `nuikit · yours (Graphite) · ...`.
2. In `use_figma`, paste `bench/figma/populate.js` and one `out/data-*.json` array, then
   `await populate(collection, rows)`: `identity`, `semantic`, `component` into the main collections,
   `yoursIdentity` and `yoursComponent` into the yours pair. It creates or updates by name (idempotent), sets scopes,
   descriptions, code syntax and the per-mode values (row order = mode order), and returns the aliases to resolve by
   name. The component rows are large (about 33 KB): send them in two or three slices.
3. Variables the 1.2 file has that 1.7 no longer generates (`nk/*` names that exist only in the old file) are left
   alone; delete them by hand if the Tokens page should match exactly. No new scopes are used.

The Primitives and Tokens pages were built by scripts in an earlier session (bound by variable name, so they survive a
re-populate); their documentation frames do not list the 127 levers yet.

## What is missing or approximate

- **Chamfers (`--nk-cut`)**: a `clip-path` polygon has no variable-driven equivalent in Figma; Signal's panels, rows and
  chips render with their 2px radius and no cut. The value is in the variable for the record.
- **`--nk-surface-gradient`**: gradient fills can't bind variables; Velvet's panels are flat in Figma.
- **Text transform**: `--nk-label-case` and `--nk-heading-case` are strings; captions are uppercase statically (so
  Velvet's as-written captions and Signal's / Vector's uppercase headings don't switch).
- **Density variants**: the task asked for state and density variants. Density is `--nk-density`, a per-identity token,
  so it lives in the mode rather than as a variant axis; the sets reflow when the mode changes.
- **Meter sizes** (`sm` × 0.75, `lg` × 1.5 of `--nk-meter-height`) are fixed overrides, not computed from the token.
- **Countdown hero** (`min(8rem, display × 3.5)`) is shown at the display size.
- **Vector's corner brackets** are drawn as small squares bound to `nk/panel-bracket`, not L shapes.
- **Icons** are placeholder circles; swap for lucide instances (INSTANCE_SWAP) when the icon set is in the file.
- **Form field** covers text, slider, select and switch; the other `FieldKind`s, horizontal orientation and the
  error state are not drawn.
- **Fonts**: Inter Tight isn't in Figma's library (Inter stands in); Fraunces has no Medium (Velvet's 500 display
  weight uses Regular); JetBrains Mono has no SemiBold (Vector's strong numerals use Bold).
- Nothing here is tested in game; the in-game checks for the identities stay in `bench/identity/results.md`.
