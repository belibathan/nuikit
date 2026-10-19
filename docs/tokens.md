# nuikit tokens v1

The theme contract every nuikit UI reads. A server's theme is any shadcn / TweakCN paste in
`nuikit/theme.css`; the compiler (`compileTheme` in `nuikit-core`) turns it into this exact set of
CSS variables, so a UI built on the tokens matches every server it runs on.

- **Version:** tokens v1 (`TOKENS_VERSION = 1`). Adding a token keeps v1; renaming or removing one is v2.
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
| `--font-sans` / `--font-mono` | Text / codes and IDs a player might type | `ui-sans-serif, system-ui, sans-serif` / `ui-monospace, SFMono-Regular, Menlo, monospace` |

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
`{color.x}` aliases are read too), `radius` (dimension), `font.sans` / `font.mono` (fontFamily),
`nk.scale` / `nk.motion` (number); `$extensions["dev.nuikit"]` carries `tokens`, `mode` and `imports`.

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

## Using the tokens

- Read colours only from tokens (`docs/design.md`). Status: `success` / `warning` / `info` / `destructive`.
  On the game: `hud` / `hud-foreground` (or `nk-chip`, `nk-hud`). Vitals: `vital-*` (`<Vital tone="health">`).
- In inline styles use `var(--token)`; never `oklch()` or `color-mix()` (Chromium 103).
- A page nuikit.lua can't message (an override): `loadServerTheme()` from nuikit-core.
