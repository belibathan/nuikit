-- nuikit_loading: hand the loading screen everything it shows, while the player connects.
-- The loading screen starts before any resource runs on the client, so it can't fetch the theme
-- itself; the server sends it with the handover: the nuikit resource's compiled theme
-- (GlobalState.nuikitTheme, tokens v1), or theme.css as it is from an older nuikit resource.
local resource = GetCurrentResourceName()

--- A path inside this resource → a URL the loading screen can load. URLs pass through.
---@param path any
---@return string?
local function asset(path)
  if type(path) ~= 'string' or path == '' then return nil end
  if path:find('^https?://') or path:find('^nui://') then return path end
  return ('nui://%s/%s'):format(resource, (path:gsub('^/+', '')))
end

---@param list any
---@return string[]
local function assets(list)
  local out = {}
  for _, path in ipairs(type(list) == 'table' and list or {}) do
    local url = asset(path)
    if url then out[#out + 1] = url end
  end
  return out
end

local function serverName()
  if type(Config.serverName) == 'string' and Config.serverName ~= '' then return Config.serverName end
  local name = GetConvar('sv_projectName', '')
  if name == '' then name = GetConvar('sv_hostname', 'FiveM') end
  return (name:gsub('%^%d', '')) -- strip ^1 colour codes
end

AddEventHandler('playerConnecting', function(name, _, deferrals)
  deferrals.handover({
    nuikit = {
      -- Read on every connection, so `nuikit theme reload` applies without a restart.
      theme = GlobalState.nuikitTheme or LoadResourceFile('nuikit', 'theme.css'),
      serverName = serverName(),
      tagline = Config.tagline,
      playerName = name,
      logo = asset(Config.logo),
      tips = Config.tips,
      tipInterval = Config.tipInterval,
      backgrounds = assets(Config.backgrounds),
      backgroundInterval = Config.backgroundInterval,
      music = assets(Config.music),
      musicVolume = Config.musicVolume,
      links = Config.links,
    },
  })
end)
