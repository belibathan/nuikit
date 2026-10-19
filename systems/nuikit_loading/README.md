# nuikit_loading

The loading screen for your server, built from stock shadcn/ui and themed by `nuikit/theme.css`. It shows your server name, rotating tips, **real load progress** with the current step, optional background images and music, and welcomes the player by name. Replaces `loadscreen` (D4isDAVID/loadscreen, which Qbox ships) or any other loading screen.

## Install

1. It ships in `[nuikit]`. Keep `ensure nuikit` (the theme) before `ensure [nuikit]`.
2. Stop your old loading screen: remove `ensure loadscreen` (or delete that resource). Only one loading screen can run.
3. Edit `config.lua`: name, tagline, tips, links, and optionally a logo, backgrounds and music. Put your files in `media/` and list them as `media/<file>`, or use `https://` URLs.
4. Restart the server (loading screens are picked up when players connect).

The theme reaches the loading screen through the connection handover: `server/main.lua` reads `nuikit/theme.css` for every connecting player, so theme edits apply on the next connection.

### Multicharacter

By default the loading screen closes as soon as the game has loaded. If your multicharacter or spawn resource closes it itself (it calls `ShutdownLoadingScreenNui()`), set `Config.externalShutdown = true`: the screen then shows "Ready" until that resource takes over.

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
