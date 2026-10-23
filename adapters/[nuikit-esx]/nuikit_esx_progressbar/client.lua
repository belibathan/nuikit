--[[
  nuikit_esx_progressbar: esx_progressbar's public API, drawn by nk.intent.progress (docs/adapters/esx-progressbar.md).

  Mechanism: stand-in. `provide 'esx_progressbar'` plus `Progressbar` / `CancelProgressbar` registered
  under esx_progressbar's name, so `ESX.Progressbar` / `ESX.CancelProgressbar` and the exports land here.

  The bar is nuikit's (not cancellable by the player, as the library's); FreezePlayer and the animation
  stay here in Lua for the bar's lifetime, as the library did them. Exactly one of onFinish / onCancel
  runs. A second bar while one runs is refused and told so through its onCancel (the library's own
  behaviour here is not documented; see the spec).
]]

local LIB = 'esx_progressbar'

local current = nil -- { handle, options, ped, frozen, anim }

local function stopEffects(run)
  if not run then return end
  local ped = PlayerPedId()
  if run.frozen then FreezeEntityPosition(ped, false) end
  if run.anim then
    if run.anim.type == 'scenario' then ClearPedTasks(ped) else StopAnimTask(ped, run.anim.dict, run.anim.lib, 1.0) end
  end
end

local function startEffects(run)
  local ped = PlayerPedId()
  local o = run.options
  if o.FreezePlayer then
    FreezeEntityPosition(ped, true)
    run.frozen = true
  end
  local a = o.animation
  if type(a) ~= 'table' then return end
  if a.type == 'scenario' then
    local scenario = a.scenario or a.lib
    if type(scenario) == 'string' then
      TaskStartScenarioInPlace(ped, scenario, 0, true)
      run.anim = { type = 'scenario' }
    end
  elseif a.type == 'anim' and type(a.dict) == 'string' and type(a.lib) == 'string' then
    run.anim = { type = 'anim', dict = a.dict, lib = a.lib }
    CreateThread(function()
      RequestAnimDict(a.dict)
      local tries = 0
      while not HasAnimDictLoaded(a.dict) and tries < 100 do
        tries = tries + 1
        Wait(10)
      end
      if current ~= run or not HasAnimDictLoaded(a.dict) then return end
      TaskPlayAnim(ped, a.dict, a.lib, 8.0, -8.0, -1, 49, 0, false, false, false)
    end)
  end
end

local function call(fn)
  if type(fn) ~= 'function' then return end
  local ok, err = pcall(fn)
  if not ok then print(('^1[nuikit_esx_progressbar] callback failed:^7 %s'):format(tostring(err))) end
end

local function Progressbar(text, length, options)
  options = type(options) == 'table' and options or {}
  local ms = tonumber(length)
  if not ms or ms < 1 then ms = 1 end
  if current then
    -- One at a time, as every library; the newcomer is told it did not run.
    call(options.onCancel)
    return
  end
  local run = { options = options }
  current = run
  run.handle = nk.intent.progress({ label = type(text) == 'string' and text or nil, duration = math.floor(ms), cancel = false, style = 'bar' }, {
    cb = function(result, reason)
      if current ~= run then return end
      current = nil
      stopEffects(run)
      if result == true then call(options.onFinish) else call(options.onCancel) end
    end,
  })
  if not run.handle then -- nuikit not started: nothing ran
    current = nil
    call(options.onCancel)
    return
  end
  -- Refused at once (the runtime answers 'busy' synchronously in game): the callback already ran.
  if current ~= run then return end
  startEffects(run)
end

local function CancelProgressbar()
  if current and current.handle then current.handle:cancel() end
end

-- ───────────────────────────────── the library's API, by name

local API = { Progressbar = Progressbar, CancelProgressbar = CancelProgressbar }
for name, fn in pairs(API) do
  exports(name, fn)
  AddEventHandler(('__cfx_export_%s_%s'):format(LIB, name), function(setCB) setCB(fn) end)
end

AddEventHandler('onResourceStop', function(resource)
  if resource == GetCurrentResourceName() and current then stopEffects(current) end
end)
