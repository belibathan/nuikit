--[[
  nuikit_qb_progressbar: progressbar's public API on the `progress` intent.  MIT · https://github.com/belibathan/nuikit

  Clean-room, from docs/adapters/qb-progressbar.md. Answers under progressbar's own name (`provide` +
  the __cfx_export_progressbar_* events); QBCore.Functions.Progressbar calls exports['progressbar']:Progress
  (per the README), so it lands here too.

    Progress(data, handler)                          handler(cancelled)
    ProgressWithStartEvent(data, start, finish)      start() at open, finish(cancelled)
    ProgressWithTickEvent(data, tick, finish)        tick() every frame while open
    ProgressWithTickEvent(data, start, tick, finish)
    isDoingSomething() → boolean

  A second bar while one runs is refused (the runtime answers 'busy'): its finish(true) runs at once so
  the caller's flow continues. Undocumented in progressbar; change REFUSE_CALLS_FINISH if a recording shows
  it replaced or ignored instead. Animation, props and controls: client/effects.lua, never on the intent.
]]

local LIB = 'progressbar'
local RESOURCE = GetCurrentResourceName()
local debug = GetConvarInt('nuikit_debug', 0) == 1
local REFUSE_CALLS_FINISH = true

local function log(...)
  if debug then print('^5[nuikit-qb:progress]^7', ...) end
end

local running = nil -- { handle, tick, finish }

local function finish(bar, cancelled)
  if running ~= bar then return end
  running = nil
  Effects.stop()
  if bar.finish then
    local ok, err = pcall(bar.finish, cancelled)
    if not ok then print(('^1[nuikit-qb:progress] finish callback failed:^7 %s'):format(tostring(err))) end
  end
end

local function run(data, start, tick, done)
  if type(data) ~= 'table' then return end
  local bar = { finish = done, tick = tick }
  if running then
    log('refused: a bar is running')
    if REFUSE_CALLS_FINISH and done then pcall(done, true) end
    return
  end
  if data.useWhileDead ~= true and IsEntityDead and IsEntityDead(PlayerPedId()) then
    log('refused: dead and not useWhileDead')
    if done then pcall(done, true) end
    return
  end
  local props = {
    id = data.name ~= nil and tostring(data.name) or nil,
    label = data.label ~= nil and tostring(data.label) or nil,
    duration = math.max(1, math.floor(tonumber(data.duration) or 1)),
    cancel = data.canCancel == true,
    style = 'bar',
    meta = { library = LIB, useWhileDead = data.useWhileDead == true },
  }
  running = bar
  bar.handle = nk.progress(props, {
    cb = function(result, reason)
      if running ~= bar then return end
      if reason == 'busy' then
        running = nil
        if REFUSE_CALLS_FINISH and done then pcall(done, true) end
        return
      end
      finish(bar, result ~= true)
    end,
  })
  if bar.handle.id == '' then -- nuikit not started: nothing will answer
    running = nil
    if done then pcall(done, true) end
    return
  end
  Effects.start(data)
  if start then pcall(start) end
  if tick then
    CreateThread(function()
      while running == bar do
        local ok, err = pcall(tick)
        if not ok then print(('^1[nuikit-qb:progress] tick failed:^7 %s'):format(tostring(err))) end
        Wait(0)
      end
    end)
  end
end

-- ───────────────────────────────── the library's API

local function Progress(data, handler) run(data, nil, nil, handler) end
local function ProgressWithStartEvent(data, start, done) run(data, start, nil, done) end
local function ProgressWithTickEvent(data, a, b, c)
  if c ~= nil then run(data, a, b, c) else run(data, nil, a, b) end
end
local function isDoingSomething() return running ~= nil end

local API = { Progress = Progress, ProgressWithStartEvent = ProgressWithStartEvent, ProgressWithTickEvent = ProgressWithTickEvent, isDoingSomething = isDoingSomething }
for name, fn in pairs(API) do exports(name, fn) end
for name, fn in pairs(API) do
  AddEventHandler(('__cfx_export_%s_%s'):format(LIB, name), function(setCB) setCB(fn) end)
end

--- Cancel the running bar from a script (the way the player's X key does): finish(true).
exports('cancel', function()
  if running then running.handle:cancel('cancel') end
end)

AddEventHandler('onClientResourceStop', function(resource)
  if resource == RESOURCE and running then running.handle:cancel('stopped') end
end)

log('started · provide progressbar · GetResourceState("progressbar") =', GetResourceState(LIB))
