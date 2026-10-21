# {{name}}

A vehicle showroom made with [nuikit](https://github.com/belibathan/nuikit), from the `vehicle-shop` block.
- **The showroom:** vehicles by category on the left; the selected one stands on the showroom floor (a local preview
  only you see) with a camera on it, its stats, and a paint colour (swatches or any hex).
- **Test drive:** the server spawns it outside for `testDrive.seconds`, then takes it back and returns you.
- **Buy:** pick cash or bank, confirm; the server spawns your car outside with a new plate and puts you in it.

It's built from the kit (Panel, MenuRow, Meter, Money, ColorField, Confirm, shadcn Tabs) and follows the server's
nuikit theme.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=pdm|budget, ?fail=1
{{pm}} run build  # production build into web/dist
```

**In game:** `ensure nuikit` first, then `ensure {{name}}`. Walk into Premium Deluxe Motorsport (a toast says how) and
press E or run `/{{name}}`.

## The server decides, every time

The page shows prices and checks the wallet so the player sees what's wrong, but `server/main.lua` checks every
purchase again:

- a vehicle this showroom sells, at the server's price (`Config.shops`), never the page's;
- a real colour (`#rrggbb`), a payment method this showroom takes, the money;
- the player at the showroom (the server's own position for them; needs OneSync);
- one purchase at a time per player (a double click can't buy twice).

Then it's **all or nothing**: it takes the money, spawns the car itself with a new unique plate, and calls
`Config.onBought` to record it in your framework. If the spawn or `Config.onBought` fails (or throws), the car is
removed and the money refunded; a refund that fails is printed in red in the server console.

Test drives: one at a time, one every two minutes per player, spawned and removed by the server (also when the player
leaves).

**OneSync:** needed for the spawns and the position check. Without it the resource prints a red error at start and
every request is refused.

## What the example does, and what a real server changes

| | The example | On your server |
|---|---|---|
| Money | Cash 5,000 and bank 50,000 per license in `vehicle-shop.json` | `Config.money` (commented Qbox lines) |
| Owning the car | The plate is recorded in `vehicle-shop.json`; the car is yours to drive away | `Config.onBought`: add it to your framework's vehicle table (commented Qbox line) so your garage knows it |
| Keys | None | Give your key resource's keys in `Config.onBought` |
| Stats | The bars in `config.lua` | Your own numbers per model |

## Files

| | |
|---|---|
| `config.lua` | Showrooms (where, camera, delivery, test drives, vehicles, prices), paint swatches, `Config.money`, `Config.onBought` |
| `client/main.lua` | Opens the showroom, the camera and local preview, paint, entering the car, the test drive's end |
| `server/main.lua` | Prices, money, spawns, plates, test drives, and every check |
| `web/src/components/blocks/vehicle-shop/` | The block: `vehicle-shop.tsx` (UI), `nui.ts` (messages), `fixtures.ts` (every state) |
| `web/src/dev.tsx` | The fake game for browser development |
