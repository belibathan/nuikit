-- nuikit_hud: where the player is. Street, cross street, zone, postal and the distance to the map
-- waypoint, sent as `hud:location` only when one of them changed. The heading is the compass's own
-- live channel (minimap.lua).

Location = {}

local cfg = Config.location or {}

--- The waypoint distance, rounded to what the page shows, so walking a metre doesn't re-send:
--- metric 10 m under 1 km, then 0.1 km; imperial 50 ft under 0.2 mi (≈322 m), then 0.1 mi.
--- Returns metres (rounded), or nil.
function Location.quantize(meters, units)
  if type(meters) ~= 'number' or meters ~= meters then return nil end
  if units == 'kmh' then
    if meters < 1000 then return math.floor(meters / 10 + 0.5) * 10 end
    return math.floor(meters / 100 + 0.5) * 100
  end
  local feet = meters * 3.28084
  if meters < 321.869 then return math.floor(math.floor(feet / 50 + 0.5) * 50 / 3.28084 + 0.5) end
  return math.floor(math.floor(meters / 160.9344 + 0.5) * 160.9344 + 0.5)
end

--- Distance (m, 2D) to the waypoint, or nil when there is none.
local function waypoint(c)
  if not IsWaypointActive() then return nil end
  local blip = GetFirstBlipInfoId(8)
  if not blip or blip == 0 then return nil end
  local w = GetBlipInfoIdCoord(blip)
  local dx, dy = w.x - c.x, w.y - c.y
  return math.sqrt(dx * dx + dy * dy)
end

local last = nil

--- Read where the player is; send `hud:location` if anything shown changed. `units` is the HUD's.
--- `shown` false sends { visible = false } once (on foot with location.onFoot off).
function Location.tick(units, shown)
  if cfg.enabled == false then return end
  local s
  if shown then
    local c = GetEntityCoords(PlayerPedId())
    local s1, s2 = GetStreetNameAtCoord(c.x, c.y, c.z)
    s = {
      visible = true,
      street = GetStreetNameFromHashKey(s1),
      crossing = (cfg.crossing ~= false and s2 and s2 ~= 0) and GetStreetNameFromHashKey(s2) or nil,
      zone = cfg.zone ~= false and GetLabelText(GetNameOfZone(c.x, c.y, c.z)) or nil,
      postal = Adapters.postal(),
      waypoint = cfg.waypoint ~= false and Location.quantize(waypoint(c), units) or nil,
    }
    if s.crossing == '' or s.crossing == s.street then s.crossing = nil end
  else
    s = { visible = false }
  end
  local key = ('%s|%s|%s|%s|%s|%s'):format(tostring(s.visible), s.street or '', s.crossing or '', s.zone or '', s.postal or '', s.waypoint or '')
  if key ~= last then
    last = key
    NUI.send('hud:location', s)
  end
end

function Location.resend() last = nil end
