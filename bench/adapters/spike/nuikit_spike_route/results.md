# Page routing spike: results

*Not run yet. Every cell is empty until the owner runs [`../../checklist.md`](../../checklist.md) steps 8–10.*

Build: — · Server: Qbox b— · Resolution: — · Date: —

## Cross-resource callback (`/spike_route page 50`, run three times)

| Run | `failed` | `echo_ms` avg / p50 / p95 / max | `full_ms` avg / p50 / p95 / max | `frameMs` typical |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

`orphaned` from `/spike_route_stats`: —

## Export path (`/spike_route export 200`)

| Run | total ms | ms/call |
|---|---|---|
| 1 | | |
| 2 | | |

## Per frame (`/spike_route frame 300`)

| | ms/frame (printed) | slowest call (ms) | resmon nuikit_spike_route (ms) | resmon nuikit_spike_caller (ms) |
|---|---|---|---|---|
| during the run | | | | |
| idle after | | | | |

## Start-order case

`restart nuikit_spike_route` while the caller's page is up, then `/spike_route page 20`: — (does the page find the
callback again without its own restart?)

## Verdict

- A page can post to another resource's NUI callback: yes / no
- Intent round trip (p50): — ms; acceptable for menu / notify / progress: yes / no
- Per-frame cost at one intent per frame: — ms resmon
- Decision for step 5 (checklist rule): page override posts to `https://nuikit/intent` / needs the host / …
