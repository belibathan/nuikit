-- {{name}}: client
-- The dialogue lives in web/ (the npc-dialogue block); this file opens it at the nearest NPC with
-- the first line the server gives, and passes each choice on. The server holds the conversation and
-- decides what a choice does; the answer is the next line or the end.
-- Lua → UI: surfaces nk.surface(name, opts) · UI → Lua: nk.on(callback, fn) ↔ fetchNui()

-- Escape closes the dialogue through the surface.
local panel = nk.surface('dialogue', { layer = 'panel', exclusive = true, escape = 'back' })
local here = nil -- the NPC the panel is open at

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

local function nearest()
  local pos = GetEntityCoords(PlayerPedId())
  for _, n in ipairs(Config.npcs) do
    if #(pos - n.coords) <= n.radius then return n end
  end
end

local function open()
  local npc = nearest()
  if not npc then return end
  local res = request('open', { npc = npc.id })
  if not res or not res.ok then
    nk.notify({ title = res and res.error or "They didn't answer.", type = 'error' })
    return
  end
  here = npc
  panel:open(res.data)
end

-- /{{name}} or E near an NPC (players can rebind it in Settings → Key Bindings → FiveM).
RegisterCommand('{{name}}', function()
  if panel:isOpen() then panel:close() else open() end
end, false)
RegisterKeyMapping('{{name}}', 'Talk', 'keyboard', Config.key or 'E')

-- Say how once, when the player walks up to someone; close when they walk away, and tell the server
-- when the conversation is over however it closed (Escape, walking away).
CreateThread(function()
  local inside = nil
  while true do -- INFINITE LOOP: for the resource's life; every pass sleeps
    local n = nearest()
    if n and n ~= inside then nk.notify({ title = n.name, description = ('Press %s to talk'):format(Config.key or 'E') }) end
    inside = n
    if not n and panel:isOpen() then panel:close() end -- walked away
    if here and not panel:isOpen() then
      here = nil
      request('leave', {})
    end
    Wait(250)
  end
end)

-- ───────────────────────────────── what the page asks for

nk.on('dialogue:choose', function(data)
  if not here then return { ok = false, error = "You're not talking to anyone." } end
  local res = request('choose', { choice = data.choice })
  if not res then return { ok = false, error = "They didn't answer." } end
  if res.ok and res.ended then
    panel:close()
  elseif res.ok and panel:isOpen() then
    panel:update(res.data)
  end
  return { ok = res.ok, error = res.error }
end)
