-- nuikit_screen: the maths of a world screen (no natives, so it runs in tests). A screen is a flat
-- rectangle standing in the world: its centre, the heading it faces (degrees, like an entity's),
-- an optional tilt back (degrees) and a size in metres. u runs left → right, v top → bottom, as
-- seen by someone standing in front of it.

-- GLOBAL: module table, shared by this resource's files
Screen = {}

local rad, sin, cos = math.rad, math.sin, math.cos

--- The screen's axes as unit vectors: right (u), down (v) and the normal it faces. It faces along its
--- heading (where an entity with that heading looks), so its viewer stands there looking back.
function Screen.axes(s)
  local h, t = rad(s.heading or 0.0), rad(s.tilt or 0.0)
  local fx, fy = -sin(h), cos(h)
  -- the viewer looks along (-fx, -fy): their right is (-cos h, -sin h)
  local right = { -cos(h), -sin(h), 0.0 }
  -- tilted back by t, the top leans away from the viewer
  local down = { fx * sin(t), fy * sin(t), -cos(t) }
  local normal = { fx * cos(t), fy * cos(t), sin(t) }
  return right, down, normal
end

--- The four corners: top left, top right, bottom right, bottom left.
function Screen.corners(s)
  local r, d = Screen.axes(s)
  local hw, hh = (s.width or 1.0) / 2.0, (s.height or 0.6) / 2.0
  local c = s.coords
  local function at(a, b)
    return { c.x + r[1] * a + d[1] * b, c.y + r[2] * a + d[2] * b, c.z + r[3] * a + d[3] * b }
  end
  return at(-hw, -hh), at(hw, -hh), at(hw, hh), at(-hw, hh)
end

--- Where a ray (origin o, direction dir) meets the screen, as u, v in 0–1; nil when it misses or
--- hits it from behind.
function Screen.uvAt(s, o, dir)
  local r, d, n = Screen.axes(s)
  local denom = dir[1] * n[1] + dir[2] * n[2] + dir[3] * n[3]
  if denom >= -1e-6 then return nil end -- parallel, or from behind
  local c = s.coords
  local t = ((c.x - o[1]) * n[1] + (c.y - o[2]) * n[2] + (c.z - o[3]) * n[3]) / denom
  if t <= 0 then return nil end
  local px, py, pz = o[1] + dir[1] * t - c.x, o[2] + dir[2] * t - c.y, o[3] + dir[3] * t - c.z
  local u = (px * r[1] + py * r[2] + pz * r[3]) / (s.width or 1.0) + 0.5
  local v = (px * d[1] + py * d[2] + pz * d[3]) / (s.height or 0.6) + 0.5
  if u < 0 or u > 1 or v < 0 or v > 1 then return nil end
  return u, v, t
end

--- A ray from a camera through a screen point (nx, ny in -1–1, y up): camera rotation in degrees
--- (pitch, roll, yaw as GetFinalRenderedCamRot(2)), vertical fov in degrees, aspect = w / h.
function Screen.ray(rot, fov, aspect, nx, ny)
  local p, h = rad(rot.x), rad(rot.z)
  local fx, fy, fz = -sin(h) * cos(p), cos(h) * cos(p), sin(p)
  local rx, ry, rz = cos(h), sin(h), 0.0
  local ux, uy, uz = ry * fz - rz * fy, rz * fx - rx * fz, rx * fy - ry * fx
  local tanV = math.tan(rad(fov) / 2.0)
  local tanH = tanV * aspect
  local dx = fx + rx * nx * tanH + ux * ny * tanV
  local dy = fy + ry * nx * tanH + uy * ny * tanV
  local dz = fz + rz * nx * tanH + uz * ny * tanV
  local len = math.sqrt(dx * dx + dy * dy + dz * dz)
  return { dx / len, dy / len, dz / len }
end
