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

local open = {}   -- id → { id, kind, resource, props, seq, at, surface, cb?, page? }
local seq = 0
local exportSeq = 0 -- ids for intents opened through exports or the page callback
local count = {}  -- surface name → open intents using it
local pageEvent, pageClosed -- ox routing additions (defined with the page door below)

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
    if props.focus == false then return nil end -- a preview: drawn, never focused
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

--- Open an intent. Returns the id, or nil and a reason ('invalid', 'busy').
local function openIntent(resource, id, kind, props)
  if type(id) ~= 'string' or type(kind) ~= 'string' or type(props) ~= 'table' then return nil, 'invalid' end
  local issues = NUI.intents.validate(kind, props)
  if #issues > 0 then
    print(('^1[nuikit] %s asked for an invalid %s: %s %s^7'):format(resource, kind, issues[1].path, issues[1].message))
    return nil, 'invalid'
  end
  local prev = open[id]
  if kind == 'progress' and not prev then
    -- One progress at a time (every library's rule): a second one is refused, not queued.
    for _, other in pairs(open) do
      if other.kind == 'progress' then return nil, 'busy' end
    end
  end
  if prev then
    -- Same id again (a de-duped toast, a menu re-shown): replace in place, keep its place in the stack.
    release(prev.surface)
  end
  seq = seq + 1
  local it = { id = id, kind = kind, resource = resource, props = props, seq = seq, at = GetGameTimer(), surface = surfaceFor(kind, props) }
  open[id] = it
  take(it.surface)
  log('open', id, kind)
  send({ op = 'open', intent = entry(it) })
  -- One event per drawn intent: the doctor counts them by source (docs/architecture.md §6).
  TriggerEvent('nuikit:intent', { source = resource, intent = kind, id = id })
  TriggerServerEvent('nuikit:intent', { source = resource, intent = kind })
  return id
end

local function closeIntent(it, result, reason, data, notify)
  open[it.id] = nil
  release(it.surface)
  log('close', it.id, reason or 'resolved')
  if it.page and pageClosed then pageClosed(it.id) end -- ox routing: a listening page hears `ended`
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
  local ok, reason = openIntent(caller(), id, kind, props)
  -- Refused: answer at once so a waiting script gets nil + the reason instead of hanging.
  if not ok and type(id) == 'string' then TriggerEvent('nuikit:intent:resolved', id, { reason = reason }) end
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
  if it.page and pageEvent then pageEvent(it, req.event, req.data) end -- ox routing: queued for the page
  return { ok = true }
end)

-- The page (re)loaded: give it the whole stack.
NUI.on('nuikit:intent:sync', function()
  local list = {}
  for i, it in ipairs(stack()) do list[i] = entry(it) end
  send({ op = 'sync', intents = list })
  return { ok = true, count = #list }
end)

-- ───────────────────────────────── from another resource's page (override routing, architecture §3.3)
--
-- An override page (ox_lib's, qb-core's) that lives in another resource posts its intents here:
--   POST https://nuikit/intent  { intent = 'notify', props = {…}, source = 'ox_lib', id? }
--     → { id } at once for fire-and-forget kinds; for yielding kinds the fetch is answered when the
--       intent ends: { id, result?, reason?, data? }  (the page relays it to its own Lua)
--   POST https://nuikit/intent  { update = '<id>', props = {…} } · { cancel = '<id>', reason? }
-- The page cannot be trusted for `source`: it is recorded as 'page:<source>' for the doctor and
-- never grants the rights of that resource (its own Lua can't update or cancel these ids).
-- Unproven in game: whether a page may fetch another resource's callback (spike checklist step 8).

local pagePending = {} -- id → { cb, at }
local PAGE_TIMEOUT = 120000

-- ── ox routing additions (docs/adapters/ox-lib.md §2; feat/ox-routing) ───────────────────────────
--   POST { probe = true, source = 'ox_lib' } → { ok = true, route = <bool> }: is routing on for that
--     page? Convar `nuikit_ox_route` (default 1) for ox_lib, `nuikit_route_<source>` for any other.
--     An older runtime answers { error = 'invalid' }, which the page reads as "unknown": draw locally.
--   POST { listen = '<id>' } → a long-poll for the intent's events (menu change / scroll / check /
--     select…): answered with { id, events = { { event, data }, … } } as soon as one is queued, with
--     { id, ended = true } when the intent has closed, or with { id, events = {} } after ≤ 25 s so the
--     page asks again. One listener per id; the page keeps one open while its intent is.
--   A page id opened again while its fetch is pending answers that fetch { id, reason = 'replaced' }.
--   The sweep answers only pending fetches whose intent is already gone (a menu may stay open for
--   longer than PAGE_TIMEOUT). When this resource stops, every pending fetch gets reason 'stopped'.
local pageEvents = {}   -- id → { queue = { {event, data}, … }, cb?, token }
local LISTEN_TIMEOUT = 25000

local function routeEnabled(source)
  local convar = source == 'ox_lib' and 'nuikit_ox_route' or ('nuikit_route_%s'):format(tostring(source))
  return GetConvarInt(convar, 1) == 1
end

local function answerListener(id, payload)
  local l = pageEvents[id]
  if not (l and l.cb) then return false end
  local cb = l.cb
  l.cb = nil
  l.token = (l.token or 0) + 1
  cb(payload)
  return true
end

--- A page intent emitted an event: queue it, and answer a waiting listener.
function pageEvent(it, event, data)
  local l = pageEvents[it.id]
  if not l then
    l = { queue = {}, token = 0 }
    pageEvents[it.id] = l
  end
  l.queue[#l.queue + 1] = { event = event, data = data }
  if l.cb then
    local events = l.queue
    l.queue = {}
    answerListener(it.id, { id = it.id, events = events })
  end
end

--- A page intent closed: its listener (now or when it next asks) hears `ended`.
function pageClosed(id)
  answerListener(id, { id = id, ended = true })
  pageEvents[id] = nil
end

local function answerPending(id, payload)
  local p = pagePending[id]
  if not p then return end
  pagePending[id] = nil
  p.cb(payload)
end

local function listen(id, cb)
  if not open[id] or not open[id].page then return cb({ id = id, ended = true }) end
  local l = pageEvents[id]
  if not l then
    l = { queue = {}, token = 0 }
    pageEvents[id] = l
  end
  if #l.queue > 0 then
    local events = l.queue
    l.queue = {}
    return cb({ id = id, events = events })
  end
  -- a second listener replaces the first (the page reloaded): the first is answered empty
  answerListener(id, { id = id, events = {} })
  l.cb = cb
  local token = l.token
  SetTimeout(LISTEN_TIMEOUT, function()
    local cur = pageEvents[id]
    if cur and cur.cb == cb and cur.token == token then answerListener(id, { id = id, events = {} }) end
  end)
end

AddEventHandler('onClientResourceStop', function(resource)
  if resource ~= RESOURCE then return end
  for id in pairs(pagePending) do answerPending(id, { id = id, reason = 'stopped' }) end
  for id in pairs(pageEvents) do pageClosed(id) end
end)
-- ── end of the ox routing additions (the handler below uses them where marked) ──────────────────

RegisterNUICallback('intent', function(data, cb)
  data = type(data) == 'table' and data or {}
  if data.probe then return cb({ ok = true, route = routeEnabled(data.source) }) end            -- ox routing
  if type(data.listen) == 'string' then return listen(data.listen, cb) end                     -- ox routing
  if type(data.cancel) == 'string' then
    local it = open[data.cancel]
    if it and it.page then cancelIntent(it, data.reason) end
    return cb({ ok = it ~= nil })
  end
  if type(data.update) == 'string' then
    local it = open[data.update]
    if it and it.page then updateIntent(it, data.props) end
    return cb({ ok = it ~= nil })
  end
  local source = ('page:%s'):format(type(data.source) == 'string' and data.source or 'unknown')
  exportSeq = exportSeq + 1
  local id = type(data.id) == 'string' and ('%s#%s'):format(source, data.id) or ('%s#p%d'):format(source, exportSeq)
  if open[id] and open[id].page then answerPending(id, { id = id, reason = 'replaced' }) end  -- ox routing
  local ok, reason = openIntent(source, id, data.intent, data.props)
  if not ok then return cb({ error = reason }) end
  open[id].page = true
  local def = NUI.intents.schema and NUI.intents.schema.intents[data.intent]
  if not (def and def.yields) then return cb({ id = id }) end
  local now = GetGameTimer()
  for pid, p in pairs(pagePending) do
    if now - p.at > PAGE_TIMEOUT and not open[pid] then                                       -- ox routing: only when the intent is gone
      pagePending[pid] = nil
      p.cb({ id = pid, error = 'timed out' })
    end
  end
  pagePending[id] = { cb = cb, at = now }
  open[id].cb = function(result, why, extra)
    local p = pagePending[id]
    if not p then return end
    pagePending[id] = nil
    p.cb({ id = id, result = result, reason = why, data = extra })
  end
end)

-- ───────────────────────────────── cancel key (progress with cancel = true)

-- The page has no keyboard focus during a progress bar, so the runtime reads the key (ox_lib binds
-- X the same way). Cancels the newest cancellable progress; the caller's call returns false.
-- The default key is X (decisions #2): convar nuikit_cancel_key picks another, empty leaves it unbound.
-- Either way players rebind it in GTA's key settings (FiveM). Declared through nk.keys so Settings lists it;
-- `command` keeps the name players already bound.
NUI.keys.define({
  id = 'cancel', command = 'nuikit_cancel', label = 'Cancel the current action', mapper = 'keyboard',
  key = GetConvar('nuikit_cancel_key', 'x'),
  onPress = function()
    local top
    for _, it in pairs(open) do
      if it.kind == 'progress' and it.props.cancel == true and (not top or it.seq > top.seq) then top = it end
    end
    if top then cancelIntent(top, 'cancel') end
  end,
})

-- ───────────────────────────────── exports (any language)

--- Open an intent for the calling resource. `cb(result, reason, data)` runs when it ends.
---@param kind string
---@param props table
---@param cb? fun(result: any, reason: string|nil, data: any)
---@return string|nil id
local function exportOpen(kind, props, cb)
  local resource = caller()
  exportSeq = exportSeq + 1
  local id = ('%s#x%d'):format(resource, exportSeq)
  if type(props) == 'table' and type(props.id) == 'string' then id = ('%s#%s'):format(resource, props.id) end
  local ok, reason = openIntent(resource, id, kind, props)
  if not ok then return nil, reason end
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
