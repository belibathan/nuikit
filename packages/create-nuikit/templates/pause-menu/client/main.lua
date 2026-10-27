-- {{name}}: client
-- Esc opens this menu instead of GTA's pause menu; P still opens the game's map. Map, Settings and
-- Key bindings hand over to the game's own pages and come back here when they close. The player
-- (name, job, money) comes from nuikit's bridge; the player count and ping from server/main.lua.
-- Lua → UI: surfaces nk.surface(name, opts) · UI → Lua: nk.on(callback, fn) ↔ fetchNui()

local ESC = 200       -- INPUT_FRONTEND_PAUSE_ALTERNATE (Esc). P is 199 and is left to the game.
local QUIET_MS = 400  -- ignore Esc this long after a menu closes, so one press can't reopen it
local BLUR_MS = 200.0

-- Modal layer, full input. exclusive: it closes other modals; hides: nuikit HUDs step aside;
-- blockedBy: it won't open while the player is dead (a death screen owns the screen then);
-- escape = 'back': Esc goes to the page, which closes the Disconnect confirm first, then the menu.
local pause = nk.surface('pause', {
  layer = 'modal', input = 'full', exclusive = true, escape = 'back', hides = { 'hud' }, blockedBy = { 'dead' },
})

local info = {}        -- the server's answer: { name, players, max, ping, uptime }
local wasOpen = false
local quietUntil = 0
local returning = nil  -- set while one of GTA's pages we opened is up: { seen, deadline }
local blurred = false

local enabled = {}
for _, a in ipairs(Config.actions or {}) do enabled[a] = true end

local function blur(on)
  if on == blurred then return end
  blurred = on
  if on then TriggerScreenblurFadeIn(BLUR_MS) else TriggerScreenblurFadeOut(BLUR_MS) end
end

--- What the menu shows (web/src/components/blocks/pause-menu/nui.ts: PauseMenuData).
local function payload()
  local me = PlayerId()
  local server = { name = Config.server.name, tagline = Config.server.tagline, logo = Config.server.logo }
  if not server.name or server.name == '' then server.name = info.name end
  return {
    server = server,
    actions = Config.actions or {},
    links = Config.links or {},
    serverId = GetPlayerServerId(me),
    playerName = GetPlayerName(me),
    players = info.players,
    maxPlayers = info.max,
    ping = info.ping,
    uptime = info.uptime,
  }
end

--- Why the menu can't open right now, or nil. While it's blocked, Esc is left to the game.
local function blocked()
  if IsPauseMenuActive() then return 'frontend' end
  if IsNuiFocused() then return 'focus' end -- chat input, a phone, another UI: whoever has focus owns Esc
  if nk.getState('dead') or nk.player.get().dead then return 'dead' end
  for _, e in ipairs(nk.surfaces()) do
    if not (e.resource == GetCurrentResourceName() and e.name == 'pause') then
      if e.layer == 'modal' or e.layer == 'system' or e.input ~= 'none' then return 'surface' end
    end
  end
end

local function open()
  if pause:isOpen() or blocked() then return false end
  SetPauseMenuActive(false)
  if not pause:open(payload()) then return false end
  wasOpen = true
  blur(true) -- the page can't blur the game (CEF draws over it); GTA does
  TriggerServerEvent('{{name}}:request')
  return true
end

local function close()
  pause:close()
  quietUntil = GetGameTimer() + QUIET_MS
  wasOpen = false
  blur(false)
end

--- Close ours, then open one of GTA's frontend pages; ours comes back when it closes.
local function frontend(menu, deeper)
  close()
  if Config.returnToMenu ~= false then returning = { seen = false, deadline = GetGameTimer() + 2000 } end
  CreateThread(function()
    Wait(50) -- let NUI focus drop first
    ActivateFrontendMenu(GetHashKey(menu), false, -1)
    if deeper then
      Wait(100)
      PauseMenuceptionGoDeeper(0) -- straight into the map tab
    end
  end)
end

local handlers = {
  resume = close,
  map = function() frontend(Config.frontend.map, true) end,
  settings = function() frontend(Config.frontend.settings) end,
  keybinds = function() frontend(Config.frontend.keybinds) end,
  disconnect = function()
    close()
    TriggerServerEvent('{{name}}:disconnect')
  end,
}

-- Whatever you return is what `await fetchNui('pause:action', { action })` resolves with.
nk.on('pause:action', function(data)
  local run = handlers[data.action]
  if not run or not enabled[data.action] or not pause:isOpen() then return { ok = false } end
  run()
  return { ok = true }
end)

RegisterNetEvent('{{name}}:info', function(data)
  info = type(data) == 'table' and data or {}
  if pause:isOpen() then pause:update(payload()) end
end)

-- Other resources can open or close it (a radial menu entry, a keybind): exports['{{name}}']:open()
exports('open', open)
exports('close', close)

--- One frame of the Esc watcher: a few natives and table reads.
local function tick()
  local now = GetGameTimer()
  if pause:isOpen() then
    SetPauseMenuActive(false)
    if nk.player.get().dead then close() end -- went down with it open: the death screen takes over
    return
  end
  if wasOpen then -- closed by Esc in the page (nuikit handles it) or by another surface
    wasOpen = false
    quietUntil = now + QUIET_MS
    blur(false)
  end
  if IsPauseMenuActive() then -- GTA's own pages (P, or one we opened) own Esc until they close
    quietUntil = now + QUIET_MS
    if returning then returning.seen = true end
    return
  end
  if returning then
    if returning.seen then
      returning = nil
      open()
      return
    elseif now > returning.deadline then
      returning = nil -- it never opened; give up quietly
    end
  end
  if blocked() then return end
  DisableControlAction(0, ESC, true)
  if now >= quietUntil and IsDisabledControlJustPressed(0, ESC) then open() end
end

CreateThread(function()
  while true do -- INFINITE LOOP: for the resource's life; every pass sleeps
    tick()
    Wait(0) -- Esc has to be caught the frame it's pressed; nothing is sent from here
  end
end)

AddEventHandler('onClientResourceStop', function(resource)
  if resource == GetCurrentResourceName() and blurred then TriggerScreenblurFadeOut(0.0) end
end)
