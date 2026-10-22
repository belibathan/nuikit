# {{name}}

A job tracker made with [nuikit](https://github.com/belibathan/nuikit), from the `job-tracker` block.
- **The panel:** the job's name and pay, its steps as rows (done, current, locked), the current step as a meter
  (a count like "3 / 5 parcels", or the distance), and a key prompt for its action. It docks at the right edge.
- **Manage:** press J (or `/{{name}}manage`) to focus the panel and **Abandon job**, behind a confirm.

It's built from the kit (Panel, MenuRow, Meter, KeyPrompt, Confirm, Money) and follows the server's nuikit theme.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=loading|driving|start|done, ?fail=1
{{pm}} run build  # production build into web/dist
```

**In game:** `ensure nuikit` first, then `ensure {{name}}`. Stand at the sorting office in Elysian Island and press
E (or run `/{{name}}`) to take the Parcel run; press E at each step's place to do it.

## The server decides, every time

The page and the client only ask: take a job by id, report a step, abandon. On every request `server/main.lua`
checks, against `Config.jobs`:

- the job exists, the player has no other job, and has the job and grade it asks for (`Config.player`; a job that
  asks for one is refused when `Config.player` is missing);
- the player is at the job's start, or at the current step's place (the server's own position; needs OneSync);
- the step reported is the **current** one: a done, a later or an unknown step is refused;
- a step with `item` needs the player to hold the items (`Config.items.count`), and takes them when it completes;
- a step with `count` takes that many reports before it completes;
- the pay is the job's (`Config.jobs`), paid **once**, when the last step completes: the job is cleared before it
  pays, and a payment that fails puts the job and the items back;
- one request at a time per player, and at least `Config.minInterval` ms between them.

Nothing about places, pay or counts comes from the page, and no identifier is sent to it.

**OneSync:** the position checks need it. Without it the resource prints a red error at start and every request
is refused.

## What the example does, and what a real server changes

| | The example | On your server |
|---|---|---|
| Player job | None: the example job asks for none | `Config.player` (Qbox, QBCore, ESX lines) |
| Pay | Cash per license in `jobtracker.json` | `Config.money.add` |
| Items | A bag per license in `jobtracker.json` (starts with 3 parcels) | `Config.items` (ox_inventory lines) |
| Progress | In memory; ends when the player leaves | Keep it in your database if it should last |

## Files

| | |
|---|---|
| `config.lua` | The jobs (start, steps, places, pay, required job), the keys, `Config.player`, `Config.money`, `Config.items` |
| `client/main.lua` | Shows the panel, turns the key into requests, passes the page's calls on. `nk.surface`, `nk.on` |
| `server/main.lua` | Every check above, progress and pay |
| `web/src/components/blocks/job-tracker/` | The block: `job-tracker.tsx` (UI), `nui.ts` (messages), `fixtures.ts` (every state) |
| `web/src/dev.tsx` | The fake game for browser development |
