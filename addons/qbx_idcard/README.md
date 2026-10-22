# nuikit for qbx_idcard

A drop-in replacement for [qbx_idcard](https://github.com/Qbox-project/qbx_idcard)'s interface, built from stock shadcn/ui and themed by your server's `nuikit/theme.css`: identity cards, driver, weapon and lawyer licenses (and any card type you add to its config) with the player's mugshot, tinted by the card type's colour. **qbx_idcard's Lua, config, badges, flag and translations are untouched** and still used.

## Install

1. Download `nuikit-qbx_idcard.zip` from the latest nuikit release (or take `overrides/qbx_idcard` from `nuikit.zip`).
2. Back up `qbx_idcard/web` **by copying it** (keep the original in place), then copy the zip's `web` folder over it so the files merge. Don't swap the whole folder: the card loads `qbx_idcard/web/flags/` and `badges/` images that only the original ships. It replaces `index.html`, `css/style.css` and adds `js/main.js`, all names qbx_idcard's fxmanifest already serves; `badges/` and `flags/` stay.
3. Optional: add the `nuikit` resource (from `[nuikit]`) and paste any [TweakCN](https://tweakcn.com) theme into `nuikit/theme.css`. Without it, the stock shadcn theme is used.
4. `restart qbx_idcard`.

Card titles and colours come from `qbx_idcard/config/shared.lua` (`header`, `background`); field labels from `qbx_idcard/lang/global.js`. The holder's photo is a full-height portrait down the card's left side; add `photo = 'avatar'` to the table in `qbx_idcard/config/shared.lua` for a small round one instead. Updating qbx_idcard restores its stock UI; copy the folder again afterwards.

## Edit it

`web/` is a normal Vite + React + shadcn app. The protocol it implements is in [`docs/qbx-idcard-protocol.md`](../../docs/qbx-idcard-protocol.md).

```bash
# from the nuikit repo root
pnpm install
pnpm --filter qbx-idcard-web dev     # press ` to fire playerData and configData
pnpm --filter qbx-idcard-web build   # writes web/build: index.html, css/style.css, js/main.js
```

`?state=id|driver|weapon|lawyer|badge|nomugshot|unknown|recolored|closed` jumps to a card. The build only emits files the fxmanifest serves and fails otherwise.

qbx_idcard is GPL-3.0 (Qbox-project, based on um-idcard). This is a separate implementation of its UI protocol, MIT licensed by [@belibathan](https://github.com/belibathan), and contains none of its code, markup or styles.
