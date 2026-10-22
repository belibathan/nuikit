# nuikit for ox_lib

A drop-in replacement for [ox_lib](https://github.com/overextended/ox_lib)'s interface, built from stock shadcn/ui and themed by your server's `nuikit/theme.css`. Every `lib.notify`, `lib.showContext`, `lib.registerMenu`, `lib.inputDialog`, `lib.alertDialog`, `lib.progressBar`, `lib.progressCircle`, `lib.skillCheck`, `lib.showTextUI` and radial menu call from every script on your server gets the new look. **No script changes, and ox_lib's Lua is untouched.**

## Look

- **Radial menu** (also qbx_radialmenu, which draws through `lib.registerRadial`): a ring of segments in the panel surface, cut (Signal) or rounded (Graphite, Velvet) from the theme's own shape tokens; the lit segment in the brand/primary fill; the centre hub names the lit item, or says Close / Back. Hit-testing is by angle, so the gaps never drop the hover. The wheel scales in for a submenu or the next page and settles back for Back; with `/nuikit motion off` it only fades.
- **Context menu**: a shadcn Sheet on the right edge in the pause menu's backdrop style (48px rows with hairlines, the title in the display face). It is the stock vendored `sheet` styled in `app.css`, not the shared `edge-sheet` yet (on main that is only inside the job-sheet block); it moves onto `edge-sheet` once that is a syncable component.
- **List menu**: 48px rows, one gliding selection indicator, key-cap hints in the footer.
- **Alert**: shadcn's AlertDialog; **input dialog**: shadcn's Dialog.
- **Notifications** at top-right start below the nuikit HUD's top-right block (map, location, cash; about the top 26rem). Without that HUD, or with a different map, set `--ox-notify-top-right` in `nuikit/theme.css` (it passes through the theme compiler; `1.5rem` puts them back in the corner).

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
- **One stack with nuikit (0.7).** With the `nuikit` resource running, notify, context and list menus, the input dialog, the alert, progress, text UI and the skill check are drawn by nuikit's own frame (the shared, themed renderers), so they stack, take focus and handle Escape like every other nuikit UI and a renderer pack restyles ox_lib too. `setr nuikit_ox_route 0` turns this off; without nuikit the page draws them itself. Details and what's unproven: [`docs/adapters/ox-lib.md`](../../docs/adapters/ox-lib.md).

Every payload posted back to ox_lib is unchanged (`bench/polish/ox_lib/{before,after}.json`).

## Levers

Set these on `:root` in `nuikit/theme.css` (every override reads the server theme; `nuikit theme reload`
applies them live). Unset, each is the stock nuikit look.

```css
:root {
  --ox-notify-position: top-right; /* where a notify without a position goes: top-left/-center/-right, center-left/-right, bottom-… */
  --ox-clear-zones: 1; /* 1: notify stacks move clear of other UIs' screen zones (the HUD) instead of the fixed --ox-notify-top-right */
  --ox-context-side: left; /* the context menu's screen edge (right by default) */
  --ox-textui-position: left-center; /* where a text UI without a position goes (right-center by default) */
  --ox-density: 1;   /* this screen's density (the identity's --nk-density otherwise; 0.875 stock) */
  --ox-motion: 0;    /* 0 turns this screen's motion off; another number scales it */
}
```

## Edit it

`web/` is a normal Vite + React + shadcn app: one file per ox_lib feature in `web/src/features`, stock shadcn components in `web/src/components/ui`. The full message protocol it implements is in [`docs/ox-lib-protocol.md`](../../docs/ox-lib-protocol.md).

```bash
# from the nuikit repo root
pnpm install
pnpm --filter nuikit-ox-lib-ui dev     # browser; press ` to fire any ox_lib message
pnpm --filter nuikit-ox-lib-ui build   # writes addons/ox_lib/web/build
```

ox_lib is LGPL-3.0 © Overextended. This is a separate implementation of its UI protocol, MIT licensed, and contains no ox_lib code.
