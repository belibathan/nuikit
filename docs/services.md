# Services: camera and controls

*Status: built (0.7 step 3, `feat/services`), proven under the Lua 5.4 harness, **not yet tested in game**. The
in-game checklist is at the end. Design: [`architecture.md`](architecture.md) §1. Surfaces, the first service, are in
[`protocol.md`](protocol.md) §3.*

A service is something every UI shares and must not fight over. Each one has **one owner at a time, a stack, and
restoration** on close, when the owning resource stops, and when the player goes down. Both services load with the
runtime (`shared_script '@nuikit/init.lua'`), cost nothing while idle, and work in every resource that imports nuikit
(`packages/core/lua/camera.lua`, `controls.lua`; the `nuikit` resource serves them as `lib/`).

## `nk.camera`

One scripted camera on screen at a time, always given back.

```lua
-- a clothing shop: the camera in front of the player, blending in over half a second
local cam = nk.camera.claim({
  id = 'fitting', target = PlayerPedId(), offset = { y = 2.2, z = 0.6 }, look = { z = 0.4 }, fov = 45, duration = 500,
})
-- … later
cam:release({ ms = 600 })                       -- blend back to what was below (the game, or the claim under it)

-- a garage: a point in the world, static
local cam = nk.camera.claim({ id = 'bay', target = { x = 215.0, y = -810.0, z = 30.0 }, heading = 0.0, offset = { y = -7.0, z = 2.5 } })

-- a map, or anything that drives the camera itself: no target
local cam, from = nk.camera.claim({ id = 'map' })  -- from = the view it started on ({ coord, rot, fov })
SetCamCoord(cam.cam, x, y, z)                      -- cam.cam is the handle; move it however you like
cam:stream(x, y, z)                                -- stream the world around a far point while the claim lasts
cam:release({ instant = true })
```

### Options

| Option | What |
|---|---|
| `id` | A name for the claim (default: a counter). Claiming an id you already hold replaces that claim. |
| `target` | An entity, or `{ x, y, z }`. With a target the service places the camera; without one you drive it. |
| `offset` | Camera position relative to the target, in its frame: `x` right, `y` forward, `z` up. Default `{ y = 2.2, z = 0.6 }`. |
| `look` | What it points at, relative to the target. Default `{ z = 0.4 }`. |
| `fov` | Default: the view it starts from (no target) or 50 (target). |
| `duration` | ms to blend in from the gameplay camera (target only; default 0, a cut). On top of another claim it is always a cut. |
| `lockHeading` | Keep the heading the entity had at claim time (default `true`): on foot GTA turns the ped toward the camera, which would spin it (0.7.0 F5). `false` follows the entity's heading, which is what a vehicle wants. |
| `heading` | The frame's heading for a point target (default 0). |
| `follow` | Update the camera every frame as the entity moves (default `true` for an entity). |
| `onSuspend()` / `onResume()` | Another claim went on top / left again. |
| `onLost(reason)` | The service released the claim: `'dead'`. |

The handle has `id`, `cam` (the camera handle), `:release(opts)`, `:stream(x, y, z)`, `:isActive()`.
`release` takes `{ instant = true }` or `{ ms = n }` for the blend back to the gameplay camera (default 600 ms).
Also: `nk.camera.release(idOrHandle, opts)`, `nk.camera.owner()` → resource, id of the top claim, `nk.camera.isActive()`,
`nk.camera.handle()` (this resource's top camera), `nk.camera.get(id)`, `nk.camera.stack()`, `nk.camera.down()`
(dead to GTA, or the client-wide `'dead'` state), `nk.camera.pose(claim)` (the maths, for tests).

### Semantics

- **Seamless.** A claim starts exactly where the picture is (`GetFinalRenderedCam*`), so taking the screen is a cut
  to the same view; a targeted claim then blends over `duration`.
- **Stack.** Every resource keeps the same client-wide stack (replicated through local events, like surfaces). A
  claim on top **suspends** the one below: its camera stays (inactive) and its owner's loop may keep moving it.
  Releasing the top **resumes** the one below (a cut: there is no interpolation between two resources' cameras).
  Releasing a suspended claim changes nothing on screen. Releasing the last claim gives the gameplay camera back
  with a blend. Only the owner can release its claim.
- **Resource stop.** A resource releases its own claims as it stops; the claim below resumes, or the game comes
  back instantly. Every other copy drops whatever that resource left behind.
- **Death.** Each resource with a claim polls `nk.camera.down()` every 250 ms and releases everything it holds,
  instantly, then runs `onLost('dead')`. With claims in several resources the last one to notice restores the
  gameplay camera, so the hand-back can take up to 250 ms.
- **Streaming** (`SetFocusPosAndVel`) is per claim and cleared with it.
- **Cost.** Idle: no thread, nothing per frame. With a claim: one thread per resource that wakes every 250 ms
  (the death check), and a targeted entity claim on top also updates its camera every frame (4–5 natives:
  expected ≈ 0.01–0.02 ms in resmon). Manual claims (the pause menu) cost only their own loop.

### The pause menu

`systems/nuikit_pause/client/camera.lua` is now a thin shim over `nk.camera` that keeps the menu's hand-over
behaviour: inside the resource one id holds the camera at a time, and claiming another id releases the previous
one with no blend and runs its `onLost('handover')`. `focus.lua` and `map3d.lua` are unchanged. Death and the
resource stopping are the service's job now.

## `nk.controls`

Which game controls are off while a UI is open, merged across UIs.

```lua
local h = nk.controls.disable('movement')                    -- a preset
local h = nk.controls.disable({ 'look', 'weapons', 24, 25 })  -- presets and ids, any mix
nk.controls.release(h)  -- or h:release()                    -- only this set goes; what others need stays off

-- the usual case: tie it to a surface, held while the surface is open
local shop = nk.surface('shop', { layer = 'panel', controls = { 'movement', 'weapons' } })
```

Presets (GTA control ids): `all` (`DisableAllControlActions`), `movement` (walk, sprint, jump, duck, cover, enter
vehicle), `look`, `weapons` (attack, aim, select, reload, melee, the weapon wheel and slots), `vehicle` (steer,
accelerate, brake, exit, handbrake, horn, radio, flying), `frontend` (pause menus, interaction menu, chat, push to
talk). Numbers are control ids in group 0.

Options: `onDeath = 'keep'` keeps the set when the player goes down (for the death screen's own set); the default
releases it. `name` labels it for debugging.

Also: `nk.controls.isDisabled(id)`, `nk.controls.active()` (the union, or `'all'`), `nk.controls.count()`,
`nk.controls.releaseAll()`, `nk.controls.resolve(spec)`, `nk.controls.tick()` (one frame, for tests).

### Semantics

- **Union.** Everything any active set in this resource names is disabled every frame. Each resource disables
  its own union; together they are the union across UIs (the natives are per frame and global, so no replication
  is needed).
- **Release.** A set released by its handle removes only its own controls. A surface's set follows its open
  state: open (also from the page), close, Escape, an exclusive surface closing it, a resource stop.
- **Resource stop.** The loop dies with the resource and `DisableControlAction` is per frame, so controls come back
  the next frame.
- **Death.** Every set without `onDeath = 'keep'` is released (polled every 250 ms inside the loop).
- **Cost.** Idle: no thread. Active: one loop per resource holding a set, one `DisableControlAction` per id in the
  union (`'all'` is one native). `movement` is 11 natives a frame: expected ≈ 0.01–0.03 ms in resmon.

## Unproven in game

- `SetCamActive(cam, false)` on a suspended claim's camera, then `SetCamActive(cam, true)` to resume it while
  `RenderScriptCams` stayed on, across two resources. The pause menu's hand-over (same resource, destroy the old
  camera) is the proven path; suspend/resume between resources is new.
- The targeted camera's placement (`pose`): the maths is tested, the look in game is not (default offset and look
  may want tuning for peds vs vehicles).
- `RenderScriptCams(true, true, duration, …)` for the blend-in of a targeted claim.
- The death hand-back with claims in several resources (up to 250 ms between them).
- Resmon numbers above are expectations, not measurements.

## In-game checklist

1. Pause menu: Esc, Home shows the focus camera as before; Map lifts off from it; back to Home; Esc blends back.
   No jump, no second blend, first person does not spin (F5).
2. With the pause menu open on Home, from another resource: `nk.camera.claim({ id = 't', target = PlayerPedId(), duration = 500 })`.
   The view blends to the front of the player. Release it: the pause menu's camera is back (a cut).
3. Same as 2, then `stop <that resource>`: the pause camera is back; `stop nuikit_pause` with the menu open:
   gameplay camera, no cursor left.
4. Hold a claim and die (and separately: last stand with qbx_medical): the gameplay camera comes back at once,
   the menu closes.
5. `nk.controls.disable('movement')` from a resource: WASD, sprint, jump off; mouse look still works; release:
   back. Open a surface with `controls = 'all'`: nothing moves; close with Escape: all back.
6. resmon: `nuikit_pause` closed (no change expected), open on Home (no change expected), a targeted claim held
   (≈ 0.02 ms), a `movement` set held (≈ 0.02 ms).
