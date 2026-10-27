-- {{name}}: client
-- The death screen lives in web/ (the death-screen block); this file decides when it shows and what
-- it says. Lua → UI: nk.send(event, data) · surfaces: nk.surface(name, opts) · live values: nk.stream(event, opts)
--
-- Two parts:
--   1. the screen and the hold stream (always here): open/update it with a DeathScreenData table
--      (web/src/components/blocks/death-screen/nui.ts) and push how far the respawn key is held;
--   2. example rules for a standalone server: die → wait → hold E to get up where you fell, G calls EMS.
--      They switch themselves off while a medical resource runs (qbx_medical, qb-ambulancejob,
--      esx_death, esx_ambulancejob): that resource owns death and respawning, so wire the screen to
--      what it's doing instead (nuikit_death shows how for each of them).

local Config = {
  example = true,           -- the example rules (still off while a medical resource runs)
  respawnAfter = 30,        -- seconds dead before E is accepted
  holdMs = 3000,            -- how long E is held to get up
  cost = 0,                 -- a bill to show next to the key (0: none)
  emsCooldown = 60,         -- seconds between EMS calls
  disableAutoSpawn = false, -- vanilla servers: stop spawnmanager respawning players itself
}

-- ───────────────────────────────── 1. the screen

-- System layer, above everything; no input, so the player can look around and the keys stay in
-- Lua. `hides` takes the HUD layer of every nuikit resource away while it's open.
local screen = nk.surface('death', { layer = 'system', input = 'none', hides = { 'hud' } })
-- How far the respawn key is held, 0–1: a live value the page follows at its own frame rate (protocol §5.7).
local hold = nk.stream('death:hold', { rate = 30, precision = 0.01 })

-- ───────────────────────────────── 2. example rules (standalone servers)

local MEDICAL = { 'qbx_medical', 'qb-ambulancejob', 'esx_death', 'esx_ambulancejob' }
local KEY_E, KEY_G = 38, 47 -- INPUT_PICKUP, INPUT_DETONATE: still readable while dead

--- The medical resource that owns death on this server, if one is running.
local function medicalResource()
  for _, name in ipairs(MEDICAL) do
    local state = GetResourceState(name)
    if state == 'started' or state == 'starting' then return name end
  end
end

--- Call your dispatch here (ps-dispatch, cd_dispatch, a server event…).
local function callEms()
  Log.info(('EMS called to %s'):format(GetEntityCoords(PlayerPedId())))
end

--- Get up where you fell, at full health.
local function getUp()
  local ped = PlayerPedId()
  local pos = GetEntityCoords(ped)
  NetworkResurrectLocalPlayer(pos.x, pos.y, pos.z, GetEntityHeading(ped), true, false)
  ped = PlayerPedId()
  SetEntityHealth(ped, GetEntityMaxHealth(ped))
  ClearPedBloodDamage(ped)
end

-- /{{name}}:die for testing: the screen opens the way a real death opens it.
RegisterCommand('{{name}}:die', function() SetEntityHealth(PlayerPedId(), 0) end, false)

if Config.example and Config.disableAutoSpawn and GetResourceState('spawnmanager') == 'started' then
  exports.spawnmanager:setAutoSpawn(false)
end

CreateThread(function()
  if not Config.example then return end
  local diedAt, emsAt, heldSince, last, told = nil, nil, nil, nil, nil

  local function reset()
    if not diedAt then return end
    diedAt, emsAt, heldSince, last = nil, nil, nil, nil
    screen:close()
    hold:push(0)
    nk.state('dead', false)
    AnimpostfxStop('DeathFailOut')
  end

  while true do -- INFINITE LOOP: for the resource's life; every pass sleeps
    local medical = medicalResource()
    if medical then
      -- that resource owns death: step aside, once, and say what to do
      reset()
      if told ~= medical then
        told = medical
        Log.info(('%s is running, so the example death rules are off. Open the screen from what %s is doing (see nuikit_death).'):format(medical, medical))
      end
      Wait(1000)
    elseif not IsEntityDead(PlayerPedId()) then
      reset() -- back on your feet (here or by another script)
      Wait(250)
    else
      local now = GetGameTimer()
      if not diedAt then
        diedAt = now
        nk.state('dead', true) -- surfaces with blockedBy = { 'dead' }, in any nuikit resource, won't open
        AnimpostfxPlay('DeathFailOut', 0, true) -- the world goes grey; the page can't touch it
      end

      local left = math.max(0, Config.respawnAfter - (now - diedAt) / 1000)
      local available = left <= 0

      -- G: call EMS once per cooldown
      local sinceEms = emsAt and (now - emsAt) / 1000
      if (not sinceEms or sinceEms >= Config.emsCooldown)
        and (IsControlJustPressed(0, KEY_G) or IsDisabledControlJustPressed(0, KEY_G)) then
        emsAt, sinceEms = now, 0
        callEms()
      end
      local ems = { key = 'G', state = 'available' }
      if sinceEms and sinceEms < 10 then
        ems.state = 'requested'
      elseif sinceEms and sinceEms < Config.emsCooldown then
        ems = { key = 'G', state = 'cooldown', seconds = math.ceil(Config.emsCooldown - sinceEms) }
      end

      -- E: hold to get up once the timer is done
      local e = available and (IsControlPressed(0, KEY_E) or IsDisabledControlPressed(0, KEY_E))
      heldSince = e and (heldSince or now) or nil
      local held = heldSince and math.min(1, (now - heldSince) / Config.holdMs) or 0
      hold:push(held) -- sends at most 30 a second, and only when it changed

      -- The screen's data, sent only when something on it changed (about once a second). The text
      -- says what these rules do: you get up here, not at a hospital.
      local data = {
        phase = 'dead',
        title = 'You are unconscious',
        subtitle = 'Wait for EMS, or get up here when the timer ends.',
        seconds = math.ceil(left),
        total = Config.respawnAfter,
        respawn = { key = 'E', available = available, cost = Config.cost > 0 and Config.cost or nil },
        ems = ems,
      }
      local encoded = json.encode(data)
      if encoded ~= last then
        last = encoded
        if screen:isOpen() then screen:update(data) else screen:open(data) end
      end

      if held >= 1 then getUp() end
      Wait(0) -- reading keys every frame is free; messages above are sent on change only
    end
  end
end)

AddEventHandler('onResourceStop', function(resource)
  if resource == GetCurrentResourceName() then AnimpostfxStop('DeathFailOut') end
end)
