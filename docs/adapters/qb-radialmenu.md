# qb-radialmenu → `radial`

*Clean-room spec. Written from [qbcore.org/docs/qbcore-resources/qb-radialmenu](https://qbcore.org/docs/qbcore-resources/qb-radialmenu).
Mechanism proposed; the spike decides.*

**Status (Oct 21):** built as `adapters/[nuikit-qb]/nuikit_qb_radialmenu` (stand-in; ships `config.lua` in qb-radialmenu's shape; `AddOption` / `RemoveOption`; F1 via `RegisterKeyMapping('nuikit_radial')`); replay test `bench/adapters/replay/qb/radialmenu.test.mjs`. **UI only:** vehicle doors, extras, seats and trunk classes are not translated (owner's call). Selection passes the item table as the event's first argument (guess). Not run in game.

## Source

Documented: the config shape (`Config.MenuItems`, `Config.JobInteractions`, vehicle seats / extras / doors,
trunk classes), item fields, types, nested `items`. **Not documented** on the docs page or README: the exports
scripts use to add options at runtime (`AddOption(data, id?) → id`, `RemoveOption(id)`: widely used; confirm from
the recorded log), the open key (F1 by convention), the events the menu fires for its own vehicle features
(`qb-radialmenu:client:openDoor`, `setExtra`, `ChangeSeat`…), and how job menus are merged with the main menu.

## Public API

**Config** (read by the adapter the same way: the adapter ships qb-radialmenu's `config.lua` shape so owners
keep their file):

| Item field | Type | Meaning |
|---|---|---|
| `id` | string | unique |
| `title` | string | label |
| `icon` | string | Font Awesome name |
| `type` | `'client' \| 'server' \| 'command' \| 'qbcommand'` | how `event` runs |
| `event` | string | event or command name |
| `shouldClose` | bool | close after select |
| `items` | item[]? | submenu (nestable) |

`Config.JobInteractions[job]` items appear when the player has that job; vehicle items appear in a vehicle
(seats generated dynamically; extras `qb-radialmenu:client:setExtra`; doors `qb-radialmenu:client:openDoor`).

**Exports** (undocumented): `AddOption(data, id?) → id` adds an item (same fields) at runtime; `RemoveOption(id)`.

What the caller gets back: on select, `TriggerEvent(event)` / `TriggerServerEvent(event)` /
`ExecuteCommand(event)` / `TriggerServerEvent('QBCore:CallCommand', event)` (args: none documented; some
scripts receive the item table: record it). The menu closes if `shouldClose`.

## Intent and field mapping

`radial` (architecture §2: radial items and submenus).

| qb-radialmenu | `radial` |
|---|---|
| `id`, `title`, `icon` | `items[].id`, `label`, `icon` |
| `items` | `items[].items` (submenu) |
| `type` + `event` | kept in the adapter by `id`; resolve dispatches |
| `shouldClose` | `items[].keepOpen = not shouldClose` |
| job / vehicle items | the adapter builds the list at open from `nk.player` (job) and vehicle state, as the library did |
| open key | the adapter's keybind (`RegisterKeyMapping`, F1 default), `open` on press |
| `AddOption` / `RemoveOption` | mutate the adapter's list; `update` if open |

## What the intent must cover

- Nested submenus with a back item, and `keepOpen` per item.
- Dynamic item lists rebuilt at open (job, vehicle) and updated while open (`update`).
- Many items per ring (the library has no cap; renderers paginate past ~8).

## Mechanism

**Stand-in** (`nuikit_qb_radialmenu`, `provide 'qb-radialmenu'`, the exports under its name, the config file
read as-is). The vehicle door/extra/seat behaviours are gameplay the library did in Lua: the adapter keeps them
(its own clean implementation from the documented item list), or drops them with a doctor note; decision for the
owner. What the spike decides: as for qb-menu.

## Replay test

Recording: a config with main items, one submenu, a job menu; `AddOption` of one item; open; select a submenu
item of each `type`; `RemoveOption`; open again.

1. The `radial` intent at open had the config items, the job items for the player's job, the added option.
2. Selecting an item produced the right dispatch for its `type` and closed unless `shouldClose = false`.
3. After `RemoveOption` the next open lacked the item.
4. Nothing was dispatched for a submenu entry itself (it opens the submenu).
