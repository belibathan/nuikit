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
local theme = nil -- the last GlobalState.nuikitTheme seen (state bag handler, or read when asked)

--- The server's compiled theme, read when a page asks: at this script's start GlobalState may not
--- have replicated yet, and the change handler only fires for later changes (0.7.0 test, F4).
local function compiled()
  if type(theme) == 'table' and theme.vars then return theme end
  local value = GlobalState.nuikitTheme
  if type(value) == 'table' and value.vars then theme = value end
  return type(theme) == 'table' and theme.vars and theme or nil
end

-- ───────────────────────────────── theme for override pages (long-poll)

local function hash()
  local c = compiled()
  local t = c and c.hash or 'css'
  return ('%s:%s:%s:%s'):format(t, prefs.scale, prefs.reducedMotion and 1 or 0, prefs.highContrast and 1 or 0)
end

local function payload()
  local p = { hash = hash(), prefs = prefs }
  local c = compiled()
  if c then
    p.theme = c
  else
    -- server couldn't compile (or an older server script): the page compiles theme.css itself.
    -- This is the client's copy from when nuikit started, so it can be older than the server's file.
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

-- ───────────────────────────────── GTA's radar, after the HUD that placed it stops

-- A HUD that moves GTA's radar (nuikit_hud's ring) says so with `nuikit:minimap:placed`. When it
-- stops, this resource puts the radar back: a stopping resource can't wait for GTA to re-read the
-- positions, so its own restore never took (0.7.0 test, F3: the radar stayed round, top right).
-- A restart places it again within the wait, and then nothing is done here.
local STOCK_RADAR = {
  minimap = { -0.0045, 0.002, 0.150, 0.188888 },
  minimap_mask = { 0.020, 0.032, 0.111, 0.159 },
  minimap_blur = { -0.03, 0.022, 0.266, 0.237 },
}
local radarOwner, radarClaims = nil, 0

AddEventHandler('nuikit:minimap:placed', function()
  radarOwner = GetInvokingResource()
  radarClaims = radarClaims + 1
end)
-- The radar's mask texture lives here, not in the HUD: a runtime txd dies with the resource that made
-- it, and GTA kept drawing the radar through the dead one after a HUD restart (the ring stayed empty
-- until the pause map reloaded it; 0.7.0 baseline, A2). This resource keeps running, so the texture
-- outlives HUD restarts. `kind` is 'circle' or 'square'; `aspect` the radar box's width / height.
local maskTxd, maskMade, maskApplied = nil, {}, nil
local function maskPixel(kind, w, h, x, y, aspect)
  local px = ((x + 0.5) / w - 0.5) * h * aspect
  local py = (y + 0.5) - h / 2.0
  local inside = kind == 'circle' and (h / 2.0 - math.sqrt(px * px + py * py)) or (h / 2.0 - math.abs(px))
  return math.floor(math.max(0.0, math.min(1.0, inside + 0.5)) * 255 + 0.5)
end
AddEventHandler('nuikit:minimap:mask', function(kind, aspect)
  kind = kind == 'circle' and 'circle' or 'square'
  aspect = tonumber(aspect) or 1.0
  local name = ('%s_%d'):format(kind, math.floor(aspect * 1000 + 0.5))
  if not maskMade[name] then
    maskTxd = maskTxd or CreateRuntimeTxd('nuikit_radarmask')
    local h = kind == 'circle' and 128 or 32
    local w = math.floor(h * aspect + 0.5)
    local tex = CreateRuntimeTexture(maskTxd, name, w, h)
    for y = 0, h - 1 do
      for x = 0, w - 1 do
        local a = maskPixel(kind, w, h, x, y, aspect)
        SetRuntimeTexturePixel(tex, x, y, a, a, a, a)
      end
    end
    CommitRuntimeTexture(tex)
    maskMade[name] = true
  end
  if maskApplied == name then return end -- already in place: swapping it live blanks the radar
  RemoveReplaceTexture('platform:/textures/graphics', 'radarmasksm')
  AddReplaceTexture('platform:/textures/graphics', 'radarmasksm', 'nuikit_radarmask', name)
  maskApplied = name
end)

-- GTA's health and armour arcs around the radar. The HUD draws vitals itself and asks for them hidden.
-- The minimap scaleform handle is held here for the session: a handle requested by the HUD was freed
-- when the HUD stopped, which unloaded GTA's radar movie (empty ring until the pause map reloaded it;
-- 0.7.0 baseline A2).
local radarMovie
AddEventHandler('nuikit:minimap:bars', function(show)
  radarMovie = radarMovie or RequestScaleformMovie('minimap')
  if not HasScaleformMovieLoaded(radarMovie) then return end
  BeginScaleformMovieMethod(radarMovie, 'SETUP_HEALTH_ARMOUR')
  ScaleformMovieMethodAddParamInt(show and 1 or 3)
  EndScaleformMovieMethod()
end)

AddEventHandler('nuikit:minimap:released', function()
  if GetInvokingResource() == radarOwner then radarOwner = nil end
end)

AddEventHandler('onClientResourceStop', function(resource)
  if not radarOwner or resource ~= radarOwner then return end
  radarOwner = nil
  local claim = radarClaims
  CreateThread(function()
    Wait(1000)
    if radarClaims ~= claim then return end -- restarted: it placed the radar again
    for name, v in pairs(STOCK_RADAR) do
      SetMinimapComponentPosition(name, 'L', 'B', v[1], v[2], v[3], v[4])
    end
    SetMinimapClipType(0)
    RemoveReplaceTexture('platform:/textures/graphics', 'radarmasksm')
    maskApplied = nil
    TriggerEvent('nuikit:minimap:bars', true)
    SetBlipAlpha(GetNorthRadarBlip(), 255)
    SetRadarBigmapEnabled(true, false)
    Wait(50)
    SetRadarBigmapEnabled(false, false)
    Wait(250)
    if IsBigmapActive() then SetRadarBigmapEnabled(false, false) end
  end)
end)

-- Resources that started before this one asked already; answer them now.
broadcast()
