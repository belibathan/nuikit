-- nuikit_pause: the focus camera while ox_inventory is open. ox_inventory publishes `invOpen` on the
-- player's state bag; while it's true the camera frames the player (or their vehicle) in the gap the
-- nuikit inventory override leaves between its panels, and glides back to the game when it closes.
-- Nothing in ox_inventory is changed. Turn off ox_inventory's own blur (setr inventory:screenblur
-- false) so the player isn't blurred.

Inventory = {}

local cfg = Config.inventory or {}
local POLL_MS = 50
local focusing = false

-- The override's layout, in rem (1rem = 1.4815% of the screen height, clamped 12–32px):
-- 3rem from the edges, 31.625rem panels, a ~3.75rem action bar along the bottom.
local EDGE, PANEL, BAR, AIR = 3.0, 31.625, 3.75, 1.0

--- The empty middle of the inventory screen, as 0–1 screen fractions.
function Inventory.frame(width, height)
  local rem = math.max(12.0, math.min(32.0, height * 0.014815))
  local side = (EDGE + PANEL + AIR) * rem / width
  local top = (EDGE - 1.0) * rem / height
  local bottom = (EDGE + BAR + AIR) * rem / height
  if side > 0.4 then side = 0.4 end -- narrow screens: keep at least a fifth of the width
  return { x = side, y = top, w = 1.0 - 2.0 * side, h = 1.0 - top - bottom }
end

--- One check: start or stop the camera when the inventory opens or closes.
function Inventory.tick()
  local open = LocalPlayer.state.invOpen == true
  if open and not focusing then
    if Pause.isOpen() or Focus.isActive() or not Pause.cameras() then return end
    local w, h = GetActiveScreenResolution()
    focusing = Focus.start({ frame = Inventory.frame(w, h) })
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
