// Every template with a save file: an unreadable file stops the resource at start (Log.fatal) instead of
// loading as empty and being overwritten by the next save (fivem-foundation, kvp_store rule 1: loading never writes).
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runServerSpec } from "./harness";

const templates = fileURLToPath(new URL("../templates/", import.meta.url));
const withSaveFile = readdirSync(templates).filter((name) => {
  try {
    return /'helpers\/json_safe\.lua'/.test(readFileSync(`${templates}${name}/fxmanifest.lua`, "utf8"));
  } catch {
    return false;
  }
});

// Every native the server touches at load answers with a no-op; only the file and json are real.
const SPEC = `
local HELPERS = { Log = true, WaitLimiter = true, RateLimiter = true, Sanitize = true, JsonSafe = true, ServerId = true }
setmetatable(_G, { __index = function(_, k) if not HELPERS[k] then return function() end end end })
function vector3(x, y, z) return { x = x, y = y, z = z } end
function vector4(x, y, z, w) return { x = x, y = y, z = z, w = w } end
function GetCurrentResourceName() return 'demo' end
function GetConvar(_, d) return d end
function GetResourceState() return 'missing' end
function LoadResourceFile() return '{bad' end
SAVED = 0
function SaveResourceFile() SAVED = SAVED + 1 end
PRINTED = {}
function print(m) PRINTED[#PRINTED + 1] = tostring(m) end
json = { decode = function() return nil, 1, 'Missing a name for object member.' end, encode = function() return 'x' end }
local ok, err = pcall(boot)
check(not ok, 'a corrupt save file stops the resource at start')
check(tostring(err):find('unreadable', 1, true) ~= nil, 'the error names the file as unreadable (' .. tostring(err) .. ')')
local red = false
for _, line in ipairs(PRINTED) do -- the OneSync warning may come first
  if line:find('^%^1%[DEMO%] ') and line:find('Missing a name', 1, true) and line:find('%^7$') then red = true end
end
check(red, 'a red log line with the parser message, ending in ^7')
check(SAVED == 0, 'nothing was written over the file')
`;

describe("templates with a save file", () => {
  it("are found", () => expect(withSaveFile.length).toBeGreaterThanOrEqual(10));
  for (const name of withSaveFile) {
    describe(name, async () => {
      const checks = await runServerSpec(name, SPEC);
      for (const c of checks) it(c.name, () => expect(c.ok, c.name).toBe(true));
    });
  }
});
