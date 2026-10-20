# Roadmap and status

*The one place progress is tracked. Every session and agent updates its lane's rows when it opens or merges a
PR. Design: [`architecture.md`](architecture.md). Kit brief: [`next/blocks.md`](next/blocks.md). Lanes and
rules for parallel agents: [`next/dispatch.md`](next/dispatch.md).*

Last updated: Oct 20 2026, after the 0.6.0 release (batch 1).

## Released

| Version | What | Tested in game |
|---|---|---|
| 0.4.0 | The full kit: HUD, pause, death, loading, chat, stress, 10 overrides | Yes |
| **0.5.0** | Tokens v1 + theme engine (live reload, contrast checks, player prefs); protocol v1 (versioned handshake, one Escape path, live values §5.7); `nuikit check` (every screen level 3, CI-enforced); Lua runtime imported like ox_lib (`@nuikit/init.lua`, `nk`); showcase pause (focus camera, 3D map), inventory and minimap; components `panel` `menu-row` `stat` `meter` `hud-chip`; site `/components` `/design` `/coverage`; host prototype (opt-in) | Yes (next-7679bf9, next-4447310 + fix ea7ac52) |
| **0.6.0** | Batch 1: 15 components (Part B complete), 7 screens rebuilt on them (ox_lib menus + progress, ox_target, Renewed-Banking, illenium-appearance, qbx_taxijob, qbx_vehiclesales, death + loading), 9 blocks with `npm create nuikit -t`, `/blocks`, theme studio `/theme`; fixes the 0.5.0 reduced-motion progress bug | Yes (next-9d1784f: 7 of 8; respawn issue predates it) |

Known issues in 0.6.0:
- Death screen with qbx_medical + qbx_ambulancejob: hold-to-respawn bar moves in 1 s steps (draw it from the
  key-hold time instead), and the dead screen stays up during the ~20 s hospital-bed treatment (needs a bed signal:
  `qbx_ambulancejob:client:checkedIn` / `putPlayerInBed` or the bed animation). Screens lane, first in batch 2.
- After repeated live restarts of `nuikit`/`nuikit_hud`, the minimap can render blank until GTA's pause map is
  opened and closed (not seen on a fresh join). Showcase lane.
- `nuikit_loading` ships `externalShutdown = false`; Qbox multicharacter needs `true`. Detect it (Screens lane).

## Decisions settled by measurement

- FiveM shares **one** browser process across all NUI frames (333 vs 338 MB, host on/off): the host saves ~5 MB,
  so it stays an opt-in convenience; its module loader carries renderers.
- Per-frame costs in FiveM (measured): mouse over focused UI ~1.2 ms, a Lua→page message ~0.3 ms, a page→Lua
  callback ~0.5 ms per frame they land in. Hence live values (protocol §5.7) and capped drags.
- FiveM starts a dependency (`nuikit`) automatically when a dependent starts.

## In progress and next

### Platform (lead) — 0.7 universal, [`architecture.md`](architecture.md)

| # | Step | Status |
|---|---|---|
| 1 | `@nuikit/init.lua` + `nk` (import like ox_lib) | **Done** (0.5.0) |
| 2 | Intent schemas from one source; default renderers in nuikit's frame | Next |
| 3 | Services: camera (seed: `nuikit_pause/client/camera.lua`), controls | Planned |
| 4 | In-game spike: adapter mechanisms (stand-in, listener, ox_lib page routing) | Planned |
| 5 | `[nuikit-ox]` adapter | Planned |
| 6 | `[nuikit-qb]` adapters | Planned |
| 7 | `[nuikit-esx]` adapters | Planned |
| 8 | `nuikit doctor` + coverage harness (90%+ Qbox, 75%+ QBCore/ESX) | Planned |
| 9 | Per-framework zips, `nuikit.cfg`, txAdmin recipe, renderer packs | Planned |

### Kit (parallel agents) — lanes in [`next/dispatch.md`](next/dispatch.md)

| Lane | Scope | Status |
|---|---|---|
| Components | The 9 remaining components + `progress-ring` + `skill-check`, redesigned as the default renderers for the intents | **Done** (released in 0.6.0, #8–#40). Follow-ups in review: `form-field` check ignores (#45), `DateRangeField` + `TimeField` for ox_lib's `date-range` and `time` rows (#47); `countdown` line-height at every size (#62); `menu-row` progress and per-item metadata colours for ox_lib context menus (#64); `meter` / `progress-ring` timed runs land on the true value for ox_lib progress (#69); `countdown` `lineTone` for nuikit_death's last stand (#70) |
| Screens | death, loading, chat and the overrides (ox_lib first) rebuilt on the components, protocol-exact | Released in 0.6.0: ox_lib menus + progress, death + loading, ox_target, Renewed-Banking, illenium-appearance, qbx_taxijob, qbx_vehiclesales. **Batch 2 first (0.6.1):** death (smooth E bar, hidden during the qbx hospital-bed treatment; in review) + loading `externalShutdown` detection (auto on Qbox's own character menu; in review); then ox_lib notify (#42), input, alert, text UI, circle, skill check; qbx_scoreboard, qbx_idcard, mm_radio |
| Blocks + site | The 14 blocks, `npm create nuikit -t <block>`, `/blocks`, theme switcher, theme studio | Released in 0.6.0: 9 blocks (`hud-minimal`, `death-screen`, `pause-menu`, `loading-screen`, `settings`, `scoreboard`, `garage`, `bank`, `job-menu`), `/blocks`, `/theme`. In PRs: `interaction` (#43), `shop` (#48), `inventory` (#51), `vehicle-shop` (#52), `character-select` (#55). Next: existing blocks on the new components |
| Design | Design v2 ([`design/v2.md`](design/v2.md)): identity tokens (type, shape, surface, density, motion, HUD) over three tiers, four premium identities, flagship HUD + vehicle + map rebuilt for function and look | Research done; Figma system started; brief decided Oct 20. **Step 1 identity layer: PR open** (`feat/identity`): tokens 1.1 in `compileTheme` (identity + derived, floors, DTCG/schema), component tokens in `kit.css`, Graphite / Signal / Velvet / Vector, bundled OFL fonts, spike + screenshots in `bench/identity/`. Round 2 (owner: utilitarian baseline, v2 §4): Graphite is compact and minimal (density 0.875, flat, uppercase captions, thin meters, tighter radii; 16px text kept); slab tokens + `nk-slab*` utilities (item, prompt, progress, band); `nk-display` / `nk-caption` documented for lanes; flexibility check (`daylight.css`, test + contact sheet); `pnpm sync` prunes files it no longer writes (`scripts/sync-manifest.json`); text on the game (`--world-foreground`, `-muted`, `--world-shadow`, `nk-on-game`, `"surface": "world"`; death and HUD opted in). Needs the in-game check in `bench/identity/results.md` (fonts across resources, frame cost). **Step 2 flagship HUD: PR #65** (`feat/hud-v2`). Round 1 in game (next-209e83c): 11/13 pass, resmon 0.02 ms on foot. Round 2 (owner: minimal, neat, compact; v2 §4): `Config.layout = 'compact'` (default) / `'classic'` over the same parts; round radar top right with the compass on its ring (turning cardinals, heading above, waypoint tag with an arrow), zone/street/cross under it; compact cluster (segmented ticks, gear centre, dimmed leading zeros, fuel arc, telltale column); vitals pills + status dots; ammo `12 / 48`; `Config.minimap.style = 'ring' / 'stock'` with auto-yield to minimap resources; round-1 fixes (radar width in 16:9 units, stock restore, handbrake, qbx_cruise, no layout jumps). Sheets per identity in `bench/hud/shots/`. Minimap paint spike: findings + test in `bench/minimap/results.md` (runtime DUI tint is the candidate; unproven). **Needs:** round-2 in-game test (checklist in PR #65), driving resmon, the minimap spike test |
| Motion (lead) | Design v2 §5A: motion tokens (tokens 1.2), `nuikit-core/motion`, two-level reduced motion, kit base hardening, compositor-only `meter` / `progress-ring` / `skill-check` | **PR open** (`feat/motion`). Browser proof in `bench/motion/results.md`: 0 frames idle, ≤ 1.5 ms main thread per animated frame, ox_lib requests identical within ±15 ms. **Needs:** the in-game checklist there (§4); `menu-row` adopting `nk-indicator` (Components lane) |
| Showcase | pause, inventory: FPS budget (HUD moved to the Design flagship) | Owner's existing agent |

### Lead backlog (requests from the lanes)

- `compileTheme`: warn on an empty token value.
- Runtime context: server currency and locale (part of 0.7 context; `money` and blocks read it).
- `cn()` / tailwind-merge: teach it the `nk-*` utilities so `nk-title` and `text-sm` resolve correctly (the #33 bug class).

### Open items for the owner

- Claim the npm name `nuikit` (one manual publish), then remove `"private": true` from `packages/cli/package.json`.
- GitHub About description and social preview (`docs/assets/social-preview.png`); launch posts.
- Decide: `info` follows `primary` (grey in the stock theme) or a fixed blue?
- Verify the kit on Chromium 144 (FiveM canary).
