# qb-target (options only) → `target`

*Clean-room spec. Written from [qbcore.org/docs/qbcore-resources/qb-target](https://qbcore.org/docs/qbcore-resources/qb-target).
nuikit never owns the raycast, zones or distance checks: only the option list drawn at the target. Mechanism:
render only (what the ox_target override already does).*

**Status (Oct 21):** recorder stage only. `adapters/[nuikit-qb]/nuikit_qb_target` ships a recording page (`override/html/index.html`, forwards every qb-target page message to the resource; `/nuikit_qb_target dump`) and no override: the render-only override needs the recorded log below, which the owner produces in one session. It does not declare `nuikit_adapter`. Paste the log here:

```
(no recording yet)
```

## Source

Documented: the zone, entity, model, bone and global exports with their argument order, the `options` entry
fields, `distance`. **Not documented**: `num` (ordering), per-option `distance`, `targeticon` and the draw colours'
exact effect, the selection flow (which key, how options are confirmed), `IsTargetActive` / `IsTargetSuccess`,
and the page's message format (the only thing an override needs; recorded).

## Public API (the part that reaches the UI)

Registration exports (all take `options` and `distance` through `targetoptions` / `parameters`):
`AddCircleZone(name, center, radius, options, targetoptions)`, `AddBoxZone(name, center, length, width, options, targetoptions)`,
`AddPolyZone(name, points, options, targetoptions)`, `AddComboZone(zones, options, targetoptions)`,
`AddEntityZone(name, entity, options, targetoptions)`, `AddTargetBone(bones, parameters)`,
`AddTargetEntity(entity, parameters)`, `AddTargetModel(models, parameters)`, `AddGlobalPed/Vehicle/Object/Player(parameters)`,
and their `Remove*` counterparts (by name, entity, model or label), `AllowTargeting(allow)`.

An `options` entry:

| Field | Type | Meaning |
|---|---|---|
| `num` | number? | order |
| `type` | `'client' \| 'server' \| 'command' \| …` | how `event` runs |
| `event` | string | event / command |
| `icon` | string | Font Awesome class |
| `label` | string | text; also the removal key |
| `targeticon` | string? | icon on the target marker |
| `item` | string? | item required |
| `action` | function? | `action(entity)` instead of `event` |
| `canInteract` | function? | `(entity, distance, data) → bool`, evaluated by the library |
| `job` / `gang` / `citizenid` | string \| table? | restrictions, evaluated by the library |
| `drawDistance`, `drawColor`, `successDrawColor` | number / rgba? | marker look |

`distance` (float) in `targetoptions` / `parameters`.

What the caller gets back: the library evaluates `canInteract`, `job`, `gang`, `citizenid`, `item`, builds the
list of eligible options for the thing under the crosshair, and sends it to its page; on select, the library
dispatches `event` / `action(entity)`. The UI sees only the eligible list and reports the chosen index.

## Intent and field mapping

`target` (architecture §2: options on an entity, model or zone; the raycast stays the targeting library's).

| qb-target page message | `target` |
|---|---|
| eligible options (ordered by `num`) | `options[].id` (index), `label`, `icon` |
| an option whose requirement failed but is still sent | `options[].disabled` (to confirm: qb-target may filter instead) |
| the eye / marker state | `active: true/false`, `success` (hovering a valid target) |
| selection | resolve `{ id }` → the override posts the index back to qb-target's own callback |
| `targeticon`, `drawColor`, `successDrawColor` | `meta` (marker look; the kit draws its own eye from tokens) |

## What the intent must cover

- An "eye" state independent of any options (targeting on, nothing valid), a "success" state, and the option list.
- Options with icon + label only; no descriptions, no submenus.
- Resolve by index; the override, not the intent, talks to qb-target.

## Mechanism

**Render only**: a page override of qb-target's UI (as `addons/ox_target` does for ox_target), written from a
recorded message log into `docs/qb-target-protocol.md`, routing its option list to the `target` renderer and
posting selections back to qb-target's callbacks with identical payloads. Nothing in qb-target's Lua is replaced.
What the spike decides: step 8 (cross-resource post) is the only dependency; if it fails, the override draws
with the shared components inside qb-target's own page, as the ox_target override does today.

## Replay test

This one replays **page messages**, not Lua calls (the existing override pattern, with Playwright POST logs):

1. For each recorded `SendNUIMessage` from qb-target, the override's POSTs back to qb-target are identical in
   name, payload and timing to the recorded originals (the `docs/ox-target-protocol.md` method).
2. The `target` intent opened/updated with the same option count, order and labels as the message.
3. Selecting option *n* on the renderer produced the same POST qb-target's own page would have sent.
