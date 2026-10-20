# {{name}}

An inventory made with [nuikit](https://github.com/belibathan/nuikit), from the `inventory` block.
- **Two panes:** your pockets and, when you stand at one, a stash, each with a weight meter.
- **Drag and drop:** drag to move; Shift drags half, Ctrl drags one; drop on the same item to stack, on another to
  swap. A tooltip shows the details.
- **Use:** select an item and press Use (or click it again, or double-click). The first five slots are the hotbar:
  keys 1–5 use them, and a strip shows on the game for a moment.

It's built from the kit (Panel, ItemSlot, Meter) and follows the server's nuikit theme.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=pockets|locker|heavy|empty|hotbar, ?fail=1
{{pm}} run build  # production build into web/dist
```

**In game:** `ensure nuikit` first, then `ensure {{name}}`. Press TAB. Stand at the locker (Mission Row, in
`config.lua`) and press TAB for the stash next to your pockets. Give yourself things from the server console:
`{{name}}_give <your id> toolbox 1`.

**Already running ox_inventory, qb-inventory or another?** This is a standalone inventory for servers without one,
and the example of the rules below. Run one or the other (for ox_inventory, nuikit has a UI override that keeps it
and restyles it). The server warns at start when one of them is running.

## The server decides, every time

Every move and use goes through `server/main.lua`, which keeps every inventory and checks:

- the containers are the caller's own pockets, or a stash they stand at (the server's own position; OneSync),
  never anyone else's pockets;
- the slots exist, and the count is a whole number the slot really has;
- stacking only joins the same item (not one with durability or details, nor `stack = false`), and a swap moves
  whole stacks;
- nothing goes over a container's `maxWeight`, on either side of a swap;
- using an item: the server takes one first, then tells the client to play its effect (at most once a second).

Two players at the same stash see each other's moves (the server refreshes everyone looking at it).

**OneSync:** stashes need it. Without it the resource prints a warning at start and stashes are refused; pockets
work.

## Files

| | |
|---|---|
| `config.lua` | The keys, the pockets (slots, weight), the starter items, every item (weight, stacking, use), the stashes |
| `client/main.lua` | Opens the inventory (with the stash you stand at), the hotbar keys and strip, the item effects |
| `server/main.lua` | Every inventory, every check, and `{{name}}_give` |
| `web/src/components/blocks/inventory/` | The block: `inventory.tsx` (UI), `nui.ts` (messages), `fixtures.ts` (every state) |
| `web/src/dev.tsx` | The fake game for browser development |
