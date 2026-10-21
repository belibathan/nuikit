# Stand-in spike: results

*Not run yet. No in-game numbers exist for this spike; every cell below is empty until the owner runs
[`../../checklist.md`](../../checklist.md) steps 2–5. Date, build (`next-<sha>`), server artifact and resolution go here.*

Build: — · Server: Qbox b— · Date: —

## Start order and dependency resolution

| Case | `server.cfg` | Caller started? | Caller started after stand-in? | `GetResourceState('qb-menu')` | Notes |
|---|---|---|---|---|---|
| A: stand-in only | `ensure nuikit_spike_standin` then `ensure nuikit_spike_caller` | | | | |
| B: caller first | `ensure nuikit_spike_caller` then `ensure nuikit_spike_standin` | | | | FiveM should start the provider first (dependency) |
| C: real qb-menu before stand-in | `ensure qb-menu`, `ensure nuikit_spike_standin`, `ensure nuikit_spike_caller` | | | | |
| D: real qb-menu after stand-in | `ensure nuikit_spike_standin`, `ensure qb-menu`, `ensure nuikit_spike_caller` | | | | |
| E: `stop qb-menu` at runtime in C | | | | | does the caller's next export call land on the stand-in? |

## Calls intercepted

Counts from `/spike_standin dump` after `/spike_menu export`, `/spike_menu event`, `/spike_menu close`, and picks 2–5.

| Call | Case A | Case C (qb-menu first) | Case D (qb-menu after) | Who drew a menu on screen (C/D) |
|---|---|---|---|---|
| `exports['qb-menu']:openMenu` | | | | |
| `qb-menu:client:openMenu` event | | | | |
| `exports['qb-menu']:closeMenu` | | | | |
| pick 2 → `nuikit_spike_caller:hi` received | | | | |
| pick 3 → server pong received | | | | |
| pick 4 → `action() ran` | | | | |
| pick 5 → refused | | | | |

Missed calls (the caller printed `ok=false` or a menu appeared from qb-menu, not the stand-in): —

## Cost

| | resmon idle (ms) | resmon while `/spike_menu export` ×20 (ms) | Memory |
|---|---|---|---|
| nuikit_spike_standin | | | |
| nuikit_spike_caller | | | |

## Verdict

- `provide` resolves `dependency 'qb-menu'`: yes / no / only when …
- Exports under the library's name reach the stand-in: yes / no / only when …
- With the original also running, who answers: …
- Decision for step 6 (see the checklist's rule): stand-in / listener / page override for qb-menu, because …
