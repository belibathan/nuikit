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
    parts = Layout.parts(),
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
    -- GTA's radar slides with the HUD (Config.minimap.slide): the ring slides with it, unfaded
    slide = (Config.minimap or {}).slide == true,
    -- the speedometer's plate behind the round map ring (Config.minimap.halo)
    halo = (Config.minimap or {}).halo ~= false,
    -- nuikit's own waypoint tag on the ring (Config.minimap.waypointTag)
    waypointTag = (Config.minimap or {}).waypointTag == true,
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

-- GTA's vehicle name, class, area and street text draw bottom right, over the cluster (0.7.0 test,
-- note C); the HUD shows its own location. They can only be hidden frame by frame, so this runs
-- only while the cluster is up.
CreateThread(function()
  while true do
    -- IsPedInAnyVehicle as well as `current`: GTA starts the name the moment you sit, before the
    -- vehicle loop (400 ms on foot) has picked the car up.
    local seated = current ~= 0 or IsPedInAnyVehicle(PlayerPedId(), false)
    if seated and (Config.vehicle or {}).enabled ~= false and (Config.vehicle or {}).gameText ~= true then
      HideHudComponentThisFrame(6) -- vehicle name
      HideHudComponentThisFrame(7) -- area name
      HideHudComponentThisFrame(8) -- vehicle class
      HideHudComponentThisFrame(9) -- street name
      Wait(0)
    else
      Wait(50)
    end
  end
end)

-- ───────────────────────────────── radar, pause, compass, location

-- GTA's radar leaves and comes back with the HUD. The page says when its exit or entrance starts (the
-- HUD closing, or hidden by a surface with `hides = { 'hud' }`), so the radar and the ring around it
-- go on the same frame as the rest of the HUD starts sliding, not on this loop's next pass.
local shown = false
local function radarWanted()
  return Config.radar == 'always' or (Config.radar == 'vehicle' and current ~= 0)
end
local function applyRadar()
  -- through a slide-out (Config.minimap.slide) the radar stays drawn until it is off to the side
  local on = radarWanted() and (shown or Minimap.sliding == true)
  DisplayRadar(on)
  Minimap.wanted = radarWanted()
  Minimap.radarOn = on
  Minimap.tick(on)
end
-- What the HUD covers (the page measures its parts): notices and prompts start clear of them.
NUI.on('hud:zones', function(body)
  NUI.zone('hud', body and body.rects or nil)
  return { ok = true }
end)

NUI.on('hud:shown', function(body)
  shown = body and body.shown == true
  if Minimap.slide then Minimap.slide(shown) end
  applyRadar()
  return { ok = true }
end)

CreateThread(function()
  local paused = nil
  local locationCfg = Config.location or {}
  local compassCfg = Config.compass or {}
  local mapCfg = Config.minimap or {}
  while true do
    local isPaused = IsPauseMenuActive()
    if isPaused ~= paused then paused = isPaused; sync() end

    local inVehicle = current ~= 0
    local radarOn = radarWanted()
    local drawn = radarOn and (shown or Minimap.sliding == true)
    DisplayRadar(drawn)
    Minimap.wanted = radarOn
    Minimap.radarOn = drawn

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


-- ───────────────────────────────── legibility (Foundation 2: --nk-legibility auto)

-- 'day' or 'night' from the game clock, for --nk-legibility: auto (the theme's token, or
-- Config.legibility to force one here). Day raises the HUD's plates and hairlines over a bright
-- world; it is not a light theme. Sent to this page (hud:legibility) and as a client event other
-- resources can follow (nuikit:legibility), only when it changes.
local legibility
function LegibilityOf(hour)
  local cfg = Config.legibility or {}
  local from, to = cfg.dayFrom or 7, cfg.dayTo or 19
  return (hour >= from and hour < to) and 'day' or 'night'
end
local function pushLegibility()
  if not GetClockHours then return end
  local mode = LegibilityOf(GetClockHours())
  if mode == legibility then return end
  legibility = mode
  NUI.send('hud:legibility', { mode = mode, force = type(Config.legibility) == 'table' and Config.legibility.mode or nil })
  TriggerEvent('nuikit:legibility', mode)
end
CreateThread(function()
  while true do
    if Config.legibility ~= false then pushLegibility() end
    Wait(10000)
  end
end)

NUI.on('hud:ready', function()
  legibility = nil -- a reloaded page hears it again
  if Config.legibility ~= false then pushLegibility() end
  Location.resend()
  Minimap.resend()
  if Weapon then Weapon.resend() end
  if current ~= 0 then
    resetLive()
    readVehicle(true)
  end
  return { ok = true }
end)

-- ───────────────────────────────── the player's layout (/hud edit)

-- /hud edit: a panel over the HUD where each part is dragged to a corner, onto the map or off, and
-- reordered; the HUD behind it follows the draft live (and so do the notices: the zones). Save keeps
-- it for this player (KVP, per preset), Escape or Cancel drops it. Config.playerLayout = false turns
-- the editor and the saved layouts off.
local editor = NUI.surface('hud-edit', { layer = 'panel', input = 'full' })
Layout.loadPlayer()

--- After the placement changed: the radar to its corner (when the map moved), the page's settings.
local function relayout()
  if Minimap and Minimap.relayout then Minimap.relayout() end
  sync()
end

NUI.on('hud:parts:save', function(body)
  if Config.playerLayout == false or not Layout.savePlayer(body and body.parts) then return { ok = false } end
  editor:close()
  relayout()
  return { ok = true }
end)

NUI.on('hud:parts:reset', function()
  if Config.playerLayout == false then return { ok = false } end
  Layout.resetPlayer()
  editor:close()
  relayout()
  return { ok = true }
end)

-- /hud units mph|kmh (Config.playerUnits) · /hud edit · /hud reset (Config.playerLayout) ·
-- /hud export: the layout on screen as the `parts = { … }` block of config.lua, in F8
RegisterCommand('hud', function(_, args)
  local cmd = args[1]
  if cmd == 'units' and Config.playerUnits ~= false and (args[2] == 'mph' or args[2] == 'kmh') then
    SetResourceKvp(KVP, args[2])
    units = args[2]
    if current ~= 0 then enter(current, kind) end
    Location.resend()
    sync()
  elseif cmd == 'edit' and Config.playerLayout ~= false then
    editor:open({ parts = Layout.parts(), preset = Layout.preset(), base = Layout.PARTS[Layout.preset()] })
  elseif cmd == 'reset' and Config.playerLayout ~= false then
    Layout.resetPlayer()
    relayout()
  elseif cmd == 'export' then
    print(('[nuikit_hud] your layout as config.lua (layout = \'%s\'):\n%s'):format(Layout.preset(), Layout.export(Layout.parts())))
  end
end, false)

sync()
