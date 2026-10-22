--[[
  nuikit.lua: the Lua half of nuikit.  MIT · https://github.com/belibathan/nuikit

  Import it with `shared_script '@nuikit/init.lua'` (and `dependency 'nuikit'`), which loads this file
  from the running nuikit resource, or copy it into a resource as a client_script to run without nuikit.
  Framework-agnostic (QBCore, Qbox, ESX, ox, standalone). `nk` and `NUI` are the same table.

  Messages
    NUI.send('hud:vitals', { health = 80 })           -- Lua → UI   (useNuiEvent / onNui)
    NUI.on('inventory:use', function(data)             -- UI → Lua  (fetchNui)
      return { ok = UseItem(data.slot) }               --   whatever you return is the response
    end)
    NUI.notify({ title = 'Paid', type = 'success' })   -- notice (with <NuiNotices />)
    local rpm = NUI.stream('hud:rpm', { rate = 30 })   -- a live value: ≤30/s, only on change
    rpm:push(GetVehicleCurrentRpm(veh))                --   the page glides: follow / useFollow

  Surfaces: every piece of UI declares what it is; nuikit owns focus, cursor, stacking and Escape
  across *all* resources that use nuikit, so two UIs never fight over the cursor.
    local inv = NUI.surface('inventory', { layer = 'panel', input = 'full', exclusive = true, hides = { 'hud' } })
    inv:open({ items = GetItems() })                   -- <Surface name="inventory"> / useSurface('inventory')
    inv:close()
    NUI.state('dead', true)                            -- surfaces with blockedBy = { 'dead' } refuse to open

  Simple mode (one UI, no surfaces): NUI.open() / NUI.close() / NUI.toggle(), as before.

  Theme and preferences: the server theme (compiled by the `nuikit` resource) and the player's UI
  prefs reach the UI by themselves, live (`nuikit theme reload`, /nuikit scale 1.1).
    NUI.theme()                                        -- the compiled theme (tokens v1)
    NUI.prefs.get()  NUI.prefs.set({ scale = 1.1 })    -- scale 0.85–1.25, reducedMotion, highContrast
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

-- ───────────────────────────────── live values (docs/protocol.md §5.7)
--
-- A value that moves all the time (a compass, a speedometer, a progress bar) costs a message every
-- time it is sent, and each message costs the game frame it lands in. A stream sends it on its own
-- channel at most `rate` times a second, and only when it changed by a `precision` step. The page
-- glides between messages at its own frame rate (nuikit-core `follow` / `useFollow`), so the motion
-- is smooth from ~30 small messages a second.
--
--   local rpm = NUI.stream('hud:vehicle:rpm', { rate = 30, precision = 0.01 })
--   rpm:push(GetVehicleCurrentRpm(vehicle))          -- call it as often as you like; it decides

---@class NuiStreamOptions
---@field rate? number       messages a second at most (default 30)
---@field precision? number  rounding step: sends only when the rounded value changed (default 0.01)
---@field kind? 'linear'|'angle'  'angle' keeps degrees in 0–360, so 359.96 and -0.04 are one heading

---@class NuiStream
---@field action string
local Stream = {}
Stream.__index = Stream

--- Round `value` to the precision and send it if it changed and the rate allows. Returns whether it
--- sent. A value the rate holds back is not kept: push again (from your loop) and it goes out.
---@param value number
---@return boolean
function Stream:push(value)
  value = tonumber(value)
  if not value or value ~= value then return false end
  if self.angle then value = value % 360.0 end
  local v = math.floor(value * self.inv + 0.5) / self.inv
  if self.angle then v = v % 360.0 end
  if v == self.last then return false end
  local now = GetGameTimer()
  if self.sentAt and now - self.sentAt < self.gap then return false end
  self.last, self.sentAt = v, now
  NUI.send(self.action, v)
  return true
end

--- Forget the last value, so the next push sends (e.g. when the page reloads).
function Stream:reset()
  self.last, self.sentAt = nil, nil
end

--- The last value sent, or nil.
---@return number|nil
function Stream:value()
  return self.last
end

--- A live value on its own channel. The page follows it with `follow(action, paint, { kind })`.
---@param action string
---@param opts? NuiStreamOptions
---@return NuiStream
function NUI.stream(action, opts)
  opts = opts or {}
  local precision = tonumber(opts.precision) or 0.01
  if precision <= 0 then precision = 0.01 end
  -- round to 1/precision as a whole number when it is one (0.1 → 10), so 270.5 stays 270.5
  local inv = 1 / precision
  local whole = math.floor(inv + 0.5)
  if math.abs(inv - whole) < 1e-9 then inv = whole end
  local rate = tonumber(opts.rate) or 30
  return setmetatable({
    action = action,
    inv = inv,
    -- whole milliseconds, so a loop with Wait(33) is never held back at 30 a second
    gap = rate > 0 and math.floor(1000 / rate) or 0,
    angle = opts.kind == 'angle',
  }, Stream)
end

---@class NuiNotify
---@field title string
---@field description? string
---@field type? 'default'|'success'|'info'|'warning'|'error'
---@field duration? integer ms

--- Show a notice (needs <NuiNotices /> from the notice component: npx shadcn add @nuikit/notice).
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
---@field controls? string|integer|table  game controls disabled while it is open: presets and ids (nk.controls, docs/services.md)

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
    -- NUI focus is one global: when another resource's surface is now the target, its copy sets
    -- the focus, and releasing here (this copy may run after it) would wipe it. Release only when
    -- nothing takes input any more.
    if not target then
      SetNuiFocus(false, false)
      SetNuiFocusKeepInput(false)
    end
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

  -- services: an open surface's `controls` set (controls.lua, loaded after this file)
  local controls = rawget(NUI, 'controls')
  if controls then controls._surfaces(view, defs) end
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
    controls = opts.controls,
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
      -- hand over, don't wipe: if a surface of another resource is next, its copy sets the focus
      local next = nil
      for _, e in ipairs(ordered()) do
        if e.resource ~= RESOURCE and takesInput(e) then next = e end
      end
      if not next then
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
      end
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
---@field escape? 'close'|'back'|'ignore'  what Escape does (default 'close')

local main = nil

--- Show the UI and take focus. Same as a 'main' surface on the panel layer.
---@param opts? NuiOpenOptions
function NUI.open(opts)
  opts = opts or {}
  local focus = opts.focus ~= false
  local cursor = opts.cursor
  if cursor == nil then cursor = focus end
  local input = not focus and 'none' or (cursor and 'full' or 'keyboard')
  main = NUI.surface('main', { layer = 'panel', input = input, keepInput = opts.keepInput, escape = opts.escape })
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

-- ───────────────────────────────── server theme + player preferences

--- The server-wide theme: the `nuikit` resource compiles its theme.css (any TweakCN / shadcn paste)
--- into the nuikit tokens (docs/tokens.md) and publishes them as GlobalState.nuikitTheme. Every
--- nuikit UI applies it, so the whole server shares one look. Falls back to the raw theme.css from an
--- older nuikit resource. Returns nil without the nuikit resource.
---@return { version: integer, mode: string, hash: string, vars: table<string, string>, imports: string[] }|string|nil
local currentPrefs -- defined below (the player's prefs pick their look)

--- The key of the look in use ('studio|slab'), or nil for the server theme: the player's prefs (identity,
--- treatment) when GlobalState.nuikitLooks (nuikit_identities / nuikit_treatments) has them. Keys are compared,
--- not tables: every GlobalState read is a fresh copy.
function NUI.lookKey()
  local looks = GlobalState and GlobalState.nuikitLooks
  if type(looks) ~= 'table' or type(looks.themes) ~= 'table' or not currentPrefs then return nil end
  local p = currentPrefs()
  if not p.identity and not p.treatment then return nil end
  local key = (p.identity or 'server') .. '|' .. (p.treatment or '')
  local theme = looks.themes[key]
  return type(theme) == 'table' and theme.vars and key or nil
end

--- The player's look (a compiled theme), or nil for the server theme.
function NUI.look()
  local key = NUI.lookKey()
  return key and GlobalState.nuikitLooks.themes[key] or nil
end

function NUI.theme()
  local look = NUI.look()
  if look then return look end
  local compiled = GlobalState and GlobalState.nuikitTheme
  if type(compiled) == 'table' and compiled.vars then return compiled end
  if GetResourceState('nuikit') ~= 'started' then return nil end
  local css = LoadResourceFile('nuikit', 'theme.css')
  if css and css:find('%-%-') then return css end
  return nil
end

-- `nuikit theme reload` on the server: repaint this UI live.
if AddStateBagChangeHandler then
  AddStateBagChangeHandler('nuikitTheme', 'global', function(_, _, value)
    -- a player on their own look keeps it; the server theme reaches everyone else
    if type(value) == 'table' and value.vars and not NUI.lookKey() then NUI.send('nuikit:theme', value) end
  end)
  -- the allowed looks were recompiled (theme reload): the handler runs before the value lands, so wait a tick
  AddStateBagChangeHandler('nuikitLooks', 'global', function()
    SetTimeout(0, function()
      local t = NUI.theme()
      if type(t) == 'table' then NUI.send('nuikit:theme', t) end
    end)
  end)
end

---@class NuiPrefs
---@field scale number          0.85–1.25, multiplies the theme's --nk-scale
---@field reducedMotion boolean no animations or transitions
---@field highContrast boolean  maximum-contrast text and borders
---@field density number        0.85–1.2, multiplies the theme's --nk-density
---@field identity string|nil   a look from nuikit_identities (nil: the server theme)
---@field treatment string|nil  a treatment from nuikit_treatments over that look

local PREFS_KVP = 'nuikit:prefs'
local prefs = nil -- last known, from the nuikit resource (or this resource's KVP without it)

local function lookName(v)
  return type(v) == 'string' and v:match('^[%w_-]+$') and #v <= 32 and v:lower() or nil
end

local function normalizePrefs(p)
  p = type(p) == 'table' and p or {}
  local scale = tonumber(p.scale) or 1.0
  if scale < 0.85 then scale = 0.85 elseif scale > 1.25 then scale = 1.25 end
  local density = tonumber(p.density) or 1.0
  if density < 0.85 then density = 0.85 elseif density > 1.2 then density = 1.2 end
  return {
    scale = math.floor(scale * 100 + 0.5) / 100,
    reducedMotion = p.reducedMotion == true,
    highContrast = p.highContrast == true,
    density = math.floor(density * 100 + 0.5) / 100,
    -- a look (Settings › Look); the server's allow-list decides whether it applies
    identity = lookName(p.identity),
    treatment = lookName(p.treatment),
  }
end

local function nuikitRunning()
  return GetResourceState and GetResourceState('nuikit') == 'started'
end

local function localPrefs()
  local raw = GetResourceKvpString and GetResourceKvpString(PREFS_KVP)
  if raw and raw ~= '' and json.decode then
    local ok, data = pcall(json.decode, raw)
    if ok then return normalizePrefs(data) end
  end
  return normalizePrefs(nil)
end

NUI.prefs = {}

--- The player's UI preferences (shared by every nuikit UI; owned by the nuikit resource).
---@return NuiPrefs
function NUI.prefs.get()
  local p = prefs or localPrefs()
  return { scale = p.scale, reducedMotion = p.reducedMotion, highContrast = p.highContrast, density = p.density, identity = p.identity, treatment = p.treatment }
end
currentPrefs = NUI.prefs.get

--- Change preferences (missing keys keep their value). Saved, and applied to every nuikit UI.
---@param patch { scale?: number, reducedMotion?: boolean, highContrast?: boolean }
function NUI.prefs.set(patch)
  if type(patch) ~= 'table' then return end
  if nuikitRunning() then
    TriggerEvent('nuikit:prefs:set', patch)
    return
  end
  -- no nuikit resource: this resource's UI only
  local merged = NUI.prefs.get()
  for k, v in pairs(patch) do merged[k] = v end
  local before = NUI.lookKey()
  prefs = normalizePrefs(merged)
  if SetResourceKvp then SetResourceKvp(PREFS_KVP, json.encode(prefs)) end
  NUI.send('nuikit:prefs', prefs)
  if NUI.lookKey() ~= before then NUI.send('nuikit:theme', NUI.theme()) end
end

-- From the nuikit resource: to everyone on a change, or to one resource answering its request.
AddEventHandler('nuikit:prefs:changed', function(p, to)
  if to and to ~= RESOURCE then return end
  local before = NUI.lookKey()
  prefs = normalizePrefs(p)
  NUI.send('nuikit:prefs', prefs)
  -- a new look repaints this UI live, like a theme reload
  if NUI.lookKey() ~= before then
    local t = NUI.theme()
    if t then NUI.send('nuikit:theme', t) end
  end
end)
TriggerEvent('nuikit:prefs:request', RESOURCE)

-- ───────────────────────────────── screen zones

-- What each UI covers on screen, so the others place themselves around it (nuikit-core src/zones.ts):
-- the HUD publishes its map and cluster, notices start below them. One local (never replicated) state
-- bag on the player holds every resource's zones, so a UI that starts later reads them too.
local ZONES = 'nuikitZones'

local function ownBag()
  return LocalPlayer and LocalPlayer.state
end

--- Every published zone: `resource:name` → rectangles { x, y, w, h } in fractions of the screen.
---@return table<string, { x: number, y: number, w: number, h: number }[]>
function NUI.zones()
  local bag = ownBag()
  return (bag and bag[ZONES]) or {}
end

--- Publish (or with nil, remove) what this UI covers on screen. Rectangles in fractions of the screen.
---@param name string
---@param rects { x: number, y: number, w: number, h: number }[]|nil
function NUI.zone(name, rects)
  local bag = ownBag()
  if not bag then return end
  local all = {}
  for k, v in pairs(bag[ZONES] or {}) do all[k] = v end
  all[RESOURCE .. ':' .. name] = rects
  bag:set(ZONES, all, false)
end

if AddStateBagChangeHandler then
  AddStateBagChangeHandler(ZONES, nil, function(bagName, _, value)
    if not bagName:find('^player:') then return end
    NUI.send('nuikit:zones', value or {})
  end)
end

-- a stopped UI covers nothing
AddEventHandler('onClientResourceStop', function(resource)
  if resource ~= RESOURCE then return end
  local bag = ownBag()
  if not bag or not bag[ZONES] then return end
  local all, mine = {}, ('^' .. RESOURCE:gsub('%p', '%%%0') .. ':')
  for k, v in pairs(bag[ZONES]) do
    if not k:find(mine) then all[k] = v end
  end
  bag:set(ZONES, all, false)
end)

-- ───────────────────────────────── cluster slots

-- A cluster (the HUD's vitals row) shows slots other resources join (voice, radio, a job), so independent
-- resources read as one cluster (docs/slots.md). The same local state bag channel as zones: every nuikit
-- page gets the set as `nuikit:slots` { [cluster] = { [`resource:key`] = slot } }; nuikit-core sorts them.
local SLOTS = 'nuikitSlots'

--- Every joined slot: cluster → `resource:key` → { key, resource, order, … }.
function NUI.slots()
  local bag = ownBag()
  return (bag and bag[SLOTS]) or {}
end

local function writeSlot(cluster, id, slot)
  local bag = ownBag()
  if not bag then return end
  local all = {}
  for c, list in pairs(bag[SLOTS] or {}) do
    local copy = {}
    for k, v in pairs(list) do copy[k] = v end
    all[c] = copy
  end
  all[cluster] = all[cluster] or {}
  all[cluster][id] = slot
  if next(all[cluster]) == nil then all[cluster] = nil end
  bag:set(SLOTS, all, false)
end

--- Join a cluster with a slot. opts: order (lower first, default 100), and anything the cluster draws
--- (label, icon, hue, level 0–1, value, alert, hidden). Returns a handle: set(patch) updates it, remove() leaves.
---@param cluster string
---@param key string
---@param opts? table
function NUI.slot(cluster, key, opts)
  assert(type(cluster) == 'string' and type(key) == 'string', 'NUI.slot(cluster, key, opts)')
  local id = RESOURCE .. ':' .. key
  local slot = { key = key, resource = RESOURCE, order = 100 }
  for k, v in pairs(type(opts) == 'table' and opts or {}) do slot[k] = v end
  slot.key, slot.resource = key, RESOURCE
  writeSlot(cluster, id, slot)
  local handle = {}
  function handle.set(patch)
    local changed = false
    for k, v in pairs(type(patch) == 'table' and patch or {}) do
      if k ~= 'key' and k ~= 'resource' and slot[k] ~= v then slot[k] = v changed = true end
    end
    -- change-only writes: a voice slot updates on every talk state, not every frame
    if changed then writeSlot(cluster, id, slot) end
    return handle
  end
  function handle.remove() writeSlot(cluster, id, nil) end
  return handle
end

--- Leave a cluster without the handle (the same as handle.remove()).
---@param cluster string
---@param key string
function NUI.unslot(cluster, key)
  writeSlot(cluster, RESOURCE .. ':' .. key, nil)
end

if AddStateBagChangeHandler then
  AddStateBagChangeHandler(SLOTS, nil, function(bagName, _, value)
    if not bagName:find('^player:') then return end
    NUI.send('nuikit:slots', value or {})
  end)
end

-- a stopped resource leaves every cluster it joined
AddEventHandler('onClientResourceStop', function(resource)
  if resource ~= RESOURCE then return end
  local bag = ownBag()
  if not bag or not bag[SLOTS] then return end
  local all, mine = {}, ('^' .. RESOURCE:gsub('%p', '%%%0') .. ':')
  for c, list in pairs(bag[SLOTS]) do
    local keep = {}
    for k, v in pairs(list) do if not k:find(mine) then keep[k] = v end end
    if next(keep) ~= nil then all[c] = keep end
  end
  bag:set(SLOTS, all, false)
end)

-- ───────────────────────────────── handshake

-- The page loads after this script runs, so anything sent before it is lost. The UI calls
-- nuikit:ready once it's listening; resend the current state (theme and prefs too).
--- The protocol version this library speaks (docs/protocol.md §2).
NUI.PROTOCOL = 1

NUI.on('nuikit:ready', function(req)
  lastSent, lastMain = nil, nil
  apply()
  local theme = NUI.theme()
  if theme then NUI.send('nuikit:theme', theme) end
  NUI.send('nuikit:prefs', NUI.prefs.get())
  NUI.send('nuikit:zones', NUI.zones())
  NUI.send('nuikit:slots', NUI.slots())
  -- rawget: with @nuikit/init.lua, reading NUI.player would load the bridge into every resource
  local player = rawget(NUI, 'player')
  local hasPlayer = player ~= nil and player.resend ~= nil
  if hasPlayer then player.resend() end
  -- §2.2: a 0.4.0 page sends no protocol (version 0); it ignores the extra fields.
  local capabilities = { 'surfaces', 'states', 'notify', 'prefs' }
  if theme then capabilities[#capabilities + 1] = 'theme' end
  if hasPlayer then
    capabilities[#capabilities + 1] = 'player'
    -- the server context (§7.2: currency, locale) rides with the bridge
    capabilities[#capabilities + 1] = 'context'
  end
  return { ok = true, resource = RESOURCE, protocol = NUI.PROTOCOL, capabilities = capabilities }
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
