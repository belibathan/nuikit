local stress = 0

local function current()
  local s = LocalPlayer.state.stress
  if type(s) == 'number' then return s end
  return stress
end

RegisterNetEvent('hud:client:UpdateStress', function(value) stress = value or 0 end)

RegisterNetEvent('nuikit_stress:notify', function()
  local text = 'Feeling more stressed'
  if GetResourceState('ox_lib') == 'started' then
    TriggerEvent('ox_lib:notify', { description = text, type = 'inform', icon = 'brain', iconColor = '#C53030', duration = 2500 })
  else
    BeginTextCommandThefeedPost('STRING')
    AddTextComponentSubstringPlayerName(text)
    EndTextCommandThefeedPostTicker(false, false)
  end
end)

local function gain(range)
  TriggerServerEvent('hud:server:GainStress', math.random(range[1], range[2]))
end

-- Speeding
CreateThread(function()
  local cfg = Config.speeding
  if not (Config.enabled and cfg.enabled) then return end
  while true do
    Wait(cfg.every)
    local ped = PlayerPedId()
    local veh = GetVehiclePedIsIn(ped, false)
    if veh ~= 0 and GetPedInVehicleSeat(veh, -1) == ped then
      local class = GetVehicleClass(veh)
      if class ~= 13 and class ~= 14 and class ~= 15 and class ~= 16 then -- cycles, boats, helis, planes
        local mph = GetEntitySpeed(veh) * 2.236936
        local limit = LocalPlayer.state.seatbelt and cfg.buckledMph or cfg.unbuckledMph
        if mph >= limit then gain(cfg.gain) end
      end
    end
  end
end)

-- Shooting
CreateThread(function()
  local cfg = Config.shooting
  if not (Config.enabled and cfg.enabled) then return end
  local ignore = {}
  for _, hash in ipairs(cfg.ignore) do ignore[hash] = true end
  while true do
    local ped = PlayerPedId()
    if IsPedArmed(ped, 4 | 2) then -- guns and throwables
      Wait(0)
      if IsPedShooting(ped) and not ignore[GetSelectedPedWeapon(ped)] and math.random() < cfg.chance then
        gain(cfg.gain)
      end
    else
      Wait(1000)
    end
  end
end)

-- Blur and shake at high stress
CreateThread(function()
  local cfg = Config.effects
  if not (Config.enabled and cfg.enabled) then return end
  while true do
    local s = current()
    local wait = 5000
    if s >= cfg.shakeFrom and not IsEntityDead(PlayerPedId()) then
      local floor = 0
      for at in pairs(cfg.interval) do if s >= at and at > floor then floor = at end end
      wait = cfg.interval[floor] or 30000
      local strength = 1000 + (s - cfg.shakeFrom) * 40
      TriggerScreenblurFadeIn(500.0)
      ShakeGameplayCam('SMALL_EXPLOSION_SHAKE', 0.03 + (s - cfg.shakeFrom) / 1000)
      Wait(math.floor(strength))
      TriggerScreenblurFadeOut(500.0)
    end
    Wait(wait)
  end
end)
