--[[
  intents.lua: the intent API, `nk.notify` … `nk.challenge` (docs/intents.md).  MIT · https://github.com/belibathan/nuikit

  Loaded into every resource by @nuikit/init.lua after nuikit.lua. A script asks for an intent;
  the `nuikit` resource (systems/nuikit/client/intents.lua) owns the stack and draws it in its own
  frame with a renderer, themed and focused like every other nuikit surface.

    nk.notify({ title = 'Paid', description = '$500', status = 'success' })
    local choice = nk.menu({ title = 'Garage', items = { { label = 'Sultan' } } })  -- waits, like lib.*
    local ok = nk.progress({ label = 'Repairing', duration = 5000, cancel = true })
    local p = nk.prompt({ label = 'Open garage', keys = { 'E' } })  p:cancel()

  Every call validates its props against the schema (lib/intents.schema.lua, generated from
  packages/core/intents/*.json) and errors with the path of the first problem, so a typo fails at
  the call, not in the page.

  Yielding intents (menu, input, confirm, progress, target, radial, challenge) return the result,
  or nil plus a reason ('escape', 'close', 'back', 'submenu', 'timeout', 'cancel', 'stopped').
  Pass `{ cb = fn }` (or `async = true`) as the second argument to get the handle back at once
  instead; `on<Event>` keys in that table listen to the intent's events (`onChange`, `onSelect`).

  Wire (local events, both ways; the runtime checks the sender with GetInvokingResource):
    → nuikit   nuikit:intent:open (id, kind, props) · nuikit:intent:update (id, patch) · nuikit:intent:cancel (id, reason)
    ← nuikit   nuikit:intent:resolved (id, { result, reason, data }) · nuikit:intent:event (id, event, data)
]]

NUI = NUI or {}
local nk = NUI
local RESOURCE = GetCurrentResourceName()
local RUNTIME = 'nuikit'

-- ───────────────────────────────── schema

local function loadSchema()
  local src = LoadResourceFile and LoadResourceFile(RUNTIME, 'lib/intents.schema.lua')
  if not src then return nil end
  local fn = load(src, '@@nuikit/lib/intents.schema.lua', 't', _ENV)
  return fn and fn() or nil
end

local schema = loadSchema()
local KINDS = { 'notify', 'menu', 'input', 'confirm', 'progress', 'prompt', 'target', 'radial', 'challenge' }

-- ───────────────────────────────── validation (mirrors validateIntent in nuikit-core/intents)

local function isArray(t)
  local n = 0
  for _ in pairs(t) do n = n + 1 end
  return n == #t
end

local function typeName(v)
  local t = type(v)
  if t == 'table' then return isArray(v) and 'array' or 'table' end
  return t
end

local function describe(t)
  if t.type == 'ref' then return t.ref end
  if t.type == 'enum' then
    local parts = {}
    for i, v in ipairs(t.values) do parts[i] = ("'%s'"):format(v) end
    return table.concat(parts, ' | ')
  end
  if t.type == 'array' then return 'a list' end
  if t.type == 'object' then return 'a table' end
  return t.type
end

local check

local function fail(out, path, message)
  out[#out + 1] = { path = path, message = message }
  return false
end

check = function(t, v, path, self, out)
  local before = #out
  local ty = t.type
  if ty == 'any' then return true end
  if ty == 'ref' then return check(schema.defs[t.ref], v, path, self, out) end
  if ty == 'self' then
    if self then return check(self, v, path, self, out) end
    return true
  end
  if ty == 'string' then
    if type(v) ~= 'string' then return fail(out, path, ('expected a string, got %s'):format(typeName(v))) end
    if t.minLength and #v < t.minLength then return fail(out, path, ('at least %d characters'):format(t.minLength)) end
    if t.maxLength and #v > t.maxLength then return fail(out, path, ('at most %d characters'):format(t.maxLength)) end
    return true
  end
  if ty == 'number' or ty == 'integer' then
    if type(v) ~= 'number' or v ~= v or v == math.huge or v == -math.huge then return fail(out, path, ('expected a number, got %s'):format(typeName(v))) end
    if ty == 'integer' and math.floor(v) ~= v then return fail(out, path, ('expected a whole number, got %s'):format(tostring(v))) end
    if t.min and v < t.min then return fail(out, path, ('must be ≥ %s'):format(tostring(t.min))) end
    if t.max and v > t.max then return fail(out, path, ('must be ≤ %s'):format(tostring(t.max))) end
    return true
  end
  if ty == 'boolean' then
    if type(v) ~= 'boolean' then return fail(out, path, ('expected true or false, got %s'):format(typeName(v))) end
    return true
  end
  if ty == 'enum' then
    if type(v) == 'string' then
      for _, allowed in ipairs(t.values) do if allowed == v then return true end end
    end
    return fail(out, path, ('expected one of %s, got %s'):format(table.concat(t.values, ', '), type(v) == 'string' and ('"%s"'):format(v) or tostring(v)))
  end
  if ty == 'oneOf' then
    for _, alt in ipairs(t.of) do
      if check(alt, v, path, self, {}) then return true end
    end
    local names = {}
    for i, alt in ipairs(t.of) do names[i] = describe(alt) end
    return fail(out, path, ('expected %s, got %s'):format(table.concat(names, ' or '), typeName(v)))
  end
  if ty == 'array' then
    if type(v) ~= 'table' or not isArray(v) then return fail(out, path, ('expected a list, got %s'):format(typeName(v))) end
    if t.minItems and #v < t.minItems then fail(out, path, ('needs at least %d %s'):format(t.minItems, t.minItems == 1 and 'entry' or 'entries')) end
    if t.maxItems and #v > t.maxItems then fail(out, path, ('at most %d entries'):format(t.maxItems)) end
    for i, item in ipairs(v) do check(t.items, item, ('%s[%d]'):format(path, i), self, out) end
    return #out == before
  end
  if ty == 'object' then
    if type(v) ~= 'table' or (next(v) ~= nil and isArray(v)) then return fail(out, path, ('expected a table, got %s'):format(typeName(v))) end
    local nextSelf = self
    if t.props and next(t.props) ~= nil then nextSelf = t end
    for key, prop in pairs(t.props or {}) do
      local child = path == '' and key or (path .. '.' .. key)
      local value = v[key]
      if value == nil then
        if prop.required then out[#out + 1] = { path = child, message = 'is required' } end
      else
        check(prop, value, child, nextSelf, out)
      end
    end
    -- Unknown keys pass: schemas are supersets and adapters carry library fields through.
    return #out == before
  end
  return true
end

--- Validate props for an intent. Returns a list of { path, message } (empty when valid).
---@param kind string
---@param props any
---@return { path: string, message: string }[]
local function validate(kind, props)
  if not schema then return {} end
  local def = schema.intents[kind]
  if not def then return { { path = '', message = ('unknown intent "%s" (one of %s)'):format(tostring(kind), table.concat(KINDS, ', ')) } } end
  local out = {}
  check({ type = 'object', props = def.props }, props, '', nil, out)
  -- Stable order: the schema's own key order is not, so sort by path for readable errors.
  table.sort(out, function(a, b) return a.path < b.path end)
  return out
end

-- ───────────────────────────────── normalisation (what the Lua API accepts on top of the schema)

local STATUS = { info = 'info', inform = 'info', primary = 'info', default = 'info', success = 'success', warning = 'warning', warn = 'warning', error = 'error', danger = 'error', destructive = 'error' }

local function normalize(kind, props)
  if kind == 'notify' then
    if type(props) == 'string' then props = { title = props } end
    if type(props) == 'table' then
      -- ox / qb words: `type` is `status`, and their aliases.
      local s = props.status or props.type
      if type(s) == 'string' and STATUS[s:lower()] then props.status = STATUS[s:lower()] end
      props.type = nil
      if props.duration == 0 then props.duration = nil end
    end
  elseif kind == 'prompt' then
    if type(props) == 'string' then props = { label = props } end
    if type(props) == 'table' and props.label == nil and props.text then props.label, props.text = props.text, nil end
    if type(props) == 'table' and props.keys == nil and type(props.label) == 'string' then
      -- "[E] Open garage" → keys { 'E' }, label "Open garage" (ox showTextUI / qb DrawText habit)
      local key, rest = props.label:match('^%s*%[([^%]]+)%]%s*(.-)%s*$')
      if key and rest ~= '' then props.keys, props.label = { key }, rest end
    end
  elseif kind == 'progress' then
    if type(props) == 'number' then props = { duration = props } end
  elseif kind == 'confirm' then
    if type(props) == 'string' then props = { title = props } end
  elseif kind == 'challenge' then
    if type(props) == 'string' or (type(props) == 'table' and props.difficulty == nil and (props[1] ~= nil or props.areaSize)) then
      props = { difficulty = props }
    end
  end
  return props
end

-- Functions never go on the wire: lift `on<Event>` and `cb` out of the second argument.
local function split(opts)
  local handlers, async = {}, false
  if type(opts) == 'table' then
    for k, v in pairs(opts) do
      if k == 'cb' and type(v) == 'function' then handlers.resolve = v; async = true
      elseif k == 'async' then async = async or v == true
      elseif type(k) == 'string' and type(v) == 'function' and k:sub(1, 2) == 'on' and #k > 2 then
        handlers[k:sub(3, 3):lower() .. k:sub(4)] = v
      end
    end
  elseif type(opts) == 'function' then
    handlers.resolve = opts; async = true
  end
  return handlers, async
end

-- ───────────────────────────────── the handle

local pending = {} -- id → { kind, handlers, promise, result }
local counter = 0

---@class NkIntent
---@field id string
---@field kind string
local Intent = {}
Intent.__index = Intent

--- Change what's shown (notify, menu, progress, prompt, target, radial). Keys you don't pass keep their value.
---@param patch table
function Intent:update(patch)
  if type(patch) ~= 'table' or not pending[self.id] then return self end
  local issues = validate(self.kind, patch)
  -- A patch never carries the required keys: only report real type problems.
  for _, issue in ipairs(issues) do
    if issue.message ~= 'is required' then error(('nk.%s update: %s %s'):format(self.kind, issue.path, issue.message), 2) end
  end
  TriggerEvent('nuikit:intent:update', self.id, patch)
  return self
end

--- End it from the script (yielding calls return nil, 'cancel'). Safe when already over.
---@param reason? string
function Intent:cancel(reason)
  if not pending[self.id] then return end
  TriggerEvent('nuikit:intent:cancel', self.id, reason or 'cancel')
end

--- Listen to an event of this intent (menu 'change', radial 'select', …).
---@param event string
---@param fn fun(data: any)
function Intent:on(event, fn)
  local p = pending[self.id]
  if p then p.handlers[event] = fn end
  return self
end

--- Wait for the result (from a Citizen thread).
function Intent:await()
  local p = pending[self.id]
  if not p then return self.result, self.reason end
  if not p.promise then
    if not promise then error('nk: Citizen.Await is not available here; pass { cb = fn } instead', 2) end
    p.promise = promise.new()
  end
  local r = Citizen.Await(p.promise)
  return r.result, r.reason, r.data
end

--- Still open?
function Intent:isOpen()
  return pending[self.id] ~= nil
end

local function finish(id, result, reason, data)
  local p = pending[id]
  if not p then return end
  pending[id] = nil
  p.handle.result, p.handle.reason = result, reason
  if p.handlers.resolve then
    local ok, err = pcall(p.handlers.resolve, result, reason, data)
    if not ok then print(('^1[nuikit] %s callback failed:^7 %s'):format(p.kind, tostring(err))) end
  end
  if p.promise then p.promise:resolve({ result = result, reason = reason, data = data }) end
end

nk.intents = {}

--- Validate without opening. Returns the issues (empty when valid).
nk.intents.validate = validate

--- Open an intent. Returns the handle; `opts` as described at the top of this file.
---@param kind string
---@param props table
---@param opts? table|fun(result: any, reason: string?)
---@return NkIntent
function nk.intents.open(kind, props, opts)
  props = normalize(kind, props)
  if type(props) ~= 'table' then error(('nk.%s: expected a table of props, got %s'):format(tostring(kind), type(props)), 3) end
  local issues = validate(kind, props)
  if #issues > 0 then
    local first = issues[1]
    error(('nk.%s: %s%s (%d problem%s)'):format(kind, first.path ~= '' and (first.path .. ' ') or '', first.message, #issues, #issues == 1 and '' or 's'), 3)
  end
  if GetResourceState and GetResourceState(RUNTIME) ~= 'started' then
    print(('^3[nuikit:%s] nk.%s dropped: the nuikit resource is not started^7'):format(RESOURCE, kind))
    return setmetatable({ id = '', kind = kind, reason = 'stopped' }, Intent)
  end
  local handlers, async = split(opts)
  counter = counter + 1
  local id = ('%s#%d'):format(RESOURCE, counter)
  if type(props.id) == 'string' and props.id ~= '' then
    -- A caller-chosen id (ox menu ids, de-duped toasts): the same id replaces the open one.
    id = ('%s#%s'):format(RESOURCE, props.id)
    if pending[id] then finish(id, nil, 'replaced') end
  end
  local handle = setmetatable({ id = id, kind = kind }, Intent)
  pending[id] = { kind = kind, handlers = handlers, handle = handle, async = async }
  TriggerEvent('nuikit:intent:open', id, kind, props)
  return handle
end

--- Cancel every open intent of this resource (of one kind when given).
---@param kind? string
function nk.intents.cancelAll(kind)
  for id, p in pairs(pending) do
    if not kind or p.kind == kind then TriggerEvent('nuikit:intent:cancel', id, 'cancel') end
  end
end

--- The resource's open intents.
---@return NkIntent[]
function nk.intents.list()
  local list = {}
  for _, p in pairs(pending) do list[#list + 1] = p.handle end
  return list
end

local function yielding(kind)
  return function(props, opts)
    local handle = nk.intents.open(kind, props, opts)
    if handle.id == '' then return nil, 'stopped' end
    local p = pending[handle.id]
    if p.async then return handle end
    return handle:await()
  end
end

local function fire(kind)
  return function(props, opts)
    return nk.intents.open(kind, props, opts)
  end
end

--- Show a toast. `nk.notify('Saved')` or the full props (NkNotifyProps). Returns the handle (update / cancel).
---@param props NkNotifyProps|string
---@return NkIntent
nk.notify = fire('notify')

--- A context or list menu. Waits and returns NkMenuResult, or nil and a reason.
---@param props NkMenuProps
---@param opts? table
---@return NkMenuResult|nil, string|nil
nk.menu = yielding('menu')

--- A form. Waits and returns NkInputResult (values in field order, byId), or nil on cancel.
---@param props NkInputProps
---@param opts? table
---@return NkInputResult|nil, string|nil
nk.input = yielding('input')

--- An alert. Waits and returns 'confirm' or 'cancel'.
---@param props NkConfirmProps|string
---@param opts? table
---@return NkConfirmResult|nil, string|nil
nk.confirm = yielding('confirm')

--- A timed bar or ring. Waits and returns true when it ran out, false when cancelled.
---@param props NkProgressProps|integer
---@param opts? table
---@return boolean|nil, string|nil
nk.progress = yielding('progress')

--- A key hint that stays until cancelled: `local p = nk.prompt('[E] Open garage')  p:cancel()`.
--- `nk.prompt()` with no props hides every prompt of this resource.
---@param props? NkPromptProps|string
---@return NkIntent|nil
function nk.prompt(props, opts)
  if props == nil or props == false then nk.intents.cancelAll('prompt') return nil end
  return nk.intents.open('prompt', props, opts)
end

--- Options on the target under the crosshair (the targeting library drives it). Waits for the choice.
---@param props NkTargetProps
---@param opts? table
---@return NkTargetResult|nil, string|nil
nk.target = yielding('target')

--- A radial menu. Waits and returns NkRadialResult, or nil when closed.
---@param props NkRadialProps
---@param opts? table
---@return NkRadialResult|nil, string|nil
nk.radial = yielding('radial')

--- A skill check. Waits and returns true when every round passed.
---@param props? NkChallengeProps|NkDifficulty|NkDifficulty[]
---@param opts? table
---@return boolean|nil, string|nil
nk.challenge = yielding('challenge')

--- Sugar, as lib.* has them.
function nk.hidePrompt() nk.intents.cancelAll('prompt') end
function nk.cancelProgress() nk.intents.cancelAll('progress') end
function nk.closeMenu() nk.intents.cancelAll('menu') end

-- ───────────────────────────────── from the runtime

local function fromRuntime()
  local from = GetInvokingResource and GetInvokingResource()
  return from == nil or from == RUNTIME or from == RESOURCE
end

AddEventHandler('nuikit:intent:resolved', function(id, r)
  if not pending[id] or not fromRuntime() then return end
  r = type(r) == 'table' and r or {}
  finish(id, r.result, r.reason, r.data)
end)

AddEventHandler('nuikit:intent:event', function(id, event, data)
  local p = pending[id]
  if not p or not fromRuntime() then return end
  local fn = p.handlers[event]
  if fn then
    local ok, err = pcall(fn, data)
    if not ok then print(('^1[nuikit] %s on%s failed:^7 %s'):format(p.kind, event, tostring(err))) end
  end
end)

-- The runtime stopped: nothing will answer. Resolve everything as stopped so threads don't hang.
AddEventHandler('onClientResourceStop', function(resource)
  if resource ~= RUNTIME or RESOURCE == RUNTIME then return end
  for id in pairs(pending) do finish(id, nil, 'stopped') end
end)

return nk
