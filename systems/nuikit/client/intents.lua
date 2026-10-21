--[[
  nuikit (client): the intent runtime (docs/intents.md §3). Loaded after lib/nuikit.lua and lib/intents.lua.

  Every resource's nk.notify / nk.menu / … lands here (local events, sender = GetInvokingResource()).
  This resource owns the one stack, draws each intent in its own frame (web/, the renderers) and
  takes focus for the ones that need it through surfaces, so Escape, the cursor and stacking are
  the same for an intent as for any other nuikit UI.

  Frame ⇄ Lua
    → page   nuikit:intent { op = 'open', intent } | { op = 'update', id, props } | { op = 'cancel', id, reason } | { op = 'sync', intents }
    ← page   nuikit:intent:resolve { id, result?, reason?, data? } · nuikit:intent:event { id, event, data } · nuikit:intent:sync {}

  Other languages: exports.nuikit:intent(kind, props, cb?) → id · exports.nuikit:intentUpdate(id, patch)
  · exports.nuikit:intentCancel(id, reason?) · exports.nuikit:notify(props) and the other eight by name.
]]

local RESOURCE = GetCurrentResourceName()
local debug = GetConvarInt('nuikit_debug', 0) == 1

local function log(...)
  if debug then print('^5[nuikit:intents]^7', ...) end
end

local open = {}   -- id → { id, kind, resource, props, seq, at, surface }
local seq = 0
local count = {}  -- surface name → open intents using it

-- ───────────────────────────────── surfaces (what takes input)

-- Each kind that needs focus gets a surface; Escape comes back as nuikit:back with the surface's
-- name, and the frame lets the top intent of that kind decide (a menu with canClose = false ignores it).
local SURFACES = {
  ['intent:menu'] = { layer = 'panel', input = 'full', escape = 'back' },
  ['intent:menu:cursor'] = { layer = 'panel', input = 'cursor', escape = 'back' },
  ['intent:menu:keyboard'] = { layer = 'panel', input = 'keyboard', keepInput = true, escape = 'back' },
  ['intent:input'] = { layer = 'modal', input = 'full', escape = 'back' },
  ['intent:confirm'] = { layer = 'modal', input = 'full', escape = 'back' },
  ['intent:target'] = { layer = 'panel', input = 'full', keepInput = true, escape = 'back' },
  ['intent:radial'] = { layer = 'panel', input = 'full', keepInput = true, escape = 'back' },
  ['intent:challenge'] = { layer = 'panel', input = 'keyboard', escape = 'ignore' },
}
local surfaces = {}
for name, opts in pairs(SURFACES) do surfaces[name] = NUI.surface(name, opts) end

--- The surface an intent needs, or nil (notify, prompt, progress draw over the game without focus).
local function surfaceFor(kind, props)
  if kind == 'menu' then
    local input = props.input
    if input == 'cursor' then return 'intent:menu:cursor' end
    if input == 'keyboard' then return 'intent:menu:keyboard' end
    return 'intent:menu'
  end
  if kind == 'target' then return props.open == true and 'intent:target' or nil end
  if kind == 'input' or kind == 'confirm' or kind == 'radial' or kind == 'challenge' then return 'intent:' .. kind end
  return nil
end

local function take(name)
  if not name then return end
  count[name] = (count[name] or 0) + 1
  if count[name] == 1 then surfaces[name]:open() end
end

local function release(name)
  if not name or not count[name] then return end
  count[name] = count[name] - 1
  if count[name] <= 0 then
    count[name] = nil
    surfaces[name]:close()
  end
end

-- ───────────────────────────────── the stack

local function send(payload)
  NUI.send('nuikit:intent', payload)
end

local function entry(it)
  return { id = it.id, kind = it.kind, resource = it.resource, props = it.props, seq = it.seq, at = it.at }
end

local function caller()
  return GetInvokingResource() or RESOURCE
end

local function openIntent(resource, id, kind, props)
  if type(id) ~= 'string' or type(kind) ~= 'string' or type(props) ~= 'table' then return nil end
  local issues = NUI.intents.validate(kind, props)
  if #issues > 0 then
    print(('^1[nuikit] %s asked for an invalid %s: %s %s^7'):format(resource, kind, issues[1].path, issues[1].message))
    return nil
  end
  local prev = open[id]
  if prev then
    -- Same id again (a de-duped toast, a menu re-shown): replace in place, keep its place in the stack.
    release(prev.surface)
    seq = seq + 1
  else
    seq = seq + 1
  end
  local it = { id = id, kind = kind, resource = resource, props = props, seq = seq, at = GetGameTimer(), surface = surfaceFor(kind, props) }
  open[id] = it
  take(it.surface)
  log('open', id, kind)
  send({ op = 'open', intent = entry(it) })
  return id
end

local function closeIntent(it, result, reason, data, notify)
  open[it.id] = nil
  release(it.surface)
  log('close', it.id, reason or 'resolved')
  if notify == false then return end
  TriggerEvent('nuikit:intent:resolved', it.id, { result = result, reason = reason, data = data })
  if it.cb then -- opened through an export: its callback instead of the event path
    local ok, err = pcall(it.cb, result, reason, data)
    if not ok then print(('^1[nuikit] export callback failed:^7 %s'):format(tostring(err))) end
  end
end

local function updateIntent(it, patch)
  if type(patch) ~= 'table' then return end
  for k, v in pairs(patch) do it.props[k] = v end
  local s = surfaceFor(it.kind, it.props)
  if s ~= it.surface then
    release(it.surface)
    it.surface = s
    take(s)
  end
  send({ op = 'update', id = it.id, props = patch })
end

local function cancelIntent(it, reason)
  send({ op = 'cancel', id = it.id, reason = reason })
  closeIntent(it, nil, reason or 'cancel')
end

-- ───────────────────────────────── from other resources (nk.*)

AddEventHandler('nuikit:intent:open', function(id, kind, props)
  openIntent(caller(), id, kind, props)
end)

AddEventHandler('nuikit:intent:update', function(id, patch)
  local it = open[id]
  if it and it.resource == caller() then updateIntent(it, patch) end
end)

AddEventHandler('nuikit:intent:cancel', function(id, reason)
  local it = open[id]
  if it and it.resource == caller() then cancelIntent(it, reason) end
end)

local function stack()
  local list = {}
  for _, it in pairs(open) do list[#list + 1] = it end
  table.sort(list, function(a, b) return a.seq < b.seq end)
  return list
end

-- A resource stopped: its intents go with it (no one is left to answer).
AddEventHandler('onClientResourceStop', function(resource)
  for _, it in ipairs(stack()) do
    if it.resource == resource then
      send({ op = 'cancel', id = it.id, reason = 'stopped' })
      closeIntent(it, nil, 'stopped', nil, false)
    end
  end
end)

-- ───────────────────────────────── from the frame

NUI.on('nuikit:intent:resolve', function(req)
  local it = type(req) == 'table' and open[req.id]
  if not it then return { ok = false } end
  closeIntent(it, req.result, req.reason, req.data)
  return { ok = true }
end)

NUI.on('nuikit:intent:event', function(req)
  local it = type(req) == 'table' and open[req.id]
  if not it then return { ok = false } end
  TriggerEvent('nuikit:intent:event', it.id, req.event, req.data)
  return { ok = true }
end)

-- The page (re)loaded: give it the whole stack.
NUI.on('nuikit:intent:sync', function()
  local list = {}
  for i, it in ipairs(stack()) do list[i] = entry(it) end
  send({ op = 'sync', intents = list })
  return { ok = true, count = #list }
end)

-- ───────────────────────────────── cancel key (progress with cancel = true)

-- The page has no keyboard focus during a progress bar, so the runtime reads the key (ox_lib binds
-- X the same way). Cancels the newest cancellable progress; the caller's call returns false.
RegisterCommand('nuikit_cancel', function()
  local top
  for _, it in pairs(open) do
    if it.kind == 'progress' and it.props.cancel == true and (not top or it.seq > top.seq) then top = it end
  end
  if top then cancelIntent(top, 'cancel') end
end, false)
if RegisterKeyMapping then RegisterKeyMapping('nuikit_cancel', 'Cancel the current action', 'keyboard', 'x') end

-- ───────────────────────────────── exports (any language)

--- Open an intent for the calling resource. `cb(result, reason, data)` runs when it ends.
---@param kind string
---@param props table
---@param cb? fun(result: any, reason: string|nil, data: any)
---@return string|nil id
local exportSeq = 0
local function exportOpen(kind, props, cb)
  local resource = caller()
  exportSeq = exportSeq + 1
  local id = ('%s#x%d'):format(resource, exportSeq)
  if type(props) == 'table' and type(props.id) == 'string' then id = ('%s#%s'):format(resource, props.id) end
  if not openIntent(resource, id, kind, props) then return nil end
  if type(cb) == 'function' then open[id].cb = cb end
  return id
end

exports('intent', exportOpen)
exports('intentUpdate', function(id, patch)
  local it = open[id]
  if it and it.resource == caller() then updateIntent(it, patch) end
end)
exports('intentCancel', function(id, reason)
  local it = open[id]
  if it and it.resource == caller() then cancelIntent(it, reason) end
end)
for _, kind in ipairs({ 'notify', 'menu', 'input', 'confirm', 'progress', 'prompt', 'target', 'radial', 'challenge' }) do
  exports(kind, function(props, cb) return exportOpen(kind, props, cb) end)
end

--- Open intents, for tooling and the doctor.
function NUI.intents.stack()
  local list = {}
  for i, it in ipairs(stack()) do list[i] = entry(it) end
  return list
end
