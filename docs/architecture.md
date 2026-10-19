# Architecture: one UI layer for any FiveM server

*Oct 19, 2026. The plan for 0.6 onward. Builds on `docs/vision.md` (why), `docs/protocol.md` (v1, shipped on
`feat/platform`) and `docs/tokens.md`. Read this before adding a system, an override or a library integration.*

## The problem, from first principles

Frameworks differ; what scripts ask their UI for doesn't. Every server needs the same dozen things: a
notification, a menu, an input form, a progress bar, a confirm, a key prompt, an interaction list, a radial, a
skill check. ox_lib, qb-menu, esx_menu_default, okokNotify and mythic_notify are different **APIs** for those same
**intents**, each with its own look, its own focus handling and its own Escape. That is why every server is a
patchwork, and why restyling one library (what nuikit 0.4 does with ox_lib) only fixes the servers built on it.

The foundation is to separate **what a script asks for** from **how it looks**, the way an operating system does:
an app says "show a notification" and the system draws it.

## The model

```mermaid
flowchart LR
  subgraph scripts[Existing scripts, unchanged]
    A[qbx_garages<br/>lib.registerContext]
    B[qb-jobs<br/>exports['qb-menu']:openMenu]
    C[esx_jobs<br/>ESX.ShowNotification]
    D[your script<br/>exports.nuikit:menu]
  end
  subgraph adapters[Adapters]
    OX[ox_lib adapter]
    QB[qb adapters]
    ESX[esx adapters]
  end
  subgraph runtime[nuikit runtime: one per server]
    I[Intent API<br/>notify · menu · input · progress · confirm<br/>prompt · target · radial · challenge]
    S[Surfaces: focus, Escape, layers]
    T[Theme + prefs + player context]
  end
  R[Renderers<br/>default: the kit<br/>swappable per intent]
  P[Bespoke UIs<br/>phone, inventory, minigames<br/>protocol surfaces]
  A --> OX --> I
  B --> QB --> I
  C --> ESX --> I
  D --> I
  I --> R
  S --- R
  T --- R
  P --- S
  P --- T
```

### 1. Runtime: the `nuikit` resource

One per server, and the only part every server must run. It owns what must be shared:

- **Surfaces:** focus, cursor, Escape, layers, states. Built (protocol §3).
- **Theme and prefs:** compiled tokens, live reload, player accessibility prefs. Built (`docs/tokens.md`).
- **Player context:** one player shape over Qbox, QBCore, ESX, ox_core, standalone. Built (`bridge.lua`).
- **The intent API.** New, see below.

Intents render in nuikit's **own** frame, so one stack, one focus owner and one theme cover every intent from
every library. This needs no decision about the host (`docs/host.md`): nuikit's frame is already one frame.

### 2. Intents: the contract

An intent is a versioned schema plus a lifecycle (open, update, resolve, cancel). Callable from Lua and JS:

```lua
local choice = exports.nuikit:menu({ title = 'Garage', items = { … } })   -- blocks the thread, like lib.* does
exports.nuikit:notify({ title = 'Paid', description = '$500', status = 'success' })
local id = exports.nuikit:progress({ label = 'Repairing', duration = 5000, cancel = true })
```

**Catalogue v1.** Each schema is a **superset** of what the libraries we adapt can express, so an adapter never
loses information. "Sources" are the APIs it has to cover.

| Intent | What it is | Sources it must cover |
|---|---|---|
| `notify` | Toast: title, description, status, icon, duration, position | ox `lib.notify`, `QBCore:Notify`, `ESX.ShowNotification`, esx_notify, okokNotify, mythic_notify |
| `menu` | List or context menu: items with icon, description, metadata, image, progress, disabled, submenus, events | ox `registerContext`/`showContext`, ox `registerMenu` (list menu), qb-menu, esx_context, esx_menu_default |
| `input` | Form: text, number, select, checkbox, slider, date, colour; validation | ox `inputDialog`, qb-input, esx_menu_dialog |
| `confirm` | Alert with cancel / confirm | ox `alertDialog` |
| `progress` | Timed bar or circle, cancellable, with animation/prop hints passed through to the caller's Lua | ox `progressBar`/`progressCircle`, QBCore `Progressbar` (progressbar resource), esx_progressbar |
| `prompt` | Persistent text/key hint ("[E] Open garage") | ox `showTextUI`, qb-core `DrawText`, esx_textui |
| `target` | Interaction options on an entity, model, zone | ox_target, qb-target (options list only; raycasting stays theirs) |
| `radial` | Radial menu items and submenus | ox `registerRadial`, qb-radialmenu |
| `challenge` | Skill check / minigame step | ox `skillCheck`, ps-ui-style circles |

Not intents (they stay **surfaces** under the protocol): HUD, pause, death, loading, chat, inventory, phone,
banking, character creation. They are whole screens, not requests.

**One schema source.** Each intent's schema lives once (`packages/core/intents/*.json`) and generates the
TypeScript types, Lua annotations, browser mocks and `nuikit check` rules (the "typed messaging" layer from the
vision).

### 3. Adapters: how existing scripts get in

An adapter is a small resource that makes a library's public API land on intents. Scripts don't change. Three
mechanisms, chosen per library and proven in game before shipping:

1. **Stand-in.** The adapter declares `provide '<library>'` (dependencies and `ensure` order resolve to it) and
   answers the library's exports by handling `__cfx_export_<library>_<name>`, the mechanism ox_target uses to
   stand in for qtarget. For libraries that are mostly a UI (qb-menu, qb-input, esx_context, okokNotify), the
   adapter **replaces** them. No files overwritten.
2. **Listener.** For event-driven APIs (`QBCore:Notify`, `esx:showNotification`), the adapter handles the event.
   Where the library also draws its own UI, its config switch turns that off; if none exists, mechanism 3.
3. **Page override (fallback).** What 0.4 does: replace the library's web page. Kept where 1 and 2 can't be made
   reliable, and for ox_lib first (its UI is called from inside ox_lib's own resource). The override page stays
   protocol-exact (`docs/ox-lib-protocol.md`) and renders with the same intent renderers.

Every adapter, like every override today, is **clean-room**: written from the library's public API and a spec in
`docs/adapters/<library>.md`, never from its code, and tested by replaying the library's calls and checking what
the calling script gets back.

**Order and conflicts.** The runtime warns in the server console when a library and its stand-in both run, when
an override was wiped by an update, or when an adapter starts after its consumers.

### 4. Renderers: how it looks

A renderer draws one intent. The kit is the default renderer for every intent (built from the 0.5 components),
and a server can swap them **per intent**: install a resource that declares `nuikit_renderer 'notify'` and its
module replaces the default notifications, still themed by the tokens and stacked by the runtime. This is the
layer sellers build on: renderer packs and themes, checked by `nuikit check`.

The 3D pause menu, the 3D inventory and the other flagship screens are surfaces built from the same components:
the showcase, not special cases. Camera control becomes a runtime-coordinated resource like focus (one owner,
restored on close, stop and death) before more screens use it.

### 5. Bespoke UIs: the protocol

Scripts with their own screens (phones, inventories, minigames, Tebex UIs) join through protocol v1 unchanged:
surfaces for focus and Escape, tokens for the look, context for the player, optionally hosted. Intents don't
replace this; they cover the common requests so bespoke UIs are only needed for genuinely bespoke screens.

## What "universal" means, measurably

**Coverage:** the share of UI calls on a stock server that end up drawn by nuikit. Measured on three reference
servers (the txAdmin Qbox, QBCore and ESX recipes) by logging every UI call during a scripted session (join,
spawn, menus, a job, an inventory, death). Target for 0.6: **90%+ on Qbox, 75%+ on QBCore and ESX.** The report
lists every call that isn't covered and which script made it, and becomes the backlog.

**Install:** one zip and one config block per framework, no files overwritten for stand-in adapters, and a
txAdmin recipe for new servers.

## What changes from today

| Today (0.4 / `feat/platform`) | Becomes |
|---|---|
| ox_lib page override | ox_lib adapter (page override first, routed to shared intent renderers) |
| No QBCore/ESX library coverage | qb and esx adapters, stand-ins where possible |
| Each override renders its own way | One renderer per intent, swappable |
| Overrides wiped silently by updates | Runtime warns in the console |
| `nuikit.zip` + manual copy | Per-framework install, txAdmin recipe |

Protocol v1, tokens v1, surfaces, prefs and the kit are kept as they are. Intents arrive as a protocol capability
(`intents`) so v1 pages are unaffected.

## Plan (0.6)

1. **Intent schemas and API** for the nine intents, generated types, browser mocks, and the default renderers
   (lifted from the ox_lib override's features into the 0.5 components).
2. **Runtime rendering**: intents drawn in nuikit's frame, stacked with surfaces.
3. **Spike: interception in game.** Prove each mechanism on a real client: export stand-in (`provide` +
   `__cfx_export_*`), event listener, and routing the ox_lib override to shared renderers. Pick per library.
4. **ox_lib adapter** on the shared renderers; every ox POST re-verified against its protocol doc.
5. **QBCore adapters:** qb-menu, qb-input, qb-target options, `QBCore:Notify`, progressbar, DrawText, qb-radialmenu.
6. **ESX adapters:** esx_notify, esx_context, esx_menu_default/dialog, esx_progressbar, esx_textui.
7. **Popular standalones:** okokNotify, mythic_notify (picked from the coverage report).
8. **Coverage harness** on the three reference servers, plus the runtime's console checks.
9. **Install:** per-framework packaging and a txAdmin recipe.

Owner tests each step in game via a `next/*` prerelease, as always.

## Risks

- **Fidelity.** A superset schema can still miss a library's edge behaviour (ox menus with live-updating
  options, qb-menu's `isMenuHeader`). Mitigation: a clean-room spec and replay tests per adapter.
- **Interception reliability.** Export stand-ins depend on start order and on libraries not changing their
  exports. Mitigation: `provide`, the runtime's start-order warning, the spike before committing.
- **Scope creep into gameplay.** Adapters translate UI calls only. ox_lib's callbacks, zones, points and the
  like stay ox_lib's; nuikit never owns gameplay (only exception: `nuikit_stress`).
- **Becoming another lib to depend on.** The intent API is small and versioned on purpose; the look lives in
  renderers, which servers and sellers can replace.
