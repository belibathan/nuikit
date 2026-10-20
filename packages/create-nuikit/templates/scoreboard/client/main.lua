-- {{name}}: client
-- The scoreboard lives in web/ (the scoreboard block); this file opens it and keeps it fresh from
-- server/main.lua while it's open. Read only: the page sends nothing back.
-- Lua → UI: surfaces nk.surface(name, opts)

-- A panel with the keyboard (the search takes typing); exclusive: it replaces other panels.
local board = nk.surface('scoreboard', { layer = 'panel', exclusive = true })
local latest = nil

RegisterNetEvent('{{name}}:data', function(data)
  latest = data
  if board:isOpen() then board:update(data) end
end)

local opened = 0 -- counts opens, so a quick close and reopen never leaves two refresh loops

local function open()
  -- open at once with what we have, then fill in from the server
  if not board:open(latest or { players = {}, max = 0 }) then return end
  opened = opened + 1
  local mine = opened
  TriggerServerEvent('{{name}}:request')
  CreateThread(function()
    while true do
      Wait(3000)
      if mine ~= opened or not board:isOpen() then return end
      TriggerServerEvent('{{name}}:request')
    end
  end)
end

-- /{{name}} or HOME toggles it (players can rebind it in Settings → Key Bindings → FiveM).
RegisterCommand('{{name}}', function()
  if board:isOpen() then board:close() else open() end
end, false)
RegisterKeyMapping('{{name}}', 'Scoreboard', 'keyboard', Config.key or 'HOME')
