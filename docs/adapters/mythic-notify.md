# mythic_notify → `notify`

*Clean-room spec. mythic_notify is unmaintained (its author's release post says so); its README could not be
fetched, so this is written from publicly posted usage ([forum: release](https://forum.cfx.re/t/dev-resource-mythic-notifications/587071),
[forum: QBCore setup](https://forum.cfx.re/t/setup-mythic-notify-for-qbcore-framework/5251677)). Items marked
"to confirm" come from common knowledge of the API, not a document; the recorded log settles them. Mechanism proposed.*

## Source

Publicly shown: `exports['mythic_notify']:DoHudText(type, text)`; `DoCustomHudText(type, text, length)`;
types `inform`, `error`, `success`. To confirm: `DoLongHudText(type, text, length)`;
`SendAlert({ type, text, length?, style? })`; `PersistentAlert({ action: 'start' | 'end', id, type, text, style? })`;
`DoCustomHudText(type, text, length, style)` (fourth argument style, not caption); events
`mythic_notify:client:SendAlert` and `mythic_notify:client:PersistentAlert` with the same tables; default
length 2500 ms; `style` is a table of CSS properties.

## Public API

| Call | Args | Meaning |
|---|---|---|
| `DoHudText(type, text)` | | default length |
| `DoLongHudText(type, text, length)` | ms | |
| `DoCustomHudText(type, text, length, style)` | `style` CSS table | |
| `SendAlert(data)` | `{ type, text, length?, style? }` | |
| `PersistentAlert(data)` | `{ action, id, type, text, style? }` | `start` shows until `end` with the same `id` |
| event `mythic_notify:client:SendAlert` (data) | | server path |
| event `mythic_notify:client:PersistentAlert` (data) | | server path |

Nothing returns.

## Intent and field mapping

| mythic_notify | `notify` |
|---|---|
| `text` | `description` |
| `inform` / `error` / `success` | `status` `info` / `error` / `success` |
| `length` | `duration` (default 2500) |
| `style` | `meta.style` (CSS table; renderers may ignore; the doctor notes it) |
| `PersistentAlert start` | `notify` with `duration: 0` (until dismissed), `id = data.id` |
| `PersistentAlert end` | `cancel(id)` |

## What the intent must cover

- Persistent notifications (`duration: 0`) addressed by a caller-chosen `id`, dismissed by `cancel`.
- Unknown `style` passthrough in `meta` without validation errors.

## Mechanism

**Stand-in** (`nuikit_mythic_notify`, `provide 'mythic_notify'`, the five exports under its name, the two events
handled). What the spike decides: stand-in rules. Low priority: an unmaintained library; kept because old
scripts still call it.

## Status

**Built** (`adapters/[nuikit-standalone]/nuikit_mythic_notify`, replay test `mythic-notify.test.mjs`). Unproven in game.

## Replay test

Recording: each export once; `PersistentAlert start` then `end`; the events.

1. One `notify` per call; `duration` 2500 when absent.
2. Persistent: one `notify` with `duration: 0` and the id, then one `cancel` of that id.
3. `style` reached `meta.style` unchanged.
