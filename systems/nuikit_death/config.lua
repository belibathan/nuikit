-- GLOBAL: this resource's config (fivem-foundation §9)
Config = {
  -- Which medical resource to read: 'auto' picks the first one that's started.
  --   'qbx'       qbx_medical (+ qbx_ambulancejob for the EMS prompt, doctors and the respawn cost)
  --   'qb'        qb-ambulancejob
  --   'esx_death' esx_death (current ESX)
  --   'esx'       esx_ambulancejob before esx_death (ESX Legacy 1.x)
  --   'native'    no medical resource: the game's own death (IsEntityDead)
  medical = 'auto',

  -- Used only when the medical resource's own config can't be read. nuikit reads the real
  -- values from its config file at start; these mirror the stock defaults.
  fallback = {
    qbx = { laststand = 360, death = 300, helpBelow = 300, cost = 2000 },
    qb = { laststand = 360, helpBelow = 300, cost = 2000, hold = 5 },
    esx = { early = 60, bleedout = 600, hold = 1.5 },
  },

  -- GTA screen effects while downed (CSS can't recolour the game world behind the UI).
  -- Any AnimpostfxPlay name, or false for none.
  effects = {
    laststand = false,
    dead = 'DeathFailMPIn',
  },

  -- The full-width band along the bottom edge (design v2 §4.5): the state on the left, the phase and
  -- the clock on the right. It sits on the last 2.5rem of the screen, under where the medical
  -- resources draw their own text; set to false to leave the whole bottom clear.
  band = true,

  -- Text on the screen. The keys shown are the ones the medical resource listens for.
  text = {
    laststand = { title = 'You are down', subtitle = 'Stay with us. Help may be on the way.' },
    dead = { title = 'You are unconscious', subtitle = 'Wait for EMS or respawn at the hospital.' },
  },
}
