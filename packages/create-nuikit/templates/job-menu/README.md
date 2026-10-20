# {{name}}

A job menu made with [nuikit](https://github.com/belibathan/nuikit), from the `job-menu` block.
- **Everyone:** go on or off duty, and run the job's actions (some only on duty, some from a grade up).
- **The boss:** a Staff tab with the job account's balance, everyone who works there (online, on duty), promote
  and demote buttons, fire (with a confirm), and the players standing nearby to hire.

It's built from the kit (Panel, MenuRow, Stat, shadcn Tabs and AlertDialog) and follows the server's nuikit theme.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=officer|off-duty|no-one-nearby|mechanic, ?fail=1
{{pm}} run build  # production build into web/dist
```

**In game:** `ensure nuikit` first, then `ensure {{name}}`. Give yourself a job from the server console with
`{{name}}_setjob <your server id> police 4` (grade 4 is the Chief, the boss), then press F5 or run `/{{name}}`.
For admins in game: `add_ace group.admin command.{{name}}_setjob allow`.

## The server decides, every time

Every button asks `client/main.lua`, which asks `server/main.lua`. The server looks up the caller's own record
on every request and never uses what the page says about it:

| Request | Refused when |
|---|---|
| Duty | You have no job, or the value isn't true or false |
| An action | It isn't one of your job's actions, your grade is below its `minGrade`, or it's on-duty only and you're off duty |
| Hire | You're not the boss of your job; the player isn't online, is you, already works here, or isn't within `Config.hireRadius` of you (checked by the server, needs OneSync) |
| Fire, promote, demote | You're not the boss of your job; they don't work in your job, are you, or hold the boss grade; the new grade doesn't exist or is the boss grade |

A player has one job: hiring someone who works elsewhere moves them to yours. Employees are named to the page
by a short id (`E00012`), never by license. The job account's balance is
shown to the boss and nothing in the menu moves money.

An action the server allows closes the menu and fires `{{name}}:action` on the client (`job, id`) and the
server (`src, job, id`): hook your armory, garage or outfits there. The example's client handler just prints it.

**OneSync:** hiring needs it (the server checks the distance). Without it the resource prints a yellow warning
at start, the boss sees no one nearby, and hiring is refused; everything else works.

## What the example does, and what a real server changes

| | The example | On your server |
|---|---|---|
| Jobs and grades | `Config.jobs` in `config.lua` | Your framework's job list |
| Who works where | `jobs.json` in this resource, per license | Your framework's player jobs: replace `memberOf`, `staffById` and the writes in `server/main.lua` |
| Keeping the framework in step | `Config.sync(src, job, grade, onDuty)` after every change, for online players (commented Qbox, QBCore, ESX lines) | Uncomment yours, or drop it once the store is the framework's |
| The job account | `startBalance`, shown only | Your society or management account |

## Files

| | |
|---|---|
| `config.lua` | Jobs (grades, boss grade, actions), the key, the hire radius, the save file, `Config.sync` |
| `client/main.lua` | Opens the menu and passes on what the page asks for. `nk.surface`, `nk.on` |
| `server/main.lua` | The records and every check: open, duty, action, hire, fire, grade, and `{{name}}_setjob` |
| `web/src/components/blocks/job-menu/` | The block: `job-menu.tsx` (UI), `nui.ts` (messages), `fixtures.ts` (every state) |
| `web/src/dev.tsx` | The fake game for browser development |
