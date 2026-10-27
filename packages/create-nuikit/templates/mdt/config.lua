-- GLOBAL: this resource's config (fivem-foundation §9)
Config = {
  -- Open the terminal with /{{name}} or F6 (players can rebind it). The server decides who may.
  key = 'F6',

  -- Who may use it: players with one of these jobs, and on duty. Anyone else is refused on every call.
  jobs = {
    police = { label = 'LSPD' },
    ems = { label = 'EMS' },
  },

  -- Input limits, enforced by the server (the page only mirrors them for counters).
  queryMin = 2,
  queryMax = 32,
  titleMin = 3,
  titleMax = 60,
  textMin = 10,
  textMax = 1000,
  maxResults = 8,     -- rows a search returns
  showReports = 30,   -- newest reports sent to the page
  keepReports = 500,  -- reports kept on the server (the oldest are dropped)

  -- Per player: `count` calls in `per` milliseconds, then "Not so fast". Searches and record
  -- lookups share the `read` bucket; reports have their own.
  rate = {
    read = { count = 12, per = 10000 },
    report = { count = 3, per = 60000 },
  },

  -- The example's data, in this file in the resource: who is on duty and the reports filed.
  saveFile = 'mdt.json',
  demoJob = 'police', -- the job the example gives every player; /{{name}}_duty clocks them in and out

  -- The demo records. Ids are opaque: they are all the page ever sees. `citizenid` and `license` are
  -- here only to show that they stay on the server; the search never sends them.
  records = {
    people = {
      { id = 'p-4f1c', name = 'Marcus Vale', dob = '1988-03-14', address = 'Vinewood, Apt 12', flags = { 'Wanted', 'Armed' }, notes = 'Known associate of the Strawberry crew. Approach with backup.', citizenid = 'NKT-48210', license = 'license:1a2b3c' },
      { id = 'p-9a2e', name = 'Lena Okafor', dob = '1993-07-02', address = 'Mirror Park', flags = {}, notes = 'No concerns.', citizenid = 'NKT-10934', license = 'license:4d5e6f' },
      { id = 'p-31bd', name = 'Marta Vance', dob = '1975-11-30', address = 'Rockford Hills', flags = { 'Medical alert' }, notes = 'Severe penicillin allergy.', citizenid = 'NKT-77302', license = 'license:7a8b9c' },
    },
    vehicles = {
      { id = 'v-77c0', plate = '48KLM221', model = 'Banshee', color = 'Black', owner = 'Marcus Vale', flags = { 'Stolen' }, notes = 'Reported stolen 2026-10-18.', vin = 'VIN-0099' },
      { id = 'v-2d19', plate = '12ABC987', model = 'Sultan', color = 'White', owner = 'Lena Okafor', flags = {}, notes = '', vin = 'VIN-0412' },
    },
  },
}

if IsDuplicityVersion() then
  -- Your framework's player: who they are, their job and whether they are on duty. Return
  -- { name = 'J. Ortega', job = 'police', onDuty = true }, or nil for the example's (job from demoJob).
  -- Config.player = function(src)
  --   Qbox:    local p = exports.qbx_core:GetPlayer(src)
  --            return p and { name = p.PlayerData.charinfo.firstname .. ' ' .. p.PlayerData.charinfo.lastname, job = p.PlayerData.job.name, onDuty = p.PlayerData.job.onduty }
  --   QBCore:  the same from QBCore.Functions.GetPlayer(src).PlayerData
  --   ESX:     local x = ESX.GetPlayerFromId(src); return x and { name = x.getName(), job = x.job.name, onDuty = x.job.onDuty }
  -- end
  Config.player = nil

  -- Your framework's records, or nil to search Config.records above. Both return records shaped like the
  -- demo ones, with an opaque `id` of your own (never a citizen id or licence: the page sees the id);
  -- only name, dob, address, plate, model, color, owner, flags and notes are ever sent on.
  -- Config.lookup = {
  --   search = function(kind, query, limit) end, -- kind 'person' or 'vehicle'; return up to `limit` records
  --   get = function(kind, id) end,              -- one record by the id you handed out, or nil
  -- }
  Config.lookup = nil
end
