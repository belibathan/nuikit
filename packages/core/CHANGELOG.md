# nuikit-core

## 0.5.0

### Minor Changes

- 5d9eb9d: Import the Lua runtime like ox_lib: `dependency 'nuikit'` + `shared_script '@nuikit/init.lua'` loads it from the running `nuikit` resource, so updating nuikit updates every resource that uses it. `nk` is the new name (`NUI` stays the same table); the framework bridge loads on first use of `nk.player`. New projects from `create-nuikit` import it instead of carrying a copy of `nuikit.lua`. `nuikit check` accepts the import as the runtime.
- afa2e0a: Protocol v1 (docs/protocol.md). The ready handshake is versioned: the page sends `{ protocol, client }`, Lua answers with `protocol` and `capabilities` (`getHandshake()`, `protocolVersion()`, `hasCapability()`). `useNuiVisibility` sends Escape through `nuikit:escape` like any surface, so the topmost UI on the client gets it; `NUI.open({ escape })` sets what it does. The player payload no longer carries the bridge's internal `downed` field. New `scrim` token for darkening the game.
- f7b4d63: Theme engine: tokens v1 and `compileTheme`.

  - **Tokens v1** (`docs/tokens.md`): shadcn's tokens plus nuikit's `success`, `warning`, `info`, `hud`, `vital-health|armor|hunger|thirst|stress`, `nk-scale` and `nk-motion` (with `-foreground` where it applies), all with derived defaults so any shadcn/TweakCN paste works. Published as `nuikit-core/tokens.json` (DTCG 2025.10) and `nuikit-core/theme.schema.json`.
  - **`compileTheme(input, { mode, partial, highContrast })`** → `{ vars, warnings, contrast, version, mode, imports, hash }`: parses CSS pastes (`:root`/`.dark`, `@theme inline`, `prefers-color-scheme`, `@import` fonts), DTCG documents and objects; picks the dark set; resolves `var()`; lowers every colour (also inside shadows) to rgb; derives the nuikit tokens with hue-checked vitals; checks WCAG contrast with plain-language warnings. Also `toDtcg`, `parseDtcg`, `themeToCss`, `checkContrast`, `TOKENS`.
  - **`applyTheme`** compiles first and paints the full token set with rgb channels; plain objects patch the current theme; also accepts compiled themes and DTCG. Colours are now always written as `rgb()`/`rgba()` (a hex value no longer passes through as hex).
  - **Player preferences**: `setPrefs` / `getPrefs` and the `nuikit:prefs` message (UI scale 0.85–1.25, reduced motion, high contrast). `nuikit:theme` now carries the compiled theme (raw CSS still works).
  - **`loadServerTheme()`** for override pages: compiled theme + prefs from the `nuikit` resource with live reload, falling back to `theme.css`.
  - `lua/nuikit.lua`: the theme from `GlobalState.nuikitTheme` with live repaint on `nuikit theme reload`, and `NUI.prefs.get/set`.

## 0.4.0

### Minor Changes

- 8ff1605: The whole kit: one `nuikit.zip` with `[nuikit]` systems (HUD, stress, pause, death, loading screen, chat theme) and `overrides/` for ox_lib, ox_inventory, ox_target, illenium-appearance, Renewed-Banking, mm_radio, qbx_scoreboard, qbx_idcard, qbx_taxijob and qbx_vehiclesales. Pages that replace another resource's UI can opt out of the `nuikit:ready` handshake with `<meta name="nuikit-handshake" content="off">`.

### Patch Changes

- 677860a: Surfaces are `position: fixed`, so a Radix dialog opened inside one (which locks scroll by making `<body>` relative) no longer collapses the surface.

## 0.3.0

### Minor Changes

- 2ddceb9: `lua/bridge.lua`: one player shape for Qbox, QBCore, ESX and standalone (health, armor, needs, money, job, gang, voice, dead), sent as `nuikit:player` only when it changes; `usePlayer()` in React. Server-wide theming: `theme.css` in the `nuikit` resource is applied to every nuikit UI. The UI now tells Lua when it's listening (`nuikit:ready`), so surfaces, player and theme sent before the page loaded aren't lost.
- 79748d6: Surfaces: declare each piece of UI with `NUI.surface(name, opts)` and nuikit owns focus, cursor, stacking (hud < world < panel < modal < system), Escape order, exclusive panels, `hides` and `blockedBy` states across every resource that uses it, with no extra resource to install. React gets `<Surface>`, `useSurface`, `useNuiStates`, `openSurface`/`closeSurface`; the devtools get a Surfaces tab with state toggles. The Lua manager is tested under real Lua 5.4 in CI. The template now shows a HUD, a menu and a confirm dialog stacking correctly. `NUI.open`/`NUI.close` keep working.

### Patch Changes

- f8a3fe1: `applyTheme()` accepts a full TweakCN export as-is: `@import url(...)` lines (Google Fonts) become `<link>` tags, loaded once, and `@theme inline` blocks are ignored.
