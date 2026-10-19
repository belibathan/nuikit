# qbx_scoreboard NUI protocol — compatibility spec

Target: drop-in replacement for `qbx_scoreboard/html` (qbx_scoreboard **1.0.0**, Qbox-project).
Scope: everything that crosses the boundary between qbx_scoreboard's client Lua and its NUI page.

> Clean-room note. qbx_scoreboard is GPL-3.0. This document describes its wire protocol and observable
> behaviour in our own words. It doesn't reproduce its code, markup or styles. Message and field names
> appear only as interface facts. nuikit's implementation (`addons/qbx_scoreboard`) is MIT.

## 0. Page and files

| Item | Fact |
|---|---|
| Entry | `ui_page 'html/ui.html'` |
| Served files | `files { 'html/*', 'config/client.lua' }`. `html/*` matches files **directly** in `html/`, not subfolders. |
| Stock files | `html/ui.html`, `html/app.js`, `html/style.css`, `html/reset.css` (+ jQuery and Font Awesome from CDNs). |
| Our build | Flat, same names: `ui.html`, `app.js`, `style.css`. Copying it over `html/` replaces the stock entry, script and styles; the leftover `reset.css` is no longer referenced. The Vite config fails the build if any other file would be emitted. |
| Focus | None. The scoreboard never takes NUI focus; it's opened and closed by a keybind in Lua. |
| Transparency | `html`/`body` transparent, no scrollbars. |

## 1. Inbound (Lua → UI)

`SendNUIMessage` with **flat** tables: the page reads `event.data.action` and the fields beside it
(no `data` envelope).

### `setup` — once, ~1 s after the resource starts

| Field | Type | Meaning |
|---|---|---|
| `items` | `Record<string, string>` | Activity key → label, from `GlobalState.illegalActions` (`config/server.lua`). Order is Lua `pairs` order (unspecified). |

If the page wasn't listening yet, this message is lost. The UI must still work: labels are also
available in `open.requiredCops[key].label`.

### `open` — every time the keybind opens it

| Field | Type | Meaning |
|---|---|---|
| `players` | number | Players online (from a server callback). |
| `maxPlayers` | number | `sv_maxclients` (config). |
| `requiredCops` | `Record<string, { minimumPolice: number, label: string, busy?: boolean }>` | `GlobalState.illegalActions`. `busy` is set by `exports.qbx_scoreboard:SetActivityBusy(name, bool)`. |
| `currentCops` | number | On-duty police (`job.type == 'leo'`). |

Each activity has one of three states, evaluated in this order:

1. `busy` → in progress
2. `currentCops >= minimumPolice` → available
3. otherwise → unavailable

The stock UI shows only these states (not the police count), and the total `players of maxPlayers`.

### `close`

No fields. Hide the panel (the stock UI fades over ~150 ms).

Toggle vs hold is decided in Lua (`config/client.lua` `toggle`); the page only sees `open`/`close`.
Player IDs above heads are drawn by Lua in the world, not by the page.

## 2. Outbound (UI → Lua)

None. qbx_scoreboard registers no NUI callbacks, and the page sends none of its own.

The only request nuikit's page makes to Lua is nuikit-core's one-time `nuikit:ready` POST at startup
(as in the ox_lib addon). qbx_scoreboard doesn't register it, so it goes unanswered and is ignored.

## 3. Layout of the stock UI (for placement parity)

Right side of the screen, about 30 % from the top, roughly 40 vh wide. nuikit keeps that anchor
(`top: 30vh; right: 3vh`) and sizes text in rem scaled to the screen height.

## 4. nuikit behaviour notes

- Rows follow `setup` order, then any keys only seen in `open`.
- Unknown actions are ignored. Devtools' `{ action, data }` envelope is also accepted (browser only in practice).
- Theme: the page fetches `https://cfx-nui-nuikit/theme.css` (falls back to `nui://nuikit/theme.css`) and applies it; without the `nuikit` resource the stock shadcn theme stays.
