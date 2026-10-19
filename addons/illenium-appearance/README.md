# nuikit for illenium-appearance

A drop-in replacement for [illenium-appearance](https://github.com/iLLeniumStudios/illenium-appearance)'s interface (the character creator, clothing, barber, tattoo and surgeon shops, and the admin ped menu that Qbox ships), built from stock shadcn/ui and themed by your server's `nuikit/theme.css`. **No script changes, and illenium-appearance's Lua is untouched.**

What you get: a side panel on the left that keeps the ped in view, one tab per section the shop allows (ped, heritage, face, hair & makeup, clothing, accessories, tattoos). Each tab has collapsible groups. Drawables and textures get steppers that skip blacklisted items and wrap at the ends. Mixes, face features and opacities get sliders. Hair and makeup colours come from the game's own palettes as swatches. Every control has a one-click revert to how you came in. Camera, orbit, turn-around and undress toggles float on the right. Save and exit ask for confirmation, and `A` / `D` turn the ped.

## Install

1. Download `nuikit-illenium-appearance.zip` from the latest nuikit release (or take `overrides/illenium-appearance` from `nuikit.zip`).
2. Back up `illenium-appearance/web/dist`, then replace it with the `web/dist` folder from the zip. The folder holds only `index.html` and `assets/*.js`, because that's all illenium-appearance's fxmanifest serves.
3. Optional: add the `nuikit` resource (from `[nuikit]`) and paste any [TweakCN](https://tweakcn.com) theme into `nuikit/theme.css`. Without it, the stock shadcn neutral theme is used. illenium-appearance's own `Config.Theme` is ignored.
4. `restart illenium-appearance` (or restart the server).

To undo, put your backup of `web/dist` back. Updating illenium-appearance replaces `web/dist`, so re-copy it after each update.

Strings come from illenium-appearance's locale files (`setr illenium-appearance:locale "en"`). Any key a locale doesn't have falls back to built-in English. Outfit saving, loading and sharing are ox_lib menus in illenium-appearance, not part of this page. The nuikit ox_lib addon styles them.

## Edit it

`web/` is a normal Vite + React + shadcn app: one file per section in `web/src/features`, the controls in `web/src/components/controls.tsx`, every callback in `web/src/lib/store.tsx`, stock shadcn components in `web/src/components/ui` (synced, don't edit). The full protocol it implements is in [`docs/illenium-appearance-protocol.md`](../../docs/illenium-appearance-protocol.md).

```bash
# from the nuikit repo root
pnpm install
pnpm --filter nuikit-illenium-appearance-ui dev     # browser: a fake Lua answers every callback; pick a shop in the top bar
pnpm --filter nuikit-illenium-appearance-ui build   # writes addons/illenium-appearance/web/build
```

In the browser, `?shop=pedmenu|newchar|clothing|barber|tattoo|surgeon|tracker` opens that shop's section set. Every POST is logged to the console and to `window.__posts`.

## Licence

illenium-appearance © iLLeniumStudios and contributors, under its own licence, which restricts copying. This is a clean-room implementation of its UI protocol, written from a protocol spec. It contains no illenium-appearance code, markup, styles or locale text. MIT licensed, by [@belibathan](https://github.com/belibathan).
