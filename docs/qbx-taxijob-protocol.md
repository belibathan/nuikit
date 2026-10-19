# qbx_taxijob meter: NUI protocol

Clean-room notes for `addons/qbx_taxijob`. They describe what qbx_taxijob's Lua (GPL-3.0, © Qbox
project) sends to and expects from its page, written from reading `client/main.lua`,
`config/client.lua` and `fxmanifest.lua`. No code, markup or styles were copied; the addon is
written from these notes.

## Page

- `fxmanifest.lua`: `ui_page 'html/meter.html'`.
- `files` lists exactly `html/meter.css`, `html/meter.html`, `html/meter.js` (no globs). Anything
  else in `html/` is not served, so the build must be exactly those three files, with no chunks,
  fonts or images beside them.
- The page is always loaded and drawn without focus. Hidden by default.

## Lua → UI (`SendNUIMessage`)

Every message is flat: `{ action = '…', … }` (no `data` wrapper).

| action        | fields                                   | meaning |
| ------------- | ---------------------------------------- | ------- |
| `openMeter`   | `toggle = true`, `meterData = config.meter` | Show the meter. |
| `openMeter`   | `toggle = false` (no `meterData`)        | Hide the meter. Sent by the command again, and by a thread when the player leaves the driver seat / taxi. |
| `toggleMeter` | none                                     | Flip the fare counter between running and stopped. **The page owns this state** (see below). |
| `updateMeter` | `meterData = { fareAmount, currentFare, distanceTraveled }` | Live values while running. |
| `resetMeter`  | none                                     | Back to zero fare and distance. Does not change running/stopped. |

`config.meter` (the `openMeter` payload): `defaultPrice` (number, price per mile, default 125.0),
`startingPrice` (number, flat start fare, default 0), `useGpsPrice` (boolean).

`updateMeter.meterData`: `currentFare` is a whole number (floored) in dollars; `distanceTraveled`
is miles (float, metres / 1609); `fareAmount` is a constant leftover (6) and is not displayed.

Typical sequences:

- `/taximeter` style toggle (`qb-taxi:client:toggleMeter`): `openMeter` true ↔ `openMeter` false.
- `qb-taxi:client:enableMeter` (start/stop by key or command): `toggleMeter`.
- NPC mission pickup: `openMeter` true, then `toggleMeter` (start).
- NPC mission drop-off: `toggleMeter` (stop), then `resetMeter`.

## UI → Lua (POST `https://<resource>/<name>`, JSON)

| name          | body                      | Lua does |
| ------------- | ------------------------- | -------- |
| `enableMeter` | `{ enabled: boolean }`    | Sets its running flag; `false` also resets its counters; records the start position. Replies `'ok'`. |
| `hideMouse`   | `{}`                      | `SetNuiFocus(false, false)`. Replies `'ok'`. |

### The running/stopped state

Lua never says which state the meter is in. On every `toggleMeter` the page flips its own flag
and POSTs `enableMeter { enabled: <new flag> }`; Lua then starts or stops counting. The page must
therefore:

- start in "stopped",
- flip exactly once per `toggleMeter` and always report the new value,
- keep the flag across `openMeter` hide/show and across `resetMeter`.

### Mouse

`qb-taxi:client:toggleMuis` gives the page focus and cursor (`SetNuiFocus(true, true)`) while the
meter is open. The stock page has no way to give it back. This addon releases it with
`hideMouse` on Escape or right click, and on the close button. With the cursor active the
running/stopped control can be clicked, which does exactly what `toggleMeter` does (flip, then
`enableMeter`).
