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

Every button asks `client/main.lua`, which asks the server. The server checks everything again and trusts
nothing from the page: ids and plates must be short strings, only your own records are looked up, you must
be at the garage, a stored vehicle is read from the game (the one you're driving), and the server spawns and
deletes the vehicles itself (OneSync), so a vehicle can't come out twice. If the answer is an error ("Something is parked in the way",
"You can't pay the fee"), it shows on the panel; the page never decides on its own.

## Files

| | |
|---|---|
| `config.lua` | Garages (where, spawn point), the key, the save file, `Config.charge` |
| `client/main.lua` | Opens the panel, spawns and stores vehicles. `nk.surface`, `nk.on` |
| `server/main.lua` | Vehicle records: list, store, take out, release, impound |
| `web/src/components/blocks/garage/` | The block: `garage.tsx` (UI), `nui.ts` (messages), `fixtures.ts` (every state) |
| `web/src/dev.tsx` | The fake game for browser development |
