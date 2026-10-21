# nuikit_spike_listener

Handles the notification events every framework emits and logs them. Draws nothing.

| Event | Emitted by | Args logged |
|---|---|---|
| `QBCore:Notify` | qb-core, and qbx_core's qb bridge | text or `{text, caption}`, type, length |
| `ox_lib:notify` | `TriggerClientEvent` from server scripts (server-side `lib.notify`) | title, description, type, duration, position, icon |
| `esx:showNotification` | es_extended / esx_notify | message, type, length, title, position |
| `esx:showAdvancedNotification` | es_extended | sender, subject, message |
| `okokNotify:Alert` | okokNotify | title, message, time, type, playSound |
| `mythic_notify:client:SendAlert` / `PersistentAlert` | mythic_notify | type, text, length / action, id |

What a listener **cannot** see: direct calls into the library on the client (`exports.qbx_core:Notify`,
`QBCore.Functions.Notify`, `lib.notify`). `/spike_notify direct` sends those; they must show on screen and be
absent from this log. That gap is the measurement.

**Silencing the library's own drawing.** None of these libraries documents a config flag that turns its own
notification UI off while keeping the event (table in `results.md`). The one generic lever is `CancelEvent()`
from the handler; `setr nuikit_spike_listener_cancel 1` turns it on so the owner can see whether the library
still draws. If it doesn't, listener + cancel is a complete mechanism for event-driven notifies; if it does, a
listener only works where the library has a flag or is replaced by a stand-in / page override.

## Commands

| Command | Does |
|---|---|
| `/spike_notify local` (caller) | triggers the six events locally (`TriggerEvent`) |
| `/spike_notify server` (caller) | the server `TriggerClientEvent`s the six (the real path) |
| `/spike_notify direct` (caller) | `exports.qbx_core:Notify`, `QBCore.Functions.Notify`, `lib.notify` where present |
| `/spike_listener counts` / `dump` / `clear` | the log |

## Success

`/spike_notify server` → six listener lines, and on Qbox two notifications on screen (ox_lib draws `QBCore:Notify`
through qbx_core's bridge, and `ox_lib:notify`). `/spike_notify direct` → notifications on screen, no listener lines.
