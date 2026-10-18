# Changelog

## 0.1.0 (2026-10-18)

First release.

- **@nuikit/vite**: Vite plugin that lowers Tailwind v4 / shadcn CSS for FiveM's Chromium 103: oklch → hex, live RGB channels for opacity modifiers, media range syntax, individual transforms, gradient color spaces, dynamic viewport units. Also in-game HMR (`ui_page` → dev server), compat report and the `nuikit-doctor` CLI.
- **@nuikit/core**: typed `fetchNui` / `onNui` / `emit` / `mockNui`, React hooks (`useNuiEvent`, `useNuiState`, `useNuiVisibility`, `useNuiCallback`), `<NuiDevtools />`, `applyTheme()` runtime theming, and `nuikit.lua` (`NUI.send/on/open/close/toggle/notify`).
- **create-nuikit**: scaffold a resource with fxmanifest, Lua and Vite + React + shadcn + Tailwind v4.
- **Registry**: vital, speedometer, key-hint, nui-menu, radial-menu, task-progress, nui-toaster, use-nui-store, theme.
