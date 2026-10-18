# Changelog

## 0.2.0 (2026-10-18)

- **Registry components are now compositions of stock shadcn/ui**, following its file conventions (`data-slot`, `React.ComponentProps`, `cva`): `vital` = icon + `Progress`; `key-hint` = `Kbd` (+ `Progress` for hold); `task-progress` = `Card` + `Progress` + `Kbd`; `nui-menu` = `Card` + `Item`; `speedometer` uses `Badge` and `Progress`; `radial-menu` uses `popover`/`accent` like shadcn menus. Dependencies are declared as `registryDependencies`.
- The `theme` registry item is removed. The template and site default to the stock `shadcn init` neutral theme.
- **vite-plugin-nuikit:** opt-in `hasPolyfill: true` polyfills `:has()` (shadcn Button, Card, Item) with css-has-pseudo, verified in Chromium 103. Off by default: its runtime is too expensive for HUDs that update many times a second.
- Devtools panel restyled to neutral.

## create-nuikit 0.1.1 (2026-10-18)

- Template depends on `nuikit-core` (the runtime's published name) and drops the deprecated `baseUrl` from `tsconfig.json`.

## 0.1.0 (2026-10-18)

First release.

- **vite-plugin-nuikit**: Vite plugin that lowers Tailwind v4 / shadcn CSS for FiveM's Chromium 103: oklch → hex, live RGB channels for opacity modifiers, media range syntax, individual transforms, gradient color spaces, dynamic viewport units. Also in-game HMR (`ui_page` → dev server), compat report and the `nuikit-doctor` CLI.
- **nuikit**: typed `fetchNui` / `onNui` / `emit` / `mockNui`, React hooks (`useNuiEvent`, `useNuiState`, `useNuiVisibility`, `useNuiCallback`), `<NuiDevtools />`, `applyTheme()` runtime theming, and `nuikit.lua` (`NUI.send/on/open/close/toggle/notify`).
- **create-nuikit**: scaffold a resource with fxmanifest, Lua and Vite + React + shadcn + Tailwind v4.
- **Registry**: vital, speedometer, key-hint, nui-menu, radial-menu, task-progress, nui-toaster, use-nui-store, theme.
