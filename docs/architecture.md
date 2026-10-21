# Architecture: one UI layer for any FiveM server

*Oct 19, 2026. The design nuikit builds toward (the universal milestone, 0.7), decided after weighing the alternatives below. Builds
on `docs/vision.md` (why), `docs/protocol.md` (v1) and `docs/tokens.md`. Read it before adding a system, an
override, an adapter or a package.*

## The idea in one paragraph

Every FiveM server needs the same few things from its UI: notifications, menus, forms, progress, prompts,
interaction lists, radials. Today each library (ox_lib, qb-menu, esx_menu_default, okokNotify…) is a different
**API** for those same **intents**, with its own look, its own focus handling and its own Escape. nuikit
separates **what a script asks for** from **how it looks**, the way an operating system does: scripts (old ones
through adapters, new ones directly) ask for intents; one runtime per server draws them with swappable,
themed renderers, and coordinates everything every UI shares (focus, Escape, camera, controls, theme, player).
Screens that are genuinely bespoke (HUD, pause, inventory, phone) plug into the same runtime through the
protocol.

## Building blocks

```mermaid
flowchart TB
  subgraph callers[Callers: no rewrites]
    OLD[Existing scripts<br/>lib.notify · exports['qb-menu'] · ESX.ShowNotification]
    NEW[New scripts<br/>nk.menu · nk.notify]
    SCREENS[Bespoke screens<br/>HUD · pause · inventory · phone]
  end
  subgraph adapters[Adapter packs]
    AOX["[nuikit-ox]"]
    AQB["[nuikit-qb]"]
    AESX["[nuikit-esx]"]
  end
  subgraph runtime["nuikit (runtime, one per server)"]
    LIB["@nuikit/init.lua<br/>the Lua API every script imports"]
    INT[Intents]
    SVC[Services<br/>surfaces · camera · controls]
    CTX[Context<br/>theme · prefs · player · locale]
    FRAME[nuikit frame<br/>module loader + intent renderers]
    DOC[doctor]
  end
  REND[Renderer packs<br/>default: the kit · swappable per intent]
  OLD --> adapters --> INT
  NEW --> LIB --> INT
  SCREENS --> LIB
  LIB --> SVC
  INT --> FRAME
  REND -. modules .-> FRAME
  CTX --- FRAME
  CTX --- SCREENS
```

### 1. The runtime: the `nuikit` resource

The only thing every server must run. It is three parts:

- **`@nuikit/init.lua`, the Lua API.** Scripts import it the way they import ox_lib:
  `shared_script '@nuikit/init.lua'`. It defines `nk` (intents, services, context) in the calling resource and
  talks to the runtime. It replaces copying `nuikit.lua` into every resource (`pnpm sync` today): updating
  nuikit updates every script, and the versioned handshake keeps old scripts working on a newer runtime.
  Vendoring stays possible for a script that must run without nuikit.
- **Services**: what UIs share and must not fight over, each with one owner at a time, a stack, and
  restoration on close, resource stop and death:
  - **surfaces**: focus, cursor, Escape, layers, states (built, protocol §3);
  - **camera**: `nk.camera.claim(opts)` / `release()`, so a 3D pause menu, a clothing shop and a garage
    preview never leave the player looking at the wrong thing;
  - **controls**: which game controls are disabled while a UI is open, merged across UIs.
- **Context**: compiled theme and live reload, player prefs (built, `docs/tokens.md`), the player over any
  framework (built, `bridge.lua`), and locale.

The runtime's own frame hosts the intent renderers (below). One frame means one stack, one focus owner and one
theme for every intent from every library, whatever FiveM's process model turns out to be.

### 2. Intents: the contract

An intent is a versioned schema plus a lifecycle: open, update, resolve, cancel. Called through `nk`
(or `exports.nuikit:*` from any language):

```lua
local choice = nk.menu({ title = 'Garage', items = { … } })     -- yields until resolved, like lib.* does
nk.notify({ title = 'Paid', description = '$500', status = 'success' })
local p = nk.progress({ label = 'Repairing', duration = 5000, cancel = true })
```

Catalogue v1. Each schema is a **superset** of what the libraries we adapt can express, so an adapter never
drops information.

| Intent | What it is | Must cover |
|---|---|---|
| `notify` | Toast: title, description, status, icon, duration, position | ox `lib.notify`, `QBCore:Notify`, `ESX.ShowNotification`, esx_notify, okokNotify, mythic_notify |
| `menu` | Context or list menu: items with icon, description, metadata, image, progress, disabled, submenus | ox `registerContext`/`registerMenu`, qb-menu, esx_context, esx_menu_default |
| `input` | Form: text, number, select, checkbox, slider, date, colour; validation | ox `inputDialog`, qb-input, esx_menu_dialog |
| `confirm` | Alert with cancel / confirm | ox `alertDialog` |
| `progress` | Timed bar or circle, cancellable; animation and prop stay with the caller's Lua | ox `progressBar`/`progressCircle`, QBCore `Progressbar`, esx_progressbar |
| `prompt` | Persistent key hint ("[E] Open garage") | ox `showTextUI`, qb-core `DrawText`, esx_textui |
| `target` | Options on an entity, model or zone (the raycast stays the targeting library's) | ox_target, qb-target |
| `radial` | Radial items and submenus | ox `registerRadial`, qb-radialmenu |
| `challenge` | Skill check | ox `skillCheck` |

**One source of truth.** Each schema is written once (`packages/core/intents/`) and generates the TypeScript
types, LuaLS annotations for `nk`, runtime validation, browser mocks, docs and `nuikit check` rules.

### 3. Adapters: how existing scripts get in

Adapter packs are resource folders per ecosystem: `[nuikit-ox]`, `[nuikit-qb]`, `[nuikit-esx]`, and later
`[nuikit-standalone]` for okokNotify, mythic_notify and the like. Each library gets **one adapter resource**
that makes its public API land on intents, so the owner removes exactly what nuikit replaces and nothing else.
Three mechanisms, chosen per library after an in-game spike:

1. **Stand-in.** The adapter replaces the library (`nuikit_qb_menu` instead of `qb-menu`): `provide 'qb-menu'`
   makes dependencies and start order resolve to it, and it answers calls under the library's name (the
   pattern commercial targeting scripts already ship for qb-target and ox_target). The original is stopped;
   nothing is overwritten. Default for libraries that are mostly UI.
2. **Listener.** For event-driven APIs (`QBCore:Notify`, `esx:showNotification`) the adapter handles the event,
   and the library's own UI is turned off by its config where it has one.
3. **Page override.** Replace the library's web page (what 0.4 does). For ox_lib, whose UI functions run
   inside ox_lib itself, this stays the mechanism; the page routes its intents to the shared renderers.

Adapters are **clean-room** like overrides: written from the library's public API and a spec in
`docs/adapters/<library>.md`, never from its code, and tested by replaying recorded calls and checking what the
calling script gets back.

*Status (Oct 2026): specs for the 15 libraries of steps 5–7 are in [`adapters/`](adapters/README.md); the spike
resources, the owner's checklist and the replay harness are in `bench/adapters/`. Nothing has run in game yet.
Two things the spike must settle before a mechanism is final: Cfx staff state `provide` resolves dependencies
but does **not** redirect `exports[...]`, so a stand-in registers the `__cfx_export_<library>_<name>` events
itself; and page routing relies on an override page posting to another resource's NUI callback.*

### 4. Renderers: how it looks

A renderer draws one intent. It is a **module** in the same format the host prototype already loads
(`mount(element, props, context)`, built with `nuikitModule()`), so the contract is framework-agnostic: React by
default, anything that can mount into an element works. The kit is the default renderer for every intent. A
resource that declares `nuikit_renderer 'notify'` and ships a module replaces the default notifications,
still themed by the tokens and stacked by the runtime. Renderer packs and themes are what sellers build and sell.

This makes the host's module loader core infrastructure, used for every renderer. Hosting whole screens in
nuikit's frame stays opt-in: measured in game, FiveM already shares one browser process across every NUI frame,
so hosting saves ~5 MB, not a process (`docs/host.md`).

### 5. Screens: the protocol

Bespoke screens keep their own `ui_page` and join through protocol v1 (surfaces, tokens, context), using the
services for camera and controls. The kit's screens (HUD, pause, death, loading, chat, the 3D pause and
inventory) are built from the same components as the renderers. They are the showcase, not special cases.

### 6. Doctor: the server tells you what's left

`nuikit doctor` in the server console:

- the framework detected and which adapter packs fit it;
- every resource with a UI and its status: on nuikit (level), adapted, or untouched;
- conflicts: a library and its stand-in both running, an override wiped by a library update, an adapter
  starting after its consumers;
- theme contrast warnings and live intent counts by source.

"Universal" stops being a claim: every server can see its own coverage, and owners get the next step instead of
a support question.

## Distribution and developer experience

| Who | Gets | Experience |
|---|---|---|
| **Server owner** | `nuikit-<framework>.zip` (Qbox, QBCore, ESX, standalone): `nuikit`, `[nuikit]` screens, the matching adapter pack, `nuikit.cfg` | Drop the folder in, add `exec @nuikit/nuikit.cfg` to `server.cfg`, run `nuikit doctor`, follow what it says. Theme: paste into `nuikit/theme.css`, `nuikit theme reload`. A txAdmin recipe does it for new servers. |
| **Script developer** | `@nuikit/init.lua` | One line in the fxmanifest, then `nk.notify{…}`. Types in the editor through LuaLS annotations. No web code. |
| **UI developer** | npm: `create-nuikit`, `nuikit-core`, `vite-plugin-nuikit`; components and blocks via `npx shadcn add` | `npm create nuikit` gives a resource with Lua and web, browser devtools with fake game data, hot reload in game. `nuikit check` before publishing. |
| **Seller** | Same, plus renderer packs | `nuikit check` level 3 is the "built on nuikit" mark. |

Versioning: the protocol is an integer that changes rarely (the runtime supports the previous one); each intent
schema has its own version; packages follow semver; the runtime prints a notice when a newer release exists
(convar to turn it off).

## Considered and rejected

- **Replace every resource's UI with one app** (host everything). Maximum control, but it breaks isolation
  between resources and every existing UI at once. Kept as opt-in hosting for screens.
- **Fork or compete with ox_lib.** ox_lib is mostly gameplay utilities; nuikit owns only presentation. ox
  becomes an input, not a rival.
- **Lua-only declarative UI** (a better ox_lib). Covers intents, fails bespoke screens; the protocol covers both.
- **Web components as the renderer contract.** Framework-agnostic but heavy in Chromium 103 and awkward with
  React portals. The module `mount` contract gets the same independence with less.
- **Keep vendoring `nuikit.lua`.** Simple, but updates never reach scripts and versions drift per resource.
- **Overwriting library files as the main install path.** Fragile under library updates; kept only where
  stand-ins can't work, with the doctor watching it.

## What "universal" means, measurably

**Coverage**: the share of UI calls on a stock server drawn by nuikit, on the txAdmin Qbox, QBCore and ESX
recipes, from a scripted session (join, spawn, menus, a job, inventory, death). Target for 0.7: 90%+ on Qbox,
75%+ on QBCore and ESX. The misses become the backlog; the doctor reports the same on any live server.

## Plan (0.7: universal)

1. **`@nuikit/init.lua` and `nk`**: the runtime as an importable library; the kit's systems move off vendored
   Lua. *Built on `feat/runtime`: the kit's systems and the template import it; the bridge loads lazily.*
2. **Intent schemas and generation**, default renderers lifted from the ox_lib override into 0.5 components,
   rendered in nuikit's frame.
3. **Services**: camera and controls next to surfaces.
4. **In-game spike**: stand-in, listener and ox_lib page routing on a real client; choose per library.
5. **`[nuikit-ox]`** on the shared renderers, every ox POST re-verified against `docs/ox-lib-protocol.md`.
6. **`[nuikit-qb]`**: qb-menu, qb-input, qb-target options, `QBCore:Notify`, progressbar, DrawText, qb-radialmenu.
7. **`[nuikit-esx]`**: esx_notify, esx_context, esx_menu_default/dialog, esx_progressbar, esx_textui.
8. **Doctor and coverage harness** on the three reference servers.
9. **Packaging**: per-framework zips, `nuikit.cfg`, txAdmin recipe; renderer packs via `nuikit_renderer`.

The owner tests each step in game through a `next/*` prerelease.

## Risks

- **Fidelity**: superset schemas can still miss edge behaviour (live-updating ox menus, qb-menu headers).
  Clean-room specs and replay tests per adapter.
- **Interception**: stand-ins depend on start order and on libraries keeping their APIs. `provide`, the doctor's
  warnings, and the spike before committing to a mechanism.
- **Scope**: adapters translate UI calls only. Callbacks, zones, points and other gameplay stay with their
  libraries; nuikit never owns gameplay (only exception: `nuikit_stress`).
- **Dependency weight**: the `nk` API and intents stay small and versioned; the look lives in replaceable
  renderers, so depending on nuikit never locks a server into one design.
