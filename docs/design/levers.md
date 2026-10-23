# Levers: every visual decision, and the token that moves it

*Roadmap Track D1 (Oct 23, 2026). The styling system is a platform: a server reaches its own design language from
a theme file that sets values only. This is the catalog of what a value can move. One row per visual decision in
`packages/create-nuikit/kit.css` and `registry/nuikit/ui`; where there is no lever, the row says so and the gap
list at the end collects it. Grep-driven; terse. Defaults are the kit's (Graphite, `compileTheme("")`) unless
a column says otherwise. Ranges come from `packages/core/src/tokens.ts` (the compiler rejects a value outside
them and falls back, with a warning). Treatment presets: `TREATMENT_PRESETS` in the same file.*

Rules of the catalog:

- A **lever** is a custom property a theme may set in `.dark {}`; nothing else. The compiler validates it
  (`tokens.ts`), kit.css reads it through `var()` with the Graphite default as fallback, a component reads it
  through a kit class or `var()`.
- A **treatment** is a named set of lever values (`--nk-treatment`). Default is `tile` plus a palette; `soft` is
  empty (Graphite). Any lever the theme sets wins over its treatment.
- **Hard-coded** means a decision no token reaches: the row names the file and line region. Those are the gaps.
- Themes set values only (D4): `packages/core/test/themes-values-only.test.ts` fails on any selector or non-token
  declaration in `packages/core/themes/*.css`; `nuikit check` warns `theme/values-only` on a server's
  `theme.css` / `themes/*.css`. A theme that needs a rule means a lever is missing: add the lever here first.

Proof: `themes/flat.css` (flat, rounded, upright, soft fills) and `themes/square.css` (zero radius, 1px rims,
mono numerals, high contrast) reach two languages far from Default's slanted keycaps from values alone.

## Geometry

| Decision | Lever | Default | Range / values | Set by treatment | Hard-coded |
|---|---|---|---|---|---|
| Keycap / tile slant (face only, box upright) | `--nk-tile-skew` (falls back to `--nk-skew`) | `0deg` | `±20deg` | tile `-12deg`; slab via `--nk-skew -8deg` | |
| Badge / chip / tag / selected-bar slant | `--nk-skew` | `0deg` | `±20deg` | slab `-8deg` | notice-icon skew badge size `1.375rem × 1.25rem` (kit.css ~1335) |
| Keycap wall (the primary button, the selection tile) | `--nk-tile-wall` | `0.1875rem` | length | | |
| Keycap hover lift, press depth | `--nk-tile-lift`, `--nk-tile-press-ratio` | `1px`, `0.67` (of the wall) | length; 0–1.5 | | |
| Wall shade (scrim over the face colour) | `--nk-tile-wall-shade` | `0.45` | 0–1 | | |
| Tile plate offset (Kbd, registry Tile) | `--nk-tile-plate-x`, `--nk-tile-plate-y` | `0px`; `0.1875rem` under a non-zero `--nk-skew` | length | tile `2px` / `2px` | |
| Tile press depth | `--nk-tile-press` | `1px` | length | tile `1px` | |
| Radius: keys / tiles | `--nk-r-key` (alias `--nk-key-radius`) | `max(0.25rem, radius − 4px)` | length | tile `0.25rem` | skeleton block radius repeats the formula (kit.css ~1073) |
| Radius: chips / badges | `--nk-r-chip` (alias `--nk-chip-radius`) | `max(0.25rem, radius − 4px)` | length | tile `0.375rem` | |
| Radius: buttons / fields / rows | `--nk-r-control` (alias `--nk-row-radius`) | `radius − 2px` | length | tile `0.5rem` | |
| Radius: the keycap (button + selection) | `--nk-tile-radius` | `--nk-r-control` | length | | |
| Radius: panels / sheets / dialogs | `--nk-r-surface`, `--nk-plate-radius`, `--nk-material-{menu,hud,overlay}-radius` | `--radius` | length | tile `0.75rem`; plate `0px` (hud, menu) | |
| Radius: HUD tiles | `--nk-hud-radius` | `max(0.25rem, radius − 2px)` | length (kit-only) | | |
| Radius: meters | `--nk-meter-radius` | `9999px` | length (kit-only) | | `[data-variant="edge"]` fill is `0` (kit.css ~1859) |
| Radius: radial menu | | | | | `rounded-full` ×2 (`radial-menu.tsx` 171, 247): a circle by nature |
| Chamfer (top-left, bottom-right) | `--nk-cut` → `--nk-clip`, `--nk-clip-sm` | `0px` | length | plate `0.5rem` | |
| Hairline weight | `--nk-border-width` → `--nk-border` | `1px` | length | slab `2px` | fill leading edge is `1px` (kit.css ~1842); tile rim reads `--nk-border` |
| Keycap rim (button + selection face) | `--nk-tile-key-rim` (new, 1.7) | `transparent` | colour | | |
| Tile rim / focus rim (Kbd, registry Tile) | `--nk-tile-rim`, `--nk-tile-rim-focus` | `--border`, `--ring` | colour | tile white .32 / .40 | |
| Selection tile inset from its row's sides | `--nk-tile-inset` | `0.375rem` | length | | tabs list forces `0.125rem` (kit.css ~2428) |
| Vital chip shape | `--nk-chip-shape` | `auto` | `auto square rounded circle diamond hex chamfer` | | |
| Corner brackets (Vector) | `--nk-panel-bracket`, `-width`, `-color` | `0px` | length (kit-only) | | |
| Panel top accent edge (Signal, Arcade) | `--nk-panel-edge` | `inset 0 1px 0 0 rgba(fg, --nk-surface-edge)` | shadow (kit-only) | | |

## Depth and material

| Decision | Lever | Default | Range / values | Set by treatment | Hard-coded |
|---|---|---|---|---|---|
| Panel shadow recipe | `--nk-elevation` → `--nk-elevation-shadow` | `soft` | `none soft deep hard` | glass `deep`; slab, tile `hard` | the four recipes are compiler constants (`elevationShadow`) |
| Plate drop (sheets, dialogs, notices, action bar) | `--nk-plate-drop` | `--nk-panel-shadow` | shadow | tile `0 0.125rem 0 rgba(0,0,0,.6)` | |
| Plate colour / hairline | `--nk-plate`, `--nk-plate-hair` | `surface`, `--border` | colour | tile `rgb(10,10,10)`, white .12 | |
| Surface opacity | `--nk-surface-opacity`, `--nk-material-{hud,menu,overlay}-opacity` | `0.96` (floor 0.92 warns) | 0–1 | slab `1` | |
| Brand tint on neutral surfaces | `--nk-surface-tint` | `0.02` | 0–0.12 | slab, tile `0` | |
| Top-to-bottom falloff | `--nk-surface-gradient` | `0` | 0–0.2 | glass `0.06` | |
| Machined top edge | `--nk-surface-edge`, `--nk-material-*-edge` | `0.06` | 0–0.3 | glass `.12`, plate `.1`, slab/tile `0` | |
| Tile face light / shade | `--nk-tile-light`, `--nk-tile-shade` | fg at 1.5 × edge; scrim .35 | colour | tile white .16 / none | |
| Backdrop blur | `--nk-material-*-blur`, gated by `--nk-backdrop` | `0px`, `off` | length; `on off` | glass 1.25 / 2 / 0.5rem | |
| Texture | `--nk-material-*-texture` | `none` | `none scanlines` | plate menu `scanlines` | |
| Glow | `--nk-glow`, `--nk-glow-budget`, `--nk-hue-glow` | `0`, `1`, `0.45` | 0–1; 0–8 | | glow radii `1rem` (row), `0.75rem` (chip), `0.625rem` (meter) (kit.css ~279–314) |
| HUD plate opacity, text shadow | `--nk-hud-opacity`, `--nk-hud-text-shadow` | `0.55`, `soft` | 0–1; `none soft strong` | | |
| Day legibility lift | `--nk-legibility`, `--nk-legibility-lift` | `auto`, `0.5` | `auto night day`; 0–1 | | |
| Skeleton block | | | | | `rgba(fg, .08)` and its shimmer (kit.css ~1074–1081) |
| World text shadow | `--world-shadow` | two-layer scrim shadow | shadow | | `drop-shadow` on world icons uses `color-mix` (kit.css ~684; the plugin lowers it) |

## Type voices

The five roles: `scan` (keys, buttons, tabs), `title`, `label`, `num`, `body`. Each has `--nk-type-<role>-{family,style,weight,tracking,case,pad}`.

| Decision | Lever | Default | Range / values | Set by treatment | Hard-coded |
|---|---|---|---|---|---|
| Families | `--font-sans`, `--font-display`, `--font-numeric`, `--font-mono` | Inter / Inter Tight / sans / Geist Mono | font stack | | fonts must be in `packages/core/fonts/fonts.json` or the theme's `@import` |
| Role family | `--nk-type-<role>-family` | body: sans; scan: `--nk-key-font` (numeric); title: `--nk-heading-font`; num: numeric; label: sans | font stack | tile: display for scan/title/label/num | `player-card.tsx` 133 `font-mono` for a `mono` stat (opt-in prop) |
| Italic | `--nk-type-<role>-style` (falls back to `--nk-display-style`) | `normal` | `normal italic` | slab, tile `italic` | `text-roll.tsx` 140/206 pads `0.15em` for italic overhang regardless of style |
| Weight | `--nk-type-<role>-weight`, `--nk-weight-{body,strong,display}` | 400 / 600 / 700; label 500 | 100–900 | slab display 900; tile 800 / 700 | `stat.tsx` 116, `skill-check.tsx` 297, `vital-chip.tsx` 607 read `--nk-weight-strong` directly (fine) |
| Tracking | `--nk-type-<role>-tracking`, `--nk-tracking-display`, `--nk-tracking-label`, `--nk-num-tracking` | `0em`; display `-0.02em`; label `0.06em`; num `-0.02em` | length | plate label `0.1em`; tile `.02/.03/.01em` | |
| Case | `--nk-type-<role>-case`, `--nk-label-case`, `--nk-heading-case` | `none`; captions `uppercase` | `none uppercase` | plate, tile `uppercase` | |
| Italic trailing pad | `--nk-type-<role>-pad` | `0em` | length | tile `0.15em` | |
| Type scale | `--nk-type-ratio`, `--nk-text-base` | `1.2`, `1rem` | 1–1.6 | | label floor `0.8125rem`, HUD value floor `1.125rem`, display `× 1.1` (kit.css ~183–190) |
| Key size | `--nk-text-key` | `0.8125rem` | length | tile `0.8125rem` | `key-prompt.tsx` 323 Kbd at `--nk-text-label`, `h-6` |
| Row title / description size | `--nk-row-title-size`, `--nk-row-desc-size` | `--nk-text-base`, `0.875rem` | length | tile title `1.125rem` | |
| Chip text | `--nk-chip-font-size`, `--nk-chip-weight` | `0.875rem`, `500` | kit-only | | |
| Tabular numbers | | always | | | `tabular-nums` (kit.css 640, 778, 1927, 2198; `countdown.tsx` 39): by rule, not a lever |
| Ring unit glyph | | | | | `0.6em`, `0.0625em` gap (kit.css ~2201) |
| Line heights | | | | | `1rem` / `1.25rem` literals (kit.css 537, 559, 587, 606, 750, 819, 1934, 2188, 2228) |

## Fills, selection and focus

| Decision | Lever | Default | Range / values | Set by treatment | Hard-coded |
|---|---|---|---|---|---|
| Fill language | `--nk-fill-style` → `data-nk-fill` | `solid` | `solid soft` | | |
| Fill colours | `--nk-fill-color`, `-track`, `-tint`, `-edge`, `-alert`, `--nk-fill-height` | brand, scrim .35, accent, transparent, destructive, `--nk-gauge-track` | colour / length | tile fg, white .12 / .12 / .4 | edge fill variant `0.125rem` tall |
| Keycap face (button, lit row, active tab) | `--nk-tile-key`, `--nk-tile-key-ink` | `--primary`, `--primary-foreground` | colour | | destructive tone swaps to `--destructive` (kit.css ~2279) |
| Soft selection tint | `--nk-tile-tint` | `0.16` | 0–1 | | wall at `× 0.5` of the tint (kit.css ~2275) |
| Row indicator | `--nk-row-indicator` → `data-nk-row` | `bar` | `bar fill outline sweep` | plate `outline`; slab `fill`; tile `sweep` | bar width `0.1875rem`, inset `2.5 × space` (kit.css ~271) |
| Row lift on selection | `--nk-row-lift`, `--nk-lift` | `--nk-space-2`, `0rem` | length | tile lift `0.5rem` | |
| List gap | `--nk-list-gap` | wall + `--nk-space-1` | length | | dropdown bottom pad `space-1 + wall`; tabs `0.1875rem + wall` (kit.css ~2424–2428) |
| Focus style (non-row) | `--nk-focus-style` → `data-nk-focus` | `ring` | `ring halo tint fill invert bar` | glass, tile `halo`; plate `bar`; slab `fill` | |
| Focus shift | `--nk-focus-shift` | `0rem` | length | slab `0.25rem` | |
| Field caret rim | `--nk-focus-rim` | `--ring` | colour | | |
| Hold style | `--nk-hold-style` → `data-nk-hold` | `bar` | `bar ring fill` | slab, tile `fill` | ring pad `2px`, fill tint `.32` (kit.css ~1543–1548) |
| Level style | `--nk-level-style` → `data-nk-level` | `bar` | `bar ring liquid slab pips` | slab `slab`; Default `liquid` | pips mask `10%` steps, `2px` gaps (kit.css ~1557) |
| Gauge | `--nk-gauge-style`, `-track`, `-ticks`, `--nk-gauge-sweep` | `arc`, `0.25rem`, `1`, `270deg` | `arc bar digital`; length; 0–1 | | dial/ring thickness `× 0.09`, inset `× 0.07` of diameter (`progress-ring.tsx` 236) |
| Meter segments | `--nk-meter-segments`, `--nk-meter-segment` | `0`, `0.5rem` | kit-only | | segment gap `0.125rem` (kit.css ~1269) |
| Progress ring | `--nk-ring-segments`, `--nk-ring-gap` | `24`, `4` | 6–60; 0–12 | | |
| Role alphas | `--nk-hue-line`, `-tint`, `-glow`, `-alert` | `.5 .14 .45 .24` | 0–1 | | |
| Accent paint | `--nk-accent-gradient`, `-from`, `-via`, `-to` | `--brand` | colour / gradient | | |
| Tile active / confirm | `--nk-tile-active`, `--nk-tile-confirm-face`, `-ink`, `--nk-tile-hold` | confirm face; fg / bg; fg .35 | colour | tile active = accent gradient | |
| Vital chip hygiene | `--nk-label-attach`, `--nk-vital-icon`, `--nk-vital-display`, `--nk-vital-neighbours` | `inline vital auto push` | enums | | tag stem `0.1875rem`, label `h-4`, open margin `-0.375rem` (`vital-chip.tsx` 625–650) |
| Alert threshold | `--nk-alert-threshold`, `--nk-fuel-threshold` | `0.2`, `0.15` | 0–1 | | |

## Spacing and size

| Decision | Lever | Default | Range / values | Set by treatment | Hard-coded |
|---|---|---|---|---|---|
| Density | `--nk-density` → `--nk-space-unit` | `0.875` | 0.75–1.3 | tile `1` | |
| Spacing steps | `--nk-space-{1,2,3,4,6,8}`, `--nk-gap-cluster`, `--nk-gap-items`, `--nk-pad-x`, `--nk-pad-surface` | n × unit; 2 / 1 / 3 / 6 | length | | lever: `--nk-tile-{gap,pad}`, `--nk-menu-row-gap`, `--nk-stat-gap`, `--nk-skill-check-key-pad`, `--nk-key-prompt-{pad-y,pad-l,pad-r,gap}`, `--nk-item-slot-gap` (no `--nk-space-n` equals `0.25rem` at density 0.875, so component families) |
| Row bar shape | `--nk-row-bar-thickness`, `--nk-row-bar-inset-scale` | `0.1875rem`, `2.5` | length; 0–6 | | |
| Hold ring, pips, segments | `--nk-hold-ring-pad`, `--nk-pip-size`, `--nk-pip-gap`, `--nk-meter-segment-gap` | `2px`, `10%`, `2px`, `0.125rem` | length | | |
| Glow radius | `--nk-glow-radius` (chip × .75, meter × .625) | `1rem` | length | | |
| Line height | `--nk-leading-tight`, `--nk-leading-normal` | `1rem`, `1.25rem` | length | | |
| Heights | `--nk-h-key`, `-chip`, `-control`, `-row`, `-field` | `1.25rem`, `2rem × d`, `2.25rem`, `2.75rem × d`, `2.75rem` | length | tile 1.5 / 1.75 / 2.25 / 3rem | lever: `--nk-key-prompt-{min-h,min-h-sm,cap-h}`, `--nk-skill-check-key-h`, `--nk-menu-row-image`, `--nk-nui-image-icon-max`, `--nk-edge-sheet-header-h` (each with today's value as fallback) |
| Row padding and gap | `--nk-row-pad-y`, `-pad-x`, `--nk-row-gap`, `--nk-row-icon-box` | space-2 / 3 / 4; `2rem` | length | | |
| Icons | `--nk-icon-sm`, `-md`, `-lg`, `--nk-icon-stroke` | `.75 / 1 / 1.25rem`, `2` | length; 0.5–4 | | lever `--nk-stat-icon` (`0.875rem`), `--nk-item-slot-lock`; svg defaults read `--nk-icon-{sm,md,lg}`; world icon `1rem` (kit.css ~767) |
| Panel paddings and header | `--nk-panel-header-height`, `-header-padding`, `-body-padding`, `-footer-padding`, `-footer-rule`, `-divider` | `3.25rem × d`, surface pads, `space-3`, none | kit-only | | field-row minimums `1.75rem` / `1.5rem`, `gap: 0.5rem` (kit.css 519–534) |
| Screen edge | `--nk-edge` | `1.5rem` | kit-only | | |
| Slab | `--nk-slab-height`, `-padding`, `-gap`, `-radius`, `-bg`, `-fg`, `-border`, `-font-size`, `-weight` | `2.5rem × d`, … | kit-only | | key chip pad `0 0.375rem` (kit.css ~791) |
| Dial / ring / speedometer diameter | prop `size` | 128 / 192 / 256 px at 1080p | | | `RING_SIZE`, `speedometer.tsx` 85 (`48px`, `192px`): props, not tokens |
| Notice progress line | `--nk-gauge-track` / 2 (edge fill, action-bar hold line) | `0.125rem` | length | | `notice`, `key-prompt`, `item-slot` lines now `--nk-gauge-track / 2` |

## Motion

| Decision | Lever | Default | Range / values | Set by treatment | Hard-coded |
|---|---|---|---|---|---|
| Base duration, ladder | `--nk-duration` → `--nk-time-{press,hover,base,exit,move,modal,screen,ambient,snap,fast,slow,confirm,retract,fill,pulse}` | `140ms` (ceiling 260 warns) | duration | tile `180ms` | ladder multipliers are compiler constants |
| Feel | `--nk-motion-feel`, `--nk-spring-bounce` | `crisp`, `0` | `crisp snap smooth stepped` | glass `smooth`; plate `stepped`; slab `snap` | |
| Eases | `--nk-ease`, `--nk-ease-{standard,expand,retract,spring,breathe}` | one curve; derived | cubic-bezier | | |
| Exit factor, reduced cap | `--nk-exit-factor`, `--nk-time-reduced` | `0.7`, `100ms` | 0.3–1; 0–400 | | |
| Stagger | `--nk-stagger` | derived from feel | duration | tile `40ms` | |
| Distances | `--nk-rise`, `--nk-lift`, `--nk-land-scale`, `--nk-deny-x` | `.5rem`, `0`, `1`, `.3125rem` | length; 0–1 | tile `.5rem`, `.5rem`, `.6` | |
| Press scale | `--nk-press-scale` | `0.97` | kit-only | | |
| Confirm pop | `--nk-confirm-scale` | `1.04` | 1–1.2 | tile `1.08` | |
| Attention blink | | | | | `nk-blink 300ms ease-in-out 2` (kit.css ~1097) |
| Sheet / dialog open | `--nk-time-slow`, `--nk-time-exit`, `--nk-ease-expand`, `--nk-ease-retract` | | | | `edge-sheet.tsx` 151–153 `min(time × 2.2, 360ms)`, `min(× 1.4, 200ms)`; `notice.tsx` 223 the same cap |
| Behaviour | `--nk-rest-delay`, `--nk-notify-ms-*`, `--nk-hold-ms`, `--nk-cooldown-ms`, `--nk-tile-tag-delay` | `0`, `5000`, `800`, `0`, `80ms` | duration | | |
| Profile | `--nk-motion-profile`, `--nk-motion` | `full`, `1` | `full reduced instant`; 0/1 | | |

## Gaps

Ordered by how much a language needs them. Each is a lever to add to kit.css + tokens.ts with the current value as
the default, so nothing shipped changes. Items in `registry/nuikit/ui` belong to the lanes that own those files.

1. ~~Keycap hover lift and press depth~~ done: `--nk-tile-lift`, `--nk-tile-press-ratio` (`--nk-tile-press` was taken: the plate offset).
2. ~~Line heights~~ done: `--nk-leading-tight` (`1rem`), `--nk-leading-normal` (`1.25rem`); unitless leadings (1, 1.2, 1.25, 1.3) stay.
3. ~~Registry size literals~~ done (widths too: `--nk-{panel,notice,confirm}-w[-sm|-lg]`, `--nk-item-slot-w*`, `--nk-countdown-bar-w*`, `--nk-skill-check-size*`). Was: `h-6`/`min-h-8`/`h-8`/`size-8`/`gap-1`/`px-1`/`px-2`/`size-3.5` in `key-prompt.tsx`,
   `skill-check.tsx`, `menu-row.tsx`, `tile.tsx`, `stat.tsx`, `nui-image.tsx`. Should read `--nk-h-key`, `--nk-h-chip`,
   `--nk-space-*`, `--nk-icon-*` (the lanes editing those files).
4. ~~Progress-line and edge-fill thickness~~ done in kit.css: the edge fill and action-bar hold line are `--nk-gauge-track / 2`. The registry `h-0.5` literals stay with their lane.
5. ~~Row bar, hold ring, pips, meter segment gap, glow radii~~ done: `--nk-row-bar-thickness`, `--nk-row-bar-inset-scale`, `--nk-hold-ring-pad`, `--nk-pip-size`, `--nk-pip-gap`, `--nk-meter-segment-gap`, `--nk-glow-radius`.
6. **The elevation recipes** (`elevationShadow`) and **the motion ladder multipliers** are compiler constants; a
   theme picks one of four shadows or sets `--nk-plate-drop`. Acceptable for now: `--nk-plate-drop` covers plates,
   `--nk-panel-shadow` covers panels.
7. **`text-roll.tsx` italic overhang pad** (`0.15em`) applies under upright type too; should read
   `--nk-type-<role>-pad`.
8. **Notice-icon skew badge size** (`1.375rem × 1.25rem`, kit.css ~1335) and the **skeleton radius formula**
   (kit.css ~1073) should read `--nk-h-key` and `--nk-r-key`.
9. **Dial / ring / speedometer diameters** are props (px at 1080p), not tokens: right for a component API, but a
   theme can't scale every gauge at once. Lever candidate: `--nk-gauge-size-{sm,md,lg}`.
10. **Kit-only tokens** (`--nk-heading-case`, `--nk-caption-font`, `--nk-num-tracking`, `--nk-chip-radius`,
    `--nk-meter-radius`, `--nk-row-radius`, `--nk-panel-edge`, `--nk-panel-bracket`, `--nk-meter-segments`,
    `--nk-hud-radius`, `--nk-edge`, `--nk-press-scale`, the `--nk-slab-*` and `--nk-panel-*` paddings) pass through
    the compiler unvalidated and are absent from the DTCG export and the schema. Promote the ones themes use
    (the first nine, by grep of `themes/*.css`) into `tokens.ts` so `nuikit tokens` and the studio see them.

Added in this pass: `--nk-tile-key-rim` (the keycap face's rim, `transparent` by default; `square.css` sets it
white), so a hard-rim language needs no selector.
