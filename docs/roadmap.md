# Roadmap

*The one tracker. Anyone who finishes or starts an item edits it in the same commit. How we work:
[`next/dispatch.md`](next/dispatch.md). Direction: [`vision.md`](vision.md), [`architecture.md`](architecture.md).
Rules: [`design.md`](design.md). Design calls: [`next/decisions.md`](next/decisions.md).*

Last updated: Oct 28, 2026 (flat baseline, text styles, Hugeicons, the minimap's aspect).

## Released

| Version | What | In game |
|---|---|---|
| 0.4.0 | The full kit: HUD, pause, death, loading, chat, stress, 10 overrides | Yes |
| 0.5.0 | Tokens v1 + theme engine, protocol v1, `nuikit check` (level 3 in CI), `@nuikit/init.lua` + `nk` | Yes |
| 0.6.0 | 15 components, 7 screens rebuilt on them, 9 blocks + `npm create nuikit -t`, theme studio | Yes |
| 0.7.0 | Identities + tokens 1.2, motion, compact HUD, components v2, hardening, `nuikit doctor`, per-framework zips | Yes |
| 0.8.0 | Intents drawn in nuikit's frame, ox_lib routed to them, `[nuikit-qb]` / `[nuikit-esx]` / `[nuikit-standalone]`, `nk.camera` + `nk.controls`, image resolver, currency/locale ([notes](releases/v0.8.0.md)) | Qbox, per feature |
| **0.9.0** | The token language, the API spec (`nk.<domain>.<verb>`), layout, invariants, `nuikit install/upgrade/uninstall`, the curated registry, the `nuikit` CLI on npm ([notes](releases/v0.9.0.md)) | Qbox checkpoint |

Measured and settled: FiveM runs every NUI frame in one renderer process (confirmed from `NUIApp.cpp`; the host saves
a heap, not a process, and stays opt-in); mouse over a focused UI about 1.2 ms a frame, Lua to page about 0.3 ms, page to
Lua about 0.5 ms (hence live values, protocol §5.7).

## Where we are

Nobody runs nuikit but the owner. The design is premium and played; the Lua follows fivem-foundation; the docs are
one design doc and one token doc; CI is build, typecheck, tests and `nuikit check`. The next thing is not another
screen or another spec: it is a second server, and whatever that server breaks.

## Now

- **A second server.** One Qbox or QBCore server that is not the owner's installs nuikit from the zip and
  `install.md`, reports what the first ten minutes look like. Everything below reorders around what it finds.
- **The owner's in-game checkpoint** on this week's changes:
  - the flat baseline on every screen: keys, rows, the sliding selection, the HUD's glyphs, upright and wall-free;
  - Barlow Condensed upright for titles, labels, keys and numbers in Default and Neon Pop, Geist for sentences; the
    Keycap theme from the Settings picker (slanted faces, italic caps);
  - the text styles: no italic left anywhere outside Keycap, sizes and weights unchanged where they were right;
  - Hugeicons everywhere, including stock shadcn parts (chevrons, checks, close);
  - the minimap at GTA's aspect (`routeClip = 'mask'`): true to scale, how far the GPS route overhangs the ring;
  - ox_inventory's count badges and the item menu.
- **Verify in game** (carried from 0.9): qbx multichar on the ox_lib context menu, Confirm without its old dialog
  shell, the HUD editor on the sliding selection, the smooth caret visible enough by default.

## Next

- The override workflow outside the monorepo: `new-system.mjs` and the POST-log bench as a published starter, or an
  honest "fork the monorepo" page.
- The framework SDK verified by one custom adapter end to end; a fivem-foundation script's `notify` and `progress`
  hooks pointed at the intents (`adapters/framework-sdk.md`).
- `nk.log` in the systems' and adapters' remaining `print` calls; the §15 `GetPlayerName(src)` check in the template
  dispatcher (`next/foundation-gaps.md`).
- Release cadence: a release at every in-game-verified checkpoint.

## Later

- Chromium 144 on the release channel: relax the 103 rules, the compiler becomes opt-in compat (`vision.md`).
- World-anchored prompts through `nuikit_screen`'s DUI path (never seen in game: spike first).
- Vue / Svelte bindings; gamepad navigation; the phone layer once the host is worth it.
- The seller program built on `nuikit check`; a showcase of servers running nuikit.

## Known issues, owner-only

- GPS route may overhang the round minimap's sides at GTA's aspect (decision 56; `routeClip = 'box'` holds it in by squeezing the map); minimap blank after repeated live
  restarts until the pause map opens.
- Unproven: an empty `nuikit_cancel_key` leaves the cancel key unbound; `nuikit_screen` DUI never seen in game.
- Owner only: GitHub About, topics and social preview ([`next/presentation.md`](next/presentation.md)); Discussions.
- Twelve stale remote branches (`feat/*`, `lane-*/*`, `lead/*`, `next/*`, `test/*`, `local/*`, `claude/*`,
  `changeset-release/main`): all merged or superseded, 140 commits behind. Delete from a machine with push rights:
  `git fetch --prune && git branch -r | grep -v main | sed 's|origin/||' | xargs git push origin --delete`.
