# Naming

One name for one thing, everywhere: the same word in the file name, the id, the token, the class and the doc.
Decided by [decisions.md](../next/decisions.md) row 28. Nothing in nuikit is named after a server or a person.

## Conventions

| Thing | Rule | Example |
|---|---|---|
| Theme (identity) | A file in `packages/core/themes/`; the id is its base name, lowercase kebab. Display name is the id title-cased | `neon-pop.css` → `neon-pop` → "Neon Pop" |
| Default theme | `default` is the flagship, what a new project and the stock server ship with. Graphite is the *token* default (`compileTheme("")`) and a named theme like any other | `themes/default.css` |
| Treatment | One lowercase word, a value of `--nk-treatment` | `soft`, `glass`, `plate`, `slab`, `tile` |
| Token (kit) | `--nk-<family>-<part>[-<state>]`; the family is the thing, not the page | `--nk-tile-plate-y`, `--nk-time-snap` |
| Token (contract, v1) | shadcn's own names unprefixed, plus the game families `--role-*`, `--hue-*`, `--brand*`, `--hud*`, `--scrim` | `--role-health`, `--brand-foreground` |
| Kit class | `nk-<name>`, declared once in `kit.css`, never redefined locally | `.nk-plate`, `.nk-scan` |
| Page-local class | `<surface>-<name>` with the surface's own prefix, only in that surface's CSS | `.hud-compass`, `.inv-tray` |
| Site-only class | `site-*` in `apps/www`; never `nk-*`, which belongs to the kit | `.site-display`, `.site-eyebrow` |
| Component | One concept, kebab file, PascalCase export, `data-slot="<file name>"` | `edge-sheet.tsx` → `EdgeSheet` → `data-slot="edge-sheet"` |
| Data attribute | `data-slot` (what it is), `data-state` (how it is), `data-nk-*` (kit switches). One spelling per state: `data-state="alert"`, `data-nk-deny` | `data-state="focus"` |
| Keyframes | `nk-<name>` in the kit, `nk-theme-<name>` in a theme's stylesheet (globals: they must not collide) | `nk-theme-reveal` |
| File / folder | kebab-case for source files, `snake_case` for FiveM resources (`nuikit_<area>`), lowercase for docs | `key-tile.tsx`, `systems/nuikit_hud` |
| Convar / config | `nuikit_<thing>` server-side, `Config.<thing>` in a resource's `config.lua` | `setr nuikit_identities` |
| Doc | `docs/<topic>.md`, `docs/design/<topic>.md`; never named after a theme unless it *is* that theme's spec | `docs/design/default.md` |

## Fixed in this pass (outside `registry/**`)

- Theme **Ink → Default**: `themes/ink.css` → `default.css`, the nuikit resource's `theme/ink{,-fonts}.css` →
  `theme/default{,-fonts}.css`, `docs/design/ink.md` → `docs/design/default.md`, `fonts.json` identities, the
  identity tests, the stock `systems/nuikit/theme.css`, the README and docs tables, `apps/www` (picker order,
  `src/lib/ink.ts` → `src/lib/default-theme.ts`, `applySiteInk` → `applySiteTheme`), the CLI, the templates and
  the changesets. The id `ink` still resolves to `default` for one minor, with a deprecation line in the log.
- Theme-layer keyframes `ink-reveal` / `ink-rise` / `ink-rise-y` / `ink-deny` → `nk-theme-reveal` /
  `nk-theme-rise-x` / `nk-theme-rise-y` / `nk-theme-deny`. `nk-rise` already existed in `kit.css` with other
  values, so a theme's globals now carry their own `nk-theme-` prefix.
- Three dead `--ink-6` / `--ink-t-pulse` / `--ink-breathe` back-compat aliases removed from the theme stylesheet
  (nothing read them any more).
- `apps/www`'s `ink-display` / `ink-eyebrow` / `ink-plate` → `site-display` / `site-eyebrow` / `site-plate`: they
  are the site's own type steps, not kit utilities and not theme-specific.
- `nuikit-cli`'s `INK_RULES` → `KIT_RULES` (they are the kit's conventions, not one theme's), with `INK_RULES`
  kept as a deprecated re-export until 1.0.
- `apps/www/src/themes.ts` title-cases a theme id instead of capitalising the first letter, so `neon-pop` reads
  as "Neon Pop".

## Left open

1. **`registry/**` still cites `docs/design/ink.md`** in ~25 component headers, and the synced copies under
   `systems/*/web/src/components/ui` and `addons/*/web/src/components/ui` repeat it. The registry lane owns
   those files; a `pnpm sync` after they change propagates the fix. Nothing is hand-edited there.
2. **`nuikit.json` `"fonts": "graphite"`** (7 addons) names a theme to mean "bundle the default identity's
   fonts, serve the rest". The default identity is no longer Graphite, so the mode should be renamed — but
   renaming it also changes *which* fonts those addons bundle, so it needs its own decision and a rebuild.
3. **Page-local custom properties without a prefix** in `systems/nuikit_hud/web/src/hud.css`: `--d`, `--dx`,
   `--dr`, `--fs`, `--edge` are unreadable one- and two-letter names, and `--hud-*`, `--world-*`, `--vital`
   sit next to kit tokens with no marker that they are page-local. They should be `--hud-*` throughout.
   Same for `--inv-*` in `addons/ox_inventory` and `--pause-*` in `systems/nuikit_pause`.
4. **Package directory vs package name**: `packages/cli` publishes `nuikit`, `packages/vite` publishes
   `vite-plugin-nuikit`, `packages/core` publishes `nuikit-core`. Directory names should match the package.
5. **`data-ink-deny`** survives as a legacy spelling the linter flags (`state/alert`). It is a lint target for
   old pages, not a name we use; remove the rule once no page trips it.
6. **`docs/archive/design-v2.md`** still calls Graphite "(default)" and talks about "all four identities". It is a
   historical design doc; it should either be dated or brought in line.
7. **`addons/Renewed-Banking`** is the only non-lowercase directory. It mirrors the upstream resource's folder
   name, which an override must match, so it stays — noted here so nobody "fixes" it.
