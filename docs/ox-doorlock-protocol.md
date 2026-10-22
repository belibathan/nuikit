# ox_doorlock NUI protocol — compatibility spec

Target: drop-in replacement for `ox_doorlock/web/build` (ox_doorlock **1.23.0**, overextended; read at commit
`553e85d`, Oct 2026). Scope: everything that crosses the boundary between ox_doorlock's client Lua and its NUI
page: the door editor `/doorlock` opens, and the lock/unlock sounds the page plays.

> Clean-room note. ox_doorlock is GPL-3.0-or-later. This document describes its wire protocol and observable
> behaviour in our own words. It doesn't reproduce its code, markup or styles. Message, callback and field
> names appear only as interface facts. nuikit's implementation (`addons/ox_doorlock`) is MIT.

## 0. Page and files

| Item | Fact |
|---|---|
| Entry | `ui_page 'web/build/index.html'` |
| Served files | `files { 'web/build/index.html', 'web/build/**/*', … }`: everything under `web/build`, subfolders included. |
| Stock build | `index.html`, hashed `assets/*.js` / `assets/*.css`, and `sounds/*.ogg` (four door sounds, from the web app's public folder). |
| Sounds folder | The **server** lists `web/build/sounds/*.ogg` once at resource start (file names without the extension) and hands that list to the page (`setSoundFiles`). The page plays `./sounds/<name>.ogg`. When `Config.NativeAudio` is on, the list comes from `audio/dlc_oxdoorlock/oxdoorlock/*.wav` instead and Lua plays the sounds itself. |
| Our build | `index.html` + `assets/*`. **No `sounds/`**: the override is copied *over* `web/build`, so the stock `sounds/` stays where the server and the page expect it. Old hashed `assets/` files left behind are unreferenced. |
| Focus | Lua owns it: `SetNuiFocus(true, true)` before every `setVisible`; `SetNuiFocus(false, false)` in the `exit`, `createDoor` and `teleportToDoor` callbacks. The page never takes or releases focus itself. |
| Transparency | `html`/`body` transparent; the editor is a single centred window over the game. |

## 1. Inbound (Lua → UI)

`SendNUIMessage` / `SendNuiMessage(json.encode(…))` with an **envelope**: `{ action, data }`.

### `updateDoorData`

Three shapes in `data`, told apart by type:

| `data` | When | Meaning |
|---|---|---|
| the whole door table | Once, the first time the editor opens (before `setSoundFiles` and `setVisible`). | Every door. Encoded from a Lua table keyed by door id, so it arrives as an **array or an object** keyed by id (`with_hole = false`); read its values. |
| one door object (has `id`) | A door was created or edited (any player, only after this client opened the editor once). | Replace the door with that `id`, or append it. |
| a number | A door was deleted (same condition). | Remove the door with that id. |

A door object (every field optional except `id`; Lua `nil` fields are absent):

| Field | Type | Meaning |
|---|---|---|
| `id` | number | Database id. |
| `name` | string | Door name (may be absent: nameless doors). |
| `zone` | string | GTA zone label, computed client-side. |
| `state` | `0` \| `1` | 1 locked, 0 unlocked (a **number**, not a boolean). |
| `passcode` | string | |
| `autolock` | number | Seconds before it relocks. |
| `maxDistance` | number | Interact distance (m). |
| `doorRate` | number | Automatic door speed. |
| `auto`, `lockpick`, `hideUi`, `holdOpen` | boolean | Flags. |
| `lockSound`, `unlockSound` | string | Sound names (see `setSoundFiles`). |
| `items` | `{ name: string, metadata?: string, remove?: boolean }[]` | Items that open it. |
| `characters` | `(string \| number)[]` | Character ids that open it. |
| `groups` | `Record<string, number>` | Group → minimum grade. |
| `lockpickDifficulty` | `("easy" \| "medium" \| "hard" \| { areaSize: number, speedMultiplier: number })[]` | Skill-check sequence. |
| `coords` | `{ x, y, z }` | Centre. |
| `model`, `heading`, `hash` | number | Single door only. |
| `doors` | `[{ coords, heading, model, hash, entity? }, { … }]` | Double door: both leaves. Absent for a single door. |
| `distance`, `entity`, … | any | Client runtime fields. Not shown; passed back untouched on edit (Lua strips them). |

### `setSoundFiles`

`data: string[]`, sound names without extension (`"door-bolt-4"`, …). Once, ~100 ms after the first
`updateDoorData`. Options for the lock and unlock sound selects.

### `setVisible`

`data: number | absent`. Every time `/doorlock` opens the editor (focus is already given). `data` is a door
id when the command was `/doorlock closest` and a door is near: open that door's settings (general section)
if it is in the list, otherwise the list. Absent → show the door list. Not sent while a new door is being
placed (Lua ignores the command then).

### `playSound`

`data: { sound: string, volume: number }`. Any time, editor open or not: a door within 20 m changed state and
`Config.NativeAudio` is off. Play `./sounds/<sound>.ogg` once at `volume` (0–1, Lua caps it at 1; clamp it).
Overlapping sounds are allowed.

## 2. Outbound (UI → Lua)

`POST https://ox_doorlock/<name>` (`GetParentResourceName()`), `Content-Type: application/json`. Every
callback replies `1`; the page ignores replies.

| Callback | Body (JSON) | Sent when | Lua does |
|---|---|---|---|
| `exit` | none (no body) | Escape (keyup) or the close button; the page hides at the same moment. | Releases focus. |
| `createDoor` | the door form (below) | "Confirm door" in the settings; the page hides first. | Releases focus. No `id` → starts placing: a text UI, aim and click the door (two for a double), right click cancels. With `id` → saves the edit. |
| `deleteDoor` | the id (a bare number) | Confirmed "delete" on a list row, or in the settings of an existing door (then back to the list). The page stays open. | Deletes; every client gets `updateDoorData` with the id. |
| `teleportToDoor` | the id (a bare number) | "Teleport to door" on a list row; the page hides first. | Releases focus, teleports (server checks the ace). |
| `notify` | a JSON string: `"Settings copied"` or `"Settings applied"` | Copy settings on a row; apply the copied settings in the form. | `lib.notify({ title = body })`. |

No other request goes to ox_doorlock. The confirm dialogs, sections, search and the clipboard are page-local.

### 2.1 The door form (`createDoor` body)

The form holds the door being edited (all its received fields, `groups` as rows) or, for a new door, these
defaults: name `""`, passcode `""`, autolock `0`, maxDistance `0`, doorRate `0`, lockSound `""`, unlockSound
`""`, the six flags `false`, one empty row each for items, characters, groups and lockpick difficulty, and
**no `id`**. On confirm the body is the form with:

| Field | Sent as |
|---|---|
| `name`, `passcode`, `lockSound`, `unlockSound` | `""` → `null`; absent stays absent. |
| `autolock` | the number, `0`/empty → `null`. |
| `maxDistance` | the number, `0`/empty → `2`. |
| `doorRate` | the number, `0`/empty → `null`. |
| `auto`, `lockpick`, `hideUi`, `holdOpen` | `true`, or `null` when off. |
| `state` | as received (`0`/`1`) until toggled, then a boolean (`true` locked). New door: `false`. Lua accepts `true`/`1` as locked. |
| `doors` | as received (an array for a double door) until toggled, then a boolean. New door: `false`. On a new door `true` means "place two leaves". |
| `items` | rows with a non-empty `name`: `{ name, metadata, remove }`, `metadata ""` → `null`, `remove` off → `null`. May be `[]`. |
| `characters` | non-empty rows; a row that is a number (`"12"`) is sent as the number `12`. May be `[]`. |
| `groups` | an object `{ [name]: grade }` from rows with a name (grade empty → `0`). May be `{}`. |
| `lockpickDifficulty` | rows that aren't empty: `"easy" \| "medium" \| "hard"` or `{ areaSize, speedMultiplier }`. May be `[]`. |
| `id`, `zone`, `coords`, `model`, `heading`, `hash`, `doors`, `distance`, … | passed through untouched when editing; absent on a new door. |

Lua turns empty `items`/`characters`/`groups`/`lockpickDifficulty` into nil.

**Apply copied settings** replaces the form with the copied door's settings (passcode, autolock, items,
characters, groups, maxDistance, doorRate, sounds, the flags, `state`, `doors`, lockpick difficulty) and an
empty name, and drops everything else, `id` included: confirming it places a **new** door with those settings
(upstream behaviour, kept). It POSTs `notify "Settings applied"`.

## 3. Behaviour

- **Views.** A door list (id, name, zone; search on name and zone; a "new door" action; per door: settings,
  copy settings, teleport, delete) and the door settings in sections: General (name, passcode, autolock
  seconds, interact distance, door rate; locked, double, automatic, lockpick, hide UI, hold open), Characters,
  Groups (name + grade rows), Items (name rows; metadata type and "remove on use" per row), Lockpick (only
  when lockpick is on; easy/medium/hard/custom rows, custom = area size in degrees ≤ 360 + speed multiplier),
  Sound (lock and unlock sound, clearable). A back action returns to the list.
- **Visibility.** The page hides itself before `exit`, `createDoor` and `teleportToDoor`; `deleteDoor` and
  `notify` keep it open. It reopens only on `setVisible`. The list keeps its doors between opens.
- **Escape.** Upstream: any Escape keyup closes everything and POSTs `exit`. nuikit: Escape inside a dialog
  (delete confirm, item options, lockpick row) closes that dialog only (no POST); otherwise it closes the editor
  and POSTs `exit`, as upstream.
- **Delete from the settings** is disabled for a new door (no id).

## 4. nuikit behaviour notes

- One edge sheet on the right (the overrides' editor surface): the list is the first page, a door's settings a
  sub-page with a back button; sections are tabs in the sheet. Confirm dialogs are the registry `confirm`.
- Theme: the page asks the `nuikit` resource for the compiled theme (`POST https://nuikit/theme`, then a
  long-poll), falling back to `nuikit/theme.css`; these requests go to `nuikit`, never to ox_doorlock.
- `<meta name="nuikit-handshake" content="off">`: no `nuikit:ready` POST to ox_doorlock.
