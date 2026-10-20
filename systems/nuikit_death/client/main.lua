-- nuikit_death: client
-- Presentation only. The medical resource owns last stand, death, timers, EMS alerts and respawn;
-- this file reads what it's doing and shows it. It never revives, respawns or alerts anyone.

local KEY_E, KEY_G = 38, 47 -- the controls the stock medical resources listen for

local screen = NUI.surface('death', { layer = 'system', input = 'none', hides = { 'hud' } })
-- How far E has been held, 0–1, on its own channel: the page glides it (useFollow), so the bar moves
-- smoothly whatever steps the medical resource counts in, and the screen's data doesn't churn.
local holdBar = NUI.stream('death:hold', { rate = 30, precision = 0.01 })

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

local keys = { held = 0, heldSince = nil, full = nil, gPressed = false }
local current = nil   -- last snapshot (nil = alive)
-- What the detected medical resource adds to the keys (filled in below): `hold`, the ms E must be held
-- before it respawns (a number, or a function of when the press started), and `frame`, run every
-- frame. A resource that only looks at E on its own ticks (qbx_medical) sets `ticks`, and `frame`
-- returns true on the frame a tick happened.
local source = {}

--- Called every frame while downed: how long E has been held, and whether G was just pressed.
--- Medical resources disable most controls while downed but re-enable E/G; check both forms.
function Death.watchKeys()
  local ticked = source.frame and source.frame() or false
  local e = IsControlPressed(0, KEY_E) or IsDisabledControlPressed(0, KEY_E)
  if e then
    if not keys.heldSince then
      keys.heldSince = now()
      keys.full = type(source.hold) == 'function' and source.hold(keys.heldSince) or source.hold
    end
  elseif not source.ticks or ticked then
    -- Released. A ticking resource only sees E at its ticks: a release and re-press between two
    -- ticks doesn't reset its count, so the hold (and the bar) only ends at a tick that finds E up.
    keys.heldSince, keys.full = nil, nil
  end
  keys.held = keys.heldSince and now() - keys.heldSince or 0
  if IsControlJustPressed(0, KEY_G) or IsDisabledControlJustPressed(0, KEY_G) then keys.gPressed = true end
  -- the bar: nuikit's own hold time in ms against the resource's, never the resource's own counter
  local respawn = current and not current.treatment and current.respawn
  local full = respawn and respawn.available and keys.full
  holdBar:push(full and full > 0 and math.min(1, keys.held / full) or 0)
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
--     respawn = { key, available, cost, wait },
--     ems = { key, state = 'available'|'requested'|'cooldown', seconds },
--     treatment = true while a hospital bed treats the player (the screen hides; still down) }
-- and, as a second value, the `source` extras above. How far E is held goes out on 'death:hold'.

local sources = {}

-- qbx_ambulancejob's hospital bed (client/hospital.lua). Respawning, or checking in, sends the
-- client 'qbx_ambulancejob:client:checkedIn' (hospitalName, bedIndex); an EMS putting you in a bed
-- sends 'qbx_ambulancejob:client:putPlayerInBed' (same arguments). The client then fades out, lays
-- the ped on the bed with the animation below and, after a respawn, treats for config.aiHealTimer
-- seconds before the server revives (deathState back to 1). The player stays dead (3) all that time.
local BED_DICT, BED_ANIM = 'anim@gangops@morgue@table@', 'body_search'
local BED_GRACE = 10000 -- ms from the event to the animation (fade out, resurrect, move, Wait(500))
local bed = nil         -- { since, seen }: an event said a bed is coming

--- Is the player lying in a qbx_ambulancejob bed? The events open a short window for the fade;
--- after that the animation decides, so an interrupted treatment brings the screen back. The
--- animation alone also counts (a bed reached without the events).
function Death.inBed()
  if IsEntityPlayingAnim(PlayerPedId(), BED_DICT, BED_ANIM, 3) then
    if bed then bed.seen = true end
    return true
  end
  if bed and not bed.seen and now() - bed.since < BED_GRACE then return true end
  bed = nil
  return false
end

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
  local function onBed() bed = { since = now(), seen = false } end
  RegisterNetEvent('qbx_ambulancejob:client:checkedIn', onBed)
  RegisterNetEvent('qbx_ambulancejob:client:putPlayerInBed', onBed)

  -- qbx_medical's respawn loop (client/dead.lua) ticks once a second: each tick with E down counts
  -- RespawnHoldTime 5 → 1, and the tick that finds it at 1 respawns, so the respawn lands on the
  -- fifth tick after the press: the time to the next tick plus 4 s. The ticks are seen as
  -- GetDeathTime() changing (the same loop counts it down), so the bar ends on that tick.
  -- The same loop only looks at E on those ticks: a tick that finds E up resets its count to 5
  -- (`ticks` below), and a release and re-press between two ticks goes unnoticed.
  local lastTime, tickAt = nil, nil
  local extras = {
    ticks = true,
    --- true on the frame qbx_medical's loop ticked (and whenever the loop isn't running).
    frame = function()
      if LocalPlayer.state['qbx_medical:deathState'] ~= 3 then lastTime, tickAt = nil, nil return true end
      local t = exports.qbx_medical:GetDeathTime()
      if t == lastTime then return false end
      local ticked = lastTime ~= nil
      if ticked then tickAt = now() end
      lastTime = t
      return ticked
    end,
    hold = function(pressedAt)
      local toTick = tickAt and 1000 - (pressedAt - tickAt) % 1000 or 1000
      return toTick + 4000
    end,
  }

  return function(ctx)
    local state = LocalPlayer.state['qbx_medical:deathState']
    if state ~= 2 and state ~= 3 then
      requested = false
      bed = nil
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
    -- qbx_ambulancejob advertises the timer while doctors are on duty, else "hold E"
    local available = not amb or t <= 0 or ctx.doctors == 0
    return {
      phase = 'dead', seconds = t, total = death,
      respawn = { key = 'E', available = available, cost = cost },
      treatment = amb and Death.inBed() or nil,
    }
  end, extras
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
      respawn = { key = 'E', available = available, cost = cost },
    }
  end, { hold = f.hold * 1000 }
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
      respawn = { key = 'E', available = wait <= 0, wait = wait > 0 and wait or nil },
      ems = { key = 'G', state = distress > 0 and 'cooldown' or 'available', seconds = distress > 0 and distress or nil },
    }
  end, { hold = hold * 1000 }
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
      respawn = { key = 'E', available = wait <= 0, wait = wait > 0 and wait or nil },
      ems = { key = 'G', state = sent and 'requested' or 'available' },
    }
  end, { hold = f.hold * 1000 }
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
local read, extras = sources[Death.medical]()
source = extras or {}
local ctx = { doctors = 0 }

RegisterNetEvent('nuikit_death:doctors', function(n) ctx.doctors = tonumber(n) or 0 end)

-- ───────────────────────────────── screen

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
  elseif not snap and was then
    NUI.state('dead', false)
    keys.gPressed, keys.held, keys.heldSince, keys.full = false, 0, nil, nil
  elseif snap and Death.medical == 'qbx' and now() - doctorsAt > 60000 then
    -- qbx_ambulancejob refreshes its doctor count once a minute; so do we
    doctorsAt = now()
    TriggerServerEvent('nuikit_death:doctors')
  end

  -- In a hospital bed the player is still down (the 'dead' state stays), but the treatment is
  -- on screen: no dead screen, no screen effect, and the HUD is back.
  local shown = snap and not snap.treatment
  setEffect(shown and snap.phase or nil)
  if shown then
    local encoded = json.encode(snap)
    if encoded ~= lastSent then
      lastSent = encoded
      if screen:isOpen() then
        screen:update(snap)
      else
        holdBar:reset() -- a fresh page: send the bar's value again
        holdBar:push(0)
        screen:open(snap)
      end
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
