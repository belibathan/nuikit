# nuikit_spike_route

Plays the `nuikit` runtime for **page override routing** (mechanism 3): the ox_lib override page can't change
ox_lib's Lua, so it must hand its intents to the runtime from the page itself. Two doors in, both timed:

| Door | How | Measures |
|---|---|---|
| NUI callback `https://nuikit_spike_route/intent` | the caller's page (`nuikit_spike_caller/web`) posts `{ id, intent, props }` to **another resource's** callback | `echo_ms`: page → Lua → page. `full_ms`: page → Lua → this resource's frame → Lua → page (the intent round trip) |
| export `exports.nuikit_spike_route:intent(name, props)` | Lua → Lua, synchronous, the frame told fire-and-forget | ms per call; `frame` mode: one call per frame, read resmon |

The frame (`web/index.html`) counts what it "rendered" bottom-right and resolves each intent at once with the
time it spent (`frameMs`), so Lua-side numbers can be split from page-side ones.

## Commands

| Command | Does |
|---|---|
| `/spike_route page 50` (caller) | the caller's page posts 50 echo + 50 full intents; prints `{ n, failed, echo_ms: {avg,p50,p95,max}, full_ms: {…} }` |
| `/spike_route export 200` (caller) | 200 synchronous export calls; prints total and ms/call |
| `/spike_route frame 300` (caller) | one export call per frame for 300 frames; prints ms/frame, then read resmon |
| `/spike_route_stats` | counts: nui, nuiEcho, export, resolved, orphaned, Lua-side avg/max |

## Success

`failed: 0` and `orphaned: 0`. A page in one resource reaching a callback in another is the whole mechanism; if
`failed` is 50, the ox_lib override would need a different bridge (its own `ui_page` loaded inside nuikit's frame,
`docs/host.md`) and step 5's plan changes. Timing targets, from the per-frame costs already measured
(`docs/roadmap.md`): a callback hop ~0.5 ms, a Lua → page message ~0.3 ms; `full_ms.p50` under ~5 ms is fine
for menus and notifies, `frame` mode should stay under 0.1 ms resmon on both resources.
