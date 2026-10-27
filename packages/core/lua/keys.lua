--[[
  nk.keys: key bindings a resource declares in one place, so a Settings page can list them.

    local k = nk.keys.define({
      id = 'hud_edit', label = 'Edit the HUD', key = 'F7', mapper = 'keyboard',
      onPress = function() … end, onRelease = function() … end,   -- onRelease optional
      command = 'my_cmd',   -- optional: keep an existing command name players already bound (plain command, press only)
    })
    k.binding()   -- the current binding as text ('F7', or what the player rebound it to)

  Registers `+<resource>_<id>` / `-<resource>_<id>` and the key mapping in the OWNING resource (a mapping
  belongs to the resource that registers it). The store in the nuikit resource lists every resource's keys
  (exports keysList, NUI callback https://nuikit/keys); a stopped resource's keys leave the list.
  Players change a key in GTA's Settings › Key Bindings › FiveM.
]]

local RUNTIME = 'nuikit'
local RESOURCE = GetCurrentResourceName()
local keys = {}

--- FiveM's instructional button string ('t_F7', 'b_116') as display text; other codes stay raw.
function keys.label(raw)
  if type(raw) ~= 'string' or raw == '' then return nil end
  return raw:match('^t_(.+)$') or raw
end

local function commandName(entry)
  return entry.command or ('+' .. entry.resource .. '_' .. entry.id)
end

local function current(entry)
  local raw
  if GetControlInstructionalButton and joaat then
    local ok, v = pcall(GetControlInstructionalButton, 0, joaat(commandName(entry)) | 0x80000000, true)
    if ok then raw = v end
  end
  return keys.label(raw) or entry.default
end

-- ───────────────────────────────── the store (the nuikit resource)

if RESOURCE == RUNTIME then
  local entries, order = {}, {} -- 'resource:id' → entry; insertion order

  --- Record a declared key. False when that resource already declared that id.
  function keys.store(res, entry)
    local name = res .. ':' .. entry.id
    if entries[name] then return false end
    entries[name] = { resource = res, id = entry.id, label = entry.label, default = entry.key, mapper = entry.mapper, command = entry.command }
    order[#order + 1] = name
    return true
  end

  function keys.list()
    local out = {}
    for _, name in ipairs(order) do
      local e = entries[name]
      out[#out + 1] = { resource = e.resource, id = e.id, label = e.label, default = e.default, mapper = e.mapper, binding = current(e) }
    end
    table.sort(out, function(a, b)
      if a.resource ~= b.resource then return a.resource < b.resource end
      return a.label < b.label
    end)
    return out
  end

  AddEventHandler('onClientResourceStop', function(res)
    for i = #order, 1, -1 do
      if entries[order[i]].resource == res then
        entries[order[i]] = nil
        table.remove(order, i)
      end
    end
  end)

  -- a resource declares keys only in its own name (the invoker, whatever name it passes)
  exports('keysDefine', function(res, entry)
    local from = GetInvokingResource and GetInvokingResource()
    if type(res) ~= 'string' or (from ~= nil and from ~= res) then return false end
    if type(entry) ~= 'table' or type(entry.id) ~= 'string' then return false end
    return keys.store(res, entry)
  end)
  exports('keysList', keys.list)

  -- Pages: https://nuikit/keys → { keys = [{ resource, id, label, default, binding, mapper }] }
  RegisterNUICallback('keys', function(_, cb) cb({ keys = keys.list() }) end)
end

-- ───────────────────────────────── the client API (every resource, the nuikit one included)

local mine = {}

--- Declare a key. Returns a handle with binding(), or nil when the declaration was refused.
function keys.define(def)
  if type(def) ~= 'table' or type(def.id) ~= 'string' or not def.id:match('^[%w_]+$') then
    NUI.log.error('nk.keys.define: id must be letters, digits and underscores')
    return nil
  end
  if mine[def.id] then
    NUI.log.error(('nk.keys.define: key "%s" is already declared'):format(def.id))
    return nil
  end
  if def.command ~= nil and (type(def.command) ~= 'string' or not def.command:match('^[%w_]+$')) then
    NUI.log.error('nk.keys.define: command must be letters, digits and underscores')
    return nil
  end
  local entry = { resource = RESOURCE, id = def.id, label = def.label or def.id, key = def.key or '', mapper = def.mapper or 'keyboard', command = def.command }
  mine[def.id] = true

  local cmd = commandName(entry)
  RegisterCommand(cmd, function() if def.onPress then def.onPress() end end, false)
  if not entry.command then
    RegisterCommand('-' .. cmd:sub(2), function() if def.onRelease then def.onRelease() end end, false)
  end
  RegisterKeyMapping(cmd, entry.label, entry.mapper, entry.key)

  if RESOURCE == RUNTIME then keys.store(RESOURCE, entry)
  else exports[RUNTIME]['keysDefine'](exports[RUNTIME], RESOURCE, entry) end

  local handle = {}
  function handle.binding() return current(entry) end
  return handle
end

if NUI then NUI.keys = keys end
return keys
