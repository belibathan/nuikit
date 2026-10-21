# esx_notify / `ESX.ShowNotification` → `notify`

*Clean-room spec. Written from [docs.esx-framework.org/en/esx_core/esx_notify](https://docs.esx-framework.org/en/esx_core/esx_notify)
and [es_extended client functions](https://docs.esx-framework.org/en/esx_core/es_extended/client/functions).
Mechanism proposed; the spike decides.*

## Source

Documented: `ESX.ShowNotification(message, type, length, title?, position?)`, `exports['esx_notify']:Notify(…)`
(the page's example orders it `type, message, length, title, position`, unlike the function; the recording
settles it), the server event `esx:showNotification`, types and positions. Also documented in es_extended:
`ESX.ShowAdvancedNotification` (GTA's native feed) and `ESX.ShowHelpNotification` (GTA's help text). **Not
documented**: whether `length` is ms (assume ms), a config for turning esx_notify's drawing off, legacy builds
where `ShowNotification` draws GTA's native notification instead of esx_notify.

## Public API

**`ESX.ShowNotification(message, type?, length?, title?, position?)`** (client) → nothing.
**`exports['esx_notify']:Notify(type, message, length?, title?, position?)`** (client; order per the docs example) → nothing.
**`TriggerClientEvent('esx:showNotification', playerId, message, type?, length?, title?, position?)`** → nothing.

| Arg | Type | Values |
|---|---|---|
| `message` | string | |
| `type` | string? | `success`, `error`, `info`, `warning` |
| `length` | number? | ms |
| `title` | string? | |
| `position` | string? | `top-right`, `top-left`, `top-middle`, `bottom-right`, `bottom-left`, `bottom-middle`, `middle-left`, `middle-right` (default) |

**`ESX.ShowAdvancedNotification(sender, subject, msg, textureDict, iconType, flash?, saveToBrief?, hudColorIndex?)`**:
GTA's feed with a picture; **`ESX.ShowHelpNotification(msg, thisFrame?, beep?, duration?)`**: GTA's help text,
per frame unless `duration`. Both are native-drawn; see Mechanism.

## Intent and field mapping

| esx | `notify` |
|---|---|
| `message` | `description` |
| `title` | `title` |
| `type` `info` / `success` / `error` / `warning` | `status` same |
| `length` | `duration` (ms) |
| `position` `top-middle` / `bottom-middle` | `position` `top` / `bottom`; the six others map 1:1 (`middle-left` → `center-left`) |
| `ShowAdvancedNotification` | `notify` with `title = sender`, `description = subject + "\n" + msg`, `icon = { textureDict }` as `meta.picture`; native feed untouched unless the pack's config says replace |
| `ShowHelpNotification` | `prompt`-like, out of scope for 0.7 (native help text stays) |

## What the intent must cover

- All eight positions (ox_lib's set plus `top` and `bottom`).
- A picture (texture dictionary) in `meta` for the advanced feed form.

## Mechanism

**Listener** for `esx:showNotification` (server path) + **stand-in** for esx_notify (`provide 'esx_notify'`,
`Notify` export under its name) so the client path and direct calls land too: `ESX.ShowNotification` is documented
as esx_notify's function, so replacing the resource replaces the drawing. If a build's `ESX.ShowNotification`
draws natively instead, the doctor reports it. What the spike decides: as for qb-menu (stand-in rules); the
listener alone is enough only if step 7 shows `CancelEvent()` silences esx_notify.

## Replay test

Recording: `ShowNotification` with every type and position, with and without `title` / `length`; the export form;
the server event; one `ShowAdvancedNotification`.

1. One `notify` per call with the mapping above; `duration` default = the library's (record it).
2. Positions mapped to the intent's set, none dropped.
3. The export's argument order matches what the recording shows the library accepted.
4. Advanced notifications carried the picture in `meta`.
