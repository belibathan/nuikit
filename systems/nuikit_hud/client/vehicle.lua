-- nuikit_hud: what the vehicle cluster shows. Pure helpers (tested) and one read of the vehicle.
--
-- Gliding values (speed, rpm, heading, altitude) go on live channels (NUI.stream, main.lua). Everything
-- here changes in steps (gear, fuel, damage, lights…) and goes to the page as `hud:vehicle`, only when
-- a field changed.

Vehicle = {}

local cfg = Config.vehicle or {}

--- m/s → the unit shown.
Vehicle.FACTOR = { mph = 2.236936, kmh = 3.6, kts = 1.943844 }

--- What kind of cluster a vehicle class gets (GetVehicleClass), or nil for none.
function Vehicle.kind(class)
  if class == 13 then return cfg.bicycles and 'bike' or nil end
  if class == 8 then return 'bike' end
  if class == 14 then return 'boat' end
  if class == 15 then return 'heli' end
  if class == 16 then return 'plane' end
  if class == 21 then return nil end -- trains
  return 'car'
end

--- Is it flown (airspeed, altitude, heading instead of rpm and gear)?
function Vehicle.air(kind) return kind == 'heli' or kind == 'plane' end

--- The speed unit a kind shows, for the HUD's units ('mph' / 'kmh').
function Vehicle.speedUnits(kind, units)
  if Vehicle.air(kind) and cfg.airUnits ~= 'units' then return 'kts' end
  if kind == 'boat' and cfg.boatUnits ~= 'units' then return 'kts' end
  return units
end

--- The gear to show: R when the gearbox is in reverse or the car rolls backwards, N when stopped at
--- idle (GTA keeps first gear at a standstill), else the gear number.
---@param raw integer GetVehicleCurrentGear (0 = reverse)
---@param forward number speed along the vehicle's nose, m/s (negative = backwards)
---@param rpm number 0–1
function Vehicle.gear(raw, forward, rpm, engineOn)
  if raw == 0 or forward < -0.5 then return 'R' end
  if not engineOn then return 'N' end
  if math.abs(forward) < 0.5 and rpm <= 0.22 then return 'N' end
  return raw
end

--- Lights from GetVehicleLightsState: 'off', 'low' or 'high'.
function Vehicle.lights(on, high)
  if on == 1 or on == true then
    return (high == 1 or high == true) and 'high' or 'low'
  end
  if high == 1 or high == true then return 'high' end
  return 'off'
end

--- Landing gear from GetLandingGearState: 'down', 'up' or 'moving'.
function Vehicle.landingGear(state)
  if state == 0 then return 'down' end
  if state == 3 or state == 4 then return 'up' end
  return 'moving'
end

local function pct(v, max)
  return math.max(0, math.min(100, math.floor(v / max * 100 + 0.5)))
end

--- Same fields, same values? (Flat tables: no json.encode on the hot path.)
function Vehicle.same(a, b)
  if a == nil or b == nil then return false end
  for k, v in pairs(a) do if b[k] ~= v then return false end end
  for k, v in pairs(b) do if a[k] ~= v then return false end end
  return true
end

--- The vehicle's state for `hud:vehicle` (no live values: those are on their own channels).
---@param vehicle integer
---@param units 'mph'|'kmh'
function Vehicle.read(vehicle, kind, units)
  local engineOn = GetIsVehicleEngineRunning(vehicle) == true or GetIsVehicleEngineRunning(vehicle) == 1
  local speedUnits = Vehicle.speedUnits(kind, units)
  local v = {
    kind = kind,
    units = speedUnits,
    engineOn = engineOn,
    redline = cfg.redline or 0.9,
    engine = pct(math.max(0.0, GetVehicleEngineHealth(vehicle)), 1000.0),
    body = pct(math.max(0.0, GetVehicleBodyHealth(vehicle)), 1000.0),
  }
  if cfg.fuel ~= false then v.fuel = Adapters.fuel(vehicle) end
  local speed = GetEntitySpeed(vehicle)
  -- faster than 10 (units): the seatbelt warning shows
  v.moving = speed * (Vehicle.FACTOR[units] or 2.236936) > 10

  if Vehicle.air(kind) then
    v.altUnits = units == 'kmh' and 'm' or 'ft'
    if kind == 'plane' then
      local ok, state = pcall(GetLandingGearState, vehicle)
      if ok and type(state) == 'number' then v.landingGear = Vehicle.landingGear(state) end
    end
  else
    if cfg.gear ~= false then
      local forward = GetEntitySpeedVector(vehicle, true).y
      v.gear = Vehicle.gear(GetVehicleCurrentGear(vehicle), forward, GetVehicleCurrentRpm(vehicle), engineOn)
      local ok, high = pcall(GetVehicleHighGear, vehicle)
      v.gears = (ok and type(high) == 'number' and high > 0) and high or nil
    end
    if cfg.handbrake ~= false and kind ~= 'boat' then
      -- GetVehicleHandbrake misses the driver holding the key (in game, Oct 20): read the control too
      v.handbrake = GetVehicleHandbrake(vehicle) == true
        or (GetPedInVehicleSeat(vehicle, -1) == PlayerPedId() and IsControlPressed(0, 76))
    end
    if cfg.indicators ~= false and kind ~= 'boat' then v.indicators = GetVehicleIndicatorLights(vehicle) or 0 end
    if cfg.seatbelt ~= false and kind == 'car' then v.seatbelt = Adapters.seatbelt() end
    if cfg.cruise ~= false then
      local on, at = Adapters.cruise(Vehicle.FACTOR[Vehicle.speedUnits(kind, units)])
      v.cruise, v.cruiseSpeed = on, at
    end
  end
  if cfg.lights ~= false then
    local _, on, high = GetVehicleLightsState(vehicle)
    v.lights = Vehicle.lights(on, high)
  end
  return v
end

--- Where the live values are now (the page's starting point when the cluster appears).
function Vehicle.live(vehicle, kind, units)
  local factor = Vehicle.FACTOR[Vehicle.speedUnits(kind, units)] or 2.236936
  local out = { speed = math.floor(GetEntitySpeed(vehicle) * factor + 0.5) }
  if Vehicle.air(kind) or kind == 'boat' then
    out.heading = math.floor((360.0 - GetEntityHeading(vehicle)) % 360.0 + 0.5) % 360
  end
  if Vehicle.air(kind) then
    local z = GetEntityCoords(vehicle).z
    out.altitude = math.floor((units == 'kmh' and z or z * 3.28084) + 0.5)
  else
    out.rpm = math.floor(GetVehicleCurrentRpm(vehicle) * 100 + 0.5) / 100
  end
  return out
end
