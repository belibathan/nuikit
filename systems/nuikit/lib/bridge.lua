--[[
  bridge.lua: one player shape for every framework.  MIT · https://github.com/belibathan/nuikit

  Load after nuikit.lua. It detects Qbox, QBCore, ESX or none, and keeps your UI's
  `nuikit:player` (usePlayer() in React) up to date, sending only when something changed:

    { loaded, id, name, health, armor, hunger, thirst, stress, cash, bank,
      job = { name, label, grade, gradeLabel, onDuty }, gang = { name, label, grade, gradeLabel },
      dead, voice = { range, talking, radio } }

    NUI.player.get()           -- the current table
    NUI.player.onChange(fn)    -- fn(player) after every change
    NUI.player.framework       -- 'qbox' | 'qbcore' | 'esx' | 'standalone' | a custom framework's resource name
    (your own framework plugs in without editing this file: docs/adapters/framework-sdk.md)

  Health and armor are 0–100. Hunger, thirst and stress are 0–100 when the framework has them, nil otherwise.

  It also carries the server context (protocol §7.2): the currency and locale the nuikit resource
  publishes as GlobalState.nuikitContext (convars nuikit_currency / nuikit_locale), sent to the UI as
  `nuikit:context` { currency, locale } (useNuiContext() in React) on load, with every resend, and
  live when it changes. Without the nuikit resource it is { currency = 'USD', locale = 'en-US' }.

    NUI.player.context()       -- { currency, locale }
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

-- What goes on the wire (protocol §7.1): the player without the bridge's internal fields.
local INTERNAL = { downed = true } -- downed feeds `dead`; it is not part of the contract
local function public()
  local out = {}
  for k, v in pairs(player) do
    if not INTERNAL[k] then out[k] = v end
  end
  return out
end

local function flush()
  local out = public()
  local encoded = json.encode(out)
  if encoded == lastSent then return end
  lastSent = encoded
  NUI.send('nuikit:player', out)
  for _, fn in ipairs(listeners) do pcall(fn, out) end
end

--- Merge fields into the player and push the result to the UI if it changed.
---@param fields table
function NUI.player.set(fields)
  merge(player, fields)
  flush()
end

-- ───────────────────────────────── server context (currency, locale)

local DEFAULT_CONTEXT = { currency = 'USD', locale = 'en-US' }
local lastContext = nil

local function readContext()
  local c = GlobalState and GlobalState.nuikitContext
  if type(c) ~= 'table' then return { currency = DEFAULT_CONTEXT.currency, locale = DEFAULT_CONTEXT.locale } end
  return {
    currency = type(c.currency) == 'string' and c.currency ~= '' and c.currency or DEFAULT_CONTEXT.currency,
    locale = type(c.locale) == 'string' and c.locale ~= '' and c.locale or DEFAULT_CONTEXT.locale,
  }
end

local function sendContext(force)
  local c = readContext()
  local encoded = json.encode(c)
  if not force and encoded == lastContext then return end
  lastContext = encoded
  NUI.send('nuikit:context', c)
end

--- The server's currency (ISO 4217) and locale (BCP 47), as the nuikit resource publishes them.
---@return { currency: string, locale: string }
function NUI.player.context()
  return readContext()
end

if AddStateBagChangeHandler then
  AddStateBagChangeHandler('nuikitContext', 'global', function(_, _, value)
    if type(value) ~= 'table' then return end
    local c = {
      currency = type(value.currency) == 'string' and value.currency ~= '' and value.currency or DEFAULT_CONTEXT.currency,
      locale = type(value.locale) == 'string' and value.locale ~= '' and value.locale or DEFAULT_CONTEXT.locale,
    }
    local encoded = json.encode(c)
    if encoded == lastContext then return end
    lastContext = encoded
    NUI.send('nuikit:context', c)
  end)
end

--- Send the current player (and the server context) again (the UI just loaded).
function NUI.player.resend()
  sendContext(true)
  lastSent = nil
  flush()
end

---@return table
function NUI.player.get()
  return public()
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

-- ───────────────────────────────── custom framework (docs/adapters/framework-sdk.md)
-- A server's own framework is a resource that exports nuikitGetPlayer (required) and, optionally,
-- nuikitPoll and nuikitEvents, and declares `nuikit_framework 'name'` in its fxmanifest (or is named by
-- the convar nuikit_framework). It wins over the built-ins. Its changes reach us as the local event
-- `nuikit:framework:update` (fields) or through the event names nuikitEvents lists.

local FIELDS = { 'loaded', 'id', 'name', 'cash', 'bank', 'job', 'gang', 'hunger', 'thirst', 'stress', 'downed' }

local function callExport(resource, name)
  local ok, result = pcall(function() return exports[resource][name](exports[resource]) end)
  if ok then return result end
  return nil
end

-- Only the documented fields, vitals clamped to 0-100; anything else an adapter returns is dropped.
local function sanitize(raw)
  if type(raw) ~= 'table' then return {} end
  local out = {}
  for _, k in ipairs(FIELDS) do
    if raw[k] ~= nil then out[k] = raw[k] end
  end
  for _, k in ipairs({ 'hunger', 'thirst', 'stress' }) do
    if out[k] ~= nil then out[k] = clamp100(out[k]) end
  end
  if type(out.cash) ~= 'number' then out.cash = nil end
  if type(out.bank) ~= 'number' then out.bank = nil end
  return out
end

local function findCustom()
  local forced = GetConvar('nuikit_framework', '')
  if forced ~= '' then
    if adapters[forced] then return nil end -- a built-in, forced
    return forced
  end
  if GetNumResources and GetResourceByFindIndex and GetNumResourceMetadata then
    for i = 0, GetNumResources() - 1 do
      local r = GetResourceByFindIndex(i)
      if r and started(r) and GetNumResourceMetadata(r, 'nuikit_framework') > 0 then return r end
    end
  end
  return nil
end

adapters.custom = function(resource)
  local function load()
    local fields = sanitize(callExport(resource, 'nuikitGetPlayer'))
    if fields.loaded == nil then fields.loaded = fields.id ~= nil end
    NUI.player.set(fields)
  end
  AddEventHandler('nuikit:framework:update', function(fields) NUI.player.set(sanitize(fields)) end)
  local names = callExport(resource, 'nuikitEvents')
  if type(names) == 'table' then
    for _, e in ipairs(names) do
      if type(e) == 'string' then RegisterNetEvent(e, load) end
    end
  end
  load()
  -- nuikitPoll is optional; a missing or failing export gives an empty table.
  return function() return sanitize(callExport(resource, 'nuikitPoll')) end
end

local function detect()
  if started('qbx_core') then return 'qbox' end
  if started('qb-core') then return 'qbcore' end
  if started('es_extended') then return 'esx' end
  return 'standalone'
end

-- The context goes before the first player message, so a page can format cash as soon as it has it.
sendContext(true)
local custom = findCustom()
if custom then
  NUI.player.framework = custom
else
  NUI.player.framework = GetConvar('nuikit_framework', '') ~= '' and GetConvar('nuikit_framework', '') or detect()
end
local frameworkPoll = custom and adapters.custom(custom) or adapters[NUI.player.framework]()

-- ───────────────────────────────── polled values (every framework)

--- pma-voice talks over Mumble (MumbleIsPlayerTalking returns 1/0); native voice chat sets
--- NetworkIsPlayerTalking. Either counts.
local function isTalking()
  local id = PlayerId()
  local mumble = MumbleIsPlayerTalking and MumbleIsPlayerTalking(id)
  if mumble == 1 or mumble == true then return true end
  return NetworkIsPlayerTalking(id) == true or NetworkIsPlayerTalking(id) == 1
end

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
      -- pma-voice names its modes ("Whisper", "Normal", "Shouting"); the label follows its config
      mode = proximity and proximity.mode or nil,
      talking = isTalking(),
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
