# nuikit for qbx_vehiclesales

A drop-in replacement for [qbx_vehiclesales](https://github.com/Qbox-project/qbx_vehiclesales)' sale contract, built from stock shadcn/ui and themed by your server's `nuikit/theme.css`. Listing a car, buying one and taking your own back off the lot all use the new contract. **qbx_vehiclesales' Lua is untouched.**

## Install

1. Download `nuikit-qbx_vehiclesales.zip` from the latest nuikit release (or take `overrides/qbx_vehiclesales` from `nuikit.zip`).
2. Replace the files in `qbx_vehiclesales/html` with the ones from the zip (`ui.html`, `ui.js`, `ui.css`, `logo.svg`, `vue.min.js`; back up the originals).
3. Optional: run the `nuikit` resource and paste any [TweakCN](https://tweakcn.com) theme into `nuikit/theme.css`. Without it, the stock shadcn neutral theme is used.
4. `restart qbx_vehiclesales`.

Updating qbx_vehiclesales restores its stock contract; copy the files again afterwards.

- `logo.svg` is the mark in the contract's header. Put your dealership's logo there (square works best).
- `vue.min.js` is an empty placeholder. qbx_vehiclesales' fxmanifest lists it, so it has to exist; nothing loads it.
- The title is the business name from qbx_vehiclesales' `config/client.lua` (`businessName`, the part after " - ").

## What's different

- The asking price is checked before it's sent (a whole number above $0, commas and `$` allowed) and sent as a number.
- The contract shows what the seller receives: the server pays the seller 77 % of the price, shown as 19 % tax and a 4 % dealer fee like the stock page.

## Edit it

`web/` is a normal Vite + React + shadcn app. The protocol it implements is in [`docs/qbx-vehiclesales-protocol.md`](../../docs/qbx-vehiclesales-protocol.md). The build must stay exactly those five files, because qbx_vehiclesales' fxmanifest lists those names and nothing else.

```bash
# from the nuikit repo root
pnpm install
pnpm --filter nuikit-qbx-vehiclesales-ui dev     # browser; press ` to fire any qbx_vehiclesales message
pnpm --filter nuikit-qbx-vehiclesales-ui build   # writes addons/qbx_vehiclesales/web/build
```

## License

MIT, by [@belibathan](https://github.com/belibathan). qbx_vehiclesales is GPL-3.0 © the Qbox project. This is a separate, clean-room implementation of its contract protocol, written from protocol notes, and contains no qbx_vehiclesales code, markup or styles.
