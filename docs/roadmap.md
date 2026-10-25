# Roadmap and status

*The one tracker. The lead keeps it per batch; lanes don't edit it. How we work: [`next/dispatch.md`](next/dispatch.md).
Direction: [`vision.md`](vision.md), design: [`architecture.md`](architecture.md), rules: [`design/baseline.md`](design/baseline.md).
Design calls: [`next/decisions.md`](next/decisions.md). Where everything stood on Oct 23: [`next/handoff.md`](next/handoff.md).*

Last updated: Oct 23 2026 (the 0.9 plan).

## Released

| Version | What | In game |
|---|---|---|
| 0.4.0 | The full kit: HUD, pause, death, loading, chat, stress, 10 overrides | Yes |
| 0.5.0 | Tokens v1 + theme engine, protocol v1, `nuikit check` (level 3 in CI), `@nuikit/init.lua` + `nk` | Yes |
| 0.6.0 | 15 components, 7 screens rebuilt on them, 9 blocks + `npm create nuikit -t`, theme studio | Yes (7 of 8) |
| 0.7.0 | Identities + tokens 1.2, motion, compact HUD, components v2, hardening, `nuikit doctor`, `nuikit.cfg`, per-framework zips | [Results](releases/v0.7.0-results.md) |
| **0.8.0** | Intents drawn in nuikit's frame, ox_lib routed to them, `[nuikit-qb]` / `[nuikit-esx]` / `[nuikit-standalone]`, `nk.camera` + `nk.controls`, image resolver, currency/locale ([notes](releases/v0.8.0.md)) | Qbox, per feature |
| **0.9.0** | **The system** (token language, four themes, API spec + `nk.<domain>.<verb>`, layout, invariants), **the adoption surface** (`nuikit install/upgrade/uninstall`, update check, checksums, install.md, site, `/kit`), sliding selection everywhere, Stepper, Tabs, smooth caret, `[KEY]` keycaps, the curated registry, lean repo, `nuikit` CLI on npm ([notes](releases/v0.9.0.md)) | Qbox checkpoint ([results](releases/v0.9.0-test.md)); the rest per feature |

Measured and settled: FiveM shares one browser process across NUI frames (the host saves ~5 MB, stays opt-in);
mouse over focused UI ~1.2 ms/frame, Lua→page ~0.3 ms, page→Lua ~0.5 ms (hence live values, protocol §5.7).

## Where we are (Oct 23)

The flagship design is premium and the owner has played it. What hasn't been worked is **the outside of the product**:
how a stranger adopts it. 1 star, no users, no feedback loop but the owner's own server. The adoption audit of Oct 23 found
the first ten minutes broken or undocumented for every persona (details in each item below). The design side is in a good
place to stop adding screens and finish the foundations.

**0.9 is "adoptable":** no new screens. Four tracks (A foundations, B adoption surface, D the styling system as a platform, C rails), each with a definition of done a stranger could check.

## 0.9 · Track A: finish the foundations (keeps the premium bar)

*Owner-reported bugs and the one design philosophy still to carry everywhere. Lane: kit (registry/**) with the screen lanes
for migration. Done when: every list, tab set, segmented control, stepper and grid in every theme slides one selection;
the five bugs are fixed in the foundation and verified in game.*

| Item | Where | State |
|---|---|---|
| A1 Kbd legend centred on the skewed face (not the bounding box) | `registry/nuikit/ui/tile.tsx` | Done Oct 23 (`--nk-tile-legend-pad` / `-shift`); not seen in game |
| A2 Lists get inline padding = tile inset + skew overhang; resource titles normalised (leading emoji / pipe → icon slot) | `menu-row.tsx`, `selection-tile.tsx`, ox_lib context adapter | Done Oct 23 (`--nk-list-pad-x`, `splitTitle`); not seen in game |
| A3 Stepper = one segmented control at `--nk-h-control` (value + prev/next keycaps, roll on change, hold to repeat) | `stepper.tsx`; appearance on it | Done Oct 23; settings and input dialogs still to adopt; not seen in game |
| A4 TextRoll rolls per numeric token; static text and separators stay still | `text-roll.tsx` | Done Oct 23; not seen in game |
| A5 Action bar de-dups a key hint and a button for the same action | `action-bar.tsx`; appearance | Done Oct 23 (`dedupe`); not seen in game |
| A6 "Moves with you" everywhere, and the motion system wired into every opportunity (the owner, Oct 23): `useSelectionIndicator` on tabs, segmented controls, radial, inventory grid, scoreboard rows, pause map list; the host renderers (menu, target) slide; every focus change, open, close, value change and list reorder goes through the motion ladder, never an ad-hoc transition | registry + `systems/nuikit/web/src/renderers` + the screens | Done Oct 23 for host menu/target, radial, inventory grid, scoreboard, pause map; tabs/segmented still to find; not seen in game |
| A7 Verify in game: inventory item menu, qbx multichar on ox_lib context, Confirm without DialogShell | owner | Open |
| A8 HUD editor on the baseline and the sliding selection | `systems/nuikit_hud` | Open |
| A10 Smooth caret and smooth type are not obvious enough (the owner): make the caret glide and the typed text's entrance visible by default (stronger distance/duration on the ladder, a `--nk-caret-*` / `--nk-type-in-*` lever pair), in every text field | `smooth-input.tsx`, `form-field.tsx`, kit.css | Done Oct 23 (`--nk-caret-*`, `--nk-type-in-*`); not seen in game |
| A11 Curate the registry (the owner): fewer listed components, the premium ones demonstrated; foundations first, composites grouped by what they're for, weak or duplicate ones deprecated and hidden from the site; every component pre-wired with its variations (treatment, size, tone, motion), shortcuts and the hooks that make it live; blocks as finished screens that show the system, not demos | `registry.json` meta, `apps/www` components/blocks pages, `docs/design/components.md` | In progress (lane) |
| A9 Promote the screens' refinements into the registry (the owner, Oct 23): the registry speedometer, dial, chip, meter, fill and the HUD/pause blocks must be the premium versions tuned in game, not older drafts; the systems then import the registry component instead of a local copy | `registry/nuikit/{ui,blocks}`, `systems/nuikit_hud`, `systems/nuikit_pause` | Done Oct 23 (Speedometer, Dial, VitalChip keycap, hud-minimal, pause-menu); not seen in game |

## 0.9 · Track B: the adoption surface (the first ten minutes, per persona)

*Lane: platform (`packages/**`, `scripts/`, `install/`, `docs/`) and site (`apps/www`). Done when each persona's path below works
end to end on a machine that is not the owner's, without reading the monorepo.*

**B1 Server owner** · zip → `exec @nuikit/nuikit.cfg` → `nuikit doctor` says green → it looks premium.

| Item | State |
|---|---|
| Adapters at 0.8.0, doctor's pack table current, `nuikit_voice` ensured, no phantom `[nuikit-ox]` in the Qbox zip | Done (Oct 23) |
| `nuikit install` / `upgrade` / `uninstall` on the server console: backup, manifest, owner edits kept, doctor reports outdated/edited overrides | Done Oct 23; needs the in-game check (`GetResourcePath` + `fs` on Windows) |
| txAdmin recipe that actually runs (`install/recipe-qbox.yaml` is 0.7.0 and paste-your-own) or drop it from the zip until it does | Marked untested in the file; still open |
| `docs/install.md`: one page per framework (Qbox, QBCore, ESX, standalone) with start order, what gets stopped, the upgrade path; the zip README points at it | Done Oct 23 |
| Online update check in doctor, `SHA256SUMS.txt` on releases | Done Oct 23; the HTTP call not seen in game |
| QBCore and ESX coverage rounds in game (today Qbox only) | Needs a second server (owner or a community tester) |

**B2 Script developer** · `npm create nuikit` → `dev` → `npx shadcn add` a component → `nuikit check` level 3.

| Item | State |
|---|---|
| Site and registry live at nuikit.vercel.app (verified Oct 23); `/components`, `/blocks`, `/design`, `/coverage`, `/theme` | Live |
| Site: `/start`, `/protocol`, `/intents`, `/adopt`, `/language` | Done Oct 23 |
| Publish `packages/cli` so `npx nuikit check` works outside the monorepo (needs the npm name; `nuikit` is free as of Oct 23) | **Owner: claim the npm name**, then drop `private` |
| README counts current and the root `CHANGELOG.md` a pointer | Done Oct 23 |
| `create-nuikit -t renderer-pack` is an overlay template by design (`docs/intents.md` §9), not a block; needs an in-game run | Kept |

**B3 Resource seller** · "built on nuikit": read the tokens, join the protocol, pass `nuikit check`, fall back without nuikit.

| Item | State |
|---|---|
| `docs/adopt.md` + `/adopt`: make my existing resource nuikit-native | Done Oct 23 |
| The override workflow outside the monorepo: `new-system.mjs` and the POST-log bench as a published starter, or document the monorepo fork path honestly | Open |
| Framework SDK (`docs/adapters/framework-sdk.md`) verified by one custom adapter end to end | Open |

**B4 Theme designer** · a theme is one file: studio → download → `nuikit theme reload` → Figma matches.

| Item | State |
|---|---|
| Theme studio: treatment picker, lever groups, start from any theme, diff export, the four-language proof strip | Done Oct 23; not seen in a browser |
| Figma reference regenerated for tokens 1.7 / Default / Neon Pop (`docs/design/figma.md` is at 1.2 and four identities) | Open (Figma lane) |
| DTCG `$description` and the CLI help agree with `design/naming.md` on what "default" means | Open, small |

## 0.9 · Track D: the styling system is a platform (the owner, Oct 23)

*The API is robust for building UI logic; the styling system must be as robust for building a design language. Default is
opinionated (slanted keycaps, condensed italic caps) on purpose, and that must be one choice among many, not the shape of the
kit. Lane: kit + platform + site. Done when: three visibly different design languages ship as theme files that set values only
(no component rules, enforced), a server can start from any of them in the studio and have its own look in an hour, and the
lever catalog is the documentation.*

| Item | State |
|---|---|
| D1 Lever audit: `docs/design/levers.md` is the catalog; kit.css gaps are levers (`--nk-tile-lift`, `-press-ratio`, `--nk-leading-*`, row bar, hold ring, pips, meter segment gap, glow) | Done Oct 23; registry size literals in progress (lane) |
| D2 Treatments as the first-class axis: `--nk-treatment` presets (`soft`, `glass`, `plate`, `slab`, `tile` today) each a complete, coherent language, and the geometry levers (`--nk-skew`, walls, radii, type voices) free under every treatment | Open |
| D3 The flexibility proof: Default, Neon Pop, **Flat**, **Square** from values only, side by side on `/theme` | Done Oct 23; not seen in game |
| D4 Enforce "themes set values only": core test + `nuikit check` rule `theme/values-only` | Done Oct 23 |
| D5 Studio and CLI: studio done; `nuikit theme new --from <theme>` still open | Half |
| D6 `docs/design/your-language.md` + `/language` | Done Oct 23 |

## 0.9 · Track F: the system (the owner, Oct 23 evening: "the perfect system, from the foundations, no accommodation")

| Item | State |
|---|---|
| F1 The token language: `packages/core/src/spec/` is the one source — identity → semantic → component → part, declared anatomy, explicit inheritance; everything generated (kit.css declarations, `tokens.generated.ts`, DTCG, `docs/design/levers.md`, Figma input); rules enforced in tests; no aliases, no fallbacks; every registry component specced; deprecated aliases deleted | Done Oct 23; Default pixel-identical to the in-game build |
| F2 Themes: Default, Neon Pop, Flat, Square as value diffs on the premium baseline; the other seven deleted | Done Oct 23 |
| F3 The API spec: 17 typed domains mirrored JS ↔ Lua (`nuikit-core/<domain>`, `nk.<domain>.<verb>`, `nuikit:<domain>:<event>`), generated entry points, Lua API, event types, `arsenal.json`, `/kit`; every export claimed; every event implemented on both sides; `nuikit check` warns on undeclared paths; all systems migrated | Done Oct 23 |
| F4 The layout system: Screen, nine Zones, Region, Grid, the viewport table; HUD, pause, host frame on it; verified 1280×720 → 3440×1440 | Done Oct 23; the other screens adopt it next |
| F5 Invariants in CI: themes never change anatomy; one selection component; no page-drawn plates; every lever read; `pnpm look` + Read before any visual push | Done Oct 23, all at zero |
| F6 In game: the owner's checkpoint on all of the above (`docs/releases/v0.9.0-test.md`), then 0.9.0 | **Owner** |

## 0.9 · Track E: lean (the owner, Oct 23)

*"We just need the right stuff and show off the individual systems." No stored images, no mock renders of every page, no
one-off harnesses kept around. Lane: site + platform. Done when: the site is one thing per component (live preview + source),
the repo holds no screenshots, and a standing pass removes what nothing references.*

| Item | State |
|---|---|
| E1 No committed screenshots: 400 files / ~82 MB removed from `bench/`; `bench/.gitignore`; the visual job shoots and uploads, baselines are local only | Done Oct 23 |
| E2 The site: per component a live preview + the source + the install line, blocks the same, one-screen landing; galleries, `/blocks/shot`, public images gone (`public/` 1.9 MB → 60 KB) | Done Oct 23; not seen in a browser |
| E3 Lighten pass: one-off bench harnesses, unreferenced assets, 55 unimported synced components, 0.7.0 test files archived (2098 → 1979 tracked files) | Done Oct 23; rerun each release |
| E4 Keep it lean: `scripts/lean-check.sh` in CI fails on a committed image outside the allow-list (brand, banner, og, owner feedback shots) and prints the tracked size | Done Oct 23 |

## 0.9 · Track C: rails for rapid building (so lanes run with less lead attention)

*Lane: platform. Done when a lane can ship an item with the gate alone, and the lead can see at a glance what moved.*

| Item | State |
|---|---|
| `docs/README.md` index: every doc marked current / reference / historical; `docs/next` down to dispatch, decisions, handoff | Done (Oct 23) |
| Branch hygiene: 210 of 223 branches are fully merged; `node scripts/prune-branches.mjs --delete` removes them (a dry run lists them); the 12 with unique commits are triaged below | **Owner: run the prune** (cloud sessions can't delete refs); see "Unmerged work" |
| `nuikit check` ratchet: `pnpm check:burndown` compares every folder with `bench/check-baseline.json` and fails CI when one grows; the table is in the job summary. Baseline Oct 23: 589 warnings, of which nuikit_chat 212, nuikit_hud 209, nuikit_pause 54, ox_inventory 46, ox_lib 18, the rest ≤ 7 | Done (Oct 23); burn down chat, hud, pause (mostly `color/mix` in page CSS the plugin lowers anyway, and `type/raw`), `--update` after each |
| Visual baselines in CI: HUD, pause, `/components` × Default, Neon Pop, Graphite, Flat, Square at 1080p; diffs as the `visual` artifact | Done Oct 23, advisory until the baselines come from CI's browsers |
| Fixtures realistic by rule in 14 apps | Done Oct 23 |
| Release cadence: cut a release at every in-game-verified checkpoint (changesets + adapter and system bumps, `docs/releases/`); `0.9.0` when Track A lands | Open |
| Feedback loop beyond the owner: Discussions on, an issue template for "it looks wrong on my server" asking for theme, framework and a screenshot | **Owner: turn on Discussions**; template open |

## Landscape (Oct 23; ideas only, never code: licences differ)

| Repo | What | Verdict | Take |
|---|---|---|---|
| IEver3st/cortex-lib (3.4, "free use", no redistribution) | ox_lib-shaped `lib.*` with one hosted React bundle: notify, progress, menus, radial, zones, **world/entity/bone-anchored interaction prompts**, callouts, settings tabs, pause pages | **Competitor**, same slot; closed-ish | anchored prompts (below); per-resource interaction budgets; third-party settings tabs on `nk.settings`; `[KEY]` tokens in strings render as keycaps; release zip checksum |
| Avenida-Scripts/fivem-interact-script (no licence; Tebex) | DUI sprite prompts on peds/coords/entities, hold, choices, NPC dialogue + camera | A renderer concern, not an override (owns gameplay nuikit must not) | the same anchored-prompt surface |
| rian-be/FiveM.Nui (MIT, C#) | Typed C# ⇄ TS bridge: request/response envelope, error codes, deadlines, cancellation, diagnostics | Complement for C# shops | `fetchNui` error vocabulary (`TIMEOUT` / `TRANSPORT` / `UNKNOWN_CALLBACK`) + deadlines; per-resource diagnostics counters for doctor and the dev overlay |

Positioning: *cortex-lib is another library you port your scripts to; nuikit is the layer the scripts you already run land on.*

## Later (after 0.9)

- **World-anchored prompts** (`nk.prompt` with `anchor: { world | entity, bone?, offset?, maxDistance, markerDistance }`, drawn by `nuikit_screen`'s DUI path; hold via the existing progress; `target` stays screen-space; peds and dialogue stay out of scope). Two repos above show the demand. Effort M; the DUI path has never been seen in game, so it is the spike first.

- Chromium 144 on the release channel: relax the 103 rules, the compiler becomes opt-in compat (`vision.md` §2).
- Vue / Svelte bindings for the protocol; DUI surfaces (`nuikit_screen` is the spike); gamepad navigation.
- The seller program built on `nuikit check`; a showcase page of servers running nuikit.
- The phone layer (npwd apps as modules) once the host is worth it.

## Open, unproven, owner-only

- Known issues: GPS route outside the minimap ring (`Config.minimap.routeClip` candidates); minimap blank after repeated live restarts until the pause map opens.
- Unproven: an empty `nuikit_cancel_key` leaves the cancel key unbound (#119); `nuikit_screen` DUI never seen in game.
- Owner only: claim npm `nuikit`; GitHub About, topics and social preview ([`next/presentation.md`](next/presentation.md)); turn on Discussions; a second framework's server for B1.

## Unmerged work (branches with commits not on main, Oct 23)

Everything else was fully merged and deleted. Triage: keep until the item lands or is rejected, then delete.

| Branch | Ahead | What | Call |
|---|---|---|---|
| `feat/renderer-packs` | 5 | renderer discovery + `-t renderer-pack` (superseded by 0.8.0's renderer packs?) | Compare with main, then delete or port B2's "renderer-pack block" |
| `lane-kit/theme-studio` | 4 | variants (density/shape/motion) on panel, menu-row, meter…; themed subtree `data-nk-theme` | Port the themed subtree if B4 wants it; else delete |
| `lane-b/settings` | 2 | vitals slots after vitals; per-corner scale in the HUD editor | Port into A8 |
| `lane-b/hud-editor` | 1 | `/hud edit`, `/hud reset`, `/hud export` | Port into A8 |
| `claude/pause-nk-settings` | 2 | Settings on `nk.settings` (decision #20 landed another way), no backdrop-filter in game | Check the backdrop fix is on main; delete |
| `local/cfg-comments` | 1 | no semicolons in nuikit.cfg comments | Check main's cfg; delete |
| `feat/screens-menu-row-cleanup` | 1 | ox_lib/ox_target extras on menu-row (551e749, superseded by #112) | Delete |
| `next/blocks`, `next/design-v2`, `lead/design-v2`, `test/070-results` | 7/2/2/1 | old integration branches and a docs commit | Delete |
| `changeset-release/main` | 1 | the changesets bot | Leave |
