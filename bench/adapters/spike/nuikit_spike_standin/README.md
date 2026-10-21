# nuikit_spike_standin

A stand-in for **qb-menu**: `provide 'qb-menu'` in the manifest, qb-menu's exports (`openMenu`, `closeMenu`,
`showHeader`) and events (`qb-menu:client:openMenu` / `closeMenu` / `showHeader`) answered here under qb-menu's
name. It draws nothing and logs every call as JSON. `/spike_standin pick <n>` plays the player picking item n
(dispatches `params` as qb-menu's docs describe, or calls `action`).

## Why exports are registered by hand

FiveM resolves `exports['qb-menu']:openMenu` by triggering the event `__cfx_export_qb-menu_openMenu` with a
setter; whoever handles it hands back the function. `provide` covers `dependency` resolution, and Cfx staff state
it does **not** redirect exports ([forum thread, Linden, 2024](https://forum.cfx.re/t/provide-not-working-with-exports/2362268)),
so `client.lua` registers `__cfx_export_qb-menu_<name>` handlers itself. Whether this holds, and what happens
when the real qb-menu also handles them, is what this spike measures.

## Install

See [`../README.md`](../README.md). Needs `nuikit_spike_caller` to call it.

## Commands

| Command | Does |
|---|---|
| `/spike_menu export` (caller) | `exports['qb-menu']:openMenu(5 items, true, false)` |
| `/spike_menu event` (caller) | `TriggerEvent('qb-menu:client:openMenu', 5 items)` |
| `/spike_menu close` (caller) | `exports['qb-menu']:closeMenu()` |
| `/spike_standin pick 2` | fires item 2's event (`nuikit_spike_caller:hi` with args) |
| `/spike_standin pick 3` | `isServer`: server round trip, caller prints `got server pong` |
| `/spike_standin pick 4` | `action()`: caller prints `action() ran` |
| `/spike_standin pick 5` | disabled: must refuse |
| `/spike_standin dump` / `clear` / `state` | the log; `state` prints `GetResourceState('qb-menu')` |

## Success

`/spike_menu export` logs `export-bind openMenu` then `export openMenu from nuikit_spike_caller count=5`; all four
picks behave as in the table. With the real qb-menu also running, the log shows who answered (the stand-in's
line appears, or doesn't) for each start order.
