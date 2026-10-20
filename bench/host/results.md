# Host benchmark: N UIs as iframes vs one host frame

*Oct 19, 2026. Desktop Chromium 141 (Playwright), 2 CPUs, 1920×1080, 2 runs per cell (medians). Raw data:
`results.json`. Not FiveM: see [what this can't tell us](#what-this-cant-tell-us).*

## Setup

A simulated server with N UIs drawn from the real kit, built from this repo: `nuikit_hud`, the taxi meter
(`qbx_taxijob`), `nuikit_death`, `ox_lib`, `nuikit_pause`, `ox_inventory`, `ox_target`, `qbx_idcard`,
`qbx_scoreboard`, `Renewed-Banking`, `illenium-appearance`, `mm_radio` (repeated with suffixes past 12).
`lib/nui.mjs` fakes FiveM's NUI: a root page with one iframe per resource on `https://cfx-nui-<resource>/`,
`SendNUIMessage` as `postMessage`, NUI callbacks as routed `fetch`es answered by a simulated Lua.

Per run, in a fresh browser: load all UIs, send each its initial state, then 5 s of steady state where three
UIs update at 10 Hz (HUD vehicle, taxi meter, death timer) and ox_lib's progress bar animates. Then memory
(PSS summed over every Chromium process), JS heap after GC, DOM nodes, main-thread time from a trace, and
five "open the pause menu" timings (message → first frame with it painted).

| Config | What it models |
|---|---|
| `iframes` | Today: one iframe per resource, Chromium's site isolation on (each `cfx-nui-*` origin its own renderer process) |
| `iframes-1p` | Today, if every NUI frame shares one renderer process |
| `host+boot` | The host renders every UI as a module, but each resource keeps its `ui_page` (an empty boot page), site isolation on |
| `host+boot-1p` | The same, one renderer process |
| `host` | The host renders every UI and resources have no `ui_page` of their own |
| `host-scoped` | `host` with prefixed CSS instead of shadow roots |

## Results

| N | Config | Memory (MB) | Renderers | JS heap (MB) | DOM nodes | Main thread (ms/s) | Load (ms) |
|---|---|---|---|---|---|---|---|
| 1 | iframes | 340 | 3 | 3.1 | 88 | 65 | 98 |
| 1 | host | 340 | 3 | 3.2 | 90 | 67 | 196 |
| 5 | iframes | 498 | 7 | 14.0 | 173 | 272 | 630 |
| 5 | iframes-1p | 403 | 1 | 12.0 | 173 | 126 | 428 |
| 5 | host+boot | 485 | 8 | 11.5 | 193 | 152 | 684 |
| 5 | host | 403 | 3 | 8.2 | 153 | 139 | 454 |
| 10 | iframes | 591 | 12 | 24.3 | 234 | 266 | 1112 |
| 10 | iframes-1p | 437 | 1 | 18.3 | 234 | 135 | 744 |
| 10 | host+boot | 576 | 13 | 17.0 | 264 | 145 | 1279 |
| 10 | host+boot-1p | 452 | 1 | 13.7 | 264 | 128 | 896 |
| 10 | host | 424 | 3 | 10.3 | 184 | 138 | 732 |
| 20 | iframes | **813** | 22 | **45.3** | 355 | **311** | **2257** |
| 20 | iframes-1p | 485 | 1 | 31.6 | 355 | 151 | 1472 |
| 20 | host+boot | 751 | 23 | 28.6 | 407 | 152 | 2466 |
| 20 | host+boot-1p | 458 | 1 | 22.2 | 407 | 152 | 1614 |
| 20 | host | **459** | 3 | **15.3** | 247 | **153** | **1206** |
| 20 | host-scoped | 456 | 3 | 15.2 | 227 | 153 | 1122 |

The host stays at 3 renderer processes at every N: the same baseline as a single iframe.

- **Memory and CPU follow processes, not frames.** With site isolation, 20 iframes cost 813 MB and 311 ms of
  main-thread work per second; the host does the same work in 459 MB (−44%) and 153 ms/s (−51%), and loads in
  half the time. In one renderer process, today's iframes already cost about what the host does: 485 vs 459 MB
  (−5%), equal main-thread time.
- **JS heap halves either way** (31.6 → 15.3 MB at N=20 in one process, 45.3 → 15.3 with isolation): one React,
  one copy of the shared runtime.
- **Keeping a `ui_page` per resource throws the memory gain away** under site isolation (`host+boot`: 751 MB):
  the empty boot page still costs a renderer process each. The CPU gain stays (152 ms/s), because idle pages
  don't run.
- **Open latency** (message → painted) is 20–90 ms in every config with no consistent winner: it's bound by
  frames and the machine, not by the architecture. Message round-trip latency is the same too (4.6 vs 4.9 ms
  median unthrottled; 16.7 vs 16.7 ms when Lua answers on the next 60 Hz tick).
- **Shadow roots cost nothing** measurable over prefixed CSS (459 vs 456 MB, same CPU), so the host keeps the
  stronger isolation.

## What this can't tell us

1. **FiveM's process model.** Whether FiveM's CEF runs each `cfx-nui-*` frame in its own renderer process
   (like desktop Chromium) or all of them in one decides whether the host saves ~44% of memory or ~5%. That is
   the one number to get in game: with N UI resources running, count FiveM's CEF renderer processes in Task
   Manager (`FiveM_ChromeBrowser` / `FiveM_GTAProcess` children), with `setr nuikit_host 1` and `0`.
2. **Game FPS.** The benchmark measures the browser, not GTA's frame time, and runs on a 2-CPU VM. NUI
   rendering competes with the game for the CPU and GPU; fewer processes and half the main-thread work should
   help most on weak CPUs, but only a real client can say how much.
3. **Chromium 103.** Run on Chromium 141. The 103 and 144 CEF builds may differ in process model and memory.
4. **Real Lua.** Lua is simulated (instant or next-tick answers). Lua's own cost is the same in both models.

## Run it

```bash
pnpm build:systems
node bench/host/build.mjs                        # host modules for every app in lib/apps.mjs
node bench/host/run.mjs --n=1,5,10,20 --runs=2 --latency
node bench/host/e2e.mjs                          # correctness: real Lua + real host + real HUD module
```
