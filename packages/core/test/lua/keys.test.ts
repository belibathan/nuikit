// nk.keys (packages/core/lua/keys.lua): keys declared in the owning resource, listed by the nuikit store.
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

// FiveM natives the harness lacks: joaat (the name's length, enough to tell commands apart) and the
// player's rebinds, which GetControlInstructionalButton answers.
const natives = `
  REBOUND = {}
  function joaat(s) return #s end
  function GetControlInstructionalButton(_, hash) return REBOUND[(hash & 0x7fffffff)] end
`;

async function setup() {
  client = await createClient();
  const nuikit = await client.start("nuikit", { before: natives, scripts: ["keys.lua"] });
  const hud = await client.start("hud", { before: natives, scripts: ["keys.lua"] });
  return { nuikit, hud };
}

const DEF = `K = NUI.keys.define({ id = 'hud_edit', label = 'Edit the HUD', key = 'F7', mapper = 'keyboard', onPress = function() LOG = (LOG or '') .. 'p' end, onRelease = function() LOG = (LOG or '') .. 'r' end })`;

describe("nk.keys", () => {
  it("registers +/- commands and the mapping in the owning resource; press and release call the handlers", async () => {
    const { nuikit, hud } = await setup();
    await hud.run(DEF);
    expect([...hud.commands.keys()].sort()).toEqual(["+hud_hud_edit", "-hud_hud_edit"]);
    expect(hud.keyMappings.get("+hud_hud_edit")).toBe("F7");
    expect(nuikit.keyMappings.size).toBe(0);
    hud.commands.get("+hud_hud_edit")!(0, []);
    hud.commands.get("-hud_hud_edit")!(0, []);
    expect(await hud.run(`return LOG`)).toBe("pr");
  });

  it("refuses a bad id and a duplicate", async () => {
    const { nuikit, hud } = await setup();
    expect(await hud.run(`return NUI.keys.define({ id = 'no spaces', key = 'F7' }) == nil`)).toBe(true);
    await hud.run(DEF);
    expect(await hud.run(`return NUI.keys.define({ id = 'hud_edit', key = 'F8' }) == nil`)).toBe(true);
    expect(hud.keyMappings.size).toBe(1);
    expect((await nuikit.call("keys")).keys).toHaveLength(1);
  });

  it("an explicit command keeps its name and registers one plain command", async () => {
    const { hud } = await setup();
    await hud.run(`NUI.keys.define({ id = 'cancel', command = 'my_cancel', label = 'Cancel', key = 'x', onPress = function() end })`);
    expect([...hud.commands.keys()]).toEqual(["my_cancel"]);
    expect(hud.keyMappings.get("my_cancel")).toBe("x");
  });

  it("the nuikit store lists the keys with their current binding, and the NUI callback answers", async () => {
    const { nuikit, hud } = await setup();
    await hud.run(DEF);
    const row = { resource: "hud", id: "hud_edit", label: "Edit the HUD", default: "F7", binding: "F7", mapper: "keyboard" };
    expect((await nuikit.call("keys")).keys).toEqual([row]);
    // the player rebinds it in GTA's settings: FiveM answers 't_G'
    for (const r of [nuikit, hud]) await r.run(`REBOUND[#'+hud_hud_edit'] = 't_G'`);
    expect((await nuikit.call("keys")).keys).toEqual([{ ...row, binding: "G" }]);
    expect(await hud.run(`return K.binding()`)).toBe("G");
  });

  it("a stopped resource's keys leave the list", async () => {
    const { nuikit, hud } = await setup();
    await hud.run(DEF);
    client.stop("hud");
    expect(Object.values((await nuikit.call("keys")).keys)).toEqual([]); // an empty Lua table crosses as {}
  });
});
