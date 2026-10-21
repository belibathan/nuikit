# esx_menu_default → `menu`

*Clean-room spec. Written from [es_extended client UI docs](https://docs.esx-framework.org/en/esx_core/es_extended/client/ui)
(`ESX.UI.Menu`). Mechanism proposed; the spike decides.*

## Source

Documented: `ESX.UI.Menu.Open(type, namespace, name, data, submit, cancel, change, close)` returning a menu
object; `Close`, `CloseAll`, `GetOpened`, `GetOpenedMenus`, `IsOpen`, `RegisterType(type, open, close)`; the menu
object's `close`, `update`, `refresh`, `setElement`, `setElements`, `setTitle`, `removeElement`, `submit`,
`cancel`, `change`; `data` fields `title`, `align`, `elements`, `locales`. **Not documented** (universal in
scripts; confirm from the recording): element fields `label`, `value`, `name`, `type = 'slider'` with `min`,
`max`, `value`, `options[]` with `value` as index; `data.current` in the submit callback (the selected element),
`data.elements`; `align` values `top-left`, `top-right`, `bottom-left`, `bottom-right`, `center`; menu stacking
(several open at once, newest on top).

## Public API

**`ESX.UI.Menu.Open('default', namespace, name, data, submit, cancel, change?, close?)`** → `menu`.

| `data` field | Type | Meaning |
|---|---|---|
| `title` | string | |
| `align` | string? | position |
| `elements` | element[] | `{ label, value?, name?, type?, min?, max?, options? }` |
| `locales` | table? | passed through |

- `submit(data, menu)`: `data.current` = selected element (with its current `value` for sliders), `data.elements`.
- `cancel(data, menu)`: Backspace / close key. `change(data, menu)`: on hover/slider change, same shape. `close()`.
- `menu.close()`, `menu.update(query, newData)`, `menu.refresh()`, `menu.setElement(i, key, val)`,
  `menu.setElements(elements)`, `menu.setTitle(title)`, `menu.removeElement(query)`.

**`ESX.UI.Menu.Close(type, namespace, name)`**, **`CloseAll()`**, **`GetOpened(type, namespace, name)`** →
menu, **`GetOpenedMenus()`** → menus, **`IsOpen(type, namespace, name)`** → bool.

What the caller gets back: `submit` / `cancel` / `change` with `data.current` and `data.elements` that mirror
the live state, and a menu object whose methods take effect while open. Menus stack by (type, namespace, name).

## Intent and field mapping

| esx_menu_default | `menu` |
|---|---|
| `title`, `align` | `title`, `position` (`top-left` …, `center`) |
| element `label` | `items[].label` |
| `value`, `name` | `items[].id = name or index`, `items[].meta.value` |
| `type = 'slider'` with `min`, `max`, `value` | `items[].field = { type: 'slider', min, max, default }` |
| `options` (list slider) | `items[].field = { type: 'select', options, default }` |
| the stack of open menus | one `menu` intent per open menu; the runtime's layer stack keeps the newest on top |
| `setElements` / `setElement` / `setTitle` / `removeElement` / `update` / `refresh` | `update(menuId, …)` |
| `close` / `Close` / `CloseAll` | `cancel(menuId)` (no `cancel` callback: closed by code, `close()` only) |

Resolve `{ id, values }` → `submit({ current = element with value, elements = … }, menu)`; a slider/select
change → `change(...)`; Escape/back → `cancel(...)`.

## What the intent must cover

- `slider` and `select` items whose value changes **without** selecting (`change`), reported live.
- Several menus open at once from one resource, addressed by id; the newest focused.
- Positions in the four corners and centre.
- In-place edits of a single item (`setElement(i, 'label', …)`) without flicker: `update` with a partial item.

## Mechanism

**Stand-in as a menu type**: `nuikit_esx_menu_default` with `provide 'esx_menu_default'`, registering the
`'default'` type through the documented `ESX.UI.Menu.RegisterType('default', open, close)`, so every
`ESX.UI.Menu.Open('default', …)` lands on it with no change to es_extended. The menu object the caller holds is
the one `ESX.UI.Menu` builds; the stand-in implements `open(namespace, name, data)` / `close(…)` and calls
the menu's `submit`/`cancel`/`change` through it. What the spike decides: stand-in rules; `RegisterType` is
public API so this is the lowest-risk adapter of the ESX pack.

## Status

**Built** (`adapters/[nuikit-esx]/nuikit_esx_menu_default`, replay test `esx-menu-default.test.mjs` against an `ESX.UI.Menu` mock written from the docs). Sliders and option lists are stepper rows (`values`), so ←/→ run `change` and Enter submits the value; an option list whose `value` starts at 0 is reported 0-based. `change` also runs on highlight change (esx_vehicleshop-style previews). The menu object's methods reach the adapter only if `refresh()` re-calls the type's `open` (assumed); Escape runs `cancel` and the menu is redrawn when the script does not close it. Unproven in game.

## Replay test

Recording: `Open` with a title, three elements, a slider; `change` by moving the slider; `submit` on element 2;
`setElement`, `removeElement`, `setTitle`; a second menu opened on top; `CloseAll`.

1. `submit(data, menu)` with `data.current.label`, `.value` (slider value after the move) and `data.elements`.
2. `change` called on the slider move with the new `value`; not on plain hover unless the recording shows it.
3. Each method produced an `update` on the same intent, never a reopen.
4. Two intents open at once; `CloseAll` cancelled both; `IsOpen` false after.
