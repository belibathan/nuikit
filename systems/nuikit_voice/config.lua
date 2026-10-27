-- GLOBAL: this resource's config (fivem-foundation §9)
Config = {
  -- The voice resource to read. Only pma-voice today; nothing joins while it isn't started.
  voice = 'pma-voice',

  -- The cluster the slots join (docs/slots.md). nuikit_hud draws 'vitals'.
  cluster = 'vitals',

  -- Which slots to show, and where in the cluster (lower first; the HUD's own vitals sit below 50).
  range = { show = true, order = 60 },  -- the proximity mode, lit while you talk
  radio = { show = true, order = 61 },  -- the channel while you're on one, lit while you transmit
  call = { show = true, order = 62 },   -- while you're in a call

  -- How often the talking state is read (ms). Slot writes happen only when something changed.
  interval = 200,
}
