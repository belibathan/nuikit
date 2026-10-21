# Adapter replay harness

Runs adapter Lua in real Lua 5.4 (wasmoon, the same engine as `packages/core/test/lua`), replays a recorded call
log against it, and returns **what the calling script got back**: export return values, the events it received,
the server events and commands the adapter triggered for it, NUI messages, prints. This is the "replay test"
every clean-room spec in `docs/adapters/` ends with.

```bash
node --test bench/adapters/replay/standin.test.mjs      # the worked example: qb-menu log → stand-in spike
LUADBG=1 node --test bench/adapters/replay/standin.test.mjs   # with the Lua prints
```

| File | What |
|---|---|
| `harness.mjs` | `createClient()` (resources, events, FiveM's real export resolution through `__cfx_export_<res>_<name>`, commands, NUI callbacks, timers, `GetInvokingResource`) and `replay(client, recording, { caller })` |
| `recordings/*.json` | call logs; `qb-menu-sample.json` is hand-written from qb-menu's docs, to be replaced by one recorded in game |
| `standin.test.mjs` | the worked example (node:test; no extra dependencies) |

## Recording format

```json
{
  "library": "qb-menu",
  "expects": ["my_script:openGarage"],            // events the caller listens for
  "calls": [
    { "kind": "export", "resource": "qb-menu", "name": "openMenu", "args": [[ … ], true, false] },
    { "kind": "event", "name": "qb-menu:client:openMenu", "args": [[ … ]] },
    { "kind": "serverEvent", "name": "QBCore:Notify", "args": ["Paid", "success", 5000] },
    { "kind": "command", "resource": "nuikit_spike_standin", "name": "spike_standin", "args": ["pick", "2"] },
    { "kind": "wait", "ms": 500 }
  ]
}
```

A function-valued argument (a menu item's `action`, a progress bar's `onFinish`) is written `{ "$fn": "label" }`;
the harness turns it into a function and reports its calls under that label in `got.fnCalls`. `wait` advances
`GetGameTimer()` and fires due `SetTimeout`s, so timed intents (progress, notify duration) can be asserted.

`replay` returns `{ returns, errors, events, fnCalls, serverEvents, executed, messages, prints }`.

## Recording a log in game

Not built yet. The plan: the adapter resources log every intercepted call as one JSON line (the spikes already do,
prefixed `[nuikit-spike:*]`); a small script turns a pasted F8 console into this format. Until then, write logs by
hand from the library's docs, as `qb-menu-sample.json` is.

## What it can't tell you

Start order, `provide`, cross-resource NUI callbacks, `CancelEvent()` reach, timings: those are FiveM's, and
`../spike/` measures them in game. The harness delivers events queued (like the core harness: nothing may rely
on `TriggerEvent` being synchronous across resources) and resolves exports exactly as FiveM's event mechanism does,
but it does not model `provide`.
