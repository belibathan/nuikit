--[[
  nuikit (client): the player's UI preferences, and the server theme for pages nuikit.lua can't
  message (overrides such as ox_lib's UI, and the chat theme).

  Preferences (accessibility, never a different theme), saved per player in KVP:
    scale          0.85–1.25  UI size, on top of the theme's --nk-scale
    reducedMotion  boolean    no animations or transitions
    highContrast   boolean    maximum-contrast text and borders, darker HUD surfaces
  Other resources: NUI.prefs.get() / NUI.prefs.set({ scale = 1.1 }) (nuikit.lua), or the local events
  below. Players: /nuikit scale 1.1 · /nuikit motion off · /nuikit contrast on · /nuikit reset

  Events (local, client side)
    nuikit:prefs:changed (prefs, to?)  to every resource when prefs change (to = nil), or to one
                                       resource answering its request
    nuikit:prefs:request (resource)    ask for nuikit:prefs:changed (nuikit.lua does on start)
    nuikit:prefs:set (patch)       change prefs (what NUI.prefs.set does)

  NUI callback https://nuikit/theme (any page may call it)
    { hash = nil }                 → { hash, theme, prefs } now
    { hash = <last>, wait = true } → answers when the theme or prefs change (long-poll, ≤ 25 s)
]]

local KVP = 'nuikit:prefs'
local DEFAULTS = { scale = 1.0, reducedMotion = false, highContrast = false }

local function normalize(p)
  p = type(p) == 'table' and p or {}
  local scale = tonumber(p.scale) or 1.0
  if scale < 0.85 then scale = 0.85 elseif scale > 1.25 then scale = 1.25 end
  return {
    scale = math.floor(scale * 100 + 0.5) / 100,
    reducedMotion = p.reducedMotion == true,
    highContrast = p.highContrast == true,
  }
end

local function load()
  local raw = GetResourceKvpString(KVP)
  if not raw or raw == '' then return normalize(DEFAULTS) end
  local ok, data = pcall(json.decode, raw)
  return normalize(ok and data or nil)
end

local prefs = load()
local theme = GlobalState.nuikitTheme

-- ───────────────────────────────── theme for override pages (long-poll)

local function hash()
  local t = type(theme) == 'table' and theme.hash or 'css'
  return ('%s:%s:%s:%s'):format(t, prefs.scale, prefs.reducedMotion and 1 or 0, prefs.highContrast and 1 or 0)
end

local function payload()
  local p = { hash = hash(), prefs = prefs }
  if type(theme) == 'table' and theme.vars then
    p.theme = theme
  else
    -- server couldn't compile (or an older server script): the page compiles theme.css itself
    p.css = LoadResourceFile(GetCurrentResourceName(), 'theme.css')
  end
  return p
end

local pending = {}

local function flush()
  local list = pending
  pending = {}
  if #list == 0 then return end
  local p = payload()
  for _, entry in ipairs(list) do
    if not entry.done then
      entry.done = true
      entry.cb(p)
    end
  end
end

RegisterNUICallback('theme', function(data, cb)
  data = type(data) == 'table' and data or {}
  local current = hash()
  if not data.wait or data.hash ~= current then
    cb(payload())
    return
  end
  local entry = { cb = cb, done = false }
  pending[#pending + 1] = entry
  SetTimeout(25000, function()
    if entry.done then return end
    entry.done = true
    for i, e in ipairs(pending) do
      if e == entry then table.remove(pending, i) break end
    end
    cb({ hash = current, unchanged = true })
  end)
end)

-- `nuikit theme reload` on the server: GlobalState replicates, every waiting page repaints.
AddStateBagChangeHandler('nuikitTheme', 'global', function(_, _, value)
  theme = value
  flush()
end)

-- ───────────────────────────────── preferences

local function broadcast()
  TriggerEvent('nuikit:prefs:changed', prefs)
  flush()
end

--- The player's UI preferences.
---@return { scale: number, reducedMotion: boolean, highContrast: boolean }
local function getPrefs()
  return { scale = prefs.scale, reducedMotion = prefs.reducedMotion, highContrast = prefs.highContrast }
end

--- Change some preferences (missing keys keep their value). Saved and applied to every UI.
---@param patch table
local function setPrefs(patch)
  if type(patch) ~= 'table' then return getPrefs() end
  local merged = getPrefs()
  for k, v in pairs(patch) do merged[k] = v end
  prefs = normalize(merged)
  SetResourceKvp(KVP, json.encode(prefs))
  broadcast()
  return getPrefs()
end

exports('getPrefs', getPrefs)
exports('setPrefs', setPrefs)

AddEventHandler('nuikit:prefs:set', function(patch) setPrefs(patch) end)
AddEventHandler('nuikit:prefs:request', function(from) TriggerEvent('nuikit:prefs:changed', prefs, from) end)

local function say(msg)
  TriggerEvent('chat:addMessage', { args = { 'nuikit', msg } })
end

local function show()
  say(('UI scale %s · motion %s · contrast %s'):format(prefs.scale, prefs.reducedMotion and 'off' or 'on', prefs.highContrast and 'high' or 'normal'))
end

local on = { on = true, ['true'] = true, ['1'] = true, yes = true, high = true }

RegisterCommand('nuikit', function(_, args)
  local sub, value = args[1], args[2]
  if sub == 'theme' then
    TriggerServerEvent('nuikit:command', args) -- the server checks the ace
  elseif sub == 'scale' and tonumber(value) then
    setPrefs({ scale = tonumber(value) }) show()
  elseif sub == 'motion' and value then
    setPrefs({ reducedMotion = not on[value] }) show()
  elseif sub == 'contrast' and value then
    setPrefs({ highContrast = on[value] == true }) show()
  elseif sub == 'reset' then
    setPrefs(DEFAULTS) show()
  else
    show()
    say('/nuikit scale 0.85–1.25 · /nuikit motion on|off · /nuikit contrast on|off · /nuikit reset')
  end
end, false)

-- Resources that started before this one asked already; answer them now.
broadcast()
