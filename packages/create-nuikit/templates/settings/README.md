# {{name}}

Player settings made with [nuikit](https://github.com/belibathan/nuikit), from the `settings` block: one
panel with toggles, choices, sliders and key hints, grouped in tabs. It's built from the kit (Panel,
MenuRow, the field recipe with shadcn Slider, Tabs and Kbd) and follows the server's nuikit theme.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=single|disabled|empty
{{pm}} run build  # production build into web/dist
```

**In game:** `ensure nuikit` first, then `ensure {{name}}`. Press F10 or run `/{{name}}`. Players can rebind
the key in Settings → Key Bindings → FiveM. Up / Down move, Left / Right change, Enter toggles, Esc closes.

## What each section does

| Section | Where it's saved | What happens |
|---|---|---|
| Yours (`Config.sections`) | The player's PC (KVP, per resource) | Nothing by itself: `TriggerEvent('{{name}}:changed', id, value)` and `exports['{{name}}']:get(id)` are how your scripts react. The examples (HUD, speed units, streamer mode) are only stored until you wire them |
| Accessibility | nuikit's player preferences (`nk.prefs`) | Real at once: UI size, reduced motion and high contrast apply to every nuikit screen on the server |
| Keys | | Read-only hints from `Config.keys` |

Every change goes to `client/main.lua` first (`settings:change`), and the row shows what it answers, so Lua
can refuse or clamp a value. Sliders send once, when let go. Reset restores the defaults.

## Files

| | |
|---|---|
| `config.lua` | Your sections and items, the key, whether Accessibility and Keys show |
| `client/main.lua` | Builds the panel, saves changes, applies Accessibility, announces the rest. `nk.surface`, `nk.on`, `nk.prefs` |
| `web/src/components/blocks/settings/` | The block: `settings.tsx` (UI), `nui.ts` (messages), `fixtures.ts` (every state) |
| `web/src/dev.tsx` | The fake game for browser development |
