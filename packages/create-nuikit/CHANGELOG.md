# create-nuikit

## 0.5.0

### Minor Changes

- e9714e0: New projects start on the kit: the demo HUD, menu and confirm are built from the new `panel`, `menu-row`, `meter` and `hud-chip` registry components, and `index.css` carries the new kit utilities (`nk-panel-header-stack`, `nk-field`, `nk-anchor-*`, `nk-first-row`).
- 5d9eb9d: Import the Lua runtime like ox_lib: `dependency 'nuikit'` + `shared_script '@nuikit/init.lua'` loads it from the running `nuikit` resource, so updating nuikit updates every resource that uses it. `nk` is the new name (`NUI` stays the same table); the framework bridge loads on first use of `nk.player`. New projects from `create-nuikit` import it instead of carrying a copy of `nuikit.lua`. `nuikit check` accepts the import as the runtime.

## 0.4.0

## 0.3.0

### Minor Changes

- 79748d6: Surfaces: declare each piece of UI with `NUI.surface(name, opts)` and nuikit owns focus, cursor, stacking (hud < world < panel < modal < system), Escape order, exclusive panels, `hides` and `blockedBy` states across every resource that uses it, with no extra resource to install. React gets `<Surface>`, `useSurface`, `useNuiStates`, `openSurface`/`closeSurface`; the devtools get a Surfaces tab with state toggles. The Lua manager is tested under real Lua 5.4 in CI. The template now shows a HUD, a menu and a confirm dialog stacking correctly. `NUI.open`/`NUI.close` keep working.
