# nuikit tokens: the token language

The theme contract every nuikit UI reads. A server's theme is any shadcn / TweakCN paste in
`nuikit/theme.css` plus any lever values; the compiler (`compileTheme` in `nuikit-core`) turns it into one set of
CSS variables, so a UI built on them matches every server it runs on.

## Architecture (v2, Oct 2026)

**One source.** Every custom property is declared once in the token language, `packages/core/src/spec/`
(TypeScript, declarative). Nothing else names a token: `pnpm --filter nuikit-core gen:tokens` (part of the build,
idempotent, `--check` in CI) generates kit.css's `@layer nk.base` block, `src/tokens.generated.ts` (the tables
`compileTheme` validates against, the `Lever` type, `ANATOMY`), `tokens/nuikit.levers.json` (DTCG with
`$extensions.nuikit`), [`design/levers.md`](design/levers.md) (the catalog).

**Four tiers, references only point up.**

| Tier | What | Defaults |
|---|---|---|
| identity | what a server chooses: palette, faces, scales, shape, type, surfaces, motion, which drawing each family uses | literals: the flat baseline (`compileTheme("")` draws upright faces, solid fills, one face in two weights) |
| semantic | roles every component shares: motion ladder, eases, plate, fill, accent, lines, depth | references to identity |
| component | `--nk-<component>-<prop>` | references to itself, a component it `inherits`, semantic, identity |
| part | `--nk-<component>-<part>-<prop>`; parts are the anatomy, the `data-slot` names in render order | same as its component |

Rules (`packages/core/test/spec-rules.test.ts`): one declaration per lever; generated names only; references
resolve and point up; no literal below identity except documented floors; no colour literal below identity, ever;
every component has an anatomy; every lever has a reader. Old names map to new in
`packages/core/spec/migration.json`; `node packages/core/scripts/migrate-levers.mjs <path>` applies it.

**Themes are values.** Default and Neon Pop (`packages/core/themes/`) are short diffs on the baseline; Flat and Square (`packages/core/test/fixtures/themes/`) prove two more languages come from values alone.
Treatments are gone: the baseline is one language, a theme moves it.

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

## Motion

The ladder (`--nk-time-snap` 90, `-fast` 120, `-base` 180, `-slow` 280, `-fill` 420, `-pulse` 1000 ms; exits at 0.7×),
the eases and `--nk-motion-feel` are identity levers in [`design/levers.md`](design/levers.md); the rules that use them
are in [`design.md`](design.md) §5. The compiler writes literal values for every derived duration and ease, so nothing
relies on `calc()` inside an animation shorthand in Chromium 103, and paints the keywords CSS cannot branch on as
`data-nk-*` attributes on `<html>` (`data-nk-fill`, `data-nk-case`, `data-nk-motion`, `data-nk-feel`,
`data-nk-elevation`, `data-nk-contrast`).

## Roles

The type roles (`scan`, `title`, `label`, `num`, `body`, `caption`, `display`) are the two voices as levers:
`--nk-type-<role>-{family,weight,size,case,tracking,pad}`, read by the `.nk-<role>` classes and the `Text` component.
The game families beyond shadcn (`--role-health` … `--role-stress`, `--hue-*`, `--brand*`, `--hud*`, `--scrim`) are
the colour roles; the vitals section above says how they are derived.

## Slabs

Transient feedback drawn on the game (notices, key prompts, timed meters, the death band) shares one anatomy: the
HUD plate (`--nk-plate-*`, `--hud`), the chip radius, a Fill for the level or the time left. Components build on
`nk-slab-*`; a theme moves the plate and fill levers, never the anatomy.

## Fonts

Theme fonts are open (SIL OFL 1.1) woff2 files, latin subset (`unicode-range`; other scripts fall back down the
stack to system fonts). One source: `packages/core/fonts/` (`fonts.json` lists family, file, weights, the themes that
use it and the licence). Today: Geist and Geist Mono (every theme), Barlow Condensed upright 600–800 (Default and Neon Pop's display and numbers, bundled in every UI) and italic 600–800 (the Keycap theme's display
voice). Never a Google Fonts URL at runtime. `pnpm sync` writes the `@font-face` rules into every UI's `index.css`,
per UI (`nuikit.json` `"fonts"`, or `NUIKIT_FONTS`):

| Mode | Where the files come from | Used by |
|---|---|---|
| `bundle` (default) | The UI's own build (`../node_modules/nuikit-core/fonts/…`, emitted as assets) | systems, ox_lib, ox_target, mm_radio, Renewed-Banking |
| `graphite` | The default theme's fonts in the build; the rest from the nuikit resource | overrides whose resource serves a fixed file list: ox_inventory, illenium-appearance, qbx_* |
| `nuikit` | All from the nuikit resource (`https://cfx-nui-nuikit/fonts/…`, `fonts/*.woff2` in its manifest) | opt-in until the in-game check passes |
| `false` | None | UIs that bring their own fonts |

A font that fails to load falls back down its family's stack; nothing breaks. Whether one resource's page can load
fonts from the nuikit resource is unproven in game. A theme that names another font (`--font-sans: Outfit`) loads it
from its own `@import`.

## Using the tokens

- Read colours only from tokens (`docs/design.md`). Status: `success` / `warning` / `info` / `destructive`.
  On the game: `hud` / `hud-foreground` (or `nk-chip`, `nk-hud`). Vitals: `vital-*` (`<Vital tone="health">`).
- In inline styles use `var(--token)`; never `oklch()` or `color-mix()` (Chromium 103).
- A page nuikit.lua can't message (an override): `loadServerTheme()` from nuikit-core.
