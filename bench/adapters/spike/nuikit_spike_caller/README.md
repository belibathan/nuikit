# nuikit_spike_caller

The scripts' side of every spike, so nothing on the server has to be edited:

- `dependency 'qb-menu'` in the manifest: must resolve to `nuikit_spike_standin` (`provide 'qb-menu'`).
- `/spike_menu export | event | close`: calls qb-menu's API the two ways scripts do.
- `/spike_notify local | server | direct`: the notify events locally, from the server, and the direct calls a
  listener can't see.
- `/spike_route page <n> | export <n> | frame <n>`: intents to `nuikit_spike_route` from this resource's page
  (cross-resource NUI callback) and from Lua (export), timed.
- `web/index.html`: the stand-in for the ox_lib override page. Plain HTML + JS (Chromium 103), no build.

Results print as `[nuikit-spike:caller] …` lines; the stand-in and listener print their own. See
[`../README.md`](../README.md) for install and what success looks like.
