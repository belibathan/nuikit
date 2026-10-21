--[[
  nuikit adapter spike: the caller. Plays the scripts a server runs, so every spike can be driven
  from the F8 console without touching a real script:

    /spike_menu export        exports['qb-menu']:openMenu(<3 items>)        → stand-in spike
    /spike_menu event         TriggerEvent('qb-menu:client:openMenu', …)    → stand-in spike
    /spike_menu close         exports['qb-menu']:closeMenu()
    /spike_notify local       TriggerEvent('QBCore:Notify' …), ('ox_lib:notify' …) locally
    /spike_notify server      asks the server to TriggerClientEvent the same (the real path)
    /spike_notify direct      exports.qbx_core:Notify(…) / lib.notify(…) if present: the calls a
                              listener CANNOT see (expected to be missed; that is the point)
    /spike_route page <n>     the page posts n intents to https://nuikit_spike_route/intent
    /spike_route export <n>   n calls of exports.nuikit_spike_route:intent(...) from Lua
    /spike_route frame <n>    one export call per frame for n frames (per-frame cost)

  Every result is printed as one line prefixed `[nuikit-spike:caller]`.
]]

local TAG = '[nuikit-spike:caller]'

local function menuItems(label)
  return {
    { header = label or 'Spike menu', isMenuHeader = true },
    { header = 'Say hi', txt = 'TriggerEvent with args', icon = 'fas fa-comment',
      params = { event = 'nuikit_spike_caller:hi', args = { who = 'caller' } } },
    { header = 'Server ping', txt = 'isServer', params = { event = 'nuikit_spike_caller:ping', isServer = true, args = { n = 1 } } },
    { header = 'Function', txt = 'action()', action = function() print(TAG .. ' action() ran') end },
    { header = 'Disabled', txt = 'must not be pickable', disabled = true },
  }
end

AddEventHandler('nuikit_spike_caller:hi', function(args)
  print(('%s got event nuikit_spike_caller:hi args=%s'):format(TAG, json.encode(args)))
end)
RegisterNetEvent('nuikit_spike_caller:pong', function(args)
  print(('%s got server pong args=%s'):format(TAG, json.encode(args)))
end)

-- ───────────────────────────────── stand-in

RegisterCommand('spike_menu', function(_, args)
  local how = args[1] or 'export'
  local t0 = GetGameTimer()
  if how == 'export' then
    local ok, err = pcall(function() exports['qb-menu']:openMenu(menuItems('Via export'), true, false) end)
    print(('%s exports["qb-menu"]:openMenu → ok=%s %s (%d ms)'):format(TAG, tostring(ok), ok and '' or tostring(err), GetGameTimer() - t0))
  elseif how == 'event' then
    TriggerEvent('qb-menu:client:openMenu', menuItems('Via event'))
    print(('%s TriggerEvent qb-menu:client:openMenu sent (%d ms)'):format(TAG, GetGameTimer() - t0))
  elseif how == 'close' then
    local ok, err = pcall(function() exports['qb-menu']:closeMenu() end)
    print(('%s exports["qb-menu"]:closeMenu → ok=%s %s'):format(TAG, tostring(ok), ok and '' or tostring(err)))
  else
    print(TAG .. ' usage: /spike_menu export | event | close')
  end
end, false)

-- ───────────────────────────────── listener

local function notifyPayloads()
  return {
    { event = 'QBCore:Notify', args = { 'Spike: QBCore:Notify', 'success', 4000 } },
    { event = 'QBCore:Notify', args = { { text = 'Spike: table form', caption = 'Caption' }, 'error', 4000 } },
    { event = 'ox_lib:notify', args = { { title = 'Spike: ox_lib:notify', description = 'event path', type = 'inform' } } },
    { event = 'esx:showNotification', args = { 'Spike: esx:showNotification', 'info', 4000 } },
    { event = 'okokNotify:Alert', args = { 'Spike', 'okokNotify:Alert', 4000, 'info' } },
    { event = 'mythic_notify:client:SendAlert', args = { { type = 'inform', text = 'Spike: mythic', length = 4000 } } },
  }
end

RegisterCommand('spike_notify', function(_, args)
  local how = args[1] or 'local'
  if how == 'local' then
    for _, p in ipairs(notifyPayloads()) do TriggerEvent(p.event, table.unpack(p.args)) end
    print(TAG .. ' 6 notify events triggered locally')
  elseif how == 'server' then
    TriggerServerEvent('nuikit_spike_caller:notifyMe')
    print(TAG .. ' asked the server to send the 6 notify events')
  elseif how == 'direct' then
    local sent = 0
    if GetResourceState('qbx_core') == 'started' then
      local ok = pcall(function() exports.qbx_core:Notify('Spike: direct qbx_core Notify', 'inform', 4000) end)
      if ok then sent = sent + 1 end
    end
    if GetResourceState('qb-core') == 'started' then
      local ok = pcall(function()
        local QBCore = exports['qb-core']:GetCoreObject()
        QBCore.Functions.Notify('Spike: direct QBCore.Functions.Notify', 'primary', 4000)
      end)
      if ok then sent = sent + 1 end
    end
    if lib and lib.notify then
      lib.notify({ title = 'Spike: direct lib.notify', type = 'inform' })
      sent = sent + 1
    end
    print(('%s %d direct calls sent (a listener should see none of these)'):format(TAG, sent))
  else
    print(TAG .. ' usage: /spike_notify local | server | direct')
  end
end, false)

-- ───────────────────────────────── ox_lib page routing

local pending = {}  -- id → GetGameTimer() when sent (export path)

RegisterCommand('spike_route', function(_, args)
  local how, n = args[1] or 'page', tonumber(args[2]) or 50
  if how == 'page' then
    SendNUIMessage({ action = 'spike:run', n = n })
    print(('%s page asked to post %d intents'):format(TAG, n))
  elseif how == 'export' then
    if GetResourceState('nuikit_spike_route') ~= 'started' then print(TAG .. ' nuikit_spike_route is not started') return end
    local t0 = GetGameTimer()
    local answered = 0
    for i = 1, n do
      local r = exports.nuikit_spike_route:intent('notify', { title = 'export ' .. i })
      if r and r.id then answered = answered + 1 end
    end
    local dt = GetGameTimer() - t0
    print(('%s export: %d calls, %d answered, %d ms total, %.3f ms/call (Lua → Lua, synchronous)'):format(TAG, n, answered, dt, dt / n))
  elseif how == 'frame' then
    if GetResourceState('nuikit_spike_route') ~= 'started' then print(TAG .. ' nuikit_spike_route is not started') return end
    CreateThread(function()
      local frames, t0 = 0, GetGameTimer()
      local maxCall = 0
      while frames < n do
        local c0 = GetGameTimer()
        exports.nuikit_spike_route:intent('notify', { title = 'frame ' .. frames })
        local c = GetGameTimer() - c0
        if c > maxCall then maxCall = c end
        frames = frames + 1
        Wait(0)
      end
      local dt = GetGameTimer() - t0
      print(('%s frame: %d frames in %d ms (%.2f ms/frame incl. the frame itself), slowest call %d ms. Read resmon for nuikit_spike_route and nuikit_spike_caller now.'):format(TAG, n, dt, dt / n, maxCall))
    end)
  else
    print(TAG .. ' usage: /spike_route page <n> | export <n> | frame <n>')
  end
end, false)

-- The page reports its numbers through its own resource's callback (this one).
RegisterNUICallback('spike:result', function(data, cb)
  print(('%s page: %s'):format(TAG, json.encode(data)))
  cb({})
end)

print(TAG .. ' started · /spike_menu · /spike_notify · /spike_route')
