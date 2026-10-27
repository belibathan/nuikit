-- {{name}}: client
-- The shop lives in web/ (the shop block); this file opens it at the nearest shop with what the
-- server says is for sale, and passes the checkout on. The server checks every line, the price,
-- the stock and the money; an error goes back to the panel.
-- Lua → UI: surfaces nk.surface(name, opts) · UI → Lua: nk.on(callback, fn) ↔ fetchNui()

-- escape = 'back': Escape closes the page's confirm first, then the shop.
local panel = nk.surface('shop', { layer = 'panel', exclusive = true, escape = 'back' })
local here = nil -- the shop the panel is open at

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
  for _, s in ipairs(Config.shops) do
    if #(pos - s.coords) <= s.radius then return s end
  end
end

local function open()
  here = nearest()
  if not here then return end
  local res = request('open', { shop = here.id })
  if not res or not res.ok then
    nk.notify({ title = res and res.error or "The shop didn't answer.", type = 'error' })
    return
  end
  panel:open(res.shop)
end

-- /{{name}} or E near a shop (players can rebind it in Settings → Key Bindings → FiveM).
RegisterCommand('{{name}}', function()
  if panel:isOpen() then panel:close() else open() end
end, false)
RegisterKeyMapping('{{name}}', 'Open the shop', 'keyboard', Config.key or 'E')

-- Say how once, when the player walks into a shop.
CreateThread(function()
  local inside = nil
  while true do -- INFINITE LOOP: for the resource's life; every pass sleeps
    local s = nearest()
    if s and s ~= inside then nk.notify({ title = s.label, description = ('Press %s to shop'):format(Config.key or 'E') }) end
    inside = s
    if not s and panel:isOpen() then panel:close() end -- walked away
    Wait(500)
  end
end)

-- ───────────────────────────────── what the page asks for

nk.on('shop:buy', function(data)
  if not here then return { ok = false, error = "You're not at the shop." } end
  local res = request('buy', { shop = here.id, items = data.items, payment = data.payment })
  if not res then return { ok = false, error = "The shop didn't answer." } end
  if res.ok then
    local fresh = request('open', { shop = here.id })
    if fresh and fresh.ok and panel:isOpen() then panel:update(fresh.shop) end
    nk.notify({ title = 'Thanks for shopping', type = 'success' })
  end
  return { ok = res.ok, error = res.error }
end)
