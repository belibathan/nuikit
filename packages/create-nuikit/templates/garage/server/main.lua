-- {{name}}: server
-- The example's vehicle records, per player (license), kept in Config.saveFile in this resource.
-- Every request from the page comes through here: list, store, take out, release. A real server
-- reads and writes its framework's vehicle table instead; keep the same answers and the same checks.
--
-- Nothing from the client is trusted: ids and plates must be short strings, a vehicle is only
-- looked up among the caller's own records, the caller must be at the garage, the vehicle being
-- stored is read from the game (the one the caller is driving), and the server spawns and deletes
-- vehicles itself so a record can't be taken out twice.

local resource = GetCurrentResourceName()
local db = json.decode(LoadResourceFile(resource, Config.saveFile) or '{}') or {}

-- Vehicles this resource spawned, in memory (they're deleted when the resource stops):
-- spawned[owner .. '|' .. id] = entity, and spawnedBy[entity] = owner .. '|' .. id.
local spawned, spawnedBy = {}, {}
-- Records with a take-out or release in progress, also in memory: busy[owner .. '|' .. id] = true.
local busy = {}

local function save()
  SaveResourceFile(resource, Config.saveFile, json.encode(db), -1)
end

local function owner(src)
  return GetPlayerIdentifierByType(src, 'license') or ('src:' .. src)
end

local function garageById(id)
  if type(id) ~= 'string' then return nil end
  for _, g in ipairs(Config.garages) do
    if g.id == id then return g end
  end
end

--- A plate or record id from the client: a string of 1–8 letters, digits and spaces, trimmed.
local function plateOf(v)
  if type(v) ~= 'string' then return nil end
  v = v:gsub('^%s+', ''):gsub('%s+$', '')
  if #v < 1 or #v > 8 or v:find('[^%w ]') then return nil end
  return v
end

--- A short label from the client, or nil.
local function textOf(v, max)
  if type(v) ~= 'string' or v == '' then return nil end
  return v:sub(1, max or 40)
end

local function pct(n)
  if type(n) ~= 'number' or n ~= n then return 0 end
  return math.floor(math.max(0, math.min(100, n)) + 0.5)
end

--- Is the player within reach of the garage? (Server-side position needs OneSync, which Qbox,
--- QBCore and ESX servers run; without it the check is skipped.)
local function near(src, garage)
  local ped = GetPlayerPed(src)
  if not ped or ped == 0 then return true end
  local p, c = GetEntityCoords(ped), garage.coords
  local dx, dy, dz = p.x - c.x, p.y - c.y, p.z - c.z
  return dx * dx + dy * dy + dz * dz <= (Config.radius + 5.0) ^ 2
end

local function live(entity) return entity and entity ~= 0 and DoesEntityExist(entity) end

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

--- Whose record is this plate? (license, record) or nil.
local function findPlate(plate)
  for license, mine in pairs(db) do
    for _, v in pairs(mine) do
      if v.plate == plate then return license, v end
    end
  end
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

--- Store the vehicle the caller is driving. What's stored is read from the game, not the page:
--- the client only names the vehicle (its network id) and adds a label and class for the list.
handlers.store = function(src, data)
  local garage = garageById(data.garage)
  if not garage then return { ok = false, error = 'Unknown garage.' } end
  if not near(src, garage) then return { ok = false, error = "You're not at the garage." } end
  local entity = type(data.net) == 'number' and NetworkGetEntityFromNetworkId(data.net) or 0
  local ped = GetPlayerPed(src)
  if not live(entity) or GetPedInVehicleSeat(entity, -1) ~= ped then
    return { ok = false, error = 'Drive the vehicle into the garage first.' }
  end
  local plate = plateOf(GetVehicleNumberPlateText(entity))
  if not plate then return { ok = false, error = "That vehicle's plate can't be stored." } end

  local me = owner(src)
  local license, v = findPlate(plate)
  if license and license ~= me then return { ok = false, error = "That vehicle isn't yours." } end
  local tag = spawnedBy[entity]
  if tag and tag ~= me .. '|' .. plate then return { ok = false, error = "That vehicle isn't yours." } end
  if v and v.state == 'impounded' then return { ok = false, error = "It's impounded. Release it first." } end
  -- the record's own vehicle is still out somewhere (this one is a copy with the same plate)
  local key = me .. '|' .. plate
  if v and live(spawned[key]) and spawned[key] ~= entity then
    return { ok = false, error = 'Your ' .. v.label .. ' is still out. Bring that one back.' }
  end

  local mine = db[me] or {}
  db[me] = mine
  v = v or { id = plate, plate = plate }
  v.model = GetEntityModel(entity)
  v.type = GetVehicleType(entity)
  v.label = textOf(data.label) or v.label or plate
  v.class = textOf(data.class, 20) or v.class
  v.fuel = pct(Entity(entity).state.fuel or data.fuel)
  v.engine = pct(GetVehicleEngineHealth(entity) / 10)
  v.body = pct(GetVehicleBodyHealth(entity) / 10)
  v.state, v.garage, v.fee = 'stored', garage.id, nil
  mine[plate] = v
  spawned[key], spawnedBy[entity] = nil, nil
  save()
  -- the server removes it (after the player has stepped out), so the client can't keep it
  SetTimeout(1500, function() if DoesEntityExist(entity) then DeleteEntity(entity) end end)
  return { ok = true }
end

--- Take a vehicle out: the server spawns it at the garage. The record is marked before anything
--- yields, so a second request (a double click, a replay) finds it out and is refused; if the spawn
--- fails the record goes back to stored.
handlers.take = function(src, data)
  local garage = garageById(data.garage)
  local id = plateOf(data.id)
  if not garage or not id then return { ok = false, error = 'Unknown vehicle.' } end
  if not near(src, garage) then return { ok = false, error = "You're not at the garage." } end
  local me = owner(src)
  local v = (db[me] or {})[id]
  if not v then return { ok = false, error = "That vehicle isn't yours." } end
  local key = me .. '|' .. id
  if busy[key] then return { ok = false, error = 'Hold on, the garage is busy with it.' } end
  if v.state == 'impounded' then return { ok = false, error = 'Release it from the impound first.' } end
  if v.state == 'out' and live(spawned[key]) then return { ok = false, error = "It's already out." } end
  -- 'out' with nothing in the world (destroyed, or the resource restarted): it can come out again

  busy[key] = true
  local s = garage.spawn
  local entity = CreateVehicleServerSetter(v.model, v.type or 'automobile', s.x, s.y, s.z, s.w)
  local deadline = GetGameTimer() + 3000
  while not live(entity) and GetGameTimer() < deadline do Wait(50) end
  busy[key] = nil
  if not live(entity) then
    if entity and entity ~= 0 and DoesEntityExist(entity) then DeleteEntity(entity) end
    return { ok = false, error = "The vehicle didn't spawn. It's still in the garage." }
  end
  SetVehicleNumberPlateText(entity, v.plate)
  Entity(entity).state:set('fuel', v.fuel, true)
  spawned[key], spawnedBy[entity] = entity, key
  v.state, v.garage = 'out', nil
  save()
  return { ok = true, net = NetworkGetNetworkIdFromEntity(entity), vehicle = { fuel = v.fuel, engine = v.engine, body = v.body } }
end

--- Pay the fee and move an impounded vehicle to this garage. Charged only once every check has
--- passed, and refunded if the release itself fails.
handlers.release = function(src, data)
  local garage = garageById(data.garage)
  local id = plateOf(data.id)
  if not garage or not id then return { ok = false, error = 'Unknown vehicle.' } end
  if not near(src, garage) then return { ok = false, error = "You're not at the garage." } end
  local key = owner(src) .. '|' .. id
  local v = (db[owner(src)] or {})[id]
  if not v or v.state ~= 'impounded' then return { ok = false, error = "It isn't impounded." } end
  if busy[key] then return { ok = false, error = 'Hold on, the garage is busy with it.' } end
  local fee = type(v.fee) == 'number' and v.fee > 0 and math.floor(v.fee) or 0

  busy[key] = true
  if fee > 0 and not Config.charge(src, fee) then
    busy[key] = nil
    return { ok = false, error = "You can't pay the fee." }
  end
  local done, err = pcall(function()
    v.state, v.garage, v.fee = 'stored', garage.id, nil
    save()
  end)
  busy[key] = nil
  if not done then
    print(('[{{name}}] release of %s failed after charging %d, refunding: %s'):format(id, fee, err))
    v.state, v.garage, v.fee = 'impounded', nil, fee
    if fee > 0 then Config.refund(src, fee) end
    return { ok = false, error = "The release didn't go through. Your money was refunded." }
  end
  return { ok = true }
end

RegisterNetEvent('{{name}}:req', function(id, name, data)
  local src = source
  local handler = type(name) == 'string' and handlers[name]
  local ok, result = pcall(function() return handler and handler(src, type(data) == 'table' and data or {}) end)
  if not ok then print(('[{{name}}] %s failed: %s'):format(name, result)) end
  TriggerClientEvent('{{name}}:res', src, id, ok and result or { ok = false, error = 'The garage had a problem. Try again.' })
end)

--- Impound a vehicle by plate, e.g. from a police script: exports['{{name}}']:impound('ZEN 01', 250)
exports('impound', function(plate, fee)
  plate = plateOf(plate)
  if not plate then return false end
  local license, v = findPlate(plate)
  if not v then return false end
  local key = license .. '|' .. v.id
  if spawned[key] then spawnedBy[spawned[key]], spawned[key] = nil, nil end
  v.state, v.garage, v.fee = 'impounded', nil, math.max(0, math.floor(tonumber(fee) or 0))
  save()
  return true
end)
