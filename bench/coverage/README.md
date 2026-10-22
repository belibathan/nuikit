# Coverage harness

*What "universal" means, measurably ([`../../docs/architecture.md`](../../docs/architecture.md) §"What
universal means"): the share of UI calls on a stock server drawn by nuikit, from one scripted session on the
txAdmin Qbox, QBCore and ESX recipes. Target for 0.7: 90%+ on Qbox, 75%+ on QBCore and ESX. Status: the
client runtime emits the event, the doctor counts it, `run.mjs` computes the numbers; not run on a server yet.*

## 1. How a count is made

Two counters, both by source resource:

| Counter | Counts | How |
|---|---|---|
| **drawn** | every intent nuikit rendered | the intents runtime emits `nuikit:intent { source, intent }` on the server (`TriggerEvent`, or `TriggerServerEvent` from a client) for every intent it draws. `server/doctor.js` counts them; `nuikit doctor json` prints `intents[]` |
| **asked** | every UI call the session made, drawn by nuikit or not | the session script (§3) logs each step it triggers as `{ source, intent, expected }`; `run.mjs` pairs them with the doctor's counts |

Coverage = drawn / asked, per framework, per intent. A call the session made that no `nuikit:intent` followed
is a miss; the misses are the backlog ([`../../docs/roadmap.md`](../../docs/roadmap.md)).

The event name and shape are fixed here so both lanes build to it:

```lua
-- systems/nuikit/client/intents.lua, once per drawn intent (the client runtime sends it to the server)
TriggerServerEvent('nuikit:intent', { source = invokingResource, intent = 'notify' })
```

The doctor only takes string `source` (cut to 64 chars) and `intent` (32), at most 256 sources and 64 intents each.

`source` is the resource that asked (`GetInvokingResource()` in the `nk.*` call, or the adapter's view of it,
never the adapter itself); `intent` is the intent name from the schema. Anything else in the payload is ignored
by the doctor.

## 2. Layout

```
bench/coverage/
  README.md        this
  session.md       the scripted session, step by step, per framework (§3)
  run.mjs          session log + `nuikit doctor json` output → results/<framework>-<date>.md
  session.example.jsonl   the log format, a few lines
  results/         one file per framework per run: date, nuikit version, counts, misses
```

## 3. The scripted session

One player, ~10 minutes, the same steps on every framework. Each step names the UI calls it should produce
and the resource that makes them, so a miss points at a resource.

| # | Step | Expected UI calls (Qbox) | Expected (QBCore) | Expected (ESX) |
|---|---|---|---|---|
| 1 | Join, loading screen | loading (nuikit_loading) | loading | loading |
| 2 | Spawn / character select | character select (qbx_core multichar) | qb-multicharacter | esx_multicharacter |
| 3 | HUD on foot, in a vehicle | hud (nuikit_hud) | qb-hud | esx_hud |
| 4 | Open the pause menu, settings | pause (nuikit_pause) | pause | pause |
| 5 | ox_lib menus: context, input, alert, progress, text UI, notify | ox_lib ×6 | ox_lib ×6 (if installed) | ox_lib ×6 (if installed) |
| 6 | Framework menus and notifies | qbx notify | qb-menu, qb-input, QBCore:Notify, progressbar, DrawText | esx_menu_default, esx_context, esx_notify, esx_textui, esx_progressbar |
| 7 | Target: a door, an NPC | ox_target | qb-target | ox_target |
| 8 | Radial menu | ox radial / qbx_radialmenu | qb-radialmenu | (none) |
| 9 | A job: taxi (qbx_taxijob), a delivery | job menus, progress, notifies | qb-taxijob | esx_taxijob |
| 10 | Inventory: open, move, use an item | ox_inventory | qb-inventory | ox_inventory |
| 11 | Bank, ID card, scoreboard | Renewed-Banking, qbx_idcard, qbx_scoreboard | qb-banking, qb-idcard, qb-scoreboard | esx_banking, esx_scoreboard |
| 12 | Death and respawn | death (nuikit_death) | qb-ambulancejob | esx_ambulancejob |

Each row's "expected" is filled in from the recipe actually installed, on the day of the run (recipes change).

## Running it

```bash
nuikit doctor json > doctor.json     # in the server console after the session; save that line
node bench/coverage/run.mjs qbox session.jsonl doctor.json   # exit 1 below target (qbox 0.90, qbcore 0.75, esx 0.75)
```

Session lines are JSON: `{framework, step, source, intent, expected}`. Pairing is per (source, intent): drawn is
the doctor's count capped at what the session asked; `expected:false` lines are ignored. The maths is
`nuikit-core/coverage` (tested in `packages/core/test/coverage.test.ts`).

## 4. What's unproven

Not run on a server: the session, the in-game event path (client to server) and the real numbers.
