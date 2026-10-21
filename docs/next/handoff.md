# Handoff to the lead agent (Oct 21, 2026)

*From the session that fixed the 0.7.0 checkpoint test. Read `CLAUDE.md`, then this, then `docs/roadmap.md` and
`docs/next/dispatch.md`. The owner is away from the test server for a while: background work only, no in-game asks yet.*

## Where things stand

- **Release:** 0.6.0 is the latest on npm and GitHub. 0.7.0 is a frozen checkpoint (bugs only) on `lead/next`;
  `next/combined` mirrors it as the prerelease.
- **Checkpoint test (next-2c22598, Oct 21):** Must #1–8 pass; #9 and #12 partial; #10 and #11 fail; two new bugs (F5
  camera spin, F6 overlap). Full results: `docs/releases/v0.7.0-test.md#results-next-2c22598`.
- **Fixes:** [#77](https://github.com/belibathan/nuikit/pull/77) (`claude/nuikit-0-7-0-test-report-ncbaqu` → `lead/next`)
  fixes every finding. Browser and CI gates pass; **none of it is tested in game.** Prerelease for the retest:
  `next-a048751` (branch `next/retest-070`). The roadmap's checkpoint section has one row per finding.
- **Least certain fixes** (they rest on how GTA behaves, not on a measurement): 7b GPS route (`minimap_mask` in absolute
  units), note A aspect (GTA draws one view into any box), F2 (txd name reuse after a restart). Escape hatch for A:
  `Config.minimap.aspect = 1`. If the retest fails these, spike them first (`bench/minimap/spike` has a harness, and
  `Config.debug` enables the `nuikit_hud:minimap:tune` event).

## Do next, in order

1. **Merge #77 into `lead/next`** and fast-forward `next/combined` to it, so the prerelease the owner tests is the
   integration branch. Delete `next/retest-070` afterwards.
2. **Retest** when the owner is back: the 11 steps under "Retest" in `docs/releases/v0.7.0-test.md`. Give them that
   list as is: short and in plain words (the owner said the last summary was hard to follow).
3. **Release 0.7.0** once the retest passes, following `CLAUDE.md` → Releasing: merge `lead/next` → `main`, run
   `pnpm changeset version` on `main`, bump every `systems/*/fxmanifest.lua` (still `0.6.0`), write
   `docs/releases/v0.7.0.md`, update the "Current release" line in `CLAUDE.md`, commit "chore: release 0.7.0", push.
4. **Clean up PRs.** Every PR from #42 to #71 is still open against `main`, but the roadmap lists them as merged into
   `lead/next` (#61 superseded by #73). After step 3, check each one: GitHub usually marks a PR merged once its head
   commits are on `main`. Close any that aren't, with a one-line comment naming the PR that carried them. #65
   (HUD v2) and #67 (identities) are non-draft and also in `lead/next`.
5. **Clean up branches** that are merged or superseded: the `feat/*` lane branches, `lead/batch1`, `lead/batch2`,
   `lead/design-v2`, `lead/patch-0.6.1`, and the older `next/*` prerelease branches (`batch1`, `blocks`, `design-v2`,
   `full-kit`, `hud-v2`, `ox-lib-ui`, `patch-0.6.1`, `platform`, `qbox-hud`, `runtime`, `showcase`, `surfaces`). Check
   that each has no unmerged commits (`git log main..<branch>`) before deleting it.

## Work to delegate (after the checkpoint)

Background work that needs no in-game test to start. Lanes and file ownership: `docs/next/dispatch.md`.

- **Platform (lead):** roadmap steps 2–9 in `docs/architecture.md`. Step 4 (adapter mechanisms spike) is the gate for
  5–7 and needs an in-game run, so prepare the spike resource and its checklist now.
- **Lead backlog:** `compileTheme` warns on an empty token; runtime currency and locale; `cn()` merges `nk-*`.
- **Screens:** ox_lib intents route to the shared renderers (`docs/architecture.md` §2); qbx_scoreboard, qbx_idcard and
  mm_radio on the new components.
- **Blocks + site:** the remaining blocks; `/blocks` and `/theme` on tokens 1.2.
- **Tests:** the 0.7.0 test skipped #14 (compact density), #16 (readable over sky and snow), #17 (plane and boat), #18
  (a `create nuikit` block on the server) and spikes S1–S6. Put them on the next in-game checklist.
- **Known gaps found in this session:** `loadServerTheme` reads `nuikit/theme.css` as a stand-in, but the client's copy
  only refreshes when `nuikit` restarts; worth a line in `docs/tokens.md`. The test harness's `stop()` drops the
  stopping resource's handlers before firing `onClientResourceStop`, so it never runs a resource's own stop handler
  (see the F3 test in `packages/core/test/lua/theme.test.ts` for a workaround). Fixing the harness is a small task.

## Open decisions for the owner

- **Note B:** should nuikit draw weapon glyphs, or reuse the inventory's item image (ox_inventory's images)?
- In the default identity the HUD vitals dots are now rounded squares (they follow the chip radius, like the pills).
  Keep them, or keep the dots round?
- From the roadmap: `info` follows `primary` or a fixed blue; claim the npm name `nuikit`; check the kit on Chromium 144.

## Owner's server (as left by the test)

`Config.debug = true` in `nuikit_hud/config.lua` (keep it on for the retest). A throwaway `nk_oxlib` resource is running
until the next restart. `mmspike` (S1) is staged but has never been started. Pre-test backup:
`C:\FXServer\backups\before-next-2c22598`.
