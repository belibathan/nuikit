-- GLOBAL: this resource's config (fivem-foundation §9)
Config = {
  -- Open the sheet with /{{name}} (or F5).
  key = 'F5',

  -- The jobs. Each has grades (lowest first) and pages: `root` is the page the sheet opens on; a row
  -- with `page = '<id>'` opens that page in place (a back row leads it). Any other row, and every
  -- action in a page's `actions`, is checked by the server (grade >= `minGrade`, `onDutyOnly`) and
  -- then announced as `{{name}}:action` for the scripts that do the work. Rows the caller's grade can't
  -- use are not sent to the page at all; on-duty-only rows are greyed out off duty.
  jobs = {
    police = {
      label = 'LSPD',
      side = 'right',
      grades = {
        { grade = 0, label = 'Cadet' },
        { grade = 1, label = 'Officer' },
        { grade = 2, label = 'Sergeant' },
        { grade = 3, label = 'Lieutenant' },
        { grade = 4, label = 'Chief' },
      },
      pages = {
        root = {
          sections = {
            { id = 'work', rows = {
              { id = 'armory', label = 'Armory', description = 'Weapons and gear for your grade', page = 'armory', onDutyOnly = true, minGrade = 1 },
              { id = 'garage', label = 'Take a patrol car', description = 'From the Mission Row lot', onDutyOnly = true },
              { id = 'outfit', label = 'Change into uniform', onDutyOnly = true },
            } },
            { id = 'office', title = 'Office', rows = {
              { id = 'billing', label = 'Write a fine', description = 'To the nearest player', onDutyOnly = true, minGrade = 1 },
              { id = 'records', label = 'Records', description = 'Warrants and reports', page = 'records' },
              { id = 'locker', label = 'Personal locker' },
            } },
          },
          actions = {
            { id = 'clockout', label = 'Clock out', primary = true, onDutyOnly = true },
          },
        },
        armory = {
          title = 'Armory',
          description = 'Checked out against your grade',
          sections = {
            { id = 'weapons', rows = {
              { id = 'pistol', label = 'Combat pistol' },
              { id = 'taser', label = 'Stun gun' },
              { id = 'carbine', label = 'Carbine rifle', minGrade = 2 },
            } },
            { id = 'gear', title = 'Gear', rows = {
              { id = 'vest', label = 'Body armor' },
              { id = 'radio', label = 'Radio' },
              { id = 'return', label = 'Return everything', tone = 'destructive' },
            } },
          },
          actions = {
            { id = 'takeall', label = 'Take the standard kit', primary = true },
          },
        },
        records = {
          title = 'Records',
          sections = {
            { id = 'warrants', rows = {
              { id = 'warrants', label = 'Warrants', description = 'Open warrants in the city' },
              { id = 'reports', label = 'Reports', description = 'Filed this week' },
            } },
          },
        },
      },
    },
    mechanic = {
      label = "Benny's",
      side = 'left',
      grades = {
        { grade = 0, label = 'Apprentice' },
        { grade = 1, label = 'Mechanic' },
        { grade = 2, label = 'Owner' },
      },
      pages = {
        root = {
          sections = {
            { id = 'shop', rows = {
              { id = 'repair', label = 'Repair kit', description = 'Fix the nearest vehicle', onDutyOnly = true },
              { id = 'tow', label = 'Tow truck', onDutyOnly = true, minGrade = 1 },
            } },
          },
          actions = {
            { id = 'clockout', label = 'Clock out', primary = true, onDutyOnly = true },
          },
        },
      },
    },
  },

  -- The example keeps who works where in jobs.json in this resource, per player (license).
  saveFile = 'jobs.json',
}

-- Server only: mirror a duty change into your framework, for a player who's online. Uncomment the
-- one for your framework (see the README).
if IsDuplicityVersion() then
  function Config.sync(src, job, grade, onDuty)
    -- Qbox:    exports.qbx_core:SetJob(src, job or 'unemployed', grade or 0); local p = exports.qbx_core:GetPlayer(src); if p then p.Functions.SetJobDuty(onDuty == true) end
    -- QBCore:  local p = exports['qb-core']:GetCoreObject().Functions.GetPlayer(src); if p then p.Functions.SetJob(job or 'unemployed', grade or 0); p.Functions.SetJobDuty(onDuty == true) end
    -- ESX:     local x = exports.es_extended:getSharedObject().GetPlayerFromId(src); if x then x.setJob(job or 'unemployed', grade or 0) end
  end
end
