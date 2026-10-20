Config = {
  -- Hold this key to target (players can rebind it in Settings → Key Bindings → FiveM). Left Alt
  -- is also ox_target's and qb-target's: don't run them on the same key (the server warns at start).
  key = 'LMENU',
  -- How the player chooses an option while targeting:
  --   'cursor': left click gives them the cursor, then they click the option (like ox_target);
  --   'wheel':  the scroll wheel moves the highlight and left click chooses it, no cursor at all.
  select = 'cursor',
  -- How far the eye reaches, in metres.
  distance = 3.0,

  -- What can be targeted. `type` is 'vehicle', 'ped' (not a player) or 'player'; or list `models`.
  -- Each option: id, label, icon (see nui.ts: car, door, hand, box, user, wrench, cart, lock, unlock,
  -- key, phone, info, fuel, shirt, money, briefcase, medical, search), optional description, and
  -- what it does:
  --   event = 'name'         a client event: TriggerEvent(name, entity, optionId)
  --   server = true          asks the server, which checks it again (server/main.lua) before acting
  -- canInteract = function(entity) return true end hides the option when it returns false.
  targets = {
    {
      type = 'vehicle',
      options = {
        { id = 'trunk', label = 'Open the trunk', icon = 'box', event = '{{name}}:trunk' },
        { id = 'lock', label = 'Lock or unlock', icon = 'lock', server = true },
      },
    },
    {
      type = 'player',
      options = {
        { id = 'wave', label = 'Wave', icon = 'hand', event = '{{name}}:wave' },
      },
    },
    {
      models = { 'prop_atm_01', 'prop_atm_02', 'prop_atm_03', 'prop_fleeca_atm' },
      label = 'ATM',
      options = {
        { id = 'atm', label = 'Use the ATM', icon = 'money', event = '{{name}}:atm' },
      },
    },
  },

  -- Places with a key prompt: stand within `radius` and press the key, or hold it for `hold` ms.
  -- Keys: E, F, G, H, K, L, X, Y, Z. `event` / `server` work as for the options above; a server
  -- point also has a `cooldown` (ms, per player) that the server enforces.
  points = {
    { id = 'fridge', coords = vector3(28.1, -1338.6, 29.5), radius = 1.5, key = 'E', label = 'Open the fridge', icon = 'box', event = '{{name}}:fridge' },
    { id = 'bell', coords = vector3(24.4, -1346.6, 29.5), radius = 1.5, key = 'G', label = 'Ring the bell', icon = 'info', hold = 1500, server = true, cooldown = 30000 },
  },
  -- Where the prompts sit: top-left … bottom-right (see the key-prompt component).
  promptPosition = 'center-right',
}
