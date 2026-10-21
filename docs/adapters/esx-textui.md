# esx_textui → `prompt`

*Clean-room spec. Written from [docs.esx-framework.org/en/esx_core/esx_textui](https://docs.esx-framework.org/en/esx_core/esx_textui).
Mechanism proposed; the spike decides.*

## Source

Documented: `ESX.TextUI(message, type)`, `ESX.HideUI()`, the exports, types `success` / `error` / `info`,
one UI at a time, the poll-every-500-ms usage pattern. **Not documented**: key markup in `message`
(`[E]` by convention), a position, whether a second `TextUI` replaces.

## Public API

**`ESX.TextUI(message, type?)`** / **`exports['esx_textui']:TextUI(message, type?)`** → nothing.
**`ESX.HideUI()`** / **`exports['esx_textui']:HideUI()`** → nothing; hides whatever is shown.

| Arg | Type | Values |
|---|---|---|
| `message` | string | may start with a key token (`[E] …`) |
| `type` | string? | `success`, `error`, `info` |

Nothing comes back.

## Intent and field mapping

| esx_textui | `prompt` |
|---|---|
| `message` | `label`; leading `[X]` → `keys = ['X']`, stripped |
| `type` | `status` (`info` / `success` / `error`) |
| `TextUI` while shown | `update(promptId, …)` (replace, one at a time) |
| `HideUI` | `cancel(promptId)` |

## What the intent must cover

- A `status` tone on a prompt (esx colours the box by type).
- Replace-in-place semantics for a single library-owned prompt, called up to twice a second without flicker.

## Mechanism

**Stand-in** (`nuikit_esx_textui`, `provide 'esx_textui'`, both exports under its name; `ESX.TextUI` / `HideUI`
defined the documented way). What the spike decides: stand-in rules.

## Replay test

Recording: `TextUI('[E] Open', 'info')` ×3 at 500 ms, `TextUI('[E] Close', 'error')`, `HideUI()`, `HideUI()`.

1. One `prompt` opened with `keys = ['E']`, `label = 'Open'`, `status = 'info'`; the repeats produced no
   reopen (an `update` with identical content, or nothing).
2. The change produced one `update` with the new label and status.
3. First `HideUI` cancelled; the second did nothing.
