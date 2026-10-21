# nuikit for ox_target

A drop-in replacement for [ox_target](https://github.com/overextended/ox_target)'s interface (the eye and the interaction list), built from stock shadcn/ui and themed by your server's `nuikit/theme.css`. Every `exports.ox_target:addGlobalVehicle`, `addModel`, `addEntity`, `addBoxZone`, … from every script on your server (Qbox included) gets the new look. **No script changes, and ox_target's Lua is untouched.**

- Idle eye at screen centre while the targeting key is held: a small, dimmed HUD chip. When something has options it locks on: the chip fills with your theme's brand/primary colour and a reticle closes in around it once (a plain fade with `/nuikit motion off`).
- The options list sits just right of the eye, where ox_target puts the cursor, joined to it by a hairline. Rows are the pause menu's: 48px, hairlines between them, the identity's indicator on the hovered row; groups (global, model, entity, zone) are split by a full rule.
- Every free Font Awesome icon is bundled (no CDN), `iconColor` is respected, submenus show a chevron and the *Go back* row leads the list.

## Install

1. Download `nuikit-ox_target.zip` from the latest nuikit release (or take `overrides/ox_target/web` from the master `nuikit.zip`).
2. **Back up** `resources/[ox]/ox_target/web` first.
3. Copy the zip's `ox_target/web` folder over `resources/[ox]/ox_target/web` (merge, replacing `index.html`). ox_target's old `style.css` and `js/` can stay; they're no longer loaded.
4. Optional: add the `nuikit` resource (from `[nuikit]`) and paste any [TweakCN](https://tweakcn.com) theme into `nuikit/theme.css`. Without it, the stock shadcn neutral theme is used.
5. `restart ox_target` (or restart the server).

Updating ox_target replaces `web/`, so re-copy it after each ox_target update. Each nuikit release lists the ox_target versions it was tested against. To undo, restore your backup.

## Edit it

`web/` is a normal Vite + React + shadcn app: `src/App.tsx` is the whole UI, `src/lib/options.ts` turns ox_target's payload into rows, stock shadcn components live in `web/src/components/ui`. The full message protocol it implements is in [`docs/ox-target-protocol.md`](../../docs/ox-target-protocol.md).

```bash
# from the nuikit repo root
pnpm install
pnpm --filter nuikit-ox-target-ui dev     # browser; press ` to fire any ox_target message
pnpm --filter nuikit-ox-target-ui build   # writes addons/ox_target/web/build
```

ox_target is MIT © Overextended. This is a separate, clean-room implementation of its UI protocol, MIT licensed, and contains no ox_target code, styles or markup.
