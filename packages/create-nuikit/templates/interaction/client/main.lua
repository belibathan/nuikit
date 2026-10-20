-- {{name}}: client
-- The interaction block lives in web/; this file does the work it draws:
--   targeting: hold Config.key, aim (a raycast from the camera), and the eye shows the options of
--              what you aim at (Config.targets); choose with a click (cursor) or the scroll wheel.
--   prompts:   near a Config.points place, "[E] Open the fridge" shows; press or hold the key.
-- Anything marked `server = true` asks server/main.lua, which checks it again before acting.
-- Lua → UI: surfaces nk.surface(name, opts) · UI → Lua: nk.on(callback, fn) ↔ fetchNui()

local target = nk.surface('target', { layer = 'world', input = 'none' })
local pick = nk.surface('target-pick', { layer = 'panel', input = 'cursor' }) -- the cursor, while choosing
local prompts = nk.surface('prompts', { layer = 'hud', input = 'none' })

-- ───────────────────────────────── asking the server

local pending, seq = {}, 0

--- Ask server/main.lua and wait for its answer (or nil after 5 s).
local function request(name, data)
  seq = seq + 1
  local id, p = seq, promise.new()
  pending[id] = p
  TriggerServerEvent('{{name}}:req', id, name, data)
  SetTimeout(5000, function()
    if pending[id] then pending[id] = nil; p:resolve(nil) end
  end)
  return Citizen.Await(p)
end

RegisterNetEvent('{{name}}:res', function(id, result)
  local p = pending[id]
  if p then pending[id] = nil; p:resolve(result) end
end)

-- ───────────────────────────────── what can be targeted

for _, t in ipairs(Config.targets) do
  if t.models then
    t.hashes = {}
    for _, m in ipairs(t.models) do t.hashes[type(m) == 'number' and m or GetHashKey(m)] = true end
  end
end

--- The options for an entity (Config.targets) and what to call it, or nil.
local function optionsFor(entity)
  if not entity or entity == 0 or not DoesEntityExist(entity) then return nil end
  local kind, model = GetEntityType(entity), GetEntityModel(entity)
  local player = kind == 1 and IsPedAPlayer(entity)
  local out, label = {}, nil
  for _, t in ipairs(Config.targets) do
    local match = (t.type == 'vehicle' and kind == 2) or (t.type == 'player' and player)
      or (t.type == 'ped' and kind == 1 and not player) or (t.hashes and t.hashes[model])
    if match then
      label = label or t.label
      for _, o in ipairs(t.options) do
        if not o.canInteract or o.canInteract(entity) then out[#out + 1] = o end
      end
    end
  end
  if #out == 0 then return nil end
  if not label and kind == 2 then label = GetLabelText(GetDisplayNameFromVehicleModel(model)) end
  if not label and player then label = GetPlayerName(NetworkGetPlayerIndexFromPed(entity)) end
  return out, label
end

--- What the camera points at within Config.distance of the player: the entity, or 0.
local function aim()
  local cam, rot = GetGameplayCamCoord(), GetGameplayCamRot(2)
  local x, z = math.rad(rot.x), math.rad(rot.z)
  local dir = vector3(-math.sin(z) * math.abs(math.cos(x)), math.cos(z) * math.abs(math.cos(x)), math.sin(x))
  local to = cam + dir * (Config.distance + 10.0)
  local ped = PlayerPedId()
  local ray = StartExpensiveSynchronousShapeTestLosProbe(cam.x, cam.y, cam.z, to.x, to.y, to.z, 511, ped, 4)
  local _, hit, at, _, entity = GetShapeTestResult(ray)
  if hit ~= 1 or #(GetEntityCoords(ped) - at) > Config.distance then return 0 end
  return entity
end

-- ───────────────────────────────── targeting

local targeting, picking = false, false
local current = {} -- { entity, options, label, active }

--- What the page shows (web/src/components/blocks/interaction/nui.ts: TargetData).
local function view()
  local options = {}
  for i, o in ipairs(current.options or {}) do
    options[i] = { id = o.id, label = o.label, icon = o.icon, description = o.description, disabled = o.disabled }
  end
  local wheel = Config.select == 'wheel'
  return {
    label = current.label,
    options = options,
    active = wheel and current.active and current.active - 1 or nil,
    picking = picking or nil,
    hint = #options > 0 and not picking and (wheel and 'Scroll, then click' or 'Click to choose') or nil,
  }
end

local function stop()
  targeting, picking = false, false
  if pick:isOpen() then pick:close() end
end

--- Do an option: a client event, or ask the server (which checks it again). Ends targeting.
local function run(o)
  if not o or o.disabled then return { ok = false, error = "You can't do that." } end
  local entity = current.entity
  if o.server then
    if not NetworkGetEntityIsNetworked(entity) then return { ok = false, error = "That can't be used from here." } end
    local res = request('select', { id = o.id, net = NetworkGetNetworkIdFromEntity(entity) })
    if not res or not res.ok then return { ok = false, error = res and res.error or "The server didn't answer." } end
  elseif o.event then
    TriggerEvent(o.event, entity, o.id)
  end
  stop()
  return { ok = true }
end

--- Move the wheel's highlight by `dir`, skipping disabled options.
local function step(dir)
  local n = #current.options
  local i = current.active or 1
  for _ = 1, n do
    i = (i - 1 + dir) % n + 1
    if not current.options[i].disabled then break end
  end
  current.active = i
end

local function loop()
  target:open(view())
  local last, nextRay = nil, 0
  while targeting or picking do
    if picking then
      if not pick:isOpen() then -- Escape, or chosen
        picking = false
        if targeting then target:update(view()) end
      end
    else
      DisablePlayerFiring(PlayerId(), true)
      for _, c in ipairs({ 24, 25, 14, 15, 16, 17, 140, 141, 142 }) do DisableControlAction(0, c, true) end
      if GetGameTimer() >= nextRay then
        nextRay = GetGameTimer() + 50
        local entity = aim()
        local options, label = optionsFor(entity)
        local key = options and (entity .. ':' .. #options) or ''
        if key ~= last then
          last = key
          current = { entity = entity, options = options, label = label, active = 1 }
          if options and options[1].disabled then step(1) end
          target:update(view())
        end
      end
      if current.options then
        if Config.select == 'wheel' then
          local dir = IsDisabledControlJustPressed(0, 14) and 1 or IsDisabledControlJustPressed(0, 15) and -1 or 0
          if dir ~= 0 then step(dir); target:update(view()) end
          if IsDisabledControlJustPressed(0, 24) then
            local res = run(current.options[current.active])
            if not res.ok then nk.notify({ title = res.error, type = 'error' }) end
          end
        elseif IsDisabledControlJustPressed(0, 24) then
          picking = true
          pick:open()
          target:update(view())
        end
      end
    end
    Wait(0)
  end
  current = {}
  target:close()
end

RegisterCommand('+{{name}}_target', function()
  if targeting or picking or IsPauseMenuActive() or IsNuiFocused() then return end
  targeting = true
  CreateThread(loop)
end, false)
-- Let go: targeting ends, or, while choosing, ends when the cursor goes (Escape or a click).
RegisterCommand('-{{name}}_target', function() targeting = false end, false)
RegisterKeyMapping('+{{name}}_target', 'Target (hold)', 'keyboard', Config.key or 'LMENU')

-- The page's click on an option (only while picking).
nk.on('interaction:select', function(data)
  if not picking then return { ok = false, error = 'Hold the target key and click again.' } end
  for _, o in ipairs(current.options or {}) do
    if o.id == data.id then return run(o) end
  end
  return { ok = false, error = "That option isn't there any more." }
end)

-- ───────────────────────────────── key prompts

local KEYS = { E = 38, F = 23, G = 47, H = 74, K = 311, L = 182, X = 73, Y = 246, Z = 20 }

local function fire(p)
  if p.server then
    CreateThread(function()
      local res = request('use', { id = p.id })
      if not res or not res.ok then nk.notify({ title = res and res.error or "The server didn't answer.", type = 'error' }) end
    end)
  elseif p.event then
    TriggerEvent(p.event, p.id)
  end
end

CreateThread(function()
  local shown, holding, since = nil, nil, 0
  while true do
    local pos = GetEntityCoords(PlayerPedId())
    local near = {}
    for _, p in ipairs(Config.points) do
      if #(pos - p.coords) <= p.radius then near[#near + 1] = p end
    end
    if #near == 0 or targeting or picking then
      if prompts:isOpen() then prompts:close() end
      shown, holding = nil, nil
      Wait(#near == 0 and 400 or 0)
    else
      table.sort(near, function(a, b) return #(pos - a.coords) < #(pos - b.coords) end)
      local progress = 0
      for _, p in ipairs(near) do
        local control = KEYS[p.key]
        if control and p.hold then
          if IsControlPressed(0, control) then
            if holding ~= p then holding, since = p, GetGameTimer() end
          elseif holding == p then
            holding = nil
          end
        elseif control and IsControlJustReleased(0, control) then
          fire(p)
        end
      end
      if holding then
        progress = math.min(1, (GetGameTimer() - since) / holding.hold)
        if progress >= 1 then fire(holding); holding, progress = nil, 0 end
      end
      -- What the page shows (nui.ts: PromptsData), sent when it changes (the hold ~20 times a second).
      local list, key = {}, ''
      for i, p in ipairs(near) do
        list[i] = { id = p.id, keys = p.key, label = p.label, icon = p.icon, description = p.description, hold = p.hold,
          progress = p.hold and (holding == p and progress or 0) or nil, active = #near > 1 and i == 1 or nil }
        key = key .. p.id .. ','
      end
      key = key .. math.floor(progress * 20)
      if key ~= shown then
        shown = key
        local data = { prompts = list, position = Config.promptPosition }
        if prompts:isOpen() then prompts:update(data) else prompts:open(data) end
      end
      Wait(0)
    end
  end
end)

-- ───────────────────────────────── the example's own actions (replace with yours)

AddEventHandler('{{name}}:trunk', function(vehicle)
  if GetVehicleDoorAngleRatio(vehicle, 5) > 0.1 then SetVehicleDoorShut(vehicle, 5, false) else SetVehicleDoorOpen(vehicle, 5, false, false) end
end)
AddEventHandler('{{name}}:wave', function()
  nk.notify({ title = 'You wave.' })
end)
AddEventHandler('{{name}}:atm', function()
  nk.notify({ title = 'Hook your bank here', description = 'npm create nuikit -- -t bank' })
end)
AddEventHandler('{{name}}:fridge', function()
  nk.notify({ title = 'Nothing but an old sandwich.' })
end)
RegisterNetEvent('{{name}}:notice', function(title)
  nk.notify({ title = title })
end)
