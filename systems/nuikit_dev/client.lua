if GetConvar('nuikit_dev', '0') ~= '1' then return end

local running = false

local function note(description, status)
  nk.intent.notify({ title = 'nuikit_dev', description = description, status = status or 'info' })
end

local function result(label, value)
  note(('%s: %s'):format(label, value == nil and 'nil' or json.encode(value)))
end

local tests = {}

function tests.notify()
  for _, status in ipairs({ 'info', 'success', 'warning', 'error' }) do
    nk.intent.notify({ title = status, description = 'A ' .. status .. ' notification', status = status })
  end
  -- The same id twice merges into one toast.
  nk.intent.notify({ id = 'dev-merge', title = 'Merged', description = 'First', status = 'info' })
  Wait(800)
  nk.intent.notify({ id = 'dev-merge', title = 'Merged', description = 'Second (replaced in place)', status = 'success' })
end

function tests.menu()
  result('menu', nk.intent.menu({
    title = 'Garage',
    items = {
      { label = 'Sultan', description = 'Sports sedan', args = { plate = 'ABC123' } },
      { label = 'Kuruma', description = 'Armoured', args = { plate = 'XYZ789' } },
      { label = 'Disabled', disabled = true },
    },
  }))
end

function tests.input()
  result('input', nk.intent.input({
    title = 'New contact',
    fields = {
      { type = 'text', label = 'Name', required = true },
      { type = 'number', label = 'Age', min = 18, max = 99 },
      { type = 'checkbox', label = 'Favourite' },
    },
  }))
end

function tests.confirm()
  result('confirm', nk.intent.confirm({ title = 'Delete item?', description = 'This cannot be undone.' }))
end

function tests.progress()
  result('progress bar', nk.intent.progress({ label = 'Repairing', duration = 4000, style = 'bar', cancel = true }))
  result('progress ring', nk.intent.progress({ label = 'Searching', duration = 4000, style = 'ring', cancel = true }))
end

function tests.prompt()
  local p = nk.intent.prompt('[E] Open garage')
  Wait(3000)
  p:update({ active = true })
  Wait(2000)
  p:cancel()
end

-- Target: the targeting library's job done by hand. Look at a vehicle or prop within 8 m (the eye lights), press
-- LEFT ALT to open its options, click one (a notification says which) or press Escape to cancel. 40 s, or Escape.
local TARGET_KEY = 19 -- LEFT ALT
local TARGET_RANGE = 8.0

local function targetInSight()
  local from = GetGameplayCamCoord()
  local rot = GetGameplayCamRot(2)
  local rx, rz = math.rad(rot.x), math.rad(rot.z)
  local fwd = vector3(-math.sin(rz) * math.abs(math.cos(rx)), math.cos(rz) * math.abs(math.cos(rx)), math.sin(rx))
  local ped = PlayerPedId()
  local me, own = GetEntityCoords(ped), GetVehiclePedIsIn(ped, false)
  local best, bestDot
  for _, pool in ipairs({ 'CVehicle', 'CObject' }) do
    for _, e in ipairs(GetGamePool(pool)) do
      local at = GetEntityCoords(e)
      local d = at - from
      local dist = #d
      if e ~= own and dist > 0.5 and #(at - me) <= TARGET_RANGE then
        local dot = (d / dist):dot(fwd)
        if dot > 0.97 and (not bestDot or dot > bestDot) then best, bestDot = e, dot end
      end
    end
  end
  return best
end

function tests.target()
  note('Target test: look at a nearby vehicle or prop (the eye lights up), press LEFT ALT to open its options, click one or press Escape. Ends in 40 s.')
  local options = {
    { label = 'Inspect', icon = 'search', id = 'inspect' },
    { label = 'Lock', icon = 'lock', id = 'lock' },
    { label = 'Honk', icon = 'volume-2', id = 'honk' },
  }
  local handle = nk.intent.target({ title = 'Target test', eye = true, active = false, options = options }, {
    cb = function(res, reason)
      local o = res and options[res.index or 0]
      note(o and ('Target option chosen: ' .. o.label) or ('Target closed (' .. tostring(reason) .. ')'))
    end,
  })
  local active, open = false, false
  local ends = GetGameTimer() + 40000
  while handle:isOpen() and GetGameTimer() < ends do
    Wait(0)
    if not open then
      local seen = targetInSight() ~= nil
      if seen ~= active then active = seen handle:update({ active = seen }) end
      if active and IsControlJustPressed(0, TARGET_KEY) then
        open = true
        handle:update({ open = true, active = true })
      end
    end
  end
  if handle:isOpen() then handle:cancel('timeout') end
end

function tests.radial()
  result('radial', nk.intent.radial({
    label = 'Actions',
    items = { { label = 'Wave' }, { label = 'Sit' }, { label = 'Point' }, { label = 'Dance' } },
  }))
end

function tests.challenge()
  result('challenge', nk.intent.challenge('easy'))
end

function tests.ox_notify()
  for _, t in ipairs({ 'inform', 'success', 'warning', 'error' }) do
    lib.notify({ title = 'ox_lib', description = 'lib.notify ' .. t, type = t })
  end
end

function tests.ox_progress()
  result('lib.progressBar', lib.progressBar({ duration = 4000, label = 'Bar', canCancel = true }))
  result('lib.progressCircle', lib.progressCircle({ duration = 4000, label = 'Circle', position = 'middle', canCancel = true }))
end

function tests.ox_input()
  result('lib.inputDialog', lib.inputDialog('Dialog', {
    { type = 'input', label = 'Name', required = true },
    { type = 'number', label = 'Amount', min = 1, max = 10 },
    { type = 'checkbox', label = 'Confirm' },
  }))
end

function tests.ox_alert()
  result('lib.alertDialog', lib.alertDialog({ header = 'Heads up', content = 'Proceed with the test?', centered = true, cancel = true }))
end

function tests.ox_context()
  lib.registerContext({
    id = 'nuikit_dev_ctx',
    title = 'Context',
    options = {
      { title = 'Plain', description = 'A row', icon = 'house' },
      { title = 'Submenu', menu = 'nuikit_dev_ctx_sub', arrow = true },
    },
  })
  lib.registerContext({
    id = 'nuikit_dev_ctx_sub',
    title = 'Submenu',
    menu = 'nuikit_dev_ctx',
    options = { { title = 'Child', description = 'Nested row' } },
  })
  lib.showContext('nuikit_dev_ctx')
end

function tests.ox_menu()
  lib.registerMenu({
    id = 'nuikit_dev_menu',
    title = 'List menu',
    position = 'top-right',
    options = {
      { label = 'Plain' },
      { label = 'Scroll', values = { 'One', 'Two', 'Three' } },
      { label = 'Check', checked = true },
    },
  }, function(selected, scroll, args) result('lib.registerMenu', { selected, scroll, args }) end)
  lib.showMenu('nuikit_dev_menu')
end

function tests.ox_skill()
  result('lib.skillCheck', lib.skillCheck({ 'easy', 'medium' }, { 'w', 'a', 's', 'd' }))
end

function tests.ox_textui()
  lib.showTextUI('[E] Open garage', { position = 'right-center' })
  Wait(5000)
  lib.hideTextUI()
end

function tests.ox_radial()
  -- ox_lib opens its radial with its own key (default Z), there is no call that opens it.
  lib.addRadialItem({
    { id = 'nuikit_dev_a', label = 'Test A', icon = 'star', onSelect = function() note('radial A') end },
    { id = 'nuikit_dev_b', label = 'Test B', icon = 'heart', onSelect = function() note('radial B') end },
  })
  note('Hold Z to open the ox_lib radial (items vanish in 30 s)')
  Wait(30000)
  lib.removeRadialItem('nuikit_dev_a')
  lib.removeRadialItem('nuikit_dev_b')
end

local TOUR = {
  'notify', 'menu', 'input', 'confirm', 'progress', 'prompt', 'target', 'radial', 'challenge',
  'ox_notify', 'ox_progress', 'ox_input', 'ox_alert', 'ox_context', 'ox_skill', 'ox_textui',
}

RegisterNetEvent('nuikit_dev:run', function(what)
  if GetInvokingResource() then return end -- only the server sends this, never another resource's TriggerEvent
  if running then return note('A test is still running', 'warning') end
  local list = what == 'all' and TOUR or { what }
  CreateThread(function()
    running = true
    for _, name in ipairs(list) do
      local fn = tests[name]
      if fn then
        local ok, err = pcall(fn)
        if not ok then note(name .. ': ' .. tostring(err), 'error') end
        if #list > 1 then Wait(1500) end
      end
    end
    running = false
  end)
end)

RegisterNetEvent('nuikit_dev:notify', function(description, status)
  if GetInvokingResource() then return end
  note(tostring(description), status)
end)
