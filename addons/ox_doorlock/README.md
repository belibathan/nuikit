# nuikit for ox_doorlock

A drop-in replacement for [ox_doorlock](https://github.com/overextended/ox_doorlock)'s door editor (what `/doorlock` opens), built from stock shadcn/ui and themed by your server's `nuikit/theme.css`. The door list, a door's settings, placing new doors, copy and paste of settings, teleport and delete all use the new editor, and the page still plays the lock and unlock sounds. **ox_doorlock's Lua is untouched.**

## Install

1. Download `nuikit-ox_doorlock.zip` from the latest nuikit release (or take `overrides/ox_doorlock` from `nuikit.zip`).
2. Copy its `web/build` **over** `ox_doorlock/web/build` (`index.html` and `assets/`; back up the folder first). Don't delete the folder: ox_doorlock's door sounds live in `web/build/sounds`, and the server reads that folder.
3. Optional: run the `nuikit` resource and paste any [TweakCN](https://tweakcn.com) theme into `nuikit/theme.css`. Without it, the stock shadcn neutral theme is used.
4. `restart ox_doorlock`.

Updating ox_doorlock restores its stock editor; copy the files again afterwards.

## What's different

- One sheet on the right instead of a centred window: the door list, then a door's settings with the sections as tabs and a back button.
- Item options (metadata type, remove on use) and custom lockpick checks are edited inline in their rows, not in pop-ups.
- Escape closes the delete confirm or an open dropdown first, then the editor.
- Paste settings works as in the stock editor: it fills the form with the copied door's settings and saves them as a **new** door.

## Edit it

`web/` is a normal Vite + React + shadcn app. The protocol it implements is in [`docs/ox-doorlock-protocol.md`](../../docs/ox-doorlock-protocol.md).

```bash
# from the nuikit repo root
pnpm install
pnpm --filter nuikit-ox-doorlock-ui dev     # browser; press ` to fire any ox_doorlock message
pnpm --filter nuikit-ox-doorlock-ui build   # writes addons/ox_doorlock/web/build
```

## License

MIT, by [@belibathan](https://github.com/belibathan). ox_doorlock is GPL-3.0-or-later © Overextended. This is a separate, clean-room implementation of its editor protocol, written from protocol notes, and contains no ox_doorlock code, markup, styles or sounds.
