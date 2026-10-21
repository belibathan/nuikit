--[[
  nuikit_qb_drawtext: qb-core's DrawText on the `prompt` intent.  MIT · https://github.com/belibathan/nuikit

  Clean-room, from docs/adapters/qb-drawtext.md. A listener for the four events (client and server):
    qb-core:client:DrawText(message, position?)  → nk.prompt (one, replaced when drawn again)
    qb-core:client:ChangeText(message, position?) → update
    qb-core:client:HideText()                     → cancel
    qb-core:client:KeyPressed()                   → update { pressed = true }, hidden ~500 ms later
  The exports (exports['qb-core']:DrawText …) draw on qb-core's own page: the silencer page in
  ../nuikit_qb_notify/override forwards those messages as the `nuikit_qb:page` event; the mapping below
  (a string `text`/`message` + `position`, `action` naming the call) is a guess until a message log is recorded.
]]

local debug = GetConvarInt('nuikit_debug', 0) == 1
local function log(...)
  if debug then print('^5[nuikit-qb:drawtext]^7', ...) end
end

local POSITION = { left = 'center-left', right = 'center-right', top = 'top-center' }
local current = nil -- the prompt handle
local hideAt = 0

--- "[E] Open garage" → { 'E' }, "Open garage"; "~INPUT_CONTEXT~ Open" → { 'E' }, "Open".
local function parse(message)
  local text = tostring(message or '')
  local key, rest = text:match('^%s*%[([^%]]+)%]%s*(.-)%s*$')
  if key and rest ~= '' then return { key }, rest end
  local input, rest2 = text:match('^%s*~INPUT_([%w_]+)~%s*(.-)%s*$')
  if input and rest2 ~= '' then return { input == 'CONTEXT' and 'E' or input }, rest2 end
  return nil, text
end

local function props(message, position)
  local keys, label = parse(message)
  local p = { label = label, position = POSITION[type(position) == 'string' and position:lower() or 'left'] or 'center-left', meta = { library = 'qb-core' } }
  if keys then p.keys = keys end
  return p
end

local function DrawText(message, position)
  local p = props(message, position)
  p.id = 'drawtext'
  p.pressed = false
  hideAt = 0
  current = nk.prompt(p) -- same id: replaces the one shown
  log('draw', p.label)
end

local function ChangeText(message, position)
  if not current or not current:isOpen() then return DrawText(message, position) end
  local p = props(message, position)
  if not p.keys then p.keys = {} end
  current:update(p)
end

local function HideText()
  if not current then return end
  local h = current
  current = nil
  h:cancel('close')
end

local function KeyPressed()
  if not current or not current:isOpen() then return end
  current:update({ pressed = true })
  local h = current
  local at = GetGameTimer()
  hideAt = at
  SetTimeout(500, function()
    if current == h and hideAt == at then HideText() end
  end)
end

RegisterNetEvent('qb-core:client:DrawText', function(message, position) DrawText(message, position) end)
RegisterNetEvent('qb-core:client:ChangeText', function(message, position) ChangeText(message, position) end)
RegisterNetEvent('qb-core:client:HideText', function() HideText() end)
RegisterNetEvent('qb-core:client:KeyPressed', function() KeyPressed() end)

-- From the silencer page over qb-core's html (unproven mapping; see the header).
AddEventHandler('nuikit_qb:page', function(msg)
  if type(msg) ~= 'table' then return end
  local action = type(msg.action) == 'string' and msg.action:upper() or ''
  local text = msg.text or msg.message
  if action:find('HIDE') then HideText()
  elseif action:find('KEY') or action:find('PRESS') then KeyPressed()
  elseif action:find('CHANGE') and type(text) == 'string' then ChangeText(text, msg.position)
  elseif action:find('DRAW') and type(text) == 'string' then DrawText(text, msg.position)
  end
end)

exports('DrawText', DrawText)
exports('ChangeText', ChangeText)
exports('HideText', HideText)
exports('KeyPressed', KeyPressed)
