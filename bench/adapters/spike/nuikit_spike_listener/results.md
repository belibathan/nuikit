# Listener spike: results

*Not run yet. Every cell is empty until the owner runs [`../../checklist.md`](../../checklist.md) steps 6–7.*

Build: — · Server: Qbox b— · Date: — · `nuikit_spike_listener_cancel`: 0 / 1

## Seen vs drawn

After `/spike_listener clear`, then `/spike_notify local`, `/spike_notify server`, `/spike_notify direct`.

| Path | Event / call | Listener logged | Drawn on screen by the library | `from` field |
|---|---|---|---|---|
| local | `QBCore:Notify` (string) | | | |
| local | `QBCore:Notify` (table) | | | |
| local | `ox_lib:notify` | | | |
| local | `esx:showNotification` | | (no esx on Qbox: expected none) | |
| local | `okokNotify:Alert` | | (expected none) | |
| local | `mythic_notify:client:SendAlert` | | (expected none) | |
| server | the same six | | | should read `server/unknown` |
| direct | `exports.qbx_core:Notify` | (expected **not** logged) | | |
| direct | `QBCore.Functions.Notify` | (expected **not** logged; Qbox: n/a unless qb-core bridge answers) | | |
| direct | `lib.notify` | (expected **not** logged) | | |

Intercepted: — / — · Missed (drawn but not logged): —

## CancelEvent()

Repeat `/spike_notify server` with `setr nuikit_spike_listener_cancel 1` and `restart nuikit_spike_listener`.

| Event | Library still drew it? |
|---|---|
| `QBCore:Notify` | |
| `ox_lib:notify` | |

## Silence flags (public config; fill what the owner's install shows)

| Library | Documented flag to turn its own notify UI off | Verified |
|---|---|---|
| qbx_core (`QBCore:Notify` → `lib.notify`) | none documented | |
| ox_lib | none documented | |
| qb-core | none documented (sellers tell owners to edit `QBCore.Functions.Notify`) | |
| es_extended / esx_notify | none documented | |
| okokNotify | none documented | |
| mythic_notify | none documented | |

## Cost

| | resmon idle (ms) | during `/spike_notify server` ×10 (ms) |
|---|---|---|
| nuikit_spike_listener | | |

## Verdict

- Event-driven notifies reach a listener: yes / no / …
- Direct calls are missed (as designed): confirmed / surprising because …
- `CancelEvent()` stops the library's drawing: yes / no / per library …
- Decision for notify adapters (checklist rule): listener (+ cancel) / stand-in / page override per framework, because …
