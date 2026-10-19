# ox_inventory NUI protocol — compatibility spec

Target: drop-in replacement for `ox_inventory/web/build` (ox_inventory **v2.48.0**, commit `488aa6d`).
Scope: everything that crosses the boundary between ox_inventory's client Lua and its NUI page, plus the UI-side rules (drag & drop, counts, optimistic updates) the Lua and server side rely on.

> Clean-room note. ox_inventory is GPL-3.0. This document describes the wire protocol and observable behaviour in our own words. It does not reproduce ox_inventory source, styles or markup. Message names, field names, locale keys and small literal values appear only as interface facts.

Conventions:

- **Inbound** means Lua → UI: `SendNUIMessage({ action, data })`, received as a `window` `message` event whose `event.data` is `{ action, data }`.
- **Outbound** means UI → Lua: `POST https://<GetParentResourceName()>/<name>` with `Content-Type: application/json; charset=UTF-8` and body `JSON.stringify(payload)` (`undefined` → no body). Every handler replies with JSON; the UI parses it with `res.json()`.
- **Slots are 1-based** everywhere (Lua tables). The UI never converts them.
- **Weights are grams.** The UI shows kg by dividing by 1000.
- Lua tables keyed by slot may arrive as a JSON **array** (possibly with `null` holes) or as a JSON **object** with string keys (`{"1": {...}, "7": {...}}`), depending on how sparse they are. Always read item lists with `Object.values(list).filter(Boolean)` and place each entry by its own `slot` field.
- Focus: Lua calls `SetNuiFocus(true, true)` + `SetNuiFocusKeepInput(true)` when the inventory opens and clears both when it closes. **The UI never touches focus.** It only asks Lua to close (`exit`).

---

## 0. Page and transport basics

| Item | Requirement |
|---|---|
| Entry | `ui_page 'web/build/index.html'`. |
| Files the manifest serves | `web/build/index.html`, `web/build/assets/*.js`, `web/build/assets/*.css`, `web/images/*.png`. **Nothing else under `web/build` is served** — no fonts, SVG, PNG or nested folders in the build. Everything must be inlined into the JS/CSS, and every emitted file must sit directly in `assets/` as `.js` or `.css`. |
| Base path | Relative (`./`). |
| Item images | Live in `web/images/` (outside `web/build`), so replacing `web/build` keeps them. |
| Resource name | `GetParentResourceName()` → `ox_inventory`. |
| Transparency | `html`/`body` transparent, no page scroll. |
| Native drag | The page cancels every `dragstart` (window listener, `preventDefault`) so images/text never start an HTML5 drag. Drag & drop is pointer-driven. |
| Busy lock | While a `swapItems` / `buyItem` / `craftItem` request is in flight, both grids ignore pointer input. |

### 0.1 Startup handshake

| Step | Direction | Name | Body | Effect |
|---|---|---|---|---|
| 1 | UI → Lua | `uiLoaded` | `{}` | Lua replies `1` and marks the UI ready. Lua blocks player setup until this arrives, so it must be posted on mount. Posting it again is harmless. |
| 2 | Lua → UI | `init` | Init payload (§2.1) | Sent once per character load, after `uiLoaded`. Carries locale, item registry, the player inventory and the image path. |
| 3 | Lua → UI | `displayMetadata` | §2.6 | Optional, any time after `uiLoaded` (scripts call `exports.ox_inventory:displayMetadata`). |

---

## 1. Message index

### 1.1 Inbound (Lua → UI)

| action | data | When |
|---|---|---|
| `init` | `{ locale, items, leftInventory, imagepath }` | Player loaded. |
| `setupInventory` | `{ leftInventory?, rightInventory? }` | Inventory opened (both sides), or right side swapped (e.g. a drop created while open → right only). **Opens the inventory.** |
| `refreshSlots` | `{ items?, itemCount?, weightData?, slotsData? }` | Server changed slots, max weight or slot count. |
| `closeInventory` | none | Lua closed the inventory (keybind, distance, `exit` reply, script). |
| `toggleHotbar` | none | Hotbar key pressed while the inventory is closed. |
| `itemNotify` | `[item, localeKey, count?]` | An item was added/removed/equipped/holstered. |
| `displayMetadata` | `{ metadata, value }[]` | Register extra metadata keys to show in tooltips. |
| `setInventoryVisible` | `boolean` | Handled by the original UI but **never sent by v2.48.0 Lua**. Support it anyway (show/hide without data). |

### 1.2 Outbound (UI → Lua)

| name | body | reply | Purpose |
|---|---|---|---|
| `uiLoaded` | `{}` | `1` | Handshake. |
| `getItemData` | item name (`string`) | full client item definition or `null` | Lazy-load an item the registry doesn't know (§2.3). |
| `swapItems` | `{ fromSlot, fromType, toSlot, toType, count }` | `true`, a number, or `false` | Every move/stack/swap/split/drop (§4). |
| `buyItem` | `{ fromSlot, fromType, toSlot, toType, count }` | `true`/`false` | Buy from a shop (§5). |
| `craftItem` | `{ fromSlot, fromType, toSlot, toType, count }` | `true` (always, immediately) | Craft from a bench (§6). |
| `useItem` | slot (`number`, bare) | `1` | Use a player item. |
| `giveItem` | `{ slot, count }` | `1` | Give to nearby player (Lua picks the target). `count` is the amount field (0 = all). |
| `removeAmmo` | slot (`number`, bare) | `1` | Unload a weapon. |
| `removeComponent` | `{ component, slot }` | `1` | Detach a weapon attachment (`component` = attachment item name). |
| `useButton` | `{ id, slot }` | `1` | Custom item button. `id` is **1-based** (index in the item's `buttons` + 1). |
| `exit` | none | `1` | Ask Lua to close. Lua answers with `closeInventory` too. |

---

## 2. Data model

### 2.1 `init`

| Field | Type | Notes |
|---|---|---|
| `locale` | `Record<string,string>` | Every locale key starting with `ui_`, plus `$` and `ammo_type` (§9). |
| `items` | `Record<name, ItemData>` | Client item registry (§2.3). Merge into the registry (don't replace keys already learned via `getItemData`). |
| `leftInventory` | `{ id, slots, items, maxWeight }` | The player's own inventory. **No `label`, `type` or `groups` here** — those arrive with `setupInventory`. Treat it as type `player`. |
| `imagepath` | `string` | Convar `inventory:imagepath`, default `nui://ox_inventory/web/images`. Empty/absent → keep the current path (initial value `images`). |

`init` sets up the left inventory (§2.4) without opening the UI. The hotbar uses it.

### 2.2 Inventory

```ts
type Inventory = {
  id: string | number;        // player server id, stash name, "trunk<plate>", drop id, shop id, bench id…
  type: string;               // see table below
  slots: number;
  items: Slot[] | Record<string, Slot>;   // sparse
  weight?: number;            // as stored server-side (not used for display; the UI sums slot weights)
  maxWeight?: number;         // 0/absent → no weight readout or bar
  label?: string;
  groups?: Record<string, number>;  // player: the player's groups→grade; shop: required groups
  // Lua-side extras that may be present and must be ignored: coords, distance, instance, index, entity, door, netid, ignoreSecurityChecks
};
```

| `type` | Side | Meaning |
|---|---|---|
| `player` | left | The player. Also the only source of `groups` for shop checks. |
| `newdrop` | right | Default right side when nothing else is open: the ground. `id`/`label` absent. Dropping here creates a drop. |
| `drop` | right | An existing ground drop. |
| `stash`, `trunk`, `glovebox`, `dumpster`, `policeevidence`, … | right | Server containers. No special UI rules. |
| `container` | right | An item container (bag) opened from a player slot whose `metadata.container` equals this inventory's `id`. |
| `otherplayer` | right | Searching / robbing another player (`label` is `""`). |
| `inspect` | right | Viewing someone's inventory (`viewInventory`). |
| `shop` | right | Shop (§5). |
| `crafting` | right | Crafting bench (§6). |

### 2.3 Item registry (`ItemData`)

Global map, by item name: `{ label, stack, close, count, description?, buttons?: {label, group?}[], ammoName?, image? }`.

- `count` = how many the player owns in total. Kept current by `refreshSlots.itemCount` deltas. Used by the crafting check.
- `image` is already resolved by Lua (absolute URL, or `imagepath/<file>`).
- `getItemData` returns the raw client item definition (it has `name`, `label`, `stack`, …). Store it only if it has a `name`.
- Whenever a set-up inventory contains an item name missing from the registry, call `getItemData(name)` once and store the reply.

### 2.4 Slot

```ts
type Slot = { slot: number } & Partial<{
  name: string; count: number; weight: number;      // weight = total grams for the stack
  metadata: Record<string, any>;
  // shop / crafting only:
  price: number; currency: string; grade: number | number[]; license: string;
  ingredients: Record<string, number>; duration: number;
}>;
```

- A slot "has an item" when it has `name` and `weight`.
- Setting up an inventory builds a dense array of `slots` entries: slot `i` gets the entry whose `slot === i`, or `{ slot: i }`.
- **Durability** (`durability`, derived, not sent): from `metadata.durability`; if that is > 100 and `metadata.degrade` exists, it's an expiry timestamp: `((metadata.durability − nowSeconds) / (60 × degrade)) × 100`. Clamp at 0. Recomputed whenever a slot is set up, refreshed, moved or swapped (not live).
- Notable metadata: `label` (overrides display name), `description` (markdown), `type` (shown in tooltip header), `image` (image file name), `imageurl` (absolute image URL), `durability`, `degrade`, `ammo`, `serial`, `registered`, `components` (attachment item names), `weapontint`, `container` (id of the inventory it opens), `weight`, `count`.

### 2.5 Image lookup (exact rule)

For a slot:
1. `metadata.imageurl` → use as is.
2. `metadata.image` → `${imagepath}/${metadata.image}.png`.
3. Otherwise by name, as below.

By name (also used for shop currencies and crafting ingredients):
1. Registry entry with `image` → that.
2. Otherwise `${imagepath}/${name}.png` (whether or not the item is registered).

Images that fail to load show a neutral placeholder.

### 2.6 `displayMetadata`

Array of `{ metadata: key, value: label }`. Append each entry whose `value` (label) isn't already registered. In tooltips (non-crafting), for every registered entry whose key is truthy in the item's metadata, show `label: metadata[key]`, in registration order.

---

## 3. Visibility and layout

- Hidden on load. `setupInventory` shows it. `closeInventory` hides it, cancels any drag, closes the context menu and tooltip. `setInventoryVisible(bool)` sets visibility.
- Layout: left inventory (player), centre controls (amount input, Use, Give, Close, help), right inventory.
- Each grid header: label and, when `maxWeight` is truthy, `current/max kg` where `current = floor(sum(slot.weight) × 1000)/1000` grams → shown as kg; plus a weight bar (percent = current/max).
- Player slots 1–5 show their hotbar number.
- Slot face: image; weight (`≥1000 g` → kg with at least 2 decimals, else grams; hidden at 0); count (`N` with thousands separators, `x` suffix); label (`metadata.label` → registry label → name); durability bar when `durability` is defined (not in shops); in shops the price (§5).
- `setupInventory` with only one side updates that side only. It also resets the "shift held" flag and the busy flag.

---

## 4. Moving items — `swapItems`

### 4.1 Gestures

| Gesture | Source | Target | Result |
|---|---|---|---|
| Drag & drop onto a slot | any non-shop/non-crafting slot with an item | any slot in player or right inventory except shop/crafting, and not the same slot | move/stack/swap |
| Drag from shop | shop slot | player slot | `buyItem` (§5) |
| Drag from crafting | crafting slot | player slot | `craftItem` (§6) |
| Shift held while dropping | | | count = half (§4.2) |
| Ctrl + left click | player or right slot (not shop/crafting) | auto: the *other* inventory | quick move (§4.3) |
| Ctrl + Shift + left click | same | same | quick move half |
| Alt + left click | player slot | — | `useItem(slot)` |
| Right click | player slot with item | — | context menu (§7) |
| Drop on **Use** button | player item | — | `useItem(slot)` |
| Drop on **Give** button | player item | — | `giveItem({slot, count: amount})` |

Shop and crafting slots are never drop targets. A slot can't be dropped on itself.

### 4.2 Count

`amount` = the centre input (integer, 0 = "all"). For a move from a non-shop source:

- Shift held and stack `count > 1` → `floor(count / 2)`.
- Else `amount === 0 || amount > count` → whole stack.
- Else `amount`.

### 4.3 Target resolution for quick moves (no explicit target)

Target inventory: player → right inventory; right → player. Target slot:
- non-stackable item → first empty slot;
- stackable → first slot with the same name **and deep-equal metadata**, else first empty slot.
No slot → do nothing.

### 4.4 Container guards (client-side, before posting)

If the dragged item is a container (`metadata.container` set):
- target inventory type `container` → refuse (no container in a container);
- that container is the open right inventory → refuse (can't move an open bag).
If the target slot holds the container currently open on the right → refuse.

### 4.5 Request and optimistic update

Post `swapItems` with `{ fromSlot, fromType, toSlot, toType, count }` (`fromType`/`toType` = inventory `type` strings, e.g. `player`, `stash`, `newdrop`). Snapshot both inventories first, then apply locally at once:

- **Stack** — target has an item (strict: `name`, `count`, `weight`), item is `stack`able, same name, deep-equal metadata: target `count += n`, weight scaled by unit weight; source keeps `count − n` (or becomes empty).
- **Swap** — target has a different/unstackable item: exchange the two whole slots (keep their slot numbers), recompute durability.
- **Move** — target empty: target gets the source item with `count = n`, weight = unit weight × n, durability recomputed; source keeps the rest or becomes empty.

Reply:
- `false` → restore the snapshot.
- a **number** → success; it's the new weight of the open container: set `weight` on the player slot whose `metadata.container === rightInventory.id`.
- anything else → success (Lua follows up with `refreshSlots` carrying the authoritative slots).
- network error → restore the snapshot.

Lua replies `false` immediately while another swap is in flight, while the inventory is closed/busy, or while an item is being used. A drop to `newdrop` while in a vehicle or falling is refused.

---

## 5. Shops — `buyItem`

- Shop slots carry `price`, optional `count` (stock), `currency` (absent/`money` = cash, `black_money`, or any item name), `grade`, `license`, `metadata`.
- Price display (only when `price > 0`):
  - `currency` absent or `money` → `${locale.$ ?? '$'}${price}` in a "money" (green) tone;
  - `black_money` → same text in a "dirty money" (red) tone;
  - any other currency item → that item's image + price.
- **Buyable check** (otherwise greyed out and not draggable):
  - `count === 0` → no (sold out);
  - `grade` undefined or the shop has no `groups` → yes;
  - player has no `groups` → no;
  - `grade` array → yes if, for any group in the shop's `groups` that the player has, the player's grade equals one of the listed grades;
  - `grade` number → yes if the player's grade in any of the shop's groups is `>= grade`.
- Drag a shop slot onto a player slot → post `buyItem { fromSlot, fromType: 'shop', toSlot, toType: 'player', count }`, with `count = amount === 0 ? 1 : (stock defined ? min(amount, stock) : amount)`. No optimistic move; the grid is busy until the reply. `false` → nothing changes. Lua sends the resulting slots via `refreshSlots` (player slot, and the shop slot with the new stock) and shows notifications itself.

## 6. Crafting — `craftItem`

- Bench right inventory: `{ type: 'crafting', id, label, index, slots, items }`. Each recipe slot: `name`, `slot`, `weight`, `ingredients: { name: n }`, optional `duration` (ms, default 3000), `count` (output count), `metadata`.
- Ingredient amounts: `n ≥ 1` = consumed count; `0 < n < 1` = durability fraction consumed from a tool (shown as `n×100%`); `0` = tool required, not consumed.
- **Craftable check** (otherwise greyed out and not draggable): every ingredient must be satisfied —
  - `n ≥ 1`: registry `count ≥ n`;
  - `n < 1`: some player slot with that name has `metadata.durability ≥ n × 100`.
- Drag a recipe onto a player slot → post `craftItem { fromSlot, fromType: 'crafting', toSlot, toType: 'player', count: amount === 0 ? 1 : amount }`. Lua replies `true` at once and then crafts `count` times, each with an ox_lib progress circle; results arrive via `refreshSlots`. Re-evaluate the craftable check after every `refreshSlots`.

## 7. Context menu (player items only)

Opened at the cursor by right-clicking a player slot with an item. Entries, in order:

| Entry | Shown when | Action |
|---|---|---|
| `ui_use` (Use) | always | `useItem(slot)` |
| `ui_give` (Give) | always | `giveItem({ slot, count: amount })` |
| `ui_drop` (Drop) | always | quick move to the right inventory (§4.3; normally `newdrop`) via `swapItems` |
| `ui_remove_ammo` | `metadata.ammo > 0` | `removeAmmo(slot)` |
| `ui_copy` | `metadata.serial` | copy the serial to the clipboard (`execCommand('copy')`, no Clipboard API) |
| `ui_removeattachments` ▸ | `metadata.components` non-empty | submenu, one entry per component (label from registry) → `removeComponent({ component, slot })` |
| custom buttons | registry `buttons` | in order; buttons sharing a `group` go into a submenu named after the group (first occurrence position); → `useButton({ id: index + 1, slot })` |

Escape or an outside click closes the menu.

## 8. Tooltip, hotbar, notifications

**Tooltip** — opens 500 ms after the pointer rests on an item, follows the cursor (flip/shift inside the viewport), closes on leave or click.
- Unregistered item: just the name.
- Header: display label; right side shows `metadata.type`, or for crafting the duration in seconds (`(duration ?? 3000)/1000`s).
- Description: `metadata.description` or registry `description`, markdown.
- Non-crafting rows: `ui_durability: trunc(durability)`, `ui_ammo: metadata.ammo`, `ammo_type: <label of registry ammoName>`, `ui_serial`, `ui_components: labels joined by ", "`, `ui_tint: weapontint`, then `displayMetadata` rows.
- Crafting: ingredient list sorted by amount ascending, each with image and text `N× label` (`n ≥ 1`), `label` (`0`), `n×100% label` (fraction).

**Hotbar** — `toggleHotbar`: if visible, hide; else show the first 5 player slots and auto-hide after 3 s (restart the timer on each show).

**Item notifications** — `itemNotify [item, key, count?]`: text `${locale[key]} ${count}x` when `count` is truthy, else `locale[key]`. Keys used: `ui_added`, `ui_removed`, `ui_equipped`, `ui_holstered`. Shows the item image + label (`metadata.label` → registry label). Each lasts 2.5 s; they queue side by side.

## 9. Locale keys

Received in `init.locale`: `ui_use`, `ui_give`, `ui_close`, `ui_drop`, `ui_removeattachments`, `ui_copy`, `ui_durability`, `ui_ammo`, `ui_serial`, `ui_components`, `ui_tint`, `ui_usefulcontrols`, `ui_rmb`, `ui_ctrl_lmb`, `ui_shift_drag`, `ui_ctrl_shift_lmb`, `ui_alt_lmb`, `ui_ctrl_c`, `ui_remove_ammo`, `ui_removed`, `ui_added`, `ui_holstered`, `ui_equipped`, `ammo_type`, `$`. Fallback to English when missing.

## 10. `refreshSlots`

```ts
{
  items?: { item: Slot; inventory?: string | number } | Array<…>;  // single object or array
  itemCount?: Record<name, number>;                                // deltas, added to registry counts
  weightData?: { inventoryId; maxWeight };
  slotsData?: { inventoryId; slots };
}
```

- `items`: `inventory` absent or `'player'` → left; anything else (an id or type) → right. Replace slot `item.slot` with `item` (an entry with only `slot` empties it), recomputing durability. If a refreshed slot is the one being dragged, cancel the drag.
- `itemCount`: add each delta to the registry count (ignore unknown items).
- `weightData`: set `maxWeight` of the side whose `id` matches.
- `slotsData`: set `slots` of the side whose `id` matches and rebuild its dense array.

## 11. Keyboard

- `Escape` (on **keyup**, `KeyboardEvent.code`): hide locally, close tooltip/menu, post `exit`.
- `Shift` held (keydown/keyup) = split-half mode for drops and quick moves. Reset on `setupInventory`.
- `Ctrl+C` while hovering a weapon with a serial: copy it (the locale string `ui_ctrl_c` advertises this).
- Lua also closes the inventory on its own keybind (game input stays on via KeepInput), so the UI must accept `closeInventory` at any time, including mid-drag.

## 12. Quirks

1. `init.leftInventory` has no `type`; `setupInventory.leftInventory` does (`player`).
2. `useItem` and `removeAmmo` bodies are bare numbers, not objects.
3. `useButton.id` is 1-based; everything else uses slot numbers as-is.
4. `craftItem` always replies `true`; failures come as ox_lib notifications.
5. The original renders large inventories in pages of 30 slots as you scroll. Pure performance; any approach works.
6. The original fetch wrapper replaces `window.fetch`/`XMLHttpRequest` with no-ops for other code on the page. Not part of the protocol.
7. The `0`-amount crafting ingredient check in the original requires a durability metadata value on the tool. A replacement may treat `0` as "owns at least one" (the server validates either way).

---

## Implementation checklist

- [ ] One message listener; ignore unknown actions.
- [ ] `post(name, body)` to `https://${GetParentResourceName()}/${name}`, JSON body, JSON reply.
- [ ] Post `uiLoaded {}` on mount; load the server theme from the `nuikit` resource.
- [ ] `init`: locale, registry merge, image path, left inventory set-up (hidden).
- [ ] Dense slot arrays from sparse array/object lists; durability derivation; `getItemData` for unknown items.
- [ ] `setupInventory` (either side), show; `closeInventory` hides and cancels drag/menu/tooltip; `setInventoryVisible`.
- [ ] Grid headers with label, kg readout and weight bar; slot faces (image, weight, count, label, durability, hotbar numbers 1–5, price).
- [ ] Image rule §2.5 including `imageurl`, `metadata.image`, registry `image`, fallback `imagepath/name.png`; placeholder on error.
- [ ] Pointer-event drag & drop (no HTML5 DnD), drag preview under the cursor, drop highlighting, cancel `dragstart`.
- [ ] Count rule §4.2 with Shift; quick moves §4.3 (Ctrl, Ctrl+Shift); Alt-click use; container guards §4.4.
- [ ] Optimistic stack/swap/move with snapshot rollback; number reply → container weight; busy lock.
- [ ] Shop: price/currency display, buyable check, `buyItem` count rule, busy until reply, rollback on false.
- [ ] Crafting: duration header, ingredients tooltip, craftable check, `craftItem` count rule.
- [ ] Use/Give drop targets and buttons in the centre; Close → `exit`; amount input with thousands separators (0 = all); useful controls dialog.
- [ ] Context menu §7 including ammo, serial copy, attachments submenu and grouped custom buttons.
- [ ] Tooltip §8 with metadata rows and `displayMetadata`.
- [ ] Hotbar toggle with 3 s auto-hide; item notifications (2.5 s, queued).
- [ ] `refreshSlots`: items (single or array), itemCount deltas, weightData, slotsData; cancel drag on a refreshed dragged slot.
- [ ] Escape keyup → `exit`; Ctrl+C serial copy.
- [ ] Build: only `index.html` + `assets/*.js` + `assets/*.css`; no other files; transparent body; never call focus natives.
