# {{name}}

Targeting and key prompts made with [nuikit](https://github.com/belibathan/nuikit), from the `interaction` block.
- **The eye:** hold Left Alt and aim. When you aim at something with options (a car, a player, an ATM), they show
  next to the eye. Click to get the cursor and choose one, or set `Config.select = 'wheel'` to scroll and click
  with no cursor at all.
- **Prompts:** stand at a place in `Config.points` and "[E] Open the fridge" shows. Press the key, or hold it when
  the point has a `hold` (a line fills).

It's built from the kit (KeyPrompt and its stack, MenuRow, Spinner) and follows the server's nuikit theme.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=idle|vehicle|picking|person|prompt|hold|several|both, ?fail=1
{{pm}} run build  # production build into web/dist
```

**In game:** `ensure nuikit` first, then `ensure {{name}}`. Hold Left Alt and aim at a car within 3 m: "Open the
trunk" and "Lock or unlock". Walk into the 24/7 on Innocence Blvd: the fridge (press E) and the bell at the counter
(hold G).

**ox_target or qb-target:** don't run this example alongside them on the same key. Left Alt is their default too,
and two eyes on one key fight over the cursor and the controls. Change `Config.key` (players can also rebind it
in Settings → Key Bindings → FiveM, as "Target (hold)"), or stop one of them. The server prints a warning at start
when either is running.

## What does the work

Lua does everything the page draws: the raycast, which options apply, the keys, the hold. The page never decides.

| Marked | What happens |
|---|---|
| `event = 'name'` | A client event, `TriggerEvent(name, entity, optionId)` for an option or `TriggerEvent(name, pointId)` for a point. The example's handlers are at the bottom of `client/main.lua` |
| `server = true` | The client asks `server/main.lua`, which checks it again before anything happens: the option must exist for the kind of entity aimed at, the point must be one of the server's own, the player must be within reach (the server's own position for them, not the client's), and not too often (`cooldown`). Then the matching function in `actions` runs |

Put anything that gives money or items, opens doors for other players, or changes what others see behind
`server = true`, and add your own checks (job, ownership) in its `actions` function.

**Keys:** "Lock or unlock" only works with the vehicle's keys, checked on the server against the plate it reads
from the car. Keys are kept on the server per player and never sent to a client. Your garage or dealership hands
them out when it gives someone a car: `exports['{{name}}']:giveKeys(src, plate)` (and `removeKeys`). To try it,
from the server console: `{{name}}_givekeys <your id> <plate>`.

**OneSync:** the server's distance checks need it. Without it the resource prints a red error at start and every
`server = true` option and point is refused ("This needs OneSync on the server."); the client-only ones still work.

## Files

| | |
|---|---|
| `config.lua` | The key, how to choose, the reach, what can be targeted (`targets`), the prompt places (`points`) |
| `client/main.lua` | Targeting (raycast, options, cursor or wheel), the prompts (keys, holds), the example's client actions |
| `server/main.lua` | The checks for `server = true`, and the example's server actions (lock, bell) |
| `web/src/components/blocks/interaction/` | The block: `interaction.tsx` (UI), `nui.ts` (messages), `fixtures.ts` (every state) |
| `web/src/dev.tsx` | The fake game for browser development |
