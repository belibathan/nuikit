-- {{name}}: server
-- Options and points marked `server = true` in config.lua come here, and are checked again before
-- anything happens: the option must exist for what was aimed at, the point must be one of the
-- server's own, the player must be close enough (server-side position, OneSync), and not too
-- often. What the client says it aimed at or stood next to is never taken on trust.

local resource = GetCurrentResourceName()

-- Distances need server-side positions, which need OneSync. Without it the client-only options
-- and points work and every server one is refused; say so at start.
local ONESYNC = GetConvar('onesync', 'off') ~= 'off'
if not ONESYNC then
  print(('^1[%s] OneSync is off: options and points marked server = true will be refused (set onesync on in server.cfg).^0'):format(resource))
end

-- ox_target and qb-target hold Left Alt too: two eyes on one key fight over the cursor and the
-- controls. Say so once, at start (and again whenever one of them starts later).
local OTHERS = { 'ox_target', 'qb-target' }
local function warnOthers(only)
  for _, name in ipairs(OTHERS) do
    if (not only or only == name) and GetResourceState(name) == 'started' then
      print(('^3[%s] %s is running. Both target on a held key (Left Alt by default): give this one another key (Config.key, or players rebind it in Settings → Key Bindings → FiveM) or stop one of them.^0'):format(resource, name))
    end
  end
end
warnOthers()
AddEventHandler('onResourceStart', function(name) warnOthers(name) end)

for _, t in ipairs(Config.targets) do
  if t.models then
    t.hashes = {}
    for _, m in ipairs(t.models) do t.hashes[type(m) == 'number' and m or GetHashKey(m)] = true end
  end
end

local function position(src)
  local ped = GetPlayerPed(src)
  if not ped or ped == 0 then return nil end
  return GetEntityCoords(ped)
end

local function within(a, b, r)
  local dx, dy, dz = a.x - b.x, a.y - b.y, a.z - b.z
  return dx * dx + dy * dy + dz * dz <= r * r
end

local last = {} -- [src .. '|' .. id] = GetGameTimer() of the last use
local function tooSoon(src, id, cooldown)
  local key, now = src .. '|' .. id, GetGameTimer()
  if last[key] and now - last[key] < cooldown then return true end
  last[key] = now
  return false
end
AddEventHandler('playerDropped', function()
  local src = tostring(source) .. '|'
  for k in pairs(last) do if k:sub(1, #src) == src then last[k] = nil end end
end)

-- ───────────────────────────────── what the server-side options and points do (replace with yours)

local actions = {}

-- ───────────────────────────────── keys: who may lock which vehicle

-- Keys by plate, per player (license; kept on the server, never sent to a client). Your garage or
-- dealership hands them out when it gives a player a car:
--   exports['{{name}}']:giveKeys(src, plate)      exports['{{name}}']:removeKeys(src, plate)
-- and an admin can from the console: {{name}}_givekeys <server id> <plate>
local keys = {}
local function license(src) return GetPlayerIdentifierByType(src, 'license') or ('src:' .. src) end
local function plateOf(text)
  if type(text) ~= 'string' then return nil end
  text = text:gsub('^%s+', ''):gsub('%s+$', ''):upper()
  if #text < 1 or #text > 8 then return nil end
  return text
end
local function hasKeys(src, plate) return plate ~= nil and (keys[license(src)] or {})[plate] == true end

exports('giveKeys', function(src, plate)
  plate = plateOf(plate)
  if not plate or not GetPlayerName(src) then return false end
  local id = license(src)
  keys[id] = keys[id] or {}
  keys[id][plate] = true
  return true
end)
exports('removeKeys', function(src, plate)
  plate = plateOf(plate)
  local mine = plate and keys[license(src)]
  if mine then mine[plate] = nil end
  return mine ~= nil
end)
RegisterCommand('{{name}}_givekeys', function(_, args)
  local target, plate = tonumber(args[1]), plateOf(args[2])
  if not target or not GetPlayerName(target) or not plate then
    print('Usage: {{name}}_givekeys <server id> <plate>')
    return
  end
  keys[license(target)] = keys[license(target)] or {}
  keys[license(target)][plate] = true
  print(('[{{name}}] %s has the keys to %s'):format(GetPlayerName(target), plate))
end, true)

--- Lock or unlock a vehicle: only with its keys (checked here, by the plate the server reads).
actions.lock = function(src, vehicle)
  if not hasKeys(src, plateOf(GetVehicleNumberPlateText(vehicle))) then return { ok = false, error = "You don't have the keys." } end
  local locked = not Entity(vehicle).state.locked
  Entity(vehicle).state:set('locked', locked, true)
  SetVehicleDoorsLocked(vehicle, locked and 2 or 1)
  TriggerClientEvent('{{name}}:notice', src, locked and 'Locked' or 'Unlocked')
  return { ok = true }
end

--- Ring the bell: everyone within 30 m hears it.
actions.bell = function(src, point)
  for _, s in ipairs(GetPlayers()) do
    local id = tonumber(s)
    local at = id and position(id)
    if at and within(at, point.coords, 30.0) then TriggerClientEvent('{{name}}:notice', id, 'Someone rang the bell') end
  end
  return { ok = true }
end

-- ───────────────────────────────── the checks

local handlers = {}

--- A point (Config.points, server = true): the player stands at it, and not too often.
handlers.use = function(src, data)
  local point
  for _, p in ipairs(Config.points) do
    if p.server and p.id == data.id then point = p end
  end
  if not point then return { ok = false, error = "You can't do that here." } end
  local at = position(src)
  if not at or not within(at, point.coords, point.radius + 1.0) then return { ok = false, error = "You're too far away." } end
  if tooSoon(src, point.id, point.cooldown or 1000) then return { ok = false, error = 'Not so fast. Try again in a moment.' } end
  local act = actions[point.id]
  return act and act(src, point) or { ok = true }
end

--- An option (Config.targets, server = true) on a networked entity: it exists, it's close to the
--- player, and the option belongs to what that entity is.
handlers.select = function(src, data)
  local entity = type(data.net) == 'number' and NetworkGetEntityFromNetworkId(data.net) or 0
  if entity == 0 or not DoesEntityExist(entity) then return { ok = false, error = "It's gone." } end
  local at = position(src)
  if not at or not within(at, GetEntityCoords(entity), Config.distance + 1.5) then return { ok = false, error = "You're too far away." } end
  local kind, model = GetEntityType(entity), GetEntityModel(entity)
  local player = kind == 1 and IsPedAPlayer(entity)
  local option
  for _, t in ipairs(Config.targets) do
    local match = (t.type == 'vehicle' and kind == 2) or (t.type == 'player' and player)
      or (t.type == 'ped' and kind == 1 and not player) or (t.hashes and t.hashes[model])
    if match then
      for _, o in ipairs(t.options) do
        if o.server and o.id == data.id then option = o end
      end
    end
  end
  if not option then return { ok = false, error = "You can't do that." } end
  if tooSoon(src, option.id, option.cooldown or 500) then return { ok = false, error = 'Not so fast. Try again in a moment.' } end
  local act = actions[option.id]
  return act and act(src, entity) or { ok = true }
end

RegisterNetEvent('{{name}}:req', function(id, name, data)
  local src = source
  if not ONESYNC then
    TriggerClientEvent('{{name}}:res', src, id, { ok = false, error = 'This needs OneSync on the server.' })
    return
  end
  local handler = type(name) == 'string' and handlers[name]
  local ok, result = pcall(function() return handler and handler(src, type(data) == 'table' and data or {}) end)
  if not ok then print(('[{{name}}] %s failed: %s'):format(name, result)) end
  TriggerClientEvent('{{name}}:res', src, id, ok and result or { ok = false, error = 'Something went wrong. Try again.' })
end)
