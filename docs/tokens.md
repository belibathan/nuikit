# nuikit tokens v1 (revision 1.1)

The theme contract every nuikit UI reads. A server's theme is any shadcn / TweakCN paste in
`nuikit/theme.css`; the compiler (`compileTheme` in `nuikit-core`) turns it into this exact set of
CSS variables, so a UI built on the tokens matches every server it runs on.

- **Version:** tokens v1 (`TOKENS_VERSION = 1`), revision 1.1 (`TOKENS_REVISION`, `revision` on a compiled
  theme). Adding a token keeps v1; renaming or removing one is v2. 1.1 added the
  [identity tokens](#identity-tokens-11) and [component tokens](#component-tokens-11): additive, every v1 name
  and meaning is unchanged. The defaults of `--font-sans` / `--font-mono` changed from the system stack to
  Inter / Geist Mono (bundled, with the system stack behind them).
- **Machine-readable:** [`packages/core/tokens/nuikit-theme.schema.json`](../packages/core/tokens/nuikit-theme.schema.json)
  (JSON Schema for a compiled theme), [`packages/core/tokens/nuikit.tokens.json`](../packages/core/tokens/nuikit.tokens.json)
  (the default theme as a [DTCG 2025.10](https://www.designtokens.org/) file). Both ship in the npm package
  (`nuikit-core/theme.schema.json`, `nuikit-core/tokens.json`).
- **In CSS:** `var(--<name>)`, plus `--<name>-rgb` / `--<name>-a` channels for every colour (what
  `bg-x/50` compiles to on Chromium 103). Tailwind names: `bg-success`, `text-warning`, `bg-hud`,
  `text-vital-health`… (`@theme inline` in every synced `index.css`).

## Tokens

The value column is the default theme (stock shadcn neutral, dark), as compiled.

### shadcn base

What every shadcn / TweakCN theme already has. Missing ones fall back to stock shadcn neutral
(of the same mode), with a warning naming them. `sidebar-*`, `shadow-*`, `font-serif`, `tracking-*`
and any other variable pass through untouched (colours lowered to rgb).

| Token | Used for | Default |
|---|---|---|
| `--background` / `--foreground` | Full-screen surfaces (pause, loading, death scrim), text on them | `rgb(10, 10, 10)` / `rgb(250, 250, 250)` |
| `--card` / `--card-foreground` | Raised blocks on a full-screen surface | `rgb(23, 23, 23)` / `rgb(250, 250, 250)` |
| `--popover` / `--popover-foreground` | Every floating panel (`nk-panel`) | `rgb(23, 23, 23)` / `rgb(250, 250, 250)` |
| `--primary` / `--primary-foreground` | The one main action per surface, progress fills, selection | `rgb(229, 229, 229)` / `rgb(23, 23, 23)` |
| `--secondary` / `--secondary-foreground` | Secondary buttons | `rgb(38, 38, 38)` / `rgb(250, 250, 250)` |
| `--muted` / `--muted-foreground` | Tracks, slots and wells in a panel; secondary text | `rgb(38, 38, 38)` / `rgb(161, 161, 161)` |
| `--accent` / `--accent-foreground` | Hover and keyboard highlight | `rgb(38, 38, 38)` / `rgb(250, 250, 250)` |
| `--destructive` | Danger, damage, low values, death | `rgb(255, 100, 103)` |
| `--destructive-foreground` | Text on destructive. Derived when absent (shadcn v4 dropped it): the theme's foreground or background, whichever contrasts more | `rgb(10, 10, 10)` |
| `--border` / `--input` / `--ring` | Hairlines, field borders, focus | `rgba(255, 255, 255, 0.1)` / `rgba(255, 255, 255, 0.15)` / `rgb(115, 115, 115)` |
| `--chart-1` … `--chart-5` | Categorical colour (charts, transaction types). Not vitals: use `--vital-*` | greys in stock neutral |
| `--radius` | Panels radius + 4px, controls radius − 2px, chips full | `0.625rem` |
| `--font-sans` / `--font-mono` | Text / codes and IDs a player might type | `Inter, ui-sans-serif, system-ui, sans-serif` / `"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace` (1.1; [fonts](#fonts)) |

### nuikit semantic

What a game UI needs and shadcn doesn't have. A theme may set any of them; otherwise they're derived,
so a plain shadcn paste always works.

| Token | Used for | Derived default | Default |
|---|---|---|---|
| `--success` | Positive status: done, paid, online | Green (OKLCH hue 150) at the lightness and chroma of the theme's `--destructive`, clamped to L 0.62–0.8 (dark) / 0.5–0.8 (light), C 0.12–0.2. Status colours of one theme then look like a set. | `rgb(20, 190, 90)` |
| `--success-foreground` | Text on success | The theme's foreground or background, whichever contrasts more (pure white/black if both are clearly worse) | `rgb(10, 10, 10)` |
| `--warning` | Caution: low fuel, about to expire | Amber (hue 75) at destructive's lightness + 0.08 (yellows need more light), same chroma | `rgb(245, 166, 0)` |
| `--warning-foreground` | Text on warning | As success-foreground | `rgb(0, 0, 0)` |
| `--info` | Neutral notices, tips | `--primary` | `rgb(229, 229, 229)` |
| `--info-foreground` | Text on info | `--primary-foreground` | `rgb(23, 23, 23)` |
| `--hud` | Surfaces drawn straight on the game: HUD chips, hotbar tiles, target eye (`nk-chip`, `nk-hud`) | `rgba(0, 0, 0, 0.45)` | `rgba(0, 0, 0, 0.45)` |
| `--hud-foreground` | Text and icons on `--hud` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` |
| `--scrim` | Darkens the game: behind full-screen screens (pause, death, loading), bar tracks and shadows drawn on the game. Always used with opacity (`bg-scrim/40`, or `color-mix(in oklab, var(--scrim) 40%, transparent)` in CSS, which the plugin lowers) | `rgb(0, 0, 0)` | `rgb(0, 0, 0)` |
| `--vital-health` | Health bar | See [vitals](#vitals) | `rgb(255, 100, 103)` (destructive) |
| `--vital-armor` | Armor bar | | `rgb(59, 156, 246)` |
| `--vital-hunger` | Hunger bar | | `rgb(247, 162, 36)` |
| `--vital-thirst` | Thirst bar | | `rgb(30, 197, 228)` |
| `--vital-stress` | Stress bar | | `rgb(204, 103, 227)` |
| `--nk-scale` | UI size multiplier, unitless (0.5–2). `html` font-size is multiplied by it, so every rem scales. The player's scale preference multiplies it again. | `1` | `1` |
| `--nk-motion` | `1` animations on, `0` off. `nk-enter` lasts `160ms × --nk-motion`; at 0 every animation and transition is off (`html[data-nk-motion="off"]`). | `1` | `1` |

### Vitals

Vitals are drawn on the game over a dark track, so they need colour that reads there and means the
right thing (health is red). For each vital, in order health → armor → hunger → thirst → stress:

1. its preferred chart slot (health `chart-1`, armor `chart-2`, hunger `chart-3`, thirst `chart-4`,
   stress `chart-5`), if that colour fits;
2. otherwise the first unused `chart-N` that fits;
3. health only: `--destructive`, if it fits;
4. otherwise a fixed colour.

"Fits" means chromatic (OKLCH C ≥ 0.06), readable on the game (L 0.45–0.93) and in the vital's hue range:

| Vital | Hue range (OKLCH °) | Fixed fallback |
|---|---|---|
| health | 345–360, 0–35 (red) | `oklch(0.68 0.21 25)` |
| armor | 200–285 (blue) | `oklch(0.68 0.16 250)` |
| hunger | 40–110 (orange, amber, yellow) | `oklch(0.78 0.16 70)` |
| thirst | 180–260 (cyan, blue) | `oklch(0.76 0.13 215)` |
| stress | 285–345 (purple, magenta) | `oklch(0.68 0.2 320)` |

So a colourful TweakCN theme colours the HUD with its own chart palette, and stock shadcn (grey charts)
still gets a red health bar instead of five grey ones. Set `--vital-*` in the theme to choose exactly.

### Identity tokens (1.1)

What makes a UI premium and recognisable is mostly not colour ([design v2](design/v2.md)). These are the
values a server sets for its own identity. Each is derived when absent, so a plain TweakCN paste gets
**Graphite**, the default identity (the last column). Invalid values fall back to the default, with a
warning naming what's allowed. Three tiers: identity → semantic (the colours above) →
[component tokens](#component-tokens-11), which are all a UI reads.

| Group | Token | What it changes | Default (Graphite) |
|---|---|---|---|
| Brand | `--brand`, `--brand-foreground` | The server's signature colour, separate from `--primary` (the action): active indicators, gauge needles and fills, focus, logos | `--primary` if chromatic (OKLCH C ≥ 0.06), else `--chart-1`; foreground: the theme's foreground or background, whichever contrasts more |
| Type | `--font-display` | Headings and big moments | `"Inter Tight", Inter, …` when `--font-sans` is the default; else `--font-sans` |
| | `--font-numeric` | Every number on a gauge, money, timer (always tabular) | `--font-sans` |
| | `--nk-type-ratio` | Step between type sizes, 1–1.6 (1.125 calm … 1.333 dramatic) | `1.2` |
| | `--nk-weight-body` / `-strong` / `-display` | Weight personality, 100–900 | `400` / `600` / `700` |
| | `--nk-tracking-display` | Letter-spacing of display type (px, rem, em) | `-0.02em` |
| | `--nk-label-case`, `--nk-tracking-label` | Captions (`nk-caption`, field labels) in `uppercase` or `none`, and their tracking | `none`, `0em` |
| Shape | `--nk-border-width` | Hairline weight of panels, rows, fields | `1px` |
| | `--nk-cut` | Chamfered corners (top left, bottom right) by `clip-path`; `0` = off. A clip-path also clips the shadow, so cut panels draw depth with their edge | `0px` |
| Surface | `--nk-surface-opacity` | Panel opacity over the game, 0–1. **Floor 0.92** (warning below) | `0.96` |
| | `--nk-surface-tint` | How much `--brand` tints the panel surface, 0–0.12 | `0.02` |
| | `--nk-surface-gradient` | Top-to-bottom light falloff on panels, 0–0.2 (0 = flat) | `0.04` |
| | `--nk-surface-edge` | Inner top highlight, the machined edge (alpha), 0–0.3 | `0.06` |
| | `--nk-elevation` | `none` / `soft` / `deep` shadow recipe | `soft` (the v1 panel shadow) |
| | `--nk-glow` | Brand glow on active rows, active chips and meter fills (alpha, 0 = off) | `0` |
| Density | `--nk-density` | Multiplies the kit's spacing step and its row, chip and header heights, 0.75–1.3 | `1` |
| Motion | `--nk-ease` | The one easing curve: `cubic-bezier()` or `ease` / `ease-out` / … (not `linear()`: Chromium 113) | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| | `--nk-duration` | Base duration (panel enter, transitions), up to 2000ms; × `--nk-motion` | `160ms` |
| HUD | `--nk-hud-opacity` | Minimum backplate opacity of HUD chips and tiles (`--hud` keeps its own alpha; the plate uses the larger) | `0.55` |
| | `--nk-hud-text-shadow` | `none` / `soft` / `strong` shadow under text on the game | `soft` |
| | `--nk-gauge-style` | `arc` / `bar` / `digital` (read by the HUD) | `arc` |
| | `--nk-gauge-track` | Gauge and meter track thickness | `0.375rem` |
| | `--nk-gauge-ticks` | Tick marks: `1` on, `0` off | `1` |
| Rows | `--nk-row-indicator` | How the active row is marked: `bar` (a brand pill), `fill` (solid brand, brand-foreground text), `outline` (a brand hairline) | `bar` |

**Derived.** Outputs the compiler adds so CSS needn't branch. A theme may set them; an `applyTheme` patch
derives them again from the patched values.

| Token | From |
|---|---|
| `--surface` | `--popover` mixed toward `--brand` by `--nk-surface-tint` (drawn at `--nk-surface-opacity`) |
| `--nk-elevation-shadow` | The `--nk-elevation` recipe in `--scrim`: none `0 0 0 0`; soft `0 0 0 1px` at .25 + `0 24px 64px -24px` at .7; deep `0 0 0 1px` .3, `0 2px 4px` .2, `0 18px 40px -10px` .55, `0 44px 96px -28px` .75 |
| `--nk-hud-shadow` | The `--nk-hud-text-shadow` recipe in `--scrim` |
| `--nk-clip`, `--nk-clip-sm` | The `polygon()` chamfer of `--nk-cut` (and of half of it), or `none` when the cut is 0 |
| `--nk-row-bar` / `-fill` / `-outline` | `1` for the chosen `--nk-row-indicator`, else `0` |

`applyTheme` also paints the keywords as attributes on `<html>`: `data-nk-row`, `data-nk-gauge`,
`data-nk-elevation`, `data-nk-label-case`, so a UI can write `html[data-nk-gauge="digital"] …`.

**Floors** (warnings, never blocking): `--nk-surface-opacity` under 0.92; HUD text (`--hud-foreground`) on
the HUD backplate (`--hud` at no less than `--nk-hud-opacity`) over a **white** sky under 4.5:1. The player's
high-contrast preference sets `--nk-surface-opacity: 1` and `--nk-hud-opacity: 0.72`.

## The compiler

```ts
import { compileTheme } from "nuikit-core";
const { vars, warnings, contrast, mode, imports, hash, version } = compileTheme(css, { mode: "dark" });
```

Input: a shadcn / TweakCN paste (`:root`, `.dark`, `[data-theme=dark]`, `@media (prefers-color-scheme: dark)`,
`@theme inline` literals, `@layer` wrappers, `@import` fonts), a DTCG document (object or JSON string), a
compiled theme, or a plain `{ primary: "#22c55e" }` object. Pure: no DOM; runs in the browser, Node and the
FXServer JS runtime.

1. **Pick the set.** Dark by default (nuikit UIs are drawn over the game): `:root` + `.dark` on top. A paste
   with no dark colours uses its light set and says so. `{ mode: "light" }` reads `:root` only.
2. **Resolve** `var(--x)` references between variables (TweakCN's `--sidebar-primary: var(--primary)`).
3. **Lower** every colour, including colours inside compound values (shadows), to `rgb()` / `rgba()`.
   Values Chromium 103 can't read and that can't be lowered (`color-mix()`, `lab()`) are replaced by the
   stock value, with a warning.
4. **Fill** missing shadcn tokens from stock neutral; **derive** the nuikit tokens (above). An explicit value
   always wins.
5. **Check contrast** (WCAG 2 ratio; translucent colours composited where they're drawn, the HUD over a
   white sky as the worst case):

| Pair | Minimum | Warning says |
|---|---|---|
| foreground on background | 4.5 | text on full-screen surfaces will be hard to read |
| popover-foreground on popover | 4.5 | text in panels will be hard to read |
| card-foreground on card | 4.5 | text on cards will be hard to read |
| primary-foreground on primary | 4.5 | text on buttons will be hard to read |
| muted-foreground on popover | 3 | secondary text in panels will be hard to read |
| hud-foreground on hud | 3 | HUD text will be hard to read over a bright sky |
| destructive on popover | 3 | errors and low values in panels won't stand out |
| success-foreground on success, warning-foreground on warning | 3 | text on badges will be hard to read |

Warnings are sentences, e.g. `primary-foreground on primary is 2.1:1 (needs 4.5:1); text on buttons will
be hard to read.` They never block a theme.

Also exported: `toDtcg(theme)`, `parseDtcg(doc)`, `themeToCss(theme)` (a `:root` block with channels),
`themeChannels(vars)`, `checkContrast(vars)`, `themeJsonSchema()`, `TOKENS` (this table as data),
`withPrefs(vars, prefs)`.

DTCG mapping: `color.<token>` (sRGB `components` 0–1, `alpha`, `hex`; `oklch` colour space and
`{color.x}` aliases are read too), `radius` (dimension), `font.sans` / `font.mono` / `font.display` /
`font.numeric` (fontFamily), `nk.<name>` per type: number, dimension (`{ value, unit }`), duration,
cubicBezier, and keywords as a string `$value` with `$extensions["dev.nuikit"].type: "keyword"` (DTCG has no
string type). Derived tokens are left out (compiling the file derives them again).
`$extensions["dev.nuikit"]` carries `tokens`, `revision`, `mode` and `imports`.

## Distribution

One path, compiled once:

```
nuikit/theme.css ──(server/main.js: compileTheme, warnings → server console)──► GlobalState.nuikitTheme
                                                                                 { version, mode, hash, vars, imports }
  ├─ nuikit.lua (every [nuikit] system and nuikit-built resource)
  │    nuikit:ready → SendNUIMessage nuikit:theme; state bag change → nuikit:theme again (live)
  ├─ nuikit client.lua: NUI callback https://nuikit/theme → override pages (ox_lib, ox_inventory…) and
  │    the chat theme fetch it, then long-poll it; it answers when the theme or the player's prefs change
  └─ nuikit_loading server: sends it in the connection handover
```

- `nuikit theme reload` (server console, or players with the ace `command.nuikit`; `/nuikit theme reload`
  in game forwards to the server) re-reads `theme.css` and republishes: every open nuikit UI repaints at once,
  override pages within one long-poll, the loading screen from the next connection. No restarts.
- `nuikit theme` prints the contrast table and warnings.
- Fallbacks: if the server couldn't compile (or runs an older nuikit resource), UIs get the raw
  `theme.css` and compile it themselves with the same compiler. Without the `nuikit` resource, every UI keeps
  its built-in stock theme (`index.css`, which carries the same defaults as above).
- Server exports: `exports.nuikit:getTheme()`, `exports.nuikit:reloadTheme()`.

## Player preferences

Accessibility, per player, never a different theme. Stored in the `nuikit` resource's KVP and applied to
every nuikit UI and override:

| Pref | Values | Effect |
|---|---|---|
| `scale` | 0.85–1.25 (default 1) | `--nk-scale` = theme scale × this |
| `reducedMotion` | boolean | `--nk-motion: 0`: no animations or transitions |
| `highContrast` | boolean | Panel/surface text pure white or black, muted text ≥ 7:1, borders at 35% text colour, `--hud` at 72% black; `data-nk-contrast="high"` on `<html>` |

- Players: `/nuikit` (show), `/nuikit scale 1.1`, `/nuikit motion off`, `/nuikit contrast on`, `/nuikit reset`.
- Lua (any resource with nuikit.lua): `NUI.prefs.get()`, `NUI.prefs.set({ scale = 1.1 })`; client exports
  `exports.nuikit:getPrefs()` / `setPrefs(patch)`; local event `nuikit:prefs:changed (prefs)`.
- UI: `getPrefs()`, `setPrefs()` and the `nuikit:prefs` message (nuikit-core applies it).

## Component tokens (1.1)

Defined once in `packages/create-nuikit/kit.css` (`:root`) and inlined into every UI's `index.css`. Each is a
formula over identity and semantic tokens. The kit utilities (`nk-*`) and the stock shadcn parts the kit
dresses (`[data-slot=kbd]`, `[data-slot=button]`, `[data-slot=progress]`) read only these. Override any of
them in `theme.css` for a detail (the compiler passes unknown variables through): Signal sets
`--nk-heading-case: uppercase` and `--nk-chip-radius: 0.125rem`; Vector sets `--nk-meter-segments: 1` and
`--nk-caption-font: var(--font-numeric)`. Every `var()` carries the Graphite default as its fallback, so a
page whose theme predates 1.1 still renders.

| Part | Tokens (formula) |
|---|---|
| Scale | `--nk-space` (`0.25rem × density`, the kit's spacing step; Tailwind's own spacing isn't scaled, so layouts keep their size) · `--nk-text-base` (`1rem`: 16px body, research §3) · `--nk-text-label` (`max(0.8125rem, base ÷ ratio)`: 13px+) · `--nk-hud-value-size` (`max(1.125rem, base × ratio)`: 18px+ for HUD values) · `--nk-text-title` (`base × (1 + (ratio − 1) ÷ 2)`, ≈ base × √ratio) · `--nk-text-section` (`base × ratio²`) · `--nk-text-display` (`base × ratio⁴ × 1.1`: 36px in Graphite) · `--nk-time` (`duration × motion`) · `--nk-ease-out` |
| Panel | `--nk-panel-bg` (`--surface` channels at `alpha × --nk-surface-opacity`) · `-fg` · `-border` · `-radius` (`radius + 4px`) · `-cut` · `-clip` · `-gradient` (`--popover-foreground` at `--nk-surface-gradient`, fading out by 60%) · `-edge` (`inset 0 1px 0` at `--nk-surface-edge`) · `-shadow` (`--nk-elevation-shadow`) · `-header-height` (`3.25rem × density`) · `-header-padding` · `-body-padding` · `-divider` · `-bracket` (corner brackets, `0px` = off; Vector `0.875rem`) / `-bracket-width` / `-bracket-color` (`--brand`) |
| Heading | `--nk-heading-font` (`--font-display`) · `-size` · `-weight` (`--nk-weight-strong`) · `-tracking` (display tracking ÷ 2) · `-case` (`none`) · `--nk-display-size` / `-weight` / `-tracking` / `-case` |
| Label, caption, numbers | `--nk-label-font` / `-size` / `-weight` (`nk-label`, always as written: it often carries a sentence) · `--nk-caption-font` / `-size` / `-weight` / `-transform` (`--nk-label-case`) / `-tracking` · `--nk-num-font` (`--font-numeric`) / `-tracking` |
| Row | `--nk-row-height` (`2.75rem × density`) · `-radius` · `-clip` (`--nk-clip-sm`) · `-padding` · `-font-size` · `-indicator-color` (`--brand`) · `-bar-width` (`3px × --nk-row-bar`) · `-bar-inset` · `-fill-color` (`--brand`) / `-fill-foreground` · `-outline-width` (`border × --nk-row-outline`) / `-outline-color` · `-glow` |
| Key (Kbd) | `--nk-key-bg` · `-fg` · `-border` · `-radius` · `-font` (`--font-numeric`) · `-weight` · `-shadow` (a keycap: dark bottom edge, light top edge) · `-clip` |
| Chip, HUD tile | `--nk-chip-height` (`2rem × density`) · `-padding` · `-radius` (pill) · `-bg` (`--hud` at `max(hud alpha, --nk-hud-opacity)`) · `-fg` · `-font-size` · `-weight` · `-active-bg` / `-active-fg` (`--brand`) · `-glow` · `-clip` · `--nk-hud-radius` · `--nk-hud-text-shadow` |
| Meter | `--nk-meter-height` · `-radius` · `-track` (`--scrim` at 35%) · `-glow` · `-segments` (`0` / `1`) · `-segment` (`0.5rem`) · `-gap` |
| Gauge | `--nk-gauge-width` (`--nk-gauge-track`) · `-sweep` (`270deg`) · `-track-color` · `-fill` / `-needle` (`--brand`) · `-redline` (`--destructive`) · `-tick` / `-tick-major` (× `--nk-gauge-ticks`) · `-font` (`--font-numeric`) · `-glow` |

The active row (`nk-row` with `[data-active]`, `:focus-visible`, `[data-highlighted]`, or hover on rows that
highlight on hover) carries the indicator. `fill` keys off `html[data-nk-row="fill"]`, because a colour
swap can't be computed from a number in CSS. New utility: `nk-caption`, the short name of a value (Fuel,
Balance), in the identity's label case. `nk-label` stays as written.

Text size outside the kit: synced `index.css` raises Tailwind's two small steps (`text-xs` 13px,
`text-sm` 15px) for readability at 1080p; `text-base` and up are Tailwind's.

## Identities

Four complete `theme.css` files, each a finished identity on its own: `packages/core/themes/`, shipped as
`nuikit-core/themes/*.css` and in the nuikit resource's `themes/`. Copy one over `nuikit/theme.css`, run
`nuikit theme reload`, then tune it. The same screens in all four: `bench/identity/shots/`.

| Identity | Character | What sets it apart |
|---|---|---|
| **Graphite** (default) | Precise, calm, neutral | Stock neutral colours; Inter, Inter Tight, Geist Mono; soft elevation with a machined edge; a brand pill on the active row; arc gauges. Exactly what a plain paste compiles to |
| **Signal** | Bold and street | Signal yellow on warm black; Barlow, with Barlow Condensed for display and numbers; ratio 1.333; uppercase captions and headings; 0.75rem chamfers on panels, rows, chips and buttons; flat and opaque, with a 3px brand edge on top (`--nk-panel-edge`); solid square `fill` rows; density 0.95; a strong HUD shadow; bar gauges; 120ms snap |
| **Velvet** | Soft, warm, luxury | Champagne on aubergine; DM Sans, with Fraunces for display and numbers; 1rem radius; strong gradient and edge, deep elevation, a hint of glow; roomy (density 1.15); a solid champagne pill on the active row (`fill`, `--nk-row-radius: 9999px`); 240ms smooth ease |
| **Vector** | Tactical instrument | Cyan on blue-black; IBM Plex Sans, Chakra Petch display, JetBrains Mono numbers and captions; cyan hairlines and corner brackets (`--nk-panel-bracket`); flat, with a cyan halo instead of a shadow; `outline` rows; segmented meters; glow 0.35; compact (0.85); digital gauges |

## Fonts

Identity fonts are open (SIL OFL 1.1) woff2 files, latin subset (`unicode-range`; other scripts fall back
down the stack to system fonts): Inter, Inter Tight, Geist Mono, Barlow, Barlow Condensed, Fraunces, DM Sans,
IBM Plex Sans, Chakra Petch, JetBrains Mono. Single source: `packages/core/fonts/` (`fonts.json` lists
family, file, weights, identity and licence). Never a Google Fonts URL at runtime. `pnpm sync` writes the
`@font-face` rules into every UI's `index.css`, per UI (`nuikit.json` `"fonts"`, or `NUIKIT_FONTS`):

| Mode | Where the files come from | Used by |
|---|---|---|
| `bundle` (default) | The UI's own build (`../node_modules/nuikit-core/fonts/…`, emitted as assets): about 460 KB per UI | systems, ox_lib, ox_target, mm_radio, Renewed-Banking |
| `graphite` | Graphite's fonts in the build (inlined where the build has a fixed file list); the rest from the nuikit resource | overrides whose resource serves a fixed file list: ox_inventory, illenium-appearance, qbx_* |
| `nuikit` | All from the nuikit resource: `https://cfx-nui-nuikit/fonts/…`, then `nui://nuikit/fonts/…` (`fonts/*.woff2` in its fxmanifest `files`) | opt-in until the in-game check passes |
| `false` | None | UIs that bring their own fonts |

A font that fails to load falls back down its family's stack; nothing breaks. Whether one resource's page
can load fonts from the nuikit resource (CORS on `cfx-nui-*` origins) is unproven until tested in game
(`bench/identity/results.md`). If it works, `nuikit` becomes the default and every UI drops about 460 KB.
A theme that names another font (`--font-sans: Outfit`) still loads it the v1 way, from its `@import`.

## Using the tokens

- Read colours only from tokens (`docs/design.md`). Status: `success` / `warning` / `info` / `destructive`.
  On the game: `hud` / `hud-foreground` (or `nk-chip`, `nk-hud`). Vitals: `vital-*` (`<Vital tone="health">`).
- In inline styles use `var(--token)`; never `oklch()` or `color-mix()` (Chromium 103).
- A page nuikit.lua can't message (an override): `loadServerTheme()` from nuikit-core.
