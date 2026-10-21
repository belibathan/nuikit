# esx_context → `menu` (with inline `input` fields)

*Clean-room spec. Written from [docs.esx-framework.org/en/esx_core/esx_context](https://docs.esx-framework.org/en/esx_core/esx_context).
Mechanism proposed; the spike decides.*

## Source

Documented: `OpenContext`, `PreviewContext`, `CloseContext`, `RefreshContext`, positions, element fields,
callback shapes. **Not documented**: a `value` field on elements (scripts set one and read it back in
`onSelect`), `menu.eles` beyond the example, what Escape does when `canClose = false`, whether an input element
is also selectable.

## Public API

**`ESX.OpenContext(position, elements, canClose?, onSelect, onClose)`** → nothing; mouse focus on.
**`ESX.PreviewContext(position, elements, canClose?, onSelect, onClose)`** → same, without focus.
**`ESX.CloseContext()`** → nothing; `onClose()` runs.
**`ESX.RefreshContext(position, elements)`** → nothing; replaces elements in place.

- `position`: `'left' | 'center' | 'right'`; `canClose` default `true`.
- `onSelect(menu, element)`: `menu.eles` is the element array as it is now (inputs carry their current
  `inputValue`), `element` the one picked. `onClose()`.
- Element:

| Field | Type | Meaning |
|---|---|---|
| `unselectable` | bool? | header / label row |
| `disabled` | bool? | shown, not selectable |
| `icon` | string? | Font Awesome; empty hides |
| `title`, `description` | string | |
| `input` | bool? | the row is an input |
| `inputType` | `'text' \| 'number' \| 'radio'` | |
| `inputPlaceholder` | string? | |
| `inputValue` | string \| number? | current value (read back) |
| `inputMin`, `inputMax` | number? | number only |
| `name` | string | key of the input / identifier of the row |
| `value` | any? | undocumented, passed through |

What the caller gets back: `onSelect(menu, element)` with every input's current value in `menu.eles`;
`onClose()` on close.

## Intent and field mapping

`menu` with input rows: architecture §2's `menu` (items with icon, description, metadata, disabled) plus
`input`-typed items. This is the one place a menu carries fields.

| esx_context | `menu` |
|---|---|
| `position` | `position` (`left` / `center` / `right`) |
| `canClose = false` | `dismissable: false` |
| `unselectable` | `items[].kind = 'header'` |
| `disabled`, `icon`, `title`, `description`, `name` | `items[].disabled`, `icon`, `label`, `description`, `id` |
| `input` + `inputType`/`inputPlaceholder`/`inputValue`/`inputMin`/`inputMax` | `items[].field = { type, placeholder, default, min, max }` (`radio` → `select` from the element's options, to record) |
| `value` | `items[].meta.value` (round-tripped) |
| `PreviewContext` | `focus: false` (drawn, no cursor) |
| `RefreshContext` | `update(menuId, { position, items })` keeping field values the renderer holds |
| `CloseContext` | `cancel(menuId)` |

Resolve `{ id, values: { [name]: value } }` → the adapter rebuilds `menu.eles` with `inputValue`s from `values`
and calls `onSelect(menu, element)`; cancel → `onClose()`.

## What the intent must cover

- **Input rows inside a menu** (text, number with min/max, radio), with values reported on any item's select.
- `focus: false` menus (preview) that draw without taking the cursor.
- `update` that keeps typed values when the element list is refreshed.
- `dismissable: false`.

## Mechanism

**Stand-in** (`nuikit_esx_context`, `provide 'esx_context'`). `ESX.OpenContext` etc. are documented as
esx_context's own functions on the `ESX` object; the stand-in defines them the same way the library does (through
the public `ESX` registration path the docs show for menu types; to confirm from the es_extended docs when built).
What the spike decides: stand-in rules (checklist step 12). Risk: if `ESX.OpenContext` is bound inside
es_extended rather than esx_context, the stand-in still works for `exports`, and the doctor flags it.

## Status

**Built** (`adapters/[nuikit-esx]/nuikit_esx_context`, replay test `esx-context.test.mjs`). The exports are `Open` / `Preview` / `Close` / `Refresh` under `esx_context` (names from public usage; to confirm). Rows use `close = false` so the menu stays open through `onSelect` until `ESX.CloseContext()`, as scripts expect; `value` round-trips because the adapter keeps the element table itself (the menu item `meta` field is a string in the schema, not a table). Unproven in game.

## Replay test

Recording: `OpenContext` with a header, a text input, a number input with min/max, a button; type values;
select the button; `RefreshContext`; `CloseContext`; a `PreviewContext`; a `canClose = false` menu + Escape.

1. `onSelect(menu, element)` with `menu.eles[i].inputValue` equal to the typed values and `element` the button.
2. `RefreshContext` produced one `update`, no second open, and kept values.
3. `CloseContext` → `onClose()` once; Escape with `canClose = false` → no `onClose`, menu still open.
4. `PreviewContext` opened with `focus: false` (no `SetNuiFocus` by the adapter).
