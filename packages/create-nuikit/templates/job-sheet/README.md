# {{name}}

A job sheet made with [nuikit](https://github.com/belibathan/nuikit), from the `job-sheet` block: the one frame
for a job's menu, so a resource never designs its own (`docs/design.md`, Surfaces).
- A **floating sheet** on the right (or left: `side`), inset from the screen edges, with a header row (the job,
  your grade, on or off duty).
- **Sections of rows** (48px, hairlines, one scrolling column). A row runs something, or opens a **sub-page in
  place** with a back row; Escape goes back, then closes.
- An **actions row** along the bottom with one primary (clock out, take the kit).

The pages are plain tables in `config.lua`; the server builds what each player sees from their own grade.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=officer|off-duty|mechanic, ?fail=1
{{pm}} run build  # production build into web/dist
```

**In game:** `ensure nuikit` first, then `ensure {{name}}`. Give yourself a job from the server console with
`{{name}}_setjob <your server id> police 1`, then press F5 or run `/{{name}}`.
For admins in game: `add_ace group.admin command.{{name}}_setjob allow`.

## The server decides, every time

Every row asks `client/main.lua`, which asks `server/main.lua`. The server looks up the caller's own record on
every request and never uses what the page says about it:

| Request | Refused when |
|---|---|
| Open | You have no job. Rows above your grade (`minGrade`) are not sent at all |
| Duty | You have no job, or the value isn't true or false |
| A row or action | It isn't on that page of your job, it opens a sub-page (the page does that itself), your grade is below its `minGrade`, it's disabled, or it's on-duty only and you're off duty |
| Anything | Another request of yours is still running (one at a time) |

Nothing from the record but the job's name, label, grade label and duty reaches the page: no license, no id.

A row the server allows closes the sheet and fires `{{name}}:action` on the client (`job, id`) and the server
(`src, job, id`): hook your armory, garage or outfits there. `clockin` and `clockout` are built in: they only
change duty and the sheet stays open with a fresh snapshot.

## What the example does, and what a real server changes

| | The example | On your server |
|---|---|---|
| Jobs, grades and pages | `Config.jobs` in `config.lua` | Keep the pages; take the grades from your framework |
| Who works where | `jobs.json` in this resource, per license | Your framework's player jobs: replace `memberOf` and the writes in `server/main.lua` |
| Keeping the framework in step | `Config.sync(src, job, grade, onDuty)` after a duty change (commented Qbox, QBCore, ESX lines) | Uncomment yours, or drop it once the store is the framework's |

## Files

| | |
|---|---|
| `config.lua` | Jobs (grades, pages of sections of rows, actions), the key, the save file, `Config.sync` |
| `client/main.lua` | Opens the sheet and passes on what the page asks for. `nk.surface`, `nk.on` |
| `server/main.lua` | The records and every check: open, duty, row, and `{{name}}_setjob` |
| `web/src/components/blocks/job-sheet/` | The block: `job-sheet.tsx` (UI), `edge-sheet.tsx` (the frame), `nui.ts` (messages), `fixtures.ts` (every state) |
| `web/src/dev.tsx` | The fake game for browser development |
