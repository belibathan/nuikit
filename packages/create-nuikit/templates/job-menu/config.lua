-- GLOBAL: this resource's config (fivem-foundation §9)
Config = {
  -- Open the menu with /{{name}} (or F5).
  key = 'F5',

  -- The jobs. Grades go from the lowest up; the one with `boss = true` gets the Staff tab (hire,
  -- promote, demote, fire). An action shows for grades at or above `minGrade`; `onDutyOnly` greys
  -- it out off duty. The server checks both again on every request.
  jobs = {
    police = {
      label = 'LSPD',
      startBalance = 250000,
      grades = {
        { grade = 0, label = 'Cadet' },
        { grade = 1, label = 'Officer' },
        { grade = 2, label = 'Sergeant' },
        { grade = 3, label = 'Lieutenant' },
        { grade = 4, label = 'Chief', boss = true },
      },
      actions = {
        { id = 'armory', label = 'Open the armory', description = 'Weapons and gear for your grade', onDutyOnly = true, minGrade = 1 },
        { id = 'vehicles', label = 'Take a patrol car', description = 'From the Mission Row lot', onDutyOnly = true },
        { id = 'outfit', label = 'Change into uniform', onDutyOnly = true },
        { id = 'locker', label = 'Personal locker' },
      },
    },
    mechanic = {
      label = "Benny's",
      startBalance = 40000,
      grades = {
        { grade = 0, label = 'Apprentice' },
        { grade = 1, label = 'Mechanic' },
        { grade = 2, label = 'Owner', boss = true },
      },
      actions = {
        { id = 'repair', label = 'Repair kit', description = 'Fix the nearest vehicle', onDutyOnly = true },
        { id = 'tow', label = 'Tow truck', onDutyOnly = true, minGrade = 1 },
      },
    },
  },

  -- How close (metres) a player must stand to be hired. Needs OneSync (the server checks it).
  hireRadius = 5.0,

  -- The example keeps who works where in jobs.json in this resource, per player (license).
  saveFile = 'jobs.json',
}

-- Server only: mirror a change into your framework, for a player who's online. Called after every
-- hire, fire, grade change and duty change. Uncomment the one for your framework (see the README).
if IsDuplicityVersion() then
  function Config.sync(src, job, grade, onDuty)
    -- Qbox:    exports.qbx_core:SetJob(src, job or 'unemployed', grade or 0); local p = exports.qbx_core:GetPlayer(src); if p then p.Functions.SetJobDuty(onDuty == true) end
    -- QBCore:  local p = exports['qb-core']:GetCoreObject().Functions.GetPlayer(src); if p then p.Functions.SetJob(job or 'unemployed', grade or 0); p.Functions.SetJobDuty(onDuty == true) end
    -- ESX:     local x = exports.es_extended:getSharedObject().GetPlayerFromId(src); if x then x.setJob(job or 'unemployed', grade or 0) end
  end
end
