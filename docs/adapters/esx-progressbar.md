# esx_progressbar → `progress`

*Clean-room spec. Written from [docs.esx-framework.org/en/esx_core/esx_progressbar](https://docs.esx-framework.org/en/esx_core/esx_progressbar).
Mechanism proposed; the spike decides.*

## Source

Documented: `ESX.Progressbar(text, length, options)`, `ESX.CancelProgressbar()`, the exports with the same
arguments, the options table. **Not documented**: whether the player can cancel (no `canCancel`; assume only
code cancels, record it), what happens when one is running, the animation's exact fields for `scenario`
(`lib`/`dict` naming suggests `dict` + `lib` for anims; a scenario name for scenarios), units of `length`
(assume ms).

## Public API

**`ESX.Progressbar(text, length, options)`** / **`exports['esx_progressbar']:Progressbar(text, length, options)`** → nothing.

| Arg / option | Type | Meaning |
|---|---|---|
| `text` | string | label |
| `length` | number | ms |
| `options.FreezePlayer` | bool | freeze while running |
| `options.animation` | `{ type: 'anim' \| 'scenario', lib, dict }` | played while running |
| `options.onFinish` | function | at completion |
| `options.onCancel` | function | on `CancelProgressbar` |

**`ESX.CancelProgressbar()`** / **`exports['esx_progressbar']:CancelProgressbar()`** → nothing; `onCancel()`.

What the caller gets back: exactly one of `onFinish()` or `onCancel()`.

## Intent and field mapping

| esx_progressbar | `progress` |
|---|---|
| `text` | `label` |
| `length` | `duration` (ms) |
| (no player cancel) | `cancel: false` |
| `FreezePlayer`, `animation` | adapter Lua, as the library did; not on the intent |
| `CancelProgressbar` | `cancel(progressId)` → `onCancel()` |
| (none) | `style: 'bar'` |

Resolve at `duration` → `onFinish()`.

## What the intent must cover

- Non-cancellable bars (`cancel: false`), resolved by the runtime at `duration`.
- Cancel by code with the caller told which callback ran.

## Mechanism

**Stand-in** (`nuikit_esx_progressbar`, `provide 'esx_progressbar'`, both exports under its name). `ESX.Progressbar`
is documented as esx_progressbar's own function; the stand-in defines it the same documented way. What the spike
decides: stand-in rules.

## Replay test

Recording: `Progressbar('Repairing', 5000, { FreezePlayer = true, animation = …, onFinish, onCancel })`,
`wait 5000`; a second one cancelled at 1000 ms; a third started while one runs.

1. `onFinish` once after 5000; `onCancel` once for the cancelled one; never both.
2. `FreezePlayer` and the animation applied through the mocked natives for the bar's lifetime only.
3. Third case: whatever the recording shows the library did (refuse or replace), the adapter did the same.
