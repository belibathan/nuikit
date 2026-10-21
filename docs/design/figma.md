# The Figma design system (tokens 1.2, four identities)

**File:** [nuikit — design system v2](https://www.figma.com/design/IroNuj1YQL223JPzfxJ1ok) (Quarry Studio team, Professional
plan). The v2 pages and collections were built on `design/figma-tokens` (Oct 20, 2026) on top of the v1 draft that was
already in the file; the v1 pages (README, Foundations, Components (v1 baseline)) and collections (Color / Size / Type)
are kept for reference and marked superseded on the README page.

The repo stays the source of truth: every value in Figma is `compileTheme`'s output for
`packages/core/themes/{graphite,signal,velvet,vector}.css` (tokens 1.2, `docs/tokens.md`). Figma is the visual
reference and the documentation of the token system, not where tokens are edited. `bench/figma/` holds the
generator that produced the variables, the exported sheets and the fifth identity used as the flexibility proof.

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
| `nuikit · 1 identity` | 44 | Graphite · Signal · Velvet · Vector | `color/brand`, `color/brand-foreground`, `font/*`, `radius`, every `nk/*` identity token (type, shape, surface, density, motion, HUD, rows), plus `figma/style-*` (Figma only) |
| `nuikit · 2 semantic` | 40 | same | Every other `color/*`: shadcn base, status, game (`hud`, `scrim`, `world-*`), vitals |
| `nuikit · 3 component` | 137 | same | The `--nk-*` component tokens the kit reads (`kit.css` `:root`), resolved per identity, or an alias where the CSS is a plain `var()` |
| `nuikit · yours (Ember) · identity` / `· component` | 44 / 137 | Ember | The fifth identity (see below). The semantic tier is shared with the main collection |

**Why four modes.** The Professional plan caps a collection at four modes, and the four shipped identities use them. A
fifth identity therefore lives in its own pair of collections (identity + component) and shares the semantic
collection. On an Organization plan it would be a fifth mode.

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

## Make it yours: Ember

Proof of the flexibility claim in `docs/tokens.md#flexibility`, in Figma. `bench/figma/ember.css` is Graphite's
`theme.css` plus 25 identity-tier lines (brand, the three fonts, radius, type ratio and weights, tracking, label case,
surface opacity / tint / gradient / edge, elevation, glow, density, easing, duration, feel, bounce, gauge track and
ticks, row indicator). It compiles with no warnings; its derived values fill the `yours (Ember)` collections. The
semantic tier (every colour but brand) is untouched: Ember is orange on Graphite's neutrals, with Fraunces headings,
DM Sans text, a filled active row, deep elevation, a glow and a roomier rhythm. The page lists each token with its
Graphite and Ember values.

Ember is not a shipped identity, only a demonstration; to ship it, it would get the `packages/core/themes/` treatment
(fonts in `fonts.json`, a contact sheet, the flexibility test).

## Regenerating

```
pnpm --filter nuikit-core build
node bench/figma/gen.mjs      # out/vars.json, out/ember.css, bench/figma/variables.md
node bench/figma/emit.mjs     # out/data-*.json: compact rows per collection
```

Then, in `use_figma` (Figma MCP), paste `bench/figma/populate.js` and a `data-*.json` array:
`await populate(collection, rows)` creates or updates variables by name (idempotent), sets scopes, descriptions, code
syntax and the per-mode values; aliases come back to resolve by name. The Primitives and Tokens pages were built by
scripts in the same session (bound by variable name, so they survive a re-populate).

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
