-- nuikit_pause: key bindings, read live from the game (docs/pause-3d.md). Scripts can't change a
-- key; this only shows what the player has bound now, so a rebound key shows its new key.

Keys = {}

-- GTA's instructional-button codes for keys that aren't a letter or digit.
local NAMES = {
  b_100 = 'Left mouse', b_101 = 'Right mouse', b_102 = 'Middle mouse', b_103 = 'Mouse 4', b_104 = 'Mouse 5',
  b_115 = 'Wheel up', b_116 = 'Wheel down',
  b_194 = '↑', b_195 = '↓', b_196 = '←', b_197 = '→',
  b_198 = 'Delete', b_199 = 'Esc', b_200 = 'Insert', b_201 = 'End',
  b_1000 = 'Shift', b_1001 = 'Right Shift', b_1002 = 'Tab', b_1003 = 'Enter', b_1004 = 'Backspace',
  b_1009 = 'Page up', b_1010 = 'Page down', b_1012 = 'Home', b_1013 = 'Ctrl', b_1014 = 'Right Ctrl',
  b_1015 = 'Alt', b_1055 = 'Home', b_1056 = 'Page up', b_1057 = 'Page down', b_2000 = 'Space',
}
for i = 0, 11 do NAMES['b_' .. (170 + i)] = 'F' .. (i + 1) end

--- A button code from GetControlInstructionalButton → a key name, or nil when unbound.
---@param code string|nil
---@return string|nil
function Keys.name(code)
  if type(code) ~= 'string' or code == '' then return nil end
  local letter = code:match('^t_(.+)$')
  if letter then return letter:upper() end
  return NAMES[code]
end

local function raw(entry)
  if entry.command and entry.command ~= '' then
    -- a FiveM key mapping: the command's hash with the high bit set
    local hash = (GetHashKey(entry.command) | 0x80000000) & 0xFFFFFFFF
    return GetControlInstructionalButton(0, hash, true)
  end
  if entry.control then return GetControlInstructionalButton(0, entry.control, true) end
  return nil
end

--- Config.keybinds with each entry's current key (nil = not bound).
function Keys.resolve()
  local out = {}
  for _, entry in ipairs(Config.keybinds or {}) do
    local ok, code = pcall(raw, entry)
    out[#out + 1] = { label = entry.label, group = entry.group, key = ok and Keys.name(code) or nil }
  end
  return out
end
