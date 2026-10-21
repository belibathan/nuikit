--[[
  effects.lua: what progressbar did around the bar, kept in Lua (docs/adapters/qb-progressbar.md).
  Animation (dict/anim/flags or a scenario `task`), one or two attached props, and the control set
  from `controlDisables`. Written from the documented data table; nothing here touches the page.
]]

Effects = {}

local CONTROLS = {
  disableMovement = { 30, 31, 32, 33, 34, 35, 36 },   -- walk, sprint
  disableCarMovement = { 63, 64, 71, 72 },            -- steer, accelerate, brake
  disableMouse = { 1, 2 },                            -- look
  disableCombat = { 24, 25, 37, 44, 45, 140, 141, 142, 257, 263, 264 },
}

local state = nil -- { props = {}, dict, controls }

local function load(requestFn, hasFn, key)
  requestFn(key)
  local tries = 0
  while not hasFn(key) and tries < 100 do
    tries = tries + 1
    Wait(10)
  end
  return hasFn(key)
end

local function attachProp(ped, p)
  if type(p) ~= 'table' or not p.model then return nil end
  local model = type(p.model) == 'number' and p.model or GetHashKey(p.model)
  if not load(RequestModel, HasModelLoaded, model) then return nil end
  local c = GetEntityCoords(ped)
  local obj = CreateObject(model, c.x, c.y, c.z, true, true, true)
  local bone = GetPedBoneIndex(ped, p.bone or 60309)
  local o, r = p.coords or {}, p.rotation or {}
  AttachEntityToEntity(obj, ped, bone, o.x or 0.0, o.y or 0.0, o.z or 0.0, r.x or 0.0, r.y or 0.0, r.z or 0.0, true, true, false, true, 1, true)
  SetModelAsNoLongerNeeded(model)
  return obj
end

--- Start the animation, props and control set for a bar's data table.
function Effects.start(data)
  Effects.stop()
  state = { props = {} }
  local ped = PlayerPedId()
  local a = data.animation
  if type(a) == 'table' then
    if a.animDict and a.anim then
      if load(RequestAnimDict, HasAnimDictLoaded, a.animDict) then
        TaskPlayAnim(ped, a.animDict, a.anim, 3.0, 1.0, -1, a.flags or 1, 0, false, false, false)
        state.dict, state.anim = a.animDict, a.anim
      end
    elseif a.task then
      TaskStartScenarioInPlace(ped, a.task, 0, true)
      state.scenario = true
    end
  end
  state.props[1] = attachProp(ped, data.prop)
  state.props[2] = attachProp(ped, data.propTwo)
  local ids = {}
  if type(data.controlDisables) == 'table' then
    for key, list in pairs(CONTROLS) do
      if data.controlDisables[key] then
        for _, id in ipairs(list) do ids[#ids + 1] = id end
      end
    end
  end
  if #ids > 0 and nk.controls then state.controls = nk.controls.disable(ids, { name = 'progressbar' }) end
end

--- Stop everything Effects.start began. Safe when nothing runs.
function Effects.stop()
  if not state then return end
  local s = state
  state = nil
  local ped = PlayerPedId()
  if s.dict then
    StopAnimTask(ped, s.dict, s.anim, 1.0)
    RemoveAnimDict(s.dict)
  end
  if s.scenario then ClearPedTasks(ped) end
  for _, obj in pairs(s.props) do
    if obj then DeleteObject(obj) end
  end
  if s.controls then s.controls:release() end
end
