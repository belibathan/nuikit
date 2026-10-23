-- Pure rules of /nk test, shared by server.lua and the Lua tests (no natives in here).
NkDev = {}

NkDev.WHAT = {
  'notify', 'menu', 'input', 'confirm', 'progress', 'prompt', 'target', 'radial', 'challenge',
  'ox_notify', 'ox_progress', 'ox_input', 'ox_alert', 'ox_context', 'ox_menu', 'ox_skill', 'ox_textui', 'ox_radial',
  'all', 'items',
}
NkDev.ACE = 'command.nuikit'
NkDev.ITEMS_COOLDOWN_MS = 10000
NkDev.COMMAND_COOLDOWN_MS = 500

-- The item list is fixed here, never taken from the client.
NkDev.STOCK_ITEMS = { { name = 'water', count = 2 }, { name = 'burger', count = 2 } }

local known = {}
for _, w in ipairs(NkDev.WHAT) do known[w] = true end

-- state.last[source] = { any = ms, items = ms }. Returns ok, error message for the caller.
function NkDev.authorize(state, source, what, now, isAllowed)
  if type(source) ~= 'number' or source <= 0 then return false, 'run this in game' end
  if not isAllowed(source, NkDev.ACE) then return false, ('missing ace %s'):format(NkDev.ACE) end
  if type(what) ~= 'string' or not known[what] then return false, 'unknown test: ' .. tostring(what) end
  local last = state.last[source]
  if not last then last = {} state.last[source] = last end
  if last.any and now - last.any < NkDev.COMMAND_COOLDOWN_MS then return false, 'slow down' end
  if what == 'items' and last.items and now - last.items < NkDev.ITEMS_COOLDOWN_MS then
    return false, 'items were granted a moment ago, wait a few seconds'
  end
  last.any = now
  if what == 'items' then last.items = now end
  return true
end

-- The restart queue's resource names (server.lua runs `ensure <name>` for each): whitespace-separated
-- tokens that are whole resource names (letters, digits, _ and -, not starting with -), not this resource,
-- existing (exists(name)), de-duplicated, at most 32. Anything else in the file is ignored, so it can
-- never run another command.
function NkDev.queueNames(queue, self, exists)
  local out, seen = {}, {}
  if type(queue) ~= 'string' then return out end
  for token in queue:gmatch('%S+') do
    if #out >= 32 then break end
    if token:match('^[%w_][%w_%-]*$') and #token <= 64 and token ~= self and not seen[token] and exists(token) then
      seen[token] = true
      out[#out + 1] = token
    end
  end
  return out
end

-- The qbx_idcard item metadata, from the player's data (qbx_core PlayerData) or placeholders.
function NkDev.idCardMetadata(pd)
  pd = pd or {}
  local ci = pd.charinfo or {}
  local gender = ci.gender
  return {
    type = 'id_card',
    citizenid = pd.citizenid or 'TEST0001',
    firstname = ci.firstname or 'Test',
    lastname = ci.lastname or 'Citizen',
    birthdate = ci.birthdate or '1990-01-01',
    sex = (gender == 1 or gender == 'Female' or gender == 'F') and 'F' or 'M',
    nationality = ci.nationality or 'Los Santos',
  }
end

-- deps: invStarted() -> bool, canCarry(src, name, count) -> bool, add(src, name, count, metadata) -> bool,
-- playerData(src) -> table|nil, remove(src, name, count, metadata) -> bool (optional). Returns ok, message.
-- All or nothing: when one AddItem fails, what was already given is taken back.
function NkDev.grantItems(deps, source)
  if not deps.invStarted() then return false, 'ox_inventory is not started' end
  local list = { { name = 'id_card', count = 1, metadata = NkDev.idCardMetadata(deps.playerData(source)) } }
  for _, it in ipairs(NkDev.STOCK_ITEMS) do list[#list + 1] = it end
  for _, it in ipairs(list) do
    if not deps.canCarry(source, it.name, it.count) then return false, "can't carry " .. it.name end
  end
  local given = 0
  for _, it in ipairs(list) do
    if not deps.add(source, it.name, it.count, it.metadata) then
      local kept = given
      for i = given, 1, -1 do
        local back = list[i]
        if deps.remove and deps.remove(source, back.name, back.count, back.metadata) then kept = kept - 1 end
      end
      return false, ('could not add %s (%d of %d given, %d taken back)'):format(it.name, given, #list, given - kept)
    end
    given = given + 1
  end
  return true, ('gave %d items'):format(given)
end
