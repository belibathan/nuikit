-- nuikit_pause: the camera service. One scripted camera owner at a time, always given back.
--
-- This is the shape of the runtime's shared camera service (docs/architecture.md, "Services: camera";
-- 0.6 step 3): `claim(opts)` / `release(id)`. It is self-contained so it can move into the nuikit
-- resource as `nk.camera` without changing its callers (focus.lua, map3d.lua).
--
--   local cam, from = Camera.claim({ id = 'map', onLost = function(reason) ... end })
--   Camera.stream(x, y, z)                 -- stream the world around a point while the claim lasts
--   Camera.release('map')                  -- blend back to the gameplay camera (600 ms)
--   Camera.release('map', { instant = true })
--
-- Guarantees:
--   * A claim starts exactly where the picture is (GetFinalRenderedCam*), so taking the screen is a
--     cut to the same view: seamless. Claiming while another owner holds the camera hands over: the
--     new camera takes the screen first, then the old one is destroyed, with no blend back to the game
--     in between. The previous owner's onLost('handover') runs.
--   * The gameplay camera comes back on release, when this resource stops, and when the player dies
--     (onLost('dead') runs). World streaming (SetFocusPosAndVel) is cleared with the camera.

Camera = {}

local RESOURCE = GetCurrentResourceName()
local BLEND_MS = 600
local WATCH_MS = 250

local cam
local claim -- { id, onLost, streaming }

local function destroy(handle)
  if handle and DoesCamExist(handle) then DestroyCam(handle, false) end
end

local function lost(c, reason)
  if c and c.onLost then
    local ok, err = pcall(c.onLost, reason)
    if not ok then print(('[%s] camera: %s onLost failed: %s'):format(RESOURCE, c.id, err)) end
  end
end

--- Watch for the things that must take the camera back without the owner asking.
local watching = false
local function watch()
  if watching then return end
  watching = true
  CreateThread(function()
    while claim do
      if IsEntityDead(PlayerPedId()) then
        local c = claim
        Camera.release(c.id, { instant = true })
        lost(c, 'dead')
        break
      end
      Wait(WATCH_MS)
    end
    watching = false
  end)
end

---@class CameraClaim
---@field id string who is claiming ('focus', 'map', …)
---@field fov? number the new camera's field of view (default: the current view's)
---@field onLost? fun(reason: 'handover'|'dead') the camera was taken away without release()

--- Take the screen with a scripted camera.
---@param opts CameraClaim
---@return integer cam, { coord: vector3, rot: vector3, fov: number } from the view it started from
function Camera.claim(opts)
  local coord, rot, fov = GetFinalRenderedCamCoord(), GetFinalRenderedCamRot(2), GetFinalRenderedCamFov()
  local new = CreateCamWithParams('DEFAULT_SCRIPTED_CAMERA', coord.x, coord.y, coord.z, rot.x, 0.0, rot.z, opts.fov or fov, false, 2)
  SetCamActive(new, true)
  RenderScriptCams(true, false, 0, true, false) -- a cut to the very same view: nothing moves
  local previous, old = claim, cam
  cam, claim = new, { id = opts.id, onLost = opts.onLost }
  if previous then
    destroy(old)
    if previous.streaming then ClearFocus() end
    if previous.id ~= opts.id then lost(previous, 'handover') end
  end
  watch()
  return cam, { coord = coord, rot = rot, fov = fov }
end

--- Give the screen back to the gameplay camera. Only the current owner can release.
---@param id string
---@param opts? { instant?: boolean, ms?: number }
---@return boolean released
function Camera.release(id, opts)
  if not claim or claim.id ~= id then return false end
  local instant = opts and opts.instant
  RenderScriptCams(false, not instant, instant and 0 or (opts and opts.ms or BLEND_MS), true, false)
  destroy(cam)
  if claim.streaming then ClearFocus() end
  cam, claim = nil, nil
  return true
end

--- Stream the world around a point (the map looks far from the player). Cleared on release.
function Camera.stream(x, y, z)
  if not claim then return end
  SetFocusPosAndVel(x + 0.0, y + 0.0, z + 0.0, 0.0, 0.0, 0.0)
  claim.streaming = true
end

---@return integer|nil
function Camera.handle() return cam end

---@return string|nil
function Camera.owner() return claim and claim.id end

function Camera.isActive() return claim ~= nil end

-- The resource stopping (a restart, a crash) must never leave the player looking through a dead camera.
AddEventHandler('onClientResourceStop', function(resource)
  if resource ~= RESOURCE or not claim then return end
  RenderScriptCams(false, false, 0, true, false)
  destroy(cam)
  if claim.streaming then ClearFocus() end
  cam, claim = nil, nil
end)
