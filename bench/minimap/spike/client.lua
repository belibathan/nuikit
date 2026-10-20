-- nuikit minimap paint spike. Commands (F8):
--   mmspike info               load the six radar tiles, print each one's size and load time
--   mmspike solid r g b        replace every tile with one runtime colour (proves runtime replacement)
--   mmspike tint #rrggbb [px]  repaint the tiles through a DUI page: the stock tile (nui-img) under a
--                              colour ramp toward the hex, at px × px (default 2048)
--   mmspike reset              put GTA's tiles back
-- Nothing is streamed: every replacement is a runtime texture over the stock tile.

local TILES = {}
for row = 0, 2 do
  for col = 0, 1 do TILES[#TILES + 1] = ('minimap_sea_%d_%d'):format(row, col) end
end

local replaced = {}
local duis = {}

local function reset()
  for _, name in ipairs(replaced) do RemoveReplaceTexture(name, name) end
  replaced = {}
  for _, d in ipairs(duis) do DestroyDui(d) end
  duis = {}
end

local function replace(name, txd, tex)
  AddReplaceTexture(name, name, txd, tex)
  replaced[#replaced + 1] = name
end

local function info()
  for _, name in ipairs(TILES) do
    local t0 = GetGameTimer()
    RequestStreamedTextureDict(name, false)
    while not HasStreamedTextureDictLoaded(name) and GetGameTimer() - t0 < 5000 do Wait(0) end
    local res = GetTextureResolution(name, name)
    print(('[mmspike] %s loaded=%s in %d ms, texture %s = %dx%d'):format(
      name, tostring(HasStreamedTextureDictLoaded(name)), GetGameTimer() - t0, name, math.floor(res.x), math.floor(res.y)))
  end
  print('[mmspike] 0x0 means the texture inside is named differently: open the ytd in CodeWalker and note the name.')
end

local function solid(r, g, b)
  reset()
  local txd = CreateRuntimeTxd('nuikit_mmspike')
  local tex = CreateRuntimeTexture(txd, 'solid', 16, 16)
  for y = 0, 15 do
    for x = 0, 15 do SetRuntimeTexturePixel(tex, x, y, r, g, b, 255) end
  end
  CommitRuntimeTexture(tex)
  for _, name in ipairs(TILES) do replace(name, 'nuikit_mmspike', 'solid') end
  print('[mmspike] every tile is now one colour: look at the radar and the pause map.')
end

local function tint(hex, px)
  reset()
  px = px or 2048
  local txd = CreateRuntimeTxd('nuikit_mmspike_dui')
  for i, name in ipairs(TILES) do
    RequestStreamedTextureDict(name, false)
    while not HasStreamedTextureDictLoaded(name) do Wait(0) end
    local url = ('nui://%s/tint.html?tile=%s&hex=%s'):format(GetCurrentResourceName(), name, hex:gsub('#', ''))
    local t0 = GetGameTimer()
    local dui = CreateDui(url, px, px)
    duis[#duis + 1] = dui
    local handle = GetDuiHandle(dui)
    CreateRuntimeTextureFromDuiHandle(txd, 't' .. i, handle)
    replace(name, 'nuikit_mmspike_dui', 't' .. i)
    print(('[mmspike] %s → DUI %dx%d in %d ms'):format(name, px, px, GetGameTimer() - t0))
  end
  print('[mmspike] tinted. Now: resmon (this resource), F8 `profile` / frame time, and the radar while driving.')
end

RegisterCommand('mmspike', function(_, a)
  local cmd = a[1]
  if cmd == 'info' then CreateThread(info)
  elseif cmd == 'solid' then solid(tonumber(a[2]) or 30, tonumber(a[3]) or 34, tonumber(a[4]) or 42)
  elseif cmd == 'tint' then CreateThread(function() tint(a[2] or '#0f172a', tonumber(a[3])) end)
  elseif cmd == 'reset' then reset() print('[mmspike] stock tiles back')
  else print('mmspike info | solid r g b | tint #rrggbb [px] | reset') end
end, false)

AddEventHandler('onResourceStop', function(r) if r == GetCurrentResourceName() then reset() end end)
