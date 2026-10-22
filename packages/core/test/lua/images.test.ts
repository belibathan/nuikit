// The image resolver's Lua side (systems/nuikit/client/images.lua): https://nuikit/images serves the
// replicated convar templates (+ ox_inventory's imagepath), https://nuikit/vehicle the car the player
// sits in or stands at, named by the framework's shared list when it knows the hash.
import { afterEach, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { createClient } from "./harness";

let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

const IMAGES = fileURLToPath(new URL("../../../../systems/nuikit/client/images.lua", import.meta.url));

const natives = (convars: Record<string, string>, world = "") => `
  local CONVARS = json.decode('${JSON.stringify(convars)}')
  function GetConvar(k, d) return CONVARS[k] or d end
  function PlayerPedId() return 1 end
  function vector3(x, y, z) return setmetatable({ x = x, y = y, z = z }, { __sub = function(a, b) return vector3(a.x - b.x, a.y - b.y, a.z - b.z) end, __len = function(a) return math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) end }) end
  SEAT = 0
  POOL = {}
  COORDS = { [1] = vector3(0, 0, 0) }
  MODELS = {}
  function GetVehiclePedIsIn() return SEAT end
  function GetGamePool() return POOL end
  function GetEntityCoords(e) return COORDS[e] end
  function GetEntityModel(e) return MODELS[e] end
  function GetDisplayNameFromVehicleModel(h) return h == 99 and 'SULTAN' or 'CARNOTFOUND' end
  ${world}
`;

describe("images.lua: https://nuikit/images", () => {
  it("serves the convar templates, ox_inventory's imagepath after nuikit's own, and replace", async () => {
    client = await createClient();
    const host = await client.start("nuikit", {
      before: natives({
        nuikit_images_item: " https://cdn.example.com/{name}.webp | nui://my/{lower}.png ",
        nuikit_images_clothing: "nui://pack/{gender}_{id}.png",
        "inventory:imagepath": "nui://ox_inventory/web/images/",
        nuikit_images_replace: "1",
      }),
      scripts: [IMAGES],
    });
    expect(await host.call("images")).toEqual({
      item: "https://cdn.example.com/{name}.webp ; nui://my/{lower}.png;nui://ox_inventory/web/images/{name}.png",
      weapon: "",
      vehicle: "",
      clothing: "nui://pack/{gender}_{id}.png",
      replace: true,
    });
  });

  it("serves empty templates and replace false when nothing is set", async () => {
    client = await createClient();
    const host = await client.start("nuikit", { before: natives({}), scripts: [IMAGES] });
    expect(await host.call("images")).toEqual({ item: "", weapon: "", vehicle: "", clothing: "", replace: false });
  });
});

describe("images.lua: https://nuikit/vehicle", () => {
  it("names the seated vehicle from qbx_core's list, else GTA's display name", async () => {
    client = await createClient();
    await client.start("qbx_core", { before: `exports('GetVehiclesByHash', function() return { [42] = { model = 'Elegy' } } end)` });
    const host = await client.start("nuikit", { before: natives({}, `SEAT = 7 MODELS[7] = 42 COORDS[7] = vector3(0, 0, 0)`), scripts: [IMAGES] });
    expect(await host.call("vehicle")).toEqual({ model: "elegy", hash: 42 });
    await host.run("MODELS[7] = 99");
    expect(await host.call("vehicle")).toEqual({ model: "sultan", hash: 99 });
  });

  it("on foot: the closest vehicle within 4 m, nothing further", async () => {
    client = await createClient();
    const world = `POOL = { 8, 9 } COORDS[8] = vector3(3, 0, 0) COORDS[9] = vector3(2, 0, 0) MODELS[8] = 1 MODELS[9] = 99`;
    const host = await client.start("nuikit", { before: natives({}, world), scripts: [IMAGES] });
    expect(await host.call("vehicle")).toEqual({ model: "sultan", hash: 99 });
    await host.run("COORDS[8] = vector3(9, 0, 0) COORDS[9] = vector3(5, 0, 0)");
    expect(await host.call("vehicle")).toEqual({});
  });
});
