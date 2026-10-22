-- nuikit_hud settings. Every element can be turned off here; the look comes from the server's
-- identity (nuikit/theme.css). See README.md for what each one does.
Config = {
  -- Speed unit: 'mph' or 'kmh'. With playerUnits, each player can pick their own (/hud units kmh).
  units = 'mph',
  playerUnits = true,

  -- Show GTA's radar: 'always' (on foot too), 'vehicle' (only while in a vehicle) or 'never'.
  radar = 'always',

  -- Where the parts go. Both presets use the same parts (map, location, vitals, wallet, ammo,
  -- vehicle), placed differently:
  --   'compact'  a round map top right with the compass on its ring, the location and money under it;
  --              labelled vitals bottom left; a small cluster and the ammo bottom right.
  --   'classic'  the 0.6 layout: a framed square map bottom left with the location above it, vitals
  --              beside it, the heading strip top centre, money top right, the large cluster.
  layout = 'compact',

  -- Move any part on top of the preset (nil keeps the preset's place). A corner ('top-left',
  -- 'top-right', 'bottom-left', 'bottom-right'), 'map' (compact: the column under or over the map;
  -- classic: the location above the map, the vitals beside it) or false (hidden); or a table
  -- { at = 'bottom-right', order = 1 } where order is top to bottom within the corner.
  -- The presets:
  --   compact  map top-right; location 1, wallet 2 on the map; vitals bottom-left;
  --            ammo 1, vehicle 2 bottom-right
  --   classic  map bottom-left; location 1, vitals 2 on the map; wallet 1, ammo 2 top-right;
  --            vehicle bottom-right
  -- Notices and prompts follow the parts (the HUD publishes the screen zones it covers).
  -- Players can move them for themselves with /hud edit (saved on their machine; /hud reset), and
  -- /hud export prints the layout on screen as this block. playerLayout = false turns that off.
  parts = {
    map = nil,         -- a corner (Config.minimap.anchor, when set, wins)
    location = nil,
    wallet = nil,
    vitals = nil,
    ammo = nil,
    vehicle = nil,
  },
  playerLayout = true,

  -- Named zones (Foundation 2): status, map, vitals, vehicle (the HUD's parts, measured on screen
  -- once it shows) and prompts, interaction, toasts (boxes for the resources that draw them).
  -- exports.nuikit_hud:zones() returns them all. A box here replaces a default: x, y from the safe
  -- area's top-left, w, h, all as fractions of the safe area. Defaults: client/layout.lua Layout.ZONES.
  zones = {
    -- prompts = { x = 0.35, y = 0.80, w = 0.30, h = 0.10 },
  },

  -- Situations (Foundation 2): which zones show while the player is at rest, in a moment (something
  -- just changed: a vital, money, the street, a weapon), driving, or interacting (a resource sends
  -- TriggerEvent('nuikit_hud:interaction', true/false)). retract is the lever, off: everything
  -- shows as it always has. On, a zone not listed for the situation slides away, at rest only after
  -- the theme's --nk-rest-delay (8s) without a moment. The map stays (GTA's radar can't retract).
  situations = {
    retract = false,
    rest = { 'map', 'vehicle' },
    moment = { 'status', 'map', 'vitals', 'vehicle' },
    driving = { 'status', 'map', 'vitals', 'vehicle' },
    interaction = { 'map', 'vitals' },
  },

  -- Where the HUD's edges are. 'game' reads GTA's own HUD alignment for this screen and safe zone
  -- (16:9, 21:9, 32:9), falling back to 'stage' if the game's answer looks wrong. 'stage' is the
  -- 0.5.0 rule: the middle 16:9 of the screen, inset by the safe zone.
  area = 'game',

  -- nuikit shapes and frames GTA's minimap. enabled = false leaves GTA's radar alone (the HUD still
  -- lines up beside it). Values left out (nil) come from the layout preset:
  --   compact: circle, 15rem, a 0.125rem ring, top-right;  classic: square, 15rem, 0.375rem, bottom-left
  minimap = {
    enabled = true,
    -- 'ring': nuikit places GTA's radar and draws the ring / frame (default). 'stock': GTA's radar is
    -- left as it is and the HUD lays out around it. A started minimap resource from `yieldTo` turns
    -- this to 'stock' on its own (one line in F8 says which); nil uses the built-in list, {} never yields.
    style = 'ring',
    yieldTo = nil,
    shape = nil,             -- 'square' (rounded) or 'circle'
    size = nil,              -- the frame, in rem (1rem = 16px at 1080p)
    band = nil,              -- frame thickness, in rem
    anchor = nil,            -- bottom-left, bottom-right, top-left, top-right
    -- The radar's box, width over height. nil follows routeClip: a square box ('box', the default) or
    -- GTA's own (about 1.41, the map unsqueezed; every other candidate). Set it to force either.
    aspect = nil,
    -- The GPS route. GTA draws it across the whole radar box, not through the mask that shapes the
    -- map, so on a round map it ran out of the ring's sides (0.7.0 test, A4). What clips it is not
    -- known beyond the radar box itself, so the default squares the box; the rest are candidates
    -- to try in game (with Config.debug, F8: `nuikit_minimap route <x>`):
    --   'box'      the default: the radar box becomes the hole's square (aspect 1): the route can't leave
    --              that square, only its corners; the map is squeezed about 29% (the 0.7.0-next look)
    --   'mask'     minimap_mask over the hole, GTA's aspect: the 0.7.0 placement (the map unsqueezed,
    --              the route overhangs the ring's sides)
    --   'inset'    minimap_mask on the square inside the disc: if the route is cut to that component,
    --              nothing leaves the ring (the route then stops a little short of it at N/E/S/W)
    --   'texture'  our disc also replaces GTA's second radar mask texture (radarmask1g)
    --   'stock'    minimap_mask left where GTA has it: the control (does the component matter at all)
    routeClip = 'box',
    -- A spike, not seen in game: true slides GTA's radar (and its ring) 2.5rem toward its edge with
    -- the rest of the HUD when a menu hides it, frame by frame, instead of cutting it. If the radar
    -- doesn't move in game, GTA only takes new positions on a big-map flick: leave it false.
    slide = false,
    -- A soft dark plate behind the round ring, the same one the compact speedometer sits on, so the
    -- ring reads over a bright sky (an experiment, on). Its strength is the theme's HUD plate
    -- (--nk-hud-opacity, shared with the speedometer); --nk-map-halo-size (2.5rem) is how far it fades out.
    halo = true,
    -- Where the location and money column stands: 'auto' (under a map in a top corner, over one in a
    -- bottom corner), 'below' or 'above'. Over a round map it clears the heading read above the ring.
    column = 'auto',
    -- nuikit's waypoint tag on the ring (an arrow and the distance on its lower shoulder). Off: GTA
    -- already shows the waypoint on the radar. With the radar off the distance still reads under
    -- the location (Config.location.waypoint).
    waypointTag = false,
    -- GTA's own GPS distance readout inside the radar (its satnav). false hides it (the nuikit
    -- resource tells the minimap movie HIDE_SATNAV every frame; not seen in game); true leaves it.
    gameDistance = false,
    compass = true,          -- cardinals on the ring (square: N on the frame), heading above (compact)
    location = true,         -- the location under (compact) or above (classic) the map
  },

  -- Health, armor, hunger, thirst, stress. Each one: 'auto' (shows when it changes or crosses its
  -- threshold, then fades), 'always', or false (never).
  vitals = {
    enabled = true,
    health = 'auto',
    armor = 'auto',
    hunger = 'auto',
    thirst = 'auto',
    stress = 'auto',
    low = 25,          -- health, armor, hunger, thirst at or below this (%) stay on screen
    high = 60,         -- stress at or above this (%) stays on screen
    linger = 5000,     -- ms a vital stays after it changed
  },
  -- Hide hunger/thirst/stress entirely (they're never faked when the framework lacks them).
  needs = true,
  -- Voice range and radio channel (pma-voice): the range shows while talking or when it changes.
  voice = true,

  -- Under the map (compact) or top right (classic). 'always', 'change' (shows on change with the difference, then fades) or false.
  wallet = {
    cash = 'always',
    bank = 'change',
    job = true,
  },

  vehicle = {
    enabled = true,
    -- 'theme' follows the identity's --nk-gauge-style; or force 'arc', 'bar' or 'digital'.
    gauge = 'theme',
    redline = 0.9,     -- rpm (0.2 idle … 1.0 limiter) where the red zone starts
    shiftLight = true,
    rpm = true,
    gear = true,
    fuel = true,
    damage = true,     -- engine and body warnings
    lights = true,
    indicators = true,
    handbrake = true,
    -- Seatbelt and cruise come from hooks (README: hook events). 'auto' shows the indicator once any
    -- resource reports it; true always; false never.
    seatbelt = 'auto',
    cruise = 'auto',
    bicycles = false,  -- show the cluster on bicycles
    gameText = false,  -- true keeps GTA's vehicle name and street text (bottom right, over the cluster)
    airUnits = 'kts',  -- aircraft airspeed: 'kts' or 'units' (Config.units); altitude is ft with mph, m with km/h
    boatUnits = 'kts', -- boats: 'kts' or 'units'
  },

  -- Fuel source: 'auto' (ox_fuel, LegacyFuel, cdn-fuel, ps-fuel, lc_fuel when started, else the
  -- native), one of those names, 'native', or false to hide fuel.
  fuel = 'auto',

  location = {
    enabled = true,
    onFoot = true,     -- also when the radar is hidden
    crossing = true,
    zone = true,
    -- 'auto' reads nearest-postal when it's started; a resource name with a getPostal export; or false
    postal = 'auto',
    waypoint = true,   -- distance to the map waypoint
  },

  -- The weapon's ammo, `12 / 48` with a glyph, only while armed with a gun or a throwable.
  ammo = true,
  -- Where the reserve (the 48) comes from: 'auto' (ox_inventory's ammo items when it's started, else
  -- GTA's ammo), 'ped', 'ox_inventory', or false to show the clip only.
  ammoReserve = 'auto',

  compass = {
    enabled = true,    -- classic: the heading strip at the top of the screen (compact: on the map ring)
    onFoot = false,
  },

  -- Legibility (Foundation 2): the theme's --nk-legibility 'auto' follows the game clock, day from
  -- dayFrom to dayTo (game hours). mode forces 'day' or 'night' for this HUD whatever the theme says;
  -- false stops sending it (the theme's value stands).
  legibility = { dayFrom = 7, dayTo = 19, mode = nil },

  -- Print where the minimap and the HUD's edges went to the F8 console.
  debug = false,
}
