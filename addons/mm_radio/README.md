# nuikit for mm_radio

A drop-in replacement for [mm_radio](https://github.com/Qbox-project/mm_radio)'s interface (Qbox's radio), built from stock shadcn/ui and themed by your server's `nuikit/theme.css`. You get a compact handheld built from the kit's components (a panel with the clock, signal and jammer, battery and street in its header; the frequency as the one big number; channels as rows; a keypad; members with per-player mute; settings as form fields; who's talking as HUD chips), volume and mute, and the draggable overlay. **mm_radio's Lua is untouched.**

## Install

1. Download `nuikit-mm_radio.zip` from the latest nuikit release (or take `overrides/mm_radio/build` from `nuikit.zip`).
2. Back up `mm_radio/build`.
3. Replace `mm_radio/build` with the zip's `build` folder. mm_radio only talks to its page when `build/index.html` exists.
4. Optional: add the `nuikit` resource (from `[nuikit]`) and paste any [TweakCN](https://tweakcn.com) theme into `nuikit/theme.css`. Without it, the stock shadcn neutral theme is used.
5. `restart mm_radio` (or restart the server).

Updating mm_radio replaces `build`, so re-copy the override afterwards. Built against mm_radio v0.2.1 (Qbox).

## Behaviour notes

- `Shared.Overlay` is honoured: `default` shows who's talking, `always` lists everyone (non-talkers dimmed), `never` hides the overlay and puts Settings in its nav slot.
- Opening Members or Settings shows every member in the overlay so you can place it. Drag the overlay while the radio is open; turn on **Move Radio** in Settings to drag the radio.
- The keypad accepts typed digits, `.`, Backspace and Enter. It stops at `Shared.MaxFrequency` and two decimals (the server drops anything finer).
- The clock updates live. The stock page listened for the wrong message name (see the spec, §6).

## Edit it

`web/` is a normal Vite + React + shadcn app: `web/src/App.tsx` (state, overlay, positioning), `web/src/features/radio.tsx` (the handheld), `web/src/features/screens.tsx` (home, channels, keypad, members, settings), stock shadcn components in `web/src/components/ui`. The full message protocol it implements is in [`docs/mm-radio-protocol.md`](../../docs/mm-radio-protocol.md).

```bash
# from the nuikit repo root
pnpm install
pnpm --filter nuikit-mm-radio-ui dev     # browser; press ` to fire any mm_radio message (?open opens it)
pnpm --filter nuikit-mm-radio-ui build   # writes addons/mm_radio/web/build
```

## License

mm_radio is GPL-3.0 © its authors. This is a separate, clean-room implementation of its UI protocol, written from a behavioural spec. It contains no mm_radio code, markup or styles. MIT, by [@belibathan](https://github.com/belibathan).
