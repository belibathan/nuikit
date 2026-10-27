# Settings (`nk.settings`)

*A resource declares its settings as rows; any page shows them as a live-preview draft, then saves or resets.
Saved per player, merged over the defaults with a schema version, so an update never wipes a player's choices.
Source: `packages/core/lua/settings.lua` (Lua), `packages/core/src/settings.ts` + `useSettings` (pages). Design:
[`design.md`](design.md) wave 3.*

## Declare (Lua, client)

```lua
local hud = nk.settings.define({
  label = 'HUD',
  version = 2,                      -- bump when rows change meaning; see "Updates" below
  rows = {
    { key = 'layout', label = 'Layout', options = { { value = 'compact', label = 'Compact' }, { value = 'classic', label = 'Classic' } }, default = 'compact' },
    { key = 'scale', label = 'Size', range = { 0.8, 1.2, 0.05 }, default = 1.0 },        -- min, max, step
    { key = 'minimap', label = 'Minimap', toggle = true, default = true, flag = 'hud_minimap', group = 'Map' },
  },
  presets = {
    { id = 'streamer', label = 'Streamer', patch = { minimap = false } },
    { id = 'cinema', label = 'Cinema', patch = { layout = 'classic', scale = 0.9 } },
  },
  migrate = function(old, fromVersion) return old end,           -- optional
  onChange = function(values, changed, draft) applyHud(values) end, -- draft = true while a page previews
})

hud.get('layout')   -- the current value (the draft's while one is open)
hud.values()        -- every row
hud.draft(patch) hud.save() hud.cancel() hud.reset(keys?) hud.preset(id)   -- the same ops pages have
```

Row kinds: `options` (a choice; each `value` a string, number or boolean), `range` (a number, clamped and snapped to
`step`), or `toggle`. A row whose default it doesn't accept is skipped with an F8 line. `group` is a heading for
pages; `description` a second line.

## Register a section (third-party resources)

`nk.settings.register` is the short form for a resource that just wants a section on the Settings page. Rows are
`toggle`, `select` (`options`), `range` (`min`, `max`, `step`) or `text` (`maxLength`); a missing `default` is
`false` / the first option / `min` / `''`. An unknown row type is skipped with an F8 line.

```lua
nk.settings.register({
  id = 'shop', label = 'Shop', icon = 'store',
  rows = {
    { id = 'sound', type = 'toggle', label = 'Sound effects', default = true },
    { id = 'tone', type = 'select', label = 'Tone', options = { 'cool', 'warm' } },
    { id = 'vol', type = 'range', label = 'Volume', min = 0, max = 10, step = 1, default = 5 },
    { id = 'tag', type = 'text', label = 'Order name', maxLength = 16 },
  },
})
nk.settings.get('shop', 'vol')                       -- one value; nk.settings.get('shop') is the table
nk.settings.onChange(function(id, values, changed, draft) end)   -- every change, previews included
```

Saved per player at `nuikit:settings:<resource>:<id>` (versioned, merged over the defaults, as above); the
resource's page also hears the NUI message `nuikit:settings:<resource>` `{ id, values, changed, draft }`. The
page's section key is `<resource>:<id>`. The pause Settings page lists Display first, then sections by label.

## Show (pages, any resource)

```tsx
import { useSettings } from "nuikit-core/react";

const s = useSettings("nuikit_hud");   // rows, values, presets, dirty, draft, save, cancel, reset, preset
<Switch checked={s.values.minimap as boolean} onCheckedChange={(v) => s.draft({ minimap: v })} />
<Button disabled={!s.dirty} onClick={s.save}>Save</Button> <Button variant="ghost" onClick={s.cancel}>Cancel</Button>
```

Without React: `loadSettings(resource?)`, `draftSettings`, `saveSettings`, `cancelSettings`, `resetSettings`,
`applySettingsPreset` (`nuikit-core`). In the browser (dev), `mockSettings([...])` stands in for the server.

| NUI callback (the nuikit resource) | Body | Answers |
|---|---|---|
| `https://nuikit/settings` | `{ resource? }` | `{ sections: [{ resource, label, version, rows, presets: [{ id, label }], values, draft }] }` |
| `https://nuikit/settings:draft` | `{ resource, patch }` | `{ values }` (the owner previews it; nothing saved) |
| `https://nuikit/settings:preset` | `{ resource, preset }` | `{ values }` (applied as a draft) |
| `https://nuikit/settings:save` | `{ resource }` | `{ values }` (the draft kept) |
| `https://nuikit/settings:cancel` | `{ resource }` | `{ values }` (the draft dropped) |
| `https://nuikit/settings:reset` | `{ resource, keys? }` | `{ values }` (back to the defaults, saved at once) |

An unknown resource answers `{ error = 'unknown resource' }`. The owner's own page also gets
`nuikit:settings { values, changed, draft }` on every change.

## Storage and updates

The nuikit resource keeps the settings in its KVP (`nuikit:settings:<resource>`), as `{ v = version, values }`
holding only what differs from the default, so a changed default still reaches players who never chose. On
`define`, the saved values are merged over the defaults: unknown keys and values the rows no longer accept are
dropped, the rest kept. When the saved `v` differs from `version`, `migrate(old, from)` runs first (in the owner
resource) and the result is written back under the new version.

## Feature flags

`setr nuikit_flag_<name> 0` (or `false`, `off`) hides every row with `flag = '<name>'` from settings pages; its
value is kept. `nk.settings.flag('<name>')` is false, so the resource hides that part too. Flags default on.

Unproven: not seen in game (cross-resource exports carry the tables; tested under the Lua harness).
