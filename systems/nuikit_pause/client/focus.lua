-- nuikit_pause: the focus camera on Home (docs/pause-3d.md). A scripted camera frames the player
-- inside the screen rectangle the UI leaves empty: the character on foot, the whole vehicle when in
-- one. Nothing is spawned or hidden; the player stays exactly as they are. The camera follows if
-- they move (a passenger in a moving car), keeps out of walls, can be turned with a drag, and hands
-- back to the gameplay camera when the menu closes.

Focus = {}

local cfg = Config.preview or {}
local FOV = 40.0
local TURN_EASE = 10.0     -- drag-to-turn smoothing, per second
local ARRIVE = 3.2         -- how fast the camera settles into its framing, per second
local MARGIN = 1.08        -- a little air around the subject

local cam
local active = false
local home = { x = 0.325, y = 0.044, w = 0.65, h = 0.911 } -- what the pause menu last reported (default: right of the sheet)
local frame = home                                       -- what this run frames into
local usingHome = true
local rel = 0.0            -- camera yaw relative to the subject's heading, set when it starts
local startHeading = 0.0   -- the player's heading when it started (on foot the camera keeps it)
local angle, goalAngle = 0.0, 0.0
local reach                -- current camera distance after wall checks (eased)
local residual             -- start pose minus framed pose: decays to zero, so the camera glides in
-- How it looks at the player:
--   'current' (default): the gameplay camera's own heading and pitch, only moved in to frame them (a
--     dolly, no swing: nothing turns the view, so nothing to get motion sick from);
--   'front': faces them, chest height, head and upper body (swings round them to get there);
--   'behind': the 0.7.0 framing (whole body, from the gameplay camera's side, turned by preview.angle).
local function facing()
  if cfg.facing == 'front' or cfg.facing == 'behind' then return cfg.facing end
  return 'current'
end
local startPitch = -4.0    -- 'current': the gameplay camera's pitch when it started
local last                 -- the subject and pose from the last frame (debug and handover)

local function clamp(v, a, b) return math.max(a, math.min(b, v)) end

local function debug(fmt, ...)
  if Config.debug then print(('[nuikit_pause] focus: ' .. fmt):format(...)) end
end

--- Why the camera can't focus right now, or nil.
function Focus.unavailable()
  if Config.views and Config.views.preview == false then return 'turned off in config' end
  if Camera.down() then return 'dead' end
  return nil
end

function Focus.available() return Focus.unavailable() == nil end

--- What to frame: the vehicle the player is in, or the player. Returns the entity, its centre, the
--- height and the horizontal span (metres) to fit, and the pitch to look from.
function Focus.subject()
  local ped = PlayerPedId()
  local veh = GetVehiclePedIsIn(ped, false)
  if veh ~= 0 then
    local mn, mx = GetModelDimensions(GetEntityModel(veh))
    local c = GetOffsetFromEntityInWorldCoords(veh, (mn.x + mx.x) / 2.0, (mn.y + mx.y) / 2.0, (mn.z + mx.z) / 2.0)
    local dx, dy = mx.x - mn.x, mx.y - mn.y
    return veh, { x = c.x, y = c.y, z = c.z }, mx.z - mn.z, math.sqrt(dx * dx + dy * dy), -12.0, 'vehicle'
  end
  local c = GetEntityCoords(ped)
  if facing() == 'front' then
    -- head to mid-thigh, centred on the chest (the ped's origin is at the hips): the camera ends up
    -- level with the chest, looking a touch down at the face
    return ped, { x = c.x, y = c.y, z = c.z + 0.2 }, 1.45, 0.8, -5.0, 'on foot'
  end
  return ped, { x = c.x, y = c.y, z = c.z - 0.05 }, 1.95, 0.9, -4.0, 'on foot'
end

--- How far back to stand so something `height` tall and `span` wide fits the frame rectangle.
function Focus.fit(f, aspect, height, span)
  local tanV = math.tan(math.rad(FOV) / 2.0)
  local tanH = tanV * aspect
  local byHeight = height / (2.0 * clamp(f.h, 0.2, 1.0) * tanV)
  local bySpan = span / (2.0 * clamp(f.w, 0.1, 1.0) * tanH)
  return math.max(byHeight, bySpan) * MARGIN
end

--- The camera position for a subject centre, distance and angles, offset so the centre lands in
--- the middle of the frame rectangle instead of the middle of the screen.
function Focus.pose(f, aspect, center, d, pitch, yaw)
  local tanV = math.tan(math.rad(FOV) / 2.0)
  local tanH = tanV * aspect
  local nx = (f.x + f.w / 2.0) * 2.0 - 1.0
  local ny = 1.0 - (f.y + f.h / 2.0) * 2.0
  local fx, fy, fz, rx, ry, rz, ux, uy, uz = Map3D.axes(pitch, yaw)
  local sx, sy = nx * d * tanH, ny * d * tanV
  return center.x - fx * d - rx * sx - ux * sy,
    center.y - fy * d - ry * sx - uy * sy,
    center.z - fz * d - rz * sx - uz * sy
end

--- Pull the camera in front of any wall or object between it and the subject.
local function clear(entity, center, x, y, z, d)
  local ray = StartExpensiveSynchronousShapeTestLosProbe(center.x, center.y, center.z, x, y, z, 17, entity, 7)
  local _, hit, at = GetShapeTestResult(ray)
  if hit == 1 or hit == true then
    local hx, hy, hz = at.x - center.x, at.y - center.y, at.z - center.z
    return math.min(d, math.max(0.6, math.sqrt(hx * hx + hy * hy + hz * hz) - 0.25))
  end
  return d
end

--- Lighting presets for the subject, this client only. Off by default (0.8): Config.preview.light =
--- 'studio' turns on a soft studio light so the player reads at night and in shade (a warm key light from
--- the camera side, a cool rim light behind), at Config.preview.lightIntensity (default 3.0). A bare
--- number (the 0.7 setting, e.g. 3.0) no longer turns it on.
local LIGHTS = {
  studio = function(center, d, span, yaw, key)
    local h = math.rad(yaw)
    local fx, fy = -math.sin(h), math.cos(h)
    local rx, ry = math.cos(h), math.sin(h)
    local k = math.min(d * 0.45, 3.0)
    DrawLightWithRange(center.x - fx * k - rx * 0.6, center.y - fy * k - ry * 0.6, center.z + 0.6, 255, 238, 220, d + 2.0, key)
    local b = span * 0.5 + 0.6
    DrawLightWithRange(center.x + fx * b + rx * 0.5, center.y + fy * b + ry * 0.5, center.z + 0.9, 200, 215, 255, span + 2.0, key * 0.6)
  end,
}

local function light(center, d, span, yaw)
  local preset = type(cfg.light) == 'string' and LIGHTS[cfg.light] or nil
  if not preset then return end
  local key = tonumber(cfg.lightIntensity) or 3.0
  if key <= 0 then return end
  preset(center, d, span, yaw, key)
end

--- Where the camera should be this frame (before the glide-in), and the subject it frames.
local function target(dt)
  local entity, center, height, span, pitch, kind = Focus.subject()
  if facing() == 'current' then pitch = startPitch end
  local aspect = GetAspectRatio(false)
  local d = Focus.fit(frame, aspect, height, span)
  -- On foot the yaw comes from the heading at the start, not the live one: in first person GTA turns
  -- the ped toward the camera, which turned the camera again, and it spun while the menu was open
  -- (0.7.0 test, F5). A vehicle keeps following (a passenger in a car that turns).
  local heading = kind == 'vehicle' and GetEntityHeading(entity) or startHeading
  local yaw = (heading + rel + angle + (residual and residual.orbit or 0.0)) % 360.0
  local x, y, z = Focus.pose(frame, aspect, center, d, pitch, yaw)
  -- walls: come in at once, go back out gently
  local want = clear(entity, center, x, y, z, d)
  if not reach or want < reach then reach = want
  else reach = reach + (want - reach) * (1.0 - math.exp(-3.0 * dt)) end
  if reach < d - 0.01 then x, y, z = Focus.pose(frame, aspect, center, reach, pitch, yaw) end
  return { x = x, y = y, z = z, pitch = pitch, yaw = yaw }, entity, center, d, span, kind
end

local function apply(p)
  SetCamCoord(cam, p.x, p.y, p.z)
  SetCamRot(cam, p.pitch, 0.0, p.yaw, 2)
  SetCamFov(cam, p.fov)
end

--- One frame: follow the subject, decay the glide-in, light it.
function Focus.step(dt)
  angle = angle + Map3D.turn(angle, goalAngle) * (1.0 - math.exp(-TURN_EASE * dt))
  if not residual then
    residual = { x = 0.0, y = 0.0, z = 0.0, pitch = 0.0, yaw = 0.0, fov = 0.0, orbit = 0.0 }
  end
  local k = math.exp(-ARRIVE * dt)
  -- the orbit swings the camera around the subject (never through it) to the front
  residual.orbit = (residual.orbit or 0.0) * k
  local t, entity, center, d, span, kind = target(dt)
  for _, f in ipairs({ 'x', 'y', 'z', 'pitch', 'yaw', 'fov' }) do residual[f] = residual[f] * k end
  local p = { x = t.x + residual.x, y = t.y + residual.y, z = t.z + residual.z, pitch = t.pitch + residual.pitch, yaw = t.yaw + residual.yaw, fov = FOV + residual.fov }
  apply(p)
  light(center, d, span, t.yaw)
  last = { pose = p, kind = kind, d = d }
  return p
end

local function loop()
  local prev = GetGameTimer()
  while active do
    local now = GetGameTimer()
    local dt = math.min(0.1, (now - prev) / 1000.0)
    prev = now
    if not Focus.available() then
      debug('lost: %s', Focus.unavailable())
      Focus.stop()
      if Focus.onLost then Focus.onLost() end
      return
    end
    HideHudAndRadarThisFrame()
    Focus.step(dt)
    Wait(0)
  end
end

function Focus.isActive() return active end

--- Start from whatever is on screen now (the gameplay camera, or the map's camera) and glide in.
---@param opts? { frame?: table } frame: the empty screen rectangle to frame the player in (0–1);
--- default: the pause menu's stage
---@return boolean started
function Focus.start(opts)
  if active then return true end
  usingHome = not (opts and opts.frame)
  frame = usingHome and home or opts.frame
  local why = Focus.unavailable()
  if why then
    debug('not shown: %s', why)
    return false
  end
  local from, fromRot = GetFinalRenderedCamCoord(), GetFinalRenderedCamRot(2)
  local entity = Focus.subject()
  startHeading = GetEntityHeading(entity)
  -- front: a camera looking along heading + 180 faces the player; behind: keep the current view's side
  rel = facing() == 'front' and 180.0 or (fromRot.z - startHeading) % 360.0
  -- 'current' keeps the view as it is: no turn on open (preview.angle is for 'front' / 'behind')
  angle, goalAngle = 0.0, facing() == 'current' and 0.0 or (cfg.angle or 0.0)
  startPitch = clamp(fromRot.x, -35.0, 10.0)
  reach = nil
  -- start the orbit where the current view is, so the glide swings round the player to the front
  residual = { x = 0.0, y = 0.0, z = 0.0, pitch = 0.0, yaw = 0.0, fov = 0.0, orbit = 0.0 }
  residual.orbit = Map3D.turn((startHeading + rel) % 360.0, fromRot.z % 360.0)
  local t = target(0.0)
  residual.x, residual.y, residual.z = from.x - t.x, from.y - t.y, from.z - t.z
  residual.pitch, residual.yaw = fromRot.x - t.pitch, Map3D.turn(t.yaw, fromRot.z)
  residual.fov = GetFinalRenderedCamFov() - FOV
  -- the camera service starts it on the current view (seamless) and takes it back on death
  cam = Camera.claim({
    id = 'focus',
    onLost = function(reason)
      active, cam, residual = false, nil, nil
      if reason == 'dead' and Focus.onLost then Focus.onLost() end
    end,
  })
  active = true
  CreateThread(loop)
  if Config.debug then
    local p = Focus.step(0.0)
    debug('shown %s: camera %.1f m back, frame %.2f %.2f %.2f %.2f, at %.1f %.1f %.1f', last.kind, last.d, frame.x, frame.y, frame.w, frame.h, p.x, p.y, p.z)
  end
  return true
end

---@param mode? 'instant'|'handover' instant: cut back to the game; handover: another script camera
--- (the map) has already taken over, so only clean up. Default: blend back to the gameplay camera.
function Focus.stop(mode)
  if not active then return end
  active = false
  -- after a handover the map owns the camera already; release() only acts for the owner anyway
  if mode ~= 'handover' then Camera.release('focus', { instant = mode == 'instant', ms = cfg.blendMs or 600 }) end
  cam = nil
  residual = nil
end

--- The empty stage area the UI measured (0–1 screen fractions).
function Focus.setFrame(f)
  if type(f) ~= 'table' then return end
  local x, y, w, h = tonumber(f.x), tonumber(f.y), tonumber(f.w), tonumber(f.h)
  if not (x and y and w and h) or w <= 0 or h <= 0 then return end
  home = { x = clamp(x, 0, 1), y = clamp(y, 0, 1), w = clamp(w, 0.05, 1), h = clamp(h, 0.05, 1) }
  if usingHome then frame = home end
  debug('frame from the UI %.2f %.2f %.2f %.2f', frame.x, frame.y, frame.w, frame.h)
end

--- Frame into a new screen rectangle during a run that isn't Home's (the inventory's, when its page
--- reports it): the camera glides to the new framing instead of jumping.
function Focus.reframe(f)
  if usingHome or type(f) ~= 'table' then return end
  if not active then
    frame = f
    return
  end
  local before = target(0.0)
  frame = f
  local after = target(0.0)
  if residual then
    residual.x = residual.x + before.x - after.x
    residual.y = residual.y + before.y - after.y
    residual.z = residual.z + before.z - after.z
    residual.pitch = residual.pitch + before.pitch - after.pitch
    residual.yaw = residual.yaw + Map3D.turn(after.yaw, before.yaw)
  end
  debug('reframed %.2f %.2f %.2f %.2f', f.x, f.y, f.w, f.h)
end

--- Drag to look around: dx is a fraction of the screen width; a full width is one turn.
function Focus.rotate(dx)
  goalAngle = goalAngle + (tonumber(dx) or 0) * 360.0
end

--- Test hook.
function Focus.state() return { frame = frame, last = last, residual = residual, reach = reach } end
