# Motion system: browser proof and the in-game checklist

Design v2 §5A, spec `docs/design/research/motion.md` (on `main`). Oct 20, 2026, branch `feat/motion` against
`lead/next` (db6aca4). Everything below is measured in **headless Chromium 141** (`/opt/pw-browsers/chromium`,
software compositing), not FiveM's CEF (Chromium 103). The in-game checks at the end decide whether it holds.

Scripts (run after `pnpm build:systems`, or point them at another build of the ox_lib override):

```bash
node bench/motion/timings.mjs <label> [build]        # ox_lib request timings  → .out/timings-<label>.json
node bench/motion/timings.mjs --compare before after # the table below; fails outside ±15 ms
node bench/motion/perf.mjs <label> [build]           # Chrome traces           → .out/perf-<label>.json
node bench/motion/shots.mjs <label> [build]          # ring, bar, skill check mid-run at 3 resolutions
```

The page is the real ox_lib override build served as `https://cfx-nui-ox_lib/` with `GetParentResourceName()`,
every NUI POST answered locally and logged with `performance.now()`. `Math.random` is fixed so skill-check zones
are identical between builds.

## 1. ox_lib requests: identical, within ±15 ms

Median of 5 runs, measured from the message (or the key press) that causes the request. "before" is `lead/next`
(rAF skill check, 100 ms-step ring and bar), "after" is this branch.

| Case | Request | before (ms) | after (ms) | Δ (ms) |
|---|---|---|---|---|
| progress 1000 ms | progressComplete() | 1112.3 | 1111.9 | -0.4 |
| progress cancelled at 400 ms | progressComplete() | 101.8 | 101.5 | -0.3 |
| circle 1000 ms | progressComplete() | 1111.4 | 1113.0 | +1.6 |
| skill easy, no press (miss at a full turn) | skillCheckOver(false) | 2008.4 | 2000.7 | -7.7 |
| skill easy, press in the zone (1330 ms) | skillCheckOver(true) | 0.4 | 0.5 | +0.1 |
| skill easy, press early (600 ms) | skillCheckOver(false) | 0.3 | 0.6 | +0.3 |
| skill medium ×2, both in the zone | skillCheckOver(true) | 0.2 | 0.2 | +0.0 |

Every request and body is the same. The miss now comes from a timer at exactly one turn instead of the first
animation frame after it, so it's 8 ms earlier and steadier (2000.6–2003.8 vs 2004.7–2015.4). The hit test reads
the needle animation's `currentTime`, the angle on screen.

## 2. Frames and main thread (2560×1440)

`frames` = DrawFrame events. `main` = renderer main-thread task time in the window. "per frame" = main-thread time
charged to each frame (median / p90). Before → after. One run each, so expect ±1 ms noise on the busy scenarios.

| Scenario | frames | main (ms) | per frame (ms) | rAF | style/layout/paint | running animations after |
|---|---|---|---|---|---|---|
| idle (nothing open, 2 s) | 0 → 0 | 1.1 → 1.4 | 0 → 0 | 0 → 0 | 0/0/0 → 0/0/0 | |
| menu open (8 rows, 0.6 s) | 9 → 9 | 105 → 75 | 1.05 / 82 → 0.49 / 70 | 0 → 0 | 7/2/3 → 7/2/3 | |
| menu open, then idle (1.5 s) | 0 → 0 | 1.5 → 1.5 | 0 → 0 | 0 → 0 | 0 → 0 | 0 |
| menu, arrow keys ×5 | **42 → 5** | **85 → 44** | 1.21 / 5.6 → 8.7 / 11.3 | 0 → 0 | 46/2/141 → 5/5/10 | |
| notice stack (4 in 240 ms) | 51 → 52 | 60 → 69 | 0.02 / 1.1 → 0.02 / 2.3 | 0 → 0 | 22/6/16 → 22/5/14 | |
| notices gone, then idle | 0 → 0 | 2.0 → 1.4 | 0 → 0 | 0 → 0 | 0 → 0 | 0 |
| meter (progress bar, mid-run, 1.5 s) | 91 → 89 | **61 → 1.8** | 0.52 / 1.51 → **0.01 / 0.02** | 0 → 0 | 76/0/0 → 0/0/0 | |
| progress ring (mid-run, 1.5 s) | 91 → 91 | **117 → 51** | 1.19 / 2.41 → **0.04 / 1.31** | 0 → 0 | 91/38/182 → 38/38/76 | |
| skill check (mid-sweep, 1.2 s) | 73 → 72 | **125 → 1.6** | 1.18 / 3.22 → **0.01 / 0.02** | **73 → 0** | 73/73/0 → 0/0/0 | |
| after everything, idle | 0 → 0 | 1.3 → 1.3 | 0 → 0 | 0 → 0 | 0 → 0 | 0 |

What it shows:
- **Zero frames when idle**, before and after every scenario, and `document.getAnimations()` has nothing running
  once things settle (springs commit and cancel; timed runs are cancelled or unmounted at the end).
- **Animating costs ≤ 1.5 ms of main thread per frame** in every animation (median and p90): the bar and the
  skill check are now pure compositor (0.01 ms/frame, no style, layout or paint). The ring's remaining cost is
  ox_lib's own `%` counter (+1 every duration/100 ms, protocol §9.1), now written to its text node instead of a
  React render per tick; its frames without a tick cost 0.04 ms.
- **Menu navigation is instant**: 5 frames for 5 key presses instead of 42 (row transitions were gliding). The
  per-frame number went up only because the same work now lands in one frame. That work (8–11 ms per press in
  this headless, software-rendered run) is React re-rendering ox_lib's list menu and its description tooltip, not
  motion. Worth a look by the Screens lane; it isn't in this PR's scope.
- **Opens are a one-off cost**: the menu's first frame is React mounting the panel (70 ms here, FontAwesome icons
  included); the frames after it are under 2 ms. Notices are the same: the mounts cost, then their timer bars
  (one WAAPI `scaleX` each, already) run at 0.02 ms/frame.

Screenshots: `node bench/motion/shots.mjs` (ring at 60%, bar at 60%, needle at ~108°) look the same as `lead/next`
at 1920×1080, 2560×1440 and 1280×720. The timed ring now has square ends (two rotating half-rings).

## 3. Unit-level proof

- `packages/core/test/motion-tokens.test.ts`: the ladder from `--nk-duration`, the ceilings, the four identities'
  springs and staggers, input validation and warnings, reduced (≤ 100 ms, no movement) vs off (0 ms), what
  `applyTheme` paints.
- `packages/core/test/motion.test.ts`: springs settle when motion.md says (snap ~195 ms) with no overshoot at
  bounce 0; the analytic velocity; retargeting starts from the drawn value and keeps velocity without
  `getComputedStyle`; jump when off, fade-only when reduced; FLIP from the drawn position, interrupted FLIP; timed
  runs join an outside clock; stagger cap; the indicator's key-repeat rule.
- `registry/nuikit/test/{meter,progress-ring,skill-check}.test.ts`: segment and half-ring keyframes add up to the
  true value at every point and close exactly at the end; transform only.

## 4. Unproven: check in game (motion.md §5)

Nothing above ran in FiveM. On a Qbox test server with the prerelease, in this order:

1. **Idle frames.** With only the HUD up, `profiler record` / the FiveM profiler: is game frame time the same with
   the ox_lib page loaded and idle as without it? (Decides how strict "no idle animation" must be.)
2. **Compositor under load.** Open a menu while a 50 ms task runs in the page (devtools console:
   `const t=performance.now(); while(performance.now()-t<50);` right after `setMenu`): does the fade stay smooth?
3. **WAAPI rate.** Does the skill-check needle and the progress ring look smooth at 144 fps, or stepped (CEF's OSR
   frame rate)? Same for the meter.
4. **Springs vs curves.** Not wired into a screen yet (`spring()` / `useIndicator` are available, unused by the
   kit's screens). When the menu-row indicator lands, compare `--nk-spring-snap` against `--nk-ease-in-out` at
   144 fps; if nobody can tell, springs wait for Chromium 144.
5. **Key-repeat.** Hold the d-pad on a 20-row ox_lib menu: the highlight must keep up (it's instant now).
6. **Reduced motion.** `/nuikit motion off` (the pref): every UI, handshake-off overrides included, gets
   `data-nk-motion="reduced"`; panels still fade (≤ 100 ms), nothing slides or zooms; progress still fills.
   Does CEF report the OS `prefers-reduced-motion`?
7. **Text during motion.** Notices and dialog content crisp at 1280×720 and 2560×1440 while fading.
8. **Meter blink.** A vital crossing its threshold blinks twice, then stays steady; readable over a bright scene.
9. **Sonner/notices at 144 fps** with 4 stacked: no thrash; honours the levels.
10. **Skill check and progress ring cost** in game vs 0.6.x: resmon unchanged (motion is page-side), game frame
    time during a skill check equal to idle. Every ox_lib skill check and progress still passes or fails as
    before (`lib.skillCheck({'easy','medium'})`, `lib.progressBar`, `lib.progressCircle`, cancel).
11. **Identity feel.** Graphite, Signal, Velvet, Vector with `nuikit theme reload`: snappy vs smooth as intended;
    Velvet's 240 ms still feels fast.
12. **Layers and memory** with the HUD, a menu and notices open (the `docs/host.md` method).

What would change the plan: if (1) shows idle frames are free, "no infinite animation" relaxes to opt-in; if (2)
janks, the kit goes CSS-only and drops JS springs; if (3) shows WAAPI capped at 30–60, the needle and ring need
checking for steps; if (4) shows no visible difference, springs wait for Chromium 144.
