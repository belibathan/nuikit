# nuikit Lua against fivem-foundation

Audit of every `.lua` surface against `fivem-foundation/AGENTS.md` (§ = `STANDARDS.md`), Oct 27, 2026.
One line per finding: `file:line` · reference · size (S/M/L). Passes are recorded too so nobody redoes them.
Convention calls made here are rows 40–44 of [`decisions.md`](decisions.md). Lane: `foundation`.

## The queue (leverage × size), top 10

1. [x] Templates: ship `helpers/` (`log`, `wait`, `rate_limiter`, `sanitize`, `json_safe`, `server_id`) and load them from every template manifest (S).
2. [x] Templates: `json.decode` at load → `JsonSafe.decode`; a corrupt save file is logged and kept, never overwritten (11 × S).
3. [x] Templates: admin commands parse the target id with `ServerId.online` (`3.5` / `'3abc'` hit player 3 today) (4 × S).
4. [x] Templates: every `print` → `Log.*` (colour + `[RESOURCE]` + `^7`) (14 × S).
5. [x] Templates: deadline `while` loops → `WaitLimiter.waitUntil`; the infinite ones carry `-- INFINITE LOOP:` (S).
6. [x] Templates and systems: `use_fxv2_oal 'yes'` in every manifest (47 × S, one sweep).
7. [x] Runtime: `nk.log` (arsenal domain `log`) in `nuikit.lua`, every runtime console line through it; `nk.json` for the two decode sites and the KVP writes (M).
8. [x] Runtime: the four bounded loops carry the §8 exception comment. No `waitUntil` in the runtime: nothing in it polls with a deadline, and unused code is ghost code (§26); templates use `helpers/wait.lua` (S).
9. [x] `nuikit_hud/client/vehicle.lua:109`: `GetVehicleHandbrake(vehicle) == true` is always false (BOOL natives return `1`) (S).
10. [x] `nuikit_hud`: natives and `math.*` cached in `main.lua` and `vehicle.lua` (§20); the loops carry the INFINITE LOOP comment; GTA's radar comes back on `onResourceStop` (M).

Done too: the `-- GLOBAL:` sweep over module tables and configs, spec tests per new guard (`helpers.spec.lua`, `corrupt-save.test.ts`, forged ids), `nuikit_dev` log colours, the `nuikit_death` `source` rename. Left: the §15 `GetPlayerName(src)` check in the shared dispatcher (S, low), `SetResourceKvpNoSync` (S, optional), LuaLS annotations on the template handlers (M, low), `nk.log` in the systems' and adapters' remaining prints (S).

## 1. Templates (`packages/create-nuikit/templates/*`)

Fourteen templates with Lua; shared shape: `config.lua`, `client/main.lua`, `server/main.lua` with one `{{name}}:req`
event (`id, name, data`) dispatched to `handlers[name]` under `pcall`, answered on `{{name}}:res`.

**Security (AGENTS §4, §11, §15, §18)**
- All 14 dispatchers: `type(name) == 'string'`, `type(data) == 'table'`, `pcall`, one answer per request: ok.
- Rate limit per player: bank, character-select, garage, inventory, job-menu (`limited`, 10/s); job-sheet (`busy` + `limited`); job-tracker (`busy` + `minInterval`); mdt (`Config.rate` per bucket); phone (`Config.rate` per kind); npc-dialogue, shop, storefront, vehicle-shop (own tables): ok. `playerDropped` clears them everywhere: ok.
- interaction `server/main.lua:48,137,162`: per-option cooldown only; `use`/`select` reads before the cooldown are unlimited · §15 · S (acceptable: reads are cheap; noted).
- Distance: bank, garage, inventory, job-tracker, npc-dialogue, shop, storefront, vehicle-shop check the server-side position (`near`, OneSync, refused when off): ok. character-select, job-menu, job-sheet, mdt, phone have no position (menus, phone): n/a.
- Server decides: prices, balances, items, spawns, fees are server-side in every template (garage `store` reads the vehicle from the game, `release` charges then acts or refunds): ok (`docs/next/security.md`, decision 24).
- `source` validity (`GetPlayerName(src)`) is not checked in the shared dispatcher · §11 · S (a net event's `source` is the sender; a dropped player still answers to nobody; low).
- Player id from args as forgeable: `interaction:94`, `inventory:243`, `job-menu:242`, `job-sheet:182` parse `tonumber(args[1])` and pass it to `GetPlayerName` / `GetPlayerIdentifierByType`, which atoi `3.5` to player 3 · pitfall "Player id in natives" · S each → `ServerId.online`. Commands are `restricted = true` (ace), so the caller is an admin or the console; still fixed.
- `bank/server/main.lua:151`: the transfer target is parsed from the account string with `^%d+$`, so an integer: ok.
- NUI callbacks: templates use `nk.message.on` (the runtime's `RegisterNUICallback`); every state change goes to the server through `{{name}}:req`: §18 ok.

**JSON (pitfall "JSON")**
- `json.decode(LoadResourceFile(...) or '{}') or {}` at load in bank:7, character-select:10, garage:20, inventory:10, job-menu:8, job-sheet:9, job-tracker:9, mdt:9, shop:9, storefront:12, vehicle-shop:9: the two return values are collapsed by `or {}`, but a corrupt file loads as empty and the next `save()` overwrites it · `json_safe.lua`, `kvp_store.lua` rule 1 · S each.
- `settings/client/main.lua:22`: `pcall(json.decode, raw)` into one local: ok.
- `json.encode` of `{}` → `[]`: the save files are maps keyed by license, so an empty one round-trips as `[]` and decodes to an empty table: harmless.

**Loops (§8)**
- Deadline polls without a helper: garage `server:173`, `client:114`; vehicle-shop `server:93`, `client:49,63,135`; character-select `client:100` · S each → `WaitLimiter.waitUntil`.
- `character-select/client/main.lua:75`: `while not NetworkIsSessionStarted() do Wait(250) end`, no deadline · §8 · S (a bounded wait with a long timeout and the alive check).
- Service loops `while true` with `Wait(≥ 250)` or render `Wait(0)`: hud-minimal:29,50, interaction:133,210, npc-dialogue:63, job-tracker:93, scoreboard:24, character-select `server:222`, storefront:67, death-screen:78, vehicle-shop:124, shop:61, pause-menu:155: deliberate; need the `-- INFINITE LOOP:` comment · S sweep.
- `bank:53`, `phone:118,121`, `mdt:211`, `job-sheet:39`: bounded table trims: ok.

**Logging (§7)**
- Every server file prints `[{{name}}] … failed: …` without colour or `^7`; garage:18 and bank:14 colour the OneSync warning but reset with `^0` · S each → `Log.error`/`Log.warn`.
- Usage lines of admin commands print plain text (console only): ok once they go through `Log.info`.

**Manifest (§2)**
- No template has `use_fxv2_oal 'yes'` · S sweep.
- `dependency 'nuikit'` + `shared_script '@nuikit/init.lua'` in every template: conflicts with "no dependencies but oxmysql" · decision 40 (nuikit is the runtime import, like ox_lib in the foundation's own examples before replacement; it stays).
- `ui_page 'web/dist/index.html'`, `files { 'web/dist/**/*' }`: §18 ok (build only).

**Naming (AGENTS §3)**
- `{{name}}:req` / `{{name}}:res` / `{{name}}:request` / `{{name}}:info` instead of `<resource>:server:<action>` · decision 41 (one request event per template, dispatched by `name`; the page's `nui.ts` and the README document it; kept).
- `Config = {` in every `config.lua` without `-- GLOBAL:` · §4 · S sweep (`Config` is the sanctioned config global in the foundation too).

**Other**
- BOOL natives `== true`: none on natives (the `== true` hits are on table fields and Config hook results): ok.
- State bags: garage:180, interaction:108, vehicle-shop:96 set from the server with `replicated = true`; `vehicle-shop/client:44` reads `value` from the handler, not the bag: ok.
- Persistence: `save()` writes the whole file on every change; no transactional encode-then-write · `kvp_store.lua` rule 2 · S (JsonSafe.encode before SaveResourceFile).
- `onResourceStop`: character-select, death-screen, vehicle-shop clients clean cameras and surfaces: ok. Garage and vehicle-shop spawn server entities, which FXServer deletes with the resource: ok (comment says so). The rest open surfaces only (nuikit releases them): ok.
- LuaLS annotations on public functions: sparse (0–13 `---` lines per server file) · §5 · M, low (templates are examples; the handlers are local).

## 2. Runtime (`packages/core/lua/*`, synced to `systems/nuikit/lib/*`)

- Globals: `NUI` and `nk` (api.lua:6–7, init.lua:46) are the sanctioned ones · decision 42. `nuikit.lua:60` replaces `RegisterNUICallback` (so the host can forward hosted modules' callbacks) without a `-- GLOBAL:` comment · §4 · S. `intents.lua:77 check =` and `camera.lua:415 synced =` assign forward-declared locals: ok.
- Logging: 15 `print` sites (`nuikit.lua:38,76`, `settings.lua:183,333,372,376`, `host.lua:30,145`, `keys.lua:96,100,104`, `camera.lua:63`, `intents.lua:272,298,427`), each formatting its own `^N[nuikit…]…^7`; `host.lua:30` and `nuikit.lua:38` reset the colour before the message · §7 · M → one `Log` table in `nuikit.lua`, used by every file.
- `json.decode`: `nuikit.lua:658`, `settings.lua:140` under `pcall` into one local; `settings` checks `type == 'table'`, prefs normalise: ok. No shared helper (S, with `Log`).
- Loops: `bridge.lua:356` `while true do poll() Wait(250)` (the player poll, runs for the resource's life) and `systems/nuikit/client.lua:385` (a `Wait(0)` frame loop, bounded by `satnavBy`) need the §8 exception comment · S. `controls.lua:102`, `camera.lua:134` `while #order > 0` with `Wait(0)` (render) and `Wait(WATCH_MS)`: the render exception, comment · S. No deadline polls: ok.
- `onResourceStop` (§22): the runtime cleans *other* resources' state on `onClientResourceStop` (host:101, intents:432, keys:67, nuikit:469,769,849, settings:265, camera:399) and its own claims (camera:399 `releaseAll('stop')`, keys, settings): ok. controls disables per frame, so a stopped thread re-enables: ok.
- BOOL natives: `bridge.lua:329` accepts `== true or == 1`: ok. Elsewhere `== true` is on table fields: ok.
- State bags: handlers read `value` (nuikit.lua:607,612,762,842; bridge:96), never the bag: ok. 128 KiB: `nuikitTheme` is the compiled token set (well under): ok, untested at the limit.
- KVP: `nuikit.lua:687`, `settings.lua:151` `SetResourceKvp` (prefs, settings) on change; loading (`localPrefs`, `readSaved`) never writes: ok. `SetResourceKvpNoSync` is the foundation's measured faster variant · `kvp.md` · S, optional.
- Naming: `nuikit:<domain>:<event>` (the arsenal, `packages/core/src/spec/api`) vs `<resource>:<side>:<action>` · decision 43 (the arsenal is the API's source of truth; kept).
- `nuikit.lua:60` `RegisterNUICallback` wrapper: hosted callbacks are forwarded, so a callback is never called from another resource directly (`nui.md`): ok.

## 3. Systems (`systems/*`)

- `nuikit_hud/client/vehicle.lua:109`: `GetVehicleHandbrake(vehicle) == true` · pitfall "BOOL natives" · S (always false; the `IsControlPressed` fallback masks it on the driver's own key only).
- `nuikit_hud/client/vehicle.lua:79`: `GetIsVehicleEngineRunning(vehicle) == true or … == 1`: ok.
- `nuikit_hud/client/main.lua:169–200` (33 ms vehicle loop), `:207–221` (`Wait(0)` hide loop), `:257–282`, `minimap.lua:345,523,533,546,568`, `weapon.lua:110`: natives (`GetEntitySpeed`, `GetEntityHeading`, `GetEntityCoords`, `PlayerPedId`, `IsPedInAnyVehicle`, `HideHudComponentThisFrame`, `GetVehicleCurrentRpm`) and `math.*` called through the globals · §20 · M. Eight threads with dynamic sleep each; one thread per concern is the foundation's shape (`sphere_zones.lua`); merging them is L and not worth it now (each sleeps when idle).
- `nuikit_hud/client/main.lua:420`: `/hud units` writes the KVP only for `mph|kmh`: ok.
- `nuikit_hud/client/main.lua:90`: `invOpen` handler reads `value`: ok.
- `nuikit_dev/server.lua`: `/nk test` checks the ace, an allowlist and two cooldowns in `NkDev.authorize` (shared.lua, tested): §15 ok. Items fixed server-side (`NkDev.STOCK_ITEMS`): ok. Restart queue runs only existing resource names (`NkDev.queueNames`), never `nuikit`: ok. Prints at 2,11,42,59,62 lack colour/`^7` · §7 · S. `dependency 'ox_lib'` (fxmanifest:11) · §2 · dev-only tool, left.
- `nuikit_stress/server.lua`: `valid(amount)` (number, finite, 1–100), per-player window and relief cap, `playerDropped` cleanup, exports validate `src` as a positive integer: §15 ok. Event names `hud:server:GainStress` are qbx_hud's, kept on purpose · decision 44.
- `nuikit_death/server/main.lua`, `nuikit_pause/server/main.lua`: read-only answers, one per second per player, `DropPlayer(source)` only ever drops the sender: ok.
- `nuikit_death/client/main.lua:41,284`: a file-local named `source` (the medical adapter) shadows the event global's name · §5 · S, rename.
- Module globals without `-- GLOBAL:`: `Death`, `Adapters`, `Layout`, `Location`, `Minimap`, `Prefs`, `Vehicle`, `Weapon`, `Loading`, `Camera`, `Focus`, `Inventory`, `Keys`, `Pause`, `Map3D`, `Settings`, `Screens`, `Screen`, `NkDev`, `Config` (20 sites) · §4 · S sweep.
- Loops: `nuikit_stress/client.lua:30,51,68`, `nuikit_voice/client.lua:68`, `nuikit_screen:157`, `nuikit_death:363,374`, `nuikit_pause/client/*`: all `while true` service or render loops with dynamic sleep; `nuikit_loading:49` is bounded by `GetIsLoadingScreenActive()`: ok, comment sweep (S).
- `onResourceStop`: `nuikit_screen`, `nuikit_voice` clean up; `nuikit_pause` cameras go through `nk.camera` (the runtime releases on stop); `nuikit_hud` radar state (`DisplayRadar`) is not restored when the resource stops · §22 · S.
- Manifests: none has `use_fxv2_oal` (S sweep); `nuikit_chat` and `nuikit_skins` have no Lua (`lua54` not needed): ok.
- `print`: `nuikit/client/*.lua` (7), `nuikit_hud` (10), `nuikit_pause` (3), `nuikit_loading` (1), `nuikit_stress/config.lua` (1): mostly coloured, inconsistent · §7 · S, after the runtime `Log` lands they use `nk.log`.

## 4. Adapters (`adapters/*`, 38 client files)

- No server scripts, no `RegisterNetEvent` of its own names: every event is the adapted library's (`QBCore:Notify`, `esx:showNotification`, `okokNotify:Alert`, …) and must stay · decision 44: ok.
- Loops: `nuikit_esx_progressbar/client.lua:46`, `nuikit_qb_progressbar/client/effects.lua:21` poll with `tries < 100`; `nuikit_qb_progressbar/client/main.lua:82` is bounded by `running == bar`: ok.
- `onResourceStop`: `nuikit_esx_progressbar` only; the others hold no game state beyond nuikit surfaces: ok.
- `print`: 1–4 per file, coloured, `^7`: ok (S, `nk.log` later).
- Manifests: no `use_fxv2_oal` (in the sweep).

## Not seen in game

Everything here is offline: wasmoon Lua tests and reading. The in-game checkpoint (owner): a `garage` template resource and `nuikit_hud` on the dev server after 3a and 3c.
