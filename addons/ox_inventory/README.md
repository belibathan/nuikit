# nuikit for ox_inventory

A drop-in replacement for [ox_inventory](https://github.com/overextended/ox_inventory)'s interface, built from stock shadcn/ui and themed by your server's `nuikit/theme.css`. Player inventory, drops, stashes, trunks, gloveboxes, containers, shops, crafting benches, the hotbar, item tooltips, the right-click menu, drag & drop (move, split, stack, swap, give, use) and item notifications all get the new look. **No script changes, and ox_inventory's Lua is untouched.**

## Install

1. Download `nuikit-ox_inventory.zip` from the latest nuikit release.
2. **Back up** `resources/[ox]/ox_inventory/web/build`, then replace it with the `web/build` folder from the zip (`overrides/ox_inventory/web/build`).
3. Optional: add the `nuikit` resource (from `[nuikit]`) and paste any [TweakCN](https://tweakcn.com) theme into `nuikit/theme.css`. Without it, the stock shadcn neutral theme is used.
4. `restart ox_inventory` (or restart the server).

Only `web/build` is replaced: item images stay in `ox_inventory/web/images`, and the `inventory:imagepath` convar works as before. Updating ox_inventory replaces `web/build`, so re-copy it after each update. Each nuikit release lists the ox_inventory versions it was tested against.

## Size

Slot size, grid density and sheet width are tokens with today's look as the default. Set any of them on `:root` in
`nuikit/theme.css` (every page gets the theme):

```css
:root {
  --inv-slot-size: 5.5rem;   /* one slot, square */
  --inv-columns: 5;          /* slots across */
  --inv-gap: 0.5rem;         /* space between slots: smaller is denser */
  /* --inv-sheet-width: 36rem;  default: follows the grid (columns, slot size, gap) */
}
```

## Edit it

`web/` is a normal Vite + React + shadcn app: state and the drag & drop logic in `web/src/state`, UI in `web/src/components`, stock shadcn components in `web/src/components/ui`. The full message protocol it implements is in [`docs/ox-inventory-protocol.md`](../../docs/ox-inventory-protocol.md).

```bash
# from the nuikit repo root
pnpm install
pnpm --filter nuikit-ox-inventory-ui dev     # browser; press ` to fire any ox_inventory message
pnpm --filter nuikit-ox-inventory-ui build   # writes addons/ox_inventory/web/build
```

In the browser, drag & drop, buying and crafting run against mock replies. Item images load from the upstream repository, or set `OX_INVENTORY_IMAGES=/path/to/ox_inventory/web/images` to use your own.

ox_inventory is GPL-3.0 © Overextended. This is a separate, clean-room implementation of its UI protocol, MIT licensed, and contains no ox_inventory code.
