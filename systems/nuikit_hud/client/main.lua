-- nuikit_hud: client
-- Player data comes from bridge.lua (Qbox, QBCore, ESX or standalone); this file adds the
-- vehicle, the minimap and when the HUD shows at all.

local hud = NUI.surface('hud', { layer = 'hud' })
local units = Config.units == 'kmh' and 'kmh' or 'mph'
local SPEED = units == 'kmh' and 3.6 or 2.236936

-- Shown while a character is loaded, the game's pause menu is closed and no inventory is open
-- (ox_inventory's invOpen state; its panels cover the HUD's corners). Full-screen surfaces from any
-- nuikit resource can hide it with `hides = { 'hud' }`.
local invOpen = LocalPlayer.state.invOpen == true
local function sync()
  local visible = NUI.player.get().loaded and not IsPauseMenuActive() and not invOpen
  if visible then hud:open({ units = units, needs = Config.needs ~= false }) else hud:close() end
end
NUI.player.onChange(sync)
-- the moment the inventory opens or closes, not on the next loop
AddStateBagChangeHandler('invOpen', ('player:%d'):format(GetPlayerServerId(PlayerId())), function(_, _, value)
  invOpen = value == true
  sync()
end)

local function fuel(vehicle)
  local state = Entity(vehicle).state
  return math.floor(state and state.fuel or GetVehicleFuelLevel(vehicle))
end

local function gear(vehicle, speed)
  local g = GetVehicleCurrentGear(vehicle)
  if g == 0 then return 'R' end
  if speed < 1 then return 'N' end
  return g
end

-- Speed and rpm move every frame: live values on their own channels (NUI.stream), at most 30 times a
-- second and only when they changed. The page glides between messages at the game's frame rate
-- (useFollow, App.tsx), so the gauge never steps. hud:vehicle carries the rest, sent on change.
local speedLive = NUI.stream('hud:vehicle:speed', { rate = 30, precision = 1 })
local rpmLive = NUI.stream('hud:vehicle:rpm', { rate = 30, precision = 0.01 })
local current = 0 -- the vehicle being driven, or 0

CreateThread(function()
  while true do
    if current ~= 0 then
      speedLive:push(GetEntitySpeed(current) * SPEED)
      rpmLive:push(GetVehicleCurrentRpm(current))
      Wait(33)
    else
      Wait(100)
    end
  end
end)

CreateThread(function()
  local last, paused = nil, nil
  while true do
    local ped = PlayerPedId()
    local vehicle = GetVehiclePedIsIn(ped, false)
    local driving = vehicle ~= 0 and not IsThisModelABicycle(GetEntityModel(vehicle))

    local isPaused = IsPauseMenuActive()
    if isPaused ~= paused then paused = isPaused; sync() end

    local radarOn = Config.radar == 'always' or (Config.radar == 'vehicle' and driving)
    DisplayRadar(radarOn)
    Minimap.radarOn = radarOn

    if driving then
      local speed = GetEntitySpeed(vehicle) * SPEED
      local v = {
        units = units,
        gear = gear(vehicle, speed),
        fuel = fuel(vehicle),
        engine = math.floor(GetVehicleEngineHealth(vehicle) / 10),
        seatbelt = LocalPlayer.state.seatbelt == true,
        moving = speed > 10, -- for the seatbelt warning
      }
      local encoded = json.encode(v)
      if encoded ~= last or vehicle ~= current then
        last = encoded
        -- where the gauge starts when it appears; the streams move it from there
        v.speed = math.floor(speed + 0.5)
        v.rpm = math.floor(GetVehicleCurrentRpm(vehicle) * 100 + 0.5) / 100
        NUI.send('hud:vehicle', v)
      end
      current = vehicle
      Wait(100)
    else
      if current ~= 0 then
        current, last = 0, nil
        NUI.send('hud:vehicle', false)
        speedLive:reset()
        rpmLive:reset()
      end
      Wait(400)
    end
  end
end)

sync()
