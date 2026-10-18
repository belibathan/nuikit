# nuikit_hud

The HUD for `[nuikit]`: health, armor, hunger, thirst, stress, voice and radio, cash, bank, job, and a speedometer with fuel, gear and seatbelt while driving. Built from stock shadcn components and themed by `nuikit/theme.css`.

Works on **Qbox**, **QBCore**, **ESX** or **standalone** (detected automatically by `client/bridge.lua`; force one with `setr nuikit_framework qbox`).

## Install

1. Put it in `resources/[nuikit]/` next to the `nuikit` resource.
2. Stop the HUD it replaces (for Qbox: remove `ensure qbx_hud`).
3. `ensure nuikit` then `ensure nuikit_hud`.
4. **Qbox / QBCore:** stress gain and its screen effects live inside `qbx_hud` / `qb-hud`, so stopping them turns stress off. `ensure nuikit_stress` (same events, same metadata) to keep it.

Settings are in `config.lua` (units, when to show the minimap).

## Edit it

The UI is a normal Vite + React + shadcn app in `web/`. Components live in `web/src/components/ui`, so you own every line:

```bash
cd web && npm install && npm run dev   # browser, with devtools (press `)
npm run build                          # writes web/dist for the game
```
