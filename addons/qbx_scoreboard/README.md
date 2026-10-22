# nuikit for qbx_scoreboard

A drop-in replacement for [qbx_scoreboard](https://github.com/Qbox-project/qbx_scoreboard)'s interface, built from stock shadcn/ui and themed by your server's `nuikit/theme.css`: players online against your slots, and every heist or robbery as available, in progress or unavailable. **qbx_scoreboard's Lua and config are untouched.**

## Install

1. Download `nuikit-qbx_scoreboard.zip` from the latest nuikit release (or take `overrides/qbx_scoreboard` from `nuikit.zip`).
2. Back up `qbx_scoreboard/html`, then copy the zip's `html` folder over it. It replaces `ui.html`, `app.js` and `style.css`, the names qbx_scoreboard's fxmanifest already serves; nothing else changes.
3. Optional: add the `nuikit` resource (from `[nuikit]`) and paste any [TweakCN](https://tweakcn.com) theme into `nuikit/theme.css`. Without it, the stock shadcn theme is used.
4. `restart qbx_scoreboard`.

Updating qbx_scoreboard restores its stock UI; copy the folder again afterwards.

## Levers

Set these on `:root` in `nuikit/theme.css` (every override reads the server theme; `nuikit theme reload`
applies them live). Unset, each is the stock nuikit look.

```css
:root {
  --scoreboard-side: left; /* the screen edge (right by default) */
  --scoreboard-density: 1;   /* this screen's density (the identity's --nk-density otherwise; 0.875 stock) */
  --scoreboard-motion: 0;    /* 0 turns this screen's motion off; another number scales it */
}
```

## Edit it

`web/` is a normal Vite + React + shadcn app. The protocol it implements is in [`docs/qbx-scoreboard-protocol.md`](../../docs/qbx-scoreboard-protocol.md).

```bash
# from the nuikit repo root
pnpm install
pnpm --filter qbx-scoreboard-web dev     # open /ui.html; press ` to fire setup, open, close
pnpm --filter qbx-scoreboard-web build   # writes web/build: ui.html, app.js, style.css
```

`?state=open|busy|nocops|full|nosetup|noactivities|closed` jumps to a state. The build is flat and keeps the original file names because the fxmanifest serves `html/*`; it fails if anything else would be emitted.

qbx_scoreboard is GPL-3.0 © Qbox-project. This is a separate implementation of its UI protocol, MIT licensed by [@belibathan](https://github.com/belibathan), and contains none of its code, markup or styles.
