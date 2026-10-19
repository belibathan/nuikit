# ox_target NUI protocol — compatibility spec

Target: drop-in replacement for `ox_target/web` (ox_target **v1.18.1**, commit `bf03d52`).
Scope: everything that crosses the boundary between ox_target's client Lua and its NUI page, plus the UI behaviour the Lua side depends on.

> Clean-room note. ox_target is MIT © Overextended. We still keep this a clean-room implementation. This document describes the wire protocol and observable behaviour in our own words. It doesn't reproduce ox_target source, styles or markup. Field names, message names and small literal values appear only as interface facts.

Conventions used below:

- **Inbound** means Lua → UI. ox_target does **not** use the `{ action, data }` envelope. It calls `SendNuiMessage` with a raw JSON string whose top level is `{ event: string, ...fields }`. The page receives it as a `window` `message` event, and `event.data` is that object.
- **Outbound** means UI → Lua: `fetch('https://ox_target/<name>', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify(payload) })`.
- Indexes in the outbound payload are **1-based** (Lua indexes the tables directly; it adds nothing).
- "Focus" means `SetNuiFocus` / `SetNuiFocusKeepInput`. **The UI never sets focus. Lua does all of it** (see §3).

---

## 0. Page and transport basics

| Item | Requirement |
|---|---|
| Entry | `ui_page 'web/index.html'`. `files` lists `web/**`, so anything under `web/` is served (sub-folders included). The build must be self-contained, with relative asset paths (vite `base: './'`). Our build writes `index.html` + `assets/*` and is copied over `ox_target/web/`. |
| Resource name | `GetParentResourceName()` returns `ox_target`. Build callback URLs from it. |
| Strict callbacks | The manifest sets `nui_callback_strict_mode 'true'`: callbacks are accepted only from ox_target's own page. Posting from `ox_target/web/index.html` is fine. |
| Response | The only callback replies `1` immediately (before it acts). The UI doesn't need the value. |
| Message routing | One global `message` listener that switches on `event.data.event`. Ignore unknown events. |
| Transparency | `html`/`body` background transparent, no scrollbars. |
| Initial visibility | **Hidden** until the first `visible` with `state: true`. The page is loaded at resource start and stays loaded for the whole session. |
| Icons | Option `icon` values are Font Awesome class strings (`'fa-solid fa-car'`, `'fas fa-box'`, `'fa-regular fa-hand'`, rarely a bare `'car'`). The original loads the free FA stylesheet from a CDN. A replacement must render every free FA icon (solid, regular, brands) without network access. |

---

## 1. Message index

| Direction | Name | Shape |
|---|---|---|
| Inbound | `visible` | `{ event: 'visible', state: boolean }` |
| Inbound | `leftTarget` | `{ event: 'leftTarget' }` |
| Inbound | `setTarget` | `{ event: 'setTarget', options: OptionGroups, zones: Option[][] }` |
| Outbound | `select` | `[type: string, id: number, zoneId: number \| null]` |

There is no init handshake, no config callback, no locale message and no cancel/close callback.

---

## 2. Inbound messages

### 2.1 `visible`

`{ "event": "visible", "state": true | false }`

| `state` | When Lua sends it | UI must |
|---|---|---|
| `true` | The player presses (hold mode) or toggles on (toggle mode, convar `ox_target:toggleHotkey 1`) the targeting key, default `LMENU` (left Alt). Sent once per targeting session, before any `setTarget`. | Clear any options, show the page, show the eye in its **idle** state. |
| `false` | Targeting ends: key released (hold mode), toggled off, pause menu opened (toggle mode), a progress bar started without focus, an option without `openMenu` was selected, or `disableTargeting(true)` was called. | Clear options, hide everything, reset the eye to idle. |

Quirk: on `visible: true` Lua does **not** necessarily follow with `leftTarget`, and on `visible: false` it doesn't send `leftTarget` first. Each `visible` must reset state on its own.

### 2.2 `leftTarget`

`{ "event": "leftTarget" }`

Sent when the aim moves off everything that had visible options: the raycast hit a different entity, the set of nearby zones changed, or every option became hidden. Can arrive many times a second while the player sweeps the camera (the loop runs every 50–100 ms).

UI must: remove the options list and return the eye to **idle**. The page stays visible.

### 2.3 `setTarget`

```json
{
  "event": "setTarget",
  "options": {
    "__global":     [Option, ...],
    "entity":       [Option, ...],
    "globalTarget": [Option, ...],
    "localEntity":  [Option, ...],
    "model":        [Option, ...]
  },
  "zones": [[Option, ...], [Option, ...]]
}
```

Sent when the player is aiming at something with at least one visible option, and again whenever the visible set changes (an option's `hide` flipped, a submenu was opened, a zone came into range). Each `setTarget` **replaces** the previous list. It doesn't append.

UI must: replace the list with the new options and switch the eye to its **has-target** state.

**`options`**: an object keyed by option source. Lua encodes it with sorted keys, so the order on the wire is alphabetical. Keys present depend on the target:

| Key | Contents |
|---|---|
| `__global` | Options from `addGlobalOption` (shown on everything). Also holds the injected *go back* option inside submenus (§2.4). Always present (may be empty). |
| `globalTarget` | The global list for the hit entity type: players, peds, vehicles or objects (`addGlobalPlayer/Ped/Vehicle/Object`). |
| `model` | Options registered for the hit entity's model (`addModel`). |
| `entity` | Options registered for the hit entity's network id (`addEntity`). |
| `localEntity` | Options registered for the local entity handle (`addLocalEntity`). |

Keys with no registrations are absent. Treat any key generically: iterate whatever keys arrive, in arrival order.

**`zones`**: an array, one entry per nearby zone (closest first, as Lua found them), each an array of that zone's options. May be empty.

**Empty tables.** Lua's JSON encoder can turn an empty table into `{}` rather than `[]`, and an array with holes into an object with numeric string keys. Accept arrays, objects (iterate values, keep numeric order) and `null`/missing for `options`, each group, `zones` and each zone.

**`Option`** (fields the UI uses; everything else is Lua-side and must be ignored):

| Field | Type | Meaning |
|---|---|---|
| `label` | string | Row text. Required in practice. Plain text, no markup. |
| `icon` | string? | Font Awesome class string. Missing → no icon (keep the label aligned). |
| `iconColor` | string? | Any CSS colour for the icon only. |
| `hide` | boolean? | `true` → don't render this option. **It still occupies its index** (§4). |
| `name` | string? | Script-chosen id. `'builtin:goback'` marks the injected back option. |
| `openMenu` | string? | Selecting it opens a submenu (Lua sends a new `setTarget`). `'home'` on the back option means "return to the root list". |
| `menuName` | string? | The submenu this option belongs to. |
| `distance`, `groups`, `items`, `anyItem`, `bones`, `offset`, `offsetAbsolute`, `offsetSize`, `resource`, `event`, `serverEvent`, `command`, `export`, `qtarget`, … | any | Lua-side only. Functions (`canInteract`, `onSelect`) may appear as non-JSON placeholders or be absent. |

### 2.4 Submenus

Submenus are driven entirely by Lua. Selecting an option with `openMenu` makes Lua record history, wipe the entity options, and on the next tick send `setTarget` with only the options whose `menuName` equals the open menu. While a submenu is open, Lua inserts at `__global[0]`:

`{ "name": "builtin:goback", "icon": "fa-solid fa-circle-chevron-left", "label": "<locale go_back, e.g. 'Go back'>", "menuName": "<current>", "openMenu": "home" | "<parent>" }`

The UI only has to post `select` for it like any other option. Optional polish: show options with `openMenu` as "opens more" (chevron) and the go-back option as a back row.

Focus stays on through submenu navigation (§3), so the cursor remains usable.

---

## 3. Focus and input (Lua-side behaviour the UI relies on)

| Moment | Lua does |
|---|---|
| Targeting active, no focus | Disables firing/aiming/melee controls. The eye shows; the cursor is **not** visible and the page gets no mouse events. |
| Player clicks (left by default; right if convar `ox_target:leftClick 0`) while there is a target | `SetCursorLocation(0.5, 0.5)`, `SetNuiFocus(true, true)`, `SetNuiFocusKeepInput(true)`. The cursor appears at screen centre, right on the eye. The game keeps receiving keyboard input (movement still works; camera look is disabled). |
| Focused and target lost, or player presses right mouse (control 25) | Focus off. The list stays (the next `leftTarget`/`setTarget` updates it). |
| `select` for an option **without** `openMenu` | Focus off, the option runs, and Lua ends targeting (`visible: false`) if NUI still reports focus at that moment. Otherwise targeting simply continues (hold mode: until the key is released) and later `leftTarget`/`setTarget` keep the list current. The UI must handle both. |
| `select` for an option **with** `openMenu` | Focus stays on; a fresh `setTarget` follows. |
| Targeting ends | Focus off, `visible: false`. |

Consequences for the UI:

- **The cursor starts at the exact screen centre.** The list must sit next to the centre (the original puts its first row just right of the eye) so the player can reach it with a short mouse move, and nothing clickable should sit *under* the centre point (a stray click there would select by accident).
- **No keyboard handling.** Keep-input means keys also reach the game; number-key shortcuts would fire weapon wheel slots etc. Escape is the game's pause menu.
- **No cancel callback.** Closing is the right mouse button or releasing the key, handled by Lua.
- **Stuck hover.** When focus drops right after a click, CEF never delivers the `mouseleave`, so the clicked row stays in its hover style. The original briefly disables pointer events on the clicked row (~100 ms). A replacement must make sure no hover style survives a click (e.g. drop pointer events / hover state on click and on every new message).

---

## 4. Outbound callback

### 4.1 `select`

Body: a JSON array `[type, id, zoneId]`.

| Element | Value |
|---|---|
| `type` | For entity/global options, the **key** the option came from in `options` (`'__global'`, `'globalTarget'`, `'model'`, `'entity'`, `'localEntity'`). For zone options, the literal string `'zones'`. |
| `id` | The option's **1-based index within its own array as received**, counting hidden options. (Hidden options keep their slot; never re-index after filtering.) |
| `zoneId` | Zone options: 1-based index of the zone in `zones`. Otherwise `null` (the original leaves it `undefined`, which `JSON.stringify` serialises as `null` inside an array). |

Examples: `["__global", 1, null]`, `["model", 3, null]`, `["zones", 2, 1]`.

Lua replies `1` immediately, then resolves `zones[zoneId].options[id]` or `options[type][id]` and runs it (`onSelect`, `export`, `event`, `serverEvent` or `command`). Unknown indexes are ignored. After a non-submenu option, Lua drops focus and ends targeting; the UI just waits for `visible: false`.

Fire `select` on **click** (mouse up of the primary button, i.e. the normal `click` event). One post per click; don't post on hover.

---

## 5. Timing summary

```
key down ──► visible{state:true}
             (aim)  ──► setTarget{options,zones}   (eye: has-target, list shown)
             (aim off) ─► leftTarget               (eye: idle, list cleared)
             (aim)  ──► setTarget ...
             click   ── Lua focuses, cursor at centre
             click row ─► POST select [type,id,zone] ─► 1
                 openMenu?  yes ─► setTarget (submenu, go-back first)
                            no  ─► focus off ─► visible{state:false}
key up  ──► visible{state:false}
```

`setTarget` can repeat with identical content (e.g. an option's `hide` toggled and back). Rendering must be cheap and must not animate in again for an unchanged list.

---

## 6. Implementation checklist

- [ ] Build output: `index.html` at the root of `web/`, relative asset URLs, everything bundled (no CDN fonts/icons).
- [ ] Transparent `html`/`body`, `overflow: hidden`, no text selection.
- [ ] Single `message` listener switching on `event.data.event`; unknown events ignored.
- [ ] Hidden until `visible:true`; `visible:false` hides and clears; `visible:true` clears and shows the idle eye.
- [ ] `leftTarget` clears the list and sets the eye idle, page stays visible.
- [ ] `setTarget` replaces the list; eye has-target; iterates `options` keys in arrival order, then `zones` in order.
- [ ] Accept arrays, objects and null for every collection.
- [ ] Skip `hide: true`, but keep original 1-based indexes.
- [ ] `select` body exactly `[type, id, zoneId|null]`, `type` = source key or `'zones'`.
- [ ] Icons: every free FA icon from class strings (`fa-solid`/`fas`/`fa-regular`/`far`/`fa-brands`/`fab`, `fa-fw` and other modifiers ignored); `iconColor` applied to the icon only.
- [ ] `openMenu` options look like "more"; `builtin:goback` looks like "back".
- [ ] List anchored just right of screen centre; nothing clickable under the centre point.
- [ ] No hover state survives a click or a new message.
- [ ] No keyboard handling, no focus natives, no cancel callback.
- [ ] Unchanged `setTarget` doesn't re-animate.
- [ ] Theme: load `nuikit/theme.css` like the other nuikit addons; legible over bright scenes.
