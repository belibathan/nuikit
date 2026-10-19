--[[
  @nuikit/init.lua: import nuikit into your resource, like @ox_lib/init.lua.  MIT · https://github.com/belibathan/nuikit

    -- fxmanifest.lua
    dependency 'nuikit'
    shared_script '@nuikit/init.lua'

  Client: defines `nk` (and `NUI`, the same table, for code written for nuikit 0.4) with the protocol
  runtime: messages, surfaces, focus and Escape, theme, prefs (docs/protocol.md). `nk.player` loads the
  framework bridge the first time it is used, so resources that never read the player don't pay for it.
  The code runs inside your resource, loaded from the running nuikit resource: updating nuikit updates
  every resource that imports it.

  Server: defines `nk.version` (more server API arrives with intents, docs/architecture.md).

  To run without the nuikit resource, copy lib/nuikit.lua (and lib/bridge.lua) into your resource
  instead, as nuikit 0.4 did.
]]

if nk and rawget(nk, '__imported') then return end

local RUNTIME = 'nuikit'

local function import(file)
  local src = LoadResourceFile(RUNTIME, file)
  if not src then
    error(('nuikit: could not load @%s/%s. Is the nuikit resource started before %s? (ensure nuikit first, and add dependency \'nuikit\' to its fxmanifest)')
      :format(RUNTIME, file, GetCurrentResourceName()), 3)
  end
  local fn, err = load(src, ('@@%s/%s'):format(RUNTIME, file), 't', _ENV)
  if not fn then error(err, 3) end
  return fn()
end

local version = GetResourceMetadata(RUNTIME, 'version', 0)

if IsDuplicityVersion() then
  nk = nk or {}
  nk.version = version
  rawset(nk, '__imported', true)
  return
end

import('lib/nuikit.lua')
nk = NUI
nk.version = version
rawset(nk, '__imported', true)

-- nk.player: the framework bridge, loaded on first use.
setmetatable(nk, {
  __index = function(t, key)
    if key ~= 'player' then return nil end
    rawset(t, 'player', {})
    import('lib/bridge.lua')
    return rawget(t, 'player')
  end,
})
