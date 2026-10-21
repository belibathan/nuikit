# qb-core notifications → `notify`

*Clean-room spec. Written from [qbcore.org/docs/qb-core/client-function-reference](https://qbcore.org/docs/qb-core/client-function-reference)
and [client-event-reference](https://qbcore.org/docs/qb-core/client-event-reference). Qbox's
`exports.qbx_core:Notify` is documented at [docs.qbox.re](https://docs.qbox.re/resources/qbx_core/exports/client) and lands in
ox_lib: on Qbox no adapter is needed, the ox_lib override draws it. Mechanism proposed; the spike decides.*

## Source

Documented: `QBCore.Functions.Notify(text, textype, length)`, the `QBCore:Notify` event (client and server),
the table form `{ text, caption }`, default type `'primary'`, default length 5000. **Not documented**: the full
type list (examples show `'primary'`, `'success'`, `'police'`; scripts also use `'error'`, `'warning'`,
`'ambulance'`: treat unknown types as info with the type kept in `meta`), position (none), whether
`Functions.Notify` triggers the event or draws directly (assume directly: that is why sellers tell owners to
edit `qb-core/client/functions.lua`), and qb-core's own page (`html/`) message format.

## Public API

**`QBCore.Functions.Notify(text, textype?, length?)`** (client) → nothing.
**`TriggerEvent('QBCore:Notify', text, textype?, length?)`** (client) and
**`TriggerClientEvent('QBCore:Notify', source, text, textype?, length?)`** (server) → nothing.

| Arg | Type | Meaning |
|---|---|---|
| `text` | string \| `{ text: string, caption: string }` | message; the table form adds a caption (title) |
| `textype` | string? | `'primary'` default; `'success'`, `'error'`, `'warning'`, `'police'`, `'ambulance'`, … |
| `length` | number? | ms, default 5000 |

The caller gets nothing back; there is no id, update or dismiss.

## Intent and field mapping

`notify` (architecture §2: title, description, status, icon, duration, position).

| qb-core | `notify` |
|---|---|
| `text` (string) | `description` |
| `{ text, caption }` | `description = text`, `title = caption` |
| `textype` `primary` | `status = 'info'` |
| `success` / `error` / `warning` | `status` same |
| `police` / `ambulance` / other | `status = 'info'`, `meta.kind = textype` (renderers may colour or icon it) |
| `length` | `duration` (ms) |
| (none) | `position`: the pack's config default |

## What the intent must cover

- A `meta.kind` (or `variant`) for library-specific types a renderer may style (police, ambulance).
- Description-only notifications (no title) as the common case.
- Durations in ms, with the library's default when absent.

## Mechanism

**Listener** for the event (`RegisterNetEvent('QBCore:Notify')` in `nuikit_qb_notify`): catches every server
notification and every local `TriggerEvent`, which is most of them. **Plus page override** of qb-core's own page
for the direct `QBCore.Functions.Notify` calls the listener cannot see: that page forwards its notify messages to
`https://nuikit/intent` (the routing mechanism the spike measures) and draws nothing itself, which also silences
qb-core's drawing for the event path (no config flag exists). What the spike decides: step 7 shows whether
`CancelEvent()` stops qb-core's drawing (then the override is only for direct calls), and step 8 whether a page
may post across resources (else the override page needs the host). qb-core's page message format is not public:
the override is written from a recorded `SendNUIMessage` log, the way `docs/ox-lib-protocol.md` was.

## Replay test

Recording: local and server `QBCore:Notify` in string and table form, each type, lengths absent and present.

1. One `notify` intent per event with the mapping above; `title` only for the table form.
2. `duration` equals `length`, or 5000 when absent.
3. Unknown types keep `status = 'info'` and `meta.kind`.
4. The caller's event handlers (other resources listening to `QBCore:Notify`) still ran: the listener never
   cancels unless the spike proved it safe.
