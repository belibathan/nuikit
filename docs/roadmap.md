# Roadmap and status

*The one place progress is tracked. Every session and agent updates its lane's rows when it opens or merges a
PR. Design: [`architecture.md`](architecture.md). Kit brief: [`next/blocks.md`](next/blocks.md). Lanes and
rules for parallel agents: [`next/dispatch.md`](next/dispatch.md).*

Last updated: Oct 19 2026, after the 0.5.0 release.

## Released

| Version | What | Tested in game |
|---|---|---|
| 0.4.0 | The full kit: HUD, pause, death, loading, chat, stress, 10 overrides | Yes |
| **0.5.0** | Tokens v1 + theme engine (live reload, contrast checks, player prefs); protocol v1 (versioned handshake, one Escape path, live values §5.7); `nuikit check` (every screen level 3, CI-enforced); Lua runtime imported like ox_lib (`@nuikit/init.lua`, `nk`); showcase pause (focus camera, 3D map), inventory and minimap; components `panel` `menu-row` `stat` `meter` `hud-chip`; site `/components` `/design` `/coverage`; host prototype (opt-in) | Yes (next-7679bf9, next-4447310 + fix ea7ac52) |

Known issue in 0.5.0: after repeated live restarts of `nuikit`/`nuikit_hud`, the minimap can render blank until
GTA's pause map is opened and closed (not seen on a fresh join).

## Decisions settled by measurement

- FiveM shares **one** browser process across all NUI frames (333 vs 338 MB, host on/off): the host saves ~5 MB,
  so it stays an opt-in convenience; its module loader carries renderers.
- Per-frame costs in FiveM (measured): mouse over focused UI ~1.2 ms, a Lua→page message ~0.3 ms, a page→Lua
  callback ~0.5 ms per frame they land in. Hence live values (protocol §5.7) and capped drags.
- FiveM starts a dependency (`nuikit`) automatically when a dependent starts.

## In progress and next

### Platform (lead) — 0.6, [`architecture.md`](architecture.md)

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
| Components | The 9 remaining components + `progress-ring` + `skill-check`, redesigned as the default renderers for the intents | Ready to dispatch |
| Screens | death, loading, chat and the overrides (ox_lib first) rebuilt on the components, protocol-exact | In progress. PR #9: ox_lib menus on `panel` + `menu-row`, progress on `meter`. PR 2: death and loading bars on `meter`, loading's percentage and links on `stat`. Chat stays as is (a theme for the stock chat resource, not React). Next: the rest of ox_lib as `notice`, `field`, `confirm`, `key-prompt`, `progress-ring` land |
| Blocks + site | The 14 blocks, `npm create nuikit -t <block>`, `/blocks`, theme switcher, theme studio | Ready to dispatch (starts with blocks the 5 shipped components cover) |
| Showcase | pause, HUD, inventory: minimap restart quirk, FPS budget | Owner's existing agent |

### Open items for the owner

- Claim the npm name `nuikit` (one manual publish), then remove `"private": true` from `packages/cli/package.json`.
- GitHub About description and social preview (`docs/assets/social-preview.png`); launch posts.
- Decide: `info` follows `primary` (grey in the stock theme) or a fixed blue?
- Verify the kit on Chromium 144 (FiveM canary).
