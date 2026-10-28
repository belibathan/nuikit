# Identity layer spike: surfaces, Chromium 103, fonts

*Oct 20, 2026. Step 1 of the identity work (tokens 1.1, `docs/tokens.md`). Desktop Chromium 141 (Playwright, headless,
software raster and compositing, no GPU), 2 CPUs, 1920×1080, 3 runs per cell (medians). Raw data:
`results.json`. Not FiveM: see [what must be checked in game](#what-must-be-checked-in-game).*

```bash
node bench/identity/spike.mjs [--runs=3] [--seconds=4]        # surface cost (spike.html)
BCD=<@mdn/browser-compat-data> node bench/identity/compat.mjs  # Chromium 103 support
node bench/identity/shots.mjs                                  # screenshots + contact sheets
```

## 1. What surfaces cost

`spike.html`: eight panels (a context menu, three notices, a progress bar, a dialog, a HUD row, a vehicle
card) drawn with each recipe, over a striped "game" that moves.

| Recipe | What it is |
|---|---|
| flat | Solid panel, 1px border |
| v1 | Today's `nk-panel`: `0 0 0 1px` + `0 24px 64px -24px` shadow |
| edge | Gradient light falloff + inset 1px top highlight, no outer shadow |
| soft | edge + the v1 shadow (Graphite's default) |
| deep | edge + four layered shadows (Velvet) |
| glow | deep + brand glow on the active row and the bar fill |
| cut | `clip-path: polygon()` chamfers, no shadow (Signal) |
| cut-drop | cut + `filter: drop-shadow()` on a wrapper (the only way to shade a clipped panel) |
| all | everything at once |

Three scenes:

- **composite**: the background is its own layer and moves (the game under NUI); panels never repaint.
- **content**: a fill inside every panel animates its *width* (panels repaint every frame: the worst case
  for shadows).
- **transform**: the fill animates with `transform` on its own layer (how shadcn's Progress moves).

Milliseconds of work per second (raster = CPU time of raster tasks; compositor = viz/compositor threads):

| Recipe | composite: compositor | content: raster | content: fps | transform: compositor | transform: fps |
|---|---|---|---|---|---|
| flat | 780 | 27 | 60 | 446 | 59 |
| v1 | 841 | 131 | 60 | 718 | 57 |
| edge | 820 | 59 | 60 | 506 | 59 |
| soft | 860 | 108 | 60 | 558 | 59 |
| deep | 943 | 486 | 59 | 627 | 55 |
| glow | 902 | 752 | 55 | 513 | 60 |
| cut | 862 | **20** | 60 | 778 | 52 |
| cut-drop | 892 | 642 | 45 | **995** | **15** |
| all | 889 | 808 | **26** | 987 | 17 |

(The composite scene is dominated by software-compositing a full-screen moving layer, which the game does
for us in FiveM; differences there are within noise. An extra run where the background repaints every frame
saturated the CPU at ~10 fps for every recipe, flat included, so it can't tell recipes apart.)

**Findings, and what the identity layer does with them:**

1. **Static panels cost nothing extra.** Every recipe is painted once and composited; the cost only appears
   when something inside a panel repaints.
2. **Gradient + inner edge is nearly free** (59 vs 27 ms/s raster when repainting every frame, less than
   today's v1 shadow at 131). Graphite gets them by default.
3. **Graphite's `soft` elevation is exactly today's v1 shadow:** no new cost.
4. **`deep` costs ~4× soft when its panel repaints** (486 vs 108). Velvet uses it; a Velvet panel with a
   width-animated bar is the costliest common case. Kit bars (shadcn Progress) animate with `transform`, which
   doesn't repaint the panel.
5. **Glow is the expensive one on things that repaint** (752). The kit only puts glow on the active row, the
   active chip and the Progress indicator (transform-animated), never on width-animated fills. Default 0.
6. **`clip-path` chamfers are the cheapest panel to raster** (20) but cost compositor work when a child
   animates on its own layer (778 vs 446, 52 fps in software). Signal uses them. To check in game.
7. **Never `filter: drop-shadow()` around animated content** (15 fps in the transform scene). The kit doesn't
   use it for panels; a chamfered panel draws its depth with its edge instead of a shadow.

## 2. Chromium 103

`compat.mjs` checks every CSS feature the identity layer uses against MDN's browser-compat-data:

| Feature | Used for | Chrome since | Chromium 103 |
|---|---|---|---|
| custom properties, `calc()` (nested) | every token and formula | 49, 51 | yes |
| `clip-path: polygon()` with `calc()` points | `--nk-cut` | 55 | yes |
| `linear-gradient`, `box-shadow` (inset) | surfaces, chamfer hairlines, brackets, keycaps | 26, 10 | yes |
| `text-shadow`, `text-transform`, `letter-spacing` | HUD shadow, label case, tracking | ≤ 4 | yes |
| `font-variant-numeric`, `font-feature-settings` | tabular numbers | 52, 48 | yes |
| `@font-face` (`src` lists, `font-display`, `unicode-range`, weight ranges) | identity fonts | ≤ 62 | yes |
| `inset`, `outline` (follows radius) | indicator bar, rows | 87, 94 | yes |
| `max()` | type and HUD floors | 79 | yes |
| `:is()`, complex `:not()` | the fill row rule | 88 | yes |
| `transition-timing-function: cubic-bezier()` | `--nk-ease` | 26 | yes |
| `linear()` easing, `color-mix()` inline, `:has()`, `@container`, `scale` / `translate`, `sin()`, `round()`, unprefixed `mask-image` | **not used** (113, 111, 105, 105, 104, 111, 125, 120) | | avoided |

`color-mix()` appears in kit stylesheets only in the form vite-plugin-nuikit lowers (`var(--token) N%,
transparent`); a colour that needs two tokens mixed (the tinted `--surface`) is computed by `compileTheme`.
Every needed feature is in Chromium 103.

## 3. Fonts

Ten open (SIL OFL 1.1) families, latin woff2 from `@fontsource` 5.3.0, in `packages/core/fonts/` (~460 KB):
Inter, Inter Tight, Geist Mono (Graphite), Barlow, Barlow Condensed (Signal), Fraunces, DM Sans (Velvet),
IBM Plex Sans, Chakra Petch, JetBrains Mono (Vector). No Google Fonts URL anywhere at runtime.

Both paths are written (`pnpm sync`, per UI: `nuikit.json` `"fonts"` or `NUIKIT_FONTS`; docs/tokens.md#fonts):

- **Bundled (default).** `@font-face src: url("../node_modules/nuikit-core/fonts/…")`; Vite emits the
  files next to the UI's CSS (or inlines them where the build inlines assets). Works in the browser today.
  Cost: ~460 KB per UI. Overrides whose resource serves a fixed file list (ox_inventory, illenium-appearance,
  qbx_idcard, qbx_scoreboard, qbx_taxijob, qbx_vehiclesales) use `"graphite"`: Graphite's three fonts inlined
  (~155 KB), the rest from the nuikit resource.
- **Served by the nuikit resource.** `systems/nuikit/fonts/*.woff2`, declared in its fxmanifest `files`.
  `@font-face src: url("https://cfx-nui-nuikit/fonts/…"), url("nui://nuikit/fonts/…")`. One copy per server.
  **Unproven**: fonts are CORS-checked, and whether a page on `cfx-nui-ox_lib` may load a font from
  `cfx-nui-nuikit` depends on headers FiveM sets. Off by default until checked.

A font that fails falls back down its stack to system fonts: nothing breaks, the identity just looks off.

## What must be checked in game

The owner, on a Qbox server with the prerelease:

1. **Bundled fonts load.** Default build. Open ox_lib's context menu, the pause menu and the HUD; in the
   NUI devtools (`nui_devtools` → the page) run `[...document.fonts].filter(f => f.status === "loaded").map(f => f.family)`.
   Expect `Inter`, `Inter Tight`. Switch to Signal (copy `nuikit/themes/signal.css` over `nuikit/theme.css`,
   `nuikit theme reload`): titles must turn condensed (Barlow Condensed) with no restart.
2. **Fonts across resources (decides the default).** Build with `NUIKIT_FONTS=nuikit pnpm sync && pnpm build:systems`
   (or just check the `graphite` overrides: ox_inventory with Velvet or Vector). In ox_inventory's page, check
   the console for CORS errors on `https://cfx-nui-nuikit/fonts/…` and whether `document.fonts` reports
   `Fraunces` / `JetBrains Mono` loaded. If yes, flip the default to `nuikit` and every UI drops ~460 KB.
   If no, keep bundling (and say which of the two URL forms failed).
3. **Frame cost.** With each identity, F8 → `cl_drawperf 1` (or a frame-time overlay): stand still with the
   ox_lib progress bar running (`/testprogress` or any ox_lib progress) and the pause menu open. Compare
   frame time against Graphite. Signal (chamfers) and Velvet (deep shadows, glow) are the ones to watch; more
   than ~0.3 ms worse than Graphite means the identity's default goes flatter.
4. **Readability over a bright sky.** Midday, on a white car or snow: HUD chips and notifications in each
   identity. HUD text must stay readable (the compiler checks 4.5:1 against white; the eye decides).
5. **Text size.** Body text is now 16px and captions 13px at 1080p (research §3). Check menus, the bank
   table and the pause list don't feel oversized next to GTA's own HUD at 1080p and 1440p.

## Proof: the same screens in four identities

`node bench/identity/shots.mjs`: ox_lib (context menu, notices, progress, text UI), pause, death, HUD,
Renewed-Banking and the slab specimen (`specimen/`: the four slab anatomies and a small panel, kit
utilities only), each at 1280×720, 1920×1080 and 2560×1440, over game scenes, from each web app's dev
server with its own fixtures; the identity arrives as `nuikit:theme`, as in game. Contact sheets (screens ×
resolutions): [`shots/graphite.jpg`](shots/graphite.jpg) (the utilitarian baseline),
[`shots/signal.jpg`](shots/signal.jpg), [`shots/velvet.jpg`](shots/velvet.jpg),
[`shots/vector.jpg`](shots/vector.jpg), and [`shots/daylight.jpg`](shots/daylight.jpg): the flexibility
check (`packages/core/test/themes/daylight.css`, light, roomy and round, no kit changes;
`docs/tokens.md`). Full-size PNGs are written next to them and not committed.

Known gaps the tokens can't close (other lanes' files, step 3): the death title and bank balance use their
own type classes, not `nk-display`, so their fonts follow `--font-sans` / `--font-numeric` rather than
`--font-display`; the HUD speedometer and vitals are rebuilt in step 2; the pause screen's centre is a 3D
preview that's empty in the browser.
