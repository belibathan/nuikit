-- {{name}}: server
-- Hands the loading screen everything it shows while the player connects. A loading screen starts
-- before any resource runs on the client, so it can't be messaged; deferrals.handover() is how it
-- gets data. The theme is the nuikit resource's compiled theme (tokens v1) when nuikit runs, or its
-- theme.css as it is; without nuikit the page keeps its built-in stock theme.
local resource = GetCurrentResourceName()

--- A path inside this resource → a URL the loading screen can load. URLs pass through.
local function asset(path)
  if type(path) ~= 'string' or path == '' then return nil end
  if path:find('^https?://') or path:find('^nui://') then return path end
  return ('nui://%s/%s'):format(resource, (path:gsub('^/+', '')))
end

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
  -- web/src/components/blocks/loading-screen/handover.ts: LoadingHandover
  deferrals.handover({
    nuikit = {
      -- read on every connection, so `nuikit theme reload` applies without a restart
      theme = GlobalState.nuikitTheme or (GetResourceState('nuikit') == 'started' and LoadResourceFile('nuikit', 'theme.css')) or nil,
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
