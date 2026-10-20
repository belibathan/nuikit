# {{name}}

A loading screen made with [nuikit](https://github.com/belibathan/nuikit), from the `loading-screen` block.
It shows:
- the server's name and tagline;
- tips, one after another;
- your links;
- backgrounds, cross-faded;
- music, with a mute button that is remembered;
- the **real** load progress: the game's own load events, phase by phase ("Loading map data",
  "Building the city"…), with the item being loaded.

It's built from the kit (Meter, with stock shadcn Spinner, Separator and Button) and follows the
server's nuikit theme.

```bash
cd web
{{pm}} dev        # browser: replays a whole load; ?state=map&handover=plain, ?bg=<image url>
{{pm}} run build  # production build into web/dist
```

**In game:** add `ensure {{name}}` and connect. Only one loading screen runs per server, so stop
`nuikit_loading` (or any other) first. It closes as soon as the game has loaded. To keep it up until your
multicharacter takes over, set `Config.externalShutdown = true` and call `ShutdownLoadingScreenNui()`
from there.

## How it gets its data

A loading screen starts before any resource runs on the client, so it can't use NUI messages, surfaces
or `@nuikit/init.lua`. Instead:

| | From |
|---|---|
| Name, tagline, tips, links, backgrounds, music | `config.lua` → `server/main.lua` → `deferrals.handover({ nuikit = … })`, read by `handover.ts` |
| The theme | The `nuikit` resource's compiled theme (`GlobalState.nuikitTheme`), sent with the handover on every connection, so `nuikit theme reload` applies to the next player. Without nuikit, the page's built-in stock theme |
| Load progress | The game posts its load events to the page (`progress.ts`); `client/main.lua` posts `nuikit:ready` when it hands over to your multicharacter |

## Files

| | |
|---|---|
| `config.lua` | Name, tagline, logo, tips, links, backgrounds, music, `externalShutdown` |
| `server/main.lua` | The handover |
| `client/main.lua` | Closes the loading screen, or leaves it to your multicharacter |
| `media/` | Your backgrounds, music and logo |
| `web/src/components/blocks/loading-screen/` | The block: `loading-screen.tsx` (UI), `handover.ts`, `progress.ts` (the game's events, with tests in the nuikit repo), `fixtures.ts` |
| `web/src/dev.tsx` | The fake game for browser development |
