-- {{name}}: server
-- The example's vehicle records, per player (license), kept in Config.saveFile in this resource.
-- Every request from the page comes through here: list, store, take out, release. A real server
-- reads and writes its framework's vehicle table instead; keep the same answers.

local resource = GetCurrentResourceName()
local db = json.decode(LoadResourceFile(resource, Config.saveFile) or '{}') or {}

local function save()
  SaveResourceFile(resource, Config.saveFile, json.encode(db), -1)
end

local function owner(src)
  return GetPlayerIdentifierByType(src, 'license') or ('src:' .. src)
end

local function garageById(id)
  for _, g in ipairs(Config.garages) do
    if g.id == id then return g end
  end
end

--- A record as the page shows it (web/src/components/blocks/garage/nui.ts: GarageVehicle).
local function view(v, here)
  local location
  if v.state == 'stored' then
    location = v.garage ~= here and ('Parked at %s'):format((garageById(v.garage) or {}).label or v.garage) or nil
  elseif v.state == 'impounded' then
    location = 'Impounded'
  end
  return {
    id = v.id, label = v.label, plate = v.plate, class = v.class, state = v.state, location = location,
    fuel = v.fuel, engine = v.engine, body = v.body, fee = v.state == 'impounded' and v.fee or nil,
  }
end

local handlers = {}

handlers.list = function(src, data)
  local garage = garageById(data.garage)
  if not garage then return { ok = false, error = 'Unknown garage.' } end
  local out = {}
  for _, v in pairs(db[owner(src)] or {}) do out[#out + 1] = view(v, garage.id) end
  table.sort(out, function(a, b) return a.label < b.label end)
  return { ok = true, vehicles = out }
end

handlers.store = function(src, data)
  if not garageById(data.garage) or type(data.plate) ~= 'string' or data.plate == '' then return { ok = false, error = 'Nothing to store.' } end
  local mine = db[owner(src)] or {}
  db[owner(src)] = mine
  local id = data.plate
  local v = mine[id] or { id = id }
  v.model, v.label, v.plate, v.class = data.model, data.label, data.plate, data.class
  v.fuel, v.engine, v.body = data.fuel, data.engine, data.body
  v.state, v.garage, v.fee = 'stored', data.garage, nil
  mine[id] = v
  save()
  return { ok = true }
end

handlers.take = function(src, data)
  local v = (db[owner(src)] or {})[data.id]
  if not v then return { ok = false, error = "That vehicle isn't yours." } end
  if v.state == 'out' then return { ok = false, error = "It's already out." } end
  if v.state == 'impounded' then return { ok = false, error = 'Release it from the impound first.' } end
  v.state = 'out'
  save()
  return { ok = true, vehicle = { model = v.model, plate = v.plate, fuel = v.fuel, engine = v.engine, body = v.body } }
end

handlers.release = function(src, data)
  local v = (db[owner(src)] or {})[data.id]
  if not v or v.state ~= 'impounded' then return { ok = false, error = "It isn't impounded." } end
  if v.fee and v.fee > 0 and not Config.charge(src, v.fee) then return { ok = false, error = "You can't pay the fee." } end
  v.state, v.garage, v.fee = 'stored', data.garage, nil
  save()
  return { ok = true }
end

RegisterNetEvent('{{name}}:req', function(id, name, data)
  local src = source
  local handler = handlers[name]
  local ok, result = pcall(function() return handler and handler(src, type(data) == 'table' and data or {}) end)
  if not ok then print(('[{{name}}] %s failed: %s'):format(name, result)) end
  TriggerClientEvent('{{name}}:res', src, id, ok and result or { ok = false, error = 'The garage had a problem. Try again.' })
end)

--- Impound a vehicle by plate, e.g. from a police script: exports['{{name}}']:impound('ZEN 01', 250)
exports('impound', function(plate, fee)
  for _, mine in pairs(db) do
    for _, v in pairs(mine) do
      if v.plate == plate then
        v.state, v.fee = 'impounded', tonumber(fee) or 0
        save()
        return true
      end
    end
  end
  return false
end)
