# qb-menu → `menu`

*Clean-room spec. Written from [qbcore.org/docs/qbcore-resources/qb-menu](https://qbcore.org/docs/qbcore-resources/qb-menu)
and the repository README. Mechanism proposed; the spike decides (see Mechanism).*

## Source

Documented: `openMenu`, `closeMenu`, the item fields, `params`. **Not documented** (used by scripts in the
wild; confirm from the recorded log before relying on them): `showHeader(data)`, the events
`qb-menu:client:openMenu`, `qb-menu:client:closeMenu`, `qb-menu:client:showHeader`; the exact effect of `sort`
and `skipFirst`; precedence between `action` and `params`; whether a menu-header item is drawn as a title bar.

## Public API

**`exports['qb-menu']:openMenu(data, sort?, skipFirst?)`** → nothing. Opens the menu (replaces an open one).

- `data`: array of items. Each:

| Field | Type | Meaning |
|---|---|---|
| `header` | string | item title (required in practice) |
| `txt` | string? | description |
| `icon` | string? | Font Awesome name or class (`fas fa-car`), or an image path in some scripts |
| `isMenuHeader` | bool? | the item is a title, not selectable |
| `disabled` | bool? | shown, not selectable |
| `hidden` | bool? | not shown |
| `action` | function? | called on select (no args documented) |
| `params.event` | string \| function | what to run on select |
| `params.args` | any? | passed to it |
| `params.isServer` | bool? | `event` is a server event (`TriggerServerEvent(event, args)`) |
| `params.isCommand` | bool? | `event` is a command (`ExecuteCommand(event)`) |
| `params.isQBCommand` | bool? | `event` is a QBCore command (`TriggerServerEvent('QBCore:CallCommand', event, args)`) |
| `params.isAction` | bool? | `event` is a function (`event(args)`) |
| (none set) | | client event: `TriggerEvent(event, args)` |

- `sort`: bool, sorts items (order undocumented; assume by `header`, record it).
- `skipFirst`: bool, undocumented (assume: keep the first item in place when sorting).

**`exports['qb-menu']:closeMenu()`** → nothing.

**`exports['qb-menu']:showHeader(data)`** (undocumented) → nothing; shows only the header rows of `data`.

**Events** (undocumented): `qb-menu:client:openMenu` (data, sort?, skipFirst?), `qb-menu:client:closeMenu`,
`qb-menu:client:showHeader` (data); same semantics.

What the caller gets back: nothing from the calls. On select, exactly one of: its client event with `args`;
its server event with `args`; a command executed; `QBCore:CallCommand`; `action()` / `event(args)` called.
On Escape or close: nothing (no close callback exists).

## Intent and field mapping

`menu` (architecture §2: items with icon, description, metadata, image, progress, disabled, submenus).

| qb-menu | `menu` |
|---|---|
| the first `isMenuHeader` item's `header` / `txt` | `title` / `description` |
| other `isMenuHeader` items | `items[].kind = 'header'` (section label) |
| `header` | `items[].label` |
| `txt` | `items[].description` |
| `icon` | `items[].icon` (class or name; an image path → `items[].image`) |
| `disabled` | `items[].disabled` |
| `hidden` | omitted from `items` |
| `action` / `params` | kept in the adapter, keyed by `items[].id`; the resolve of the intent dispatches them |
| `sort`, `skipFirst` | applied by the adapter before building `items` (so renderers never sort) |
| `closeMenu` | `cancel(menuId)` |
| `showHeader` | `menu` with only header items (`items[].kind = 'header'`) |

Resolve: `{ id }` of the picked item → adapter dispatches. Cancel (Escape): nothing to the caller.

## What the intent must cover

- `items[].kind: 'header'` items anywhere in the list (qb-menu scripts use several as section labels).
- `items[].icon` as either an icon name/class or an image path (`items[].image`).
- An item can be `disabled` yet visible; `hidden` is the adapter's job.
- No submenus, no metadata, no progress: qb-menu has none. Menus are replaced, never stacked.
- A menu with zero selectable items (header only) is valid and shows.

## Mechanism

**Stand-in** (`nuikit_qb_menu`, `provide 'qb-menu'`, exports registered under `qb-menu`'s name, the three
events handled). qb-menu is a whole resource that is only UI; nothing else depends on its internals. What the
spike decides: if `provide` doesn't resolve `dependency 'qb-menu'` (checklist step 1), the adapter ships as a
**page override** of qb-menu's `html/` instead, posting to `https://nuikit/intent`; if exports don't land but
events do (step 2), the stand-in handles events and the doctor flags export callers.

## Replay test

Recording: `bench/adapters/replay/recordings/qb-menu-sample.json` (hand-written; replace with an in-game log).
Assert, for a replayed `openMenu` then pick:

1. The caller's `openMenu` returned nothing and threw nothing.
2. One `menu` intent was opened with `items` in order (after `sort`), headers as `kind: 'header'`, `hidden`
   items absent, `disabled` kept.
3. Picking item *n* produced exactly the dispatch the table above gives, with `args` intact (`TriggerEvent` /
   `TriggerServerEvent` / `ExecuteCommand` / `QBCore:CallCommand` / `action()`), and closed the menu.
4. `closeMenu` with a menu open cancelled it; with none open did nothing.
5. `openMenu` while open replaced the menu (one open at a time).
6. The event forms produced the same as the export forms.

The stand-in spike passes 1, 3, 4 and 6 today (`node --test bench/adapters/replay/standin.test.mjs`); 2 and 5
need the intent runtime.
