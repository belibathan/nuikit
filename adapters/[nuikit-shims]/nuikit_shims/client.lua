--[[
  nuikit_shims: registers every ShimConfig entry as an export under the OLD resource's name.
  A resource can only declare exports under its own name with exports(); FiveM resolves
  exports[res]:fn() by triggering `__cfx_export_<res>_<fn>`, so we answer that event for the names we
  `provide` (the same thing exports() does, under another name). Details: docs/adapters/shims.md.
]]
local warned = {}
local function warnOnce(key, msg)
  if warned[key] then return end
  warned[key] = true
  print(('^1[nuikit_shims]^7 %s'):format(msg))
end

for i, e in ipairs(ShimConfig or {}) do
  local problem = NkShim.check(e)
  if problem then
    warnOnce('cfg' .. i, ('config entry %d skipped: %s'):format(i, problem))
  else
    local key = ('%s:%s'):format(e.resource, e.export)
    AddEventHandler(('__cfx_export_%s_%s'):format(e.resource, e.export), function(setCB)
      setCB(function(...)
        local out = table.pack(pcall(NkShim.call, nk, e, ...))
        if not out[1] then
          warnOnce(key, ('%s failed: %s'):format(key, tostring(out[2])))
          return nil
        end
        return table.unpack(out, 2, out.n)
      end)
    end)
  end
end
