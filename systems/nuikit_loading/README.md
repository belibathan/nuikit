# nuikit_loading

The loading screen for your server, built from stock shadcn/ui and themed by `nuikit/theme.css`. It shows your server name, rotating tips, **real load progress** with the current step, optional background images and music, and welcomes the player by name. Replaces `loadscreen` (D4isDAVID/loadscreen, which Qbox ships) or any other loading screen.

## Install

1. It ships in `[nuikit]`. Keep `ensure nuikit` (the theme) before `ensure [nuikit]`.
2. Stop your old loading screen. Qbox starts `loadscreen` through a category, so add `stop loadscreen` after the category's `ensure` in server.cfg. Only one loading screen can run.
3. Edit `config.lua`: name, tagline, tips, links, and optionally a logo, backgrounds and music. Put your files in `media/` and list them as `media/<file>`, or use `https://` URLs.
4. Restart the server (loading screens are picked up when players connect).

The theme reaches the loading screen through the connection handover: `server/main.lua` sends the `nuikit` resource's compiled theme for every connecting player, so `nuikit theme reload` applies from the next connection.

### Multicharacter

`Config.externalShutdown` decides who closes the loading screen once the game has loaded:

- `'auto'` (the default): on Qbox with its own character menu, the screen stays up and shows "Ready" until `qbx_core` closes it as the character selection appears. Everywhere else it closes right away.
- `true`: always wait. Use it when your multicharacter or spawn resource closes the screen itself (it calls `ShutdownLoadingScreenNui()`).
- `false`: always close right away.

How `'auto'` knows: `qbx_core` is running, and its `config/client.lua` doesn't set `characters.useExternalCharacters = true`. With that setting `qbx_core` skips its menu (`client/character.lua` returns at once) and doesn't close the screen, so nuikit closes it, unless you set `true` for your own multicharacter. Qbox has no convar for this, so the setting is read from that file, which `qbx_core` already sends to every client. If the file can't be read, `qbx_core`'s default applies (its own menu).

In `'auto'` the wait has a safety limit. If `qbx_core` hasn't closed the screen after `Config.externalShutdownTimeout` seconds on "Ready" (default 60), for example because its character menu failed, nuikit closes it and prints a yellow line in the F8 console saying `qbx_core` never called `ShutdownLoadingScreenNui()`. An explicit `true` has no limit and waits as long as it takes.

An `externalShutdown = false` kept from an older `config.lua` still means "close right away". Change it to `'auto'` on Qbox.

## Edit it

`web/` is a normal Vite + React + shadcn app. The events it reacts to, and the handover it reads, are in [`docs/loadscreen-events.md`](../../docs/loadscreen-events.md).

```bash
# from the nuikit repo root
pnpm install
pnpm --filter nuikit-loading-web dev     # browser: replays a whole load
pnpm --filter nuikit-loading-web build   # writes web/dist
```

In the browser, `?state=connecting|core|map|afterMap|session|finishing|ready` jumps to a step and `?handover=full|minimal|themed|none` picks what the server would hand over. Press `` ` `` to fire single events.

A loading screen loads before anything else, so there's no in-game hot reload: develop in the browser, build, and reconnect.

MIT, by [@belibathan](https://github.com/belibathan). Written from the Cfx loading screen documentation; it contains no code from other loading screens.
