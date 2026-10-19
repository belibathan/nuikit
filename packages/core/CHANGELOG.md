# nuikit-core

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
