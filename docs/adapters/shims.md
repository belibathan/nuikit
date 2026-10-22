# Export shims

*Old export names land in nuikit intents by config, with no rewrite in the calling scripts. Pack:
`adapters/[nuikit-shims]/nuikit_shims`. Not a clean-room adapter for one library: you describe the export, it
maps it. Unproven in game (Oct 2026).*

A server has scripts calling `exports['my_notify']:Notify(msg, type, ms)` or `exports['x']:ShowMenu(...)`, from a
resource it wrote, bought or can no longer change. Instead of editing every caller, `nuikit_shims` answers those
export calls and turns each into an intent (`nk.notify`, `nk.input`, `nk.menu`…).

## The constraint: `provide`

`exports(name, fn)` only registers under the **resource's own name**. FiveM resolves `exports['my_notify']:Notify()`
by triggering the event `__cfx_export_my_notify_Notify` and calling the function a handler hands back (the same
mechanism the other stand-ins use, e.g. `nuikit_okok_notify`). So `nuikit_shims` answers that event for each name
in its config, which works from one resource for any number of names. What it cannot do is replace a running
resource:

- **Stop the original** (`stop my_notify`, or never `ensure` it). With both running, both answer the event and the
  last setter wins.
- **`provide` each old name in `fxmanifest.lua`**, one line per name (several `provide` lines are fine). This keeps
  `dependency 'my_notify'` in other resources satisfied and start order right. The fxmanifest cannot read
  `config.lua`, so the two lists are kept in step by hand (the shipped manifest lists `my_notify` and `my_menu`).

One resource handles every name; you do not need one shim resource per old resource. Several servers' worth of
old names can sit in one config.

## Install

`ensure [nuikit-shims]` after `nuikit`; edit `config.lua`; add the `provide` lines; stop the originals. Client side
only (exports called from server scripts are out of scope).

## Config reference

`ShimConfig` is a list of entries:

| Key | Required | What |
|---|---|---|
| `resource` | yes | The old resource name, as callers write it in `exports['…']` |
| `export` | yes | The export name |
| `intent` | yes | `notify`, `menu`, `input`, `confirm`, `progress`, `prompt`, `target`, `radial`, `challenge` ([`../intents.md`](../intents.md)) |
| `args` | no | Positional arguments to intent prop names: `{ 'description', 'status', 'duration' }` means the 1st argument is `description`, the 2nd `status`… A `nil` argument is skipped |
| `map` | no | Value translation per prop, applied after `args`/`transform`: `{ status = { inform = 'info' } }` |
| `defaults` | no | Props used when the call did not set them: `{ title = 'Server' }` |
| `transform` | no | `function(...) return props end`: the escape hatch. Replaces `args`; `map` and `defaults` still apply after it |
| `result` | no | `function(result, reason) return … end`: shapes what the export returns for a waiting intent |

Order for one call: `transform(...)` or `args` → `map` → `defaults` (under, never over) → the intent.

**Return values.** `notify` and `prompt` fire and return nothing. The others wait for the player (the export
yields in the caller's thread, as the old one did) and return the intent's result: `menu` returns
`{ index, id, path, args… }`, `input` returns `{ values, byId }`, `confirm` returns `'confirm'`/`'cancel'`, or
`nil` on dismiss. If the old export returned something else (a bare value, a `true`), add a `result` function.

**Errors.** An entry with an unknown intent (or no `resource`/`export`) is skipped with one console line at load,
and calling it fails the way a missing export does. A `transform`, `map` or intent that throws at call time prints
once per export and the caller gets `nil`: the old script keeps running.

## Example 1: a notify export

The old call: `exports['my_notify']:Notify('Saved', 'inform', 3000)`, types `inform | success | error`.

```lua
{
  resource = 'my_notify', export = 'Notify', intent = 'notify',
  args = { 'description', 'status', 'duration' },
  map = { status = { inform = 'info' } },
  defaults = { title = 'Server' },
}
```

The call draws `nk.notify{ description = 'Saved', status = 'info', duration = 3000, title = 'Server' }`.
`Notify('Oops', 'error')` keeps `status = 'error'` and takes nuikit's default duration.

## Example 2: an input dialog

The old call: `local amount = exports['my_menu']:AskAmount('Withdraw', 'How much?')` returns the number, or `nil`.

```lua
{
  resource = 'my_menu', export = 'AskAmount', intent = 'input',
  transform = function(title, label)
    return { title = title, fields = { { id = 'amount', type = 'number', label = label or 'Amount', required = true } } }
  end,
  result = function(r) return r and r.byId.amount or nil end,
}
```

`nk.input` waits for the player; `result` turns `{ values, byId }` into the bare number the old export returned,
and Escape gives `nil`, so callers need no change.

## Tests

`node --test "bench/adapters/replay/shims/*.test.mjs"`: positional mapping, value map, defaults, transform, a
waiting intent returning its result (raw and through `result`), a cancel returning `nil`, an unknown intent
reported once, a throwing transform reported once and not crashing the caller. The mapping itself is pure Lua in
`shim.lua`; the harness fakes `nk`. **Unproven:** a real `provide` swap on a server, exports called from inside
another resource's thread with a real `Citizen.Await`.
