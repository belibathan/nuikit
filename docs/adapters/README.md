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
| `[nuikit-qb]` | qb-menu | `menu` | stand-in: **built** (`nuikit_qb_menu`) | [`qb-menu.md`](qb-menu.md) |
| | qb-input | `input` | stand-in: **built** (`nuikit_qb_input`) | [`qb-input.md`](qb-input.md) |
| | qb-core `QBCore:Notify` / `Functions.Notify` | `notify` | listener: **built** (`nuikit_qb_notify`); silencer page for qb-core's html, mapping unverified | [`qb-core-notify.md`](qb-core-notify.md) |
| | progressbar (`QBCore.Functions.Progressbar`) | `progress` | stand-in: **built** (`nuikit_qb_progressbar`) | [`qb-progressbar.md`](qb-progressbar.md) |
| | qb-core DrawText | `prompt` | listener: **built** (`nuikit_qb_drawtext`); exports via the silencer page, mapping unverified | [`qb-drawtext.md`](qb-drawtext.md) |
| | qb-radialmenu | `radial` | stand-in: **built, UI only** (`nuikit_qb_radialmenu`; vehicle doors/extras/seats not translated) | [`qb-radialmenu.md`](qb-radialmenu.md) |
| | qb-target (options only) | `target` | render only: **recorder stage** (`nuikit_qb_target` logs the page messages; no override until a log exists) | [`qb-target.md`](qb-target.md) |
| `[nuikit-esx]` | esx_notify (`ESX.ShowNotification`) | `notify` | listener + stand-in | [`esx-notify.md`](esx-notify.md) |
| | esx_context | `menu` (+ inline `input`) | stand-in | [`esx-context.md`](esx-context.md) |
| | esx_menu_default | `menu` | stand-in (menu type) | [`esx-menu-default.md`](esx-menu-default.md) |
| | esx_menu_dialog | `input` | stand-in (menu type) | [`esx-menu-dialog.md`](esx-menu-dialog.md) |
| | esx_progressbar | `progress` | stand-in | [`esx-progressbar.md`](esx-progressbar.md) |
| | esx_textui | `prompt` | stand-in | [`esx-textui.md`](esx-textui.md) |
| `[nuikit-standalone]` | okokNotify | `notify` | stand-in | [`okok-notify.md`](okok-notify.md) |
| | mythic_notify | `notify` | stand-in | [`mythic-notify.md`](mythic-notify.md) |
| `[nuikit-ox]` | ox_lib (notify, context, input, alert, progress, textUI, skillCheck) | all | page override, routed (step 5) | [`../ox-lib-protocol.md`](../ox-lib-protocol.md) (the existing protocol doc; routing is decided by the spike) |

## `[nuikit-qb]`: status and the owner's in-game checklist

Built on `feat/adapter-qb` (`adapters/[nuikit-qb]/`, replay tests in `bench/adapters/replay/qb/`), **not run in
game**. Install: `ensure [nuikit-qb]` after `exec @nuikit/nuikit.cfg`; `stop qb-menu`, `stop qb-input`,
`stop progressbar`, `stop qb-radialmenu`. Three steps per adapter:

| Adapter | 1 | 2 | 3 |
|---|---|---|---|
| `nuikit_qb_menu` | Open any qb-menu script (a garage, a boss menu): nuikit's menu panel shows with the header as its title | Pick a row: the script does what it did before (vehicle comes out, event fires) | Press Escape, then open again from a second script: only one menu at a time, no stuck cursor |
| `nuikit_qb_input` | Open a qb-input form (billing, a name prompt): nuikit's form shows with every field type | Submit: the script receives the values (check a number field works in its maths) | Open it again and press Escape: the script treats it as cancelled, no hang |
| `nuikit_qb_notify` | `/me` or any server notification: one nuikit toast (if two toasts appear, the silencer page isn't copied over qb-core/html) | A `{ text, caption }` notification shows caption as the title | With `nuikit_debug 1`, a direct `QBCore.Functions.Notify` prints a `[nuikit-qb:page]` line (paste it into `qb-core-notify.md`) |
| `nuikit_qb_drawtext` | Walk to a DrawText spot (a door, a shop): the `[E]` prompt is nuikit's | Press E: the chip lights up and the prompt goes away about half a second later | Walk away: it hides; nothing left on screen |
| `nuikit_qb_progressbar` | Do anything with a progress bar (eat, repair): nuikit's bar, the animation and the prop play | Press X on a cancellable one: the script's cancel path runs (item not consumed) | Start a second one while one runs: it's refused and the script doesn't hang |
| `nuikit_qb_radialmenu` | Press F1: the radial shows the config items and your job's items | Pick a submenu item: it dispatches; a `shouldClose = false` item keeps the menu open | `exports['qb-radialmenu']:AddOption` from a script: the item appears on the next open |
| `nuikit_qb_target` | Copy `override/html/index.html` over qb-target's page for one session | Aim at a ped, a vehicle, a zone; `/nuikit_qb_target dump` | Paste the lines into `qb-target.md`; restore qb-target's page |

Also: `nuikit doctor` says `[nuikit-qb] running` and lists qb-menu, qb-input, progressbar, qb-radialmenu as
`adapted`. What would change the plan: `provide` not resolving `dependency 'qb-menu'` (checklist step 1 in
`bench/adapters/checklist.md`) → the stand-ins ship as page overrides instead; a page in qb-core unable to
fetch `https://nuikit_qb_notify/page` (step 8) → the silencer forwards nothing and direct notify calls stay lost.

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
