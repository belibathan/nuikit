# ox_lib NUI protocol — compatibility spec

Target: drop-in replacement for `ox_lib/web/build` (ox_lib **v3.40.3**, commit `1f87a022`).
Scope: everything that crosses the boundary between ox_lib's client Lua and its NUI page, plus the UI behaviour the Lua side depends on.

> Clean-room note. ox_lib is LGPL-3.0. This document describes the wire protocol and observable behaviour in our own words. It doesn't reproduce ox_lib source. Identifiers, field names, message names and small literal values appear only as interface facts.

Conventions used below:

- **Inbound** means Lua → UI: `SendNUIMessage({ action, data })`, received in the page as a `window` `message` event whose `event.data` is `{ action: string, data: any }`.
- **Outbound** means UI → Lua: `fetch('https://ox_lib/<name>', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify(payload) })`. Every ox_lib handler except `getConfig` and `radialTransition` replies with `1`.
- Indexes: the UI always sends **0-based** indexes. Lua adds 1 itself. Never send 1-based indexes.
- Lua `nil` arrives as an absent key. A JS `undefined` inside an array becomes JSON `null`, which Lua reads as `nil` (it leaves a hole in the table).
- "Focus" means the `SetNuiFocus(hasFocus, hasCursor)` and `SetNuiFocusKeepInput(keep)` natives. **The UI never sets focus. Lua does all of it** (see §2).

---

## 0. Page and transport basics

| Item | Requirement |
|---|---|
| Entry | `ui_page 'web/build/index.html'`; `files` includes `web/build/**/*`. The build must be self-contained, with relative asset paths (the original uses base `./`). |
| Resource name | `GetParentResourceName()` returns `ox_lib`. Build callback URLs from it (`https://${GetParentResourceName()}/${name}`). |
| Response parsing | The original calls `resp.json()` on every response. Lua replies with `1`, an object (getConfig) or a boolean (radialTransition). |
| Message routing | One global `message` listener that switches on `event.data.action`. Ignore unknown actions. |
| Global side effect (optional parity) | The original captures `fetch` privately, then replaces `window.fetch` with a no-op and `window.XMLHttpRequest` with that same no-op. Other scripts on the page therefore can't make requests. Not needed for protocol parity. |
| Transparency | `html`/`body` background must be transparent. No scrollbars (`overflow: hidden`). |
| Fonts | The original bundles Roboto and Roboto Mono. Visual only. |
| Theme | Dark colour scheme, Mantine v5 palette semantics (see §4.3). |

### 0.1 Startup handshake

| Step | Direction | Name | Body | Effect |
|---|---|---|---|---|
| 1 | UI → Lua | `init` | none (body `undefined`) | Lua replies `1`, then **sends inbound `setLocale`** with the full locale JSON for the player's locale. The original posts `init` from its root render function, so it may fire more than once. That is harmless because Lua answers each time. Posting it once on mount is enough. |
| 2 | UI → Lua | `getConfig` | none | Lua **responds** (as the fetch response, not via a message) with `{ primaryColor: string, primaryShade: number }`. |

**Config fields** (`getConfig` response):

| Field | Source | Default (Lua) | UI default before response | Meaning |
|---|---|---|---|---|
| `primaryColor` | convar `ox:primaryColor` | `'blue'` | `'blue'` | A Mantine colour **name**: `dark`, `gray`, `red`, `pink`, `grape`, `violet`, `indigo`, `blue`, `cyan`, `teal`, `green`, `lime`, `yellow`, `orange`. |
| `primaryShade` | convar `ox:primaryShade` (int) | `8` | `6` | 0–9, the palette index used for "primary". |

Primary colour/shade is used by: the progress bar fill, the progress circle ring, the radial hover sector and centre button (centre hover uses shade − 1), the skill-check target arc, the alert confirm button (light variant, only when `cancel` is true), the input dialog confirm button (light variant), and the default Mantine focus/accent colours.

There are no other config fields. Related convars that affect the UI only indirectly (Lua-side):

| Convar / KVP | Effect |
|---|---|
| `ox:locale` (default `en`) | Server default locale. |
| `ox:userLocales` (default 1) | When 1, the per-player KVP `locale` overrides the server default. |
| KVP `notification_position` (default `'top-right'`) | Lua fills `position` on every `notify` that has none. |
| KVP `notification_audio` | Lua plays `sound` itself. `sound` is stripped before sending. |
| `ox:progressPropLimit` | Lua only. |

---

## 1. Message index

### 1.1 Inbound (Lua → UI)

| action | Feature | data |
|---|---|---|
| `setLocale` | locale | full locale object (§13) |
| `notify` | notifications | NotifyData (§3) |
| `showContext` | context menu | ContextData (§4) |
| `hideContext` | context menu | none |
| `setMenu` | list menu | MenuData (§5) |
| `closeMenu` | list menu | none |
| `openRadialMenu` | radial | RadialData or `false` (§6) |
| `refreshItems` | radial | RadialItem[] (handled by the original UI, **never sent by v3.40.3 Lua**) |
| `openDialog` | input dialog | InputData (§7) |
| `closeInputDialog` | input dialog | none |
| `sendAlert` | alert dialog | AlertData (§8) |
| `closeAlertDialog` | alert dialog | none |
| `progress` | progress bar | `{ label?, duration }` (§9) |
| `circleProgress` | progress circle | `{ duration, position?, label? }` (§9) |
| `progressCancel` | progress (both) | none |
| `startSkillCheck` | skill check | `{ difficulty, inputs? }` (§10) |
| `skillCheckCancel` | skill check | none |
| `textUi` | text UI | TextUIData (§11) |
| `textUiHide` | text UI | none |
| `setClipboard` | clipboard | `string` (§12) |

Dev-only (browser debug fixtures, never sent in game; ignore): `loadLocales`. The original's developer drawer only replays the inbound actions above.

### 1.2 Outbound (UI → Lua)

| name | Body | Lua response | Sent when |
|---|---|---|---|
| `init` | none | `1` (+ inbound `setLocale`) | page load |
| `getConfig` | none | `{primaryColor, primaryShade}` | page load |
| `openContext` | `{ id: string, back: boolean }` | `1` | submenu / back navigation in a context menu |
| `clickContext` | `string` (option key) | `1` | context option clicked |
| `closeContext` | none | `1` | context closed by the user (X / Escape) |
| `confirmSelected` | `[selected, scrollIndex]` | `1` | list menu Enter |
| `changeSelected` | `[selected, value, kind]` | `1` | list menu highlight changed (debounced) |
| `changeIndex` | `[selected, scrollIndex]` | `1` | list menu side-scroll (debounced) |
| `changeChecked` | `[selected, checked]` | `1` | list menu checkbox toggled (debounced) |
| `closeMenu` | `'Escape'` \| `'Backspace'` | `1` | list menu closed by the user |
| `radialClick` | `number` (absolute 0-based item index) | `1` | radial item clicked |
| `radialBack` | none | `1` | radial back from a submenu |
| `radialClose` | none | `1` | radial closed via the centre button |
| `radialTransition` | none | `true` \| `false` (after ~100 ms) | radial page change |
| `inputData` | `any[]` or **no body** | `1` | input dialog submit / cancel |
| `closeAlert` | `'confirm'` \| `'cancel'` | `1` | alert dialog button / Escape |
| `progressComplete` | none | `1` | progress bar/circle finished hiding |
| `skillCheckOver` | `boolean` | `1` | skill check finished |

---

## 2. Focus ownership (who calls SetNuiFocus)

The UI must **not** try to grab or release NUI focus. Lua does it. The table shows what each feature does, so the UI can expect the right input conditions.

`lib.setNuiFocus(allowInput, disableCursor)` means `SetNuiFocus(true, not disableCursor)` plus `SetNuiFocusKeepInput(allowInput)`. Lua remembers the previous keep-input value and restores it on reset. `lib.resetNuiFocus()` means `SetNuiFocus(false, false)` plus restoring keep-input.

| Feature | On open | Cursor | Game keeps input? | Released by Lua when |
|---|---|---|---|---|
| Context menu | `setNuiFocus(false)` | yes | no | `clickContext` that triggers an action, `closeContext`, `lib.hideContext` |
| List menu | `setNuiFocus(not disableInput, true)` | **no** | yes unless `disableInput = true` | `confirmSelected` (unless the option has `close = false`), `closeMenu` callback, `lib.hideMenu` |
| Radial | `setNuiFocus(true)` + cursor centred | yes | **yes** | item click without `menu`/`keepOpen`, `radialClose`, `lib.hideRadial` |
| Input dialog | `setNuiFocus(false)` | yes | no | `inputData`, `lib.closeInputDialog` |
| Alert dialog | `setNuiFocus(false)` | yes | no | `closeAlert`, `lib.closeAlertDialog` |
| Skill check | `setNuiFocus(false, true)` | **no** | no | `skillCheckOver` |
| Progress, notify, text UI, clipboard | no focus | — | — | — |

Keyboard events still reach the page while it has focus, including with keep-input on. That is how list menu arrows and skill-check keys work.

---

## 3. Notifications — `notify`

### 3.1 Inbound `notify` data

Lua (`lib.notify`) clones the caller's table, removes `sound`, sets `position` to the player's saved position if the caller gave none, and sends it. `lib.defaultNotify` (v2 compatibility) copies `status` into `type` (and turns `'inform'` into `'info'`) before calling `lib.notify`. The server event `ox_lib:notify` feeds the same path.

| Field | Type | Default (UI) | Behaviour |
|---|---|---|---|
| `id` | string \| number | none | Converted to a string and used as the toast id. **A toast with the same id that is still on screen is updated in place and its timer restarts** (de-dupe and replace). No id means a fresh toast every time. |
| `title` | string | — | Plain text, weight 500. |
| `description` | string | — | **Markdown** (CommonMark, *no* GFM). Headings h1–h3 are mapped to themed titles. Rendered in an element with class `description`. Font is 14px if there is no title, otherwise 12px. |
| `duration` | number (ms) | **3000** | A falsy value (0 or missing) means 3000. |
| `showDuration` | boolean | **true** | When true, the icon sits inside a thin ring that drains over `duration` (ring size 38, thickness 2). |
| `position` | see below | `'top-right'` | Lua normally always fills this. |
| `type` | string | — | `'success'` \| `'error'` \| `'warning'` \| anything else (including `'info'`, `'inform'` and missing) is treated as info. Picks the default icon and icon colour only. **Background colour does not change by type.** |
| `icon` | IconValue (§14) | per type | Default icons: error `circle-xmark`, success `circle-check`, warning `circle-exclamation`, other `circle-info`. Notifications don't support **image URL icons**: the string is always handed to FontAwesome. |
| `iconColor` | CSS colour string | per type | If present, the original parses it as a CSS colour (hex, rgb[a], hsl[a], named) and uses that colour. An unparseable value comes out black. Default Mantine colours: error `red.6`, success `teal.6`, warning `yellow.6`, other `blue.6`. The icon sits in a 32px round "light" badge tinted with the same colour. |
| `iconAnimation` | IconAnimation (§14.3) | none | |
| `alignIcon` | `'top'` \| `'center'` | `'center'` | Vertical alignment of the icon within the toast. |
| `style` | object | — | CSS-in-JS object (camelCase keys) merged over the container styles, **after** the built-in styles, so it wins. Nested selectors (for example `'.description': {...}`) are valid in the original (Emotion `sx`). Typical keys: `backgroundColor`, `color`. |
| `sound` | — | — | Never arrives (Lua strips it). |

Rules:

- If **both `title` and `description` are empty or missing, the notification is dropped**.
- Positions: `top-left`, `top-right`, `bottom-left`, `bottom-right`, `center-left`, `center-right`, plus `top` → treated as `top-center` and `bottom` → `bottom-center`. `top-center` and `bottom-center` are also accepted as given.
- Stacking: toasts with the same position stack with an 8px gap, newest nearest the anchor. At most **20** toasts are kept at once (the oldest are discarded).
- Animation: enter is a 0.2 s slide of 30px plus fade (from above for top positions, from below for bottom positions). Exit is 0.4 s: right-side positions slide out right, left-side positions slide out left, `top-center` slides up, `bottom-center` slides down, `center-*` sides as named.
- Visual reference: width 300, padding 12, small radius, dark[6] background, dark[0] text, description dark[2], Roboto.
- No callback is ever sent back to Lua.

---

## 4. Context menu — `showContext` / `hideContext`

### 4.1 Inbound `showContext` data

Lua sends `{ title, canClose, menu, options }` taken from the registered menu (`id`, `onExit`, `onBack` stay in Lua). **This message is JSON-encoded with sorted keys**, so a keyed `options` table arrives as a JSON object whose keys are in alphabetical order.

| Field | Type | Notes |
|---|---|---|
| `title` | string | **Markdown** (no GFM), centred in the header. |
| `canClose` | boolean? | When `false`, the X button is disabled and Escape is ignored. Missing or `true` means closable. |
| `menu` | string? | Parent menu id. When present, a back button (chevron-left) is shown to the left of the title. |
| `options` | **array** (`Option[]`) **or object** (`{ [key: string]: Option }`) | See 4.2 for the order and the key that is sent back. |

**Option** fields:

| Field | Type | Behaviour |
|---|---|---|
| `title` | string? | **Markdown**. If missing and the key is non-numeric (keyed form), **the key itself is shown as the title**. If missing and the key is numeric (array form), no title row is rendered. |
| `description` | string? | **Markdown**, 12px, dark[2] (dark[3] when disabled). |
| `icon` | IconValue? | **Image URLs are supported** (§14.2), shown with max width 25px. |
| `iconColor` | CSS colour? | Applied as the icon's CSS colour. |
| `iconAnimation` | IconAnimation? | |
| `image` | URL string? | Shown in a hover card on the right (open delay 200 ms). |
| `progress` | number 0–100? | A small progress bar under the text, shown whenever this field is present (including 0). |
| `colorScheme` | Mantine colour (for example `'blue'`, `'red.6'`)? | Bar colour. Default `'dark.3'`. |
| `arrow` | boolean? | A chevron-right is shown if `(menu or arrow) and arrow ~= false`. |
| `menu` | string? | Submenu id. Clicking navigates (see 4.3). |
| `metadata` | see below | Shown in the hover card. The hover card is enabled only if `metadata` or `image` is set, and never when the option is disabled. |
| `disabled` | boolean? | Greyed out, not clickable, no hover card. |
| `readOnly` | boolean? | Looks normal, but has no hover highlight, no press effect, no click and a default cursor. |
| `event`, `serverEvent`, `args`, `onSelect` | — | Lua-only. They may arrive serialised (functions are dropped or null), and the UI must ignore them. |

**metadata** formats:

| Shape | Rendering |
|---|---|
| `string[]` | one line per string |
| `{ label, value?, progress?, colorScheme? }[]` (may be mixed with strings) | line `"<label>: <value>"`, where a missing value renders as an empty string after the colon. If `progress` is present, a small bar follows, coloured `colorScheme` → option `colorScheme` → `'dark.3'`. |
| `{ [key]: value }` (object) | one line `"<key>: <value>"` per entry |

### 4.2 Option order and the clickContext key

The UI iterates `Object.entries(options)`:

- **Array form**: keys are `"0"`, `"1"`, … (strings) in array order.
- **Object form**: JS ordering applies. Integer-like keys come first in ascending numeric order, then other keys in received order, which is alphabetical because Lua sorted them. A replacement must reproduce this to match the original's visual order.

`clickContext` body is **that key as a JSON string**, for example `"0"` or `"buy_car"`.
Lua: if the key parses as an integer, it adds 1 and indexes the options array. Otherwise it indexes by the string key. A float-looking key is converted to an integer without the +1. Consequence: in keyed menus, an integer-like key such as `"2"` gets treated as an array index. That's an ox quirk, so keep the same body format.

### 4.3 Interactions

| User action | UI does | Posts | Lua does |
|---|---|---|---|
| Click an option with `menu` (not disabled/readOnly) | nothing locally | `openContext` `{ id: option.menu, back: false }` | `showContext(id)`, which sends a new `showContext` |
| Click the header back button | nothing locally | `openContext` `{ id: data.menu, back: true }` | calls the current menu's `onBack` (when `back` is true), then `showContext(id)` |
| Click an option without `menu` | **nothing locally** (stays open) | `clickContext` `"<key>"` | If the option has `onSelect`/`event`/`serverEvent`, Lua sends `hideContext`, resets focus, and runs the action. **Otherwise it does nothing** (menu stays open, focus kept). |
| Click a disabled or readOnly option | nothing | nothing | — |
| Click X, or press **Escape** (`KeyboardEvent.code === 'Escape'`) | if `canClose === false` do nothing; else hide | `closeContext` (no body) | resets focus and calls the menu's `onExit`. It does **not** send `hideContext` back. |
| Inbound `hideContext` | hide | nothing | (sent by Lua for `lib.hideContext`, and after an actionable click) |
| Inbound `showContext` while already visible | hide, wait ~100 ms, swap content, show | — | — |

Notes: Backspace does nothing in the context menu. There is no keyboard navigation. Layout reference: absolute position top 15%, right 25%, width 320, list height ~560 with vertical scroll, 3px gap between buttons.

---

## 5. List menu — `setMenu` / `closeMenu`

### 5.1 Inbound `setMenu` data

| Field | Type | Default | Notes |
|---|---|---|---|
| `title` | string | — | Header, plain text, uppercase, 24px. |
| `position` | `'top-left'` \| `'top-right'` \| `'bottom-left'` \| `'bottom-right'` | `'top-left'` | Screen corner with a 5px margin. Width 384. |
| `canClose` | boolean? | closable | `false` blocks Escape/Backspace closing. |
| `items` | MenuItem[] (Lua `options` array, verbatim) | — | Always an array. Lua refuses to open an empty menu. |
| `startItemIndex` | number (0-based) | 0 | Lua sends `startIndex - 1` or 0. The UI clamps: below 0 or falsy becomes 0, at or past length becomes length − 1. |

**MenuItem** fields:

| Field | Type | Behaviour |
|---|---|---|
| `label` | string | **If empty or missing, the row isn't rendered, but it still counts for index and keyboard navigation** (quirk). |
| `icon` | IconValue? | Image URLs supported (max width 32). Font icon is 24px, coloured `iconColor` or dark[2]. |
| `iconColor` | CSS colour? | |
| `iconAnimation` | IconAnimation? | |
| `values` | `(string \| { label: string, description?: string })[]`? | Makes the row a **side-scroll** row: small uppercase label above, current value below, and a `‹ n/N ›` counter on the right. Object entries display `label`, and their `description` overrides the row tooltip. |
| `defaultIndex` | number (1-based)? | Initial scroll position for `values`. Missing means 1. |
| `checked` | boolean? | **Presence** (even `false`) makes it a checkbox row (label + checkbox). Ignored if `values` is present. |
| `progress` | number 0–100? | Progress row (label + bar). Used only when it's neither a values row nor a checkbox row. |
| `colorScheme` | Mantine colour? | Progress colour, default `'dark.0'`. Track is dark[3]. |
| `description` | string? | Tooltip (plain text) attached to the menu, shown while this row is highlighted. Max width 350. |
| `close` | boolean? | `false` keeps the menu open after Enter. |
| `args` | any | Lua-only. Ignore it. |
| `image` | — | Present in the UI typing but not rendered. |

Precedence for row kind: `values` (array) > `checked !== undefined` > `progress !== undefined` > plain.

UI state on `setMenu`: selected = `startItemIndex`; per-row scroll index = `(defaultIndex or 1) - 1` for values rows; per-row checked = `checked or false` for checkbox rows. The highlighted row gets DOM focus (a focus trap is active while visible) and is scrolled into view (`block: nearest`). The list area has max height ~415. When there are more than 6 items and the last item isn't selected, a "chevron-down" indicator appears below the list.

### 5.2 Keyboard (uses `KeyboardEvent.code`)

| Key | Behaviour | Callback |
|---|---|---|
| ArrowDown | selected + 1, wrapping to 0 at the end | `changeSelected` (debounced) |
| ArrowUp | selected − 1, wrapping to the last item at 0 | `changeSelected` (debounced) |
| ArrowRight | values row only: scroll index + 1, wrapping to 0 | `changeIndex` (debounced) |
| ArrowLeft | values row only: scroll index − 1, wrapping to the last value | `changeIndex` (debounced) |
| Enter | **checkbox row without values**: toggle checked, nothing else (no confirm) | `changeChecked` (debounced) |
| Enter | other rows: post confirm, then hide unless `close === false` | `confirmSelected` (immediate) |
| Escape / Backspace | (window listener) if `canClose !== false`: hide | `closeMenu` with body `'Escape'` or `'Backspace'` |

Arrow and Enter handling is attached to the list container. It works because the highlighted row holds DOM focus. There is no mouse interaction (the container has `pointer-events: none` and the cursor is off).

### 5.3 Outbound payloads (all arrays, 0-based)

| Callback | Body | Timing | Lua handling |
|---|---|---|---|
| `confirmSelected` | `[selected, scrollIndex]`, where `scrollIndex` is the row's current scroll index for values rows and `null` otherwise | immediately on Enter | selected+1, scrollIndex+1 when non-null. If `options[selected].close ~= false`, focus is reset and the menu is considered closed. Then `cb(selected, scrollIndex, args, nil)`. **The 4th arg (checked) is never supplied by the UI.** |
| `changeSelected` | `[selected, value, kind]`, where `value` is the scroll index (values row), or the current checked state if the item's **original** `checked` was truthy, else `null`; `kind` is `'isScroll'` (values row), `'isCheck'` (if original `checked` truthy), else `null` | 100 ms debounce after the selected index changes **and also once after every `setMenu`** (not suppressed on open) | selected+1. `args` must be a table or nil (else it errors). If `value` is non-nil it sets `args[kind] = true`. If value is non-nil and not `args.isCheck`, value+1. Then `onSelected(selected, value, args)`. |
| `changeIndex` | `[selected, scrollIndex]` | 100 ms debounce after a scroll-index change. **Suppressed until the first keydown after `setMenu`** (so it doesn't fire on open) | +1 to both, `onSideScroll(selected, scrollIndex, args)` |
| `changeChecked` | `[selected, checked: boolean]` | 100 ms debounce after a toggle. Suppressed until the first keydown after open | selected+1, `onCheck(selected, checked, args)` |
| `closeMenu` | `'Escape'` \| `'Backspace'` | immediately | resets focus, `onClose(key)` |

Inbound `closeMenu` (from `lib.hideMenu`): hide immediately, **bypass `canClose`**, and post nothing.

Lua doesn't send `closeMenu` after a confirm. The UI hides itself (when `close ~= false`). If `close == false`, the menu stays and Lua keeps focus. To refresh it, Lua calls `showMenu` again, which sends `setMenu`.

---

## 6. Radial menu — `openRadialMenu`

### 6.1 Inbound

| data | Meaning |
|---|---|
| `false` | Hide (animate out). Lua sends this before every menu switch, waits ~100 ms, then sends the new menu. It is also the full close (`lib.hideRadial`). |
| `{ items: RadialItem[], sub?: true, option?: string }` | Show these items. `sub` is `true` when this is a submenu (not the root). Otherwise the key is absent. `option` is the **id of the submenu we just returned from**, so the UI can open on the page containing the item whose `menu === option`. |

**RadialItem** (UI-relevant fields; Lua also sends `id`, `resource`, `onSelect`, `keepOpen`, and anything else the caller set. Ignore those.)

| Field | Type | Notes |
|---|---|---|
| `label` | string | Wrapped at about 15 characters per line on word boundaries. Font size 13 (>15 chars: 12, >20 chars: 10). |
| `icon` | IconValue or image URL | Image URLs are rendered as an SVG `<image>`. |
| `iconWidth`, `iconHeight` | number? | Image icons only. Default 50, clamped to 0–100. |
| `menu` | string? | Submenu id. Lua handles navigation; the UI uses it only for the `option` page lookup. |

Inbound `refreshItems` (`RadialItem[]`): replace the items while keeping the page. v3.40.3 Lua never sends it. Supporting it is optional.

### 6.2 Paging (6 slots)

- 6 items or fewer: show all.
- Otherwise page *p* (1-based) shows the 6 items starting at absolute index `5·(p−1)`. If more items exist beyond `5·p + 1`, the 6th slot is replaced by a synthetic **More** item: icon `ellipsis-h`, label `locale.ui.more`.
- **Click index sent to Lua** is the absolute 0-based index: on page 1 it is the slot index, otherwise `5·(p−1) + slot`.
- Initial page when `option` is given: find the index *i* of the item with `menu == option`, then page = `floor(i / 6) + 1`. That formula doesn't match the 5-per-page stride (an ox quirk, kept for parity). Otherwise page 1.
- The pie is drawn with at least 3 sectors (if there are fewer than 3 items, slices are 1/3 wide).

### 6.3 Interactions (mouse only; there is no keyboard handling in the UI)

| Action | UI | Posts | Lua |
|---|---|---|---|
| Click a normal item | (stays visible) | `radialClick` `<absIndex>` | index+1. If the item has `menu`: push history, send `false`, wait 100 ms, send the submenu (`sub: true`). Else, unless `keepOpen`, `hideRadial` (sends `false` and resets focus). Then it calls `onSelect(currentMenuId, index1)` or the export. |
| Click **More** | hide, post, and when it resolves `true`: show page + 1 | `radialTransition` | waits 100 ms, replies `true` if the radial is still open, else `false` |
| Centre button or **right-click** (contextmenu) on page > 1 | previous page via `radialTransition` | `radialTransition` | as above |
| Centre button or right-click on page 1 of a **sub** menu | — | `radialBack` | pops history and sends `false`, waits 100 ms, then the parent (with `option` set; the root has no `sub`) |
| **Centre button** on page 1 of the root | hide | `radialClose` | resets focus, marks closed |
| Right-click on page 1 of the root | nothing | — | — |

Centre icon: `xmark` when on the root's page 1, else `arrow-rotate-left`. Keybind `z` (Lua `lib.addKeybind`) toggles open/close. That is Lua-side. The UI does nothing on keys.

Visual reference: SVG 350×350 viewBox scaled ×1.1025, rotated 90°, background circle r175, centre circle r28 (primary colour, dark[6] stroke 4). Sector hover fills with the primary colour and turns text/icons white. Icons are 30px.

---

## 7. Input dialog — `openDialog` / `closeInputDialog`

### 7.1 Inbound `openDialog` data

```
{ heading: string, rows: Row[], options?: { allowCancel?: boolean, size?: 'xs'|'sm'|'md'|'lg'|'xl' } }
```

Lua normalises rows: a plain string row becomes `{ type: 'input', label: <string> }`. `options` is the caller's 3rd argument verbatim (it is an object despite the Lua annotation).

| Dialog option | Default | Effect |
|---|---|---|
| `allowCancel` | true | `false` disables the Cancel button and Escape. |
| `size` | `'xs'` | Modal width (Mantine sizes: xs 320, sm 380, md 440, lg 620, xl 780 px). |

The modal is centred. The heading is plain text, centred, 18px. Clicking outside doesn't close it. Overlay opacity 0.5. Fade transition.

### 7.2 Row types, inputs and returned values

Common optional fields on most types: `label` (string), `description` (helper text under the label), `placeholder`, `icon` (IconValue, left section; FontAwesome only, no URL), `disabled`, `required` (asterisk, and submit is blocked while the field is empty), `default`.

| `type` | Extra fields | Initial value | **Returned value** (in `inputData`) |
|---|---|---|---|
| `input` | `password` (masked, with an eye toggle), `min`/`max` → min/max **length** | `default` or empty | `string` (empty `""` if untouched) |
| `textarea` | `autosize`, `min`/`max` → min/max **rows**, `minLength`, `maxLength` | `default` | `string` |
| `number` | `min`, `max`, `step` (default 1), `precision` (UI-only key; default **0**: values are rounded to integers unless `precision` is given) | `default` | `number`, or `null` when empty |
| `checkbox` | `checked` (initial state) | `checked` | `boolean`. `required` means it must be ticked. `default` is ignored. |
| `select` | `options: {value, label?}[]` (missing label becomes value), `clearable`, `searchable` | `default` (a value string) | `string` (selected `value`), or `null` |
| `multi-select` | as select + `maxSelectedValues` | `default` (string[]) | `string[]` of values, or `null` if never set |
| `slider` | `min` (default 0), `max` (default 100), `step` (default 1). No description/placeholder/icon. Min and max marks are labelled. | `default ?? min ?? 0` | `number` |
| `color` | `format`: `'hex'` (default) \| `'hexa'` \| `'rgb'` \| `'rgba'` \| `'hsl'` \| `'hsla'`. No eyedropper. | `default` | `string` in that format (for example `#ff0000`, `rgba(255, 0, 0, 1)`), or `null` when untouched with no default |
| `date` | `format` (display + placeholder, dayjs tokens), `returnString`, `clearable`, `min`/`max` (date strings → selectable range) | `default`: `true` means now; otherwise `new Date(default)` | **`number` epoch ms** (local midnight of the picked day), or `null`. With `returnString`, a dayjs-formatted string using `format` or `'DD/MM/YYYY'`. |
| `date-range` | same as date | `default`: `[a, b]` strings, or `true` | `[msOrNull, msOrNull]`. With `returnString` the original formats the whole array as one date, which yields `"Invalid Date"` (ox bug; see ambiguities). |
| `time` | `format`: `'12'` (default) \| `'24'`, `clearable` | `default` parsed with `new Date(...)` | **`number` epoch ms** of a Date carrying the picked hours and minutes, or `null` |

### 7.3 Submit / cancel

| Action | UI | Posts | Timing |
|---|---|---|---|
| Confirm button or **Enter** inside a field (native form submit) | validate (`required`, number/date min/max). If valid, hide | `inputData` with **an array of values in row order** (index *i* = row *i*) | **200 ms after hide** |
| Cancel button / **Escape** (only if `allowCancel !== false`) | hide | `inputData` with **no body** (`JSON.stringify(undefined)`). Lua resolves the dialog with that, giving the caller `nil`. | 200 ms after hide |
| Inbound `closeInputDialog` (from `lib.closeInputDialog`, which already resolved `nil`) | hide | **nothing** | — |
| Inbound `openDialog` while a close timer is pending | cancel the pending timer (its post is dropped) and open the new dialog | — | — |

Lua resolves the waiting `lib.inputDialog` promise with the posted data as is, and resets focus. Callers read results positionally (`input[1]`, …). `null` entries become `nil` holes.

Locale strings used: `ui.cancel` and `ui.confirm` (buttons rendered uppercase).

---

## 8. Alert dialog — `sendAlert` / `closeAlertDialog`

### 8.1 Inbound `sendAlert` data

| Field | Type | Default | Behaviour |
|---|---|---|---|
| `header` | string | — | **Markdown** (no GFM), as the modal title. |
| `content` | string | — | **Markdown with GFM** (tables, strikethrough, task lists, autolinks). Images are constrained to 100% width and height. Text colour dark[2]. |
| `centered` | boolean? | false | Vertically centred modal. |
| `size` | `'xs'`…`'xl'` | `'md'` | Modal width. |
| `overflow` | boolean? | false | true: content scrolls inside the modal. false: the page scrolls. |
| `cancel` | boolean? | false | Shows a Cancel button. Also turns Confirm into the "light primary" variant (otherwise default/grey). |
| `labels` | `{ cancel?: string, confirm?: string }` | locale | Button text overrides (rendered uppercase). |

There is no close X, and clicking outside does nothing. Overlay 0.5. Fade transition, exit 150 ms.

### 8.2 Interactions

| Action | Posts | Lua |
|---|---|---|
| Confirm button | `closeAlert` `"confirm"` (immediately) | resets focus and resolves `lib.alertDialog` → `'confirm'` |
| Cancel button | `closeAlert` `"cancel"` | → `'cancel'` |
| **Escape** (always active, even when `cancel` is false) | `closeAlert` `"cancel"` | → `'cancel'` |
| Enter | no dedicated handler. The modal auto-focuses its first button (Cancel if shown, else Confirm), so Enter activates that button. | — |
| Inbound `closeAlertDialog` (Lua `lib.closeAlertDialog` or the Lua-side timeout) | hide, post nothing | Lua already resolved (no reason) or rejected (reason, for example `'timeout'`) |

---

## 9. Progress bar / circle — `progress`, `circleProgress`, `progressCancel`

### 9.1 Inbound

| action | data | UI |
|---|---|---|
| `progress` | `{ label?: string, duration: number(ms) }` | Show the linear bar. The fill animates linearly from 0 to 100% over `duration`. The label is centred over the bar (20px, single line, ellipsis). Bottom-centre (bottom 20% band), 350×45. |
| `circleProgress` | `{ duration: number, position?: 'middle' \| 'bottom', label?: string }` | **Ignored if a circle is already visible.** Shows a ring (size 90, thickness 7, primary colour) that fills over `duration`, with a percentage counter in Roboto Mono that goes up by 1 every `duration/100` ms, and an optional label below. `middle` (default) is screen centre; `bottom` is the bottom 20% band. |
| `progressCancel` | none | Hide both (the circle sets its counter to 99 first). |

Lua alternates between them; only one progress is active at a time. Lua waits for the previous one to clear before starting.

### 9.2 Completion protocol (critical)

1. When the fill animation ends, the UI starts hiding (scale-fade exit, ~100 ms).
2. **When the exit transition finishes**, the UI posts `progressComplete` (no body). The original posts this after **every** hide, including after `progressCancel`.
3. Lua: `progressComplete` clears the active-progress flag, which ends its per-frame loop. Lua then judges success: the result is `true` only if `(now − start + 100 ms) > duration`. If the loop ended early (cancel, interrupt such as death/ragdoll/cuffs, or `lib.cancelProgress`), Lua sends `progressCancel` and returns `false`.

So `progressComplete` must not arrive before `duration − 100 ms` has elapsed, or Lua treats the run as cancelled. The original fires it at roughly `duration + 100 ms`.

Cancellation is entirely Lua-side: the `cancelprogress` command, bound to **X** via `RegisterKeyMapping` and honoured only if `canCancel`. The UI has no cancel key.

---

## 10. Skill check — `startSkillCheck` / `skillCheckCancel`

### 10.1 Inbound `startSkillCheck` data

| Field | Type | Notes |
|---|---|---|
| `difficulty` | `Difficulty` or `Difficulty[]` | `Difficulty` = `'easy'` \| `'medium'` \| `'hard'` \| `{ areaSize: number (degrees), speedMultiplier: number }`. An array means a sequence of checks that must all pass. |
| `inputs` | `string[]?` | Allowed keys. Each check picks one at random. Missing means the key is always `'e'`. |

Presets:

| Preset | Target arc size (deg) | Speed multiplier |
|---|---|---|
| easy | 50 | 1 |
| medium | 40 | 1.5 |
| hard | 25 | 1.75 |
| custom | `areaSize` | `speedMultiplier` (minimum clamp 0.0001) |

### 10.2 Mechanics (parity)

- The indicator starts at the 12 o'clock position and sweeps one full clockwise revolution in `2000 ms / speedMultiplier` (frame-timed).
- The target arc starts at a random angle measured from 12 o'clock: a random integer in `[120, 360 − areaSize)` degrees, spanning `areaSize` degrees.
- The required key, shown uppercase in a small box at the centre, is a random entry of `inputs` (lowercased), or `e`.
- Key detection: `keydown`, using `event.key` lowercased. For non-Latin layouts (first char code ≥ 880) it falls back to `event.code`: `KeyX` → `x`, `DigitN` → `N`.
- If `inputs` was given, keys **not in the (lowercased) list are ignored**. If `inputs` was not given, **any key** ends the check.
- On a counted key press: success if the key equals the required key **and** the indicator angle is inside `[start, start + areaSize]`. Otherwise fail.
- A full revolution with no counted key press fails.
- Sequence: on success with more entries left, move to the next difficulty (new random arc and key, indicator reset) without hiding. On any fail, or success of the last entry, hide and post.

### 10.3 Outbound

| Event | Body | Lua |
|---|---|---|
| finished | `skillCheckOver` `true` \| `false` (JSON boolean) | resets focus, resolves `lib.skillCheck` → that boolean (ignored if none is pending) |
| inbound `skillCheckCancel` | UI hides and posts `skillCheckOver` `false` | `lib.cancelSkillCheck` relies on the UI to post this. **The UI must post it**, or the Lua promise never resolves. |

Visual reference: SVG ring r50 (r65 at viewport height ≥ 1440), track dark[5] stroke 8, target arc in the primary colour, red indicator stroke 16, 3° long.

---

## 11. Text UI — `textUi` / `textUiHide`

### 11.1 Inbound `textUi` data

Lua sends the caller's `options` table with `text` added. Lua de-dupes: repeated calls with the same text send nothing.

| Field | Type | Default | Behaviour |
|---|---|---|---|
| `text` | string | — | **Markdown with GFM**. |
| `position` | `'right-center'` \| `'left-center'` \| `'top-center'` \| `'bottom-center'` | `'right-center'` | Edge-anchored with an 8px margin. |
| `icon` | IconValue? | — | FontAwesome only (no URL check), size "lg", fixed width. |
| `iconColor` | CSS colour? | inherit | |
| `iconAnimation` | IconAnimation? | — | |
| `alignIcon` | `'top'` \| `'center'` | `'center'` | |
| `style` | CSS object (camelCase) | — | Applied as an inline style on the box. The Lua annotation also allows a string. The original would crash (blank UI) on a string, so a replacement should accept an object and either ignore a string or parse it as CSS text. |

`textUiHide`: animate out. The content stays in place until the next `textUi`. A new `textUi` while visible swaps the content in place.

Visual reference: font 16, padding 12, dark[6] background, dark[0] text, small radius, scale-fade transition (enter 200 ms, exit 100 ms).

No callbacks.

---

## 12. Clipboard — `setClipboard`

`data` is a plain string. The UI must copy it to the system clipboard. The original creates a temporary textarea, selects it and runs `document.execCommand('copy')`, because the async Clipboard API is not reliably available in CEF NUI. No callback.

---

## 13. Locale — `setLocale`

`data` is the **entire decoded contents of `locales/<key>.json`** (falling back to `en.json`). It is sent in reply to `init` and whenever Lua calls `lib.setLocale` (for example from the `/ox_lib` settings dialog).

Shape (en):

| Key | Example |
|---|---|
| `language` | `"English"` |
| `settings` | `"Settings"` |
| `ui.cancel` | `"Cancel"` |
| `ui.close` | `"Close"` |
| `ui.confirm` | `"Confirm"` |
| `ui.more` | `"More..."` |
| `ui.settings.{locale,locale_description,notification_audio,notification_position}` | Lua-side |
| `ui.position.{top,top-left,…}` | Lua-side |
| others (`open_radial_menu`, `cancel_progress`, `txadmin_*`) | Lua-side |

**Strings the UI actually uses:** `ui.cancel` (alert and input Cancel), `ui.confirm` (alert and input Confirm), `ui.more` (radial More slot). `ui.close` is declared but unused. Store the whole object and tolerate missing keys. Before the first `setLocale`, the original shows empty strings.

---

## 14. Value formats

### 14.1 IconValue (FontAwesome)

The original registers the **free** sets only: solid (`fas`), regular (`far`) and brands (`fab`), FontAwesome **6.7**. Resolution is done by FontAwesome's own icon-argument parser:

| Input | Resolves to |
|---|---|
| `'car'` | solid `car` |
| `'fa-car'` | solid `car` |
| `'fas fa-car'`, `'fa-solid fa-car'` | solid `car` |
| `'far fa-heart'`, `'fa-regular fa-heart'` | regular `heart` |
| `'fab fa-discord'`, `'fa-brands fa-discord'` | brands `discord` |
| `['fab', 'discord']`, `['fas', 'fa-car']` (2-element array; Lua `{ 'fab', 'discord' }`) | given prefix + name (a leading `fa-` on the name is stripped) |
| `{ prefix, iconName }` object | as given |
| `'discord'` (a brand name without a prefix) | **looked up as solid. Not found, renders nothing.** |
| Pro prefixes (`fal`, `fat`, `fad`, `fak`, `fass`, `fa-light` …) | not bundled, render nothing |

FA v5/v6 aliases resolve to the canonical icon (for example `ellipsis-h` → `ellipsis`, `info-circle` → `circle-info`). Unknown names render nothing (no crash). Icons are rendered fixed-width.

### 14.2 Image icons

A **string** icon counts as an image URL if it contains `://`, `.png` or `.webp`. Supported only in: **context menu options, list menu items, radial items** (radial also honours `iconWidth`/`iconHeight`). Notifications, text UI and input fields always treat the string as a FontAwesome name. Covers `nui://…`, `https://…` and relative `.png` paths. Note that `.jpg` without `://` is **not** detected.

### 14.3 iconAnimation

`'spin'`, `'spinPulse'`, `'spinReverse'`, `'pulse'`, `'beat'`, `'fade'`, `'beatFade'`, `'bounce'`, `'shake'`. These map to the FontAwesome 6 animation classes (`fa-spin`, `fa-spin-pulse`, `fa-spin-reverse`, `fa-pulse` = stepped spin, `fa-beat`, `fa-fade`, `fa-beat-fade`, `fa-bounce`, `fa-shake`). Supported on notifications, context options, list items and text UI. **Radial ignores it.**

### 14.4 Colours

| Field | Format |
|---|---|
| `iconColor` (all features) | CSS colour string |
| `colorScheme` (context progress / metadata progress, list progress) | **Mantine colour key**: a palette name (`'blue'`, uses the primary shade) or `'name.shade'` (`'red.6'`). Defaults: context `'dark.3'`, list `'dark.0'`. Raw CSS colours also work in Mantine v5. |
| `primaryColor` (config) | Mantine palette name only |
| input `color` row | value string in the requested `format` |

Mantine v5 dark palette (index 0–9), for matching the look: `#C1C2C5 #A6A7AB #909296 #5c5f66 #373A40 #2C2E33 #25262b #1A1B1E #141517 #101113`.

### 14.5 Markdown matrix

| Field | Markdown | GFM |
|---|---|---|
| notify `description` | yes | no |
| notify `title` | no | — |
| context `title`, option `title`, option `description` | yes | no |
| context metadata | no | — |
| list menu anything | no | — |
| alert `header` | yes | no |
| alert `content` | yes | **yes** |
| text UI `text` | yes | **yes** |
| input dialog `heading`, labels | no | — |

Markdown headings `#`, `##`, `###` are rendered as themed titles (order 1/2/3). Raw HTML is **not** rendered (react-markdown default: escaped/skipped).

### 14.6 Dates and times (input dialog)

- Timestamps are JS epoch **milliseconds** (numbers). Lua receives them as numbers; divide by 1000 for `os.date`.
- `date` with `returnString`: dayjs format string, default `'DD/MM/YYYY'`. Tokens are dayjs's (`YYYY`, `MM`, `DD`, `HH`, `mm`, …).
- `default` for date fields is anything `new Date()` accepts (ISO string or ms number), or `true` for now.
- `time` returns ms for a Date whose clock time is the picked time (the date part is the current day).

---

## 15. Transition and timing summary

| Where | Duration | Why it matters |
|---|---|---|
| Lua radial menu switch | sends `false`, waits **100 ms**, sends the new menu | The UI must animate out in ≤100 ms or tolerate the new menu arriving mid-exit. |
| `radialTransition` | Lua sleeps 100 ms before replying | The UI hides first, then waits for the reply. |
| Context re-show while visible | UI waits 100 ms | Visual only. |
| List menu debounces | 100 ms | `changeSelected`, `changeIndex`, `changeChecked` |
| Input dialog post | **200 ms after hide** | Posting earlier is fine for Lua. Keep it to stay faithful. A new `openDialog` within the window cancels the post. |
| Progress complete | after fill (`duration`) + exit (~100 ms) | Must be later than `duration − 100 ms`. |
| Notification enter/exit | 200 ms / 400 ms | visual |
| Scale-fade (text UI, progress, context, radial) | enter 200 ms, exit 100 ms | progress completion relies on the exit end |

---

## 16. Lua-side behaviours to be aware of (no UI work, but they explain traffic)

- `lib.showContext` keeps sending `showContext` messages for submenus without a `hideContext` in between. The UI handles the re-show itself.
- `clickContext` on an option with no action keeps the menu open (Lua just returns).
- `closeContext` from the UI calls `onExit`. `lib.hideContext(true)` calls `onExit` and also sends `hideContext`.
- `lib.hideMenu(onExit)` sends `closeMenu`. The UI must close even if `canClose == false`.
- `lib.setMenuOptions` changes only Lua state. The UI sees the change on the next `setMenu`.
- `lib.registerRadial` and `add`/`removeRadialItem` while the radial is open re-send the current menu via the `false` + 100 ms + data sequence.
- `lib.alertDialog(data, timeout)`: the timeout is Lua-side and closes with `closeAlertDialog`.
- Only one input dialog, alert, skill check or progress can run at a time. Lua ignores or queues extra calls.

---

## 17. Known ambiguities and ox quirks (decide deliberately)

1. **Cancelled input dialog body.** The original posts with no body. Whether FiveM gives the Lua handler `nil` or an empty table isn't visible in source. ox docs say the result is `nil`. Recommendation: send no body, exactly like the original.
2. **Disabled input/textarea/checkbox rows.** The original disables the DOM element. Depending on react-hook-form internals, these may come back as their value or as `null`. Unverified. Returning the default value is the safest choice.
3. **`date-range` + `returnString`** returns `"Invalid Date"` in the original (the whole array is formatted as one date). A replacement may return `[str, str]` instead. That is technically a protocol deviation, but no working caller can depend on the original behaviour.
4. **`date` + `returnString` with no value** returns `"Invalid Date"` in the original, not `null`.
5. **`progressComplete` after a cancel.** The original also posts it after a `progressCancel` hide. If a new progress starts within about 100 ms, that stale post can end the new one early. Parity says post on every hide. Safer: post only after a natural completion. Either is compatible with Lua's success test.
6. **Radial initial page with `option`** uses `floor(i/6)+1` while paging strides by 5. Keep it for exact parity, or use the corrected `floor(i/5)+1` (clamped). Lua doesn't care.
7. **`changeSelected` for checkbox rows** reports the state only if the item's original `checked` was truthy. Rows that start unchecked report `null`. Keep it for parity.
8. **Function-valued fields** (`onSelect`, …) in context/menu/radial tables: how CfxLua's JSON encoder serialises them (dropped, or `null`) isn't visible here. The UI must ignore unknown fields either way.
9. **Text UI `style` as a string** (allowed by the Lua annotation) would crash the original. Decide whether to support CSS text.
10. **`refreshItems`** is handled by the original UI, but nothing in v3.40.3 sends it.

---

## Implementation checklist

- [ ] One `message` listener dispatching on `action`. Ignore unknown actions.
- [ ] `fetchNui(name, body)`: POST to `https://${GetParentResourceName()}/${name}` with a JSON body (`undefined` means no body), and parse the JSON response.
- [ ] On mount: post `init` (expect `setLocale`) and `getConfig` (apply `primaryColor`/`primaryShade`; defaults blue/6 until then).
- [ ] Locale store holding the full object. Use `ui.cancel`, `ui.confirm`, `ui.more`.
- [ ] Icon resolver: free FA6 solid/regular/brands; string, prefixed-string and `[prefix, name]` forms; aliases; URL detection (`://`, `.png`, `.webp`) for context, list and radial only; 9 animation names.
- [ ] **notify**: drop if no title and no description; duration 3000; showDuration true; `id` replaces in place and restarts the timer; 8 positions plus top/bottom aliases; type → icon and Mantine colour; CSS `iconColor`; style object merge; description markdown; max 20.
- [ ] **context**: array or object options in `Object.entries` order; key-as-title fallback; markdown fields; metadata 3 shapes; hover card; `clickContext` sends the string key; `openContext {id, back}`; X/Escape → `closeContext` unless `canClose === false`; don't self-hide on click; `hideContext`; 100 ms re-show.
- [ ] **list menu**: clamp `startItemIndex`; `defaultIndex` 1-based; row precedence values > checked > progress; arrow wrap; Enter toggles checkbox rows locally; `confirmSelected [i, scroll|null]` and hide unless `close === false`; debounced `changeSelected [i, v, kind]` (also fires on open), `changeIndex`, `changeChecked` (suppressed until first key); Escape/Backspace → `closeMenu '<code>'` unless `canClose === false`; inbound `closeMenu` force-closes silently; tooltip from description or value description.
- [ ] **radial**: `false` hides; `{items, sub, option}`; 6-slot paging with a More slot (`ellipsis-h`, `ui.more`); absolute 0-based `radialClick`; More/prev page via `radialTransition` (await boolean); centre/right-click back → `radialBack` in a sub; centre on root page 1 → hide + `radialClose`; min 3 sectors; image icons with `iconWidth`/`iconHeight` clamp.
- [ ] **input dialog**: all 11 row types; return value types per §7.2; `precision` default 0; `select` label fallback; `required` validation; Enter submits; Escape/Cancel only if `allowCancel !== false`; post `inputData` (array, or no body on cancel) 200 ms after hide; `closeInputDialog` closes silently; a new open cancels a pending post.
- [ ] **alert**: header markdown, content markdown + GFM; size/centered/overflow/cancel/labels; Confirm/Cancel/Escape → `closeAlert 'confirm'|'cancel'`; `closeAlertDialog` closes silently.
- [ ] **progress**: linear bar `{label, duration}`; circle `{duration, position, label}` ignored while visible, with % counter; `progressCancel` hides both; post `progressComplete` after the hide transition (never earlier than duration − 100 ms).
- [ ] **skill check**: presets 50/1, 40/1.5, 25/1.75; custom object; arrays sequential; random key from `inputs` or `e`; key filter; non-Latin fallback via `event.code`; 2000 ms/multiplier revolution; random arc start in `[120, 360−size)`; post `skillCheckOver bool`; `skillCheckCancel` → hide and post `false`.
- [ ] **text UI**: 4 positions (default right-center); markdown + GFM; icon/iconColor/iconAnimation/alignIcon; style object; `textUiHide`.
- [ ] **clipboard**: `setClipboard` string → `execCommand('copy')` via a temporary textarea.
- [ ] Never call focus natives. Transparent body. Build into `web/build/index.html` with relative assets.
