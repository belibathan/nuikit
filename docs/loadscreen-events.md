# Loading screen protocol (FiveM)

What a FiveM loading screen page receives, and how `nuikit_loading` uses it. Written from the Cfx
documentation and from reading how existing loading screens (e.g. D4isDAVID/loadscreen, which Qbox
ships) consume it. This is an interface description in our own words; no code from those projects is used.

## 0. Basics

| Item | Fact |
|---|---|
| Declaration | `loadscreen 'web/dist/index.html'` in fxmanifest, the page listed in `files`. Run one loading screen resource per server. |
| When | The page opens while the client downloads and loads the game, **before any client script runs**. It's a separate page from the NUI frames of resources. |
| Cursor | `loadscreen_cursor 'yes'` shows the mouse cursor (needed for clickable controls such as a mute button). |
| Closing | Without `loadscreen_manual_shutdown`, the game closes the page when loading ends. With `loadscreen_manual_shutdown 'yes'`, it stays until a client script calls `ShutdownLoadingScreenNui()` (usually right after `ShutdownLoadingScreen()`, which ends the game's own loading state). |
| Files | Other resources' files are reachable as `nui://<resource>/<path>` if that resource lists them in `files`. `https://cfx-nui-<resource>/` is the in-game NUI form; for the loading screen, `nui://` is what existing screens rely on. |
| No callbacks | No client Lua runs yet, so there is nothing to POST to. The page is receive-only (nuikit-core's one-time `nuikit:ready` POST still fires on import; it goes nowhere and is ignored). |
| Detection | `window.invokeNative` exists in game and not in a normal browser. |
| Opaque | Unlike in-game overlays, a loading screen should paint its own background; nothing useful is behind it. |

## 1. Handover data (server → page, once)

```lua
AddEventHandler('playerConnecting', function(name, setKickReason, deferrals)
  deferrals.handover({ key = value, ... })
end)
```

- Any server resource can call `deferrals.handover(table)` while the player connects. `deferrals.defer()` is not required for it.
- The tables of every resource are **merged** into one object and set as `window.nuiHandoverData` before the loading screen's scripts run. Read it synchronously at startup; it doesn't change afterwards.
- Values must be JSON-serialisable. An empty Lua table arrives as `{}`, not `[]`, so normalise lists.
- `name` (first argument of `playerConnecting`) is the player's display name, the usual source for "Welcome, …".

`nuikit_loading` hands over a single key, `nuikit`, so it can't collide with other resources:

| Field | Type | Source |
|---|---|---|
| `theme` | string \| nil | `LoadResourceFile('nuikit', 'theme.css')`, read per connection. Applied with nuikit-core's `applyTheme()`. |
| `serverName` | string | `Config.serverName`, else `sv_projectName`, else `sv_hostname` (`^n` colour codes stripped). |
| `tagline` | string? | `Config.tagline` |
| `playerName` | string | `playerConnecting`'s `name` |
| `logo` | string? | `Config.logo` as a URL (`nui://nuikit_loading/<path>` for local files) |
| `tips` | `(string \| { title?, text })[]` | `Config.tips` |
| `tipInterval`, `backgroundInterval` | number (ms) | config |
| `backgrounds`, `music` | string[] (URLs) | config, local paths turned into `nui://` URLs |
| `musicVolume` | number 0–1 | config |
| `links` | `{ label, url? }[]` | config |

## 2. Load events (game → page, many)

Delivered as `window` `message` events. `event.data` is a flat object with an `eventName` and the fields
below (there is no `action`/`data` envelope).

| `eventName` | Fields | Meaning |
|---|---|---|
| `loadProgress` | `loadFraction: number` (0–1) | Overall progress. The one number to show as a percentage. Treat as monotonic (ignore drops). |
| `startInitFunction` | `type: string` | An init phase begins. `type` is one of `INIT_CORE`, `INIT_BEFORE_MAP_LOADED`, `INIT_AFTER_MAP_LOADED`, `INIT_SESSION`. |
| `startInitFunctionOrder` | `type`, `order: number`, `count: number` | A batch of `count` init functions in that phase. |
| `initFunctionInvoking` | `type`, `name: string`, `idx: number` | Init function `name` (e.g. `CStreaming`) is about to run; `idx` is its position in the batch. |
| `initFunctionInvoked` | `type`, `name` | That function finished. |
| `endInitFunction` | `type` | The phase ended. |
| `startDataFileEntries` | `count: number` | Map/data file loading starts (`count` entries). |
| `onDataFileEntry` | `name: string`, `type: number`, `isNew: boolean` | One data file (a path such as `dlc_x/content.xml`). |
| `performMapLoadFunction` | `idx: number` | A map load step (no name). |
| `endDataFileEntries` | — | Data files done. |
| `onLogLine` | `message: string` | Short status lines near the end, e.g. "Awaiting scripts". |

Typical order: `INIT_CORE` → `INIT_BEFORE_MAP_LOADED` → data files and map functions → `INIT_AFTER_MAP_LOADED` → `INIT_SESSION` → `loadProgress` reaches 1 → log lines → client scripts start.

How `nuikit_loading` shows them (`web/src/lib/progress.ts`):

| State | Label | Detail line |
|---|---|---|
| before any event | Connecting | — |
| `INIT_CORE` | Starting the game | init function name, `idx / count` |
| `INIT_BEFORE_MAP_LOADED` | Preparing the world | init function name, `idx / count` |
| data files / map functions | Loading map data | file name or "Map chunk n", `n / count` |
| `INIT_AFTER_MAP_LOADED` | Building the city | init function name, `idx / count` |
| `INIT_SESSION` | Joining the session | init function name, `idx / count` |
| `loadFraction` = 1 | Finishing up | last `onLogLine` |
| `nuikit:ready` (below) | Ready | — |

## 3. Messages from client scripts

Once client scripts run (the loading screen is still up with manual shutdown), a script can post to the
page with `SendLoadingScreenMessage(jsonString)`. The page gets a `message` event; accept both a parsed
object and a JSON string. `nuikit_loading` uses one:

| Message | Sent when |
|---|---|
| `{ "eventName": "nuikit:ready" }` | `Config.externalShutdown = true`: the game is loaded and another resource (e.g. multicharacter) will call `ShutdownLoadingScreenNui()`. |

With `Config.externalShutdown = false` (default), `client/main.lua` calls `ShutdownLoadingScreen()` and
`ShutdownLoadingScreenNui()` as soon as it runs.

## 4. Things to verify in game

- `window.nuiHandoverData.nuikit` arrives with the theme (large strings are fine in practice; a theme is a few KB).
- `nui://nuikit_loading/media/...` images and music load.
- `SendLoadingScreenMessage` reaches the page as an object (the page also accepts a string).
- Autoplay of music is allowed in the loading screen (no user gesture).
