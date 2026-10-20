# create-nuikit

## 0.6.0

### Minor Changes

- a97e831: A bank block: `npm create nuikit@latest my-bank -- -t bank` shows accounts, balances and recent transactions, with deposit, withdraw and transfer checked on the page and again on the server; a standalone example (cash, checking and savings per player) and `Config.money` for a framework's own cash and bank. Also in the registry (`…/r/bank.json`) and on `/blocks`.
- cfb8d9f: A garage block: `npm create nuikit@latest my-garage -- -t garage` lists your vehicles at a garage with fuel, engine and body, and takes them out, stores the one you're driving, or releases one from the impound, with a working standalone example (vehicles kept per player in a JSON file) and the lines to change for Qbox, QBCore or ESX. The server checks every request (your own vehicles only, at the garage, the vehicle read from the game), spawns and deletes vehicles itself so one can't come out twice, and refunds the impound fee if a release fails. Also in the registry (`…/r/garage.json`) and on `/blocks`.
- c280022: Start from a block: `npm create nuikit@latest my-hud -- -t hud-minimal` (or `-t death-screen`, or pick from a list) scaffolds a whole screen from the registry with its Lua (`@nuikit/init.lua`, `nk.surface`, `nk.stream`). The first two blocks are also in the registry (`npx shadcn add https://nuikit.vercel.app/r/hud-minimal.json`, `…/death-screen.json`). New projects now depend on the nuikit-core and vite-plugin-nuikit of the same release instead of 0.2.
- 6f5181b: A job-menu block: `npm create nuikit@latest my-jobs -- -t job-menu` gives a duty toggle and the job's actions, and for the boss a Staff tab with the job account, promote, demote, fire (with a confirm) and hire whoever is nearby. The server checks every request against the caller's own job and grade, never what the page says; a standalone example (jobs and grades in `config.lua`, who works where per player in a JSON file) and `Config.sync` to mirror changes into Qbox, QBCore or ESX. Also in the registry (`…/r/job-menu.json`) and on `/blocks`.
- 881cfbb: Two more blocks: `npm create nuikit@latest my-pause -- -t pause-menu` (Esc opens it in place of GTA's pause menu, with the game's map, settings and key bindings one click away and a confirm before Disconnect) and `-t loading-screen` (the real load progress phase by phase, tips, links, backgrounds and music, themed through the connection handover). Both are also in the registry (`…/r/pause-menu.json`, `…/r/loading-screen.json`).
- 0d46d01: A scoreboard block: `npm create nuikit@latest my-scoreboard -- -t scoreboard` shows who's online with server IDs, jobs and ping, a search, how full the server is, and which activities can start given who's on duty (jobs come from one `Config.job` function with ready-made Qbox, QBCore and ESX versions). Also in the registry (`…/r/scoreboard.json`).
- ffc9b4a: A settings block: `npm create nuikit@latest my-settings -- -t settings` gives players one panel of toggles, choices, sliders and key hints, saved on their PC and announced to your scripts, with nuikit's accessibility preferences (UI size, reduced motion, high contrast) built in. Also in the registry (`…/r/settings.json`).

## 0.5.0

### Minor Changes

- e9714e0: New projects start on the kit: the demo HUD, menu and confirm are built from the new `panel`, `menu-row`, `meter` and `hud-chip` registry components, and `index.css` carries the new kit utilities (`nk-panel-header-stack`, `nk-field`, `nk-anchor-*`, `nk-first-row`).
- 5d9eb9d: Import the Lua runtime like ox_lib: `dependency 'nuikit'` + `shared_script '@nuikit/init.lua'` loads it from the running `nuikit` resource, so updating nuikit updates every resource that uses it. `nk` is the new name (`NUI` stays the same table); the framework bridge loads on first use of `nk.player`. New projects from `create-nuikit` import it instead of carrying a copy of `nuikit.lua`. `nuikit check` accepts the import as the runtime.

## 0.4.0

## 0.3.0

### Minor Changes

- 79748d6: Surfaces: declare each piece of UI with `NUI.surface(name, opts)` and nuikit owns focus, cursor, stacking (hud < world < panel < modal < system), Escape order, exclusive panels, `hides` and `blockedBy` states across every resource that uses it, with no extra resource to install. React gets `<Surface>`, `useSurface`, `useNuiStates`, `openSurface`/`closeSurface`; the devtools get a Surfaces tab with state toggles. The Lua manager is tested under real Lua 5.4 in CI. The template now shows a HUD, a menu and a confirm dialog stacking correctly. `NUI.open`/`NUI.close` keep working.
