# Roadmap and status

*The one tracker. Each lane updates only its own section, in the PR that changes it. Lanes, files and rules:
[`next/dispatch.md`](next/dispatch.md). Direction: [`vision.md`](vision.md), design: [`architecture.md`](architecture.md).
Design calls: [`next/decisions.md`](next/decisions.md).*

Last updated: Oct 22 2026, after the 0.8.0 release.

## Released

| Version | What | In game |
|---|---|---|
| 0.4.0 | The full kit: HUD, pause, death, loading, chat, stress, 10 overrides | Yes |
| 0.5.0 | Tokens v1 + theme engine, protocol v1, `nuikit check` (level 3 in CI), `@nuikit/init.lua` + `nk`, showcase pause/inventory/minimap | Yes |
| 0.6.0 | 15 components, 7 screens rebuilt on them, 9 blocks + `npm create nuikit -t`, `/blocks`, theme studio | Yes (7 of 8) |
| 0.7.0 | Identities + tokens 1.2, motion, compact HUD, components v2, hardening, `nuikit doctor`, `nuikit.cfg`, per-framework zips, txAdmin recipe | Checkpoint ([results](releases/v0.7.0-results.md)) |
| **0.8.0** | Intents (`nk.notify` … `nk.challenge`) drawn in nuikit's frame; ox_lib routed to them; `[nuikit-qb]`, `[nuikit-esx]`, `[nuikit-standalone]` adapters; renderer packs; `nk.camera` + `nk.controls`; the owner's design (sheets, rows, text roll, vital chips, flush pause); image resolver (page side); server currency/locale ([notes](releases/v0.8.0.md)) | **Not as a whole**: per-PR checklists |

Measured and settled: FiveM shares one browser process across NUI frames, so the host saves ~5 MB and stays opt-in;
mouse over focused UI ~1.2 ms/frame, Lua→page ~0.3 ms, page→Lua ~0.5 ms (hence live values, protocol §5.7);
FiveM starts a dependency (`nuikit`) when a dependent starts.

## Open across lanes

- **0.8.0 in game as a whole:** adapters on a real QBCore and ESX server (cross-resource fetch, which frame gets keys:
  [`adapters/ox-lib.md`](adapters/ox-lib.md) §6), renderer packs, `nk.camera` checklist in [`services.md`](services.md).
- Known issues: GPS route outside the minimap ring (`Config.minimap.routeClip` candidates, none proven); minimap blank
  after repeated live restarts until the pause map opens (not on a fresh join).
- Unproven: an empty `nuikit_cancel_key` leaves the cancel key unbound in FiveM (#119, `client/intents.lua`).
- Owner only: claim the npm name `nuikit`, then drop `"private": true` in `packages/cli`; GitHub About + social preview;
  check the kit on Chromium 144 (FiveM canary).

## Owner's local lane (in game on the owner's Qbox server)

`local/*` branches, judged live, merged by the lead. `local/hud-layers` (#102): tokens 1.3 (Arcade/Street, rolls,
choreography); the HUD leaves toward its edges and returns as one; screen zones (`NUI.zone`, `useClearOf`); notice
and target motion; `edge-sheet` first-frame fix; `nuikit.cfg` comments without semicolons. All good in game, Oct 22.

| Next | State |
|---|---|
| Slide the minimap itself with the HUD (per-frame component placement) | Spike |
| A HUD layout config on top of zones | Lane B (#104) |

## Lane B: HUD

*`systems/nuikit_hud`, the minimap part of `systems/nuikit/client.lua`.*

| Item | State |
|---|---|
| GPS route clip: pick the `routeClip` candidate that works, or `aspect = 1` | Needs the owner in game |
| HUD layout config: `Config.parts` places each part (corner + order, or on the map); `compact` and `classic` are presets of it; default unchanged | #104; not seen in game |

## Lane C: Platform + docs

*`packages/{core,cli,vite}`, `systems/nuikit` (rest), `scripts/`, `bench/`, `docs/`, `kit.css` + `index.css.tpl`.*

| Item | State |
|---|---|
| Roadmap rewritten to 0.8.0 | PR open |
| Image resolver, Lua side: `https://nuikit/images` (convars `nuikit_images_*`) and `https://nuikit/vehicle` | PR open |
| Coverage harness (`bench/coverage`): 90% Qbox, 75% QBCore/ESX, reported by `nuikit doctor` | In progress |
| `nuikit-standalone.zip` mapping; systems declare `nuikit_level`; Lua harness `stop()` runs the stopping resource's own handler | In progress |
| Visual baselines in CI, cheap set ([contract](design/contract.md)) | In progress |

## Lane D: Screens + overrides

*`systems/nuikit_{death,loading,chat}`, `addons/*` except `ox_inventory`.*

| Item | State |
|---|---|
| illenium-appearance clothing thumbnails and the qbx_vehiclesales car picture: consume lane C's resolver callbacks | Waiting on lane C |

## Lane E: Kit + site

*`registry/**`, `registry.json`, `packages/create-nuikit` (except kit.css/index.css.tpl), `apps/www`.*

| Item | State |
|---|---|
| Remove `key-hint`, `task-progress`, `nui-toaster` (moved to 0.9.0); move the site's demos to `key-prompt`, `meter`/`progress-ring`, `notice` first | Open |

## Lane F: Showcase

*`systems/nuikit_pause`, `systems/nuikit_stress`, `addons/ox_inventory`.*

| Item | State |
|---|---|
| ox_inventory item and weapon pictures through the resolver | Open |
| 3D map `perf/frame-send`: pins only when they move (`Config.map.pinsHz` caps them), panel text 5 Hz | PR #106; not seen in game |
| 3D map as GTA map replacement: blips named by sprite (or `nameBlip`), legend filters remembered, click a blip or double-click the ground for a waypoint, Find me follows the player (`Config.map.follow`, `followOnOpen`) | PR #114; not seen in game |
