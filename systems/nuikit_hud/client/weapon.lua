-- nuikit_hud: the weapon in hand. `hud:weapon` { clip, reserve, kind } while armed with a gun or a
-- throwable, false otherwise; sent only when one of them changed. Presentation only: it reads the
-- ped's weapon and ammo, never changes them.
--
-- Cost: one loop. Unarmed it wakes every 500 ms (one native); armed every 100 ms (three natives),
-- so a shot shows within a tenth of a second without a per-frame loop.

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

--- What the page shows for a weapon: clip and reserve (total minus clip), or nil when unarmed.
--- Thrown weapons have no clip: their count is the reserve, shown as the big number.
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
  return { clip = clip, reserve = math.max(0, math.min(9999, total - clip)), kind = kind }
end

local last = ''

local function send(w)
  local key = w and ('%s|%d|%d'):format(w.kind, w.clip, w.reserve or -1) or 'off'
  if key == last then return end
  last = key
  NUI.send('hud:weapon', w or false)
end

function Weapon.tick()
  if Config.ammo == false then return false end
  local w = Weapon.read(PlayerPedId())
  send(w)
  return w ~= nil
end

function Weapon.resend() last = '' end

CreateThread(function()
  while true do
    local armed = Weapon.tick()
    Wait(armed and 100 or 500)
  end
end)
