--[[
  nuikit.lua — the Lua half of nuikit.  MIT · https://github.com/belibathan/nuikit

  Drop into any resource as a client_script. Framework-agnostic (QBCore, Qbox, ESX, ox, standalone).

    NUI.send('hud:vitals', { health = 80 })          -- Lua → UI   (useNuiEvent / onNui)
    NUI.on('inventory:use', function(data)            -- UI → Lua  (fetchNui)
      return { ok = UseItem(data.slot) }              --   whatever you return is the response
    end)
    NUI.open()                                        -- show + focus (cursor on)
    NUI.open({ cursor = false, keepInput = true })    -- show, keep walking (HUDs, prompts)
    NUI.close()                                       -- hide + release focus (Escape does this too)
    NUI.notify({ title = 'Paid', type = 'success' })  -- toast (with <NuiToaster />)
]]

---@class NuiOpenOptions
---@field focus? boolean      take NUI focus (default true)
---@field cursor? boolean     show the cursor (default = focus)
---@field keepInput? boolean  let the player keep moving while focused (default false)

NUI = NUI or {}

local isOpen = false
local debug = GetConvarInt('nuikit_debug', 0) == 1

local function log(...)
  if debug then print(('^5[nuikit:%s]^7'):format(GetCurrentResourceName()), ...) end
end

--- Send a message to the UI. Arrives as `{ action, data }`.
---@param action string
---@param data? any
function NUI.send(action, data)
  log('→ ui', action)
  SendNUIMessage({ action = action, data = data })
end

--- Handle a fetchNui call from the UI. Return a table (or nothing) as the response.
--- Errors are caught and returned as `{ error = message }`, which fetchNui throws as NuiError.
---@param name string
---@param handler fun(data: table): table|nil
function NUI.on(name, handler)
  RegisterNUICallback(name, function(data, cb)
    log('← ui', name)
    local ok, result = pcall(handler, data or {})
    if ok then
      cb(result == nil and {} or result)
    else
      print(('^1[nuikit] callback "%s" failed:^7 %s'):format(name, tostring(result)))
      cb({ error = tostring(result) })
    end
  end)
end

--- Show the UI and take focus.
---@param opts? NuiOpenOptions
function NUI.open(opts)
  opts = opts or {}
  local focus = opts.focus ~= false
  local cursor = opts.cursor
  if cursor == nil then cursor = focus end
  SetNuiFocus(focus, cursor)
  SetNuiFocusKeepInput(opts.keepInput == true)
  isOpen = true
  NUI.send('nuikit:visible', true)
end

--- Hide the UI and release focus.
function NUI.close()
  SetNuiFocus(false, false)
  SetNuiFocusKeepInput(false)
  isOpen = false
  NUI.send('nuikit:visible', false)
end

---@class NuiNotify
---@field title string
---@field description? string
---@field type? 'default'|'success'|'info'|'warning'|'error'
---@field duration? integer ms

--- Show a toast (needs the NuiToaster component: npx shadcn add @nuikit/nui-toaster).
---@param n NuiNotify|string
function NUI.notify(n)
  if type(n) == 'string' then n = { title = n } end
  NUI.send('nuikit:notify', n)
end

--- Toggle open/closed.
---@param opts? NuiOpenOptions
function NUI.toggle(opts)
  if isOpen then NUI.close() else NUI.open(opts) end
end

---@return boolean
function NUI.isOpen()
  return isOpen
end

-- Built-in: the UI asks to close (Escape, close buttons → closeNui()).
NUI.on('nuikit:close', function()
  NUI.close()
  return { ok = true }
end)

-- Never leave a player stuck with a cursor after `restart <resource>`.
AddEventHandler('onResourceStop', function(resource)
  if resource == GetCurrentResourceName() and isOpen then
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)
  end
end)

return NUI
