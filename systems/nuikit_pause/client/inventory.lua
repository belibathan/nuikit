-- nuikit_pause: the focus camera while ox_inventory is open. ox_inventory publishes `invOpen` on the
-- player's state bag; while it's true the camera frames the player (or their vehicle) in the gap the
-- nuikit inventory override leaves between its panels, and glides back to the game when it closes.
-- Nothing in ox_inventory is changed. Turn off ox_inventory's own blur (setr inventory:screenblur
-- false) so the player isn't blurred.

-- GLOBAL: module table, shared by this resource's files
Inventory = {}

local cfg = Config.inventory or {}
local POLL_MS = 50
local focusing = false

-- Where to frame the player: the open area the inventory page reports (it POSTs
-- https://nuikit_pause/inventory:frame { x, y, w, h } on open, when its right sheet comes or goes, and on
-- resize). Until it does, the override's layout, in rem (1rem = 1.4815% of the screen height, clamped
-- 12–32px): edge sheets flush left and right, Config.inventory.sheet rem wide (default 34.75), the middle
-- clear, some air beside them and room for a key bar.
local SHEET = tonumber(cfg.sheet) or 34.75
local reported -- the last frame the inventory page sent (0–1 screen fractions), or nil
local AIR, TOP, BOTTOM = 1.5, 2.0, 4.0

--- The empty middle of the inventory screen, as 0–1 screen fractions.
function Inventory.frame(width, height)
  local rem = math.max(12.0, math.min(32.0, height * 0.014815))
  local side = (SHEET + AIR) * rem / width
  local top = TOP * rem / height
  local bottom = BOTTOM * rem / height
  if side > 0.4 then side = 0.4 end -- narrow screens: keep at least a fifth of the width
  return { x = side, y = top, w = 1.0 - 2.0 * side, h = 1.0 - top - bottom }
end

local function clamp(v, a, b) return math.max(a, math.min(b, v)) end

--- A frame from the page, validated: four finite numbers, inside the screen, at least 5% each way.
function Inventory.parseFrame(d)
  if type(d) ~= 'table' then return nil end
  local x, y, w, h = tonumber(d.x), tonumber(d.y), tonumber(d.w), tonumber(d.h)
  for _, v in ipairs({ x or 0 / 0, y or 0 / 0, w or 0 / 0, h or 0 / 0 }) do
    if v ~= v or v == math.huge or v == -math.huge then return nil end
  end
  x, y = clamp(x, 0.0, 0.95), clamp(y, 0.0, 0.95)
  w, h = clamp(w, 0.05, 1.0 - x), clamp(h, 0.05, 1.0 - y)
  return { x = x, y = y, w = w, h = h }
end

--- The inventory page reports its open area: frame into it (gliding there if the camera is up).
function Inventory.setFrame(d)
  local f = Inventory.parseFrame(d)
  if not f then return false end
  reported = f
  if focusing and Focus.isActive() then Focus.reframe(f) end
  return true
end

--- What to frame into now: the reported area, else the layout's.
function Inventory.currentFrame()
  if reported then return reported end
  local w, h = GetActiveScreenResolution()
  return Inventory.frame(w, h)
end

-- A raw callback (not nk.message.on): the inventory page belongs to another resource (ox_inventory) and
-- posts here without nuikit's handshake. Always answers, so its fetch never hangs.
RegisterNUICallback('inventory:frame', function(data, cb)
  Inventory.setFrame(data)
  cb({})
end)

--- One check: start or stop the camera when the inventory opens or closes.
function Inventory.tick()
  local open = LocalPlayer.state.invOpen == true
  if open and not focusing then
    if Pause.isOpen() or Focus.isActive() or not Pause.cameras() then return end
    focusing = Focus.start({ frame = Inventory.currentFrame() })
  elseif not open and focusing then
    focusing = false
    if Focus.isActive() and not Pause.isOpen() then Focus.stop() end
  end
end

function Inventory.isFocusing() return focusing end

if cfg.focus ~= false and GetResourceState('ox_inventory') ~= 'missing' then
  CreateThread(function()
    while true do
      Inventory.tick()
      Wait(POLL_MS)
    end
  end)
end
