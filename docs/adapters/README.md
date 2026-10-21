# Adapter specs (clean-room)

*One spec per library for plan steps 5–7 of [`../architecture.md`](../architecture.md). Each is written only
from the library's public documentation (linked at the top of every file), never from its code, and is the
one source an adapter is built from. Mechanisms are **proposed** until the in-game spike
([`../../bench/adapters/checklist.md`](../../bench/adapters/checklist.md)) confirms them; each spec says what
would change it.*

Every spec has the same sections: **Source** (what is documented, what isn't), **Public API** (every call and
event, every argument, what the caller gets back), **Intent and field mapping** (to the `docs/architecture.md`
§2 catalogue; schemas live in `packages/core/intents/`, the intents lane), **What the intent must cover** (so the
schema is a superset and the adapter never drops information), **Mechanism** (stand-in / listener / page override,
why, and what the spike decides), **Replay test** (recorded calls → what the caller must get back, run by
[`bench/adapters/replay/`](../../bench/adapters/replay/README.md)).

## Index

| Pack | Library | Intent(s) | Proposed mechanism | Spec |
|---|---|---|---|---|
| `[nuikit-qb]` | qb-menu | `menu` | stand-in | [`qb-menu.md`](qb-menu.md) |
| | qb-input | `input` | stand-in | [`qb-input.md`](qb-input.md) |
| | qb-core `QBCore:Notify` / `Functions.Notify` | `notify` | listener + page override of qb-core's page | [`qb-core-notify.md`](qb-core-notify.md) |
| | progressbar (`QBCore.Functions.Progressbar`) | `progress` | stand-in | [`qb-progressbar.md`](qb-progressbar.md) |
| | qb-core DrawText | `prompt` | listener + page override of qb-core's page | [`qb-drawtext.md`](qb-drawtext.md) |
| | qb-radialmenu | `radial` | stand-in | [`qb-radialmenu.md`](qb-radialmenu.md) |
| | qb-target (options only) | `target` | render only (the existing override pattern) | [`qb-target.md`](qb-target.md) |
| `[nuikit-esx]` | esx_notify (`ESX.ShowNotification`) | `notify` | listener + stand-in | [`esx-notify.md`](esx-notify.md) |
| | esx_context | `menu` (+ inline `input`) | stand-in | [`esx-context.md`](esx-context.md) |
| | esx_menu_default | `menu` | stand-in (menu type) | [`esx-menu-default.md`](esx-menu-default.md) |
| | esx_menu_dialog | `input` | stand-in (menu type) | [`esx-menu-dialog.md`](esx-menu-dialog.md) |
| | esx_progressbar | `progress` | stand-in | [`esx-progressbar.md`](esx-progressbar.md) |
| | esx_textui | `prompt` | stand-in | [`esx-textui.md`](esx-textui.md) |
| `[nuikit-standalone]` | okokNotify | `notify` | stand-in | [`okok-notify.md`](okok-notify.md) |
| | mythic_notify | `notify` | stand-in | [`mythic-notify.md`](mythic-notify.md) |
| `[nuikit-ox]` | ox_lib (notify, context, input, alert, progress, textUI, skillCheck) | all | page override, routed (step 5) | [`../ox-lib-protocol.md`](../ox-lib-protocol.md) (the existing protocol doc; routing is decided by the spike) |

## Coverage targets (from `architecture.md`)

Share of UI calls on a stock server drawn by nuikit, measured by the coverage harness (step 8) on the txAdmin
recipes with a scripted session (join, spawn, menus, a job, inventory, death):

| Server | Target for 0.7 | What gets it there |
|---|---|---|
| Qbox | **90%+** | ox_lib override routed to the shared renderers (step 5), ox_target, the shipped screens; qbx_core's `QBCore:Notify` bridge lands in ox_lib so no qb adapters are needed |
| QBCore | **75%+** | `[nuikit-qb]`: qb-menu, qb-input, notify, progressbar, DrawText, qb-radialmenu, qb-target options |
| ESX | **75%+** | `[nuikit-esx]`: esx_notify, esx_context, esx_menu_default, esx_menu_dialog, esx_progressbar, esx_textui |

The misses become the backlog; the doctor reports the same on any live server.

## Conventions every adapter follows

- **Translate UI calls only.** Animations, props, control disabling, freezing, the raycast, zones, callbacks and
  command execution stay in the adapter's Lua exactly as the library did them, or are left to the library.
- **Same return path.** A caller that got an event gets the same event with the same args; a callback is called
  with the same arguments; an export that returned a value returns a value of the same shape. Replay tests assert
  this, not the look.
- **Nothing dropped.** Every field the library accepts maps to an intent field, or to `meta` on the intent so a
  renderer can honour it. A field the schema can't carry is a schema request to the intents lane, not a silent loss.
- **Doctor-visible.** Each adapter declares the library it replaces (`provide`), what it listens to, and what it
  can't catch (direct calls, undocumented events), so `nuikit doctor` can say what's left.
- Credit `@belibathan` only; never a library's code, markup or styles (LGPL/GPL).
