# {{name}}

A bank made with [nuikit](https://github.com/belibathan/nuikit), from the `bank` block. It shows:
- your accounts;
- the selected account's balance and recent transactions;
- deposit, withdraw and transfer in a dialog that checks the amount first. At an ATM, transfers are off.

It's built from the kit (Panel, MenuRow, Stat) with shadcn Dialog and Input, and follows the server's
nuikit theme. The amount form moves to the kit's `form-field` and `confirm` components once they ship.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=atm|frozen|new, ?fail=1
{{pm}} run build  # production build into web/dist
```

**In game:** `ensure nuikit` first, then `ensure {{name}}`. Stand at a bank or an ATM from `config.lua` (the
Legion Square Fleeca is the default) and press F9 or run `/{{name}}`.

## The server decides, every time

- **Where:** a deposit, withdrawal or transfer only goes through at a bank or ATM from `config.lua`, checked from the
  server's own view of where the player stands (OneSync). An ATM never sends transfers. The page's "ATM" flag is not
  trusted.
- **How much:** whole dollars above zero, below the account's balance for a withdrawal or transfer, and only the
  accounts that exist (`cash`, `checking`, `savings`). Amounts are read from the request, never from the page's
  totals.
- **Transfers:** to a player who is online (by server id or account number); all or nothing, with a refund when the
  credit fails.
- **Rate:** at most 10 requests a second per player. Everything refused comes back as an error the panel shows.
- **Logs:** `helpers/log.lua` (fivem-foundation): every console line is `^N[RESOURCE] … ^7`.

## Money, and what a framework server changes

| | The example | With `Config.money` filled in |
|---|---|---|
| Cash and checking | Per player (license) in `bank.json`, starting at `Config.startCash` / `Config.startBank` | Your framework's cash and bank accounts (commented Qbox lines; QBCore and ESX equivalents named) |
| Savings | In `bank.json` | Still in `bank.json`: replace it with your banking resource's accounts |
| Transfers | To a server ID or the `LS-…` number the panel shows (the player's server ID), or `savings` for your own savings | The same |
| Transactions | The last 50 per player, in `bank.json` | The same, or your banking resource's history |

Every amount is checked again on the server (whole dollars, enough money, a recipient online). The page's
checks are only for the player. A refused move ("There isn't that much in the account.") shows in the dialog.
Where the player stands is the server's own position for them, never the page's: deposit and withdraw need a
bank or an ATM, transfers (savings included) a bank. Requests are rate-limited per player.

**OneSync:** the position check needs it. Without it the resource prints a red warning at start, the panel
still opens, and every money move is refused.

## Files

| | |
|---|---|
| `config.lua` | Banks, ATMs, the key, the save file, `Config.money` |
| `client/main.lua` | Opens the bank, passes every move to the server, refreshes the panel. `nk.surface`, `nk.on` |
| `server/main.lua` | Balances, transactions, deposit, withdraw, transfer |
| `web/src/components/blocks/bank/` | The block: `bank.tsx` (UI), `nui.ts` (messages), `fixtures.ts` (every state) |
| `web/src/dev.tsx` | The fake game for browser development |
