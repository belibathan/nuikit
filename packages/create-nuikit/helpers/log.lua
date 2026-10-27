--[[
  Console logging with FiveM colour codes: colour + [RESOURCE] + message + ^7, one line each.
  Side: shared. Load from fxmanifest (shared_scripts), after config.lua.
  From fivem-foundation (upstream/examples/helpers/log.lua, MIT), STANDARDS §7.

    Log.info('Loaded 3 garages')          -- ^5 cyan
    Log.success('Database installed')      -- ^2 green
    Log.warn('OneSync is off')             -- ^3 yellow
    Log.error('Player 3 tried a forged id') -- ^1 red
    Log.debug('netId=' .. netId)           -- ^6 purple, only with Config.debug = true
    Log.fatal('config.lua: Config.saveFile is missing') -- ^1 red, then error(): the resource stops
]]

-- GLOBAL: helper table, shared by every file of this resource
Log = Log or {}

local RESOURCE = GetCurrentResourceName():upper()

local COLORS = {
  error = '^1',
  warn = '^3',
  success = '^2',
  info = '^5',
  debug = '^6',
}

local function write(level, message)
  assert(type(message) == 'string', 'message must be a string')
  local color = COLORS[level] or '^7'
  print(('%s[%s] %s^7'):format(color, RESOURCE, message))
end

--- @param message string
function Log.error(message) write('error', message) end

--- @param message string
function Log.warn(message) write('warn', message) end

--- @param message string
function Log.success(message) write('success', message) end

--- @param message string
function Log.info(message) write('info', message) end

--- Only when Config.debug (or Config.Debug) is true.
--- @param message string
function Log.debug(message)
  if Config and (Config.debug or Config.Debug) then write('debug', message) end
end

--- A critical error at start: log it, then error() so the resource stops instead of running half set up.
--- @param message string
function Log.fatal(message)
  write('error', message)
  error(('[%s] %s'):format(RESOURCE, message))
end
