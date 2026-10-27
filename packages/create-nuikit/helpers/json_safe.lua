--[[
  JSON without the surprises of FiveM's `json` (lua-rapidjson). Tested there (info/runtime/json.md):
    - json.decode returns TWO values on success (the value and the position) and nil, position,
      message on bad input; `return json.decode(s)` leaks both;
    - json.encode errors on boolean keys and functions, and writes NaN and Infinity as they are;
    - an empty table encodes as [].
  Side: shared. Load from fxmanifest (shared_scripts).
  From fivem-foundation (upstream/examples/helpers/json_safe.lua, MIT).

    local data, reason = JsonSafe.decode(LoadResourceFile(GetCurrentResourceName(), 'data/spots.json'))
    if not data then
      Log.error('Cannot read data/spots.json: ' .. reason)
      return
    end
]]

local huge = math.huge
local MAX_DEPTH = 16

-- GLOBAL: helper table, shared by every file of this resource
JsonSafe = JsonSafe or {}

local function isFinite(value)
  return type(value) == 'number' and value == value and value ~= huge and value ~= -huge
end

--- Can this value be stored as JSON (KVP, a file, NUI)? Only string or finite-number keys, finite
--- numbers, strings, booleans, vectors and nested tables. No functions or funcrefs.
--- @param value any
--- @param depth? integer
--- @return boolean
function JsonSafe.isStorable(value, depth)
  depth = depth or 0
  local valueType = type(value)
  if valueType == 'string' or valueType == 'boolean' then return true end
  if valueType == 'number' then return isFinite(value) end
  if valueType == 'vector2' or valueType == 'vector3' or valueType == 'vector4' then
    return isFinite(value.x) and isFinite(value.y)
      and (valueType == 'vector2' or isFinite(value.z))
      and (valueType ~= 'vector4' or isFinite(value.w))
  end
  if valueType ~= 'table' or rawget(value, '__cfx_functionReference') ~= nil or depth >= MAX_DEPTH then
    return false
  end
  for key, item in pairs(value) do
    local keyType = type(key)
    if keyType ~= 'string' and not (keyType == 'number' and isFinite(key)) then return false end
    if not JsonSafe.isStorable(item, depth + 1) then return false end
  end
  return true
end

--- Decode with exactly one return value, plus a reason when it fails.
--- @param text any
--- @return any|nil value
--- @return string|nil reason
function JsonSafe.decode(text)
  if type(text) ~= 'string' or text == '' then return nil, 'text must be a non-empty string' end
  local ok, value, _, message = pcall(json.decode, text)
  if not ok then return nil, tostring(value) end
  if value == nil then return nil, tostring(message or 'invalid JSON') end
  return value
end

--- Encode after checking the value; never errors.
--- @param value any
--- @param options? table e.g. { indent = true }
--- @return string|nil encoded
--- @return string|nil reason
function JsonSafe.encode(value, options)
  if not JsonSafe.isStorable(value) then return nil, 'value contains unsupported keys or values' end
  local ok, encoded = pcall(json.encode, value, options)
  if not ok or type(encoded) ~= 'string' then return nil, tostring(encoded) end
  return encoded
end
