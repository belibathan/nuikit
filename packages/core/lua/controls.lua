--[[
  controls.lua: the controls service (nk.controls).  MIT · https://github.com/belibathan/nuikit

  Which game controls are disabled while a UI is open, merged across UIs (docs/services.md). Loaded
  into every resource that imports @nuikit/init.lua, after nuikit.lua.

    local h = nk.controls.disable('movement')                  -- a preset
    local h = nk.controls.disable({ 'look', 24, 25 })          -- presets and control ids, any mix
    nk.controls.release(h)                                     -- only this set goes; the others stay
    NUI.surface('shop', { controls = { 'movement', 'weapons' } }) -- disabled while the surface is open

  Presets: 'all' (DisableAllControlActions), 'movement', 'look', 'weapons', 'vehicle', 'frontend'.

  Guarantees
    * The union of every active set is disabled, every frame, by one loop per resource that runs only while
      that resource holds a set. Nothing runs when nothing is disabled.
    * A set released by its handle only removes its own controls; what another set still needs stays off.
    * A resource stopping restores its controls (its loop dies with it; the natives are per frame). The
      player going down releases every set (`onDeath = 'keep'` keeps one, for the death screen itself).
]]

NUI = NUI or {}

local RESOURCE = GetCurrentResourceName()
local WATCH_MS = 250
local GROUP = 0

local controls = {}
NUI.controls = controls

-- GTA control ids (https://docs.fivem.net/docs/game-references/controls/)
controls.presets = {
  movement = { 30, 31, 32, 33, 34, 35, 21, 22, 36, 44, 23 },
  look = { 1, 2, 3, 4, 5, 6, 270, 271, 272, 273 },
  weapons = { 24, 25, 37, 45, 47, 58, 68, 69, 70, 91, 92, 140, 141, 142, 143, 257, 261, 262, 263, 264, 12, 13, 14, 15, 16, 17, 157, 158, 159, 160, 161, 162, 163, 164, 165 },
  vehicle = { 59, 60, 61, 62, 63, 64, 65, 66, 67, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 102, 106, 107, 108, 109, 110, 111, 112 },
  frontend = { 199, 200, 244, 245, 246, 249 },
}

local sets = {}     -- handle → { ids = {int → true}, all = bool, onDeath = 'release'|'keep', name }
local order = {}    -- handles, oldest first
local union = {}    -- flat array of ids to disable this frame (rebuilt on change)
local all = false   -- 'all' is in the union
local counter = 0

---@class NuiControlsHandle
---@field id integer
local Handle = {}
Handle.__index = Handle
function Handle:release() return controls.release(self) end

--- Resolve a set spec into { ids = {id → true}, all = bool }.
---@param spec string|integer|table  a preset, a control id, or a list of them
---@return table ids, boolean all
function controls.resolve(spec)
  local ids, everything = {}, false
  local function add(v)
    if type(v) == 'number' then ids[math.floor(v)] = true
    elseif v == 'all' then everything = true
    elseif type(v) == 'string' then
      local p = controls.presets[v]
      if not p then error(('nuikit: unknown controls preset "%s"'):format(v), 3) end
      for _, id in ipairs(p) do ids[id] = true end
    elseif type(v) == 'table' then
      for _, x in ipairs(v) do add(x) end
    end
  end
  add(spec)
  return ids, everything
end

local function rebuild()
  local merged, everything = {}, false
  for _, h in ipairs(order) do
    local s = sets[h]
    if s.all then everything = true end
    for id in pairs(s.ids) do merged[id] = true end
  end
  local flat = {}
  if not everything then
    for id in pairs(merged) do flat[#flat + 1] = id end
    table.sort(flat)
  end
  union, all = flat, everything
end

--- One frame of the loop: disable the union. Exposed so tests (and resmon-minded callers) can call it.
function controls.tick()
  if all then
    DisableAllControlActions(GROUP)
    return
  end
  for i = 1, #union do DisableControlAction(GROUP, union[i], true) end
end

local running = false
local function loop()
  if running then return end
  running = true
  CreateThread(function()
    local nextCheck = 0
    -- bounded by the handles: ends when the last one is released; Wait(0) because controls are disabled per frame (§8 render exception)
    while #order > 0 do
      local now = GetGameTimer()
      if now >= nextCheck then
        nextCheck = now + WATCH_MS
        if NUI.camera ~= nil and NUI.camera.down() then controls.releaseAll('dead') end
        if #order == 0 then break end
      end
      controls.tick()
      Wait(0)
    end
    running = false
  end)
end

---@class NuiControlsOptions
---@field onDeath? 'release'|'keep'  what happens when the player goes down (default 'release')
---@field name? string              for debugging (nk.controls.active())

--- Disable a set of controls until released. Returns a handle.
---@param spec string|integer|table
---@param opts? NuiControlsOptions
---@return NuiControlsHandle
function controls.disable(spec, opts)
  opts = opts or {}
  local ids, everything = controls.resolve(spec)
  counter = counter + 1
  local h = setmetatable({ id = counter }, Handle)
  sets[h] = { ids = ids, all = everything, onDeath = opts.onDeath == 'keep' and 'keep' or 'release', name = opts.name }
  order[#order + 1] = h
  rebuild()
  loop()
  return h
end

--- Release one set. The others keep their controls disabled.
---@param h NuiControlsHandle
---@return boolean released
function controls.release(h)
  if not h or not sets[h] then return false end
  sets[h] = nil
  for i = #order, 1, -1 do
    if order[i] == h then table.remove(order, i) end
  end
  rebuild()
  return true
end

--- Release every set (reason 'dead' keeps the ones with onDeath = 'keep').
---@param reason? 'dead'|'all'
function controls.releaseAll(reason)
  for _, h in ipairs({ table.unpack(order) }) do
    if reason ~= 'dead' or sets[h].onDeath ~= 'keep' then controls.release(h) end
  end
end

--- Is this control disabled by a set right now?
---@param id integer
---@return boolean
function controls.isDisabled(id)
  if #order == 0 then return false end
  if all then return true end
  for i = 1, #union do
    if union[i] == id then return true end
  end
  return false
end

--- The union being disabled: the ids (sorted), or 'all'.
---@return integer[]|'all'
function controls.active()
  if #order == 0 then return {} end
  if all then return 'all' end
  return { table.unpack(union) }
end

--- How many sets are active.
function controls.count() return #order end

-- ───────────────────────────────── surfaces: `controls` in NUI.surface options

local bySurface = {} -- surface name → handle while it is open

--- Called by nuikit.lua after every surfaces change with this resource's view and definitions.
function controls._surfaces(view, defs)
  for name, opts in pairs(defs) do
    local v = view[name]
    local open = v ~= nil and v.open == true
    if open and opts.controls and not bySurface[name] then
      bySurface[name] = controls.disable(opts.controls, { name = 'surface:' .. name })
    elseif (not open or not opts.controls) and bySurface[name] then
      controls.release(bySurface[name])
      bySurface[name] = nil
    end
  end
  for name, h in pairs(bySurface) do
    if not defs[name] then
      controls.release(h)
      bySurface[name] = nil
    end
  end
end

return controls
