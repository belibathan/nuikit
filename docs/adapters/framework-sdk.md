# Framework SDK: put your own framework behind nuikit

*`bridge.lua` turns a framework's player data into one shape (`nuikit:player`, `usePlayer()`; protocol §7).
Qbox, QBCore and ESX are built in. Any other framework (a custom one, a fork, a standalone server) plugs in as
a small resource, with no edit to nuikit. Start from the template in `adapters/[nuikit-framework-template]/`.*

## Registration

A **framework adapter** is a client resource that exports the functions below and declares itself in its
fxmanifest:

```lua
nuikit_framework 'myframework'
```

`bridge.lua` runs inside every resource that imports nuikit, so the adapter is reached through exports of a
named resource. It is found like this, first match wins:

1. The convar `nuikit_framework`. A built-in name (`qbox`, `qbcore`, `esx`, `standalone`) forces that built-in;
   anything else is the **resource name** of a custom adapter (`set nuikit_framework "my_framework_adapter"`).
2. A started resource with `nuikit_framework` metadata (a custom adapter).
3. The built-ins, detected in order: `qbx_core`, `qb-core`, `es_extended`, else `standalone`.

`NUI.player.framework` is the adapter's resource name. Built-ins behave exactly as before.

## Contract (client)

Every field is optional; send what the framework has. Anything outside this table is dropped. `hunger`,
`thirst`, `stress` are clamped to 0-100; `cash` and `bank` must be numbers.

| Export / event | Args | Returns | Required | Called |
|---|---|---|---|---|
| `nuikitGetPlayer` | none | `{ loaded, id, name, cash, bank, job, gang, hunger, thirst, stress, downed }` | **yes** | at start; after each event in `nuikitEvents` |
| `nuikitPoll` | none | the same fields, only those that change continuously (needs) | no | about 4 times a second |
| `nuikitEvents` | none | `string[]` of local client event names | no | once at start |
| `nuikit:framework:update` (event) | `fields` | none | no | fired by the adapter, any time |

- `job` is `{ name, label, grade, gradeLabel, onDuty }`, `gang` is `{ name, label, grade, gradeLabel }`; both
  `nil` when the player has none. `downed = true` (last stand, bleeding out) makes `dead` true on the wire
  and is not itself sent (protocol §7.1).
- `loaded` defaults to "has an `id`". Return `{ loaded = false }` on character logout.
- Health, armor, dead and voice are read from natives by nuikit for every framework; the adapter does not
  provide them.
- A missing optional export, or one that errors, is skipped; a failing `nuikitGetPlayer` leaves the player not
  loaded. Nothing crashes the page.
- Updates are pushed to the page only when something changed (same as the built-ins).

## Minimal example

```lua
-- fxmanifest.lua
fx_version 'cerulean'
game 'gta5'
nuikit_framework 'myframework'
dependency 'nuikit'
client_script 'client.lua'
```

```lua
-- client.lua
exports('nuikitGetPlayer', function()
  local p = exports.myframework:GetCharacter()
  if not p then return { loaded = false } end
  return {
    id = p.id, name = p.name, cash = p.cash, bank = p.bank,
    job = { name = p.job.name, label = p.job.label, grade = p.job.rank, onDuty = p.job.duty },
    hunger = p.food, thirst = p.water,
  }
end)

exports('nuikitEvents', function() return { 'myframework:characterChanged' } end)
```

Server-side data is not part of this contract: nuikit's Lua halves are client-side. The full working template
(fake in-memory framework, every function) is in `adapters/[nuikit-framework-template]/`.

## A script built on fivem-foundation

[fivem-foundation](../../fivem-foundation/AGENTS.md) (the Lua standard every `.lua` here follows) forbids
dependencies other than oxmysql and routes notifications, progress and interaction through bridge hooks the
server owner fills in (`src/config/bridge_client.lua`, STANDARDS §10, §17). Its defaults draw with GTA natives:
the feed, the help text, a `DrawRect` bar. nuikit is the other half of that deal: the script keeps its hooks and
its freedom from dependencies, and the owner points the hooks at the intents, so the script renders in the
server's theme with everything else. No `dependency 'nuikit'`: the hook checks that nuikit runs and falls back
to the default when it does not.

```lua
-- src/config/bridge_client.lua in a foundation-style script. The nuikit resource exports one function per
-- intent kind (notify, progress, menu, input, confirm, prompt, target, radial, challenge); each opens the
-- intent for the calling resource and calls cb(result, reason) when it ends.
local function nuikitRunning() return GetResourceState('nuikit') == 'started' end

--- @param message string
--- @param notifyType 'info'|'success'|'error'|nil
function BridgeClientConfig.notify(message, notifyType)
  if not nuikitRunning() then return BridgeClientDefaults.notify(message, notifyType) end -- GTA feed
  exports.nuikit:notify({ description = message, status = notifyType or 'info' })
end

--- @param label string
--- @param durationMs number
--- @return boolean completed
function BridgeClientConfig.progress(label, durationMs)
  if not nuikitRunning() then return BridgeClientDefaults.progress(label, durationMs) end -- DrawRect bar
  local p = promise.new()
  exports.nuikit:progress({ label = label, duration = durationMs, cancel = true }, function(result) p:resolve(result == true) end)
  return Citizen.Await(p)
end
```

The intents are superset shapes of ox_lib's, QBCore's and ESX's (`docs/intents.md`), so the same two hooks
cover every status word a foundation script uses. The server-side hooks (`addItem`, `removeMoney`, …) stay
the framework's: nuikit is presentation and never owns gameplay.
