# Security review: Lua and NUI boundaries (Oct 22, 2026)

Scope: Lua under `systems/` (not `nuikit_hud`; `addons/` has none), `packages/core/lua`, NUI callbacks, net events,
exports, `systems/nuikit/server/*.js`, and the `create-nuikit` templates with server Lua. Against `dispatch.md` "Hard rules".

## Fixed

**High**
- job-sheet template: a row's `minGrade`/`onDutyOnly` did not guard the page it led to. A cadet could send
  `row { page = 'armory' }` and take armory items, and every grade received every page. Rows on pages a
  grade can't reach are now refused, and those pages are no longer sent.

**Medium**
- `nuikit` server (`doctor.js`): a client-sent `nuikit:intent { source = '__proto__' }` wrote into
  `Object.prototype` of the resource's JS runtime. The maps now have no prototype.
- Intent runtime (`systems/nuikit/client/intents.lua`): any resource could reuse another resource's intent id.
  That took over its menu (and the answer went to the victim's waiting call), or cancelled the call with
  `invalid`. Ids must now be in the caller's own `<resource>#` namespace, and a refusal never answers someone
  else's id. Updates are validated like opens (a page could patch a menu into an invalid shape).
- Server event flood: every drawn intent sent one `TriggerServerEvent`, so a prompt shown every frame cost the
  server an event per frame. The counts are now batched every 10 s, and the server takes one batch per 5 s per player.
- Zones and slots (`nuikit.lua`, `client.lua`): the handlers took **any** `player:*` bag. Another player who
  replicates their own bag could push zones or slots into every client's pages. Only the local player's bag counts now.
- bank template: deposit, withdraw and transfer trusted the page's `atm` flag and never checked where the player
  stood. They now use the server-side position (needs OneSync; without it money moves are refused).
- Per-player rate limits added where none existed: nuikit_stress (`hud:server:*Stress`, plus a 60/min relief
  cap: a cheat could clear its stress at will), bank, character-select, garage, inventory, job-menu, job-sheet,
  shop, vehicle-shop, phone `open` (a snapshot up to about 700 KB). Storefront's limit is now per request type,
  so its own refresh after a buy isn't refused.
- shop and storefront: stock came off only after payment, so two buyers could get the last item. Stock is now
  held first and returned on any failure.
- npc-dialogue example: greet, then rumours, then tip paid $100 in a loop (about $125/s). Choices now take a
  `cooldown`, kept by license; the tip has 30 minutes.

**Low**
- `nuikit:sf:*` / `nuikit:cam:*` apply only when the sender is the resource they name (no closing others' surfaces).
- The settings and keys exports (`settingsDefine`/`Draft`/`Save`/`Reset`/`Preset`/`Cancel`, `keysDefine`) act
  only for the invoking resource. Pages still edit any section through `https://nuikit/settings*`, by design.
- `settings.normalize` refused nothing for NaN (it passes every comparison, so it skipped the clamp).
- nuikit_dev: `/nk test items` takes back what it gave when a later AddItem fails. The restart queue (already
  convar-gated, never another command) passes `ensure` only names of resources that exist (`NkDev.queueNames`).
- vehicle-shop: the test-drive car is deleted if its player drops mid-spawn; `nkColour` handler type-checked.
  Page strings in `nuikit:renderer:failed` are capped.

Tests: new `core/test/lua/{boundaries,stress-server}.test.ts`, new cases in `intents`, `dev`, `doctor-server`
and 12 template specs. Core 649 passing, templates 875 passing.

## Checked, fine
`nuikit:command` (ace), `nuikit_pause:*` (1 s; a client drops only itself), `nuikit_death:doctors` (5 s,
read-only), loading handover (no identifiers), host tokens (the token picks the target, not the page),
`init.lua`'s `load` (nuikit's own files only), KVP keys (resource names), nuikit_dev (convar, ace, whitelist).

## Left
- Client-side checks only stop other *resources* on the same client. A cheat injector has every native, so the
  server checks are what protect a server. Host module tokens (`math.random` seeded with the game timer, one
  shared frame) keep a well-behaved module in its own lane but don't isolate a hostile one.
- character-select: `open` then `play` re-teleports and re-runs `Config.onPlay`. job-menu: a hire isn't asked
  to accept. Listeners of the templates' `:action` events should check `GetInvokingResource()`.
- bank `noteOf` can split a UTF-8 character; inventory's admin `_give` accepts `1e999`; scoreboard is O(N²) a second.
- Not seen in game: proven only in the Lua 5.4 harness.
