-- nuikit_hud: adapters for what FiveM has no standard for. Fuel, seatbelt, cruise and postal each
-- come from whichever resource the server runs; nuikit only reads them (presentation only: no
-- ejection, no cruise control, no fuel use).

Adapters = {}

local function started(resource)
  return GetResourceState(resource) == 'started'
end

-- ───────────────────────────────── fuel (0–100)

--- The tank's size, to turn the native's litres into a percentage (most cars: 65 L).
local function tank(vehicle)
  local ok, size = pcall(GetVehicleHandlingFloat, vehicle, 'CHandlingData', 'fPetrolTankVolume')
  return (ok and type(size) == 'number' and size > 0) and size or 65.0
end

local function export(resource, fn)
  return function(vehicle)
    local ok, value = pcall(function() return exports[resource][fn](exports[resource], vehicle) end)
    if ok and type(value) == 'number' then return value end
    return nil
  end
end

--- Fuel sources in the order 'auto' tries them. Each reads 0–100 or nil.
Adapters.fuelSources = {
  { name = 'ox_fuel', read = function(vehicle)
      local state = Entity(vehicle).state
      return state and tonumber(state.fuel) or nil
    end },
  { name = 'LegacyFuel', read = export('LegacyFuel', 'GetFuel') },
  { name = 'cdn-fuel', read = export('cdn-fuel', 'GetFuel') },
  { name = 'ps-fuel', read = export('ps-fuel', 'GetFuel') },
  { name = 'lc_fuel', read = export('lc_fuel', 'GetFuel') },
}

local function native(vehicle)
  return GetVehicleFuelLevel(vehicle) / tank(vehicle) * 100.0
end

local fuelSource -- the chosen source's read function, or false (hidden)
local fuelName

--- Pick the fuel source for Config.fuel: 'auto' (the first started resource, else the native), a
--- resource name, 'native', or false. Re-run when resources start or stop.
function Adapters.pickFuel()
  local want = Config.fuel
  if want == nil then want = 'auto' end
  fuelSource, fuelName = false, 'off'
  if want == false then return fuelName end
  for _, src in ipairs(Adapters.fuelSources) do
    if (want == 'auto' and started(src.name)) or want == src.name then
      fuelSource, fuelName = src.read, src.name
      return fuelName
    end
  end
  fuelSource, fuelName = native, 'native'
  return fuelName
end

--- The vehicle's fuel, 0–100 (whole), or nil when fuel is hidden. A source that answers nothing
--- (an export that errors, a vehicle it doesn't track) falls back to the native.
function Adapters.fuel(vehicle)
  if fuelSource == nil then Adapters.pickFuel() end
  if not fuelSource then return nil end
  local value = fuelSource(vehicle)
  if value == nil then value = native(vehicle) end
  return math.max(0, math.min(100, math.floor(value + 0.5)))
end

function Adapters.fuelName()
  if fuelSource == nil then Adapters.pickFuel() end
  return fuelName
end

-- ───────────────────────────────── seatbelt and cruise (hooks)
--
-- Any resource reports them; nuikit only shows them:
--   TriggerEvent('nuikit_hud:seatbelt', true)          -- buckled
--   TriggerEvent('nuikit_hud:cruise', true, 80)         -- on, at 80 (the HUD's units; optional)
--   exports.nuikit_hud:setSeatbelt(true)  exports.nuikit_hud:setCruise(false)
-- Also read: LocalPlayer.state.seatbelt / .cruise (Qbox-style state bags), qb-smallresources'
-- 'seatbelt:client:ToggleSeatbelt' toggle event, and qbx_smallresources' qbx_cruise, which only fires
-- 'seatbelt:client:ToggleCruise' (no arguments) when cruise turns on and when it turns off.

local hooks = { seatbelt = nil, cruise = nil, cruiseSpeed = nil, seen = { seatbelt = false, cruise = false } }
Adapters.hooks = hooks

function Adapters.setSeatbelt(on)
  hooks.seatbelt = on == true
  hooks.seen.seatbelt = true
end

function Adapters.setCruise(on, speed)
  hooks.cruise = on == true
  hooks.cruiseSpeed = (on and tonumber(speed)) and math.floor(tonumber(speed) + 0.5) or nil
  hooks.cruiseMs = nil
  hooks.seen.cruise = true
end

--- qbx_cruise's toggle: flip, and remember the speed it holds (the vehicle's speed now, m/s).
function Adapters.toggleCruise()
  local on = not hooks.cruise
  Adapters.setCruise(on)
  if on then
    local vehicle = GetVehiclePedIsIn(PlayerPedId(), false)
    hooks.cruiseMs = vehicle ~= 0 and GetEntitySpeed(vehicle) or nil
  end
end

--- Leaving a vehicle unbuckles and ends cruise (every seatbelt script does the same).
function Adapters.leftVehicle()
  if hooks.seatbelt ~= nil then hooks.seatbelt = false end
  if hooks.cruise ~= nil then hooks.cruise, hooks.cruiseSpeed, hooks.cruiseMs = false, nil, nil end
end

--- Current seatbelt: true/false once anything reported it, nil when nothing ever did.
function Adapters.seatbelt()
  local bag = LocalPlayer and LocalPlayer.state and LocalPlayer.state.seatbelt
  if bag ~= nil then return bag == true end
  if hooks.seen.seatbelt then return hooks.seatbelt == true end
  return nil
end

--- Current cruise: on (boolean or nil when unknown) and its speed (or nil). `factor` turns m/s into
--- the HUD's units, for a speed only known in m/s (qbx_cruise).
function Adapters.cruise(factor)
  local bag = LocalPlayer and LocalPlayer.state and LocalPlayer.state.cruise
  if bag ~= nil then
    if type(bag) == 'number' then return bag > 0, math.floor(bag + 0.5) end
    return bag == true, hooks.cruiseSpeed
  end
  if hooks.seen.cruise then
    local at = hooks.cruiseSpeed
    if not at and hooks.cruise and hooks.cruiseMs and factor then at = math.floor(hooks.cruiseMs * factor + 0.5) end
    return hooks.cruise == true, at
  end
  return nil, nil
end

AddEventHandler('nuikit_hud:seatbelt', function(on) Adapters.setSeatbelt(on) end)
AddEventHandler('nuikit_hud:cruise', function(on, speed) Adapters.setCruise(on, speed) end)
-- qb-smallresources toggles its seatbelt and fires this (no state): follow along
AddEventHandler('seatbelt:client:ToggleSeatbelt', function() Adapters.setSeatbelt(not hooks.seatbelt) end)
-- qbx_cruise (qbx_smallresources): the same kind of toggle for cruise
AddEventHandler('seatbelt:client:ToggleCruise', Adapters.toggleCruise)
pcall(exports, 'setSeatbelt', Adapters.setSeatbelt)
pcall(exports, 'setCruise', Adapters.setCruise)

-- ───────────────────────────────── postal

local postalResource

--- The postal resource for Config.location.postal: 'auto' (nearest-postal when started), a resource
--- name with a getPostal export, or false.
function Adapters.pickPostal()
  local want = (Config.location or {}).postal
  if want == nil then want = 'auto' end
  postalResource = false
  if want == false then return nil end
  local name = want == 'auto' and 'nearest-postal' or want
  if started(name) then postalResource = name end
  return postalResource or nil
end

--- The nearest postal code (string), or nil.
function Adapters.postal()
  if postalResource == nil then Adapters.pickPostal() end
  if not postalResource then return nil end
  local ok, code = pcall(function() return exports[postalResource]:getPostal() end)
  if not ok or code == nil then return nil end
  if type(code) == 'table' then code = code.code end
  return code ~= nil and tostring(code) or nil
end

-- Pick again when a resource starts or stops (fuel or postal started after the HUD).
AddEventHandler('onClientResourceStart', function(resource)
  if resource == GetCurrentResourceName() then return end
  fuelSource, postalResource = nil, nil
end)
AddEventHandler('onClientResourceStop', function(resource)
  if resource == GetCurrentResourceName() then return end
  fuelSource, postalResource = nil, nil
end)
