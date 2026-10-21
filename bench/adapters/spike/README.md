# Adapter spike: three mechanisms on a real client

*Platform step 4 (`docs/architecture.md` §3). Four tiny Lua resources that prove, on a Qbox server, the three
ways an adapter can get between an existing script and its UI library: **stand-in**, **listener**, **page routing**.
They draw nothing; they log. The owner runs [`../checklist.md`](../checklist.md) (10 minutes) and fills each
resource's `results.md`. **No numbers are in yet: every table is empty.**

| Resource | Plays | Mechanism it proves |
|---|---|---|
| `nuikit_spike_standin` | the adapter that replaces qb-menu (`provide 'qb-menu'`, exports under qb-menu's name) | 1, stand-in |
| `nuikit_spike_listener` | the adapter that handles `QBCore:Notify`, `ox_lib:notify`, `esx:showNotification`, okok, mythic | 2, listener |
| `nuikit_spike_route` | the `nuikit` runtime: a NUI callback and an export that other resources' pages and Lua send intents to, bounced through its frame | 3, page override routing |
| `nuikit_spike_caller` | the scripts: `dependency 'qb-menu'`, calls the exports and events, carries the "ox_lib page" that posts to the runtime | the caller side of all three |

Why a fourth resource: a stand-in is only proven by a *different* resource that depends on the library and calls
it. Nothing on the stock Qbox recipe does that for a qb-* library (the recipe has no qb-menu, qb-input, qb-core,
progressbar, qb-radialmenu or qb-target; its UI calls go through ox_lib, which is mechanism 3), so the caller
plays that script. The stand-in still targets **qb-menu** because that is the first real stand-in in step 6 and
the mechanism (dependency resolution, export routing, start order) does not depend on the framework.

## Install (any server; written for the owner's Qbox)

```
resources/[nuikit-spike]/nuikit_spike_standin
resources/[nuikit-spike]/nuikit_spike_listener
resources/[nuikit-spike]/nuikit_spike_route
resources/[nuikit-spike]/nuikit_spike_caller
```

`server.cfg`, after `ensure nuikit` (order matters: it is one of the things measured):

```
setr nuikit_spike_listener_cancel 0     # 1 = the listener calls CancelEvent() in its handlers
ensure nuikit_spike_route
ensure nuikit_spike_listener
ensure nuikit_spike_standin             # provides qb-menu
ensure nuikit_spike_caller              # dependency 'qb-menu' → must resolve to the stand-in
```

Do **not** `ensure qb-menu` for the first pass. For the conflict case (checklist step 5) drop the real qb-menu
into `resources/` and `ensure qb-menu` *before* the stand-in, then *after* it, and record who answers each time.

## What success looks like

- Console at start: `[nuikit-spike:standin] started · provide qb-menu · GetResourceState("qb-menu") = started`
  and `[nuikit-spike:caller] started` **after** it. If the caller prints a dependency error instead, `provide`
  did not resolve the dependency; that alone changes step 6's plan (see the decision rules in the checklist).
- `/spike_menu export` → a `[nuikit-spike:standin] {"kind":"export-bind","name":"openMenu"…}` line (once per
  call site), then `{"kind":"export","name":"openMenu","from":"nuikit_spike_caller",…}`. `/spike_standin pick 2` →
  `[nuikit-spike:caller] got event nuikit_spike_caller:hi args={"who":"caller"}`.
- `/spike_notify server` → six `[nuikit-spike:listener]` lines **and** six notifications on screen drawn by
  the libraries that are installed (on Qbox: `QBCore:Notify` and `ox_lib:notify` draw through ox_lib; the
  esx/okok/mythic ones draw nothing because those libraries aren't there, but the listener still logs them).
  `/spike_notify direct` → notifications on screen, **nothing** in the listener log: the listener's known gap.
- `/spike_route page 50` → a `[nuikit-spike:caller] page: {"n":50,"failed":0,"echo_ms":{…},"full_ms":{…}}`
  line with ms stats, and the bottom-right counter in the route frame at 50. `failed` must be 0: a non-zero
  count means a page cannot post to another resource's callback, which kills mechanism 3 as designed.

Everything printed is JSON, one line per call, prefixed with the resource tag: copy the F8 console into the
`results.md` of each resource.

## Not proven anywhere yet

All of it. These resources were written against the FiveM manifest and runtime documentation and run under
the wasmoon harness (`../replay/`) for the stand-in's logic only. The fxmanifest `provide` semantics, cross-resource
NUI callbacks from an override page, `CancelEvent()` reach, and every timing are the in-game questions.
