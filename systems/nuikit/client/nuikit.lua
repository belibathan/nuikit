--[[
  nuikit.lua: the Lua half of nuikit.  MIT · https://github.com/belibathan/nuikit

  Drop into any resource as a client_script. Framework-agnostic (QBCore, Qbox, ESX, ox, standalone).

  Messages
    NUI.send('hud:vitals', { health = 80 })           -- Lua → UI   (useNuiEvent / onNui)
    NUI.on('inventory:use', function(data)             -- UI → Lua  (fetchNui)
      return { ok = UseItem(data.slot) }               --   whatever you return is the response
    end)
    NUI.notify({ title = 'Paid', type = 'success' })   -- toast (with <NuiToaster />)

  Surfaces: every piece of UI declares what it is; nuikit owns focus, cursor, stacking and Escape
  across *all* resources that use nuikit, so two UIs never fight over the cursor.
    local inv = NUI.surface('inventory', { layer = 'panel', input = 'full', exclusive = true, hides = { 'hud' } })
    inv:open({ items = GetItems() })                   -- <Surface name="inventory"> / useSurface('inventory')
    inv:close()
    NUI.state('dead', true)                            -- surfaces with blockedBy = { 'dead' } refuse to open

  Simple mode (one UI, no surfaces): NUI.open() / NUI.close() / NUI.toggle(), as before.
]]

NUI = NUI or {}

local RESOURCE = GetCurrentResourceName()
local debug = GetConvarInt('nuikit_debug', 0) == 1

local function log(...)
  if debug then print(('^5[nuikit:%s]^7'):format(RESOURCE), ...) end
end

-- ───────────────────────────────── messages

--- Send a message to the UI. Arrives as `{ action, data }`.
--- While the nuikit host renders this resource's module (docs/host.md), it goes through the host.
---@param action string
---@param data? any
function NUI.send(action, data)
  log('→ ui', action)
  if NUI.hosted then
    TriggerEvent('nuikit:host:send', action, data)
  else
    SendNUIMessage({ action = action, data = data })
  end
end

-- Every NUI callback this resource registers, so the host can forward a hosted module's calls
-- to it (raw RegisterNUICallback handlers included). nuikit.lua must load before them.
local nuiCallbacks = {}
local registerNUICallback = RegisterNUICallback
RegisterNUICallback = function(name, fn)
  nuiCallbacks[name] = fn
  return registerNUICallback(name, fn)
end

--- Handle a fetchNui call from the UI. Return a table (or nothing) as the response.
--- Errors are caught and returned as `{ error = message }`, which fetchNui throws as NuiError.
---@param name string
---@param handler fun(data: table): table|nil
function NUI.on(name, handler)
  RegisterNUICallback(name, function(data, cb)
    log('← ui', name)
    local ok, result = pcall(handler, data or {})
    if ok then
      cb(result == nil and {} or result)
    else
      print(('^1[nuikit] callback "%s" failed:^7 %s'):format(name, tostring(result)))
      cb({ error = tostring(result) })
    end
  end)
end

---@class NuiNotify
---@field title string
---@field description? string
---@field type? 'default'|'success'|'info'|'warning'|'error'
---@field duration? integer ms

--- Show a toast (needs the NuiToaster component: npx shadcn add @nuikit/nui-toaster).
---@param n NuiNotify|string
function NUI.notify(n)
  if type(n) == 'string' then n = { title = n } end
  NUI.send('nuikit:notify', n)
end

-- ───────────────────────────────── surfaces
--
-- Every resource that bundles nuikit.lua keeps an identical copy of one client-wide stack.
-- Changes go out as local events that every copy (including the sender) applies in the same
-- order, so all copies agree on who should hold focus without a central resource.

---@alias NuiLayer 'hud'|'world'|'panel'|'modal'|'system'
---@alias NuiInput 'none'|'cursor'|'keyboard'|'full'

---@class NuiSurfaceOptions
---@field layer? NuiLayer        where it stacks (default 'panel')
---@field input? NuiInput        what it takes: none (HUD), cursor (mouse only), keyboard, full (default: 'full' for panel/modal, 'none' otherwise)
---@field keepInput? boolean     let the player keep moving while it has focus (default false)
---@field exclusive? boolean     opening it closes other open surfaces on the same layer (default false)
---@field escape? 'close'|'back'|'ignore'  what Escape does while it's on top (default 'close'; 'back' sends nuikit:back to your UI)
---@field hides? string[]        surface names or layers (e.g. 'hud') hidden while this is open
---@field blockedBy? string[]    states (NUI.state) that stop it from opening, e.g. { 'dead', 'cuffed' }

local LAYERS = { hud = 1, world = 2, panel = 3, modal = 4, system = 5 }
local EV = { open = 'nuikit:sf:open', close = 'nuikit:sf:close', state = 'nuikit:sf:state', hello = 'nuikit:sf:hello', snapshot = 'nuikit:sf:snapshot' }

local defs = {}        -- name → options, for this resource's surfaces
local data = {}        -- name → latest data passed to open/update (local only)
local mine = {}        -- name → true while this resource wants it open (ahead of the replicated stack)
local stack = {}       -- client-wide: array of entries { resource, name, layer, input, keepInput, escape, hides, seq }
local states = {}      -- client-wide: state → value
local seq = 0          -- client-wide open counter (same in every copy)
local synced = false
local hasFocus = false
local lastSent = nil
local lastMain = nil
local seen = 0         -- replicated changes applied since this copy started

local function key(resource, name) return resource .. ':' .. name end

local function find(resource, name)
  for i, e in ipairs(stack) do
    if e.resource == resource and e.name == name then return i, e end
  end
end

-- Bottom → top: by layer, then by open order.
local function ordered()
  local list = {}
  for _, e in ipairs(stack) do list[#list + 1] = e end
  table.sort(list, function(a, b)
    local la, lb = LAYERS[a.layer] or 3, LAYERS[b.layer] or 3
    if la ~= lb then return la < lb end
    return a.seq < b.seq
  end)
  return list
end

local function takesInput(e) return e.input ~= 'none' end

local function contains(list, value)
  if not list then return false end
  for _, v in ipairs(list) do if v == value then return true end end
  return false
end

--- The surface that should hold focus right now (top-most that takes input), or nil.
local function focusTarget(list)
  for i = #list, 1, -1 do
    if takesInput(list[i]) then return list[i] end
  end
end

local function isHidden(list, index)
  local e = list[index]
  for j = index + 1, #list do
    local above = list[j]
    if contains(above.hides, e.name) or contains(above.hides, e.layer) then return true end
  end
  return false
end

-- Who calls SetNuiFocus for a surface: its resource, unless the nuikit host renders that
-- resource's module, in which case the host's frame must take focus (NUI.hostFocus, host.lua).
local function ownsFocus(target)
  if target.resource == RESOURCE then return not NUI.hosted end
  return NUI.hostFocus ~= nil and NUI.hostFocus(target.resource) == true
end

-- Recompute focus and tell this resource's UI what its surfaces look like.
local function apply()
  local list = ordered()
  local target = focusTarget(list)

  if target and ownsFocus(target) then
    SetNuiFocus(true, target.input == 'full' or target.input == 'cursor')
    SetNuiFocusKeepInput(target.keepInput == true)
    hasFocus = true
  elseif hasFocus then
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)
    hasFocus = false
  end

  local view = {}
  for name, opts in pairs(defs) do
    view[name] = { open = false, visible = false, focused = false, layer = opts.layer, data = data[name] }
  end
  for i, e in ipairs(list) do
    if e.resource == RESOURCE then
      view[e.name] = {
        open = true,
        visible = not isHidden(list, i),
        focused = target == e,
        layer = e.layer,
        data = data[e.name],
        z = i,
      }
    end
  end

  local payload = { surfaces = view, states = states }
  local encoded = json.encode(payload)
  if encoded ~= lastSent then
    lastSent = encoded
    NUI.send('nuikit:surfaces', payload)
  end
  -- Simple mode (NUI.open/close) keeps its own event.
  if view.main then
    local v = view.main.open and view.main.visible
    if v ~= lastMain then lastMain = v; NUI.send('nuikit:visible', v) end
  end
end

local function normalize(name, opts)
  opts = opts or {}
  local layer = LAYERS[opts.layer or 'panel'] and (opts.layer or 'panel') or 'panel'
  local input = opts.input
  if input == nil then input = (layer == 'panel' or layer == 'modal') and 'full' or 'none' end
  return {
    layer = layer,
    input = input,
    keepInput = opts.keepInput == true,
    exclusive = opts.exclusive == true,
    escape = opts.escape or 'close',
    hides = opts.hides,
    blockedBy = opts.blockedBy,
  }
end

---@class NuiSurface
---@field name string
local Surface = {}
Surface.__index = Surface

--- Open (or re-open with new data). Returns false if a state in `blockedBy` is active.
---@param payload? any  sent to the UI as the surface's `data`
---@return boolean
function Surface:open(payload)
  local opts = defs[self.name]
  for _, s in ipairs(opts.blockedBy or {}) do
    if states[s] then
      log('surface', self.name, 'blocked by state', s)
      return false
    end
  end
  data[self.name] = payload
  if mine[self.name] then apply() return true end
  mine[self.name] = true
  TriggerEvent(EV.open, {
    resource = RESOURCE, name = self.name, layer = opts.layer, input = opts.input, keepInput = opts.keepInput,
    exclusive = opts.exclusive, escape = opts.escape, hides = opts.hides,
  })
  return true
end

--- Close it. Safe to call when already closed.
function Surface:close()
  if not mine[self.name] then return end
  mine[self.name] = false
  TriggerEvent(EV.close, RESOURCE, self.name)
end

--- Replace its data without changing focus or order.
---@param payload any
function Surface:update(payload)
  data[self.name] = payload
  apply()
end

--- Open if closed, close if open.
---@param payload? any
function Surface:toggle(payload)
  if self:isOpen() then self:close() else self:open(payload) end
end

---@return boolean
function Surface:isOpen()
  return mine[self.name] == true
end

--- Declare a surface. Call once per name; calling again updates its options.
---@param name string
---@param opts? NuiSurfaceOptions
---@return NuiSurface
function NUI.surface(name, opts)
  defs[name] = normalize(name, opts)
  if synced then apply() end
  return setmetatable({ name = name }, Surface)
end

--- Set (or clear with nil/false) a client-wide state, e.g. 'dead', 'cuffed', 'driving'.
--- Shared with every nuikit resource; surfaces can block on it, UIs receive it.
---@param name string
---@param value any
function NUI.state(name, value)
  TriggerEvent(EV.state, name, value)
end

---@param name string
---@return any
function NUI.getState(name)
  return states[name]
end

--- The client-wide stack, bottom → top (for debugging and tooling).
---@return table[]
function NUI.surfaces()
  return ordered()
end

-- Replicated handlers: every copy applies the same change in the same order.

AddEventHandler(EV.open, function(e)
  seen = seen + 1
  seq = seq + 1
  if e.exclusive then
    for i = #stack, 1, -1 do
      local other = stack[i]
      if other.layer == e.layer and not (other.resource == e.resource and other.name == e.name) then
        table.remove(stack, i)
        if other.resource == RESOURCE then mine[other.name] = false end
      end
    end
  end
  local i = find(e.resource, e.name)
  if i then table.remove(stack, i) end
  e.seq = seq
  stack[#stack + 1] = e
  log('open', key(e.resource, e.name), e.layer)
  apply()
end)

AddEventHandler(EV.close, function(resource, name)
  seen = seen + 1
  if resource == RESOURCE then mine[name] = false end
  local i = find(resource, name)
  if not i then return end
  table.remove(stack, i)
  log('close', key(resource, name))
  apply()
end)

AddEventHandler(EV.state, function(name, value)
  seen = seen + 1
  if value == false then value = nil end
  states[name] = value
  apply()
end)

-- Late start (e.g. `ensure` mid-session): ask the others for their copy.
AddEventHandler(EV.hello, function(from)
  if from ~= RESOURCE and synced then
    TriggerEvent(EV.snapshot, from, { stack = stack, states = states, seq = seq })
  end
end)

-- Accepted until this copy has seen its first replicated change (covers async event delivery).
local gotSnapshot = false
AddEventHandler(EV.snapshot, function(to, snap)
  if to ~= RESOURCE or gotSnapshot or seen > 0 then return end
  gotSnapshot = true
  stack, states, seq = snap.stack or {}, snap.states or {}, snap.seq or 0
  synced = true
  apply()
end)

-- A resource stopped: drop its surfaces everywhere; never leave a cursor behind.
AddEventHandler('onClientResourceStop', function(resource)
  if resource == RESOURCE then
    if hasFocus then
      SetNuiFocus(false, false)
      SetNuiFocusKeepInput(false)
    end
    return
  end
  if resource == 'nuikit' and NUI.hosted then NUI._setHosted(false) end
  local changed = false
  for i = #stack, 1, -1 do
    if stack[i].resource == resource then
      table.remove(stack, i)
      changed = true
    end
  end
  if changed then apply() end
end)

-- UI → Lua built-ins.

NUI.on('nuikit:escape', function()
  local list = ordered()
  local target = focusTarget(list)
  if not target or target.resource ~= RESOURCE then return { ok = false } end
  if target.escape == 'ignore' then return { ok = false } end
  if target.escape == 'back' then
    NUI.send('nuikit:back', target.name)
    return { ok = true, back = target.name }
  end
  setmetatable({ name = target.name }, Surface):close()
  return { ok = true, closed = target.name }
end)

NUI.on('nuikit:surface:open', function(req)
  local name = req.name
  if not defs[name] then return { error = ('unknown surface "%s" (declare it with NUI.surface)'):format(tostring(name)) } end
  return { ok = setmetatable({ name = name }, Surface):open(req.data) }
end)

NUI.on('nuikit:surface:close', function(req)
  if req.name then setmetatable({ name = req.name }, Surface):close() end
  return { ok = true }
end)

-- ───────────────────────────────── simple mode (one UI)

---@class NuiOpenOptions
---@field focus? boolean      take NUI focus (default true)
---@field cursor? boolean     show the cursor (default = focus)
---@field keepInput? boolean  let the player keep moving while focused (default false)

local main = nil

--- Show the UI and take focus. Same as a 'main' surface on the panel layer.
---@param opts? NuiOpenOptions
function NUI.open(opts)
  opts = opts or {}
  local focus = opts.focus ~= false
  local cursor = opts.cursor
  if cursor == nil then cursor = focus end
  local input = not focus and 'none' or (cursor and 'full' or 'keyboard')
  main = NUI.surface('main', { layer = 'panel', input = input, keepInput = opts.keepInput })
  main:open(data.main)
end

--- Hide the UI and release focus.
function NUI.close()
  setmetatable({ name = 'main' }, Surface):close()
end

--- Toggle open/closed.
---@param opts? NuiOpenOptions
function NUI.toggle(opts)
  if NUI.isOpen() then NUI.close() else NUI.open(opts) end
end

---@return boolean
function NUI.isOpen()
  return mine.main == true
end

-- Built-in: the UI asks to close (closeNui(), close buttons). Closes `name`, or 'main'.
NUI.on('nuikit:close', function(req)
  local name = (type(req) == 'table' and req.name) or 'main'
  setmetatable({ name = name }, Surface):close()
  return { ok = true }
end)

-- ───────────────────────────────── handshake + server theme

--- The server-wide theme: theme.css in the `nuikit` resource (paste any TweakCN / shadcn theme).
--- Every nuikit UI applies it, so the whole server shares one look. Returns nil when absent.
---@return string|nil
function NUI.theme()
  if GetResourceState('nuikit') ~= 'started' then return nil end
  local css = LoadResourceFile('nuikit', 'theme.css')
  if css and css:find('%-%-') then return css end
  return nil
end

-- The page loads after this script runs, so anything sent before it is lost. The UI calls
-- nuikit:ready once it's listening; resend the current state (and the server theme).
NUI.on('nuikit:ready', function()
  lastSent, lastMain = nil, nil
  apply()
  local css = NUI.theme()
  if css then NUI.send('nuikit:theme', css) end
  if NUI.player and NUI.player.resend then NUI.player.resend() end
  return { ok = true, resource = RESOURCE }
end)

-- ───────────────────────────────── hosted mode (docs/host.md)
--
-- A resource whose fxmanifest has `nuikit_ui 'web/dist/module.js'` can be rendered by the nuikit
-- host (the `nuikit` resource's page) instead of its own ui_page. The host adopts it; from then
-- on NUI.send goes through the host, the host's frame takes focus for its surfaces, and the host
-- forwards the module's fetchNui calls here. Only the `nuikit` resource can adopt or call in.

local HOST = 'nuikit'
NUI.hosted = false

---@param on boolean
function NUI._setHosted(on)
  if NUI.hosted == on then return end
  NUI.hosted = on
  log(on and 'hosted by nuikit' or 'host gone: using ui_page')
  lastSent, lastMain = nil, nil
  -- Our own page: stay empty (adopted) or render the app (fallback). See nuikit-core/boot.
  SendNUIMessage({ action = on and 'nuikit:host:adopted' or 'nuikit:host:fallback' })
  apply()
end

--- Re-run focus and the surface view (the host calls it when modules come and go).
function NUI._refresh() apply() end

AddEventHandler('nuikit:host:adopt', function(resource)
  if resource == RESOURCE and GetInvokingResource() == HOST then NUI._setHosted(true) end
end)

-- A hosted module's fetchNui, forwarded by the host: run our callback, reply with the id.
AddEventHandler('nuikit:host:forward', function(resource, id, name, payload)
  if resource ~= RESOURCE or GetInvokingResource() ~= HOST then return end
  local done = false
  local function reply(result)
    if done then return end
    done = true
    TriggerEvent('nuikit:host:reply', id, result == nil and {} or result)
  end
  local fn = nuiCallbacks[name]
  if not fn then return reply({ error = ('no NUI callback "%s" in %s'):format(tostring(name), RESOURCE) }) end
  local ok, err = pcall(fn, payload or {}, reply)
  if not ok then reply({ error = tostring(err) }) end
end)

-- Our own ui_page asks whether to render (nuikit-core/boot).
NUI.on('nuikit:host:mode', function() return { hosted = NUI.hosted } end)

-- Join the client-wide stack.
TriggerEvent(EV.hello, RESOURCE)
if RESOURCE ~= HOST and GetNumResourceMetadata and GetNumResourceMetadata(RESOURCE, 'nuikit_ui') > 0 then
  TriggerEvent('nuikit:host:hello', RESOURCE)
end
if not synced then
  synced = true -- first nuikit resource (or nobody answered): start empty
  apply()
end

return NUI
