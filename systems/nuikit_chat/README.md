# nuikit_chat

A theme for the cfx `chat` resource, in the same shadcn look as every other nuikit UI and coloured by your server's `nuikit/theme.css`. Messages become cards, notices get an icon and a tone, the input and command suggestions look like shadcn's Input and Popover. Replaces **qbx_chat_theme** (Qbox) or any other chat theme.

It's a theme, not a new chat: chat's Lua, commands, modes, suggestions and every script that sends messages keep working as they are.

## Install

1. Put it in `resources/[nuikit]/` next to the `nuikit` resource.
2. Stop the theme it replaces. Qbox starts `qbx_chat_theme` through a category, so add `stop qbx_chat_theme` after the category's `ensure` in server.cfg. Chat loads the theme of every started resource at once, so only one should run.
3. `ensure nuikit` then `ensure nuikit_chat` (after `chat`).

Without the `nuikit` resource it uses the stock shadcn neutral dark theme built into `theme/style.css`.

## Templates

Chat's own ids are restyled (`default`, `defaultAlt`, `print`), so every `chatMessage` / `chat:addMessage` already looks right. More ids for your scripts:

```lua
TriggerClientEvent('chat:addMessage', src, { templateId = 'success', args = { 'Vehicle stored.' } })
-- system · info · success · warning · error  (one argument: the text)
-- join · quit                                (one argument: the line, as a quiet pill)
-- user                                       (author + text, like default; Qbox resources send it)
```

`^0`–`^9` colour codes and `^*` / `^_` / `^~` / `^r` styles work inside every template. Messages with a script's own `template` markup are left as the script wrote them.

qbx_chat_theme also turned off chat's built-in join/quit lines and posted its own. With it stopped, chat's `chat_showJoins` / `chat_showQuits` convars apply again.

## How the theme gets in

The chat page belongs to the `chat` resource, so nuikit can't build it. The `chat_theme` entry in `fxmanifest.lua` gives chat a stylesheet, a script and the templates:

- `theme/style.css` styles chat's DOM (`.chat-window`, `.msg`, `.chat-input`, `.suggestions`) using only `--nk-*` variables, with the stock neutral values built in.
- `theme/theme.js` fetches `https://cfx-nui-nuikit/theme.css`, takes its `:root` and `.dark` variables, converts every colour to `rgb()` (FiveM's Chromium 103 can't read `oklch()`) and sets them as `--nk-*` on the page. Edit `theme.css` and restart `nuikit_chat` (or reconnect) to see a new theme.

theme.js also gives the input the kit's smooth caret and typing (the caret glides and breathes in the primary, typed characters ease in). It only draws over chat's own textarea, so keys, history and sending are chat's; reduced motion (the OS setting or the player's nuikit pref) leaves the plain field.

No build step: edit the two files directly. The conversion is tested against nuikit-core in `packages/core/test/chat-theme.test.ts`.

## License

MIT, by [@belibathan](https://github.com/belibathan). Written for chat's public theme interface; contains no code from qbx_chat_theme.
