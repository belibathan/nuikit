# esx_menu_dialog → `input`

*Clean-room spec. Written from [es_extended client UI docs](https://docs.esx-framework.org/en/esx_core/es_extended/client/ui)
(`ESX.UI.Menu`, type `dialog`). Mechanism proposed; the spike decides.*

## Source

Documented: the `ESX.UI.Menu.Open` signature and menu object (see [`esx-menu-default.md`](esx-menu-default.md)),
`esx_menu_dialog` as a default menu type. **Not documented** (convention; confirm from the recording):
`data = { title }`, one text field, `submit(data, menu)` with `data.value` the typed string, `cancel(data, menu)`
on Escape, number parsing left to the caller (`tonumber(data.value)`).

## Public API

**`ESX.UI.Menu.Open('dialog', namespace, name, { title }, submit, cancel, change?, close?)`** → `menu`.

- `submit(data, menu)`: `data.value` string (empty allowed; callers validate).
- `cancel(data, menu)`: Escape / back.
- `menu.close()`; `Close('dialog', namespace, name)`; `IsOpen` / `GetOpened` as for every type.

What the caller gets back: exactly one of `submit` with `data.value` or `cancel`. The dialog is typically
opened on top of a `default` menu and closed by the caller in `submit`.

## Intent and field mapping

| esx_menu_dialog | `input` |
|---|---|
| `title` | `title` |
| the single field | `fields = [{ name: 'value', type: 'text', required: false }]` |
| submit | resolve `{ values: { value } }` → `submit({ value = values.value }, menu)` |
| Escape | cancel → `cancel({}, menu)` |
| `menu.close()` / `Close` | `cancel(inputId)` without the `cancel` callback |

## What the intent must cover

- A one-field form with a title and no labels, allowed to submit empty.
- Opening over an open `menu` (layer stack) and returning focus to it on close.

## Mechanism

**Stand-in as a menu type** (`nuikit_esx_menu_dialog`, `provide 'esx_menu_dialog'`,
`ESX.UI.Menu.RegisterType('dialog', open, close)`), same as esx_menu_default. What the spike decides: stand-in rules.

## Replay test

Recording: `Open('dialog', …)` over a `default` menu; type `42`; submit; a second dialog cancelled by Escape;
a third closed by `menu.close()`.

1. `submit(data, menu)` with `data.value == '42'` (string, not number).
2. Escape → `cancel` once, no `submit`.
3. `menu.close()` → neither callback; `IsOpen` false; the `default` menu underneath still open and focused.
