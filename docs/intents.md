# Intents

*Oct 2026, 0.7 step 2 (`docs/architecture.md` §2). The contract between a script that asks for UI and the
`nuikit` resource that draws it. Built and tested in the browser and under the Lua harness; **not yet tested in
game** (see §8).*

A script asks for an **intent** (`nk.notify{…}`, `nk.menu{…}`); the `nuikit` resource owns one stack of them,
draws each in its own frame with a **renderer** themed by the server's tokens, takes focus through surfaces
when one needs it, and answers the script. Old libraries reach the same place through adapters
(`docs/adapters/`), so a server gets one look, one Escape and one focus owner for every menu, toast and form,
whatever script asked.

## 1. Catalogue (v1)

| Intent | Yields | `update` | Drawn by | Resolves with |
|---|---|---|---|---|
| `notify` | no | yes | `notice`, one stack per position | nothing (ends on its timer, or `cancel`) |
| `menu` | yes | yes | `panel` + `menu-row` | `{ index, id, value?, checked?, path, fields, args }`, or nil + reason |
| `input` | yes | no | `form-field` presets in a centred panel | `{ values[], byId }`, or nil (`cancel`) |
| `confirm` | yes | no | `confirm` (scrim + panel) | `'confirm'` \| `'cancel'` |
| `progress` | yes | yes | `meter` (bar) or `progress-ring` | `true` when it ran out, `false` when cancelled |
| `prompt` | no | yes | `key-prompt`, one stack per position | nothing (`cancel`); `true` when a `hold` fills |
| `target` | yes | yes | an eye + `menu-row` list beside it | `{ index, id, path, args }`, or nil |
| `radial` | yes | yes | `radial-menu` | `{ index, id, path, args }`, or nil + reason |
| `challenge` | yes | no | `skill-check` | `true` when every round passed |

Every field of every intent is in `packages/core/intents/<name>.json`, with its doc string. The generated
types (`nuikit-core/intents`: `NotifyProps`, `MenuItem`, `InputField`…) and the LuaLS classes
(`NkNotifyProps`, `NkMenuItem`…, in `lib/intents.schema.lua`) carry the same docs, so the editor shows them.

Each schema is a **superset** of what the libraries we adapt can express: ox_lib (`docs/ox-lib-protocol.md`),
qb-menu / qb-input / qb-core notify and DrawText / progressbar / qb-radialmenu / qb-target, esx_notify /
esx_context / esx_menu_default / esx_menu_dialog / esx_progressbar / esx_textui, okokNotify and
mythic_notify (`docs/adapters/*.md`, "What the intent must cover"). Library-specific extras an adapter can't
map go in `meta` (never validated); unknown keys pass validation, so a newer script on an older runtime
still works.

## 2. Schemas: one source of truth

`packages/core/intents/*.json` (+ `_defs.json` for shared types: `icon`, `anchor`, `status`, `metadata`,
`difficulty`…) is the only place an intent is described. `pnpm intents` in `packages/core` (also part of its
build) runs `scripts/gen-intents.mjs`, which emits:

| Output | Used by |
|---|---|
| `packages/core/src/intents.generated.ts`: TS types, `INTENT_SCHEMAS`, `INTENT_VERSIONS` | pages, renderers, adapters, tests |
| `packages/core/lua/intents.schema.lua`: the same tables + `---@class` annotations | `lib/intents.lua` (validation), LuaLS |

Both are committed; a test fails when they are stale. The schema language is small on purpose (the validator
is 150 lines in each language and runs in Chromium 103 and Lua 5.4): `string` (min/maxLength), `number` /
`integer` (min/max), `boolean`, `enum`, `array` (items, min/maxItems), `object` (props, `open`), `oneOf`,
`ref` (a `_defs` entry), `self` (the enclosing object, for nested `items`), `any`; a prop adds `required`,
`default`, `doc`. Each intent has `version` (bumped on an incompatible change), `yields`, `update`, `props`,
`result`, `events`.

Validation runs **at the call**: `nk.menu({ title = 'x' })` errors with
`nk.menu: items is required (1 problem)`, `items[2].icon expected string or a list or a table, got number`, and so
on, so a typo fails in the script's own stack trace, never as a blank page. The runtime validates again what
reaches it (a raw event, an export, an override page) and drops what fails, with a console line.
`validateIntent(kind, props)` (TS) and `nk.intents.validate(kind, props)` (Lua) return the same issues.

## 3. Lifecycle and the Lua API

```lua
-- fxmanifest.lua: dependency 'nuikit' · shared_script '@nuikit/init.lua'
nk.notify({ title = 'Paid', description = '$500', status = 'success' })      -- returns a handle
local choice, reason = nk.menu({ title = 'Garage', items = { { label = 'Sultan', args = { plate = 'ABC' } } } })
if choice then print(choice.index, choice.id, choice.args.plate) else print('closed:', reason) end
local ok = nk.progress({ label = 'Repairing', duration = 5000, cancel = true })  -- false when cancelled
local p = nk.prompt('[E] Open garage')   p:update({ active = true })   p:cancel()
nk.menu(props, { cb = function(r, reason) … end, onChange = function(d) … end })  -- no yield; events
local h = nk.intents.open('radial', props, { async = true })   h:on('select', fn)   h:await()
```

Lifecycle: **open** → (**update** · **events**)* → **resolve** (a result) | **cancel** (no result, a reason).
Reasons: `escape`, `close`, `back`, `submenu` (an ox-style submenu id in `data.menu`), `timeout`, `cancel`
(the script), `replaced` (same id opened again), `busy` (a second progress), `stopped` (the runtime or the
caller stopped), `invalid`.

- Yielding intents wait with `promise` / `Citizen.Await` like `lib.*`; with `{ cb = fn }` or `{ async = true }`
  they return the handle at once. `on<Event>` keys in that table (`onChange`, `onSelect`, `onCheck`,
  `onScroll`, `onField`, `onHover`, `onRound`, `onBack`) listen to the intent's events.
- A caller-chosen `id` names the intent (`'<resource>#<id>'`): opening it again replaces it in place (a de-duped
  toast, a menu re-shown with new rows); a persistent toast is `duration = 0` plus an `id` to cancel later.
- Sugar: `nk.hidePrompt()`, `nk.cancelProgress()`, `nk.closeMenu()`, `nk.intents.cancelAll(kind?)`,
  `nk.intents.list()`. String forms: `nk.notify('Saved')`, `nk.prompt('[E] Open')` (the key is lifted into
  `keys`), `nk.progress(5000)`, `nk.challenge('hard')`. ox/qb status words (`inform`, `primary`, `danger`…) map
  to the four statuses.
- **Other languages:** `exports.nuikit:notify(props)` … `exports.nuikit:challenge(props, cb)` return the id and call
  `cb(result, reason, data)`; `exports.nuikit:intent(kind, props, cb)`, `intentUpdate(id, patch)`,
  `intentCancel(id, reason)`.

## 4. The wire

```
script (lib/intents.lua, in the caller)        nuikit (client/intents.lua)                 frame (web/, nuikit-core/intents)
  TriggerEvent nuikit:intent:open (id,kind,props) ─▶ validate · stack · surface ───▶ SendNUIMessage nuikit:intent { op='open', intent }
  TriggerEvent nuikit:intent:update (id,patch)   ─▶ merge · surface may change ────▶ { op='update', id, props }
  TriggerEvent nuikit:intent:cancel (id,reason)  ─▶ drop ──────────────────────────▶ { op='cancel', id, reason }
  ◀─ nuikit:intent:resolved (id,{result,reason,data}) ◀─ POST nuikit:intent:resolve { id, result?, reason?, data? }
  ◀─ nuikit:intent:event (id, event, data)         ◀─ POST nuikit:intent:event { id, event, data }
                                                     page (re)loaded: POST nuikit:intent:sync → { op='sync', intents[] }
```

The runtime trusts `GetInvokingResource()`, never a name in the payload: only the resource that opened an
intent can update or cancel it; a stopped resource's intents are cancelled in the frame and its focus
released; when `nuikit` itself stops, every waiting script gets `nil, 'stopped'`. One progress runs at a time
(a second is refused with `busy`, as every library does). The runtime binds **X** (`nuikit_cancel`) to cancel
a `cancel = true` progress, since the page has no keyboard focus during one. `GetGameTimer()` is stamped on
each intent (`at`) for timers that must survive a page reload (unproven, §8).

**Focus** goes through one surface per kind in the `nuikit` resource (`intent:menu` full · `intent:menu:cursor`
· `intent:menu:keyboard` (keepInput) · `intent:input` and `intent:confirm` (modal) · `intent:target` (while
`open`) · `intent:radial` · `intent:challenge` (keyboard, Escape ignored)); `notify`, `prompt`, `progress` and a
`focus = false` menu take none. The surface opens with the first intent of that kind and closes with the
last, so stacking and Escape are the same for an intent as for any other nuikit UI (`docs/protocol.md` §3).
Escape arrives in the frame as `nuikit:back` for that surface, and the renderer of that kind decides: a
`canClose = false` menu ignores it, a confirm resolves `cancel`, an input cancels unless `allowCancel = false`.

**Doctor:** every drawn intent fires `TriggerEvent('nuikit:intent', { source, intent, id })` in the `nuikit`
resource, so `nuikit doctor` (step 8) can count intents by source.

**Override pages** (an ox_lib or qb-core page living in another resource) have a door in:
`POST https://nuikit/intent { intent, props, source }` answers `{ id }` at once for non-yielding kinds and, for
yielding ones, when the intent ends (`{ id, result?, reason?, data? }`); `{ update = id, props }` and
`{ cancel = id }` as well. The page's `source` is recorded as `page:<source>` for the doctor and grants no
rights. Whether a page may fetch another resource's callback is the adapter spike's step 8 (unproven).

## 5. Renderers

A renderer draws one kind. It is a module in the host's format (`nuikit-core/module`): `mount(el, ctx)`
returns a cleanup; the frame gives it a `RendererContext` (`intents()`, `subscribe`, `resolve`, `cancel`,
`emit`, `onBack`, plus the module context). React renderers use `defineReactRenderer({ kind, Component })`
from `nuikit-core/intents-react`; the component receives `{ intents, ctx }` and re-renders on every change
of that kind. The defaults live in `systems/nuikit/web/src/renderers/<kind>.tsx`, built only from registry
components and kit utilities, tokens only, rem only (`docs/design.md`); the frame itself is `nuikit check`
level 3.

Replacing one: a resource that declares `nuikit_renderer 'notify'` and ships a module built with
`nuikitModule()` whose default export is a renderer will be loaded by the host and used instead of the
default, still themed and stacked by the runtime. The contract is in place (`RendererDefinition`,
`rendererContext()`); the fxmanifest discovery is step 9 (renderer packs) and is not built yet.

What the defaults do, beyond the schema docs:

- `notify`: ends itself on its timer (`timeout`), so the stack never grows; `duration = 0` stays; an `item`
  draws the item slab; icons: lucide names (bundled set), Font Awesome (`'fas fa-car'`, `['fab','discord']`:
  the free sets load as one chunk the first time one is named), or an image URL where the schema allows.
- `menu`: the newest menu is the one drawn (libraries replace, never stack). Mouse and keyboard; inline
  submenus (`items`) open in place with a back button; `menu: id` resolves `submenu`; `checked` rows toggle
  and emit `check`; `values` rows step with ←/→ (`scroll`) and resolve with the value index on Enter;
  `close = false` emits `select` and stays; `kind = 'header'` rows and `readOnly` rows are skipped by the
  keyboard; `field` rows (text, number, select, slider, checkbox) report in `field` events and `fields` on
  the result; `focus = false` draws without pointer events.
- `input`: every ox row type maps to a `form-field` preset; `required` blocks submit and marks the field;
  Enter submits; results come as ox does them (date as epoch ms unless `returnString`, number rounded to
  `precision`, empty select/multi-select as `null`).
- `confirm`: Escape always resolves `cancel` (even with `cancel = false`), `timeout` too; focus starts on
  Cancel when it is shown.
- `progress`: timed on one timer from mount; `value` turns it into a driven bar (`update`); cancel key hint.
- `prompt`: stacks per position; `hold` with `progress` from the game, or read here when the page has focus.
- `target`: eye at the centre (`active`, `success` tones), list beside it when `open`, first row on the eye's line.
- `radial`: inline submenus inside the component; right-click or Escape backs out, then closes (or emits `back`
  on a `sub` menu opened by id); `keepOpen` items emit `select`.
- `challenge`: one round per difficulty, `keys` picked at random per round; other keys fail the round
  (or are ignored when a `keys` list is given and they aren't in it), as ox does.

## 6. In the browser

`pnpm --filter nuikit-host-web dev`, then `?fixture=<name>` (`notify`, `menu`, `menu-keyboard`, `menu-cursor`,
`menu-esx`, `menu-preview`, `input`, `input-ox`, `input-qb`, `confirm`, `confirm-ox`, `progress`, `progress-ring`,
`progress-driven`, `prompt`, `target`, `target-eye`, `radial`, `challenge`, `all`), or `window.nk.open(kind, props)`
from the console; `window.nk.posts` is what reached Lua. `pnpm --filter nuikit-host-web shots [dir]` drives
every fixture with Playwright at 1920×1080, 2560×1440 and 1280×720 over the day scene, clicks and types
through each renderer, and writes the screenshots and `posts.json`.

## 7. Files

`packages/core/intents/*.json` (schemas) · `packages/core/scripts/gen-intents.mjs` · `packages/core/src/intents.ts`
(validator, store, wire types, renderer contract) · `src/intents-react.ts` · `src/intents.generated.ts` ·
`packages/core/lua/intents.lua` (the API, loaded by `init.lua`) · `lua/intents.schema.lua` ·
`systems/nuikit/client/intents.lua` (the runtime) · `systems/nuikit/web/src/{frame.tsx,renderers/,dev.tsx}` ·
`systems/nuikit/web/scripts/screenshots.mjs` · tests: `packages/core/test/intents.test.ts`,
`packages/core/test/lua/intents.test.ts`.

## 8. Unproven in game

Everything above ran in the browser (Playwright, three resolutions, POST logs) and under the Lua 5.4 harness
(events queued across resources, exports, resource stop). Not yet seen on a Qbox client:

1. The frame as the `nuikit` resource's page: it now loads React and the renderers (≈580 KB + fonts; the Font
   Awesome chunk only on first use). Memory and frame time with it idle.
2. Focus through the `intent:*` surfaces of the `nuikit` resource: cursor for a menu, none for a keyboard
   menu with keepInput, back to the game on resolve; Escape reaching the renderer as `nuikit:back`.
3. `Citizen.Await` on `nk.menu` from a script's thread, and `exports.nuikit:*` with a function argument from
   another resource (the harness mocks both).
4. `RegisterKeyMapping('nuikit_cancel', …, 'x')` cancelling a progress while the game has focus.
5. A page reload mid-progress: the timer restarts from the sync (it should resume from `at`).
6. `https://nuikit/intent` from another resource's page (spike step 8).
7. The item slab, `nk-first-row` beside the eye and the prompt stack on a real 1080p/1440p game frame.
