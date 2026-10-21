# nuikit for ox_lib

A drop-in replacement for [ox_lib](https://github.com/overextended/ox_lib)'s interface, built from stock shadcn/ui and themed by your server's `nuikit/theme.css`. Every `lib.notify`, `lib.showContext`, `lib.registerMenu`, `lib.inputDialog`, `lib.alertDialog`, `lib.progressBar`, `lib.progressCircle`, `lib.skillCheck`, `lib.showTextUI` and radial menu call from every script on your server gets the new look. **No script changes, and ox_lib's Lua is untouched.**

## Install

1. Download `nuikit-ox_lib.zip` from the latest nuikit release.
2. Copy `ox_lib/web/build` somewhere as a backup, then replace it with the `web/build` folder from the zip.
3. Optional: add the `nuikit` resource (from `[nuikit]`) and paste any [TweakCN](https://tweakcn.com) theme into `nuikit/theme.css`. Without it, the stock shadcn neutral theme is used, with your `ox:primaryColor` convar as the accent.
4. `restart ox_lib` (or restart the server).

Updating ox_lib replaces `web/build`, so re-copy it after each ox_lib update. Each nuikit release lists the ox_lib versions it was tested against.

## What nuikit adds

Everything ox_lib's Lua sends is drawn as it asks. On top, with no script changes:

- **Notify dedupe.** A toast that arrives again while it is still on screen (same title, description, type and position, no `id`) restarts the first one and counts `×2`, `×3`… beside its title instead of stacking a copy.
- **Item slab.** A `notify` with `item = { name, count, icon?, image? }` (a nuikit extension; ox_lib's Lua never sends it) draws the kit's item slab (tile, name, `+2` / `−1`) instead of a panel.
- **Progress slab.** `lib.progressBar` is the label, a live percentage and a thin line; a `canCancel = true` in the `progress` message (nuikit extension) adds the `X` key chip. ox_lib's own cancel key keeps working either way.
- **Enter chip** on the dialog's Confirm button where Enter submits.

Every payload posted back to ox_lib is unchanged (`bench/polish/ox_lib/{before,after}.json`).

## Edit it

`web/` is a normal Vite + React + shadcn app: one file per ox_lib feature in `web/src/features`, stock shadcn components in `web/src/components/ui`. The full message protocol it implements is in [`docs/ox-lib-protocol.md`](../../docs/ox-lib-protocol.md).

```bash
# from the nuikit repo root
pnpm install
pnpm --filter nuikit-ox-lib-ui dev     # browser; press ` to fire any ox_lib message
pnpm --filter nuikit-ox-lib-ui build   # writes addons/ox_lib/web/build
```

ox_lib is LGPL-3.0 © Overextended. This is a separate implementation of its UI protocol, MIT licensed, and contains no ox_lib code.
