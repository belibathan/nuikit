--[[
  nuikit.lua: the Lua half of nuikit.  (fixture stub: the real file is packages/core/lua/nuikit.lua)
]]
NUI = NUI or {}
local function apply(target)
  SetNuiFocus(true, target.input == 'full')
  SetNuiFocusKeepInput(target.keepInput == true)
end
AddEventHandler('onClientResourceStop', function() SetNuiFocus(false, false) end)
