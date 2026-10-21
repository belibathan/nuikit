# Adapter spike: the in-game checklist

*Ten minutes on the Qbox test server. Install per [`spike/README.md`](spike/README.md). Paste the F8 console
lines into each `results.md` as you go. Nothing here has run in game yet.*

1. **Start order.** `server.cfg`: `ensure nuikit_spike_route`, `nuikit_spike_listener`, `nuikit_spike_standin`,
   `nuikit_spike_caller`; no real qb-menu. Join. Console must show `[nuikit-spike:standin] started … = started`
   and then `[nuikit-spike:caller] started`. If the caller refused to start (dependency error), write it in
   `standin/results.md` case A and skip to step 6: `provide` doesn't resolve dependencies.
2. **Export lands.** `/spike_menu export`, then `/spike_standin dump`. You want one `export-bind openMenu` line and
   one `export openMenu … from nuikit_spike_caller … count 5`. Then `/spike_menu close`.
3. **Return path.** `/spike_menu export`, `/spike_standin pick 2` → caller prints `got event … who=caller`.
   Repeat with pick 3 (server pong), pick 4 (`action() ran`), pick 5 (refused). Also `/spike_menu event` once.
4. **Caller first.** Swap the two `ensure` lines (caller before stand-in), `refresh`, restart both. Does the
   stand-in start first anyway? Record case B.
5. **Conflict.** Drop the real qb-menu in. Once with `ensure qb-menu` before the stand-in, once after. Each time:
   `/spike_menu export` and look: who logged it (stand-in line present?) and who drew a menu on screen. Then
   `stop qb-menu` and `/spike_menu export` again. Record cases C, D, E. Remove qb-menu afterwards.
6. **Listener sees events.** `/spike_listener clear`, `/spike_notify local`, `/spike_notify server`,
   `/spike_listener counts`. Expect 12 logged; on Qbox, 4 notifications drawn (the two `QBCore:Notify` and the
   two `ox_lib:notify`). Fill the seen-vs-drawn table.
7. **Listener misses direct calls, and cancel.** `/spike_notify direct`: notifications on screen, nothing new in
   `/spike_listener counts`. Then `setr nuikit_spike_listener_cancel 1`, `restart nuikit_spike_listener`,
   `/spike_notify server`: did ox_lib still draw them? Record.
8. **Page posts across resources.** `/spike_route page 50`, three times. The caller prints `failed`, `echo_ms`,
   `full_ms`; the route frame's counter bottom-right reaches 150. `failed` must be 0.
9. **Export and per-frame cost.** `/spike_route export 200` (ms/call), then `/spike_route frame 300` and read
   resmon for `nuikit_spike_route` and `nuikit_spike_caller` during and after. `/spike_route_stats`: `orphaned` 0.
10. **Resmon idle.** With all four started and nothing happening: resmon for each. Write them in the three
    `results.md` cost tables. Then `/spike_route page 20` after `restart nuikit_spike_route` (start-order case).
11. **Stop.** `stop nuikit_spike_caller nuikit_spike_standin nuikit_spike_listener nuikit_spike_route`; confirm
    nothing on screen changed (no focus or cursor was ever taken).
12. **Decide**, per library, with the rules below; write the verdict line of each `results.md`.

## Decision rules (which mechanism wins)

Apply in order; the first rule that fits decides.

| Library | Rule |
|---|---|
| **ox_lib** (`lib.notify`, context, input, alert, progress, textUI, skillCheck) | Page override (mechanism 3) regardless: the API runs inside ox_lib. The spike decides *how the page reaches nuikit*: step 8 `failed = 0` and `full_ms.p50` under ~5 ms → the override posts to `https://nuikit/intent`. Otherwise → ox_lib's page is loaded inside nuikit's frame (`docs/host.md`) and step 5 grows by that. |
| **qb-menu, qb-input, qb-radialmenu, progressbar** (whole-resource UI libraries, called by export or event) | Stand-in (1) if step 1 and step 2 both pass (dependency resolves, export lands) **and** step 5 shows the stand-in answering whenever the original is stopped. If exports don't land but events do → stand-in that handles only the events, and the doctor warns about export callers. If the dependency doesn't resolve → page override of the library's own `html/` (3), with the doctor watching for library updates. |
| **`QBCore:Notify`, `esx:showNotification`, okokNotify, mythic_notify** (event-driven) | Listener (2) if step 6 logs them. Add `CancelEvent()` only if step 7 shows it silences the library; else the library's own UI is silenced by stand-in (okok, mythic: whole resources) or page override (qb-core's and es_extended's `html/`). Direct calls (step 7) are never caught by a listener: they go to the page override of that library. |
| **qb-core DrawText, esx_textui, esx_progressbar, esx_context, esx_menu_*** | Same rule as the qb-* row for the standalone resources (esx_textui, esx_progressbar, esx_context, esx_menu_default, esx_menu_dialog are resources: stand-in); DrawText lives in qb-core → listener for its events + page override for the exports. |
| **qb-target options** | Never replaced: ox_target/qb-target keep the raycast. Options are read through the target library's own API; mechanism is "render only" via the target override already shipped. |

Record the verdicts in `docs/adapters/<library>.md` (section "Mechanism") after the run.
