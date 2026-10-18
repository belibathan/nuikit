--[[
  bridge.lua: one player shape for every framework.  MIT · https://github.com/belibathan/nuikit

  Load after nuikit.lua. It detects Qbox, QBCore, ESX or none, and keeps your UI's
  `nuikit:player` (usePlayer() in React) up to date, sending only when something changed:

    { loaded, id, name, health, armor, hunger, thirst, stress, cash, bank,
      job = { name, label, grade, gradeLabel, onDuty }, gang = { name, label, grade, gradeLabel },
      dead, voice = { range, talking, radio } }

    NUI.player.get()           -- the current table
    NUI.player.onChange(fn)    -- fn(player) after every change
    NUI.player.framework       -- 'qbox' | 'qbcore' | 'esx' | 'standalone'

  Health and armor are 0–100. Hunger, thirst and stress are 0–100 when the framework has them, nil otherwise.
]]

NUI = NUI or {}
NUI.player = NUI.player or {}

local player = { loaded = false, health = 100, armor = 0, dead = false, voice = { range = nil, talking = false, radio = nil } }
local listeners = {}
local lastSent = nil

local function started(resource)
  return GetResourceState(resource) == 'started'
end

local function merge(into, from)
  for k, v in pairs(from) do into[k] = v end
end

local function flush()
  local encoded = json.encode(player)
  if encoded == lastSent then return end
  lastSent = encoded
  NUI.send('nuikit:player', player)
  for _, fn in ipairs(listeners) do pcall(fn, player) end
end

--- Merge fields into the player and push the result to the UI if it changed.
---@param fields table
function NUI.player.set(fields)
  merge(player, fields)
  flush()
end

--- Send the current player again (the UI just loaded).
function NUI.player.resend()
  lastSent = nil
  flush()
end

---@return table
function NUI.player.get()
  return player
end

---@param fn fun(player: table)
function NUI.player.onChange(fn)
  listeners[#listeners + 1] = fn
end

local function round(n)
  if type(n) ~= 'number' then return nil end
  return math.floor(n + 0.5)
end

local function clamp100(n)
  n = round(n)
  if not n then return nil end
  return math.max(0, math.min(100, n))
end

-- ───────────────────────────────── adapters (framework data → player)

local adapters = {}

-- Qbox (qbx_core): PlayerData via export + net events; needs on statebags.
adapters.qbox = function()
  local function fromPlayerData(pd)
    if not pd or not pd.citizenid then return { loaded = false } end
    local job, gang, info, meta = pd.job or {}, pd.gang or {}, pd.charinfo or {}, pd.metadata or {}
    return {
      loaded = true,
      id = pd.citizenid,
      name = ((info.firstname or '') .. ' ' .. (info.lastname or '')):gsub('^%s+', ''):gsub('%s+$', ''),
      cash = pd.money and pd.money.cash or 0,
      bank = pd.money and pd.money.bank or 0,
      job = job.name and {
        name = job.name, label = job.label, grade = job.grade and job.grade.level or 0,
        gradeLabel = job.grade and job.grade.name, onDuty = job.onduty == true,
      } or nil,
      gang = gang.name and gang.name ~= 'none' and {
        name = gang.name, label = gang.label, grade = gang.grade and gang.grade.level or 0, gradeLabel = gang.grade and gang.grade.name,
      } or nil,
      hunger = clamp100(meta.hunger), thirst = clamp100(meta.thirst), stress = clamp100(meta.stress),
      downed = meta.isdead == true or meta.inlaststand == true,
    }
  end

  local function load(pd) NUI.player.set(fromPlayerData(pd)) end
  RegisterNetEvent('QBCore:Player:SetPlayerData', load)
  RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function() load(exports.qbx_core:GetPlayerData()) end)
  RegisterNetEvent('QBCore:Client:OnPlayerUnload', function() NUI.player.set({ loaded = false }) end)
  load(exports.qbx_core:GetPlayerData())

  -- Qbox keeps needs on the player's statebag; read them with the other polled values.
  return function()
    local s = LocalPlayer.state
    return { hunger = clamp100(s.hunger) or player.hunger, thirst = clamp100(s.thirst) or player.thirst, stress = clamp100(s.stress) or player.stress }
  end
end

-- QBCore (qb-core): same events as Qbox, PlayerData from the core object.
adapters.qbcore = function()
  local QBCore = exports['qb-core']:GetCoreObject()
  local function fromPlayerData(pd)
    if not pd or not pd.citizenid then return { loaded = false } end
    local job, gang, info, meta = pd.job or {}, pd.gang or {}, pd.charinfo or {}, pd.metadata or {}
    return {
      loaded = true,
      id = pd.citizenid,
      name = ((info.firstname or '') .. ' ' .. (info.lastname or '')):gsub('^%s+', ''):gsub('%s+$', ''),
      cash = pd.money and pd.money.cash or 0,
      bank = pd.money and pd.money.bank or 0,
      job = job.name and { name = job.name, label = job.label, grade = job.grade and job.grade.level or 0, gradeLabel = job.grade and job.grade.name, onDuty = job.onduty == true } or nil,
      gang = gang.name and gang.name ~= 'none' and { name = gang.name, label = gang.label, grade = gang.grade and gang.grade.level or 0, gradeLabel = gang.grade and gang.grade.name } or nil,
      hunger = clamp100(meta.hunger), thirst = clamp100(meta.thirst), stress = clamp100(meta.stress),
      downed = meta.isdead == true or meta.inlaststand == true,
    }
  end
  local function load(pd) NUI.player.set(fromPlayerData(pd)) end
  RegisterNetEvent('QBCore:Player:SetPlayerData', load)
  RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function() load(QBCore.Functions.GetPlayerData()) end)
  RegisterNetEvent('QBCore:Client:OnPlayerUnload', function() NUI.player.set({ loaded = false }) end)
  RegisterNetEvent('hud:client:UpdateNeeds', function(hunger, thirst) NUI.player.set({ hunger = clamp100(hunger), thirst = clamp100(thirst) }) end)
  RegisterNetEvent('hud:client:UpdateStress', function(stress) NUI.player.set({ stress = clamp100(stress) }) end)
  load(QBCore.Functions.GetPlayerData())
end

-- ESX (es_extended): accounts list, job with grade_label, esx_status for needs.
adapters.esx = function()
  local ESX = exports['es_extended']:getSharedObject()
  local function accounts(list)
    local out = {}
    for _, a in ipairs(list or {}) do
      if a.name == 'money' then out.cash = a.money elseif a.name == 'bank' then out.bank = a.money end
    end
    return out
  end
  local function job(j)
    if not j or not j.name then return nil end
    return { name = j.name, label = j.label, grade = j.grade or 0, gradeLabel = j.grade_label, onDuty = j.onDuty ~= false }
  end
  local function load(pd)
    if not pd or not pd.identifier then return NUI.player.set({ loaded = false }) end
    local fields = { loaded = true, id = pd.identifier, name = pd.name or (pd.firstName and (pd.firstName .. ' ' .. (pd.lastName or ''))), job = job(pd.job) }
    merge(fields, accounts(pd.accounts))
    NUI.player.set(fields)
  end
  RegisterNetEvent('esx:playerLoaded', function(xPlayer) load(xPlayer) end)
  RegisterNetEvent('esx:onPlayerLogout', function() NUI.player.set({ loaded = false }) end)
  RegisterNetEvent('esx:setJob', function(j) NUI.player.set({ job = job(j) }) end)
  RegisterNetEvent('esx:setAccountMoney', function(a) NUI.player.set(accounts({ a })) end)
  RegisterNetEvent('esx_status:onTick', function(status)
    local fields = {}
    for _, s in ipairs(status or {}) do
      if s.name == 'hunger' or s.name == 'thirst' or s.name == 'stress' then fields[s.name] = clamp100(s.percent) end
    end
    NUI.player.set(fields)
  end)
  load(ESX.GetPlayerData())
end

adapters.standalone = function()
  NUI.player.set({ loaded = true })
end

local function detect()
  if started('qbx_core') then return 'qbox' end
  if started('qb-core') then return 'qbcore' end
  if started('es_extended') then return 'esx' end
  return 'standalone'
end

NUI.player.framework = GetConvar('nuikit_framework', '') ~= '' and GetConvar('nuikit_framework', '') or detect()
local frameworkPoll = adapters[NUI.player.framework]()

-- ───────────────────────────────── polled values (every framework)

--- Read the values natives and statebags own. Called on a loop; exposed for tests.
function NUI.player.poll()
  local ped = PlayerPedId()
  local maxHealth = GetEntityMaxHealth(ped)
  local health = maxHealth > 100 and (GetEntityHealth(ped) - 100) / (maxHealth - 100) * 100 or GetEntityHealth(ped)
  local state = LocalPlayer and LocalPlayer.state or {}
  local proximity = state.proximity
  local fields = {
    health = clamp100(health),
    armor = clamp100(GetPedArmour(ped)),
    dead = IsEntityDead(ped) or player.downed == true,
    voice = {
      range = proximity and proximity.distance or nil,
      talking = NetworkIsPlayerTalking(PlayerId()) == true,
      radio = (state.radioChannel and state.radioChannel ~= 0) and state.radioChannel or nil,
    },
  }
  if frameworkPoll then merge(fields, frameworkPoll()) end
  NUI.player.set(fields)
end

CreateThread(function()
  while true do
    NUI.player.poll()
    Wait(250)
  end
end)

return NUI.player
