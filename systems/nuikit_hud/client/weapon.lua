-- nuikit_hud: the weapon in hand. `hud:weapon` { clip, reserve, kind } while armed with a gun or a
-- throwable, false otherwise; sent only when one of them changed. Presentation only: it reads the
-- ped's weapon and ammo, never changes them.
--
-- Cost: one loop. Unarmed it wakes every 500 ms (one native); armed every 100 ms (three natives),
-- so a shot shows within a tenth of a second without a per-frame loop.

-- GLOBAL: module table, shared by this resource's files
Weapon = {}

-- GetWeapontypeGroup → the glyph the page draws. Groups not listed (melee, unarmed, the stun gun,
-- the petrol can, the fire extinguisher, parachutes) have no ammo worth showing.
local GROUPS = {
  [416676503] = 'pistol',
  [3337201093] = 'smg',
  [970310034] = 'rifle',
  [1159398588] = 'rifle',   -- machine guns
  [860033945] = 'shotgun',
  [3082541095] = 'sniper',
  [2725924767] = 'heavy',
  [1548507267] = 'thrown',
}

--- The glyph kind for a weapon group hash (signed or unsigned), or nil. Pure, so it can be tested.
function Weapon.kind(group)
  if type(group) ~= 'number' then return nil end
  return GROUPS[math.floor(group) % 0x100000000]
end

-- ───────────────────────────────── the reserve
--
-- GTA keeps every round in the ped, so the reserve is the total minus the clip. ox_inventory loads
-- only the clip into the ped and keeps the rest as items (ammo-9…), so there the total is the clip
-- and the reserve read 0 (0.7.0 test, F1). With ox_inventory started, the reserve is the count of
-- the equipped weapon's ammo item; when that can't be read, it's hidden rather than wrong.

local function oxReserve()
  local ok, weapon = pcall(function() return exports.ox_inventory:getCurrentWeapon() end)
  if not ok or type(weapon) ~= 'table' or type(weapon.ammo) ~= 'string' then return false end
  local ok2, count = pcall(function() return exports.ox_inventory:Search('count', weapon.ammo) end)
  if ok2 and type(count) == 'number' then return count end
  return false
end

--- Where the reserve comes from: 'ped' (GTA's ammo) or a function returning a number, or false when
--- it can't be known. Config.ammoReserve: 'auto' (default), 'ped', 'ox_inventory' or false (hidden).
function Weapon.reserveSource()
  local want = Config.ammoReserve
  if want == nil then want = 'auto' end
  if want == false then return false end
  if want == 'ox_inventory' or (want == 'auto' and GetResourceState('ox_inventory') == 'started') then return oxReserve end
  return 'ped'
end

local cached, cachedFor, cachedAt = nil, nil, 0

--- The reserve from an inventory source, read again when the clip changed (a reload takes rounds
--- from the item) or once a second (a pickup), not on every 100 ms tick. false: unknown.
local function itemReserve(source, hash, clip)
  local now = GetGameTimer()
  local key = ('%d|%d'):format(hash, clip)
  if key ~= cachedFor or now - cachedAt >= 1000 then
    cached, cachedFor, cachedAt = source(), key, now
  end
  return cached
end

--- What the page shows for a weapon: clip and reserve, or nil when unarmed. The reserve is left out
--- when it can't be known. Thrown weapons have no clip: their count is the big number.
function Weapon.read(ped)
  local hash = GetSelectedPedWeapon(ped)
  if not hash or hash == 0 then return nil end -- unarmed and melee fall out at the group below
  local kind = Weapon.kind(GetWeapontypeGroup(hash))
  if not kind then return nil end
  local total = GetAmmoInPedWeapon(ped, hash) or 0
  if kind == 'thrown' then
    if total <= 0 then return nil end
    return { clip = total, kind = kind }
  end
  local ok, clip = GetAmmoInClip(ped, hash)
  clip = ok and clip or 0
  local source = Weapon.reserveSource()
  local reserve
  if source == 'ped' then
    reserve = total - clip
  elseif source then
    reserve = itemReserve(source, hash, clip)
  end
  if type(reserve) ~= 'number' then return { clip = clip, kind = kind } end
  return { clip = clip, reserve = math.max(0, math.min(9999, math.floor(reserve))), kind = kind }
end

local last = ''

local function send(w)
  local key = w and ('%s|%d|%d'):format(w.kind, w.clip, w.reserve or -1) or 'off'
  if key == last then return end
  last = key
  nk.message.send('hud:weapon', w or false)
end

function Weapon.tick()
  if Config.ammo == false then return false end
  local w = Weapon.read(PlayerPedId())
  send(w)
  return w ~= nil
end

function Weapon.resend() last = '' end

CreateThread(function()
  while true do -- INFINITE LOOP: the weapon in hand, 100 ms armed, 500 ms not
    local armed = Weapon.tick()
    Wait(armed and 100 or 500)
  end
end)
