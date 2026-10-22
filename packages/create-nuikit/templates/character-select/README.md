# {{name}}

A character select made with [nuikit](https://github.com/belibathan/nuikit), from the `character-select` block.
- **The screen at join:** the player's characters in their slots (empty slots offer Create), the chosen one as a
  player card (job, money, date of birth, citizen ID), Play and Delete (with a confirm).
- **Where to start:** after Play, a list of spawn points, with "Last location" for characters that have one. The camera
  glides over the highlighted one (nuikit's camera service; `Config.preview = false` keeps the city view).
- **Create:** first and last name, date of birth (18 to 100), gender; checked on the page and again on the server.

It's built from the kit (Panel, MenuRow, PlayerCard, Money, Confirm, the form fields) and follows the server's nuikit
theme.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=three|first|full, ?fail=1
{{pm}} run build  # production build into web/dist
```

**In game:** `ensure nuikit` first, then `ensure {{name}}`, and join: the screen shows before you spawn. `/{{name}}`
brings it back to switch characters (the server saves where you were).

**On Qbox, QBCore or ESX?** They come with their own character screen (qbx_core, qb-multicharacter,
esx_multicharacter): run one or the other. To keep your framework's characters and use this screen, replace the
server's store with your framework's calls and log in from `Config.onPlay`. The server warns at start when one of them
is running.

## The server decides, every time

- **Play:** the character must be one of the caller's own (by license); the spawn point must be one of
  `Config.spawns`, or "last" for a character that has a saved position. The server sends the coordinates; the client
  never chooses where it lands. `Config.onPlay` can refuse.
- **Create:** a free slot; first and last names of 2 to 20 letters (any language; spaces, hyphens and apostrophes
  inside); a real date of birth for an age of 18 to 100; a gender from `Config.genders`; at most one every 3 seconds.
  The citizen ID is made by the server.
- **Delete:** only the caller's own, only from the character screen (not the one being played), and only when
  `Config.allowDelete`.
- **Last location:** taken from the server's own view of the player every minute and when they leave (OneSync); the
  client never sends it. Without OneSync it isn't saved or offered (a warning at start says so).

## Files

| | |
|---|---|
| `config.lua` | Slots, delete, genders, the camera, spawn points, starting money, `Config.onPlay` |
| `client/main.lua` | Shows the screen at join with a camera, teleports where the server says, `/{{name}}` |
| `server/main.lua` | Every player's characters, every check, last locations |
| `web/src/components/blocks/character-select/` | The block: `character-select.tsx` (UI), `nui.ts` (messages), `fixtures.ts` (every state) |
| `web/src/dev.tsx` | The fake game for browser development |
