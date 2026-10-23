<div align="center">

<a href="https://nuikit.vercel.app"><img src="docs/assets/banner.png" alt="nuikit, the design system for FiveM NUI: a pause sheet, vitals with fill meters and slanted keycap hints in the Default theme" width="100%" /></a>

# nuikit

**One design system for every screen on your FiveM server.**

HUD, pause, death, loading and chat. New interfaces for ox_lib, ox_inventory, ox_target and the scripts you
already run, without touching their Lua. A shadcn-style component registry, a CLI and a Vite plugin.
One theme repaints all of it. Free and open source.

[![nuikit-core](https://img.shields.io/npm/v/nuikit-core?label=nuikit-core&style=flat-square&labelColor=0a0a0a&color=262626)](https://www.npmjs.com/package/nuikit-core)
[![vite-plugin-nuikit](https://img.shields.io/npm/v/vite-plugin-nuikit?label=vite-plugin-nuikit&style=flat-square&labelColor=0a0a0a&color=262626)](https://www.npmjs.com/package/vite-plugin-nuikit)
[![create-nuikit](https://img.shields.io/npm/v/create-nuikit?label=create-nuikit&style=flat-square&labelColor=0a0a0a&color=262626)](https://www.npmjs.com/package/create-nuikit)
[![CI](https://img.shields.io/github/actions/workflow/status/belibathan/nuikit/ci.yml?branch=main&label=CI&style=flat-square&labelColor=0a0a0a&color=262626)](https://github.com/belibathan/nuikit/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-262626?style=flat-square&labelColor=0a0a0a)](LICENSE)

**[Download](https://github.com/belibathan/nuikit/releases/latest)** · [Website](https://nuikit.vercel.app) · [Components](https://nuikit.vercel.app/components) · [Blocks](https://nuikit.vercel.app/blocks) · [Theme studio](https://nuikit.vercel.app/theme) · [Docs](#docs)

</div>

## Why nuikit

- **One look, server-wide.** Every resource usually ships its own page, fonts and focus calls, so a server looks
  like thirty products. nuikit gives them one theme, one focus owner and one Escape order.
- **Overrides, not rewrites.** Swap the interface of ox_lib, ox_inventory, ox_target, Renewed-Banking and more.
  Their Lua, their exports and every callback payload stay the same, so the scripts that call them don't notice.
- **Safe on FiveM's browser.** FiveM's NUI runs Chromium 103. The Vite plugin lowers Tailwind v4 and shadcn CSS
  so it renders there, and `nuikit check` flags what won't (`color-mix()`, `backdrop-filter`, soft shadows). Ready
  for Chromium 144 when it reaches the release channel.
- **Light on frames.** Transform and opacity motion only, no blur. Values that move every frame (speed, RPM) stream
  as live values instead of re-renders, and intents draw in one shared frame instead of one page per script.

## Features

| | |
|---|---|
| **Systems** | HUD, pause menu with a 3D map, death, loading screen and chat, in one `[nuikit]` folder. |
| **Overrides** | Clean-room interfaces for 11 popular resources. Same Lua, new screen. |
| **Intents** | `nk.notify`, `nk.menu`, `nk.input`, `nk.progress`, `nk.target`… drawn by swappable renderer packs. |
| **Adapters** | QBCore, ESX and standalone libraries (qb-menu, esx_context, okokNotify…) land on the same intents. |
| **Registry** | 32 components and 20 blocks, shadcn-native: `npx shadcn add` one, or start from a whole screen. |
| **Themes** | Tokens in three tiers. Paste a TweakCN theme or pick an identity; `nuikit theme reload` repaints live. |
| **Runtime** | `shared_script '@nuikit/init.lua'` gives any resource `nk`: surfaces, messaging, state, camera, controls. |
| **Tooling** | `npm create nuikit`, browser devtools that fake the game, `nuikit check` and `nuikit doctor`. |

## Quick start

**Run it on a server.** Download the zip for your framework (`nuikit-qbox.zip`, `-qbcore`, `-esx`, `-standalone`)
from the [latest release](https://github.com/belibathan/nuikit/releases/latest), put `[nuikit]` in `resources/`
and add one line to `server.cfg`, after your framework:

```cfg
exec @nuikit/nuikit.cfg
```

Then, in the server console, `nuikit install` merges the overrides (ox_lib, ox_inventory…) into the resources you run,
with a backup; `nuikit doctor` says what's left; `nuikit upgrade` after a new zip, `nuikit uninstall` to go back.
Per-framework steps, start order and what gets stopped: [`docs/install.md`](docs/install.md).

**Build a UI.**

```bash
npm create nuikit@latest my-ui -- -t garage
cd my-ui/web && npm run dev          # press ` for the devtools
```

**Use it from Lua.**

```lua
-- fxmanifest.lua
dependency 'nuikit'
shared_script '@nuikit/init.lua'
```

```lua
local shop = nk.surface('shop', { layer = 'panel', hides = { 'hud' } })
shop:open({ items = GetItems() })   -- focus, cursor and Escape handled across resources
nk.notify({ title = 'Paid', type = 'success' })
```

**Check a resource.** `nuikit check ./my-resource` audits it against the [protocol](docs/protocol.md) and the
design rules and prints its conformance level (1 to 3). The CLI lives in [`packages/cli`](packages/cli) and isn't
on npm yet.

## Themes

**Default** is the flagship and the default: monochrome, Barlow Condensed italic caps for anything you scan, Geist for
sentences, one slanted keycap tile for keys, icons and status, fills instead of rings, hard drops, no pills, no
blur. Colour appears only when it means something. Spec: [`docs/design/default.md`](docs/design/default.md).

| Identity | Character |
|---|---|
| **Default** (default) | Black and white, italic caps, slanted keycaps, fill-based status |
| **Neon Pop** | Default's structure, vivid palette: a blue-violet-rose accent gradient, a colour per vital |
| **Graphite** | Utilitarian: stock shadcn neutrals, Inter, compact |
| **Signal** | Bold and street: condensed type, chamfered corners, high-vis yellow |
| **Velvet** | Soft and warm: rounded, serif display, champagne on aubergine |
| **Vector** | Tactical instrument: mono numerals, hairlines, segmented meters |
| **Arcade** · **Street** · **Studio** | Loud game UI; slate-and-cyan slabs; calm pro-software panels |

Copy one from `nuikit/themes/` over `nuikit/theme.css` (or paste any [TweakCN](https://tweakcn.com) theme), then
run `nuikit theme reload`. Missing values are derived and contrast problems print in the console. Players add
their own: `/nuikit scale 1.1`, `/nuikit motion off`, `/nuikit contrast on`. Tokens: [`docs/tokens.md`](docs/tokens.md).

## Compatibility

| | Status |
|---|---|
| **Qbox** | Tested in game |
| **QBCore** | Bridge and `[nuikit-qb]` adapters; in-game round pending |
| **ESX** | Bridge and `[nuikit-esx]` adapters; in-game round pending |
| **Standalone** | Bridge and `[nuikit-standalone]` adapters (okokNotify, mythic_notify) |
| **ox_lib · ox_inventory · ox_target · ox_doorlock** | Overrides; ox_lib also routes to nuikit's intents |
| **Renewed-Banking · illenium-appearance · mm_radio · qbx_\*** | Overrides (scoreboard, ID card, taxi job, vehicle sales) |
| **FiveM CEF** | Chromium 103 today; Chromium 144 (canary) next |

<details>
<summary><b>What's in the box</b></summary>

**Systems** (`[nuikit]/`)

| Resource | What it does | Replaces |
|---|---|---|
| [`nuikit`](systems/nuikit) | The runtime: `@nuikit/init.lua`, intents, theme compiler, player prefs, themes and fonts | — |
| [`nuikit_hud`](systems/nuikit_hud) | Vitals, voice, money, job, ammo; vehicle cluster; radar with compass and location | `qbx_hud` |
| [`nuikit_stress`](systems/nuikit_stress) | Keeps stress gain and effects when the HUD is replaced | stress in `qbx_hud` |
| [`nuikit_pause`](systems/nuikit_pause) | Esc menu with a framing camera, 3D map, key bindings and player card | GTA's Esc menu |
| [`nuikit_death`](systems/nuikit_death) | Last stand and death with your medical resource's timers and keys | its drawn text |
| [`nuikit_loading`](systems/nuikit_loading) | Loading screen with real progress, tips, links and the server theme | `loadscreen` |
| [`nuikit_chat`](systems/nuikit_chat) | Chat theme in your server's tokens | `qbx_chat_theme` |

**Overrides** (`overrides/`: clean-room from specs in [`docs/`](docs), none of the original code)

| Resource | Interface |
|---|---|
| [`ox_lib`](addons/ox_lib) | Notify, context and list menus, input, alert, progress, skill check, text UI, radial |
| [`ox_inventory`](addons/ox_inventory) | Inventory, stashes, trunks, shops, crafting, hotbar, drag and drop |
| [`ox_target`](addons/ox_target) · [`ox_doorlock`](addons/ox_doorlock) | The target eye; the door lock UI |
| [`illenium-appearance`](addons/illenium-appearance) | Character creator, clothing, barber, tattoo and surgeon shops |
| [`Renewed-Banking`](addons/Renewed-Banking) | Bank and ATM |
| [`mm_radio`](addons/mm_radio) | Radio and the "who's talking" overlay |
| [`qbx_scoreboard`](addons/qbx_scoreboard) · [`qbx_idcard`](addons/qbx_idcard) · [`qbx_taxijob`](addons/qbx_taxijob) · [`qbx_vehiclesales`](addons/qbx_vehiclesales) | Scoreboard, ID cards, taxi meter, sale contract |

**Registry** (`npx shadcn add https://nuikit.vercel.app/r/<name>.json`)

- Components: `tile`, `fill`, `chip`, `action-bar`, `icon-text`, `menu-row`, `edge-sheet`, `panel`, `meter`,
  `vital-chip`, `speedometer`, `notice`, `key-prompt`, `skill-check`, `item-slot`, `radial-menu`, `text-roll` and
  more on [/components](https://nuikit.vercel.app/components).
- Blocks (`npm create nuikit my-ui -- -t <block>`): `hud-minimal`, `pause-menu`, `death-screen`, `loading-screen`,
  `inventory`, `bank`, `garage`, `shop`, `vehicle-shop`, `character-select`, `scoreboard`, `job-menu`, `mdt`,
  `phone` and more on [/blocks](https://nuikit.vercel.app/blocks). Blocks that move money or items check every
  action on the server.

</details>

## Status

**0.8.0** is out: intents, adapters, renderer packs, camera and controls services. The kit through 0.7 is tested in
game on Qbox; 0.8 is checked per PR and still needs a full in-game round, especially on QBCore and ESX. Known
issues and what's next: [`docs/roadmap.md`](docs/roadmap.md).

## Docs

| Doc | What |
|---|---|
| [Vision](docs/vision.md) | Why nuikit exists and where it's going |
| [Architecture](docs/architecture.md) | Runtime, intents, adapters, renderers |
| [Protocol](docs/protocol.md) | The standard (v1): surfaces, messaging, theme, context, conformance |
| [Intents](docs/intents.md) · [Services](docs/services.md) | What scripts ask for; camera and controls |
| [Adapters](docs/adapters/README.md) | ox_lib, QBCore, ESX and standalone libraries on nuikit |
| [Tokens](docs/tokens.md) · [Default](docs/design/default.md) · [Design](docs/design.md) · [Naming](docs/design/naming.md) | Theme contract, the flagship theme, the kit language, the naming conventions |
| [Coverage](docs/coverage.md) · [Roadmap](docs/roadmap.md) | What's covered on a Qbox server; status and next |
| [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) | How to help; how to report a vulnerability |

## Credit and licence

Designed and built by <a href="https://github.com/belibathan"><img src="https://github.com/belibathan.png?size=40" width="16" height="16" align="center" alt="" /> <b>@belibathan</b></a>.

[MIT](LICENSE). Not affiliated with Cfx.re, Rockstar Games or shadcn. Overrides are clean-room implementations and
contain none of the original resources' code. Fonts are SIL OFL 1.1. Brand files live in [`docs/brand`](docs/brand).
