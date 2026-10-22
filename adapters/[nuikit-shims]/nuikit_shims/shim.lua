--[[
  Pure mapping for the export shims (no natives, no nk): turns one old-style call into intent props.
  Loaded by client.lua after config.lua; unit-tested in bench/adapters/replay/shims/.
]]
NkShim = {}

NkShim.INTENTS = {
  notify = true, menu = true, input = true, confirm = true, progress = true,
  prompt = true, target = true, radial = true, challenge = true,
}
-- Intents that wait for the player and hand back a result; the others return nothing.
NkShim.YIELDS = { menu = true, input = true, confirm = true, progress = true, target = true, radial = true, challenge = true }

--- Check an entry. Returns nil when usable, or the problem as a string.
function NkShim.check(e)
  if type(e) ~= 'table' then return 'entry is not a table' end
  if type(e.resource) ~= 'string' or e.resource == '' then return 'resource is required' end
  if type(e.export) ~= 'string' or e.export == '' then return 'export is required' end
  if not NkShim.INTENTS[e.intent] then return ("unknown intent '%s'"):format(tostring(e.intent)) end
  if e.args ~= nil and type(e.args) ~= 'table' then return 'args must be a list of prop names' end
  if e.transform ~= nil and type(e.transform) ~= 'function' then return 'transform must be a function' end
  if e.result ~= nil and type(e.result) ~= 'function' then return 'result must be a function' end
  return nil
end

--- The props for one call: transform(...) or args by position, then `map`, then `defaults` underneath.
function NkShim.props(e, ...)
  local props = {}
  if e.transform then
    props = e.transform(...)
    if type(props) ~= 'table' then error('transform must return a table of props', 0) end
  elseif e.args then
    local n = select('#', ...)
    local a = { ... }
    for i = 1, #e.args do
      if i <= n and a[i] ~= nil then props[e.args[i]] = a[i] end
    end
  end
  if e.map then
    for prop, values in pairs(e.map) do
      local v = props[prop]
      if v ~= nil and values[v] ~= nil then props[prop] = values[v] end
    end
  end
  if e.defaults then
    for k, v in pairs(e.defaults) do
      if props[k] == nil then props[k] = v end
    end
  end
  return props
end

--- Run one call against `nkLib`. Returns what the old export should return (the intent's result, shaped by `result`).
function NkShim.call(nkLib, e, ...)
  local props = NkShim.props(e, ...)
  local fn = nkLib[e.intent]
  if type(fn) ~= 'function' then error(("nk.%s is not available"):format(e.intent), 0) end
  if not NkShim.YIELDS[e.intent] then
    fn(props)
    return nil
  end
  local result, reason = fn(props)
  if e.result then return e.result(result, reason) end
  return result, reason
end
