-- {{name}}: client
-- The HUD lives in web/ (the hud-minimal block); this file decides when it shows and sends the
-- vehicle. Vitals, needs, money, job and voice come from nuikit's player bridge (nk.player), the
-- same on Qbox, QBCore, ESX and standalone, so there's nothing to send for them.
-- Lua → UI: nk.send(event, data) · surfaces: nk.surface(name, opts) · live values: nk.stream(event, opts)

local Config = {
  units = 'mph', -- or 'kmh'
}

-- The HUD layer: no input, drawn under every panel. Full-screen surfaces from any nuikit resource
-- (pause, death, loading) hide it with hides = { 'hud' }.
local hud = nk.surface('hud', { layer = 'hud' })

-- Shown while a character is loaded and GTA's own pause menu is closed.
local function sync()
  if nk.player.get().loaded and not IsPauseMenuActive() then hud:open() else hud:close() end
end
nk.player.onChange(sync) -- first use of nk.player starts the bridge: the page gets `nuikit:player` from now on

-- Speed and rpm move every frame: live values on their own channels, at most 30 a second and only
-- when they changed. The page glides between messages at the game's frame rate (protocol §5.7).
local SPEED = Config.units == 'kmh' and 3.6 or 2.236936
local speedLive = nk.stream('hud:vehicle:speed', { rate = 30, precision = 1 })
local rpmLive = nk.stream('hud:vehicle:rpm', { rate = 30, precision = 0.01 })
local current = 0 -- the vehicle being driven, or 0

CreateThread(function()
  while true do
    if current ~= 0 then
      speedLive:push(GetEntitySpeed(current) * SPEED)
      rpmLive:push(GetVehicleCurrentRpm(current))
      Wait(33)
    else
      Wait(250)
    end
  end
end)

local function gear(vehicle, speed)
  local g = GetVehicleCurrentGear(vehicle)
  if g == 0 then return 'R' end
  if speed < 1 then return 'N' end
  return g
end

-- Everything else about the vehicle, sent only when it changed.
CreateThread(function()
  local last, paused = nil, nil
  while true do
    local isPaused = IsPauseMenuActive()
    if isPaused ~= paused then paused = isPaused; sync() end

    local ped = PlayerPedId()
    local vehicle = GetVehiclePedIsIn(ped, false)
    if vehicle ~= 0 and GetPedInVehicleSeat(vehicle, -1) == ped and not IsThisModelABicycle(GetEntityModel(vehicle)) then
      local speed = GetEntitySpeed(vehicle) * SPEED
      local state = Entity(vehicle).state
      local v = {
        units = Config.units,
        gear = gear(vehicle, speed),
        fuel = math.floor(state.fuel or GetVehicleFuelLevel(vehicle)),
        engine = math.floor(GetVehicleEngineHealth(vehicle) / 10),
        seatbelt = LocalPlayer.state.seatbelt == true, -- set by your seatbelt script
        moving = speed > 10,
      }
      local encoded = json.encode(v)
      if encoded ~= last or vehicle ~= current then
        last = encoded
        -- where the gauge starts when it appears; the streams move it from there
        v.speed = math.floor(speed + 0.5)
        v.rpm = math.floor(GetVehicleCurrentRpm(vehicle) * 100 + 0.5) / 100
        nk.send('hud:vehicle', v)
      end
      current = vehicle
      Wait(100)
    else
      if current ~= 0 then
        current, last = 0, nil
        nk.send('hud:vehicle', false)
        speedLive:reset()
        rpmLive:reset()
      end
      Wait(400)
    end
  end
end)

sync()
