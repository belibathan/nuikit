Config = {
  -- 'mph' or 'kmh'
  units = 'mph',
  -- Show GTA's minimap: 'vehicle' (only while driving), 'always' or 'never'
  radar = 'vehicle',
  -- nuikit frames GTA's minimap in the theme (docs/minimap.md). enabled = false leaves GTA's radar alone.
  -- Off by default while it's unfinished: the map doesn't fill the frame yet and the compass stutters.
  minimap = {
    enabled = false,
    shape = 'square',        -- 'square' (rounded) or 'circle' (experimental: see fit)
    size = 15.0,              -- the frame, in rem (1rem = 16px at 1080p)
    band = 0.375,             -- frame thickness, in rem
    anchor = 'bottom-left',  -- bottom-left, bottom-right, top-left, top-right (of the 16:9 stage)
    compass = true,           -- N on the frame (circle: N E S W turning with the camera)
    location = true,          -- street and area beside the map
    -- circle only: stretch the radar box if GTA's round mask comes out oval on your screen
    fit = { x = 1.0, y = 1.0 },
  },
  -- Print where the minimap went to the F8 console.
  debug = false,
  -- Hide hunger/thirst/stress when your framework doesn't track them (they're never faked)
  needs = true,
}
