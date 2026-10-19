# qbx_idcard NUI protocol — compatibility spec

Target: drop-in replacement for `qbx_idcard/web` (qbx_idcard **1.0.0**, Qbox-project, based on um-idcard).
Scope: everything that crosses the boundary between qbx_idcard's client Lua and its NUI page.

> Clean-room note. qbx_idcard is GPL-3.0. This document describes its wire protocol and observable
> behaviour in our own words. It doesn't reproduce its code, markup or styles. Message, field and file
> names appear only as interface facts. nuikit's implementation (`addons/qbx_idcard`) is MIT.

## 0. Page and files

| Item | Fact |
|---|---|
| Entry | `ui_page 'web/index.html'` |
| Served files | A fixed list: `web/index.html`, `web/css/style.css`, `web/js/*.js`, `web/flags/*.png`, `web/badges/*.png`, `lang/global.js`. Anything else is **not served**. |
| Our build | `index.html`, `css/style.css`, `js/main.js` (one bundle, no chunks, no other assets; the Vite config fails the build otherwise). Copied over `web/`, it replaces the stock page, stylesheet and entry script. The stock `js/config.js` and `js/fetchNui.js` stay but are no longer loaded. `flags/` and `badges/` are kept and used. |
| Labels | `lang/global.js` (resource root) is an ES module exporting `Global` with keys `lang_header`, `lang_lastname`, `lang_firstname`, `lang_citizenid`, `lang_dob`, `lang_sex`, `lang_nat`. From `web/js/main.js` it's `../../lang/global.js`. nuikit imports it at runtime when present and falls back to English. |
| Focus | Lua sets `SetNuiFocus(true, false)` + `SetNuiFocusKeepInput(true)` when a card arrives: keyboard reaches the page, no cursor, the player can still move. |
| Transparency | `html`/`body` transparent, no scrollbars. |

## 1. Inbound (Lua → UI)

`SendNUIMessage({ type = ..., ... })`: the page switches on `event.data.type` (not `action`).

### `configData`

Sent ~2 s after the resource starts and on `QBCore:Client:OnPlayerLoaded`.

| Field | Type |
|---|---|
| `configData` | `config/shared.lua`: `{ idCardSettings: { closeKey: string, autoClose: { status: boolean, time: number } }, licenses: Record<cardtype, { header: string, background: string, backgroundImage?: string, prop?: string, badge?: string }> }` |

Shallow-merged over the page's defaults (`closeKey` "Backspace", autoClose off, the four stock card
types `id_card`, `driver_license`, `weaponlicense`, `lawyerpass`).

### `playerData`

Sent when a card is shown to this player (their own, or one shown to them by a nearby player). Lua
ignores it while a card is already open.

| Field | Type | Notes |
|---|---|---|
| `playerData.cardtype` | string | Item name; key into `licenses`. Unknown keys must still render. |
| `playerData.firstname`, `lastname` | string | |
| `playerData.citizenid` | string | |
| `playerData.birthdate` | string | As stored, e.g. `1990-01-01`. |
| `playerData.sex` | string | `"Male"`/`"Female"` from the server event; `"M"`/`"F"` from the metadata export path. Display as given. |
| `playerData.nationality` | string | |
| `playerData.mugShot` | string | `data:image/...;base64,...` from MugShotBase64, validated server-side (≤ 512 KB). Only sent when valid. |
| `playerData.badge` | `"none"` \| `{ img: string, grade: string }` \| nil | `img` names `web/badges/<img>.png`; `grade` is the job grade name. |

`licenses[cardtype].header` is the card title; `background` is a CSS colour identifying the type (nuikit
uses it as an accent, converted to rgba for Chromium 103). `backgroundImage` is a remote URL the stock
UI paints behind the card; nuikit doesn't use it.

## 2. Outbound (UI → Lua)

| Callback | When | Body | Reply |
|---|---|---|---|
| `closeIdCard` | `keydown` whose `key` equals `idCardSettings.closeKey`; and after `autoClose.time` ms when `autoClose.status` is true | none (`fetch` with no body) | `1` |

URL `https://${GetParentResourceName()}/closeIdCard`, `POST`, `Content-Type: application/json; charset=UTF-8`.
Lua releases NUI focus on it. Like the stock page, the close key posts even if no card is visible,
so focus can always be released.

Besides `closeIdCard`, nuikit's page makes one request: nuikit-core's one-time `nuikit:ready` POST at
startup (as in the ox_lib addon). qbx_idcard doesn't register it, so it goes unanswered and is ignored.

## 3. Layout of the stock UI (for placement parity)

Vertically centred on the right edge, `3vh` from it, about 43 vh wide; the job badge (if any) sits to
the left of the card. nuikit keeps that anchor and shows a hint for the close key under the card.
