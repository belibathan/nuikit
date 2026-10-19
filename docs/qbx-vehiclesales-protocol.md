# qbx_vehiclesales contract: NUI protocol

Clean-room notes for `addons/qbx_vehiclesales`. They describe what qbx_vehiclesales' Lua
(GPL-3.0, © Qbox project) sends to and expects from its page, written from reading
`client/main.lua`, `server/main.lua`, `config/client.lua`, the locale file and `fxmanifest.lua`.
No code, markup or styles were copied; the addon is written from these notes.

## Page

- `fxmanifest.lua`: `ui_page 'html/ui.html'`.
- `files` lists exactly `html/logo.svg`, `html/ui.css`, `html/ui.html`, `html/vue.min.js`,
  `html/ui.js` (no globs). Only those names are served, so the build is exactly those five files.
  `logo.svg` is ours (shown in the contract header; servers can replace it with their brand).
  `vue.min.js` is a one-line placeholder: the manifest lists it, nothing loads it.
- Hidden until a contract opens.

## Lua → UI (`SendNUIMessage`)

Flat messages (no `data` wrapper). Lua calls `SetNuiFocus(true, true)` right before each.

### `sellVehicle`: the owner lists the car they are sitting in

```
{
  action = 'sellVehicle',
  showTakeBackOption = false,
  bizName = <string, config.zones[zone].businessName, e.g. "Vehicle Sales Contract - …">,
  sellerData = { firstname, lastname, account, phone },  -- the player's own charinfo
  plate = <string>,
}
```

The player fills in a description and an asking price.

### `buyVehicle`: someone views a listed car's contract

```
{
  action = 'buyVehicle',
  showTakeBackOption = <true when the viewer's first+last name match the seller's>,
  bizName = <string>,
  sellerData = { firstname, lastname, account, phone },
  -- when the seller can't be found these are locale placeholders, e.g. "not" / "known" /
  -- "Account not known.." / "telephone number not known.."
  vehicleData = { desc = <string>, price = <number or numeric string> },
  plate = <string>,
}
```

Read-only. The viewer can buy, or (seller only) take the car back off the lot.

## UI → Lua (POST `https://<resource>/<name>`, JSON)

| name              | body                            | Lua does |
| ----------------- | ------------------------------- | -------- |
| `sellVehicle`     | `{ price, desc }`               | Reads the current vehicle's plate and props, triggers `qb-occasions:server:sellVehicle(price, …)`, which inserts `price` and `desc` into `occasion_vehicles` as given, then deletes the car with a fade and notifies "…put up for sale! Price - $<price>". |
| `buyVehicle`      | `{}`                            | `qb-occasions:server:buyVehicle(currentVehicle)`. |
| `takeVehicleBack` | `{}`                            | `qb-occasions:server:ReturnVehicle(currentVehicle)`. |
| `close`           | `{}`                            | `SetNuiFocus(false, false)`. |

All reply `'ok'`. After `sellVehicle`, `buyVehicle` or `takeVehicleBack` the page must also POST
`close` (focus is only released there) and hide. Escape → `close`.

`price` is stored and later compared with the buyer's bank balance and multiplied, so the addon
sends a positive whole number (not a string), at most 2147483647 (the column is `int(11)`).
`desc` is a string (may be empty; the column is `longtext`).

## Money

On a sale the buyer pays `price`; the seller receives `ceil(price / 100 × 77)` (server). So the
seller nets 77 %. The 23 % the seller doesn't get is presented, as the stock page does, as 19 %
tax and 4 % dealer fee; those two lines are display only.
