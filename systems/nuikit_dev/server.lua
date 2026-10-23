if GetConvar('nuikit_dev', '0') ~= '1' then
  print('^3[nuikit_dev]^7 off (set `setr nuikit_dev 1` to enable /nk test)')
  return
end

local state = { last = {} }
AddEventHandler('playerDropped', function() state.last[source] = nil end)

local function say(src, description, status)
  if src > 0 then TriggerClientEvent('nuikit_dev:notify', src, description, status or 'error')
  else print('[nuikit_dev] ' .. description) end
end

local deps = {
  invStarted = function() return GetResourceState('ox_inventory') == 'started' end,
  canCarry = function(src, name, count) return exports.ox_inventory:CanCarryItem(src, name, count) and true or false end,
  add = function(src, name, count, metadata) return exports.ox_inventory:AddItem(src, name, count, metadata) and true or false end,
  remove = function(src, name, count, metadata) return exports.ox_inventory:RemoveItem(src, name, count, metadata) and true or false end,
  playerData = function(src)
    if GetResourceState('qbx_core') ~= 'started' then return nil end
    local ok, player = pcall(function() return exports.qbx_core:GetPlayer(src) end)
    return ok and player and player.PlayerData or nil
  end,
}

-- Registered unrestricted: the ace is checked below (NkDev.authorize), so the same `command.nuikit`
-- that guards /nuikit decides, and nobody needs a second `command.nk` ace.
RegisterCommand('nk', function(source, args)
  if args[1] ~= 'test' then return say(source, '/nk test <what>', 'info') end
  local what = args[2]
  if not what then return say(source, 'options: ' .. table.concat(NkDev.WHAT, ', '), 'info') end
  local ok, err = NkDev.authorize(state, source, what, GetGameTimer(), function(src, ace)
    return IsPlayerAceAllowed(tostring(src), ace)
  end)
  if not ok then return say(source, err) end
  if what == 'items' then
    local given, msg = NkDev.grantItems(deps, source)
    return say(source, msg, given and 'success' or 'error')
  end
  TriggerClientEvent('nuikit_dev:run', source, what)
end, false)

print('^2[nuikit_dev]^7 on: /nk test <what> (ace ' .. NkDev.ACE .. ')')

-- Restart queue (dev only): a local tool appends resource names, one per line, to this resource's restart.queue
-- (`.local/nk-restart.ps1 nuikit_hud ox_inventory`); each is ensured within a second. Lets an agent iterate
-- without the txAdmin console. A resource that stops dependants (ox_inventory) gets them back via `after`.
-- Never `nuikit` (or anything this resource depends on): stopping it stops this resource mid-command, which
-- crashed FXServer (SIGSEGV, Oct 22). Restart those from the txAdmin console.
local refuse = { nuikit = true, ox_lib = true }
local after = { ox_inventory = { 'ox_fuel', 'qbx_ambulancejob' } }
CreateThread(function()
  while true do
    Wait(1000)
    local queue = LoadResourceFile(GetCurrentResourceName(), 'restart.queue')
    if queue and queue:find('%S') then
      SaveResourceFile(GetCurrentResourceName(), 'restart.queue', '', 0)
      -- only names of resources that exist (never a command: NkDev.queueNames), at most 32 per round
      for _, name in ipairs(NkDev.queueNames(queue, GetCurrentResourceName(), function(n) return GetResourceState(n) ~= 'missing' end)) do
        if refuse[name] then
          print(('[nuikit_dev] not restarting %s from the queue (it would stop nuikit_dev mid-command); use the txAdmin console'):format(name))
        else
          print('[nuikit_dev] restart ' .. name)
          ExecuteCommand('ensure ' .. name) -- starts it, or restarts it when running
          for _, dep in ipairs(after[name] or {}) do ExecuteCommand('ensure ' .. dep) end
        end
      end
    end
  end
end)
