-- {{name}} — client
-- Lua → UI:  NUI.send(event, data)          · UI → Lua:  NUI.on(callback, fn) ↔ fetchNui()
-- Docs: https://github.com/belibathan/nuikit

-- Open the menu with /{{name}} or F7 (players can rebind it in Settings → Key Bindings → FiveM).
RegisterCommand('{{name}}', function() NUI.open() end, false)
RegisterKeyMapping('{{name}}', 'Open {{name}}', 'keyboard', 'F7')

-- Whatever you return is what `await fetchNui('menu:select', { id })` resolves with in React.
NUI.on('menu:select', function(data)
  local ped = PlayerPedId()
  if data.id == 'heal' then
    SetEntityHealth(ped, GetEntityMaxHealth(ped))
  elseif data.id == 'armor' then
    SetPedArmour(ped, 100)
  elseif data.id == 'hurt' then
    ApplyDamageToPed(ped, 40, false)
  end
  NUI.notify({ title = 'Done', description = ('You picked %s'):format(data.id), type = 'success' })
  NUI.close()
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
    Wait(250)
  end
end)
