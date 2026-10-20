-- {{name}}: client
-- The death screen lives in web/ (the death-screen block); this file decides when it shows and what
-- it says. The rules below are a small working example (die → wait → hold E to get up where you
-- fell, G calls EMS). On a server with a medical resource, keep the screen and the hold stream and
-- replace the rules with what that resource is doing (nuikit_death shows how for qbx_medical,
-- qb-ambulancejob and esx_ambulancejob).
-- Lua → UI: nk.send(event, data) · surfaces: nk.surface(name, opts) · live values: nk.stream(event, opts)

local Config = {
  respawnAfter = 30, -- seconds dead before E is accepted
  holdMs = 3000,     -- how long E is held to respawn
  cost = 0,          -- a hospital bill to show next to the key (0: none)
  emsCooldown = 60,  -- seconds between EMS calls
}

local KEY_E, KEY_G = 38, 47 -- INPUT_PICKUP, INPUT_DETONATE: still readable while dead

-- System layer, above everything; no input, so the player can look around and the keys stay in
-- Lua. `hides` takes the HUD layer of every nuikit resource away while it's open.
local screen = nk.surface('death', { layer = 'system', input = 'none', hides = { 'hud' } })
-- How far E is held, 0–1: a live value the page follows at its own frame rate (protocol §5.7).
local hold = nk.stream('death:hold', { rate = 30, precision = 0.01 })

--- Call your dispatch here (ps-dispatch, cd_dispatch, a server event…).
local function callEms()
  print(('[{{name}}] EMS called to %s'):format(GetEntityCoords(PlayerPedId())))
end

--- Get up where you fell. A real script would take the player to a hospital and charge the bill.
local function respawn()
  local ped = PlayerPedId()
  local pos = GetEntityCoords(ped)
  NetworkResurrectLocalPlayer(pos.x, pos.y, pos.z, GetEntityHeading(ped), true, false)
  ped = PlayerPedId()
  SetEntityHealth(ped, GetEntityMaxHealth(ped))
  ClearPedBloodDamage(ped)
end

-- /{{name}}:die for testing: the screen opens the way a real death opens it.
RegisterCommand('{{name}}:die', function() SetEntityHealth(PlayerPedId(), 0) end, false)

CreateThread(function()
  local diedAt, emsAt, heldSince, last = nil, nil, nil, nil
  while true do
    local ped = PlayerPedId()
    if not IsEntityDead(ped) then
      if diedAt then -- back on your feet (here or by another script): close everything
        diedAt, emsAt, heldSince, last = nil, nil, nil, nil
        screen:close()
        hold:push(0)
        nk.state('dead', false)
        AnimpostfxStop('DeathFailOut')
      end
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

      -- E: hold to respawn once the timer is done
      local e = available and (IsControlPressed(0, KEY_E) or IsDisabledControlPressed(0, KEY_E))
      heldSince = e and (heldSince or now) or nil
      local held = heldSince and math.min(1, (now - heldSince) / Config.holdMs) or 0
      hold:push(held) -- sends at most 30 a second, and only when it changed

      -- The screen's data, sent only when something on it changed (about once a second).
      local data = {
        phase = 'dead',
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

      if held >= 1 then respawn() end
      Wait(0) -- reading keys every frame is free; messages above are sent on change only
    end
  end
end)

AddEventHandler('onResourceStop', function(resource)
  if resource == GetCurrentResourceName() then AnimpostfxStop('DeathFailOut') end
end)
