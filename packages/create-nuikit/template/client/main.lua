-- {{name}}: client
-- Lua → UI:  NUI.send(event, data)          · UI → Lua:  NUI.on(callback, fn) ↔ fetchNui()
-- Surfaces:  NUI.surface(name, opts)         · nuikit owns focus, cursor, stacking and Escape
-- Docs: https://github.com/belibathan/nuikit

-- Declare every piece of UI once. Layers stack hud < world < panel < modal < system,
-- and focus always goes to the top surface that takes input, across every nuikit resource.
local hud = NUI.surface('hud', { layer = 'hud' })                                    -- no input
local menu = NUI.surface('menu', { layer = 'panel', exclusive = true, blockedBy = { 'dead' } })
local confirm = NUI.surface('confirm', { layer = 'modal' })                          -- above the menu

hud:open()

-- /{{name}} or F7 toggles the menu (players can rebind it in Settings → Key Bindings → FiveM).
RegisterCommand('{{name}}', function() menu:toggle() end, false)
RegisterKeyMapping('{{name}}', 'Open {{name}}', 'keyboard', 'F7')

local actions = {
  heal = function(ped) SetEntityHealth(ped, GetEntityMaxHealth(ped)) end,
  armor = function(ped) SetPedArmour(ped, 100) end,
  hurt = function(ped) ApplyDamageToPed(ped, 40, false) end,
}

local function run(id)
  actions[id](PlayerPedId())
  NUI.notify({ title = 'Done', description = ('You picked %s'):format(id), type = 'success' })
end

-- Whatever you return is what `await fetchNui('menu:select', { id })` resolves with in React.
NUI.on('menu:select', function(data)
  if not actions[data.id] then return { ok = false } end
  if data.id == 'armor' then
    -- A modal on top of the menu: it takes focus, and Escape closes it first.
    confirm:open({ id = 'armor', title = 'Buy body armor?', price = 500 })
    return { ok = true }
  end
  run(data.id)
  menu:close()
  return { ok = true }
end)

NUI.on('confirm:answer', function(data)
  confirm:close()
  if data.yes then
    run(data.id)
    menu:close()
  end
  return { ok = true }
end)

-- Stream vitals to the HUD, only when they change.
CreateThread(function()
  local last = {}
  while true do
    local ped = PlayerPedId()
    local v = {
      health = math.max(0, GetEntityHealth(ped) - 100),
      armor = GetPedArmour(ped),
    }
    if v.health ~= last.health or v.armor ~= last.armor then
      NUI.send('hud:vitals', v)
      last = v
    end
    -- Shared with every nuikit resource: surfaces with blockedBy = { 'dead' } won't open.
    local dead = IsEntityDead(ped)
    if dead ~= last.dead then NUI.state('dead', dead) end
    last.dead = dead
    Wait(250)
  end
end)
