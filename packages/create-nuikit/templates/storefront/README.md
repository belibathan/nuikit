# {{name}}

The counter of a player-run business, made with [nuikit](https://github.com/belibathan/nuikit), from the `storefront` block.
- **The counter:** the business's name and whether it's open, its products with the price and stock the business set.
- **The cart:** click a product to add it, step the count, choose cash or bank, check out, confirm. The money goes to the business account.
- **Manage** (the business's employees only): open or close, set a price within the range you allow, switch a product on or off, restock from your own inventory.

It's built from the kit (Panel, ItemSlot, Money, MenuRow, Confirm, EmptyState, shadcn Tabs) and follows the
server's nuikit theme. It's not the `shop` block: that one is an NPC store with fixed prices; here players
run the business.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=burgers|parts|closed|staff|broke, ?fail=1
{{pm}} run build  # production build into web/dist
```

**In game:** `ensure nuikit` first, then `ensure {{name}}`. Walk up to Burger Shot in Vespucci (a toast says how)
and press E or run `/{{name}}`. To try Manage, add your license to `Config.staff`.

## The server decides, every time

The page checks the cart so the player sees what's wrong before asking, but the cart is only a request. On
every purchase `server/main.lua` checks:

- the player is at the counter (the server's own position for them; needs OneSync) and the business is open;
- every line is a product on sale here, with a whole count from 1 to its `max` (or 99), lines for the same
  product merged, never more than what's in stock;
- the price is the server's (the business's current price), never the page's, and the player has that much;
- one purchase at a time per player, and at most one request of each kind per `Config.rateMs`.

Then the money and the items move **all or nothing**: it holds the stock, takes the money from the buyer,
gives each item, and credits the business; if any step fails it undoes the ones before it and puts the stock
back. A refund that fails is printed in red in the server console. Two buyers can't both get the last item.

Every Manage action first checks the player's **job and grade** for that business (`job`, `manageGrade`),
again on every request, and that they're at the counter. Prices must be whole numbers inside the product's
`minPrice`–`maxPrice`. A restock only takes items the employee actually carries (through `Config.items`), only
for products that count their stock, and never past `maxStock`.

**OneSync:** the position check needs it. Without it the resource prints a red error at start and every request
is refused.

## What the example does, and what a real server changes

| | The example | On your server |
|---|---|---|
| Employees | `Config.staff`, by license | `Config.job` (Qbox, QBCore, ESX lines in the comments) |
| Buyer's money | Cash 500 and bank 2,500 per license in `storefront.json` | `Config.money` |
| Business account | A balance per business in `storefront.json` | `Config.account` (Renewed-Banking, qb-management, esx_society lines) |
| Items | A bag per license in `storefront.json` | `Config.items` (ox_inventory lines): `add` must return false when they can't carry it; `remove` and `count` serve restocks |
| Prices, stock, open | Kept in `storefront.json` | Same, or move `db.biz` into your database |

## Files

| | |
|---|---|
| `config.lua` | Businesses (where, job, products, price range, stock), the key, the rate limit, the framework hooks |
| `client/main.lua` | Opens the nearest counter, passes the checkout and manage actions on. `nk.surface`, `nk.on` |
| `server/main.lua` | Prices, stock, money, items, jobs, and every check |
| `web/src/components/blocks/storefront/` | The block: `storefront.tsx` (UI), `nui.ts` (messages), `fixtures.ts` (every state) |
| `web/src/dev.tsx` | The fake game for browser development |
