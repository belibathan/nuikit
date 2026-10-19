# nuikit for qbx_taxijob

A drop-in replacement for [qbx_taxijob](https://github.com/Qbox-project/qbx_taxijob)'s taxi meter, built from stock shadcn/ui and themed by your server's `nuikit/theme.css`: fare, rate and distance on a card, with a running/stopped badge. **qbx_taxijob's Lua is untouched.**

## Install

1. Download `nuikit-qbx_taxijob.zip` from the latest nuikit release (or take `overrides/qbx_taxijob` from `nuikit.zip`).
2. Replace the files in `qbx_taxijob/html` with the ones from the zip (`meter.html`, `meter.js`, `meter.css`; back up the originals).
3. Optional: run the `nuikit` resource and paste any [TweakCN](https://tweakcn.com) theme into `nuikit/theme.css`. Without it, the stock shadcn neutral theme is used.
4. `restart qbx_taxijob`.

Updating qbx_taxijob restores its stock meter; copy the files again afterwards.

## What's different

- Same messages, same callbacks: the meter opens, starts, stops, updates and resets exactly when qbx_taxijob says so.
- When qbx_taxijob gives the meter the mouse, it shows Start/Stop and Done buttons. **Esc** or right click hands the mouse back (the stock meter had no way to).

## Edit it

`web/` is a normal Vite + React + shadcn app. The protocol it implements is in [`docs/qbx-taxijob-protocol.md`](../../docs/qbx-taxijob-protocol.md). The build must stay exactly `meter.html`, `meter.js` and `meter.css`, because qbx_taxijob's fxmanifest lists those names and nothing else.

```bash
# from the nuikit repo root
pnpm install
pnpm --filter nuikit-qbx-taxijob-ui dev     # browser; press ` to fire any qbx_taxijob message
pnpm --filter nuikit-qbx-taxijob-ui build   # writes addons/qbx_taxijob/web/build
```

## License

MIT, by [@belibathan](https://github.com/belibathan). qbx_taxijob is GPL-3.0 © the Qbox project. This is a separate, clean-room implementation of its meter protocol, written from protocol notes, and contains no qbx_taxijob code, markup or styles.
