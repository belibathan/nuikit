-- {{name}}: client
-- The storefront lives in web/ (the storefront block); this file opens it at the nearest business
-- with what the server says is on sale, and passes the checkout and the manage actions on. The server
-- checks every line, the price, the stock, the money and who works here; an error goes back to the panel.
-- Lua → UI: surfaces nk.surface(name, opts) · UI → Lua: nk.on(callback, fn) ↔ fetchNui()

-- escape = 'back': Escape closes the page's confirm first, then the counter.
local panel = nk.surface('storefront', { layer = 'panel', exclusive = true, escape = 'back' })
local here = nil -- the business the panel is open at

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
  for _, b in ipairs(Config.businesses) do
    if #(pos - b.coords) <= b.radius then return b end
  end
end

local function open()
  here = nearest()
  if not here then return end
  local res = request('open', { business = here.id })
  if not res or not res.ok then
    nk.notify({ title = res and res.error or "The business didn't answer.", type = 'error' })
    return
  end
  panel:open(res.store)
end

--- A fresh snapshot after a purchase or a manage action (prices, stock, money, open).
local function refresh()
  local fresh = here and request('open', { business = here.id })
  if fresh and fresh.ok and panel:isOpen() then panel:update(fresh.store) end
end

-- /{{name}} or E near a counter (players can rebind it in Settings → Key Bindings → FiveM).
RegisterCommand('{{name}}', function()
  if panel:isOpen() then panel:close() else open() end
end, false)
RegisterKeyMapping('{{name}}', 'Open the counter', 'keyboard', Config.key or 'E')

-- Say how once, when the player walks up to a counter.
CreateThread(function()
  local inside = nil
  while true do -- INFINITE LOOP: for the resource's life; every pass sleeps
    local b = nearest()
    if b and b ~= inside then nk.notify({ title = b.label, description = ('Press %s to shop'):format(Config.key or 'E') }) end
    inside = b
    if not b and panel:isOpen() then panel:close() end -- walked away
    Wait(500)
  end
end)

-- ───────────────────────────────── what the page asks for

nk.on('storefront:buy', function(data)
  if not here then return { ok = false, error = "You're not at the counter." } end
  local res = request('buy', { business = here.id, items = data.items, payment = data.payment })
  if not res then return { ok = false, error = "The business didn't answer." } end
  if res.ok then
    refresh()
    nk.notify({ title = 'Thanks for your order', type = 'success' })
  end
  return { ok = res.ok, error = res.error }
end)

nk.on('storefront:manage', function(data)
  if not here then return { ok = false, error = "You're not at the counter." } end
  local res = request('manage', { business = here.id, action = data.action, product = data.product, price = data.price,
    enabled = data.enabled, count = data.count, open = data.open })
  if not res then return { ok = false, error = "The business didn't answer." } end
  if res.ok then refresh() end
  return { ok = res.ok, error = res.error }
end)
