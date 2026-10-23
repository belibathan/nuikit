--[[
  nuikit_esx_textui: esx_textui's public API, drawn by nk.intent.prompt (docs/adapters/esx-textui.md).

  Mechanism: stand-in. `provide 'esx_textui'` plus the two exports registered under esx_textui's name, so
  `ESX.TextUI` / `ESX.HideUI` and `exports['esx_textui']:TextUI(...)` land here.

  One prompt at a time, as the library: TextUI while shown updates it in place (scripts call it every
  500 ms from a loop; an identical call changes nothing), HideUI cancels it. A leading "[E]" becomes the
  key chip, `type` the prompt's tone.
]]

local LIB = 'esx_textui'
local STATUS = { success = 'success', error = 'error', info = 'info', warning = 'warning' }

local prompt = nil -- the open handle
local shown = nil  -- { label, keys, status } of what is on screen

--- "[E] Open" → keys { 'E' }, "Open". No key token: keys {} (so an update can clear a previous one).
local function parse(message)
  local key, rest = message:match('^%s*%[([^%]]+)%]%s*(.-)%s*$')
  if key and rest ~= '' then return rest, { key } end
  return message, {}
end

local function same(a, b)
  return a.label == b.label and a.status == b.status and (a.keys[1] or false) == (b.keys[1] or false)
end

local function TextUI(message, kind)
  if type(message) ~= 'string' then message = message ~= nil and tostring(message) or '' end
  if message == '' then return end
  local label, keys = parse(message)
  local next = { label = label, keys = keys, status = type(kind) == 'string' and STATUS[kind:lower()] or nil }
  if prompt and prompt:isOpen() then
    if shown and same(shown, next) then return end
    shown = next
    prompt:update({ label = label, keys = keys, status = next.status })
    return
  end
  shown = next
  prompt = nk.intent.prompt({ id = 'textui', label = label, keys = keys, status = next.status })
end

local function HideUI()
  if prompt and prompt:isOpen() then prompt:cancel() end
  prompt, shown = nil, nil
end

-- ───────────────────────────────── the library's API, by name

local API = { TextUI = TextUI, HideUI = HideUI }
for name, fn in pairs(API) do
  exports(name, fn)
  AddEventHandler(('__cfx_export_%s_%s'):format(LIB, name), function(setCB) setCB(fn) end)
end
