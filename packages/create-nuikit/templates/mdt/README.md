# {{name}}

A police and EMS terminal made with [nuikit](https://github.com/belibathan/nuikit), from the `mdt` block. A
functional skeleton:
- **Nav:** Dashboard, People, Vehicles, Reports.
- **Search:** people by name, vehicles by plate; a results list and a record pane (fields, flags as badges, notes).
- **Reports:** read the latest, or write one (title, involved person, text) and file it behind a confirm.

It's built from the kit (Panel, MenuRow, PlayerCard, FormField, Confirm, EmptyState, shadcn Input and Badge) and
follows the server's nuikit theme.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=police|ems|empty, ?fail=1
{{pm}} run build  # production build into web/dist
```

**In game:** `ensure nuikit` first, then `ensure {{name}}`. The example gives every player the `police` job: clock
in with `/{{name}}_duty`, then press F6 or run `/{{name}}`.

## The server decides, every time

The page is only a requester. On every call `server/main.lua` checks:

- the caller has one of `Config.jobs` **and is on duty** (otherwise every call, opening included, is refused);
- the rate limit: searches and record lookups share 12 per 10 s, reports are 3 per minute (`Config.rate`);
- the input: a search is a string of `queryMin` to `queryMax` characters with no control characters; a record is
  asked for by kind and opaque id; a report has a title and a text within their limits, and an involved person
  that is a record the server knows;
- the answer: it searches `Config.records` (or your framework through `Config.lookup`) itself, and sends back
  only whitelisted fields under **opaque ids**. Licences, citizen ids and VINs never leave the server.

A report is stamped on the server with the author's name and the server's time; an `author` or `time` sent by the
page is ignored. Reports are kept in `mdt.json` (the newest `keepReports`) and the newest `showReports` go to the
page.

## What the example does, and what a real server changes

| | The example | On your server |
|---|---|---|
| Who may use it | Everyone is `Config.demoJob`; `/{{name}}_duty` clocks in and out | `Config.player(src)`: name, job and duty from your framework |
| Records | `Config.records` (three people, two vehicles) | `Config.lookup.search` and `.get` over your database, with ids you invent (never a citizen id) |
| Reports | `mdt.json` in this resource | Your database, in `handlers.report` |

## Files

| | |
|---|---|
| `config.lua` | Jobs, limits, rates, demo records, `Config.player` and `Config.lookup` |
| `client/main.lua` | Opens the terminal and passes the page's calls on. `nk.surface`, `nk.on` |
| `server/main.lua` | Every check: job and duty, rate, input, search, report |
| `web/src/components/blocks/mdt/` | The block: `mdt.tsx` (UI), `nui.ts` (messages), `fixtures.ts` (states and demo records) |
| `web/src/dev.tsx` | The fake game for browser development |
