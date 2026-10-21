<a href="https://nuikit.vercel.app"><img src="https://raw.githubusercontent.com/belibathan/nuikit/main/docs/assets/banner.png" alt="nuikit" width="100%" /></a>

# create-nuikit

[![npm](https://img.shields.io/npm/v/create-nuikit?style=flat-square&labelColor=0a0a0a&color=262626)](https://www.npmjs.com/package/create-nuikit)
[![CI](https://img.shields.io/github/actions/workflow/status/belibathan/nuikit/ci.yml?branch=main&label=CI&style=flat-square&labelColor=0a0a0a&color=262626)](https://github.com/belibathan/nuikit/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-262626?style=flat-square&labelColor=0a0a0a)](https://github.com/belibathan/nuikit/blob/main/LICENSE)

Part of **[nuikit](https://github.com/belibathan/nuikit)**, the shared layer between scripts and screens on any FiveM server. [Website & live demo →](https://nuikit.vercel.app)

```bash
npm create nuikit@latest my-hud
pnpm create nuikit my-hud
```

Scaffolds a FiveM resource: `fxmanifest.lua` importing the nuikit runtime (`shared_script '@nuikit/init.lua'`), a Lua client using `nk`, and a `web/` app with Vite, React 19, Tailwind v4 and shadcn. CSS is lowered for FiveM's Chromium 103, and you get browser devtools and in-game hot reload.

Options: `-t, --template <block>`, `--yes`, `--pm pnpm|npm|yarn|bun`, `--no-install`.

## Start from a block

A block is a whole screen from the [nuikit registry](https://nuikit.vercel.app), with its Lua:

```bash
npm create nuikit@latest my-hud -- -t hud-minimal
npm create nuikit@latest my-death -- -t death-screen
```

| Block | What |
|---|---|
| `hud-minimal` | Vitals, needs, voice, cash, bank, job and a speedometer, on any framework |
| `death-screen` | Last stand and death: countdown, call EMS, hold to respawn |
| `pause-menu` | Esc opens it in place of GTA's: resume, map, settings, key bindings, disconnect |
| `loading-screen` | The real load progress, tips, links, backgrounds and music, in the server theme |
| `settings` | Player settings: toggles, choices, sliders, key hints, and nuikit's accessibility prefs |
| `scoreboard` | Who's online with IDs, jobs and ping, a search, and which activities can start |
| `garage` | Your vehicles with fuel, engine and body; take out, store, release from the impound. Needs OneSync |
| `bank` | Accounts, balance, transactions; deposit, withdraw and transfer, checked by the server |
| `job-menu` | Duty toggle and job actions; for bosses, staff with promote, demote, fire and hire, checked by the server |
| `interaction` | A target eye with the options of what you aim at, and [E] key prompts near places, press or hold |
| `shop` | A catalogue by category, a cart and checkout with a confirm; prices, stock and money checked by the server. Needs OneSync |
| `inventory` | Your pockets and a stash side by side: drag, split, stack, swap, use, a hotbar; every move checked by the server |
| `vehicle-shop` | A showroom: categories, stats, paint, test drives and buying with a confirm; the server spawns and checks everything. Needs OneSync |
| `character-select` | Character slots, a player card, create with validation, delete with a confirm, and where to spawn; checked by the server |

Without `-t` you get the demo (a HUD, a menu and a confirm dialog), or pick from a list.

---

<sub>MIT · Built by <a href="https://github.com/belibathan">@belibathan</a> · <a href="https://github.com/belibathan/nuikit">github.com/belibathan/nuikit</a></sub>
