# {{name}}

A garage made with [nuikit](https://github.com/belibathan/nuikit), from the `garage` block.
- **The panel:** your vehicles at a garage, filtered by where they are (stored, out, impounded), and the selected one's fuel, engine and body.
- **The actions:** take a vehicle out, store the one you're driving, or pay to release one from the impound.

It's built from the kit (Panel, MenuRow, Meter, shadcn Tabs) and follows the server's nuikit theme.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=on-foot|impounded|empty, ?fail=1
{{pm}} run build  # production build into web/dist
```

**Needs OneSync.** The server spawns, reads and deletes the vehicles and checks where you stand, which only
works with OneSync. Qbox, QBCore and ESX servers already run it; otherwise add `set onesync on` to `server.cfg`.
Without it the resource prints a red error at start and refuses every request ("This garage needs OneSync on
the server.").

**In game:** `ensure nuikit` first, then `ensure {{name}}`. Go to a garage from `config.lua` (Legion Square is
the default) and press F6 or run `/{{name}}`. Drive a car in and press **Store vehicle**; pick it and
press **Take out** (or Enter) to get it back at the garage's spawn point.

## What the example does, and what a real server changes

| | The example | On your server |
|---|---|---|
| Who owns what | Any vehicle you store becomes yours unless its plate is already someone else's, kept in `vehicles.json` in this resource, per license | Read ownership from your framework's vehicle table (`player_vehicles`, `owned_vehicles`) in `server/main.lua` |
| Impound | `exports['{{name}}']:impound(plate, fee)` from your police script | The same, or your impound resource's state |
| The fee | `Config.charge` takes it and `Config.refund` gives it back if the release fails (commented Qbox, QBCore, ESX lines; free when standalone) | Uncomment yours |
| Vehicle mods | Not saved (model, plate, fuel, engine and body only) | Save and apply your framework's vehicle properties |

## The server decides, every time

Every button asks `client/main.lua`, which asks the server. The server checks everything again and trusts
nothing from the page:
- **Who and what:** ids and plates are strings of 1 to 8 letters, digits and spaces; a vehicle is only looked up
  among the caller's own records (by license); a plate someone else owns is refused.
- **Where:** the caller stands at the garage, by the server's own view of their position (OneSync; without it every
  request is refused and a red line says so at start).
- **Store:** the vehicle is the one the caller is driving (its network id, checked against the driver seat), and
  model, plate, fuel, engine and body are read from the game, not from the page.
- **Take out and release:** the server spawns and deletes the vehicles itself, marks a record busy before anything
  yields (a double click or a replay finds it out), and charges the impound fee only after every check passed,
  refunding it when the release fails.
- **Rate:** at most 10 requests a second per player (`helpers/rate_limiter.lua`).
- **The file:** `vehicles.json` is read once at start with `helpers/json_safe.lua`; an unreadable file stops the
  resource instead of being emptied by the next save.

If the answer is an error ("Something is parked in the way", "You can't pay the fee"), it shows on the panel; the
page never decides on its own.

## Files

| | |
|---|---|
| `config.lua` | Garages (where, spawn point), the key, the save file, `Config.charge` |
| `client/main.lua` | Opens the panel, spawns and stores vehicles. `nk.surface`, `nk.on` |
| `server/main.lua` | Vehicle records: list, store, take out, release, impound |
| `web/src/components/blocks/garage/` | The block: `garage.tsx` (UI), `nui.ts` (messages), `fixtures.ts` (every state) |
| `web/src/dev.tsx` | The fake game for browser development |
