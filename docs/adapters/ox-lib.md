# ox_lib → intents (`[nuikit-ox]`, plan step 5)

*Oct 21, 2026, `feat/ox-routing`. Built and checked in the browser (POST logs identical, local and routed);
**not yet tested in game** (§6). Protocol: [`../ox-lib-protocol.md`](../ox-lib-protocol.md). Door:
[`../intents.md`](../intents.md) §4.*

## 1. Mechanism: page override, routed

ox_lib's UI functions run inside ox_lib itself, so the mechanism stays the **page override**
(`addons/ox_lib`, built into `ox_lib/web/build`; ox_lib's Lua is untouched). What changes in 0.7: the page no
longer draws notify, context and list menus, the input dialog, the alert, progress bar and circle, text UI and
the skill check itself. It translates each ox_lib message into an **intent** and posts it to the `nuikit`
resource's door (`POST https://nuikit/intent`); the `nuikit` frame draws it with the shared renderers, in the
one stack, with one focus owner, themed by the server's tokens, and a server's `nuikit_renderer` pack restyles
ox_lib too. The frame's answer (a result, a reason, events) becomes the **same ox_lib POST on the same
timing** as before, so ox_lib's Lua sees no difference. The radial menu and the clipboard stay local
(ox's radial transitions are timed by its Lua).

**Fallback.** Routing is on when the probe answers `{ ok, route = true }` (convar `nuikit_ox_route`, default
1; `setr nuikit_ox_route 0` turns it off server-wide) and the door keeps answering. Otherwise, and whenever a
door call fails (nuikit not started yet, stopped, an older runtime without the probe, a refused intent such as
a `busy` progress), the page draws that call **locally**, exactly as 0.6 did. ox_lib starts before nuikit, so
the page keeps asking every 2 s for the first minute, then every 30 s (the theme does the same); while routed
it re-probes every 10 s so `stop nuikit` is noticed.

## 2. The door (what this lane added to `systems/nuikit/client/intents.lua`)

The override door already took `{ intent, props, source, id }` (answered `{ id }` at once for non-yielding
kinds, at the end for yielding ones) plus `{ update }` and `{ cancel }`. Routing needed four small, delimited
additions (the block marked "ox routing additions"; tests in `packages/core/test/lua/intents.test.ts`):

| Call | Answer |
|---|---|
| `{ probe = true, source = 'ox_lib' }` | `{ ok = true, route = <convar> }`. An older runtime answers `{ error = 'invalid' }`: unknown, so local. |
| `{ listen = '<id>' }` | A long-poll: `{ id, events = { { event, data }, … } }` as soon as one is queued; `{ id, ended = true }` once the intent closed; `{ id, events = {} }` after 25 s so the page asks again. One listener per id. |
| a page id opened again | the first fetch is answered `{ id, reason = 'replaced' }` (it hung before) |
| nuikit stops | every pending page fetch is answered `{ id, reason = 'stopped' }`; the page then posts ox's close callback so ox_lib's Lua releases focus |

The sweep that answered pending fetches `timed out` after 120 s now leaves intents that are still open alone
(an ox context menu may stay open longer than that).

## 3. Field mapping (ox → intent), all lossless

Page keys: `context`, `menu`, `input`, `alert`, `progress`, `textui`, `skill`, `n:<id>` (a notify with an id) →
runtime ids `page:ox_lib#<key>`. Opening a key again replaces it in place (ox re-shows a context menu for
submenus without hiding; a new `textUi` swaps the text). Code: `addons/ox_lib/web/src/lib/intents.ts`.

| ox message | Intent | Fields | Answers → ox POST |
|---|---|---|---|
| `notify` | `notify` | `id` → `n:<id>`; `title`, `description`, `type` → `status` (success/error/warning, else info; the raw word in `meta.ox.type`), `icon`, `iconColor`, `iconAnimation`, `alignIcon`, `duration` (falsy → 3000, ox's default), `showDuration`, `position` (ox's `top`/`bottom` aliases are in the anchor enum), `style`, nuikit's `item` extension. Dropped when no title, description or item (ox). | none |
| `showContext` | `menu`, `input = 'cursor'` | `title`, `canClose`, `menu` (parent) ; options in `Object.entries` order, each row `id = <key>`, `label = title` (the key itself for a keyed option without one), `description`, `icon`, `iconColor`, `iconAnimation`, `image`, `progress`, `colorScheme`, `arrow` (`(menu or arrow) and arrow ~= false`), `menu`, `metadata`, `disabled`, `readOnly`; every non-submenu row gets `close = false` | event `select` → `clickContext "<key>"` (menu stays, as ox: Lua hides it); reason `submenu` → `openContext { id, back = false }`; `back` → `openContext { id = parent, back = true }`; `escape` / `close` / `stopped` → `closeContext`; `hideContext` → `{ cancel }` |
| `setMenu` | `menu`, `input = 'keyboard'` | `title`, `position`, `canClose`, `startIndex = startItemIndex + 1` (clamped); items `label`, `icon`, `iconColor`, `iconAnimation`, `values` (strings or `{ label, description }`), `defaultIndex`, `checked`, `progress`, `colorScheme`, `description`, `close` (precedence values > checked > progress, as ox) | `change` → `changeSelected [i, scroll \| checked \| null, 'isScroll' \| 'isCheck' \| null]` (100 ms debounce, also on open); `scroll` → `changeIndex [i, scroll]`; `check` → `changeChecked [i, checked]`; result or `select` → `confirmSelected [i, scroll \| null]`; `escape` / `stopped` → `closeMenu 'Escape'`; `close` (the renderer's Backspace) → `closeMenu 'Backspace'`; `closeMenu` in → `{ cancel }` |
| `openDialog` | `input` | `heading` → `title`, `options.size` (default xs), `allowCancel`; rows: `input` → `text` (+ `password`), `textarea`, `number`, `checkbox`, `select`, `multi-select` (`maxSelectedValues` → `maxSelected`), `slider`, `color`, `date`, `date-range`, `time`; `label`, `description`, `placeholder`, `icon`, `disabled`, `required`, `default`, `min`, `max`, `step`, `precision`, `minLength`, `maxLength`, `autosize`, `options` (values as strings), `clearable`, `searchable`, `checked`, `format`. `returnString` is **not** sent: the frame returns epoch ms and the page formats with dayjs (ox's tokens), as it does colours (`format` rgb/hsl…). | result → `inputData [values in row order]` 200 ms later (read from `byId`, since an array with `null`s crosses Lua as a table with holes); `cancel` / `escape` / `stopped` → `inputData` with no body; `closeInputDialog` → `{ cancel }`; a new `openDialog` drops a pending post |
| `sendAlert` | `confirm` | `header` → `title`, `content` → `description`, `size` (default md), `centered` (ox default false, stated), `cancel` (ox default false, stated), `labels`; `overflow` in `meta.ox` | `'confirm'` / `'cancel'` → `closeAlert`; Escape resolves cancel in the renderer (ox: always); `stopped` → `closeAlert 'cancel'`; `closeAlertDialog` → `{ cancel }` |
| `progress` / `circleProgress` | `progress` | `label`, `duration` (≥ 1), `style` bar / ring, `position` (`middle` → center, `bottom`), `showPercent` for the ring, **`cancel = false`** always (X stays ox's key: its Lua sends `progressCancel`), nuikit's `canCancel` extension in `meta.ox` | `true` → `progressComplete` 100 ms later (ox: after the exit transition, so after `duration`); `progressCancel` → `{ cancel }` then `progressComplete` 100 ms later (ox posts it after every hide); a second circle while one shows is ignored; `busy` (another resource's progress) → drawn locally |
| `textUi` | `prompt` | `text` → `keys` + `label` (`[E] - Open garage`; text without a leading key is the label whole), `position` (`right-center`… are in the enum), `icon`, `iconColor`, `iconAnimation`, `style` (an object, or CSS text parsed), `alignIcon` in `meta.ox` | none; `textUiHide` → `{ cancel }` |
| `startSkillCheck` | `challenge` | `difficulty` (same shape), `inputs` → `keys` | boolean → `skillCheckOver`; `skillCheckCancel` → `{ cancel }` + `skillCheckOver false` (ox's Lua waits for it); `stopped` → `skillCheckOver false` |

What the frame draws differently from the 0.6 page (not protocol): a context row's bar without `colorScheme`
takes the kit's default tone, not ox's `dark.3`; a list row's `description` is drawn under the label instead of
as a tooltip; markdown beyond bold / italic / code (GFM tables in an alert, headings in a notify) is drawn
plain; `canCancel`'s X chip on the progress slab is not drawn by the frame's renderer (it only shows
`cancelKey` when `cancel` is true); a skill check resolves 250 ms after the last key (the renderer shows the
outcome first), so `lib.skillCheck` returns that much later.

## 4. Focus and Escape

The page never calls focus natives. ox_lib's Lua sets focus as it always did (`lib.setNuiFocus`), then the
`nuikit` runtime opens the intent's surface (`intent:menu:cursor` for a context menu, `intent:menu:keyboard`
with keep-input for a list menu, `intent:input` / `intent:confirm` modal, `intent:challenge` keyboard-only)
and sets focus again with the same flags, so nuikit's frame is the one on top; Escape arrives in Lua through
`nuikit:escape` from that frame and reaches the renderer as `nuikit:back`. When the intent ends, nuikit
releases its surface, the page posts ox's callback, and ox_lib's Lua resets focus as before: both release.

## 5. Checking it

```bash
node bench/screens/run.mjs --name=ox_lib --out=before --shots=0            # the page draws locally (door 404)
OX_ROUTED=1 node bench/screens/run.mjs --name=ox_lib --out=after --shots=0 # a fake runtime answers the door
node bench/screens/diff.mjs ox_lib                                         # identical: 22 posts
```

`bench/screens/ox_lib/scenario.mjs` plays every routed feature's main flow; routed, a fake door answers the
way the runtime does (probe, held opens, `listen`, cancel, replaced) and the scenario plays the renderers.
`before.json` (the 0.7.0 page), `after.json` (this page, local) and `after-routed.json` are identical apart
from timestamps. The Lua side (probe, listen, replaced, stopped) runs under the wasmoon harness.

## 6. Unproven in game

1. **Whether ox_lib's page may fetch `https://nuikit/intent` at all** (spike step 8): if a page can only reach
   its own resource's callbacks, the probe fails and the page stays local (nothing breaks; routing is off).
2. Which frame gets keys and the cursor when both ox_lib's Lua and nuikit's runtime have set focus (§4): the
   list menu's arrows and the skill check's key must reach **nuikit's** frame. If they reach ox_lib's page
   instead, keyboard menus and skill checks would hang until Escape; then those two kinds go back to local
   until the runtime takes focus differently.
3. `stop nuikit` while an ox menu is open: the page should post `closeContext` / `closeMenu` and ox_lib
   release the cursor (the runtime answers `stopped` from its stop handler).
4. Resmon of ox_lib and nuikit with a list menu open (one `listen` fetch held per intent, one POST per
   keypress).
