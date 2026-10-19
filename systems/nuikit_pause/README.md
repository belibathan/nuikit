# nuikit_pause

The pause menu for `[nuikit]`. **Esc** opens it in place of GTA's pause menu: your server's name, Resume, Map, Settings, Key bindings, Help and Disconnect on the left, the player's card (name, job, cash, bank, server ID, players online) on the right. Built from stock shadcn components and themed by `nuikit/theme.css`.

**P** still opens GTA's own pause menu, and **Map** / **Settings** / **Key bindings** open the game's real pages, so nothing the game offers is lost.

Works on **Qbox**, **QBCore**, **ESX** or **standalone**: the player card comes from `client/bridge.lua`, detected automatically (force one with `setr nuikit_framework qbox`).

## Install

1. Put it in `resources/[nuikit]/` next to the `nuikit` resource.
2. Remove any other resource that replaces the Esc menu (another custom pause menu would fight over Esc).
3. `ensure nuikit` then `ensure nuikit_pause`.

## What it does

| | |
|---|---|
| Esc | Opens the menu. Esc again, or Resume, closes it. |
| P | GTA's pause menu, untouched. |
| Map | Closes the menu and opens GTA's pause menu on the map. |
| Settings | GTA's settings page. |
| Key bindings | FiveM's key bindings page. |
| Help | A list of your server's keys (from `config.lua`). |
| Disconnect | Asks first, then the server drops the player with your message. A player can only ever disconnect themselves. |

It stays out of the way: Esc is left to the game (and nothing is opened) while GTA's own pause menu is open, while any UI has NUI focus (chat input, a phone, an inventory), while another nuikit modal or the death screen is up, and while the player is dead or downed. While it's open it hides the nuikit HUD and blurs the world with GTA's own screen blur.

Other resources can open it: `exports.nuikit_pause:open()`, `close()`, `isOpen()`.

## Config

`config.lua`:

- `server`: `name`, `tagline`, and `logo` (short text in a badge, `''` to hide it).
- `links`: label + value rows at the bottom (Discord, website). The game can't open a browser, so they're for reading.
- `buttons`: which actions appear, in order: `resume`, `map`, `settings`, `keybinds`, `help`, `disconnect`. Remove one to hide it (its callback is refused too).
- `help`: the keys on the Help page.
- `disconnectReason`: the message shown after Disconnect.
- `frontend`: the GTA frontend menus used for Map / Settings / Key bindings.

## How it works

- Every frame (outside the cases above) `DisableControlAction(0, 200)` holds Esc (`INPUT_FRONTEND_PAUSE_ALTERNATE`) back from the game, and `IsDisabledControlJustPressed(0, 200)` opens the menu. P (199) is never touched. `SetPauseMenuActive(false)` runs on the frame it opens and while it's open.
- A 400 ms quiet window after the menu or GTA's pause menu closes stops one Esc press from closing one and opening the other.
- Map: `ActivateFrontendMenu(FE_MENU_VERSION_MP_PAUSE)` then `PauseMenuceptionGoDeeper(0)`. Settings: `FE_MENU_VERSION_LANDING_MENU`. Key bindings: `FE_MENU_VERSION_LANDING_KEYMAPPING_MENU`.
- The surface is `layer = 'modal'`, `input = 'full'`, `exclusive`, `hides = { 'hud' }`, `blockedBy = { 'dead' }` (`nuikit_death` sets that state).
- `server/main.lua` answers the player count (`#GetPlayers()` / `sv_maxclients`) each time it opens, and handles Disconnect with `DropPlayer`.

## Verified

- Lua logic in Lua 5.4 with mocked natives (`packages/core/test/lua/pause.test.ts`): Esc opens it, focus and HUD hiding, the blocked cases, the quiet window, Map/Settings natives, hidden buttons refused, Disconnect, exports.
- UI: typecheck, build, and screenshots of every state in the browser.

## Check in game

- Esc opens this menu and not GTA's on your game build; P still opens GTA's.
- Map lands on the map tab (if a build lands on the header instead, try `PauseMenuceptionGoDeeper(149)` or tune `frontend.map`).
- Settings and Key bindings open the right pages.
- Closing GTA's pause menu with Esc doesn't fall through into this one.
- The world blur (`TriggerScreenblurFadeIn`) fades in and out cleanly, including after Map.

## Edit it

The UI is a normal Vite + React + shadcn app in `web/`. Components live in `web/src/components/ui`; motion and the scrim are in `web/src/pause.css`.

```bash
cd web && npm install && npm run dev   # browser, with devtools (press `); ?fixture=civilian, nocharacter, minimal, loading
npm run build                          # writes web/dist for the game
```

Made by [@belibathan](https://github.com/belibathan).
