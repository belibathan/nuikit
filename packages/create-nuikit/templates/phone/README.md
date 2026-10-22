# {{name}}

A phone made with [nuikit](https://github.com/belibathan/nuikit), from the `phone` block.
- **The shell:** anchored bottom right, with a status bar (time, signal), a home screen of app icons and an app frame with a back action.
- **Contacts:** a list of rows; add a contact with a name and a number; open one to message them.
- **Messages:** your threads, a thread, send a text.

It's built from the kit (Panel, MenuRow, TextField, EmptyState, shadcn Button and Input) and follows the
server's nuikit theme.

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `), ?fixture=full|empty|weak, ?fail=1
{{pm}} run build  # production build into web/dist
```

**In game:** `ensure nuikit` first, then `ensure {{name}}`. Press F1 (or run `/{{name}}`). Escape leaves a
thread, then the app, then closes the phone.

## The server decides, every time

The page checks what it can so the player sees what's wrong before asking, but it only ever says *what* to do
("add this name and number", "send this text to this number"). It never says whose phone it is or who a text is
from. `server/main.lua` checks, on every request:

- the player may have a phone (`Config.hasPhone`, if set) and has a number: the server assigns it the first time they
  open the phone, by their license, and never sends the license to the page;
- the player isn't spamming: at most `Config.rate.max` requests per `Config.rate.window` seconds, per player (refused
  requests count too);
- a contact has a name of 1 to `Config.maxName` characters, a valid number that isn't the player's own or already
  saved, and no more than `Config.maxContacts` contacts;
- a text goes to a number that is in service, not the player's own, and is a string of 1 to `Config.maxText`
  characters without control characters (surrounding spaces are trimmed);
- the sender and the time are stamped by the server; the text is stored on both ends (the newest
  `Config.maxMessages` per thread, at most `Config.maxThreads` threads) and pushed to the target's phone if they're online.

## Persistence

Numbers, contacts and messages live in memory in `server/main.lua` and reset when the resource restarts. To
keep them, load `players` from your database at the top and save it in `touch()`, which runs after every change.
A number is "in service" once its owner has opened their phone, so after a restart load the numbers with the players.

## Adding an app

An app is an entry in the `PHONE_APPS` list in `web/src/components/blocks/phone/phone.tsx`:

```tsx
function NotesApp({ data, setBack }: PhoneAppProps) {
  // render rows; call fetchNui("notes:save", …) for your own Lua callback
  // setBack(() => closeThisView) while an inner view is open, setBack(null) when it's closed
}
const PHONE_APPS: PhoneApp[] = [
  // …Contacts and Messages,
  { id: "notes", label: "Notes", icon: NotebookIcon, Component: NotesApp },
]
```

It appears on the home screen. `open("messages", { number })` jumps to another app. Declare your callbacks in
`nui.d.ts` (`NuiCallbacks`), answer them in `client/main.lua` with `nk.on`, and keep the rules on the server like
this template does: look things up there, validate, rate-limit.

## Files

| | |
|---|---|
| `config.lua` | The key, number prefix, limits, rate limit, `Config.hasPhone` |
| `client/main.lua` | Opens the phone, passes changes on, shows an arriving text. `nk.surface`, `nk.on` |
| `server/main.lua` | Numbers, contacts, messages and every check |
| `web/src/components/blocks/phone/` | The block: `phone.tsx` (shell and apps), `nui.ts` (messages), `fixtures.ts` (every state) |
| `web/src/dev.tsx` | The fake game for browser development |
