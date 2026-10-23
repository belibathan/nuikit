// The arsenal's Lua side (lua/api.lua, generated): every nk.<domain>.<verb> the spec declares exists after
// @nuikit/init.lua, and every old name still works and is listed in nk.legacy with removeIn.
import { afterEach, describe, expect, it } from "vitest";
import arsenal from "../../arsenal.json";
import { createClient } from "./harness";

let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

const natives = `
  STARTED = { nuikit = true }
  function GetResourceState(r) return STARTED[r] and 'started' or 'missing' end
  function GetConvar(_, d) return d end
  function PlayerPedId() return 1 end
  function PlayerId() return 0 end
  function GetEntityHealth() return 200 end
  function GetEntityMaxHealth() return 200 end
  function GetPedArmour() return 0 end
  function IsEntityDead() return false end
  function NetworkIsPlayerTalking() return false end
  function CreateThread() end
  function Wait() end
  LocalPlayer = { state = {} }
`;

type Entry = { lua?: string; kind: string; scope?: string };
const paths = (arsenal.domains as { entries: Entry[] }[]).flatMap((d) => d.entries).filter((e) => e.lua?.startsWith("nk.") && e.scope !== "nuikit").map((e) => e.lua!);

describe("lua/api.lua", () => {
  it("every nk.<domain>.<verb> in the spec resolves", async () => {
    client = await createClient();
    const ui = await client.start("shop", { runtime: "import", before: natives });
    const missing = await ui.run(`
      local out = {}
      for _, p in ipairs(json.decode('${JSON.stringify(paths)}')) do
        local v = _G
        for k in p:gmatch('[^.]+') do v = type(v) == 'table' and v[k] or nil end
        if v == nil then out[#out + 1] = p end
      end
      return table.concat(out, ' ')
    `);
    expect(missing).toBe("");
  });

  it("old names keep working, and nk.legacy lists them", async () => {
    client = await createClient();
    const ui = await client.start("shop", { runtime: "import", before: natives });
    await ui.run(`S = NUI.surface('shop', { layer = 'panel' }) S:open({ a = 1 })`);
    expect(ui.surfaces().shop).toMatchObject({ open: true });
    await ui.run(`nk.surface.define('cart'):open()`);
    expect(ui.surfaces().cart).toMatchObject({ open: true });
    expect(await ui.run(`return nk.surface.isOpen == NUI.isOpen and nk.intent == nk.intents and nk.intent.notify == nk.notify`)).toBe(true);
    expect(await ui.run(`return nk.legacy['NUI.surface'].now .. '@' .. nk.legacy['NUI.surface'].removeIn`)).toBe("nk.surface.define@1.0.0");
    expect(await ui.run(`return type(nk.theme.get) == 'function' and type(nk.zone.set) == 'function' and type(nk.slot.join) == 'function'`)).toBe(true);
  });
});
