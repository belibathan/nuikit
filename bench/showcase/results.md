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

## World screen (`systems/nuikit_screen`)

A screen costs in two places: the Lua frame that draws it, and the DUI, a browser tab that renders the page
whether anyone looks at it or not.

**Lua per frame** (`test/lua/screen.test.ts`, natives counted on `Screens.frame()`):

| where the player is | natives per frame | loop |
|---|---|---|
| over 25 m from every screen (`Config.drawDistance`) | 2 (`PlayerPedId`, `GetEntityCoords`) | every 500 ms |
| in range, one screen | 4: those 2 and `DrawSpritePoly` × 2 | every frame |
| within reach (1.6 m) | + the help text (3) and `IsControlJustPressed` | every frame |
| using it | + the cursor ray, `SendDuiMouseMove` and the control reads (about 15) | every frame |

**The DUI page** (`perf.mjs`, headless Chrome, the terminal at its 1920x1080):

| scenario | frames / 2 s | main ms/frame | longest task |
|---|---|---|---|
| terminal idle | 0 | 0 | 0.6 ms |
| cursor moving over rows (a move every frame) | 125 | 1.38 | 7.2 ms |
| click a row | 1 in 600 ms | 14 | 8.2 ms |

Idle, the page draws nothing; a moving cursor costs the hover repaint. What headless can't show, and resmon /
the F8 `profiler` decide in game: `DrawSpritePoly`'s GPU cost (two textured triangles, expected to be small),
and the DUI's own process cost, which a DUI keeps paying out of range. Keep a page idle when nobody's near
(no timers faster than the clock's 10 s; the terminal's is the only one), or remove the screen with
`exports.nuikit_screen:remove(id)` and create it again when a player comes back.
