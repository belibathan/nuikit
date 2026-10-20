-- nuikit_pause: the 3D map (docs/pause-3d.md). A scripted camera hangs above the real game world and
-- the UI floats on top of it. The camera orbits a ground target: distance d, pitch (down is
-- negative) and heading. Every frame the live state eases toward the goal the UI asks for.

Map3D = {}

local cfg = Config.map or {}
local FOV = 50.0
local MIN_D, MAX_D = 80.0, 6000.0
local MIN_PITCH, MAX_PITCH = -89.0, -25.0
local EASE = 7.0            -- per second; higher = snappier
local INFO_MS = 200         -- area and street to the UI at most this often
-- Drags arrive at most 60 times a second (each NUI callback costs a frame ~0.5 ms at 180/s); each
-- step lands over the next few frames with this time constant (75% within one 60 Hz interval), so
-- the ground still follows the cursor and the motion stays smooth at any frame rate.
local DRAG_TAU = 0.012     -- seconds

local cam
local active = false
local cur, goal
local drag = { x = 0.0, y = 0.0, heading = 0.0, pitch = 0.0 } -- dragged but not landed yet
local lastPins, lastInfo, lastInfoAt = '', '', 0
local timecycle = false

local function clamp(v, a, b) return math.max(a, math.min(b, v)) end

--- Shortest signed angle from a to b, in degrees.
local function turn(a, b) return (b - a + 540.0) % 360.0 - 180.0 end
Map3D.turn = turn

local function groundZ(x, y, fallback)
  local ok, z = GetGroundZFor_3dCoord(x + 0.0, y + 0.0, 1500.0, false)
  if ok and z ~= 0.0 then return z end
  return fallback or 30.0
end

--- Where the camera sits for a state: behind the target along its heading, lifted by the pitch.
function Map3D.eye(s)
  local p, h = math.rad(-s.pitch), math.rad(s.heading)
  local horiz = s.d * math.cos(p)
  return s.x + math.sin(h) * horiz, s.y - math.cos(h) * horiz, s.z + s.d * math.sin(p)
end

local function waypoint()
  local blip = GetFirstBlipInfoId(8)
  if blip == 0 or not DoesBlipExist(blip) then return nil end
  local c = GetBlipInfoIdCoord(blip)
  return { x = c.x, y = c.y }
end

local function place(id)
  for _, p in ipairs(Config.places or {}) do
    if p.id == id then return p end
  end
end

-- ---------------------------------------------------------------- per-frame world tidy-up

local function tidyWorld(ped)
  HideHudAndRadarThisFrame()
  if cfg.hidePeds == false then return end
  -- Only for this client and only while the map is open: no crowds or traffic in the way.
  SetPedDensityMultiplierThisFrame(0.0)
  SetScenarioPedDensityMultiplierThisFrame(0.0, 0.0)
  SetVehicleDensityMultiplierThisFrame(0.0)
  SetRandomVehicleDensityMultiplierThisFrame(0.0)
  SetParkedVehicleDensityMultiplierThisFrame(0.0)
  for _, player in ipairs(GetActivePlayers()) do
    local p = GetPlayerPed(player)
    if p ~= 0 then
      SetEntityLocallyInvisible(p)
      local veh = GetVehiclePedIsIn(p, false)
      if veh ~= 0 then SetEntityLocallyInvisible(veh) end
    end
  end
  if ped then SetEntityLocallyInvisible(ped) end
end

-- ---------------------------------------------------------------- markers for the UI

--- The camera's axes for a pitch and heading (degrees): forward, right, up.
local function axes(pitch, heading)
  local p, h = math.rad(pitch), math.rad(heading)
  local fx, fy, fz = -math.sin(h) * math.cos(p), math.cos(h) * math.cos(p), math.sin(p)
  local rx, ry, rz = math.cos(h), math.sin(h), 0.0
  local ux, uy, uz = ry * fz - rz * fy, rz * fx - rx * fz, rx * fy - ry * fx
  return fx, fy, fz, rx, ry, rz, ux, uy, uz
end
Map3D.axes = axes

--- Where a world point lands on screen (0–1, y down) for a camera state: our own maths from the
--- exact camera set this frame, so pins move with the picture instead of a frame behind it.
--- Returns nil behind the camera.
function Map3D.project(s, aspect, x, y, z)
  local ex, ey, ez = Map3D.eye(s)
  local fx, fy, fz, rx, ry, rz, ux, uy, uz = axes(s.pitch, s.heading)
  local vx, vy, vz = x - ex, y - ey, z - ez
  local depth = vx * fx + vy * fy + vz * fz
  if depth < 1.0 then return nil end
  local tanV = math.tan(math.rad(s.fov or FOV) / 2.0)
  local sx = (vx * rx + vy * ry + vz * rz) / (depth * tanV * aspect)
  local sy = (vx * ux + vy * uy + vz * uz) / (depth * tanV)
  return (sx + 1.0) / 2.0, (1.0 - sy) / 2.0
end

local function round(v) return math.floor(v * 4000.0 + 0.5) / 4000.0 end

--- Pin positions for this frame, in Config.places order: { x0, y0, x1, y1, … } (-1 = off screen),
--- the player (x, y and facing relative to the camera) and the waypoint.
local function pins(ped, aspect)
  local at = {}
  local function put(x, y, z)
    local u, v = Map3D.project(cur, aspect, x, y, z)
    if u and u > -0.05 and u < 1.05 and v > -0.05 and v < 1.05 then return round(u), round(v) end
    return -1, -1
  end
  for _, p in ipairs(Config.places or {}) do
    local u, v = put(p.coords.x, p.coords.y, p.coords.z)
    at[#at + 1] = u
    at[#at + 1] = v
  end
  local pc = GetEntityCoords(ped)
  local you = false
  local px, py = put(pc.x, pc.y, pc.z)
  if px >= 0 then you = { px, py, math.floor((cur.heading - GetEntityHeading(ped)) % 360.0) } end
  local wp, wpAt = waypoint(), false
  if wp then
    local wx, wy = put(wp.x, wp.y, groundZ(wp.x, wp.y, pc.z))
    if wx >= 0 then wpAt = { wx, wy } end
  end
  return { at = at, you = you, wp = wpAt, h = math.floor(cur.heading) }
end
Map3D.pins = pins

local function pinsKey(p)
  local key = table.concat(p.at, ',') .. '|' .. p.h
  if p.you then key = key .. '|' .. p.you[1] .. ',' .. p.you[2] .. ',' .. p.you[3] end
  if p.wp then key = key .. '|' .. p.wp[1] .. ',' .. p.wp[2] end
  return key
end

--- What the panels show: the area and street under the view, top-down, whether there's a waypoint.
local function info()
  local zone = GetLabelText(GetNameOfZone(cur.x, cur.y, cur.z))
  local s1, s2 = GetStreetNameAtCoord(cur.x, cur.y, cur.z)
  local street = GetStreetNameFromHashKey(s1)
  if s2 and s2 ~= 0 then street = street .. ' / ' .. GetStreetNameFromHashKey(s2) end
  return { zone = zone, street = street, topdown = goal.pitch <= MIN_PITCH + 0.5, waypoint = waypoint() ~= nil }
end

-- ---------------------------------------------------------------- the loop

--- Land part of the pending drag on both the live camera and the goal (what a drag did at once
--- before it was rate-limited).
local function land(dt)
  local k = dt > 0 and 1.0 - math.exp(-dt / DRAG_TAU) or 0.0
  local x, y, h, p = drag.x * k, drag.y * k, drag.heading * k, drag.pitch * k
  drag.x, drag.y, drag.heading, drag.pitch = drag.x - x, drag.y - y, drag.heading - h, drag.pitch - p
  cur.x, cur.y = cur.x + x, cur.y + y
  goal.x, goal.y = goal.x + x, goal.y + y
  cur.heading, goal.heading = (cur.heading + h) % 360.0, (goal.heading + h) % 360.0
  cur.pitch = clamp(cur.pitch + p, -89.0, 10.0)
  goal.pitch = clamp(goal.pitch + p, MIN_PITCH, MAX_PITCH)
end

local function step(dt)
  land(dt)
  local k = 1.0 - math.exp(-EASE * dt)
  cur.x = cur.x + (goal.x - cur.x) * k
  cur.y = cur.y + (goal.y - cur.y) * k
  cur.z = cur.z + (goal.z - cur.z) * k
  -- distance eases in log space, so a 4 m → 900 m lift feels even
  cur.d = math.exp(math.log(cur.d) + (math.log(goal.d) - math.log(cur.d)) * k)
  cur.pitch = cur.pitch + (goal.pitch - cur.pitch) * k
  cur.heading = (cur.heading + turn(cur.heading, goal.heading) * k) % 360.0
  cur.fov = (cur.fov or FOV) + (FOV - (cur.fov or FOV)) * k
end
Map3D.step = step

local function loop()
  local last = GetGameTimer()
  while active do
    local now = GetGameTimer()
    local dt = math.min(0.1, (now - last) / 1000.0)
    last = now
    step(dt)
    local ex, ey, ez = Map3D.eye(cur)
    SetCamCoord(cam, ex, ey, ez)
    SetCamRot(cam, cur.pitch, 0.0, cur.heading, 2)
    SetCamFov(cam, cur.fov)
    Camera.stream(cur.x, cur.y, cur.z)
    local ped = PlayerPedId()
    tidyWorld(ped)
    -- pins every frame they move; the slower panel text a few times a second
    local p = pins(ped, GetAspectRatio(false))
    local key = pinsKey(p)
    if key ~= lastPins then
      lastPins = key
      NUI.send('pause:map:pins', p)
    end
    if now - lastInfoAt >= INFO_MS then
      lastInfoAt = now
      local i = info()
      local ikey = ('%s|%s|%s|%s'):format(i.zone, i.street, tostring(i.topdown), tostring(i.waypoint))
      if ikey ~= lastInfo then
        lastInfo = ikey
        NUI.send('pause:map:info', i)
      end
    end
    Wait(0)
  end
end

-- ---------------------------------------------------------------- start / stop

function Map3D.isActive() return active end

function Map3D.start()
  if active then return true end
  local ped = PlayerPedId()
  local pc = GetEntityCoords(ped)
  local wp = waypoint()
  local tx, ty = pc.x, pc.y
  if wp and cfg.startAtWaypoint ~= false then tx, ty = wp.x, wp.y end
  -- Start exactly where the picture is now (the gameplay camera, or Home's focus camera), so
  -- the map lifts off from the player's own view with no jump.
  local gc, gr = GetFinalRenderedCamCoord(), GetFinalRenderedCamRot(2)
  local dx, dy, dz = gc.x - pc.x, gc.y - pc.y, gc.z - pc.z
  local d = math.max(2.0, math.sqrt(dx * dx + dy * dy + dz * dz))
  local pitch, heading = clamp(gr.x, -89.0, 10.0), gr.z % 360.0
  local fx, fy, fz = axes(pitch, heading)
  -- the orbit target sits on the camera's line of sight, so the orbit's eye is the camera itself
  cur = { x = gc.x + fx * d, y = gc.y + fy * d, z = gc.z + fz * d, d = d, pitch = pitch, heading = heading, fov = GetFinalRenderedCamFov() }
  goal = {
    x = tx, y = ty, z = groundZ(tx, ty, pc.z),
    d = clamp(cfg.startHeight or 900.0, MIN_D, MAX_D),
    pitch = cfg.startPitch or -60.0,
    heading = cur.heading,
  }
  -- the camera service starts it on the current view and takes it back on death
  cam = Camera.claim({
    id = 'map',
    fov = cur.fov,
    onLost = function()
      -- the focus camera took over (or the player died): the map's own effects go with it
      active, cam = false, nil
      if timecycle then
        ClearTimecycleModifier()
        timecycle = false
      end
    end,
  })
  Camera.stream(goal.x, goal.y, goal.z) -- start loading the world where the map is headed
  if cfg.timecycle and cfg.timecycle ~= '' then
    SetTimecycleModifier(cfg.timecycle)
    SetTimecycleModifierStrength(1.0)
    timecycle = true
  end
  active = true
  drag = { x = 0.0, y = 0.0, heading = 0.0, pitch = 0.0 }
  lastPins, lastInfo, lastInfoAt = '', '', 0
  CreateThread(loop)
  return true
end

---@param mode? 'instant'|'handover' instant: cut back to the game; handover: another script camera
--- (Home's focus camera) has already taken over, so only clean up. Default: blend back.
function Map3D.stop(mode)
  if not active then return end
  active = false
  if mode == true then mode = 'instant' end
  -- the service clears world streaming with the camera (or when the focus camera takes over)
  if mode ~= 'handover' then Camera.release('map', { instant = mode == 'instant' }) end
  cam = nil
  if timecycle then
    ClearTimecycleModifier()
    timecycle = false
  end
end

-- ---------------------------------------------------------------- input from the UI

--- Drag the map: dx, dy are fractions of the screen. Grab-the-ground: the world follows the cursor.
function Map3D.pan(dx, dy)
  if not active then return end
  -- metres of ground per screen width / height at the middle of the view, so the spot under the
  -- cursor stays under the cursor
  local tanV = math.tan(math.rad(FOV) / 2.0)
  local across = 2.0 * cur.d * tanV * GetAspectRatio(false)
  local along = 2.0 * cur.d * tanV / math.max(0.35, math.sin(math.rad(-cur.pitch)))
  local h = math.rad(cur.heading)
  local rx, ry = math.cos(h), math.sin(h)     -- screen right, on the ground
  local fx, fy = -math.sin(h), math.cos(h)    -- screen up (away from the camera), on the ground
  local mx = -rx * dx * across + fx * dy * along
  local my = -ry * dx * across + fy * dy * along
  -- lands over the next few frames (land()), not eased: the ground has to follow the cursor
  drag.x, drag.y = drag.x + mx, drag.y + my
  goal.z = groundZ(goal.x + drag.x, goal.y + drag.y, goal.z)
end

function Map3D.rotate(dx, dy)
  if not active then return end
  local from = goal.pitch + drag.pitch
  drag.heading = drag.heading - dx * 180.0
  drag.pitch = drag.pitch + (clamp(from - dy * 90.0, MIN_PITCH, MAX_PITCH) - from)
end

function Map3D.zoom(delta)
  if not active then return end
  goal.d = clamp(goal.d * (1.0 + clamp(delta, -0.5, 0.5)), MIN_D, MAX_D)
end

function Map3D.fly(x, y, d)
  if not active then return false end
  goal.x, goal.y = x + 0.0, y + 0.0
  goal.z = groundZ(x, y, goal.z)
  if d then goal.d = clamp(d, MIN_D, MAX_D) end
  return true
end

function Map3D.focus(id)
  local p = place(id)
  if not p then return false end
  return Map3D.fly(p.coords.x, p.coords.y, cfg.focusHeight or 350.0)
end

function Map3D.recenter()
  local pc = GetEntityCoords(PlayerPedId())
  return Map3D.fly(pc.x, pc.y, cfg.focusHeight or 350.0)
end

function Map3D.topdown(on)
  if not active then return end
  goal.pitch = on and MIN_PITCH or (cfg.startPitch or -60.0)
  if on then goal.heading = 0.0 end
end

--- The ground under a screen point (u, v in 0–1, v down): a ray from the camera through it.
function Map3D.pick(u, v)
  if not active or not cam then return nil end
  local c, r = GetCamCoord(cam), GetCamRot(cam, 2)
  local p, h = math.rad(r.x), math.rad(r.z)
  local fx, fy, fz = -math.sin(h) * math.cos(p), math.cos(h) * math.cos(p), math.sin(p)
  local rx, ry, rz = math.cos(h), math.sin(h), 0.0
  -- up = right × forward
  local ux, uy, uz = ry * fz - rz * fy, rz * fx - rx * fz, rx * fy - ry * fx
  local tanV = math.tan(math.rad(GetCamFov(cam)) / 2.0)
  local tanH = tanV * GetAspectRatio(false)
  local nx, ny = u * 2.0 - 1.0, 1.0 - v * 2.0
  local dx = fx + rx * nx * tanH + ux * ny * tanV
  local dy = fy + ry * nx * tanH + uy * ny * tanV
  local dz = fz + rz * nx * tanH + uz * ny * tanV
  local len = math.sqrt(dx * dx + dy * dy + dz * dz)
  dx, dy, dz = dx / len, dy / len, dz / len

  local reach = 12000.0
  local ray = StartExpensiveSynchronousShapeTestLosProbe(c.x, c.y, c.z, c.x + dx * reach, c.y + dy * reach, c.z + dz * reach, 1, 0, 7)
  local _, hit, at = GetShapeTestResult(ray)
  local x, y, z
  if hit == 1 or hit == true then
    x, y, z = at.x, at.y, at.z
  elseif dz < -0.01 then
    -- far ground isn't loaded: meet the plane of the current target, then find the ground there
    local t = (cur.z - c.z) / dz
    x, y = c.x + dx * t, c.y + dy * t
    z = groundZ(x, y, cur.z)
  else
    return nil
  end

  local s1, s2 = GetStreetNameAtCoord(x, y, z)
  local street = GetStreetNameFromHashKey(s1)
  local crossing = (s2 and s2 ~= 0) and GetStreetNameFromHashKey(s2) or nil
  local pc = GetEntityCoords(PlayerPedId())
  local ddx, ddy, ddz = x - pc.x, y - pc.y, z - pc.z
  return {
    point = { x = x, y = y, z = z },
    street = street,
    crossing = crossing,
    zone = GetLabelText(GetNameOfZone(x, y, z)),
    distance = math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz),
  }
end

function Map3D.waypoint(x, y)
  if x == nil then
    SetWaypointOff()
    return true
  end
  SetNewWaypoint(x + 0.0, y + 0.0)
  return true
end

--- Test hook: the live and goal camera states.
function Map3D.state() return cur, goal end
