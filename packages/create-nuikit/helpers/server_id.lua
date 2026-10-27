--[[
  Player ids from outside (event arguments, command arguments, exports), checked before a native.
  Natives read a player id as text with atoi: 3.5, '3abc' and '03' all find player 3, and 0 or nil
  raise "Argument at index 0 was null" (info/runtime/player_source.md). `source` is always the sender;
  an id in the arguments is the client's choice, so also a cheater's.
  Side: server. Load from fxmanifest (server_scripts or shared_scripts).
  From fivem-foundation (upstream/examples/helpers/server_id.lua, MIT), STANDARDS §15.

    RegisterCommand('my_resource_give', function(_, args)
      local target = ServerId.online(tonumber(args[1]))
      if not target then return end
    end, true)
]]

local floor = math.floor
local huge = math.huge
local tointeger = math.tointeger
local GetPlayerName = GetPlayerName

local MAX_SERVER_ID = 0x7FFFFFFF

-- GLOBAL: helper table, shared by every file of this resource
ServerId = ServerId or {}

--- A valid player id as an integer, or nil. Good: 3 and 3.0. Bad: 3.5, '3', 0, -1, NaN, inf.
--- Text from a command first: ServerId.parse(tonumber(args[1])).
--- @param value any
--- @return integer|nil
function ServerId.parse(value)
  if type(value) ~= 'number' or value ~= value or value == huge or value == -huge then return nil end
  if value ~= floor(value) then return nil end
  local id = tointeger(value)
  if not id or id < 1 or id > MAX_SERVER_ID then return nil end
  return id
end

--- A valid id of a player who is online now, or nil.
--- @param value any
--- @return integer|nil
function ServerId.online(value)
  local id = ServerId.parse(value)
  if not id or not GetPlayerName(id) then return nil end
  return id
end
