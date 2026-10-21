--[[
  nuikit_qb_target (recorder stage).  MIT · https://github.com/belibathan/nuikit

  qb-target's option list is "render only" (docs/adapters/qb-target.md): nothing in its Lua is replaced,
  only its page, and that page can only be written from a recorded log of what qb-target sends it.
  No such log exists yet, so this resource is the recorder: the page in override/ (copied over
  qb-target's html page for a recording session) forwards every message here, and `/nuikit_qb_target dump`
  prints them as JSON lines to paste into docs/adapters/qb-target.md. Targeting is blind while the
  recorder page is in: put the original page back afterwards.

  Once the format is known, this resource draws the list with nk.target and posts selections back to
  qb-target's own callbacks, and declares nuikit_adapter 'qb-target'.
]]

local TAG = '[nuikit-qb:target]'
local log = {}

RegisterNUICallback('page', function(msg, cb)
  cb({ ok = true })
  local entry = { t = GetGameTimer(), msg = msg }
  log[#log + 1] = entry
  print(TAG .. ' ' .. json.encode(entry))
end)

RegisterCommand('nuikit_qb_target', function(_, args)
  if args[1] == 'dump' then
    print(('%s %d messages'):format(TAG, #log))
    for _, e in ipairs(log) do print(TAG .. ' ' .. json.encode(e)) end
  elseif args[1] == 'clear' then
    log = {}
  else
    print(TAG .. ' usage: /nuikit_qb_target dump | clear')
  end
end, false)

exports('messages', function() return log end)
