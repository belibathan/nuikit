-- nuikit_death: client
-- Presentation only. The medical resource owns last stand, death, timers, EMS alerts and respawn;
-- this file reads what it's doing and shows it. It never revives, respawns or alerts anyone.

local KEY_E, KEY_G = 38, 47 -- the controls the stock medical resources listen for

local screen = NUI.surface('death', { layer = 'system', input = 'none', hides = { 'hud' } })

Death = {}

local function started(resource) return GetResourceState(resource) == 'started' end
local function now() return GetGameTimer() end

--- A number from another resource's config file, e.g. `deathTime = 300` or `Timer = 60000 * 10`.
--- Read-only; nil when the file or key isn't there.
---@return number|nil
function Death.configNumber(resource, file, key)
  local src = LoadResourceFile(resource, file)
  if type(src) ~= 'string' then return nil end
  local expr = src:match('%f[%w_]' .. key:gsub('%.', '%%.') .. '%s*=%s*([%d%.%s%*]+)')
  if not expr then return nil end
  local n
  for part in expr:gmatch('[%d%.]+') do
    local v = tonumber(part)
    if v then n = (n or 1) * v end
  end
  return n
end

-- ───────────────────────────────── keys (mirrors of what the medical resource sees)

local keys = { held = 0, heldSince = nil, gPressed = false }

--- Called every frame while downed: how long E has been held, and whether G was just pressed.
--- Medical resources disable most controls while downed but re-enable E/G; check both forms.
function Death.watchKeys()
  local e = IsControlPressed(0, KEY_E) or IsDisabledControlPressed(0, KEY_E)
  if e then
    keys.heldSince = keys.heldSince or now()
    keys.held = now() - keys.heldSince
  else
    keys.heldSince, keys.held = nil, 0
  end
  if IsControlJustPressed(0, KEY_G) or IsDisabledControlJustPressed(0, KEY_G) then keys.gPressed = true end
end

--- G since the last read (consumed, so a press while it isn't offered doesn't count later).
local function takeG()
  local pressed = keys.gPressed
  keys.gPressed = false
  return pressed
end

-- ───────────────────────────────── medical resources → one snapshot
--
-- read() returns nil while alive, otherwise:
--   { phase = 'laststand'|'dead', seconds, total, estimated,
--     respawn = { key, available, progress, cost, wait },
--     ems = { key, state = 'available'|'requested'|'cooldown', seconds } }

local sources = {}

-- qbx_medical owns the state (statebag) and the timers (exports); qbx_ambulancejob draws the
-- prompts and listens for G. Its rules are mirrored exactly (client/setdownedstate.lua).
sources.qbx = function()
  local f = Config.fallback.qbx
  local amb = started('qbx_ambulancejob')
  local laststand = Death.configNumber('qbx_medical', 'config/client.lua', 'laststandReviveInterval') or f.laststand
  local death = Death.configNumber('qbx_medical', 'config/client.lua', 'deathTime') or f.death
  local helpBelow = Death.configNumber('qbx_ambulancejob', 'config/client.lua', 'laststandTimer') or f.helpBelow
  local cost = amb and (Death.configNumber('qbx_ambulancejob', 'config/shared.lua', 'checkInCost') or f.cost) or nil
  local requested = false

  return function(ctx)
    local state = LocalPlayer.state['qbx_medical:deathState']
    if state ~= 2 and state ~= 3 then
      requested = false
      return nil
    end
    local medical = exports.qbx_medical
    if state == 2 then
      local t = medical:GetLaststandTime() or 0
      local helpable = amb and t <= helpBelow and ctx.doctors > 0
      if helpable and ctx.g then requested = true end
      return {
        phase = 'laststand', seconds = t, total = laststand,
        ems = helpable and { key = 'G', state = requested and 'requested' or 'available' } or nil,
        helpable = helpable or nil,
      }
    end
    local t = medical:GetDeathTime() or 0
    local hold = medical:GetRespawnHoldTimeDeprecated() or 5 -- 5 → 1 while E is held
    -- qbx_ambulancejob advertises the timer while doctors are on duty, else "hold E"
    local available = not amb or t <= 0 or ctx.doctors == 0
    return {
      phase = 'dead', seconds = t, total = death,
      respawn = { key = 'E', available = available, progress = math.max(0, math.min(1, (5 - hold) / 4)), cost = cost },
    }
  end
end

-- qb-ambulancejob keeps its timers in locals, so they're mirrored from its config and the moment
-- the metadata changed (client/laststand.lua, client/dead.lua). Marked estimated.
sources.qb = function()
  local f = Config.fallback.qb
  local laststand = Death.configNumber('qb-ambulancejob', 'config.lua', 'Config.ReviveInterval') or f.laststand
  local helpBelow = Death.configNumber('qb-ambulancejob', 'config.lua', 'Config.MinimumRevive') or f.helpBelow
  local cost = Death.configNumber('qb-ambulancejob', 'config.lua', 'Config.BillCost') or f.cost
  local meta = {}
  local phase, since, total, requested = nil, 0, 0, false

  local function load(pd) meta = (pd and pd.metadata) or {} end
  RegisterNetEvent('QBCore:Player:SetPlayerData', load)
  RegisterNetEvent('QBCore:Client:OnPlayerUnload', function() meta = {} end)
  pcall(function() load(exports['qb-core']:GetCoreObject().Functions.GetPlayerData()) end)

  return function(ctx)
    local nextPhase = meta.isdead and 'dead' or meta.inlaststand and 'laststand' or nil
    if nextPhase ~= phase then
      local remaining = phase and math.max(0, total - (now() - since) / 1000) or 0
      if nextPhase == 'laststand' then
        total = laststand
      elseif nextPhase == 'dead' then
        -- qb's death timer starts from whatever was left of last stand
        total = phase == 'laststand' and math.floor(remaining) or 0
      end
      phase, since, requested = nextPhase, now(), false
    end
    if not phase then return nil end
    local t = math.max(0, math.ceil(total - (now() - since) / 1000))
    if phase == 'laststand' then
      local helpable = t <= helpBelow
      if helpable and ctx.g then requested = true end
      return {
        phase = 'laststand', seconds = t, total = laststand, estimated = true, helpable = helpable or nil,
        ems = helpable and { key = 'G', state = requested and 'requested' or 'available' } or nil,
      }
    end
    local available = t <= 0
    return {
      phase = 'dead', seconds = t, total = total, estimated = true,
      respawn = { key = 'E', available = available, progress = available and math.min(1, keys.held / (f.hold * 1000)) or 0, cost = cost },
    }
  end
end

-- esx_death (current ESX) exports its live state.
sources.esx_death = function()
  local hold = Death.configNumber('esx_death', 'config.lua', 'Config.HoldDuration')
  hold = hold and hold / 1000 or Config.fallback.esx.hold
  local early = Death.configNumber('esx_death', 'config.lua', 'Config.EarlyRespawnTimer')
  local bleed = Death.configNumber('esx_death', 'config.lua', 'Config.BleedoutTimer')
  local f = Config.fallback.esx
  local total = ((early or f.early * 1000) + (bleed or f.bleedout * 1000)) / 1000

  return function()
    local ok, s = pcall(function() return exports.esx_death:GetDeathState() end)
    if not ok or type(s) ~= 'table' or not s.dead then return nil end
    local wait = math.ceil(s.earlyRemaining or 0)
    local distress = math.ceil(s.distressRemaining or 0)
    return {
      phase = 'dead', seconds = math.ceil(s.remaining or 0), total = total,
      respawn = { key = 'E', available = wait <= 0, wait = wait > 0 and wait or nil, progress = wait <= 0 and math.min(1, keys.held / (hold * 1000)) or 0 },
      ems = { key = 'G', state = distress > 0 and 'cooldown' or 'available', seconds = distress > 0 and distress or nil },
    }
  end
end

-- esx_ambulancejob before esx_death: timers from its config, started by esx:onPlayerDeath.
sources.esx = function()
  local f = Config.fallback.esx
  local early = (Death.configNumber('esx_ambulancejob', 'config.lua', 'Config.EarlyRespawnTimer') or f.early * 1000) / 1000
  local bleed = (Death.configNumber('esx_ambulancejob', 'config.lua', 'Config.BleedoutTimer') or f.bleedout * 1000) / 1000
  local since, sent = nil, false
  AddEventHandler('esx:onPlayerDeath', function() since, sent = now(), false end)
  AddEventHandler('esx:onPlayerSpawn', function() since = nil end)
  AddEventHandler('playerSpawned', function() since = nil end)
  RegisterNetEvent('esx_ambulancejob:revive', function() since = nil end)

  return function(ctx)
    if not since then return nil end
    local elapsed = (now() - since) / 1000
    local wait = math.max(0, math.ceil(early - elapsed))
    if ctx.g then sent = true end
    return {
      phase = 'dead', seconds = math.max(0, math.ceil(early + bleed - elapsed)), total = early + bleed, estimated = true,
      respawn = { key = 'E', available = wait <= 0, wait = wait > 0 and wait or nil, progress = wait <= 0 and math.min(1, keys.held / (f.hold * 1000)) or 0 },
      ems = { key = 'G', state = sent and 'requested' or 'available' },
    }
  end
end

-- No medical resource: the game's own death. Nothing to press; the spawn manager decides.
sources.native = function()
  return function()
    if IsEntityDead(PlayerPedId()) then return { phase = 'dead' } end
    return nil
  end
end

local function detect()
  if Config.medical and Config.medical ~= 'auto' and sources[Config.medical] then return Config.medical end
  if started('qbx_medical') then return 'qbx' end
  if started('qb-ambulancejob') then return 'qb' end
  if started('esx_death') then return 'esx_death' end
  if started('esx_ambulancejob') then return 'esx' end
  return 'native'
end

Death.medical = detect()
local read = sources[Death.medical]()
local ctx = { doctors = 0 }

RegisterNetEvent('nuikit_death:doctors', function(n) ctx.doctors = tonumber(n) or 0 end)

-- ───────────────────────────────── screen

local current = nil   -- last snapshot (nil = alive)
local effect = nil    -- screen effect playing (Config.effects)

-- CEF draws over the game, so CSS can't touch the world behind it; GTA's own post effects can.
local function setEffect(phase)
  local want = phase and Config.effects and Config.effects[phase] or nil
  if want == effect then return end
  if effect then AnimpostfxStop(effect) end
  if want then AnimpostfxPlay(want, 0, true) end
  effect = want
end
local lastSent = nil
local doctorsAt = 0

--- Read the medical resource once and update the screen. Exposed for tests.
---@return table|nil snapshot
function Death.update()
  ctx.g = takeG()
  local snap = read(ctx)
  if snap then
    local text = Config.text[snap.phase] or {}
    snap.title, snap.subtitle = text.title, text.subtitle
    snap.medical = Death.medical
  end
  local was = current and current.phase
  current = snap

  if snap and snap.phase ~= was then
    if not was and Death.medical == 'qbx' then TriggerServerEvent('nuikit_death:doctors') doctorsAt = now() end
    -- every nuikit surface with blockedBy = { 'dead' } (the pause menu, shops…) now refuses to open
    NUI.state('dead', snap.phase)
    setEffect(snap.phase)
  elseif not snap and was then
    NUI.state('dead', false)
    setEffect(nil)
    keys.gPressed, keys.held, keys.heldSince = false, 0, nil
  elseif snap and Death.medical == 'qbx' and now() - doctorsAt > 60000 then
    -- qbx_ambulancejob refreshes its doctor count once a minute; so do we
    doctorsAt = now()
    TriggerServerEvent('nuikit_death:doctors')
  end

  if snap then
    local encoded = json.encode(snap)
    if encoded ~= lastSent then
      lastSent = encoded
      if screen:isOpen() then screen:update(snap) else screen:open(snap) end
    end
  elseif screen:isOpen() then
    lastSent = nil
    screen:close()
  end
  return snap
end

function Death.isDown() return current ~= nil end

AddEventHandler('onClientResourceStop', function(resource)
  if resource == GetCurrentResourceName() then setEffect(nil) end
end)
exports('isDown', Death.isDown)

-- Keys need every frame, but only while downed.
CreateThread(function()
  while true do
    if current then
      Death.watchKeys()
      Wait(0)
    else
      Wait(250)
    end
  end
end)

CreateThread(function()
  while true do
    Death.update()
    Wait(current and 200 or 500)
  end
end)
