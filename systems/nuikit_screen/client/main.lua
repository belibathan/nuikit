-- nuikit_screen: interactive screens in the world (a laptop, a terminal, a wall display), drawn by a
-- web page in a DUI. SPIKE (Foundation 2, wave 3): not seen in game yet.
--
--   local id = exports.nuikit_screen:create({ coords = vec3(…), heading = 90.0, width = 0.34, height = 0.21,
--     url = 'nui://my_resource/web/dist/index.html', resolution = { 1920, 1080 } })
--   exports.nuikit_screen:send(id, 'myAction', { … })   -- a window message in the page, like SendNUIMessage
--   exports.nuikit_screen:remove(id)
--
-- The page is drawn as a textured quad (DrawSpritePoly) where the screen stands, so it works on any
-- prop or none, without knowing a model's render target. Near one, E uses it: the game's cursor
-- drives the page (a ray from the camera through the cursor meets the screen; the hit becomes DUI
-- mouse events), and Esc or E lets go. While in use, a modal surface keeps the pause menu and other
-- modals away; no NUI focus is taken.

local cfg = Config or {}
local screens, nextId = {}, 0
local using = nil
-- while one is in use: a modal on the stack (the pause menu and other modals stay away), no NUI focus
local surface = nk.surface.define('screen', { layer = 'modal', input = 'none', escape = 'ignore', hides = { 'hud' } })

local DRAW_DISTANCE = cfg.drawDistance or 25.0
local USE_DISTANCE = cfg.useDistance or 1.6
local USE_KEY = 38 -- INPUT_PICKUP (E)

local function create(def)
  if type(def) ~= 'table' or not def.coords or type(def.url) ~= 'string' then return nil end
  nextId = nextId + 1
  local id = nextId
  local res = def.resolution or { 1920, 1080 }
  local dui = CreateDui(def.url, res[1], res[2])
  local txd = ('nuikit_screen_%d'):format(id)
  local dict = CreateRuntimeTxd(txd)
  CreateRuntimeTextureFromDuiHandle(dict, 'page', GetDuiHandle(dui))
  screens[id] = {
    id = id,
    coords = def.coords,
    heading = def.heading or 0.0,
    tilt = def.tilt or 0.0,
    width = def.width or 1.0,
    height = def.height or 0.5625,
    res = res,
    dui = dui,
    txd = txd,
    label = def.label or 'Use screen',
  }
  return id
end

local function remove(id)
  local s = screens[id]
  if not s then return false end
  if using == s then using = nil end
  DestroyDui(s.dui)
  screens[id] = nil
  return true
end

local function send(id, action, data)
  local s = screens[id]
  if not s then return false end
  SendDuiMessage(s.dui, json.encode({ action = action, data = data }))
  return true
end

exports('create', create)
exports('remove', remove)
exports('send', send)

-- ---------------------------------------------------------------- drawing

local function draw(s)
  local tl, tr, br, bl = Screen.corners(s)
  -- two triangles, uv per corner (w = 1)
  DrawSpritePoly(tl[1], tl[2], tl[3], bl[1], bl[2], bl[3], br[1], br[2], br[3], 255, 255, 255, 255, s.txd, 'page', 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0)
  DrawSpritePoly(tl[1], tl[2], tl[3], br[1], br[2], br[3], tr[1], tr[2], tr[3], 255, 255, 255, 255, s.txd, 'page', 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0)
end

local function dist(a, b)
  local dx, dy, dz = a.x - b.x, a.y - b.y, a.z - b.z
  return math.sqrt(dx * dx + dy * dy + dz * dz)
end

-- ---------------------------------------------------------------- using one

local pressed = false

local function release()
  if not using then return end
  if pressed then SendDuiMouseUp(using.dui, 'left') end
  pressed = false
  using = nil
  surface:close()
end

local function use(s)
  if using then return end
  if not surface:open({}) then return end -- something else is on top
  using = s
end

local function drive(s)
  DisableAllControlActions(0)
  EnableControlAction(0, 239, true) -- cursor x
  EnableControlAction(0, 240, true) -- cursor y
  SetMouseCursorActiveThisFrame()
  local nx = GetControlNormal(0, 239) * 2.0 - 1.0
  local ny = 1.0 - GetControlNormal(0, 240) * 2.0
  local cam = GetFinalRenderedCamCoord()
  local dir = Screen.ray(GetFinalRenderedCamRot(2), GetFinalRenderedCamFov(), GetAspectRatio(false), nx, ny)
  local u, v = Screen.uvAt(s, { cam.x, cam.y, cam.z }, dir)
  if u then
    SendDuiMouseMove(s.dui, math.floor(u * s.res[1]), math.floor(v * s.res[2]))
    if IsDisabledControlJustPressed(0, 24) then
      SendDuiMouseDown(s.dui, 'left')
      pressed = true
    end
    if IsDisabledControlJustPressed(0, 241) then SendDuiMouseWheel(s.dui, 120, 0) end
    if IsDisabledControlJustPressed(0, 242) then SendDuiMouseWheel(s.dui, -120, 0) end
  end
  if pressed and IsDisabledControlJustReleased(0, 24) then
    SendDuiMouseUp(s.dui, 'left')
    pressed = false
  end
  if IsDisabledControlJustPressed(0, 200) or IsDisabledControlJustPressed(0, 177) or IsDisabledControlJustPressed(0, USE_KEY) then
    release()
  end
end



--- One frame: draw the screens in range, drive the one in use, offer E near one. Answers whether
--- any screen is in range (the loop runs every frame only then).
local function frame()
  local near = false
  local pc = GetEntityCoords(PlayerPedId())
  for _, s in pairs(screens) do
    local d = dist(pc, s.coords)
    if d < DRAW_DISTANCE then
      near = true
      draw(s)
      if using == s then
        drive(s)
      elseif not using and d < USE_DISTANCE then
        BeginTextCommandDisplayHelp('STRING')
        AddTextComponentSubstringPlayerName(('~INPUT_PICKUP~ %s'):format(s.label))
        EndTextCommandDisplayHelp(0, false, false, -1)
        if IsControlJustPressed(0, USE_KEY) then use(s) end
      end
    end
  end
  if using and dist(pc, using.coords) > USE_DISTANCE * 2 then release() end
  return near
end
Screens = { frame = frame, create = create, remove = remove }

CreateThread(function()
  while true do
    Wait(frame() and 0 or 500)
  end
end)

-- The demo: a screen in front of you showing this resource's own page (Config.demo).
if cfg.demo ~= false then
  RegisterCommand('nuikit_screen', function()
    local ped = PlayerPedId()
    local h = GetEntityHeading(ped)
    local c = GetOffsetFromEntityInWorldCoords(ped, 0.0, 1.2, 0.35)
    -- facing the player: the screen's heading points back at them
    create({ coords = c, heading = (h + 180.0) % 360.0, width = 0.9, height = 0.5625, url = ('nui://%s/web/dist/index.html?screen=1'):format(GetCurrentResourceName()), label = 'Use the terminal' })
  end, false)
end

AddEventHandler('onResourceStop', function(name)
  if name ~= GetCurrentResourceName() then return end
  for id in pairs(screens) do remove(id) end
end)
