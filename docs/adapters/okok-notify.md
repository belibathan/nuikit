# okokNotify → `notify`

*Clean-room spec. okokNotify is a paid resource; its docs site (docs.okok.pt) blocks automated readers, so this
is written from the publicly posted usage ([forum thread](https://forum.cfx.re/t/change-es-extended-paycheck-lua-notification-with-okoknotify/4772254)).
The owner should check the export's trailing arguments against the docs page before step 7. Mechanism proposed.*

## Source

Public usage: `exports['okokNotify']:Alert(title, message, time, type)` and
`TriggerClientEvent('okokNotify:Alert', source, title, message, time, type)`; types `success`, `info`,
`warning`, `error`, `phone`, `neutral`; `time` in ms. **Not confirmed**: a fifth `playSound` boolean (commonly
cited), a position config, server-side export.

## Public API

**`exports['okokNotify']:Alert(title, message, time, type?, playSound?)`** (client) → nothing.
**`TriggerClientEvent('okokNotify:Alert', source, title, message, time, type?, playSound?)`** → nothing.

| Arg | Type | Values |
|---|---|---|
| `title` | string | |
| `message` | string | |
| `time` | number | ms |
| `type` | string? | `success`, `info`, `warning`, `error`, `phone`, `neutral` |
| `playSound` | bool? | to confirm |

## Intent and field mapping

| okokNotify | `notify` |
|---|---|
| `title`, `message` | `title`, `description` |
| `time` | `duration` |
| `success` / `info` / `warning` / `error` | `status` same |
| `phone` / `neutral` | `status = 'info'`, `meta.kind` |
| `playSound` | `sound: true/false` |

## What the intent must cover

- A `sound` flag (play the renderer's notification sound or not).
- `meta.kind` for `phone` / `neutral`.

## Mechanism

**Stand-in** (`nuikit_okok_notify`, `provide 'okokNotify'`, `Alert` under its name, `okokNotify:Alert` handled).
okokNotify is only UI. A listener alone would double-draw (no silence flag known). What the spike decides:
stand-in rules; case-sensitivity of the resource name in `provide` and the export (the real folder is
`okokNotify`) is worth a line in results.

## Status

**Built** (`adapters/[nuikit-standalone]/nuikit_okok_notify`, replay test `bench/adapters/replay/standalone/okok-notify.test.mjs`). `provide 'okokNotify'` keeps the real folder's case. Unproven in game.

## Replay test

Recording: `Alert` with each type, with/without `playSound`; the server event.

1. One `notify` per call with the mapping; `sound` present when given.
2. Unknown types → `info` + `meta.kind`.
