# bench/adapters: the adapter spike and the replay harness

*Platform step 4 of `docs/architecture.md` ("in-game spike: stand-in, listener and ox_lib page routing on a
real client; choose per library"). Specs for steps 5–7 are in [`docs/adapters/`](../../docs/adapters/README.md).*

| Path | What |
|---|---|
| [`checklist.md`](checklist.md) | The owner's 12-step in-game run, with the decision rule per library |
| [`spike/`](spike/README.md) | Four tiny Lua resources: `nuikit_spike_standin` (provide qb-menu), `nuikit_spike_listener` (notify events), `nuikit_spike_route` (plays the runtime for page routing), `nuikit_spike_caller` (plays the scripts and the ox_lib page). Each has a `results.md` with empty tables |
| [`replay/`](replay/README.md) | wasmoon harness that replays a recorded call log against an adapter and reports what the caller got; worked example on the stand-in |

**Status: nothing has run in game.** The spike resources load and behave under the replay harness
(`node --test bench/adapters/replay/standin.test.mjs`); every number in the `results.md` files is empty and says so.

Two facts the spike is built around, both from public FiveM documentation and to be confirmed in game:

1. `exports['x']:f()` is resolved by triggering the event `__cfx_export_x_f` with a setter; the provider hands
   back the function. `provide` covers `dependency` and start order; Cfx staff say it does **not** redirect
   exports, so a stand-in registers those events under the library's name itself.
2. A NUI page may `fetch('https://<other-resource>/<callback>')` (the kit's override pages already long-poll
   `https://nuikit/theme`). Page routing posts intents the same way.
