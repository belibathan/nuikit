# qb-input → `input`

*Clean-room spec. Written from [qbcore.org/docs/qbcore-resources/qb-input](https://qbcore.org/docs/qbcore-resources/qb-input).
Mechanism proposed; the spike decides.*

**Status (Oct 21):** built as `adapters/[nuikit-qb]/nuikit_qb_input` (stand-in, blocking `ShowInput` through `handle:await()`); replay test `bench/adapters/replay/qb/input.test.mjs` (yield across the export modelled with coroutines). Decisions until a recording: `number` → number (`Config.numbersAsStrings`), checkbox group → list of checked values, `radio` → the `radio` field type. Not run in game; the yielding export is the first thing to watch.

## Source

Documented: `ShowInput(data)`, `CloseMenu()`, the field types and their fields. **Not documented**: the exact
return shape (the example iterates `pairs(result)` and checks `~= nil`), what a `checkbox` group returns (one
value, a list, or one key per option), the value type of `number` (string or number), whether `isRequired`
blocks submit, and whether `ShowInput` yields the calling thread (the example suggests it does: it uses the
return value in the same function).

## Public API

**`exports['qb-input']:ShowInput(data)`** → `table | nil`. Blocks the calling thread until submit or close.

- `data.header` string?, `data.submitText` string?, `data.inputs` array (required). Each input:

| Field | Type | Meaning |
|---|---|---|
| `type` | `'text' \| 'password' \| 'number' \| 'radio' \| 'select' \| 'checkbox' \| 'color'` | |
| `name` | string | key in the result |
| `text` | string | label |
| `default` | any? | preset value |
| `isRequired` | bool? | must be filled |
| `options` | `{ text, value, checked? }[]`? | for radio / select / checkbox |

- Returns `{ [name] = value }` on submit; `nil` when closed. Value types to confirm from a recording: text as
  string; number as string or number; radio/select as the option `value`; checkbox as (to confirm) one value or a
  list; color as a hex string.

**`exports['qb-input']:CloseMenu()`** → nothing; the pending `ShowInput` returns `nil`.

## Intent and field mapping

`input` (architecture §2: form with text, number, select, checkbox, slider, date, colour; validation).

| qb-input | `input` |
|---|---|
| `header` | `title` |
| `submitText` | `submit` (button label) |
| `text` / `password` | `fields[].type = 'text'`, `password: true` for password |
| `number` | `fields[].type = 'number'` |
| `radio` | `fields[].type = 'select'` with `options` (single) |
| `select` | `fields[].type = 'select'` with `options` |
| `checkbox` with `options` | `fields[].type = 'checkbox'` **group**: `options[]`, `checked` → default set |
| `color` | `fields[].type = 'color'` |
| `name`, `text`, `default`, `isRequired` | `fields[].name`, `label`, `default`, `required` |
| `CloseMenu` | `cancel(inputId)` |

Resolve: `{ values: { [name]: value } }` → the adapter returns it to the yielded caller, coercing types to
what the recording shows qb-input returned. Cancel → `nil`.

## What the intent must cover

- A **checkbox group** (several options under one name), not only a single boolean checkbox.
- `password` masking on a text field.
- `required` that blocks submit, with the renderer saying which field.
- Option `text` separate from `value`; a `select` and a `radio` differ only in presentation.
- Colour fields with a hex default.
- The form yields: the caller's thread must resume with the values (the adapter's job; the intent resolves).

## Mechanism

**Stand-in** (`nuikit_qb_input`, `provide 'qb-input'`, `ShowInput` / `CloseMenu` under qb-input's name). The
export must block: the stand-in opens the intent and waits on it (the same pattern as `lib.inputDialog`). What the
spike decides: as for qb-menu (checklist step 12 rule). The blocking export is the one thing to watch in game: a
yielded export call across resources must resume correctly (the spike's `/spike_menu` doesn't yield; the first
`nuikit_qb_input` prerelease must test it).

## Replay test

Recording: a `ShowInput` with one field of each type, then a resolve with values; a second `ShowInput` closed by
`CloseMenu`; a third with `isRequired` and an empty value.

1. The caller got a table with exactly the input `name`s as keys and values of the recorded types.
2. After `CloseMenu`, the caller got `nil`.
3. One `input` intent opened per call, fields in order, `default`s and `options` intact, the checkbox group
   present as a group.
4. With `required` unmet the intent did not resolve (the renderer refuses); the adapter never returned early.
