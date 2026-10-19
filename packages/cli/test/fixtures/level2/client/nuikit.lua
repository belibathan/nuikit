--[[
  nuikit.lua: the Lua half of nuikit.  (fixture stub: the real file is packages/core/lua/nuikit.lua)
]]
NUI = NUI or {}
function NUI.surface(name, opts) return { open = function() SetNuiFocus(true, true) end } end
AddEventHandler('onClientResourceStop', function() SetNuiFocus(false, false) end)
