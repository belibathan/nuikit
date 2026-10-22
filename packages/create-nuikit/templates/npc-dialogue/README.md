# {{name}}

An NPC dialogue made with [nuikit](https://github.com/belibathan/nuikit), from the `npc-dialogue` block.
- **The band:** the speaker's name and role at the bottom of the screen, over the game.
- **The line:** it types itself out (all at once with reduced motion; click it to show the rest).
- **The choices:** rows on the number keys 1-9, or the arrows and Enter. A locked choice is dimmed with the reason
  ("Needs $500", "Police only"). Escape leaves.

It's built from the kit (Panel, MenuRow) and follows the server's nuikit theme.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=bartender|desk|long, ?fail=1
{{pm}} run build  # production build into web/dist
```

**In game:** `ensure nuikit` first, then `ensure {{name}}`. Walk up to Marty at The Hen House (a toast says how) and
press E or run `/{{name}}`.

## The server decides, every time

The conversation lives in `Config.dialogues`, on the server. The page gets one node at a time (the line, and each
choice's id, label and lock reason) and sends back only `choose <choiceId>`. On every choice `server/main.lua`:

- knows which node the player is on, and accepts only an id that node offers (nothing else, whatever the page says);
- checks the player is at the NPC (the server's own position for them; needs OneSync);
- re-checks the choice's requirements: job, money, item (and whatever the choice would take), with the lock reason
  written by the server;
- rate-limits (a choice every 0.4 s at most) and runs one choice at a time per player;
- applies the actions **all or nothing**: money and items taken and given in order, and if a step fails (refused, or
  the framework throws) the steps already done are undone. An undo that fails is printed in red in the server console.

**OneSync:** the position check needs it. Without it the resource prints a red error at start and every request
is refused ("This dialogue needs OneSync on the server.").

## Writing a tree

`Config.npcs` places the people (`coords`, `radius`, which `dialogue`). `Config.dialogues.<name>.nodes` are the lines;
each node has `text` and `choices`, and a choice has `id`, `label`, `requires`, `take`, `give` and `next` (see the
comments in `config.lua`). A choice without `next` ends the conversation. A `next` that points nowhere is reported
in red at start, and refused if a player reaches it.

## What the example does, and what a real server changes

| | The example | On your server |
|---|---|---|
| Job | Everyone is a `civilian` (`Config.startJob`) | `Config.job` (commented Qbox/QBCore/ESX lines) |
| Money | Cash 800 per license, in memory | `Config.money` (commented Qbox lines; QBCore and ESX named) |
| Items | A bag per license, in memory | `Config.items` (commented ox_inventory lines): `count`, `add` (false when they can't carry it) and `remove` (false when they don't have it) |

## Files

| | |
|---|---|
| `config.lua` | The NPCs, the dialogue trees, the key, `Config.job`, `Config.money`, `Config.items` |
| `client/main.lua` | Opens the nearest NPC's first line, passes each choice on. `nk.surface`, `nk.on` |
| `server/main.lua` | The conversation state, requirements, actions, and every check |
| `web/src/components/blocks/npc-dialogue/` | The block: `npc-dialogue.tsx` (UI), `nui.ts` (messages), `fixtures.ts` (every state) |
| `web/src/dev.tsx` | The fake game for browser development |
