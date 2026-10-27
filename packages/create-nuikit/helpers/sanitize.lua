--[[
  Config and input cleaning: type-check, trim, clamp, allowlist, with a default when it fails.
  Side: shared. Load from fxmanifest (shared_scripts).
  From fivem-foundation (upstream/examples/helpers/sanitize.lua, MIT), STANDARDS §9.
]]

-- GLOBAL: helper table, shared by every file of this resource
Sanitize = Sanitize or {}

--- Trim whitespace.
--- @param value string
--- @return string
function Sanitize.trim(value)
  assert(type(value) == 'string', 'value must be a string')
  return value:match('^%s*(.-)%s*$') or ''
end

--- The value when it has `expectedType` (a non-empty string, a finite number), else `default`.
--- @param value any
--- @param expectedType string
--- @param default any
--- @return any
function Sanitize.value(value, expectedType, default)
  assert(type(expectedType) == 'string', 'expectedType must be a string')

  if value == nil then return default end
  if type(value) ~= expectedType then return default end

  if expectedType == 'string' then
    value = Sanitize.trim(value)
    if value == '' then return default end
  end

  if expectedType == 'number' then
    if value ~= value or value == math.huge or value == -math.huge then return default end
  end

  return value
end

--- A number clamped to [min, max]; `default` (or `min`) when it is not a finite number.
--- @param value any
--- @param min number
--- @param max number
--- @param default? number
--- @return number
function Sanitize.numberRange(value, min, max, default)
  value = Sanitize.value(value, 'number', default or min)
  if value < min then return min end
  if value > max then return max end
  return value
end

--- The value when it is in `allowlist`, else `default`.
--- @param value any
--- @param allowlist table
--- @param default any
--- @return any
function Sanitize.allowlist(value, allowlist, default)
  assert(type(allowlist) == 'table', 'allowlist must be a table')
  for _, allowed in ipairs(allowlist) do
    if value == allowed then return value end
  end
  return default
end
