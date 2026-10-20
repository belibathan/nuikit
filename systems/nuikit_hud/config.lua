Config = {
  -- 'mph' or 'kmh'
  units = 'mph',
  -- Show GTA's minimap: 'vehicle' (only while driving), 'always' or 'never'
  radar = 'vehicle',
  -- nuikit frames GTA's minimap in the theme (docs/minimap.md). enabled = false leaves GTA's radar alone.
  minimap = {
    enabled = true,
    shape = 'square',        -- 'square' (rounded) or 'circle'
    size = 15.0,              -- the frame, in rem (1rem = 16px at 1080p)
    band = 0.375,             -- frame thickness, in rem
    anchor = 'bottom-left',  -- bottom-left, bottom-right, top-left, top-right (of the 16:9 stage)
    compass = true,           -- N on the frame (circle: N E S W turning with the camera)
    location = true,          -- street and area beside the map
  },
  -- Print where the minimap went to the F8 console.
  debug = false,
  -- Hide hunger/thirst/stress when your framework doesn't track them (they're never faked)
  needs = true,
}
