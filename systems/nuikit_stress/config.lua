-- Stress: the gameplay half of qbx_hud / qb-hud. nuikit_hud only draws the number.
Config = {
  enabled = true,
  disableForLeo = true,         -- job type 'leo' gains no stress

  speeding = {
    enabled = true,
    buckledMph = 9999,          -- speed that adds stress with a seatbelt on (9999 = never)
    unbuckledMph = 50,          -- ...and without one
    every = 10000,              -- ms between checks
    gain = { 1, 3 },
  },

  shooting = {
    enabled = true,
    chance = 0.1,               -- per shot
    gain = { 1, 5 },
    ignore = { `weapon_petrolcan`, `weapon_hazardcan`, `weapon_fireextinguisher` },
  },

  effects = {
    enabled = true,
    shakeFrom = 50,             -- stress where blur + camera shake start
    -- the higher the stress, the more often it happens (ms between effects)
    interval = { [50] = 55000, [60] = 45000, [70] = 35000, [80] = 25000, [90] = 15000 },
  },

  notify = true,                -- "Feeling more stressed" when it goes up
}

-- Stand down when the original HUD still runs stress (no double gain), or on frameworks without it.
local function shouldRun()
  for _, hud in ipairs({ 'qbx_hud', 'qb-hud' }) do
    local state = GetResourceState(hud)
    if state == 'started' or state == 'starting' then return false, hud .. ' is running and handles stress' end
  end
  if GetResourceState('qbx_core') == 'missing' and GetResourceState('qb-core') == 'missing' then
    return false, 'no Qbox or QBCore'
  end
  return true
end

local ok, why = shouldRun()
if Config.enabled and not ok then
  Config.enabled = false
  if IsDuplicityVersion() then print(('^3[nuikit_stress] off: %s^7'):format(why)) end
end
