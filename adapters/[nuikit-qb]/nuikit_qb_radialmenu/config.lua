-- nuikit_qb_radialmenu: the same shape as qb-radialmenu's config.lua, so an owner pastes their
-- Config.MenuItems and Config.JobInteractions here. Item fields (qb-radialmenu docs): id, title, icon,
-- type ('client' | 'server' | 'command' | 'qbcommand'), event, shouldClose, items (submenu).
-- Vehicle doors / extras / seats and the trunk classes are not translated (UI only; docs/adapters/qb-radialmenu.md).

Config = Config or {}

Config.OpenKey = 'F1'      -- RegisterKeyMapping default; players rebind it in GTA's settings
Config.Label = 'Actions'   -- the centre's label

Config.MenuItems = {
  {
    id = 'citizen',
    title = 'Citizen',
    icon = 'user',
    items = {
      { id = 'id', title = 'Show ID', icon = 'id-card', type = 'client', event = 'qb-idcard:client:showId', shouldClose = true },
      { id = 'handsup', title = 'Hands up', icon = 'hands-up', type = 'command', event = 'handsup', shouldClose = true },
    },
  },
  {
    id = 'emotes',
    title = 'Emotes',
    icon = 'smile',
    type = 'command',
    event = 'emotemenu',
    shouldClose = true,
  },
}

Config.JobInteractions = {
  police = {
    { id = 'police-stash', title = 'Stash', icon = 'box', type = 'client', event = 'police:client:openStash', shouldClose = true },
  },
}
