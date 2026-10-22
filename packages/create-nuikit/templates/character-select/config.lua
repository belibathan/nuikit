Config = {
  -- How many characters a player may have, and whether they may delete one.
  slots = 3,
  allowDelete = true,
  genders = { 'Male', 'Female', 'Other' },

  -- Where the camera looks while choosing (x, y, z, heading).
  camera = vector4(-1355.0, -1487.0, 30.0, 300.0),

  -- While choosing where to start, the camera glides over the highlighted spawn point (false: it stays
  -- on the city view). offset is from the spawn point in its own frame (y forward, z up).
  preview = { offset = { y = -38.0, z = 24.0 }, fov = 45.0, duration = 1100 },

  -- Where a character can start. 'last' (where they left off) is added for characters that have
  -- one; the server only ever teleports to these.
  spawns = {
    { id = 'legion', label = 'Legion Square', description = 'Downtown', icon = 'city', coords = vector4(195.2, -933.8, 30.7, 145.0) },
    { id = 'airport', label = 'LS International', description = 'Arrivals', icon = 'airport', coords = vector4(-1037.5, -2737.6, 20.2, 330.0) },
    { id = 'pillbox', label = 'Pillbox Medical', icon = 'hospital', coords = vector4(298.9, -584.2, 43.3, 70.0) },
    { id = 'motel', label = 'Pink Cage Motel', icon = 'hotel', coords = vector4(325.0, -229.6, 54.2, 160.0) },
  },

  -- What a new character starts with.
  startCash = 500,
  startBank = 2500,

  -- The example keeps every player's characters in this file in the resource.
  saveFile = 'characters.json',
}

if IsDuplicityVersion() then
  -- After a character is chosen: log them in to your framework. `character` is the record
  -- ({ id, firstName, lastName, birthdate, gender, cash, bank }). Return false to refuse.
  function Config.onPlay(src, character)
    -- Qbox / QBCore use their own multicharacter (qbx_core, qb-multicharacter): replace this whole
    -- resource's server with theirs, or log in here: exports.qbx_core:Login(src, character.id)
    return true
  end
end
