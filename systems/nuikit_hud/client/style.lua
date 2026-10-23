-- nuikit_hud: try the status chip's styles in game, per player (kept in KVP), without editing the theme.
--
--   /hudstyle <shape> [level] [label] [icon]   e.g. /hudstyle diamond fill tag uniform
--   /hudstyle reset                            back to the theme's tokens
--   /hudpop <vital> [change]                   fire a pop, e.g. /hudpop hunger 25
--
--   shape: auto (the theme's) | square | rounded | circle | diamond | hex | chamfer
--   level: outline | fill | bar | none        label: inline | tag | flag | none     icon: vital | uniform
--
-- The page sets them as --nk-chip-shape, --nk-level-style, --nk-label-attach and --nk-vital-icon on its
-- <html> (web/src/hud/pills.tsx), the same tokens a theme sets. Its own command name, so the /hud
-- command in main.lua (units) stays as it is.

local KVP = 'nuikit_hud:style'
local OPTIONS = {
  { key = 'shape', values = { auto = true, square = true, rounded = true, circle = true, diamond = true, hex = true, chamfer = true } },
  { key = 'level', values = { outline = true, fill = true, bar = true, none = true } },
  { key = 'attach', values = { inline = true, tag = true, flag = true, none = true } },
  { key = 'icon', values = { vital = true, uniform = true } },
}
local TONES = { health = 'health', armor = 'armor', armour = 'armor', hunger = 'hunger', food = 'hunger', thirst = 'thirst', water = 'thirst', stress = 'stress' }

local function loadStyle()
  local s = GetResourceKvpString(KVP)
  if not s or s == '' then return nil end
  local ok, t = pcall(json.decode, s)
  if ok and type(t) == 'table' then return t end
  return nil
end

local style = loadStyle()

local function say(msg)
  TriggerEvent('chat:addMessage', { args = { 'HUD', msg } })
  print(('[nuikit_hud] %s'):format(msg))
end

-- the page asks for the stored style when it loads
nk.message.on('hud:style:get', function()
  return { style = style }
end)

RegisterCommand('hudstyle', function(_, args)
  if not args[1] or args[1]:lower() == 'reset' then
    style = nil
    DeleteResourceKvp(KVP)
    nk.message.send('hud:style', false)
    say('style reset to the theme')
    return
  end
  local t = {}
  for i, opt in ipairs(OPTIONS) do
    local v = args[i] and args[i]:lower()
    if v then
      if not opt.values[v] then
        local list = {}
        for k in pairs(opt.values) do list[#list + 1] = k end
        table.sort(list)
        say(('unknown %s "%s" (%s)'):format(opt.key, v, table.concat(list, ', ')))
        return
      end
      t[opt.key] = v
    end
  end
  style = t
  SetResourceKvp(KVP, json.encode(t))
  nk.message.send('hud:style', t)
  say(('style: %s %s %s %s'):format(t.shape or '-', t.level or '-', t.attach or '-', t.icon or '-'))
end, false)

RegisterCommand('hudpop', function(_, args)
  local tone = TONES[(args[1] or ''):lower()]
  if not tone then
    say('usage: /hudpop health|armor|hunger|thirst|stress [change]')
    return
  end
  nk.message.send('hud:pop', { tone = tone, by = tonumber(args[2]) or 10 })
end, false)

TriggerEvent('chat:addSuggestion', '/hudstyle', 'HUD chip style (yours only)', {
  { name = 'shape', help = 'auto, square, rounded, circle, diamond, hex, chamfer, or reset' },
  { name = 'level', help = 'outline, fill, bar, none' },
  { name = 'label', help = 'inline, tag, flag, none' },
  { name = 'icon', help = 'vital, uniform' },
})
TriggerEvent('chat:addSuggestion', '/hudpop', 'Show a vital pop (test)', {
  { name = 'vital', help = 'health, armor, hunger, thirst, stress' },
  { name = 'change', help = 'e.g. 25 or -10' },
})
