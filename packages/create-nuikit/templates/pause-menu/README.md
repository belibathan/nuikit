# {{name}}

A pause menu made with [nuikit](https://github.com/belibathan/nuikit), from the `pause-menu` block.
Esc opens it in place of GTA's pause menu:
- on the left, the server, the actions (resume, map, settings, key bindings, disconnect with a confirm) and your links;
- on the right, the player (name, job, cash, bank) and the server (players online, ping, uptime);
- behind it, the game, blurred.

It's built from the kit (MenuRow, Panel, Stat, Meter) and follows the server's nuikit theme.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=opening|no-character|minimal, ?confirm=1
{{pm}} run build  # production build into web/dist
```

**In game:** `ensure nuikit` first, then `ensure {{name}}`. Press Esc. P still opens GTA's map. Map,
Settings and Key bindings open GTA's own pages and bring this menu back when they close
(`Config.returnToMenu`). Don't run it next to `nuikit_pause`: both want Esc.

## How it behaves

- **It replaces GTA's Esc pause menu.** While this menu can open, `client/main.lua` disables GTA's Esc
  pause control (200) every frame and opens this menu instead. P (control 199) is left alone and still
  opens GTA's own pause menu on the map. Stop the resource and Esc is GTA's again.
- It doesn't open while another UI has focus (chat, a phone, an inventory), while another nuikit modal
  is up, or while the player is dead. In those cases Esc does what it did before.
- Escape closes it through nuikit, so it never fights another UI for Esc. Going down while it's open
  closes it.
- The player comes from nuikit's bridge (Qbox, QBCore, ESX or standalone). Players online, ping and
  uptime come from `server/main.lua`, about once a second at most, when the menu opens.
- Other resources can open it: `exports['{{name}}']:open()`.

## Files

| | |
|---|---|
| `config.lua` | Server name and badge, which actions show, links, `returnToMenu`, the disconnect message |
| `client/main.lua` | Esc, GTA's pages, the blur, what each action does. `nk.surface`, `nk.on`, `nk.player` |
| `server/main.lua` | Players online, ping, uptime, and Disconnect (a client can only drop itself) |
| `web/src/components/blocks/pause-menu/` | The block: `pause-menu.tsx` (UI), `nui.ts` (messages), `fixtures.ts` (every state) |
| `web/src/nui.d.ts` | Your own messages, if you add any |
| `web/src/dev.tsx` | The fake game for browser development |
