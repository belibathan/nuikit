--[[
  host.lua: the nuikit host.  MIT · https://github.com/belibathan/nuikit · docs/host.md

  Loaded by the `nuikit` resource only, after nuikit.lua. Renders every started resource whose
  fxmanifest declares a UI module in nuikit's own frame:

    nuikit_ui 'web/dist/module.js'      -- in the resource's fxmanifest (keep its ui_page as fallback)

  Routing, and why a module can only ever reach its own resource:
    Lua → module   the resource's NUI.send → TriggerEvent('nuikit:host:send') → here, where the
                   sender is GetInvokingResource() (not a claimed name) → { nkm = resource } to the page
    module → Lua   the page POSTs nuikit:host:call { t = token, n, d }. The token was made here for
                   one resource and given to that module only; it decides the target, never the
                   page. Forwarded as 'nuikit:host:forward'; only that resource may reply.

  convar nuikit_host 0 turns the host off (every resource uses its ui_page).
]]

local RESOURCE = GetCurrentResourceName()
local enabled = GetConvarInt('nuikit_host', 1) == 1
local debug = GetConvarInt('nuikit_debug', 0) == 1

local modules = {}   -- resource → { url, token }
local byToken = {}   -- token → resource
local pending = {}   -- request id → { resource, cb, at }
local nextId = 0
local TIMEOUT = 30000

local function log(...)
  if not debug then return end
  local parts = { 'host:' }
  for i = 1, select('#', ...) do parts[#parts + 1] = tostring((select(i, ...))) end
  NUI.log.debug(table.concat(parts, ' '))
end

math.randomseed(GetGameTimer and GetGameTimer() or 0)
local function newToken()
  local t = {}
  for i = 1, 32 do t[i] = ('%x'):format(math.random(0, 15)) end
  return table.concat(t)
end

--- The module URL a resource declares, or nil.
local function moduleUrl(resource)
  if resource == RESOURCE then return nil end
  local state = GetResourceState(resource)
  if state ~= 'started' and state ~= 'starting' then return nil end
  if GetNumResourceMetadata(resource, 'nuikit_ui') < 1 then return nil end
  local path = GetResourceMetadata(resource, 'nuikit_ui', 0)
  if type(path) ~= 'string' or path == '' then return nil end
  return ('https://cfx-nui-%s/%s'):format(resource, (path:gsub('^/+', '')))
end

local function sendLoad(resource)
  local m = modules[resource]
  SendNUIMessage({ action = 'nuikit:host:load', data = { resource = resource, url = m.url, token = m.token } })
end

local function add(resource)
  if not enabled then return end
  if not modules[resource] then
    local url = moduleUrl(resource)
    if not url then return end
    local token = newToken()
    modules[resource] = { url = url, token = token }
    byToken[token] = resource
    log('module', resource, url)
    sendLoad(resource) -- lost if the page isn't up yet; nuikit:host:ready resends
  end
  TriggerEvent('nuikit:host:adopt', resource)
  NUI._refresh()
end

local function remove(resource)
  local m = modules[resource]
  if not m then return end
  modules[resource] = nil
  byToken[m.token] = nil
  for id, p in pairs(pending) do
    if p.resource == resource then
      pending[id] = nil
      p.cb({ error = 'resource stopped' })
    end
  end
  SendNUIMessage({ action = 'nuikit:host:unload', data = resource })
  NUI._refresh()
end

-- Surfaces of hosted resources take focus through this frame (see ownsFocus in nuikit.lua).
NUI.hostFocus = function(resource) return modules[resource] ~= nil end

--- Hosted resources, for debugging and tooling.
function NUI.hostModules()
  local list = {}
  for resource, m in pairs(modules) do list[#list + 1] = { resource = resource, url = m.url } end
  return list
end

-- A resource with nuikit.lua and a module announces itself when it starts (or restarts).
AddEventHandler('nuikit:host:hello', function(resource)
  if GetInvokingResource() == resource then add(resource) end
end)
AddEventHandler('onClientResourceStart', function(resource) add(resource) end)
AddEventHandler('onClientResourceStop', function(resource) remove(resource) end)

-- Lua → module. The sender is who invoked the event, whatever the payload says.
AddEventHandler('nuikit:host:send', function(action, data)
  local from = GetInvokingResource()
  if not from or not modules[from] then return end
  SendNUIMessage({ nkm = from, action = action, data = data })
end)

-- module → Lua. The token, not the page, decides which resource is called.
RegisterNUICallback('nuikit:host:call', function(req, cb)
  local resource = type(req) == 'table' and byToken[req.t] or nil
  if not resource then return cb({ error = 'unknown module' }) end
  local now = GetGameTimer()
  for id, p in pairs(pending) do
    if now - p.at > TIMEOUT then
      pending[id] = nil
      p.cb({ error = 'timed out' })
    end
  end
  nextId = nextId + 1
  local id = nextId
  pending[id] = { resource = resource, cb = cb, at = now }
  TriggerEvent('nuikit:host:forward', resource, id, req.n, req.d)
end)

AddEventHandler('nuikit:host:reply', function(id, result)
  local p = pending[id]
  if not p or GetInvokingResource() ~= p.resource then return end
  pending[id] = nil
  p.cb(result)
end)

-- The page loaded (or reloaded): it has no modules yet.
RegisterNUICallback('nuikit:host:ready', function(_, cb)
  local n = 0
  for resource in pairs(modules) do
    sendLoad(resource)
    n = n + 1
  end
  cb({ ok = true, modules = n })
end)

RegisterNUICallback('nuikit:host:error', function(req, cb)
  NUI.log.error(('host: %s failed: %s'):format(tostring(req and req.resource), tostring(req and req.message)))
  cb({})
end)

-- Adopt everything already running.
for i = 0, GetNumResources() - 1 do
  local resource = GetResourceByFindIndex(i)
  if resource then add(resource) end
end
