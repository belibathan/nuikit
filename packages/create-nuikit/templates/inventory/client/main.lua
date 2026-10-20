-- {{name}}: client
-- The inventory lives in web/ (the inventory block); this file opens it (with the stash you stand
-- at, if any), passes moves and uses on to server/main.lua, shows the hotbar strip when a hotbar
-- key is used, and plays the effect of an item the server let you use.
-- Lua → UI: surfaces nk.surface(name, opts) · UI → Lua: nk.on(callback, fn) ↔ fetchNui()

local panel = nk.surface('inventory', { layer = 'panel', exclusive = true, hides = { 'hotbar' } })
local strip = nk.surface('hotbar', { layer = 'hud', input = 'none' })
local stashId = nil -- the stash the panel is open with

-- ───────────────────────────────── asking the server

local pending, seq = {}, 0

--- Ask server/main.lua and wait for its answer (or nil after 5 s).
local function request(name, data)
  seq = seq + 1
  local id, p = seq, promise.new()
  pending[id] = p
  TriggerServerEvent('{{name}}:req', id, name, data)
  SetTimeout(5000, function()
    if pending[id] then pending[id] = nil; p:resolve(nil) end
  end)
  return Citizen.Await(p)
end

RegisterNetEvent('{{name}}:res', function(id, result)
  local p = pending[id]
  if p then pending[id] = nil; p:resolve(result) end
end)

-- ───────────────────────────────── the panel

local function nearestStash()
  local pos = GetEntityCoords(PlayerPedId())
  for _, s in ipairs(Config.stashes) do
    if #(pos - s.coords) <= s.radius then return s end
  end
end

--- A fresh snapshot from the server into the panel (opening it when `show`).
local function refresh(show)
  local res = request('open', { stash = stashId })
  if not res then return end
  if not res.ok then
    nk.notify({ title = res.error, type = 'error' })
    if stashId then stashId = nil; return refresh(show) end -- the stash went out of reach: pockets only
    return
  end
  if panel:isOpen() then panel:update(res.data) elseif show then panel:open(res.data) end
end

local function open()
  local s = nearestStash()
  stashId = s and s.id
  refresh(true)
  -- tell the server when it closes (Escape, another panel), so it stops sending us stash updates
  CreateThread(function()
    while panel:isOpen() do Wait(250) end
    request('close')
  end)
end

-- TAB or /{{name}} (players can rebind it in Settings → Key Bindings → FiveM).
RegisterCommand('{{name}}', function()
  if panel:isOpen() then panel:close() else open() end
end, false)
RegisterKeyMapping('{{name}}', 'Open the inventory', 'keyboard', Config.key or 'TAB')

-- Someone else changed the stash we're looking at, or an admin gave us something.
RegisterNetEvent('{{name}}:refresh', function()
  if panel:isOpen() then refresh(false) end
end)

-- ───────────────────────────────── what the page asks for

nk.on('inventory:move', function(data)
  local res = request('move', { from = data.from, to = data.to, count = data.count })
  if not res then return { ok = false, error = "The inventory didn't answer." } end
  refresh(false) -- after a refusal too: the page shows the server's truth
  return { ok = res.ok, error = res.error }
end)

nk.on('inventory:use', function(data)
  local res = request('use', { slot = data.slot })
  if not res then return { ok = false, error = "The inventory didn't answer." } end
  if res.ok then refresh(false) end
  return { ok = res.ok, error = res.error }
end)

-- ───────────────────────────────── the hotbar: keys 1…n use a slot, and the strip shows for a moment

local shownUntil = 0
for n = 1, Config.hotbar do
  local command = ('{{name}}_slot%d'):format(n)
  RegisterCommand(command, function()
    if panel:isOpen() or IsNuiFocused() then return end
    local res = request('use', { slot = n })
    local bar = request('hotbar')
    if bar and bar.ok then
      local data = { items = bar.items, size = Config.hotbar, active = n }
      if strip:isOpen() then strip:update(data) else strip:open(data) end
      shownUntil = GetGameTimer() + 2000
      SetTimeout(2100, function() if GetGameTimer() >= shownUntil and strip:isOpen() then strip:close() end end)
    end
    if res and not res.ok then nk.notify({ title = res.error, type = 'error' }) end
  end, false)
  RegisterKeyMapping(command, ('Use hotbar slot %d'):format(n), 'keyboard', tostring(n))
end

-- ───────────────────────────────── item effects (the server already took the item; replace with yours)

local effects = {
  drink = function() nk.notify({ title = 'Refreshing.' }) end,
  eat = function() nk.notify({ title = 'That hit the spot.' }) end,
  heal = function()
    local ped = PlayerPedId()
    SetEntityHealth(ped, math.min(GetEntityMaxHealth(ped), GetEntityHealth(ped) + 15))
    nk.notify({ title = 'Patched up.', type = 'success' })
  end,
}
RegisterNetEvent('{{name}}:effect', function(effect, name)
  local fn = effects[effect]
  if fn then fn(name) end
end)
