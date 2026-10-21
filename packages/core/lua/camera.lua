--[[
  camera.lua: the camera service (nk.camera).  MIT · https://github.com/belibathan/nuikit

  One scripted camera owner at a time, a stack, and the gameplay camera always given back
  (docs/services.md). Loaded into every resource that imports @nuikit/init.lua, after nuikit.lua.

    local cam = nk.camera.claim({ id = 'preview', target = PlayerPedId(), offset = { y = 2.2, z = 0.6 } })
    cam:release({ ms = 600 })                 -- blend back to whatever was below: the previous claim or the game

    local cam, from = nk.camera.claim({ id = 'map' })   -- no target: your own camera, started on the current view
    SetCamCoord(cam.cam, x, y, z)                       -- drive it yourself; from = the view it started from
    cam:stream(x, y, z)                                 -- stream the world around a far point while it lasts

  Guarantees
    * A claim starts exactly where the picture is (GetFinalRenderedCam*), so taking the screen is a cut to
      the same view. A claim on top of another suspends the lower one (its camera stays, inactive);
      releasing the top resumes it. Releasing the last claim gives the gameplay camera back.
    * Every copy of this file (one per resource) keeps the same client-wide stack, like surfaces: changes
      go out as local events every copy applies in order. Each copy touches only its own cameras.
    * A resource stopping releases its claims; the player going down (dead to GTA, or the client-wide
      'dead' state from the death system) releases every claim at once, instantly, and `onLost('dead')` runs.
    * Idle cost is zero: no thread runs while this resource holds no claim. With a claim, one thread
      polls for death every 250 ms; a claim with an entity target also updates its camera every frame.
]]

NUI = NUI or {}

local RESOURCE = GetCurrentResourceName()
local BLEND_MS = 600
local WATCH_MS = 250
local EV = { claim = 'nuikit:cam:claim', release = 'nuikit:cam:release', hello = 'nuikit:cam:hello', snapshot = 'nuikit:cam:snapshot' }

local stack = {}     -- client-wide, bottom → top: { resource, id, seq }
local seq = 0        -- client-wide claim counter (the same in every copy)
local seen = 0
local synced = false
local mine = {}      -- key → this resource's claim: { id, cam, opts, streaming, active, suspended }
local order = {}     -- keys of this resource's claims, oldest first (for stop and death)

local camera = {}
NUI.camera = camera

local function key(resource, id) return resource .. ':' .. id end

local function find(resource, id)
  for i, e in ipairs(stack) do
    if e.resource == resource and e.id == id then return i, e end
  end
end

local function top() return stack[#stack] end

local function destroy(handle)
  if handle and DoesCamExist(handle) then DestroyCam(handle, false) end
end

local function call(c, name, ...)
  local fn = c.opts[name]
  if not fn then return end
  local ok, err = pcall(fn, ...)
  if not ok then print(('^1[nuikit:%s] camera: %s %s failed:^7 %s'):format(RESOURCE, c.id, name, tostring(err))) end
end

--- The player is down: dead to GTA, or dead / in last stand to the death system (nuikit_death sets the
--- client-wide 'dead' state; Qbox's last stand revives the ped, so IsEntityDead alone turns false again).
---@return boolean
function camera.down()
  if IsEntityDead(PlayerPedId()) then return true end
  return NUI.getState ~= nil and NUI.getState('dead') and true or false
end

-- ───────────────────────────────── placing a targeted camera

local function vec(v, dx, dy, dz)
  if type(v) ~= 'table' then return { x = dx, y = dy, z = dz } end
  return { x = tonumber(v.x) or dx, y = tonumber(v.y) or dy, z = tonumber(v.z) or dz }
end

--- Where a targeted claim's camera sits and looks this frame. The offset is in the target's frame
--- (x right, y forward, z up); the heading is the one captured at claim time when `lockHeading`
--- (on foot GTA turns the ped toward the camera, which would spin it: 0.7.0 F5), else the entity's live one.
---@return number x, number y, number z, number pitch, number yaw
function camera.pose(c)
  local tx, ty, tz
  if c.entity then
    local p = GetEntityCoords(c.entity)
    tx, ty, tz = p.x, p.y, p.z
  else
    tx, ty, tz = c.coords.x, c.coords.y, c.coords.z
  end
  local heading = c.heading
  if c.entity and not c.lockHeading then heading = GetEntityHeading(c.entity) end
  local h = math.rad(heading)
  local o = c.offset
  -- GTA heading 0 = north (+y), growing counter-clockwise: forward = (-sin h, cos h), right = (cos h, sin h)
  local x = tx + o.x * math.cos(h) - o.y * math.sin(h)
  local y = ty + o.x * math.sin(h) + o.y * math.cos(h)
  local z = tz + o.z
  local l = c.look
  local lx = tx + l.x * math.cos(h) - l.y * math.sin(h)
  local ly = ty + l.x * math.sin(h) + l.y * math.cos(h)
  local lz = tz + l.z
  local dx, dy, dz = lx - x, ly - y, lz - z
  local flat = math.sqrt(dx * dx + dy * dy)
  local yaw = math.deg(math.atan(-dx, dy)) % 360.0
  local pitch = math.deg(math.atan(dz, flat))
  return x, y, z, pitch, yaw
end

local function place(c)
  local x, y, z, pitch, yaw = camera.pose(c)
  SetCamCoord(c.cam, x, y, z)
  SetCamRot(c.cam, pitch, 0.0, yaw, 2)
end

-- ───────────────────────────────── the watch thread (one per resource, only while it holds a claim)

local watching = false
local function watch()
  if watching then return end
  watching = true
  CreateThread(function()
    local nextCheck = 0
    while #order > 0 do
      local now = GetGameTimer()
      if now >= nextCheck then
        nextCheck = now + WATCH_MS
        if camera.down() then
          camera.releaseAll('dead')
          break
        end
      end
      -- a targeted camera on top follows its entity every frame; everything else sleeps
      local t = top()
      local c = t and t.resource == RESOURCE and mine[key(t.resource, t.id)]
      if c and c.entity and c.follow then
        place(c)
        Wait(0)
      else
        Wait(WATCH_MS)
      end
    end
    watching = false
  end)
end

-- ───────────────────────────────── claims

---@class NuiCameraOptions
---@field id? string            a name for the claim; defaults to a counter. Re-claiming an id replaces it
---@field target? integer|table  an entity, or { x, y, z }: the service places the camera around it. Without one, you drive the camera
---@field offset? table          camera position relative to the target, in its frame (x right, y forward, z up); default { y = 2.2, z = 0.6 }
---@field look? table            what the camera points at, relative to the target; default { z = 0.4 }
---@field fov? number            field of view; default: the view it starts from (manual) or 50 (targeted)
---@field duration? number       ms to blend in from the gameplay camera (0 = cut, the default)
---@field lockHeading? boolean   keep the heading the entity had at claim time (default true); false follows the entity's heading
---@field follow? boolean        update the camera every frame as the entity moves (default true for an entity target)
---@field onSuspend? fun()       another claim went on top; this camera is inactive until it leaves
---@field onResume? fun()        the claim above was released; this camera renders again
---@field onLost? fun(reason: 'dead') the claim was released by the service

---@class NuiCameraClaim
---@field id string
---@field cam integer  the camera handle, yours to move while the claim is active
local Claim = {}
Claim.__index = Claim

function Claim:release(opts) return camera.release(self, opts) end
function Claim:stream(x, y, z) return camera.stream(x, y, z, self) end
function Claim:isActive() local c = mine[key(RESOURCE, self.id)] return c ~= nil and c.active and not c.suspended end

local counter = 0

--- Take the screen with a scripted camera.
---@param opts? NuiCameraOptions
---@return NuiCameraClaim claim, { coord: table, rot: table, fov: number } from  the view it started from
function camera.claim(opts)
  opts = opts or {}
  local id = opts.id
  if id == nil then counter = counter + 1; id = 'cam' .. counter end
  id = tostring(id)
  local k = key(RESOURCE, id)
  if mine[k] then camera.release(mine[k].handle, { instant = true }) end

  local coord, rot, fov = GetFinalRenderedCamCoord(), GetFinalRenderedCamRot(2), GetFinalRenderedCamFov()
  local targeted = opts.target ~= nil
  local c = { id = id, opts = opts, active = true, suspended = false }
  if targeted then
    if type(opts.target) == 'table' then c.coords = vec(opts.target, 0.0, 0.0, 0.0) else c.entity = opts.target end
    c.offset = vec(opts.offset, 0.0, 2.2, 0.6)
    c.look = vec(opts.look, 0.0, 0.0, 0.4)
    c.lockHeading = opts.lockHeading ~= false
    c.follow = c.entity ~= nil and opts.follow ~= false
    c.heading = c.entity and GetEntityHeading(c.entity) or (tonumber(opts.heading) or 0.0)
  end
  local useFov = opts.fov or (targeted and 50.0 or fov)
  c.cam = CreateCamWithParams('DEFAULT_SCRIPTED_CAMERA', coord.x, coord.y, coord.z, rot.x, 0.0, rot.z, useFov, false, 2)
  if targeted then place(c) end
  SetCamActive(c.cam, true)
  -- From the gameplay camera: a cut to the very same view (manual), or a blend over `duration` (targeted).
  -- On top of another claim the previous script camera is already rendering: always a cut.
  local blend = #stack == 0 and targeted and (tonumber(opts.duration) or 0) or 0
  if blend > 0 then
    RenderScriptCams(true, true, math.floor(blend), true, false)
  else
    RenderScriptCams(true, false, 0, true, false)
  end
  c.handle = setmetatable({ id = id, cam = c.cam }, Claim)
  mine[k] = c
  order[#order + 1] = k
  -- on our own stack at once (a release before the event lands must see what is above it); every
  -- copy, this one included, then applies the replicated change in order
  local i = find(RESOURCE, id)
  if i then table.remove(stack, i) end
  stack[#stack + 1] = { resource = RESOURCE, id = id, seq = seq }
  TriggerEvent(EV.claim, { resource = RESOURCE, id = id })
  watch()
  return c.handle, { coord = coord, rot = rot, fov = fov }
end

local function remove(k)
  for i = #order, 1, -1 do
    if order[i] == k then table.remove(order, i) end
  end
  mine[k] = nil
end

--- Give the screen back: to the claim below, or to the gameplay camera when this was the last one.
---@param handle NuiCameraClaim|string  the claim, or its id
---@param opts? { instant?: boolean, ms?: number }  how to blend back to the gameplay camera (default 600 ms)
---@return boolean released
function camera.release(handle, opts)
  local id = type(handle) == 'table' and handle.id or handle
  if id == nil then return false end
  local k = key(RESOURCE, tostring(id))
  local c = mine[k]
  if not c then return false end
  if type(handle) == 'table' and c.handle ~= handle then return false end -- a stale handle: that id was re-claimed
  local i = find(RESOURCE, c.id)
  local wasTop = i ~= nil and i == #stack
  local last = wasTop and #stack == 1
  c.active = false
  remove(k)
  if c.streaming then ClearFocus() end
  if last then
    local instant = opts and opts.instant
    RenderScriptCams(false, not instant, instant and 0 or math.floor((opts and tonumber(opts.ms)) or BLEND_MS), true, false)
  end
  -- the copy below resumes its camera on this event; destroy ours after (no frame renders in between)
  TriggerEvent(EV.release, RESOURCE, c.id)
  destroy(c.cam)
  return true
end

--- Release every claim this resource holds, bottom first; the last one restores the gameplay camera instantly.
---@param reason 'dead'|'stop'
function camera.releaseAll(reason)
  for _, k in ipairs({ table.unpack(order) }) do
    local c = mine[k]
    if c then
      camera.release(c.handle, { instant = true })
      if reason == 'dead' then call(c, 'onLost', 'dead') end
    end
  end
end

--- Stream the world around a point (a map camera looks far from the player). Cleared with the claim.
---@param x number
---@param y number
---@param z number
---@param handle? NuiCameraClaim  default: this resource's top-most claim
function camera.stream(x, y, z, handle)
  local c
  if handle then c = mine[key(RESOURCE, handle.id)] else c = mine[order[#order]] end
  if not c then return end
  SetFocusPosAndVel(x + 0.0, y + 0.0, z + 0.0, 0.0, 0.0, 0.0)
  c.streaming = true
end

--- The camera handle of this resource's top-most claim, or nil.
---@return integer|nil
function camera.handle()
  local c = mine[order[#order]]
  return c and c.cam
end

--- Who holds the screen right now: the top claim's resource and id, or nil.
---@return string|nil resource, string|nil id
function camera.owner()
  local t = top()
  if not t then return nil end
  return t.resource, t.id
end

--- A scripted camera is on screen (any resource).
function camera.isActive() return #stack > 0 end

--- This resource's claim with that id, if it still holds it.
---@param id string
---@return NuiCameraClaim|nil
function camera.get(id)
  local c = mine[key(RESOURCE, tostring(id))]
  return c and c.handle
end

--- The client-wide stack, bottom → top (debugging and tooling).
function camera.stack()
  local list = {}
  for _, e in ipairs(stack) do list[#list + 1] = { resource = e.resource, id = e.id, seq = e.seq } end
  return list
end

-- ───────────────────────────────── replicated stack (every copy applies the same change in order)

local function suspendOwn(t)
  -- the previous top was ours: its camera stays, inactive
  local c = t and t.resource == RESOURCE and mine[key(t.resource, t.id)]
  if c and not c.suspended then
    c.suspended = true
    SetCamActive(c.cam, false)
    call(c, 'onSuspend')
  end
end

local function resumeOwn(t)
  local c = t and t.resource == RESOURCE and mine[key(t.resource, t.id)]
  if c and c.suspended then
    c.suspended = false
    if c.entity or c.coords then place(c) end
    SetCamActive(c.cam, true)
    RenderScriptCams(true, false, 0, true, false)
    call(c, 'onResume')
  end
end

AddEventHandler(EV.claim, function(e)
  seen = seen + 1
  seq = seq + 1
  local previous = top()
  local i = find(e.resource, e.id)
  if i then table.remove(stack, i) end
  e.seq = seq
  stack[#stack + 1] = e
  if previous and not (previous.resource == e.resource and previous.id == e.id) then suspendOwn(previous) end
end)

AddEventHandler(EV.release, function(resource, id)
  seen = seen + 1
  local i = find(resource, id)
  if not i then return end
  local wasTop = i == #stack
  table.remove(stack, i)
  if wasTop then resumeOwn(top()) end
end)

AddEventHandler(EV.hello, function(from)
  if from ~= RESOURCE and synced then TriggerEvent(EV.snapshot, from, { stack = stack, seq = seq }) end
end)

local gotSnapshot = false
AddEventHandler(EV.snapshot, function(to, snap)
  if to ~= RESOURCE or gotSnapshot or seen > 0 then return end
  gotSnapshot = true
  stack, seq = snap.stack or {}, snap.seq or 0
  synced = true
end)

-- A resource stopping must never leave the player looking through a dead camera: it releases its own
-- claims (the copies below resume); the others drop whatever it left in the stack.
AddEventHandler('onClientResourceStop', function(resource)
  if resource == RESOURCE then
    camera.releaseAll('stop')
    return
  end
  local changed = false
  for i = #stack, 1, -1 do
    if stack[i].resource == resource then
      table.remove(stack, i)
      changed = true
    end
  end
  if changed then resumeOwn(top()) end
end)

TriggerEvent(EV.hello, RESOURCE)
synced = true

return camera
