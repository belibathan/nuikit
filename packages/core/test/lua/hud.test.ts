import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

const HUD = fileURLToPath(new URL("../../../../systems/nuikit_hud/", import.meta.url));
let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

const natives = `
  PAUSED = false
  STARTED = { qbx_core = true }
  PD = { citizenid = 'ABC', charinfo = { firstname = 'Niko', lastname = 'Bellic' }, money = { cash = 1, bank = 2 }, metadata = {} }
  function GetResourceState(r) return STARTED[r] and 'started' or 'missing' end
  function GetConvar(_, d) return d end
  function PlayerPedId() return 1 end
  function PlayerId() return 0 end
  function GetEntityHealth() return 200 end
  function GetEntityMaxHealth() return 200 end
  function GetPedArmour() return 0 end
  function IsEntityDead() return false end
  function NetworkIsPlayerTalking() return false end
  function IsPauseMenuActive() return PAUSED end
  function CreateThread() end
  function Wait() end
  LocalPlayer = { state = {} }
  exports = { qbx_core = { GetPlayerData = function() return PD end } }
`;

describe("systems/nuikit_hud", () => {
  it("shows the HUD once a character is loaded and hides it on logout", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", {
      before: natives + ` PD = {} `,
      scripts: [HUD + "config.lua", "bridge.lua", HUD + "client/main.lua"],
    });
    expect(hud.surfaces().hud.open).toBe(false);

    client.event("QBCore:Player:SetPlayerData", { citizenid: "ABC", charinfo: { firstname: "Niko" }, money: { cash: 5, bank: 0 }, metadata: {} });
    expect(hud.surfaces().hud).toMatchObject({ open: true, visible: true, focused: false, data: { units: "mph", needs: true } });

    client.event("QBCore:Client:OnPlayerUnload");
    expect(hud.surfaces().hud.open).toBe(false);
  });

  it("never takes focus, so it can't block other UIs", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts: [HUD + "config.lua", "bridge.lua", HUD + "client/main.lua"] });
    const shop = await client.start("shop");
    await shop.run(`S = NUI.surface('shop', { hides = { 'hud' } }) S:open()`);
    expect(client.focused()).toBe("shop");
    expect(hud.surfaces().hud).toMatchObject({ open: true, visible: false });
  });
});
