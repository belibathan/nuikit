# nuikit tokens v1 (revision 1.5)

The theme contract every nuikit UI reads. A server's theme is any shadcn / TweakCN paste in
`nuikit/theme.css`; the compiler (`compileTheme` in `nuikit-core`) turns it into this exact set of
CSS variables, so a UI built on the tokens matches every server it runs on.

- **Version:** tokens v1 (`TOKENS_VERSION = 1`), revision 1.4 (`TOKENS_REVISION`, `revision` on a compiled
  theme). Adding a token keeps v1; renaming or removing one is v2. 1.4 added the [foundation](#foundation-14) (treatment, roles, materials, behaviour…); 1.2 the [motion tokens](#motion-12)
  (additive). 1.1 added the
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
| `--hud-foreground` | Text and icons on `--hud` | `--world-foreground` (1.1; [text on the game](#text-on-the-game)) | `rgb(255, 255, 255)` |
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

What makes a UI premium and recognisable is mostly not colour ([design v2](archive/design-v2.md)). These are the
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
| | `--nk-label-case`, `--nk-tracking-label` | Captions (`nk-caption`, field labels) in `uppercase` or `none`, and their tracking | `uppercase`, `0.06em` |
| Shape | `--nk-border-width` | Hairline weight of panels, rows, fields | `1px` |
| | `--nk-cut` | Chamfered corners (top left, bottom right) by `clip-path`; `0` = off. A clip-path also clips the shadow, so cut panels draw depth with their edge | `0px` |
| | `--nk-display-style` | `normal` or `italic` (tokens 1.3): display, heading, title, numeric and key-cap text (`nk-display`, `nk-title`, `nk-num`, `Kbd`, HUD numerics). A real italic face where one ships (Barlow Condensed 700–900 italic) | `normal` |
| | `--nk-skew` | An angle, at most ±20deg (tokens 1.3): chips, badges, key caps, the primary button and the selected row are drawn as skewed slabs (a skewed `::after` behind upright text; painted as `html[data-nk-skew]`), and the HUD vital chips skew their whole drawing so the traced level stays on the edge. `0deg` = off | `0deg` |
| | `--nk-pause-style` | `sheet` or `slash` (tokens 1.3): the pause menu as the full-height sheet, or a light panel with a diagonal edge into the scene (Street); painted as `html[data-nk-pause]` | `sheet` |
| | `--nk-pause-surface`, `--nk-pause-ink` | The slash panel's light surface and its text | `rgb(246, 247, 249)`, `rgb(14, 16, 20)` |
| | `--nk-ring-stroke`, `--nk-ring-band`, `--nk-ring-band-opacity` | Optional HUD tokens: the minimap ring's inner stroke and its outer band (with skew, cardinals become skewed tags and N a light slab) | the HUD's ink, the scrim |
| Surface | `--nk-surface-opacity` | Panel opacity over the game, 0–1. **Floor 0.92** (warning below) | `0.96` |
| | `--nk-surface-tint` | How much `--brand` tints the panel surface, 0–0.12 | `0.02` |
| | `--nk-surface-gradient` | Top-to-bottom light falloff on panels, 0–0.2 (0 = flat) | `0` |
| | `--nk-surface-edge` | Inner top highlight, the machined edge (alpha), 0–0.3 | `0.06` |
| | `--nk-elevation` | `none` / `soft` / `deep`, `hard` (a solid offset drop, no blur; tokens 1.3) shadow recipe | `soft` (a hairline and a short, tight drop) |
| | `--nk-glow` | Brand glow on active rows, active chips and meter fills (alpha, 0 = off) | `0` |
| Density | `--nk-density` | Multiplies the kit's spacing step and its row, chip, slab and header heights, 0.75–1.3. Never text size: reading text stays 16px | `0.875` (compact) |
| Motion | `--nk-ease` | The one easing curve: `cubic-bezier()` or `ease` / `ease-out` / … (not `linear()`: Chromium 113) | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| | `--nk-duration` | Base duration (panel enter, transitions), up to 2000ms; × `--nk-motion` | `140ms` |
| HUD | `--nk-hud-opacity` | Minimum backplate opacity of HUD chips and tiles (`--hud` keeps its own alpha; the plate uses the larger) | `0.55` |
| | `--nk-hud-text-shadow` | `none` / `soft` / `strong` shadow under text on the game | `soft` |
| | `--nk-gauge-style` | `arc` / `bar` / `digital` (read by the HUD) | `arc` |
| | `--nk-gauge-track` | Gauge and meter track thickness | `0.25rem` |
| | `--nk-gauge-ticks` | Tick marks: `1` on, `0` off | `1` |
| Rows | `--nk-row-indicator` | How the active row is marked: `bar` (a brand pill), `fill` (solid brand, brand-foreground text), `outline` (a brand hairline) | `bar` |

**Derived.** Outputs the compiler adds so CSS needn't branch. A theme may set them; an `applyTheme` patch
derives them again from the patched values.

| Token | From |
|---|---|
| `--surface` | `--popover` mixed toward `--brand` by `--nk-surface-tint` (drawn at `--nk-surface-opacity`) |
| `--nk-elevation-shadow` | The `--nk-elevation` recipe in `--scrim`: none `0 0 0 0`; soft `0 0 0 1px` at .25 + `0 12px 32px -16px` at .6; deep `0 0 0 1px` .3, `0 2px 4px` .2, `0 18px 40px -10px` .55, `0 44px 96px -28px` .75 |
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
2. **Resolve** `var(--x)` references between variables (TweakCN's `--sidebar-primary: var(--primary)`). A token
   that is empty (`--primary: ;`) or an alias that leads nowhere (`var(--nope)`, or to an empty token) would
   paint nothing: it gets the stock value with a warning (`--primary is empty; the stock value is used.`), and a
   `var(--x, fallback)` pointing at it takes its fallback, as in CSS. In a patch (`partial`) it is left out.
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
- `loadServerTheme` (override pages) reads `nuikit/theme.css` only as a **stand-in** while the `https://nuikit/theme`
  callback hasn't answered (ox_lib starts before `nuikit`). That file is the client's copy from when `nuikit` last
  started: editing it and running `nuikit theme reload` changes GlobalState, not the copy, so it refreshes only when
  `nuikit` restarts. GlobalState through the callback is the live path; the page keeps asking until it answers.
- Server exports: `exports.nuikit:getTheme()`, `exports.nuikit:reloadTheme()`, `exports.nuikit:getContext()`
  (`{ currency, locale }`, see `protocol.md` §7.2).

## Player preferences

Accessibility, per player, never a different theme. Stored in the `nuikit` resource's KVP and applied to
every nuikit UI and override:

| Pref | Values | Effect |
|---|---|---|
| `scale` | 0.85–1.25 (default 1) | `--nk-scale` = theme scale × this |
| `reducedMotion` | boolean | Reduced motion (1.2): `data-nk-motion="reduced"`, no movement, fades kept at ≤ 100 ms ([Motion](#motion-12)). `--nk-motion` is painted as 0, as before, so legacy `calc(× --nk-motion)` stays instant |
| `highContrast` | boolean | Panel/surface text pure white or black, muted text ≥ 7:1, borders at 35% text colour, `--hud` at 72% black; `data-nk-contrast="high"` on `<html>` |

- Players: `/nuikit` (show), `/nuikit scale 1.1`, `/nuikit motion off`, `/nuikit contrast on`, `/nuikit reset`.
- Lua (any resource with nuikit.lua): `NUI.prefs.get()`, `NUI.prefs.set({ scale = 1.1 })`; client exports
  `exports.nuikit:getPrefs()` / `setPrefs(patch)`; local event `nuikit:prefs:changed (prefs)`.
- UI: `getPrefs()`, `setPrefs()` and the `nuikit:prefs` message (nuikit-core applies it).

## Motion (1.2)

Design v2 §5A, spec in `docs/archive/design-research/motion.md` (on `main`). Two identity inputs, the rest
derived from `--nk-duration` (d) and `--nk-ease`. The compiler writes **literal** values, so nothing relies on
`calc()` on a `<time>` inside an animation shorthand in Chromium 103.

**Inputs (identity):**

| Token | Values | Default | Meaning |
|---|---|---|---|
| `--nk-motion-feel` | `crisp` `snap` `smooth` `stepped` | `crisp` | How the identity moves. Painted as `html[data-nk-feel]`. snap: selection jumps, press flashes (no scale). smooth: longer springs, smooth stagger. stepped: bar fills tick in steps, press flashes |
| `--nk-spring-bounce` | 0–0.3 | 0 | Bounce folded into the snap, move and soft springs |

**Derived** (Graphite values, d = 140 ms):

| Token | Formula | Graphite | Use |
|---|---|---|---|
| `--nk-motion-move` | 1, or 0 under reduced or off | 1 | Multiply movement distances in your own CSS by it |
| `--nk-time-instant` | 0 | 0ms | Keyboard and controller selection, held key-repeat |
| `--nk-time-press` | 0.5 × d, 50–100 ms | 70ms | Press, toggle, key-chip flash |
| `--nk-time-hover` | 0.75 × d | 105ms | Pointer hover colour |
| `--nk-time-base` | d | 140ms | Panel enter, indicator, tab switch (kit.css `--nk-time`) |
| `--nk-time-exit` | 0.7 × d | 98ms | Every exit |
| `--nk-time-move` | 1.5 × d, ≤ 300 | 210ms | Toasts in, FLIP, meters gaining |
| `--nk-time-modal` | 1.25 × d | 175ms | Dialog enter (inner wrapper) |
| `--nk-time-screen` | 2.5 × d, ≤ 400 | 350ms | Full-screen enter |
| `--nk-time-ambient` | fixed | 400ms | HUD show-on-change fades, damage trail |
| `--nk-stagger` | 0.15 × d ≤ 20 (snap 0.125 × d; smooth 0.125 × d ≤ 30) | 20ms | Per item, first open only |
| `--nk-stagger-max` | fixed | 100ms | Total stagger cap |
| `--nk-ease-out` | `--nk-ease` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Enter, hover |
| `--nk-ease-in` | fixed | `cubic-bezier(0.4, 0, 1, 1)` | Exit |
| `--nk-ease-in-out` | fixed | `cubic-bezier(0.2, 0, 0, 1)` | On-screen moves |
| `--nk-ease-emphasized` | fixed | `cubic-bezier(0.05, 0.7, 0.1, 1)` | Full-screen, big moments |
| `--nk-ease-linear` | fixed | `linear` | Progress, countdowns, needles |
| `--nk-spring-snap` / `-move` / `-soft` / `-pop` | period × feel ratio, bounce | `160ms 0` / `240ms 0.1` / `360ms 0` / `260ms 0.3` | Springs as `<duration> <bounce>`, run by `nuikit-core/motion` (mass 1, k = (2π/T)², c = 4π(1 − bounce)/T) |

Identities: Graphite crisp (140 ms; springs 160/240/360), Signal snap (120 ms; 130/200/300, stagger 15 ms),
Velvet smooth (240 ms, bounce 0.1; 260/340/420, pop 360, stagger 30 ms), Vector stepped (140 ms; 140/200/300).
The compiler warns above `--nk-duration: 260ms`.

**Levels** (`html[data-nk-motion]`, painted by `applyTheme`; the prefs message is unchanged):

| Level | From | Times | Movement |
|---|---|---|---|
| `on` | default | as compiled | yes |
| `reduced` | the player's `reducedMotion` pref (and the OS `prefers-reduced-motion`, in kit.css and the helper) | every `--nk-time-*` clamped to ≤ 100 ms, stagger 0 | none: `--nk-motion-move: 0`; kit utilities fall back to fades; shadcn's tw-animate slides, zooms and spins are zeroed |
| `off` | the theme's `--nk-motion: 0` | 0 ms | none; every CSS animation and transition is 0 s |

Timed runs (progress lines and rings, the skill-check needle, notice timer bars) play at every level:
progress is information.

**`nuikit-core/motion`** (no dependencies; 2.0 kB min+gz for everything, 1.8 kB for `spring` + `flip` + `timed`,
0.2 kB for `timed` alone):
`spring(el, channel, to, { from, preset, velocity })` (channels `x` `y` `scale` `rotate` `opacity`; retargets a
running spring from its analytic value and velocity), `flip(els, mutate)` / `flipFrom(els, prev)`,
`timed(el, keyframes, ms, { startedAt })`, `stagger(i)`, `indicator(el)` (the key-repeat rule),
`motionLevel()`, `springOf()`, `springValues()`. Springs are sampled at 60 Hz into linear WAAPI keyframes;
finished animations write their end value inline and cancel, so nothing stays running. One transform channel
per element (a spring on `y` and a FLIP on the same element overwrite each other).
React (`nuikit-core/react`): `useSpring(ref, value, channel, preset)`, `useFlip(ref, deps)`,
`useIndicator(listRef, indicatorRef, active)`. No React state is set while anything animates.

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
| Panel | `--nk-panel-bg` (`--surface` channels at `alpha × --nk-surface-opacity`) · `-fg` · `-border` · `-radius` (`--radius`; Velvet `radius + 4px`) · `-cut` · `-clip` · `-gradient` (`--popover-foreground` at `--nk-surface-gradient`, fading out by 60%) · `-edge` (`inset 0 1px 0` at `--nk-surface-edge`) · `-shadow` (`--nk-elevation-shadow`) · `-header-height` (`3.25rem × density`) · `-header-padding` · `-body-padding` · `-divider` · `-bracket` (corner brackets, `0px` = off; Vector `0.875rem`) / `-bracket-width` / `-bracket-color` (`--brand`) |
| **Studio** | Clean, modern, professional | Indigo on a cool near-black; Inter, Inter Tight display, Geist Mono numbers; translucent glass panels (0.93) with a faint gradient and top-edge highlight, deep soft elevation, a hint of glow; 0.75rem radius, soft filled pills on the active row; sentence-case labels; density 1; thin tickless arc gauges; 180ms smooth ease |
| Heading | `--nk-heading-font` (`--font-display`) · `-size` · `-weight` (`--nk-weight-strong`) · `-tracking` (display tracking ÷ 2) · `-case` (`none`) · `--nk-display-size` / `-weight` / `-tracking` / `-case` |
| Label, caption, numbers | `--nk-label-font` / `-size` / `-weight` (`nk-label`, always as written: it often carries a sentence) · `--nk-caption-font` / `-size` / `-weight` / `-transform` (`--nk-label-case`) / `-tracking` · `--nk-num-font` (`--font-numeric`) / `-tracking` |
| Row | `--nk-row-height` (`2.75rem × density`) · `-radius` · `-clip` (`--nk-clip-sm`) · `-padding` · `-font-size` · `-indicator-color` (`--brand`) · `-bar-width` (`3px × --nk-row-bar`) · `-bar-inset` · `-fill-color` (`--brand`) / `-fill-foreground` · `-outline-width` (`border × --nk-row-outline`) / `-outline-color` · `-glow` |
| Key (Kbd) | `--nk-key-bg` · `-fg` · `-border` · `-radius` · `-font` (`--font-numeric`) · `-weight` · `-shadow` (a keycap: dark bottom edge, light top edge) · `-clip` |
| Chip, HUD tile | `--nk-chip-height` (`2rem × density`) · `-padding` · `-radius` (`max(4px, radius − 4px)`, a small rounded rect; Velvet sets a pill) · `-bg` (`--hud` at `max(hud alpha, --nk-hud-opacity)`) · `-fg` · `-font-size` · `-weight` · `-active-bg` / `-active-fg` (`--brand`) · `-glow` · `-clip` · `--nk-hud-radius` (`max(4px, radius − 2px)`) · `--nk-hud-text-shadow` |
| Meter | `--nk-meter-height` (`--nk-gauge-track`) · `-radius` · `-track` (`--scrim` at 35%) · `-glow` · `-segments` (`0` / `1`) · `-segment` (`0.5rem`) · `-gap` |
| Gauge | `--nk-gauge-width` (`--nk-gauge-track`) · `-sweep` (`270deg`) · `-track-color` · `-fill` / `-needle` (`--brand`) · `-redline` (`--destructive`) · `-tick` / `-tick-major` (× `--nk-gauge-ticks`) · `-font` (`--font-numeric`) · `-glow` |
| Slab | See [slabs](#slabs) |

The active row (`nk-row` with `[data-active]`, `:focus-visible`, `[data-highlighted]`, or hover on rows that
highlight on hover) carries the indicator. `fill` keys off `html[data-nk-row="fill"]`, because a colour
swap can't be computed from a number in CSS.

### Display and caption

Two utilities for the type at the ends of the scale. Lanes adopt them so the identity shows where it matters:

| Utility | What it's for | Reads | Graphite |
|---|---|---|---|
| `nk-display` | One big moment per screen: the death title and timer, the bank balance, the pause title, the loading server name | `--nk-heading-font` (`--font-display`), `--nk-display-size` (`base × ratio⁴ × 1.1`), `-weight` (`--nk-weight-display`), `-tracking` (`--nk-tracking-display`), `-case` (`--nk-heading-case`) | Inter Tight 700, 36px, −0.02em |
| `nk-caption` | The short name of a value, one to three words: stat and meter labels (Fuel, Cash, Voice), table headings, "Balance" over `nk-display` | `--nk-caption-font` / `-size` (`max(13px, base ÷ ratio)`) / `-weight` / `-transform` (`--nk-label-case`) / `-tracking` (`--nk-tracking-label`), `--muted-foreground` | Inter 500, 13px, uppercase, 0.06em |

`nk-label` is the other small style: secondary text **as written** (descriptions, meta lines, sentences),
never uppercased. Reading text (rows, slab text, body) stays at 16px in every identity; compactness comes
from `--nk-density` (spacing, row and header heights) and grouping, never from smaller text.

### Slabs

Transient feedback on the game ([design v2 §4.5](archive/design-v2.md)): one anatomy for every script, so a new
script looks native. Slabs sit on the game, so by default they wear the HUD plate (`--nk-chip-bg`) and
the chip's radius and clip. Components (`notice`, `key-prompt`, `task-progress`, the death band) build on
these; a UI can also use the utilities directly.

| Anatomy | Markup |
|---|---|
| Item add/remove: icon tile + name + delta | `<div class="nk-slab"><span class="nk-slab-tile"><Icon/></span>Water bottle<span class="nk-slab-delta">+2</span></div>` (`data-delta="down"` for a loss) |
| Prompt: key chip + verb | `<div class="nk-slab"><kbd class="nk-slab-key">E</kbd>Clean dishes</div>` |
| Progress: label + thin line + cancel key | `<div class="nk-slab-stack"><div class="nk-slab-stack-row"><span class="nk-caption">Repairing</span><kbd class="nk-slab-key">Esc</kbd>Cancel</div><div class="nk-slab-line" style="--nk-slab-progress: 0.4"></div></div>` |
| Full-width band | `<div class="nk-slab-band" style="--nk-slab-tone-rgb: var(--destructive-rgb)"><p class="nk-slab-band-title">You are incapacitated</p><p class="nk-caption">Wait for EMS</p></div>` |

| Part | Tokens (formula) |
|---|---|
| Slab | `--nk-slab-height` (`2.5rem × density`: 35px in Graphite) · `-padding` · `-gap` · `-radius` (`--nk-chip-radius`) · `-clip` (`--nk-chip-clip`) · `-bg` (`--nk-chip-bg`) · `-fg` (`--hud-foreground`) · `-border` (a `--hud-foreground` hairline at 8%) · `-font-size` (`--nk-text-base`, 16px) · `-weight` (`--nk-weight-strong`) · `-text-shadow` (`none`) |
| Tone | `--nk-slab-tone-rgb` (channels; `--brand-rgb`): the line's fill, the band's tint and edges. Set it on any ancestor per state; the utilities resolve it where they draw, so the override reaches them |
| Tile | `--nk-slab-tile-size` (slab height − 2 spacing steps) · `-bg` (`--hud-foreground` at 10%) · `-fg` · `-radius` |
| Delta | `--nk-slab-delta-font` (`--nk-num-font`, tabular) · `-up` (`--success`) · `-down` (`--destructive`) |
| Key | `--nk-slab-key-size` (`1.5rem`) · `-font-size` (`13px`); colours, radius, shadow and font from the [key tokens](#component-tokens-11) |
| Line | `--nk-slab-line-height` (`3px`) · `-radius` (`--nk-meter-radius`) · `-track` · `-fill` (unset: the tone) · `--nk-slab-stack-width` (`20rem`) · `-stack-gap`; the fill moves by `transform: scaleX(--nk-slab-progress)`, so it never repaints the slab |
| Band | `--nk-slab-band-padding` · `-gap` · `-bg` (`--scrim` at 62%) · `-tint` (tone alpha, `0.3`) · `-edge` (tone alpha of the top and bottom hairlines, `0.6`) · `-fg` (`--hud-foreground`) · `-title-size` (`--nk-text-section`); the title is `nk-slab-band-title` (display face, weight, tracking and case) |

The specimen (`bench/identity/specimen/`, the `slabs` row of every contact sheet) shows all four in each
identity.

### Flexibility

Tokens encode qualities (density, shape, surface, type, motion), never one server's look, and nothing
in the kit hardcodes Graphite: every utility reads a component token, and every identity token it reads
carries the Graphite default only as a fallback. So one `theme.css` can take the kit somewhere Graphite
isn't, with no kit or component code changes. The check is
[`packages/core/test/themes/daylight.css`](../packages/core/test/themes/daylight.css), light, roomy and
round:

```css
:root {
  --background: oklch(0.985 0.004 85);   /* light colours, a blue brand … */
  --primary: oklch(0.52 0.19 262);
  --radius: 1.25rem;                      /* round */
  --font-sans: "DM Sans", ui-sans-serif, system-ui, sans-serif;
  --nk-density: 1.25;                     /* roomy */
  --nk-label-case: none;                  /* captions as written */
  --nk-elevation: deep;
  --nk-row-indicator: fill;
  --nk-chip-radius: 9999px;               /* a component detail: pills */
}
```

`identity.test.ts` ("flexibility") compiles it with no warnings and asserts that every quality differs
from Graphite, and that every identity fallback in `kit.css` equals the compiled Graphite default. The
`daylight` contact sheet (`bench/identity/shots/daylight.jpg`) shows the same shipped screens in it.

**What it found, and the fix.** The first Daylight run showed death and HUD text dark on a dark game:
text drawn straight on the game shared `--foreground` / `--hud-foreground` with text on surfaces. That's
why [text on the game](#text-on-the-game) has its own tokens now; Daylight sets nothing for the game layer,
and death and the HUD read.

### Text on the game

Text and icons drawn straight on the world, with no panel behind them (the death title and timer, unplated
HUD values, street names, labels over the scene), have their own tokens (1.1). They are **light in every
theme, light or dark**: a light theme changes the panels, not the game.

| Token | Used for | Derived default |
|---|---|---|
| `--world-foreground` | Text and icons on the game | `rgb(255, 255, 255)`, whatever the theme's mode |
| `--world-foreground-muted` | Secondary text on the game | `--world-foreground` at 80% (3.1:1 on a mid-grey frame) |
| `--world-shadow` | The text-shadow that keeps it legible over any frame | `0 1px 2px rgba(0,0,0,.65), 0 0 0.5rem rgba(0,0,0,.35)` (black: it shades the game, not the theme) |
| `--world-success` (1.3) | A gain on the game or the HUD plate (the slab delta `+2`) | `--success`, OKLCH lightness raised to 0.7 (a light theme's success is dark, for its panels) |
| `--world-destructive` (1.3) | A loss on the game or the HUD plate (`−1`) | `--destructive`, lightness raised to 0.7 |

- `--hud-foreground` (text on HUD plates) now defaults to `--world-foreground`. A theme with light HUD
  plates sets `--hud-foreground` dark itself; unplated HUD text should then read `--world-foreground`.
- **Floor** (warning, never blocking): a theme that sets `--world-foreground` or `-muted` darker than a
  mid-grey frame (`#808080`), or under 3:1 against it, gets a warning. High contrast sets them to pure white
  and white at 85%.
- **Tailwind:** `text-world-foreground`, `text-world-foreground-muted`.
- **`nk-on-game`** (kit utility): marks a subtree as drawn on the game. Inside it, `--foreground` and
  `--muted-foreground` (and their channels) are the world's, `--background` is the game (the scrim
  colour, so `bg-foreground text-background` keycaps invert correctly), and text carries `--world-shadow`.
  An `nk-panel` inside restores the theme's colours.
- **Whole page:** `"surface": "world"` in a system's `nuikit.json` makes `pnpm sync` write
  `body { @apply nk-on-game }` into its `index.css`. `nuikit_death` and `nuikit_hud` declare it, so their
  existing `text-foreground` classes read the world colour with no source change. Lanes adopt
  `text-world-foreground` / `nk-on-game` directly in new code.

Text size outside the kit: synced `index.css` raises Tailwind's two small steps (`text-xs` 13px,
`text-sm` 15px) for readability at 1080p; `text-base` and up are Tailwind's.

## Foundation (1.4)

Tokens 1.4 ([design/foundation.md](design/foundation.md)) split an identity into **palette** and
**treatment**, and add the families game UIs need beyond colour. All additive and all defaulted: every theme
compiles every 1.3 token to the same value (`test/fixtures/compiled-1.3.json` pins it). Names are in
`FOUNDATION_TOKENS` (nuikit-core), the DTCG file and the schema.

| Family | Tokens | Default | Notes |
|---|---|---|---|
| **Treatment** | `--nk-treatment: soft \| glass \| plate \| slab \| tile` (tile: 1.5, [Default theme levers](#ink-levers-15)) | `soft` | A preset that fills material, stroke, type, focus and motion tokens *under* the theme's own values (`TREATMENT_PRESETS`). `soft` is empty: today's defaults. Painted as `html[data-nk-treatment]` |
| **States** | `--nk-focus-style` (ring, halo, tint, fill, invert, bar), `--nk-hold-style` (bar, ring, fill), `--nk-confirm-scale`, `--nk-level-style` (bar, ring, liquid, slab, pips) | ring, bar, 1.04, bar | One focus style for every component; components draw `data-state="rest\|focus\|hold\|confirm\|disabled\|alert"` and read `--level` (0–1). Painted as `data-nk-focus`, `-hold`, `-level` |
| **Roles** | `--role-<name>` (+ derived `-deep`, `-light`), `--nk-hue-{line,tint,glow,alert}` alphas | vitals = today's `vital-*`; stamina → success, oxygen → info; status = info, success, warning, destructive; factions and rarity fixed hues; brand; neutral = muted-foreground | `data-hue="<role>"` on any element gives its subtree `--hue-solid`, `-deep`, `-line`, `-tint`, `-glow`, `-alert`, `-grad-a`, `-grad-b` (kit.css). Sets: vitals (health, armor, hunger, thirst, stress, stamina, oxygen), status (info, success, warning, danger), faction (police, ems, mech, gang, civ, staff), rarity (common, uncommon, rare, epic, legendary), brand, neutral |
| **Materials** | `--nk-material-{hud,menu,overlay}-{opacity,blur,radius,edge,texture}`, `--nk-slash` (none, cut) | hud opacity = `nk-hud-opacity`, menu/overlay = `nk-surface-opacity`, radius = `radius`, edge = `nk-surface-edge`, blur 0, texture none | Surfaces read `--nk-{hud,menu,overlay}-alpha` (kit.css), which legibility lifts. Textures paint as `data-nk-texture-<ctx>` |
| **Backdrop** | `--nk-backdrop: on | off` | on | A surface sets `--nk-backdrop-filter` (blur, saturate…; it doesn't inherit), never `backdrop-filter`; kit.css applies it unless `off` (`html[data-nk-backdrop]`). The pause, death and sheet blur are seen right in game; a server whose clients draw backdrop filters as black boxes over the game sets `off`. `nuikit check` flags only a raw `backdrop-filter` (`cef/backdrop-filter`, advisory) |
| **Legibility** | `--nk-legibility: auto \| night \| day`, `--nk-legibility-lift` | auto, 0.5 | `day` closes each material's gap to opaque by the lift (not a light theme). `auto` does so while `html[data-nk-daytime]` is set (the HUD sets it from the game clock) |
| **Behaviour** | `--nk-alert-threshold`, `--nk-fuel-threshold`, `--nk-notify-ms-{info,success,warning,danger}`, `--nk-hold-ms`, `--nk-cooldown-ms`, `--nk-rest-delay` | 0.2, 0.15, 5000ms each, 800ms, 0ms, 0ms (never retract) | Durations up to 60 s. Servers tune them in theme.css; resources may override per surface |
| **Motion steps** | `--nk-ease-{standard,expand,retract,spring,breathe}`, `--nk-time-{confirm,retract,fill,pulse}`, `--nk-motion-profile: full \| reduced \| instant` | eases alias the ladder's curves (+ a spring and a breathe); confirm 0.65 × d, retract 1.55 × d (≤ 300), fill 3 × d, pulse 1000ms; full | The new rungs are clamped by the player's prefs like the rest. `reduced` / `instant` act like the reduced-motion pref / motion off, for the whole server |
| **Layers** | `--nk-z-{world,hud,scrim,surface,dim,dialog,system}` | 10 … 70 | A modal is the current surface + `dim` + `dialog`, never a new screen |
| **Offsets** | `--nk-focus-shift` | 0rem | The focused row's nudge (`--nk-hang-*` was removed in 1.5) |
| **Attention** | `--nk-glow-budget` | 1 (0 = no limit) | A part that may glow carries `data-nk-glow` (a number ranks it); the runtime marks at most the budget `data-nk-glow-on`, the focused one first, and kit.css zeroes the rest. `nuikit check` warns (`attention/glow`, advisory) on a second mark in a resource |

### Which surface reads which material

Everything below is readable on `<html>` (compiled theme, or kit.css on `:root`).

| Material | Who draws it | Through |
|---|---|---|
| `menu` | Every panel: sheets (`edge-sheet`, the pause sheet, the inventory tray), dialogs, menus, notices on a panel | `--nk-panel-bg` (opacity × `--nk-menu-alpha`, which day legibility lifts), `--nk-panel-radius` (`--nk-material-menu-radius`), `--nk-panel-edge` (`--nk-material-menu-edge`), `--nk-panel-blur` (`--nk-material-menu-blur`, 0px by default; a surface blurs with `--nk-backdrop-filter: blur(var(--nk-panel-blur))`, applied under `--nk-backdrop`, default on) |
| `hud` | HUD chips, slabs and tiles drawn over the game | `--nk-chip-bg` (and `--nk-slab-bg`): `--nk-hud-alpha` |
| `overlay` | Full-screen backdrops behind a moment (death, loading, the dim behind a dialog) | `--nk-material-overlay-*` |

The HUD material never affects panels, and the menu material never affects the HUD.

Units: `-opacity` is 0–1, `-blur` and `-radius` are lengths (px, rem or em), `-edge` is a 0–0.3 strength (the
alpha of the inner top highlight, like `--nk-surface-edge`), `-texture` is `none` or `scanlines`. Layers are plain
integers (`--nk-z-dim` 50, `--nk-z-dialog` 60). `--nk-alert-threshold` is 0–1.

Each identity names its treatment: Graphite and Studio `soft`, Velvet `glass`, Signal and Vector `plate`,
Arcade and Street `slab`. A server keeps its palette and borrows another treatment with one line:

```css
.dark {
  /* …your TweakCN colours… */
  --nk-treatment: slab; /* Arcade's flat, bold, skewed drawing; any token you set still wins */
}
```

## Default theme levers (1.5)

Tokens 1.5 ([design/default.md](design/default.md) §2) turn the Default theme into kit levers every theme gets. They are
**kit levers**: kit.css holds each default (`@layer nk.base`, a formula over the identity, so a subtree's density or
radius re-derives it); the compiler validates a value a theme or the `tile` treatment sets and never emits a
default (`KIT_TOKENS` in nuikit-core, flag `css: true`). Graphite compiles exactly as in 1.4. The older component
tokens read the new ones (`--nk-key-radius: var(--nk-r-key)`, `--nk-row-height: var(--nk-h-row)`,
`--nk-key-bg: var(--nk-tile-face)`, `--nk-key-font: var(--nk-type-scan-family)`…), so a theme may set either name
for one revision. `--nk-meter-radius` keeps its own value (Graphite's meters are rounded).

| Group | Tokens | Graphite default | `tile` (Default) |
|---|---|---|---|
| **Spacing** (`SCALE_TOKENS`) | `--nk-space-unit`, `--nk-space-{1,2,3,4,6,8}`, `--nk-gap-cluster`, `--nk-gap-items`, `--nk-pad-x`, `--nk-pad-surface` | 0.25rem × density; cluster space-2, items space-1, pad-x space-3, surface space-6 | density 1 |
| **Radius** | `--nk-r-key`, `--nk-r-chip`, `--nk-r-control`, `--nk-r-surface` | radius − 4px (≥ 0.25rem), the same, radius − 2px, the menu material's | 0.25, 0.375, 0.5, 0.75rem |
| **Keycap motion** | `--nk-tile-lift` (hover rise), `--nk-tile-press-ratio` (press sink, × wall) | 1px, 0.67 | 0, 0–1.5 |
| **Leading** | `--nk-leading-tight`, `--nk-leading-normal` (edge fills and hold lines also read `--nk-gauge-track` / 2) | 1rem, 1.25rem | length |
| **Shapes under styles** | `--nk-row-bar-thickness` / `-inset-scale`, `--nk-hold-ring-pad`, `--nk-pip-size` / `-gap`, `--nk-meter-segment-gap`, `--nk-glow-radius` | 0.1875rem / 2.5, 2px, 10% / 2px, 0.125rem, 1rem | length |
| **Heights** | `--nk-h-key`, `--nk-h-chip`, `--nk-h-control`, `--nk-h-row` | 1.25rem, 2rem × density, 2.25rem, 2.75rem × density | 1.5, 1.75, 2.25, 3rem |
| **Icons** | `--nk-icon-{sm,md,lg}`, `--nk-icon-stroke` | 0.75, 1, 1.25rem; 2 | same |
| **Type roles** (`TYPE_ROLE_TOKENS`) | `--nk-type-{scan,title,label,num,body}-{family,style,weight,tracking,case,pad}`, `--nk-text-key`, `--nk-text-body` | each role reads today's tokens (title = the heading tokens, scan = the key font and weight…); pad 0 | display font, italic, 800 / 700, caps, 0.15em pad (num: no caps) |
| **Tile** (`TILE_TOKENS`) | `--nk-tile-{face,ink,light,shade,rim,rim-focus,plate,plate-dim,plate-x,plate-y,press,skew,confirm-face,confirm-ink,hold,tag-delay}`; `--nk-tile-active` (an active tile's face: a colour or a gradient) | today's keycap: muted face, border rim, no plate (x / y 0; 0.1875rem under `--nk-skew`), skew = `--nk-skew`; active = confirm-face | #161616 face, white .32 rim, #737373 plate 2px down-right, −12deg; active = `--nk-accent-gradient` |
| **Plate** (`PLATE_TOKENS`) | `--nk-plate` (its channels, `--nk-plate-rgb`), `--nk-plate-hair`, `--nk-plate-drop`, `--nk-plate-radius`; kit.css derives `--nk-plate-bg` | the panel's surface, border, elevation shadow, `--nk-r-surface` | rgb(10 10 10) at the material opacity, white .12 hair, a hard 0.125rem drop |
| **Fill** (`FILL_TOKENS`) | `--nk-fill-{color,track,tint,edge,alert}` (and kit.css's `--nk-fill-height`); `--level` inline | brand, scrim .35, accent (the row sweep), no edge, destructive | foreground, white .12, white .12, white .4, destructive |
| **Accent** (`ACCENT_TOKENS`) | `--nk-accent-gradient` (a colour or a gradient: an active tile's face, the HUD heading's accent edge); `--nk-accent-{from,via,to}` (its stops, for SVG strokes: the speedometer level, the lubber mark) | flat `--brand` (stops: brand) | the same (a theme sets the gradient and its stops together) |
| **Motion** | the ladder `--nk-time-{snap,fast,slow}` (.5, .667, 1.556 × d, compiled); `--nk-exit-factor` (0.7), `--nk-time-reduced` (100ms, the reduced-motion cap); distances `--nk-lift`, `--nk-rise`, `--nk-land-scale`, `--nk-deny-x` | the 1.2 rungs keep their formulas; lift 0, rise .5rem, land 1 | d = 180ms: 90 / 120 / 180 / 280 / 420; press → snap, hover → fast, move / modal / confirm / retract / screen → slow, ambient and fill 2.333 × d; stagger 40ms; lift .5rem, land .6 |
| **Hygiene** (`HYGIENE_TOKENS`) | `--nk-vital-{icon,display,neighbours}` (read by vital-chip) | unset: the component's default | — |

`--nk-row-indicator` gains `sweep` (no bar: the row's `--nk-fill-tint` sweep, and the content slides by
`--nk-lift`). `--nk-treatment: tile` fills all of the above, plus hard elevation, italic display, caps labels, fill
holds and a 1.08 confirm. Default is `tile` plus a palette.

**Layers.** Every index.css declares `@layer theme, base, nk.base, components, nk.kit, utilities, nk.theme, nk.app`
before Tailwind's import. A theme writes token values, and rules on documented data attributes, into
`@layer nk.theme`; `nuikit check` warns (`theme/unlayered`) on anything else. The primitives (`tile`, `fill`,
`chip`, `icon-text`, `action-bar`, `.nk-plate`) sit in `nk.kit`, under Tailwind's utilities, so a className still
restyles them.

## Identities

Complete `theme.css` files, each a finished identity on its own: `packages/core/themes/`, shipped as
`nuikit-core/themes/*.css` and in the nuikit resource's `themes/`. Copy one over `nuikit/theme.css`, run
`nuikit theme reload`, then tune it. Screens in several of them: `bench/identity/shots/`. The theme id is the
file's base name (`neon-pop.css` → `neon-pop`); `ink` is the old id of `default` and still resolves, with a
deprecation line in the log, for one minor.

| Identity | Character | What sets it apart |
|---|---|---|
| **Default** (the flagship, and what a new project and the stock server get) | Monochrome: near-black surfaces, white text, greys for hierarchy, colour only where it carries information | Geist for sentences, Barlow Condensed italic caps for anything you scan; the `tile` treatment (a face slanted -12deg on a hard plate straight below); fills instead of rings, hard drops, no pills, no blur; radius .25/.375/.5/.75rem; density 1; 180ms |
| **Neon Pop** | Default's structure with a vivid palette | The same `tile` treatment and levers; `--nk-accent-gradient` blue → violet → rose, solid brand #8A8CFF; a colour per vital (health rose, armor blue, hunger amber, thirst sky, stress green); rarity climbs grey, green, blue, violet, amber |
| **Graphite** (what `compileTheme("")` fills: the token defaults) | Utilitarian: minimal, neat, compact; every element earns its place ([design v2 §4](archive/design-v2.md)) | Stock neutral colours; Inter, Inter Tight, Geist Mono; flat panels with a crisp hairline, a machined edge and a short soft drop; compact rhythm (density 0.875) with 16px reading text; small uppercase captions (13px, 0.06em); panels at `--radius`, chips and slabs as small rounded rects; thin meters (4px); a brand bar on the active row; arc gauges; 140ms. Exactly what a plain paste compiles to |
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
