# mm_radio NUI protocol: compatibility spec

Target: drop-in replacement for `mm_radio/build` (mm_radio **v0.2.1**, Qbox fork, commit `a78f350`).
Scope: everything that crosses the boundary between mm_radio's client Lua and its NUI page, plus the UI behaviour the Lua depends on.

> Clean-room note. mm_radio is GPL-3.0. This document describes the wire protocol and observable behaviour in our own words. It doesn't reproduce mm_radio source, markup or styles. Message names, field names, locale keys and small literal values appear only as interface facts.

Conventions:

- **Inbound** means Lua → UI: `SendNUIMessage({ action, data })` (a normal `{ action, data }` envelope).
- **Outbound** means UI → Lua: `fetch('https://<GetParentResourceName()>/<name>', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify(payload) })`. Most callbacks reply `cb('ok')`: a bare string, **not JSON**, so `res.json()` rejects. Swallow it.
- **The UI never sets focus.** Lua does (§4).

---

## 0. Page and files

| Item | Requirement |
|---|---|
| Entry | `ui_page 'build/index.html'`; `files { 'build/**', 'locales/*.json' }`. Relative asset paths (`base: './'`). |
| **Readiness gate** | At start, `shared/init.lua` checks `LoadResourceFile(<resource>, 'build/index.html')`. If it's missing, `Shared.Ready = false` and **every** `SendNUIMessage` is suppressed (the page then never hears anything). Our build must emit `build/index.html`. |
| Resource name | Use `GetParentResourceName()`. The original does too. |
| Transparency | `html`/`body` transparent, no scrollbars. The page covers the whole screen. Only the radio and the member overlay should catch the mouse. |
| External assets | The original bundles a radio-frame image and Font Awesome classes. We draw the radio from theme tokens and lucide icons. |

## 1. Message index

### 1.1 Inbound (Lua → UI)

| action | Sent from | data | Effect |
|---|---|---|---|
| `setRadioVisible` | `mm_radio:client:use` (item use / `=` keybind) | **RadioData** with `maxChannel` (§2) | Store the data and slide the radio in. Sync the overlay toggle from `data.userData.playerlist.show`. |
| `updateRadio` | `Radio:update()` after join, leave, saveData | **RadioData without `maxChannel`** | Replace the data (keep the previous `maxChannel`). Sync the overlay toggle. Can arrive while the radio is hidden. |
| `UpdateTime` | `UpdateTime()` loop while the radio is in use, once per in-game minute | string `"H:MM"` | Update the clock. **Note the capital U** (quirk 1). |
| `setRadioHide` | `mm_radio:client:remove` (after `hideUI`, death, …) | `null` | Slide the radio out and reset to the home screen. The overlay stays. |
| `insideJammer` | jammer zone enter/exit/toggle | boolean | Set `insideJammerZone`: the signal indicator shows "jammed". |
| `notify` | `Radio:Notify(msg, duration)` | `{ msg: string, duration: number }` (ms, default 5000) | Show a transient message in the radio's status bar (replaces the previous one). Only visible while the radio is shown. |
| `updateRadioList` | `mm_radio:client:radioListUpdate(players, channel)`, only when `channel` is the player's current one | **PlayerList**: `{ [serverId: string]: { name: string, isTalking: boolean } }`, or `[]` when empty | Replace the member list. |
| `updateRadioTalking` | pma-voice `radioActive` (self) and `setTalkingOnRadio` (others) | `{ radioId: string (server id), radioTalking: boolean }` | Set `isTalking` on that member, if present. |

### 1.2 Outbound (UI → Lua)

| name | Body | Response | Lua effect |
|---|---|---|---|
| `hideUI` | `{}` | `'ok'` | `mm_radio:client:remove`: focus off, keep-input off, stop the animation, then inbound `setRadioHide`. |
| `join` | channel: **string** (keypad text, e.g. `"12.5"`) or **number** (list entry) | `'ok'` | `tonumber`, then validation: jammer, `1..maxChannel`, already joined, restricted job/gang channel. Feedback arrives as `notify`; success also sends `updateRadio`. The server only accepts channels with **at most 2 decimals**. |
| `leave` | `{}` | `'ok'` | If on a channel: leave, then `updateRadio`. |
| `volumeChange` | volume (number or numeric string, 0–100) | `'ok'` | `tonumber`, pma-voice `setRadioVolume`, `notify` "Volume set to N%". |
| `toggleMute` | volume number: `0` to mute, or the volume to restore | `'ok'` | Same as volumeChange, with notify "Radio Deafened" / "Radio Undeafened" (`0` → deafened). |
| `addFav` | channel number | `'ok'` | Only applied if it equals the current channel. Persisted in KVP. |
| `removeFav` | channel number | `'ok'` | Same condition. |
| `showPlayerList` | boolean | `'ok'` | Persist `userData.playerlist.show`. |
| `updatePlayerListPosition` | `{ x, y }` (px from **right**, px from **top**) | `'ok'` | Persist the overlay position. |
| `updateRadioPosition` | `{ x, y }` (px from **right**, px from **bottom**) | `'ok'` | Persist the radio position. |
| `allowMovement` | boolean | `'ok'` | Persist; `true` → `SetNuiFocusKeepInput(true)` plus a control-disabling loop (look/attack/pause), so the player can walk with the radio open. |
| `enableClicks` | boolean | `'ok'` | Persist; pma-voice `micClicks`. |
| `updateRadioSize` | `{ radio, overlay }` (25–75) | `'ok'` | Persist the size multipliers. |
| `saveData` | `{ name: string, radioId }` | `'ok'`, or **no reply at all** when the player has no citizen id | Persist the call-sign; re-registers on the current channel (the server falls back to the character name when blank) and sends `updateRadio`. Don't await it. |
| `getMutedList` | `{}` | MutedList | pma-voice `getMutedPlayers()`. |
| `togglemutePlayer` | server id (number) | MutedList, or `null` when it's yourself (with a `notify`) | pma-voice `toggleMutePlayer`. |

MutedList: pma-voice's table keyed by server id. JSON makes it an **array** (index `id - 1`) when the ids are contiguous from 1, otherwise an **object** keyed by the id string. Read both.

## 2. RadioData

| Field | Type | Notes |
|---|---|---|
| `radioId` | string \| `false` | `'PERSONAL'` when batteries are off |
| `onRadio` | boolean | On a channel |
| `channel` | number | Current channel; `0` when off |
| `volume` | number | 0–100 (default 30) |
| `favourite` | number[] | Restricted job/gang channels the player may use, **plus** the user's own favourites |
| `recomended` | number[] | (sic) Channels joined this session |
| `maxChannel` | number | `Shared.MaxFrequency` (default 500). **Only in `setRadioVisible`.** |
| `userData` | object | `name`, `favourite` (the user's own only), `overlaySizeMultiplier` (25–75, default 50), `radioSizeMultiplier` (25–75, default 50), `allowMovement`, `enableClicks` (may be absent = false), `playerlist: { show, coords: { x, y } }` (default 15, 40), `radio: { coords: { x, y } }` (default 10, 15) |
| `time` | string | `"H:MM"`, in-game clock |
| `street` | string | Current street name |
| `locale` | object | `lib.getLocales()`: **flattened** keys, e.g. `"ui.header"` |
| `channelName` | `{ [key]: string }` | Labels. A key is either the exact channel text (`"1"`) or `"<int>.%"`, which matches any decimal channel with that integer part |
| `insideJammerZone` | boolean | Signal jammed |
| `battery` | number | 0–100. `<= 0` shows a no-charge screen instead of the radio controls |
| `overlay` | `'default'` \| `'always'` \| `'never'` | `Shared.Overlay` |

Display rules:

- **Channel label**: `channelName[String(ch)]`, else `channelName[int + ".%"]` when `ch` has decimals. With a label: `"<label> [<ch> MHz]"`; without: `"<ch> MHz"`.
- **Scale**: radio scale = `radioSizeMultiplier × 2 / 100` (0.5–1.5); overlay scale = `overlaySizeMultiplier × 2 / 100`.
- **Position**: radio at `right: x px; bottom: y px`; overlay at `right: x px; top: y px`.

## 3. UI behaviour the protocol depends on

| Behaviour | Original | Ours |
|---|---|---|
| Visibility | A sticky "mounted" flag set by the first `setRadioVisible`, plus a shown/hidden slide. | Same: the radio renders after the first `setRadioVisible`; `setRadioHide`/Escape slide it out. |
| Home screen | Header (time, signal/jammer, battery or the current notify), channel status ("IN RADIO" + frequency label + DISCONNECT, or "NOT CONNECTED"), favourite star, mute, volume slider (disabled off-channel; posts on release), nav: Channels, Radio (keypad), and Members (disabled off-channel), or Settings when `overlay == 'never'`; street name. | Same functions, our layout. |
| Favourite star | Shown only on a channel. Not in `favourite` → add. In `favourite` and in `userData.favourite` → remove. In `favourite` only (job channel) → shown filled, not clickable. | Same. We remove the exact channel locally; the original drops the last entry (quirk 4). |
| Mute | Only on a channel. Toggles between 0 and the last volume and posts `toggleMute` with the new volume. | Same. |
| Channels screen | Two lists: favourites and recommended. Each entry posts `join` with the number. | Same (tabs). |
| Keypad screen | Digits, `.`, backspace. Rejects input that would exceed `maxChannel`. A go button posts `join` with the **string**. | Same, plus at most one `.` and two decimals (the server drops anything finer). Enter submits; typed digits work too. |
| Members screen | List with talking dots and per-member mute (`togglemutePlayer`), fetching `getMutedList` on open. Toggle overlay button (`showPlayerList` with the new value). Settings button. Opening Members or Settings **forces** the overlay to show every member. | Same. |
| Settings screen | Radio size slider (posts `updateRadioSize` on release), "Move Radio" (local: enables dragging), "Allow Move" (`allowMovement`), "Radio Sound" (`enableClicks`). When `overlay != 'never'`: call-sign input and overlay size slider. Save posts `saveData` and goes to Members. | Same set. Save goes to Members (or home when `overlay == 'never'`, since Members doesn't exist then). |
| Overlay | Independent of radio visibility. Shown when `playerlist.show` is on, `overlay != 'never'`, and on a channel. Lists members who are talking, or every member when forced (Members/Settings open) or `overlay == 'always'` (non-talking ones dimmed). Draggable while the radio is shown; posts `updatePlayerListPosition`. | Same. We post the position once per drag. |
| Radio drag | Only with "Move Radio" on. Posts `updateRadioPosition`. | Same, once per drag. |
| No charge | `battery <= 0` → a no-charge screen in place of everything. | Same. |
| Off channel | `onRadio` false → member list cleared. | Same. |

## 4. Focus and Escape

| Moment | Who | What |
|---|---|---|
| Use | Lua | `SetNuiFocus(true, true)`, then `setRadioVisible`. With `allowMovement`, also `SetNuiFocusKeepInput(true)`. |
| Escape | UI | While mounted: POST `hideUI` `{}`, slide out, drop the forced overlay. |
| `hideUI` / death | Lua | `SetNuiFocus(false, false)`, keep-input off, `setRadioHide`. |

The UI never calls focus natives. With keep-input on, the game also receives keys. Escape still reaches the page because it has focus.

## 5. Locale keys

From `data.locale` (flattened by ox_lib; we also read a nested `locale.ui.<key>`). English fallbacks from `locales/en.json`:

`ui.header` (IN RADIO), `ui.frequency`, `ui.disconnect`, `ui.notconnected`, `ui.settings`, `ui.channels`, `ui.radio`, `ui.members`, `ui.favorites`, `ui.recommended`, `ui.clear`, `ui.hide_overlay`, `ui.show_overlay`, `ui.save`, `ui.radio_settings`, `ui.move_radio`, `ui.allow_move`, `ui.overlay_settings`, `ui.enableClicks`.

Labels nuikit adds use `ui.nuikit_*` keys with English fallbacks (`ui.nuikit_name` "Call sign", `ui.nuikit_size` "Size", `ui.nuikit_overlay_size` "Overlay size", `ui.nuikit_volume` "Volume", `ui.nuikit_no_charge` "No charge", `ui.nuikit_empty` "Nothing here yet", `ui.nuikit_no_channels` "No channels here yet. Dial one on the keypad.", `ui.nuikit_no_members` "No one else is on this channel yet.", `ui.nuikit_offline_hint` "Pick a channel or dial a frequency.", `ui.nuikit_jammed` "Jammed", `ui.nuikit_back` "Back", `ui.nuikit_join` "Join").

## 6. Quirks

1. **`UpdateTime` vs `updateTime`.** Lua sends `UpdateTime`; the original page listens for `updateTime`, so its clock never ticks after opening. We accept both.
2. **`updateRadio` drops `maxChannel`.** Replacing the data wholesale (as the original does) loses the keypad limit after the first join. We keep the last `maxChannel`.
3. **`'ok'` isn't JSON.** Ignore parse failures. `saveData` may never reply. Don't await it.
4. **Favourite removal.** The original's local update removes the last favourite, not the chosen one. Lua's KVP is right, so the next `updateRadio` fixes it. Ours removes the exact channel.
5. **Talking update for an unknown member.** The original throws when `radioId` isn't in the list (for example before the first `updateRadioList`). We ignore it.
6. **Empty list is `[]`.** An empty Lua table encodes as an array.
7. **Volume strings.** The original posts the slider's string value for `volumeChange` and a number for `toggleMute`. Lua `tonumber`s both. We send numbers.
8. **Sliders post on release.** Size and volume post once on commit, not while dragging.
9. **`addFav`/`removeFav` only apply to the current channel** (Lua checks). The UI only offers the star for the current channel.
10. **Restricted channels in `favourite`** can't be removed (they come from job/gang config every `Radio:Init`).
11. **Position spam.** The original posts `updateRadioPosition` on every mouseup anywhere on the page and `updatePlayerListPosition` whenever the force flag changes. We post only after an actual drag. The stored values are the same.

## 7. Checklist

- [x] `build/index.html` exists (readiness gate).
- [x] Inbound: `setRadioVisible`, `updateRadio`, `UpdateTime`/`updateTime`, `setRadioHide`, `insideJammer`, `notify`, `updateRadioList`, `updateRadioTalking`.
- [x] Outbound: `hideUI`, `join`, `leave`, `volumeChange`, `toggleMute`, `addFav`, `removeFav`, `showPlayerList`, `updatePlayerListPosition`, `updateRadioPosition`, `allowMovement`, `enableClicks`, `updateRadioSize`, `saveData`, `getMutedList`, `togglemutePlayer`.
- [x] Escape → `hideUI` `{}`.
- [x] Channel labels with the `"<int>.%"` rule; keypad limit `maxChannel`, 2 decimals.
- [x] Overlay modes `default` / `always` / `never`; forced while Members/Settings are open.
- [x] Size multipliers and right/bottom, right/top positions.
- [x] Battery ≤ 0 → no-charge screen; jammer indicator.
- [x] Never calls focus natives; transparent body; only the radio and overlay take the mouse.
