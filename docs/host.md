# The nuikit host (prototype)

*Status: prototype, opt-in. The in-game measurement is in [Decision](#decision-measured-in-game-oct-19-2026). It works end to end in the browser harness
(an end-to-end check, 21/21, Oct 2026), and `nuikit_hud` ships as a module. Whether it becomes a promise depends on one
in-game measurement; see [Decision](#decision).*

FiveM gives every resource with a `ui_page` its own iframe, its own copy of React, fonts and styles, and its own
focus calls. The host is an optional mode of the `nuikit` resource that renders opted-in resources' UIs in **one**
frame instead: one React, one theme application, one focus owner, real z-order between UIs.

## Shipping a UI as a module

```lua
-- fxmanifest.lua
ui_page 'web/dist/index.html'        -- kept: the fallback when the host isn't running
nuikit_protocol '1'
nuikit_ui 'web/dist/module.js'       -- the module the host mounts
```

```ts
// src/module.tsx, built by vite.module.config.ts: plugins [..., nuikit({ hotInGame: false }), nuikitModule()]
import css from "virtual:nuikit-module-css";
import { defineReactModule } from "nuikit-core/module";
import App from "./App";
export default defineReactModule({ App, css });

// src/main.tsx (the ui_page): stays empty while hosted, loads the app otherwise
import { standalone } from "nuikit-core/boot";
standalone(() => import("./standalone"));
```

The same `App` runs in both places with no changes: `fetchNui`, `onNui` and surfaces detect the host's context.
`systems/nuikit_hud` is the reference (`module.tsx`, `standalone.tsx`, `vite.module.config.ts`).

`nuikitModule()` (vite-plugin-nuikit) emits one classic script that registers the module with the host. React,
ReactDOM and the JSX runtime come from the host; everything else is bundled. The module's CSS is lowered for
Chromium 103 like any nuikit stylesheet and inlined.

## How it works

1. **Discovery.** `host.lua` (in the `nuikit` resource) finds started resources that declare `nuikit_ui`, gives
   each a random token, and tells the host page to load `https://cfx-nui-<resource>/<path>`. A resource that
   starts later announces itself (`nuikit:host:hello`); a stopped one is unloaded.
2. **Hosted mode.** That resource's `nuikit.lua` switches to hosted mode: it sends its messages through the host
   and lets the host's frame take focus for its surfaces. Its own `ui_page` asks `nuikit:host:mode`, learns it
   is hosted, and loads nothing.
3. **Lua → module.** `NUI.send` becomes `TriggerEvent('nuikit:host:send')`. `host.lua` stamps the message with
   `GetInvokingResource()`, the resource that really sent it, never a name from the payload, and the page
   delivers it to that module only. Until the module is **listening**, the page holds its messages (the latest
   200, in order): while the script loads, and then until the module says its listeners are attached.
   `defineReactModule` says so (`ctx.ready()`) from an effect above the App, which React runs after every
   effect inside the App, so an `onNui` in the App's own effects is always there first; a plain `defineModule`
   counts as listening when `mount()` returns, or declares `ready: "signal"` and calls `ctx.ready()` itself
   (after 10 s without it, the messages are delivered anyway, with a console warning). A module's status is
   `mounted` only from that point.
4. **Module → Lua.** The module posts `nuikit:host:call { t, n, d }`. The **token** picks the resource, never
   the page; the call is forwarded to that resource's callback and only that resource may answer. Requests
   time out after 30 s.
5. **Theme and prefs** are applied once to the host document by nuikit-core and inherited by every module.
   Modules don't apply their own; their built-in token defaults are dropped from root rules so the server theme
   wins. Player prefs on `<html>` (`data-nk-motion`) reach modules through `:host-context()`.
6. **Fallback.** If `nuikit` stops (or `setr nuikit_host 0`), each resource leaves hosted mode and its
   `ui_page` loads the full app and re-runs the handshake. If the host starts after a resource's page loaded
   the app, that page reloads into the empty boot.

## Isolation

- **Styles:** each module mounts in a closed shadow root (default) with its stylesheet scoped to `:host`.
  `@font-face` and `@property` are hoisted to the document. A prefixed-CSS mode (`[data-nk="<resource>"]`) exists
  for comparison; it measured no cheaper, so shadow roots stay the default.
- **Overlays:** React portals aimed at `document.body` (Radix dialogs, selects, toasts) are redirected into the
  module's own portal inside its shadow root, so focus traps and stacking work (tested with ox_lib's input dialog).
- **Errors:** each module has its own error boundary; a module that throws or fails to load is reported to the
  server console (`nuikit:host:error`) and the others keep rendering.
- **Trust:** modules share one JavaScript context. A module cannot reach another resource's Lua (tokens are
  per resource and never shared), but it can read the shared document and globals. That is the main thing
  iframes give that the host doesn't, and why hosting is opt-in per resource and limited to UIs the server
  owner already trusts. Only messages from the parent frame are accepted (`trust: "parent"`).

## Numbers

Measured Oct 19, 2026 (desktop Chromium 141, 20 UIs; the harness was deleted on Oct 28, the numbers stay here):

| | Iframes, own process each | Iframes, one process | Host |
|---|---|---|---|
| Memory | 813 MB | 485 MB | 459 MB |
| JS heap | 45 MB | 32 MB | 15 MB |
| Main thread | 311 ms/s | 151 ms/s | 153 ms/s |
| Load all | 2.3 s | 1.5 s | 1.2 s |

Open latency and message latency are the same in every model. The gain depends on FiveM's process model, and
keeping one `ui_page` per resource gives the memory gain back when frames get their own processes.

## Decision (measured in game, Oct 19 2026)

**FiveM puts every NUI frame in one shared renderer process.** Confirmed from the source (Oct 2026,
fivem-foundation `upstream/info/nui/cross_frame.md`): `NUIApp.cpp` starts CEF with `disable-site-isolation-trials`
(the comment: to stop users asking "why are there 50 chromes again") and every NUI is an iframe of one root page,
`nui://game/ui/root.html`. With the kit running, total FiveM browser memory
was 333 MB with the host on and 338 MB with it off (148 vs 153 MB private, 4 FiveM_ChromeBrowser processes, same
scene, 30 s settle): about 5 MB, within noise. That is the "one process" column above, so the host saves a frame
and a JS heap, not a process.

So, as planned for this outcome:

- **Hosting whole screens stays an opt-in convenience** (one theme application, one focus owner, real z-order),
  not something resources are pushed to adopt. No module-only resources.
- **The module loader is core infrastructure anyway:** renderers (docs/architecture.md §4) are modules mounted in
  nuikit's frame, and intents render there.
- Still unmeasured: frame time with the host on and off. Radix focus inside a shadow root and `:host-context()`
  worked in the browser checks; DUI (rendering surfaces in the world) is not built.

## Files

`packages/core/src/{host,module,boot,hosted}.ts` (page side), `packages/core/lua/host.lua` and hosted mode in
`nuikit.lua`, `packages/vite/src/module.ts` (`nuikitModule()`), `systems/nuikit/web` (the host page),
`systems/nuikit_hud` (reference module).
