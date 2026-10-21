import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

// Client natives the bridge reads when it loads (standalone framework).
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

describe("@nuikit/init.lua", () => {
  it("imports the runtime from the nuikit resource: nk and NUI are one table, surfaces work", async () => {
    client = await createClient();
    const ui = await client.start("shop", { runtime: "import", before: natives });
    expect(await ui.run(`return nk == NUI and rawget(nk, '__imported') == true`)).toBe(true);
    await ui.run(`S = nk.surface('shop', { layer = 'panel' }) S:open({ items = 3 })`);
    expect(ui.surfaces().shop).toMatchObject({ open: true, focused: true, data: { items: 3 } });
    expect(ui.focus).toMatchObject({ focus: true });
    expect(await ui.call("nuikit:ready", { protocol: 1, client: "test" })).toMatchObject({ ok: true, resource: "shop", protocol: 1 });
  });

  it("imports the services with the runtime: nk.camera and nk.controls (docs/services.md)", async () => {
    client = await createClient();
    const ui = await client.start("shop", { runtime: "import", before: natives });
    expect(await ui.run(`return type(nk.camera.claim) == 'function' and type(nk.controls.disable) == 'function'`)).toBe(true);
    expect(await ui.run(`return nk.camera.isActive()`)).toBe(false);
    expect(await ui.run(`return nk.controls.count()`)).toBe(0);
  });

  it("loads the framework bridge only when nk.player is first used", async () => {
    client = await createClient();
    const ui = await client.start("menu", { runtime: "import", before: natives });
    await ui.call("nuikit:ready", {});
    expect(await ui.run(`return rawget(nk, 'player') == nil`)).toBe(true);
    expect(ui.messages.some((m) => m.action === "nuikit:player")).toBe(false);
    expect((await ui.call("nuikit:ready", {})).capabilities).not.toContain("player");
    expect((await ui.call("nuikit:ready", {})).capabilities).not.toContain("context");

    expect(await ui.run(`return nk.player.framework`)).toBe("standalone");
    expect(await ui.run(`return nk.player.get().health`)).toBe(100);
    const caps = (await ui.call("nuikit:ready", {})).capabilities;
    expect(caps).toContain("player");
    // the server context (§7.2) comes with the bridge, so a page can hasCapability("context")
    expect(caps).toContain("context");
  });

  it("importing twice keeps the first runtime and its state", async () => {
    client = await createClient();
    const ui = await client.start("twice", { runtime: "import", before: natives });
    await ui.run(`S = nk.surface('a', { layer = 'panel' }) S:open() FIRST = nk`);
    await ui.run(`local src = __nuikitInit; assert(load(src))()`);
    expect(await ui.run(`return nk == FIRST and S:isOpen()`)).toBe(true);
  });

  it("says what to do when the nuikit resource isn't started", async () => {
    client = await createClient();
    await expect(client.start("orphan", { runtime: "import", runtimeMissing: true, before: natives })).rejects.toThrow(
      /ensure nuikit first, and add dependency 'nuikit'/,
    );
  });

  it("on the server only defines nk.version", async () => {
    client = await createClient();
    const srv = await client.start("srv", {
      runtime: "import",
      metadata: {},
      before: natives + ` function IsDuplicityVersion() return true end`,
    });
    expect(await srv.run(`return type(nk) == 'table' and NUI == nil and nk.surface == nil`)).toBe(true);
  });
});
