--[[
  nuikit (client): renderer packs (docs/intents.md §9). Loaded after client/intents.lua.

  A started resource that declares, in its fxmanifest,
    nuikit_renderer 'notify'                       -- one line per intent it draws
    nuikit_renderer_module 'web/dist/renderers.js' -- the module (default: web/dist/renderers.js)
  replaces the default renderer for those intents in this resource's frame. The module is built with
  nuikitModule() and its default export is a renderer (defineReactRenderer) or a record of them by kind.

  Frame ⇄ Lua
    → page   nuikit:renderer { op = 'state', active = { [kind] = { resource, url, gen } } }
    ← page   nuikit:renderer:sync {} (page loaded) · nuikit:renderer:failed { kind, resource, url, message }

  Several packs claiming one kind: the one started last draws it; when it stops, the previous one
  (or the default) takes over. A pack that fails to load falls back to the default, prints one F8
  line and tells the server (nuikit:renderer:failed) for the doctor.
]]

local RESOURCE = GetCurrentResourceName()
local debug = GetConvarInt('nuikit_debug', 0) == 1
local DEFAULT_MODULE = 'web/dist/renderers.js'
local KINDS = { notify = true, menu = true, input = true, confirm = true, progress = true, prompt = true, target = true, radial = true, challenge = true }

local packs = {}  -- resource → { url, kinds = { kind → true }, gen }
local order = {}  -- resources in start order (last = newest)
local gen = 0

local function log(...)
  if debug then print('^5[nuikit:renderers]^7', ...) end
end

--- What a resource declares, or nil.
local function declared(resource)
  if resource == RESOURCE then return nil end
  local state = GetResourceState(resource)
  if state ~= 'started' and state ~= 'starting' then return nil end
  local n = GetNumResourceMetadata(resource, 'nuikit_renderer')
  if n < 1 then return nil end
  local kinds, any = {}, false
  for i = 0, n - 1 do
    local kind = GetResourceMetadata(resource, 'nuikit_renderer', i)
    if type(kind) == 'string' then
      kind = kind:lower():gsub('^%s+', ''):gsub('%s+$', '')
      if KINDS[kind] then
        kinds[kind] = true
        any = true
      else
        print(('^3[nuikit] %s declares nuikit_renderer \'%s\', which is not an intent; ignored^7'):format(resource, kind))
      end
    end
  end
  if not any then return nil end
  local path = DEFAULT_MODULE
  if GetNumResourceMetadata(resource, 'nuikit_renderer_module') > 0 then
    local p = GetResourceMetadata(resource, 'nuikit_renderer_module', 0)
    if type(p) == 'string' and p ~= '' then path = p end
  end
  return { url = ('https://cfx-nui-%s/%s'):format(resource, (path:gsub('^/+', ''))), kinds = kinds }
end

--- The pack that draws each kind: the newest started pack claiming it.
local function state()
  local active = {}
  for i = #order, 1, -1 do
    local resource = order[i]
    local pack = packs[resource]
    for kind in pairs(pack.kinds) do
      if not active[kind] then active[kind] = { resource = resource, url = pack.url, gen = pack.gen } end
    end
  end
  return active
end

local function push()
  NUI.send('nuikit:renderer', { op = 'state', active = state() })
end

local function add(resource)
  local decl = declared(resource)
  if not decl then return end
  if packs[resource] then -- restarted: it goes to the top again with a new gen
    for i, r in ipairs(order) do if r == resource then table.remove(order, i) break end end
  end
  gen = gen + 1
  decl.gen = gen
  packs[resource] = decl
  order[#order + 1] = resource
  local list = {}
  for kind in pairs(decl.kinds) do list[#list + 1] = kind end
  table.sort(list)
  log('pack', resource, table.concat(list, ','), decl.url)
  push()
end

local function remove(resource)
  if not packs[resource] then return end
  packs[resource] = nil
  for i, r in ipairs(order) do if r == resource then table.remove(order, i) break end end
  push()
end

--- Running packs, for debugging and the doctor.
function NUI.rendererPacks()
  return state()
end

AddEventHandler('onClientResourceStart', function(resource) add(resource) end)
AddEventHandler('onClientResourceStop', function(resource) remove(resource) end)

-- The frame (re)loaded: give it the state.
NUI.on('nuikit:renderer:sync', function()
  push()
  return { ok = true }
end)

-- A pack failed for a kind; the frame already fell back to the default.
NUI.on('nuikit:renderer:failed', function(req)
  if type(req) ~= 'table' then return { ok = false } end
  print(('^1[nuikit] renderer pack %s failed for %s (%s): %s. Using the default renderer.^7'):format(
    tostring(req.resource), tostring(req.kind), tostring(req.url), tostring(req.message)))
  -- page-sent: only strings, capped, reach the server
  local function cap(v, n) return type(v) == 'string' and v:sub(1, n) or nil end
  TriggerServerEvent('nuikit:renderer:failed', { resource = cap(req.resource, 64), kind = cap(req.kind, 32), message = cap(req.message, 300) })
  return { ok = true }
end)

-- Adopt everything already running.
for i = 0, GetNumResources() - 1 do
  local resource = GetResourceByFindIndex(i)
  if resource then add(resource) end
end
