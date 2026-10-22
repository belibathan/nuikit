--[[
  nuikit framework adapter template. Replace the FAKE FRAMEWORK block with reads from your own framework;
  keep the three exports and the update event. Contract: docs/adapters/framework-sdk.md
]]

-- ── FAKE FRAMEWORK: replace everything in this block ──────────────────────────────────────────────────────
local Framework = {
  character = { id = 'char-1', first = 'Ada', last = 'Lovelace' },
  money = { cash = 250, bank = 12000 },
  job = { name = 'taxi', label = 'Taxi', rank = 1, rankLabel = 'Driver', duty = true },
  gang = nil, -- { name, label, rank, rankLabel }
  needs = { food = 82, water = 64, stress = 7 }, -- 0-100
  loaded = true,
}
-- ──────────────────────────────────────────────────────────────────────────────────────────────────────────

-- REQUIRED. Return the player in nuikit's shape. Every field is optional; send what you have.
-- Called once when nuikit starts and again whenever an event from nuikitEvents fires.
exports('nuikitGetPlayer', function()
  if not Framework.loaded then return { loaded = false } end
  return {
    loaded = true,
    id = Framework.character.id,
    name = Framework.character.first .. ' ' .. Framework.character.last,
    cash = Framework.money.cash,
    bank = Framework.money.bank,
    job = Framework.job and {
      name = Framework.job.name, label = Framework.job.label, grade = Framework.job.rank,
      gradeLabel = Framework.job.rankLabel, onDuty = Framework.job.duty,
    } or nil,
    gang = Framework.gang and {
      name = Framework.gang.name, label = Framework.gang.label, grade = Framework.gang.rank,
      gradeLabel = Framework.gang.rankLabel,
    } or nil,
    hunger = Framework.needs.food, thirst = Framework.needs.water, stress = Framework.needs.stress,
  }
end)

-- OPTIONAL. Values that change without an event (needs that tick). Polled about 4 times a second, so keep it
-- cheap and return only the fields that change. Leave this export out if your framework fires events instead.
exports('nuikitPoll', function()
  return { hunger = Framework.needs.food, thirst = Framework.needs.water, stress = Framework.needs.stress }
end)

-- OPTIONAL. Local client events that mean "something changed": nuikit calls nuikitGetPlayer again on each.
exports('nuikitEvents', function()
  return { 'example:playerLoaded', 'example:playerUnloaded', 'example:jobChanged', 'example:moneyChanged' }
end)

-- You can also push just the changed fields yourself, without the exports above:
--   TriggerEvent('nuikit:framework:update', { cash = 300 })

-- Demo: `/example_cash 500` changes the fake framework's cash and tells nuikit. Delete with the fake block.
RegisterCommand('example_cash', function(_, args)
  Framework.money.cash = tonumber(args[1]) or Framework.money.cash
  TriggerEvent('example:moneyChanged')
end, false)
