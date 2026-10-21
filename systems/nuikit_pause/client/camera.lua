-- nuikit_pause: a thin shim over the runtime's camera service (nk.camera, docs/services.md).
--
-- The service used to live here; it moved into the runtime (0.7 step 3). focus.lua and map3d.lua
-- keep calling this `Camera` API, which keeps the menu's hand-over behaviour exactly as before:
--
--   local cam, from = Camera.claim({ id = 'map', onLost = function(reason) ... end })
--   Camera.stream(x, y, z)                 -- stream the world around a point while the claim lasts
--   Camera.release('map')                  -- blend back to the gameplay camera (600 ms)
--   Camera.release('map', { instant = true })
--
-- One owner at a time inside this resource: claiming while another id holds the camera hands over
-- (the new camera takes the screen first, then the old claim is released with no blend in between,
-- and its onLost('handover') runs). Death and the resource stopping are the service's job: it
-- releases the claim, cuts back to the gameplay camera and runs onLost('dead').

Camera = {}

local current -- { id, handle, onLost }

local function lost(c, reason)
  if c and c.onLost then
    local ok, err = pcall(c.onLost, reason)
    if not ok then print(('[%s] camera: %s onLost failed: %s'):format(GetCurrentResourceName(), c.id, err)) end
  end
end

--- The player is down: dead to GTA, or dead / in last stand to the death system.
---@return boolean
function Camera.down() return NUI.camera.down() end

---@class CameraClaim
---@field id string who is claiming ('focus', 'map', …)
---@field fov? number the new camera's field of view (default: the current view's)
---@field onLost? fun(reason: 'handover'|'dead') the camera was taken away without release()

--- Take the screen with a scripted camera, started on the current view.
---@param opts CameraClaim
---@return integer cam, { coord: vector3, rot: vector3, fov: number } from the view it started from
function Camera.claim(opts)
  local previous = current
  local c = { id = opts.id, onLost = opts.onLost }
  local handle, from = NUI.camera.claim({
    id = opts.id,
    fov = opts.fov,
    onLost = function(reason)
      if current == c then current = nil end
      lost(c, reason)
    end,
  })
  c.handle = handle
  current = c
  if previous and previous ~= c then
    -- the new camera is on screen already: the old claim leaves without a blend
    NUI.camera.release(previous.handle, { instant = true })
    if previous.id ~= opts.id then lost(previous, 'handover') end
  end
  return handle.cam, from
end

--- Give the screen back to the gameplay camera. Only the current owner can release.
---@param id string
---@param opts? { instant?: boolean, ms?: number }
---@return boolean released
function Camera.release(id, opts)
  if not current or current.id ~= id then return false end
  local c = current
  current = nil
  return NUI.camera.release(c.handle, opts)
end

--- Stream the world around a point (the map looks far from the player). Cleared on release.
function Camera.stream(x, y, z)
  if not current then return end
  NUI.camera.stream(x, y, z, current.handle)
end

---@return integer|nil
function Camera.handle() return current and current.handle.cam end

---@return string|nil
function Camera.owner() return current and current.id end

function Camera.isActive() return current ~= nil end
