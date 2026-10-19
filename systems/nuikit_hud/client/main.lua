-- nuikit_hud: client
-- Player data comes from bridge.lua (Qbox, QBCore, ESX or standalone); this file adds the
-- vehicle, the minimap and when the HUD shows at all.

local hud = NUI.surface('hud', { layer = 'hud' })
local units = Config.units == 'kmh' and 'kmh' or 'mph'
local SPEED = units == 'kmh' and 3.6 or 2.236936

-- Shown while a character is loaded and the game's pause menu is closed. Full-screen surfaces
-- from any nuikit resource can hide it with `hides = { 'hud' }`.
local function sync()
  local visible = NUI.player.get().loaded and not IsPauseMenuActive()
  if visible then hud:open({ units = units, needs = Config.needs ~= false }) else hud:close() end
end
NUI.player.onChange(sync)

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

CreateThread(function()
  local last, paused, inVehicle = nil, nil, false
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
        speed = math.floor(speed + 0.5),
        units = units,
        rpm = math.floor(GetVehicleCurrentRpm(vehicle) * 100) / 100,
        gear = gear(vehicle, speed),
        fuel = fuel(vehicle),
        engine = math.floor(GetVehicleEngineHealth(vehicle) / 10),
        seatbelt = LocalPlayer.state.seatbelt == true,
      }
      local encoded = json.encode(v)
      if encoded ~= last then
        last = encoded
        NUI.send('hud:vehicle', v)
      end
      inVehicle = true
      Wait(100)
    else
      if inVehicle then
        NUI.send('hud:vehicle', false)
        inVehicle, last = false, nil
      end
      Wait(400)
    end
  end
end)

sync()
