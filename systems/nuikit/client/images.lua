--[[
  nuikit (client): the Lua side of the image resolver (docs/images.md). Any page may call these.

  NUI callback https://nuikit/images
    {} → { item, weapon, vehicle, clothing, replace }   the server's URL templates, `;`-separated, from
                                                         `setr nuikit_images_<kind> "…"` (replicated convars).
                                                         `replace` from `setr nuikit_images_replace 1`.
    ox_inventory's own `inventory:imagepath` (when set) joins the item templates after nuikit_images_item.
    nuikit-core's setImageConfig merges these over its defaults (packages/core/src/images.ts).

  NUI callback https://nuikit/vehicle (read only)
    {} → { model, hash } for the vehicle the player sits in, else the one they stand at (≤ 4 m, the
         closest); {} when there is none. `model` is the spawn name, lower case: the framework's shared
         vehicle list when it knows the hash (Qbox, QBCore), else GTA's display name.
]]

local KINDS = { 'item', 'weapon', 'vehicle', 'clothing' }
local NEAR = 4.0

--- A convar's templates. `|` separates them too (cfg files split lines on semicolons); the page gets `;`.
local function convar(name)
  local v = GetConvar(name, '')
  return type(v) == 'string' and (v:match('^%s*(.-)%s*$'):gsub('|', ';')) or ''
end

local function templates()
  local out = {}
  for _, kind in ipairs(KINDS) do out[kind] = convar('nuikit_images_' .. kind) end
  local ox = convar('inventory:imagepath')
  if ox ~= '' then
    local t = ox:gsub('/+$', '') .. '/{name}.png'
    out.item = out.item ~= '' and (out.item .. ';' .. t) or t
  end
  local replace = convar('nuikit_images_replace')
  out.replace = replace == '1' or replace == 'true'
  return out
end

RegisterNUICallback('images', function(_, cb)
  cb(templates())
end)

--- A shared list keyed by model hash (integer keys; string keys after some serialisers).
local function byHash(list, hash)
  if type(list) ~= 'table' then return nil end
  local v = list[hash] or list[tostring(hash)]
  return type(v) == 'table' and type(v.model) == 'string' and v.model:lower() or nil
end

--- The framework's spawn name for a model hash: qbx_core's export, then QBCore's shared list.
local function spawnName(hash)
  if GetResourceState('qbx_core') == 'started' then
    local ok, list = pcall(function() return exports.qbx_core:GetVehiclesByHash() end)
    local name = ok and byHash(list, hash)
    if name then return name end
  end
  if GetResourceState('qb-core') == 'started' then
    local ok, core = pcall(function() return exports['qb-core']:GetCoreObject() end)
    local name = ok and type(core) == 'table' and type(core.Shared) == 'table' and byHash(core.Shared.VehicleHashes, hash)
    if name then return name end
  end
  local display = GetDisplayNameFromVehicleModel(hash)
  if type(display) == 'string' and display ~= '' and display ~= 'CARNOTFOUND' then return display:lower() end
  return nil
end

local function nearestVehicle(ped)
  local here = GetEntityCoords(ped)
  local best, bestDist = nil, NEAR
  for _, veh in ipairs(GetGamePool('CVehicle')) do
    local d = #(GetEntityCoords(veh) - here)
    if d <= bestDist then best, bestDist = veh, d end
  end
  return best
end

RegisterNUICallback('vehicle', function(_, cb)
  local ped = PlayerPedId()
  local veh = GetVehiclePedIsIn(ped, false)
  if not veh or veh == 0 then veh = nearestVehicle(ped) end
  if not veh or veh == 0 then cb({}) return end
  local hash = GetEntityModel(veh)
  local model = spawnName(hash)
  cb(model and { model = model, hash = hash } or {})
end)
