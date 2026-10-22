# Showcase page cost (headless)

Frames the compositor draws and renderer main-thread time for `nuikit_pause` and the `ox_inventory`
override, 2 s Chrome trace per scenario after a 1 s settle (reuses `bench/motion/trace.mjs`).

```bash
pnpm --filter nuikit-pause-web build && pnpm --filter nuikit-ox-inventory-ui build
npm i playwright-core@1.48.2   # anywhere
PLAYWRIGHT_CORE=<path>/node_modules/playwright-core node bench/showcase/perf.mjs   # CHROME=<exe> to override
```

Chrome 155.0.8059.85, headless, 1920x1080, software compositing.

| scenario | frames | main ms | ms/frame | longest task ms |
|---|---|---|---|---|
| pause: closed | 0 | 1.56 | 0 | 0.78 |
| pause: open, Home idle | 0 | 1.26 | 0 | 0.69 |
| pause: map idle (60 blips, one pins) | 0 | 1.83 | 0 | 0.7 |
| pause: map, pins at 60 Hz | 126 | 385.38 | 3.06 | 3.99 |
| ox_inventory: closed | 0 | 2.08 | 0 | 0.75 |
| ox_inventory: open, idle | 0 | 2.1 | 0 | 0.69 |
| ox_inventory: open transition (600 ms) | 92 | 442.45 | 4.81 | 82.87 |

Nothing draws a frame while idle. The pins stream is the worst case (about 3 ms of main thread per
frame, 63 fps). The ox_inventory open has one 83 ms task (first mount of 50+20 slots).

This is headless desktop Chrome, not FiveM's CEF 103, with software compositing: relative cost only.
In-game resmon decides.

## Lua per frame (natives counted, Lua 5.4 harness)

`Pause.tick` and the map's per-frame work run 2000 times in the `packages/core/test/lua` harness with
every native wrapped in a counter (`nuikit_pause` on this branch; the map numbers include #106's
send-on-change).

| state | natives / frame | NUI messages |
|---|---|---|
| pause closed (the A9 case) | 5: `GetGameTimer`, `IsPauseMenuActive`, `IsNuiFocused`, `DisableControlAction`, `IsDisabledControlJustPressed` | 0 |
| inventory focus poll | 0 per frame (runs every `POLL_MS`, not every frame) | 0 |
| map open, camera settling then still | 8.5 (+ the camera setters) | 78 in 2000 frames: only while it eased; 0 once still |

Five cheap natives a frame is in the 0.01–0.02 ms range of resmon; A9's 0.05 ms was measured before the
fix. Not seen in game: resmon `nuikit_pause` closed, Home open, map dragging decides.
