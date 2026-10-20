-- nuikit_hud: client
-- Player data comes from the bridge (nk.player: Qbox, QBCore, ESX or standalone) and reaches the page
-- as `nuikit:player`, only when it changed. This file adds the vehicle, the location, when the HUD
-- shows at all, and the loops that feed them.
--
-- Cost (see README.md, "Cost"): on foot two slow loops wake 2–3 times a second and send nothing when
-- nothing changed; the compass sends only while the camera turns. In a vehicle one loop runs every
-- 33 ms for the live values (speed, rpm, heading: NUI.stream sends ≤30 a second, only on change) and
-- reads the rest every 150 ms, sending `hud:vehicle` only when a field changed.

local hud = NUI.surface('hud', { layer = 'hud' })

-- ───────────────────────────────── units (config, or the player's own with Config.playerUnits)

local KVP = 'nuikit_hud:units'
local function pickUnits()
  local own = Config.playerUnits ~= false and GetResourceKvpString(KVP) or nil
  local u = own or Config.units
  return u == 'kmh' and 'kmh' or 'mph'
end
local units = pickUnits()

--- What the page needs from config.lua (the look comes from the theme).
local function settings()
  local v, w = Config.vehicle or {}, Config.wallet or {}
  local preset = Layout.preset()
  return {
    layout = preset,
    ammo = Config.ammo ~= false,
    units = units,
    needs = Config.needs ~= false,
    voice = Config.voice ~= false,
    vitals = Config.vitals,
    wallet = { cash = w.cash == nil and 'always' or w.cash, bank = w.bank == nil and 'change' or w.bank, job = w.job ~= false },
    vehicle = {
      gauge = v.gauge or 'theme', shiftLight = v.shiftLight ~= false, rpm = v.rpm ~= false,
      fuel = v.fuel ~= false and Config.fuel ~= false, damage = v.damage ~= false, lights = v.lights ~= false,
      indicators = v.indicators ~= false, handbrake = v.handbrake ~= false,
      seatbelt = v.seatbelt == nil and 'auto' or v.seatbelt, cruise = v.cruise == nil and 'auto' or v.cruise,
    },
    location = Config.location and Config.location.enabled ~= false and (Config.minimap or {}).location ~= false,
    -- compact has no heading strip: the heading is on the map ring
    compass = {
      enabled = preset == 'classic' and (Config.compass or {}).enabled ~= false,
      onFoot = (Config.compass or {}).onFoot == true,
      ring = (Config.minimap or {}).compass ~= false,
    },
    frame = not (Minimap and Minimap.style) or Minimap.style() == 'ring',
  }
end

-- Shown while a character is loaded, the game's pause menu is closed and no inventory is open
-- (ox_inventory's invOpen state; its panels cover the HUD's corners). Full-screen surfaces from any
-- nuikit resource can hide it with `hides = { 'hud' }`.
local invOpen = LocalPlayer.state.invOpen == true
local function sync()
  local visible = NUI.player.get().loaded and not IsPauseMenuActive() and not invOpen
  if visible then hud:open(settings()) else hud:close() end
end
NUI.player.onChange(sync)
-- the moment the inventory opens or closes, not on the next loop
AddStateBagChangeHandler('invOpen', ('player:%d'):format(GetPlayerServerId(PlayerId())), function(_, _, value)
  invOpen = value == true
  sync()
end)

-- ───────────────────────────────── the vehicle

-- Live values on their own channels (protocol §5.7): at most 30 a second and only when they changed
-- by a step. The page glides between messages at the game's frame rate (useFollow).
local speedLive = NUI.stream('hud:vehicle:speed', { rate = 30, precision = 1 })
local rpmLive = NUI.stream('hud:vehicle:rpm', { rate = 30, precision = 0.01 })
local headingLive = NUI.stream('hud:vehicle:heading', { rate = 30, precision = 1, kind = 'angle' })
local altLive = NUI.stream('hud:vehicle:altitude', { rate = 15, precision = 1 })

local current, kind, last = 0, nil, nil -- the vehicle being driven (or 0), its kind, the last hud:vehicle
local factor = Vehicle.FACTOR.mph

local function resetLive()
  speedLive:reset(); rpmLive:reset(); headingLive:reset(); altLive:reset()
end

--- One read of the slow fields; sends hud:vehicle when one changed (or when forced).
local function readVehicle(force)
  local v = Vehicle.read(current, kind, units)
  if force or not Vehicle.same(v, last) then
    last = v
    local out = {}
    for k, x in pairs(v) do out[k] = x end
    -- where the gauge starts when it appears; the live channels move it from there
    for k, x in pairs(Vehicle.live(current, kind, units)) do out[k] = x end
    NUI.send('hud:vehicle', out)
  end
end

--- The vehicle the player drives (or rides) with a cluster, its kind; 0 otherwise.
local function driving(ped)
  local vehicle = GetVehiclePedIsIn(ped, false)
  if vehicle == 0 then return 0, nil end
  local k = Vehicle.kind(GetVehicleClass(vehicle))
  if not k then return 0, nil end
  return vehicle, k
end

local function enter(vehicle, k)
  current, kind, last = vehicle, k, nil
  factor = Vehicle.FACTOR[Vehicle.speedUnits(k, units)] or Vehicle.FACTOR.mph
  resetLive()
  readVehicle(true)
end

local function leave()
  current, kind, last = 0, nil, nil
  Adapters.leftVehicle()
  NUI.send('hud:vehicle', false)
  resetLive()
end

-- The vehicle loop: live values every 33 ms, the rest every 150 ms, nothing on foot (400 ms check).
CreateThread(function()
  local slowAt = 0
  while true do
    if current ~= 0 then
      if (Config.vehicle or {}).enabled ~= false then
        speedLive:push(GetEntitySpeed(current) * factor)
        if Vehicle.air(kind) then
          headingLive:push(360.0 - GetEntityHeading(current))
          local z = GetEntityCoords(current).z
          altLive:push(units == 'kmh' and z or z * 3.28084)
        else
          rpmLive:push(last and last.engineOn and GetVehicleCurrentRpm(current) or 0.0)
          if kind == 'boat' then headingLive:push(360.0 - GetEntityHeading(current)) end
        end
      end
      local now = GetGameTimer()
      if now >= slowAt then
        slowAt = now + 150
        local vehicle, k = driving(PlayerPedId())
        if vehicle ~= current then
          leave()
          if vehicle ~= 0 then enter(vehicle, k) end
        elseif (Config.vehicle or {}).enabled ~= false then
          readVehicle(false)
        end
      end
      Wait(33)
    else
      local vehicle, k = driving(PlayerPedId())
      if vehicle ~= 0 then enter(vehicle, k) end
      Wait(current ~= 0 and 33 or 400)
    end
  end
end)

-- ───────────────────────────────── radar, pause, compass, location

CreateThread(function()
  local paused = nil
  local locationCfg = Config.location or {}
  local compassCfg = Config.compass or {}
  local mapCfg = Config.minimap or {}
  while true do
    local isPaused = IsPauseMenuActive()
    if isPaused ~= paused then paused = isPaused; sync() end

    local inVehicle = current ~= 0
    local radarOn = Config.radar == 'always' or (Config.radar == 'vehicle' and inVehicle)
    DisplayRadar(radarOn)
    Minimap.radarOn = radarOn

    local locationOn = locationCfg.enabled ~= false and mapCfg.location ~= false and (inVehicle or radarOn or locationCfg.onFoot ~= false)
    -- the heading streams while anything shows it: the frame's N, the strip, the location badge
    Minimap.compassOn = not isPaused and (
      (radarOn and (not Minimap.style or Minimap.style() == 'ring') and mapCfg.compass ~= false)
      or (compassCfg.enabled ~= false and (inVehicle or compassCfg.onFoot == true) and Layout.preset() == 'classic')
      -- classic: the location strip's heading badge (compact reads the heading on the ring only)
      or (locationOn and Layout.preset() == 'classic'))
    Location.tick(units, locationOn)
    Wait(inVehicle and 250 or 500)
  end
end)

-- ───────────────────────────────── the page (re)loaded, units changed

NUI.on('hud:ready', function()
  Location.resend()
  Minimap.resend()
  if Weapon then Weapon.resend() end
  if current ~= 0 then
    resetLive()
    readVehicle(true)
  end
  return { ok = true }
end)

if Config.playerUnits ~= false then
  -- /hud units mph|kmh: the player's own speed unit, kept between sessions
  RegisterCommand('hud', function(_, args)
    if args[1] == 'units' and (args[2] == 'mph' or args[2] == 'kmh') then
      SetResourceKvp(KVP, args[2])
      units = args[2]
      if current ~= 0 then enter(current, kind) end
      Location.resend()
      sync()
    end
  end, false)
end

sync()
