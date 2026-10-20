# {{name}}

A shop made with [nuikit](https://github.com/belibathan/nuikit), from the `shop` block.
- **The catalogue:** items by category in a grid, with price and stock; sold-out and locked items are dimmed.
- **The cart:** click an item to add it, step the count up or down, choose cash or bank, check out, confirm.

It's built from the kit (Panel, ItemSlot, Money, MenuRow, Confirm, EmptyState, shadcn Tabs) and follows the
server's nuikit theme.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=store|vending|broke, ?fail=1
{{pm}} run build  # production build into web/dist
```

**In game:** `ensure nuikit` first, then `ensure {{name}}`. Walk into the 24/7 on Innocence Blvd (a toast says
how) and press E or run `/{{name}}`.

## The server decides, every time

The page checks the cart so the player sees what's wrong before asking, but the cart is only a request. On
every purchase `server/main.lua` checks:

- the player is at the shop (the server's own position for them; needs OneSync);
- every line is an item this shop sells, with a whole count from 1 to its `max` (or 99), lines for the same item
  merged, never more than what's in stock;
- the price is the server's (`Config.shops`), never the page's, and the player has that much;
- one purchase at a time per player.

Then the money and the items move **all or nothing**: it takes the money, gives each item, and if one can't be
given (the player can't carry it, or the framework errors) it takes back what it gave and refunds the money. A
refund that fails is printed in red in the server console. Stock goes down only after a purchase goes through.

**OneSync:** the position check needs it. Without it the resource prints a red error at start and every request
is refused ("This shop needs OneSync on the server.").

## What the example does, and what a real server changes

| | The example | On your server |
|---|---|---|
| Money | Cash 500 and bank 2,500 per license in `shop.json` | `Config.money` (commented Qbox lines; QBCore and ESX named) |
| Items | A bag per license in `shop.json` | `Config.items` (commented ox_inventory lines; QBCore and ESX named): `add` must return false when they can't carry it |
| Stock | `stock` per item, refilled on restart | Keep it in your database if it should last |
| Images | An icon per item | `image = 'nui://ox_inventory/web/images/water.png'` (your inventory's own images) |

## Files

| | |
|---|---|
| `config.lua` | Shops (where, payment, categories, items, prices, stock), the key, `Config.money`, `Config.items` |
| `client/main.lua` | Opens the nearest shop, passes the checkout on. `nk.surface`, `nk.on` |
| `server/main.lua` | Prices, stock, money and items, and every check |
| `web/src/components/blocks/shop/` | The block: `shop.tsx` (UI), `nui.ts` (messages), `fixtures.ts` (every state) |
| `web/src/dev.tsx` | The fake game for browser development |
