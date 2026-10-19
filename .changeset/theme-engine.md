---
"nuikit-core": minor
---

Theme engine: tokens v1 and `compileTheme`.

- **Tokens v1** (`docs/tokens.md`): shadcn's tokens plus nuikit's `success`, `warning`, `info`, `hud`, `vital-health|armor|hunger|thirst|stress`, `nk-scale` and `nk-motion` (with `-foreground` where it applies), all with derived defaults so any shadcn/TweakCN paste works. Published as `nuikit-core/tokens.json` (DTCG 2025.10) and `nuikit-core/theme.schema.json`.
- **`compileTheme(input, { mode, partial, highContrast })`** → `{ vars, warnings, contrast, version, mode, imports, hash }`: parses CSS pastes (`:root`/`.dark`, `@theme inline`, `prefers-color-scheme`, `@import` fonts), DTCG documents and objects; picks the dark set; resolves `var()`; lowers every colour (also inside shadows) to rgb; derives the nuikit tokens with hue-checked vitals; checks WCAG contrast with plain-language warnings. Also `toDtcg`, `parseDtcg`, `themeToCss`, `checkContrast`, `TOKENS`.
- **`applyTheme`** compiles first and paints the full token set with rgb channels; plain objects patch the current theme; also accepts compiled themes and DTCG. Colours are now always written as `rgb()`/`rgba()` (a hex value no longer passes through as hex).
- **Player preferences**: `setPrefs` / `getPrefs` and the `nuikit:prefs` message (UI scale 0.85–1.25, reduced motion, high contrast). `nuikit:theme` now carries the compiled theme (raw CSS still works).
- **`loadServerTheme()`** for override pages: compiled theme + prefs from the `nuikit` resource with live reload, falling back to `theme.css`.
- `lua/nuikit.lua`: the theme from `GlobalState.nuikitTheme` with live repaint on `nuikit theme reload`, and `NUI.prefs.get/set`.
