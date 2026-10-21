# progressbar (qb) → `progress`

*Clean-room spec. Written from the [progressbar README](https://github.com/qbcore-framework/progressbar) and
[qbcore.org/docs/qb-core/client-function-reference](https://qbcore.org/docs/qb-core/client-function-reference)
(`QBCore.Functions.Progressbar`). Mechanism proposed; the spike decides.*

## Source

Documented: `Progress`, `ProgressWithStartEvent`, `ProgressWithTickEvent` (two arities), `isDoingSomething`, the
data table, the `cancelled` callback argument, `QBCore.Functions.Progressbar`'s positional form. **Not
documented**: events, how a bar is cancelled by the player (the key), what happens when a bar starts while
one is running (assume: refused or replaced; record it), `useWhileDead` semantics beyond the name, the
`animation.task` / scenario form some scripts pass, `disarm`.

## Public API

**`exports['progressbar']:Progress(data, handler)`** → nothing; `handler(cancelled: boolean)` when done.

| `data` field | Type | Meaning |
|---|---|---|
| `name` | string | id of the bar |
| `duration` | number | ms |
| `label` | string | text |
| `useWhileDead` | bool | allowed while dead |
| `canCancel` | bool | player may cancel |
| `controlDisables` | `{ disableMovement, disableCarMovement, disableMouse, disableCombat }` | controls off while running |
| `animation` | `{ animDict, anim, flags }` (also `task` in the wild) | played while running |
| `prop`, `propTwo` | `{ model, bone, coords, rotation }` | attached while running |

**`ProgressWithStartEvent(data, start, finish)`**, **`ProgressWithTickEvent(data, tick, finish)`**,
**`ProgressWithTickEvent(data, start, tick, finish)`**: `start()` at start, `tick()` every frame, `finish(cancelled)`.

**`isDoingSomething()`** → boolean.

**`QBCore.Functions.Progressbar(name, label, duration, useWhileDead, canCancel, disableControls, animation, prop, propTwo, onFinish, onCancel)`**:
the same, positional; `onFinish()` or `onCancel()` (no args).

What the caller gets back: exactly one of `finish(false)` / `onFinish()` or `finish(true)` / `onCancel()`;
`start` and `tick` as scheduled.

## Intent and field mapping

`progress` (architecture §2: timed bar or circle, cancellable; animation and prop stay with the caller's Lua).

| progressbar | `progress` |
|---|---|
| `name` | `id` |
| `label` | `label` |
| `duration` | `duration` (ms) |
| `canCancel` | `cancel: true` |
| `useWhileDead`, `controlDisables`, `animation`, `prop`, `propTwo` | **adapter Lua**: played / disabled exactly as before; not on the intent (`meta.useWhileDead` for the doctor) |
| (none) | `style: 'bar'` (progressbar is always a bar) |

Resolve `{ done: true }` → `finish(false)` / `onFinish()`; cancel (player key or `cancel` intent) →
`finish(true)` / `onCancel()`. `start()` runs when the intent opens; `tick()` runs on the adapter's own
per-frame thread while the intent is open (never from the page).

## What the intent must cover

- An `id` the adapter can cancel by, and a query "is one running" (`isDoingSomething`).
- `cancel: false` bars that the player cannot dismiss, including through Escape.
- Opening a second bar while one runs: the runtime rejects it so the adapter can mirror the library (record which).
- Duration-driven completion resolved by the runtime at `duration`, not by the page's animation (reduced motion).

## Mechanism

**Stand-in** (`nuikit_qb_progressbar`, `provide 'progressbar'`, the four exports under progressbar's name).
`QBCore.Functions.Progressbar` lives in qb-core and (per the README) calls `exports['progressbar']:Progress`,
so it lands on the stand-in too; to confirm from the recorded log. What the spike decides: as for qb-menu.

## Replay test

Recording: `Progress` with all fields and `handler`, `wait 5000`; `Progress` with `canCancel` then a cancel;
`ProgressWithTickEvent` with start/tick/finish; `isDoingSomething` before/during/after; the positional form with
`onFinish`/`onCancel`.

1. `handler(false)` after `duration`, `handler(true)` on cancel; never both; `onFinish` / `onCancel` likewise.
2. `start` once at open; `tick` called while open and not after.
3. `isDoingSomething` true only while open.
4. The intent carried `id`, `label`, `duration`, `cancel`, `style: 'bar'`; animation/prop/controls never reached
   the page and were applied by the adapter (asserted through the mocked natives).
