-- {{name}}: client
-- The bank lives in web/ (the bank block); this file opens it at a bank or an ATM and passes every
-- deposit, withdrawal and transfer to server/main.lua, which checks it. After a move the panel gets
-- fresh balances; an error goes back to the page's dialog.
-- Lua → UI: surfaces nk.surface(name, opts) · UI → Lua: nk.on(callback, fn) ↔ fetchNui()

local panel = nk.surface('bank', { layer = 'panel', exclusive = true })
local where = nil -- { title, atm } of the bank or ATM it's open at

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

local function nearby()
  local pos = GetEntityCoords(PlayerPedId())
  for _, b in ipairs(Config.banks) do
    if #(pos - b.coords) <= Config.radius then return { title = b.label, atm = false } end
  end
  for _, a in ipairs(Config.atms) do
    if #(pos - a) <= Config.radius then return { title = 'ATM', atm = true } end
  end
end

local function snapshot()
  local res = request('open', where)
  return res and res.ok and res.bank or nil
end

-- /{{name}} or F9 at a bank or an ATM (players can rebind it in Settings → Key Bindings → FiveM).
-- An "[E] Use the ATM" prompt comes with the kit's key-prompt component.
RegisterCommand('{{name}}', function()
  if panel:isOpen() then return panel:close() end
  where = nearby()
  if not where then return print("[{{name}}] You're not at a bank or an ATM.") end
  local data = snapshot()
  if data then panel:open(data) end
end, false)
RegisterKeyMapping('{{name}}', 'Use the bank or ATM', 'keyboard', Config.key or 'F9')

-- ───────────────────────────────── what the page asks for

local function move(name)
  return function(data)
    if not where then return { ok = false } end
    data.atm = where.atm
    local res = request(name, data)
    if not res then return { ok = false, error = "The bank didn't answer. Try again." } end
    if res.ok then
      local fresh = snapshot()
      if fresh and panel:isOpen() then panel:update(fresh) end
    end
    return { ok = res.ok, error = res.error }
  end
end

nk.on('bank:deposit', move('deposit'))
nk.on('bank:withdraw', move('withdraw'))
nk.on('bank:transfer', move('transfer'))
