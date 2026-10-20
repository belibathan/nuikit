import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

const LOADING = fileURLToPath(new URL("../../../../systems/nuikit_loading/", import.meta.url));
const scripts = [LOADING + "config.lua", LOADING + "client/main.lua"];
let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

// qbx_core's config/client.lua as it ships (only the lines around the setting).
const qbxConfig = (external: string) => `return {
    pauseMapText = 'Powered by Qbox',
    characters = {
        useExternalCharacters = ${external}, -- Whether you have an external character management resource. (If true, disables the character management inside the core)
        enableDeleteButton = true,
    },
}`;

/** The game around client/main.lua. */
const natives = ({ states = "", file }: { states?: string; file?: string }) => `
    STATES = { ${states} }
    FILE = ${file === undefined ? "nil" : JSON.stringify(file)}
    LOG = {}
    function GetResourceState(r) return STATES[r] or 'missing' end
    function LoadResourceFile(r, f) if r == 'qbx_core' and f == 'config/client.lua' then return FILE end end
    function SendLoadingScreenMessage(m) LOG[#LOG + 1] = 'message ' .. m end
    function ShutdownLoadingScreen() LOG[#LOG + 1] = 'ShutdownLoadingScreen' end
    function ShutdownLoadingScreenNui() LOG[#LOG + 1] = 'ShutdownLoadingScreenNui' end
    function CreateThread(fn) THREAD = fn end
`;

/** Start the resource; `override` is a server owner's edit to config.lua, applied before the game loads. */
async function start(opts: { states?: string; file?: string; override?: string }) {
  client = await createClient();
  const r = await client.start("nuikit_loading", { before: natives(opts), scripts });
  if (opts.override) await r.run(opts.override);
  // the thread runs once the game has loaded
  await r.run(`THREAD()`);
  return { r, log: async () => (await r.run(`return table.concat(LOG, ' | ')`)) as string };
}

const WAIT = 'message {"eventName":"nuikit:ready"}';
const CLOSE = "ShutdownLoadingScreen | ShutdownLoadingScreenNui";

describe("systems/nuikit_loading", () => {
  it("defaults to 'auto'", async () => {
    const { r } = await start({});
    expect(await r.run(`return Config.externalShutdown`)).toBe("auto");
  });

  it("auto, Qbox with its own character menu: waits for qbx_core to close the screen", async () => {
    const { r, log } = await start({ states: "qbx_core = 'started'", file: qbxConfig("false") });
    expect(await r.run(`return Loading.qboxCharacters()`)).toBe(true);
    expect(await log()).toBe(WAIT);
  });

  it("auto, Qbox still starting on this client: counts as running", async () => {
    const { log } = await start({ states: "qbx_core = 'starting'", file: qbxConfig("false") });
    expect(await log()).toBe(WAIT);
  });

  it("auto, Qbox with useExternalCharacters = true: closes it (qbx_core won't)", async () => {
    const { r, log } = await start({ states: "qbx_core = 'started'", file: qbxConfig("true") });
    expect(await r.run(`return Loading.qboxCharacters()`)).toBe(false);
    expect(await log()).toBe(CLOSE);
  });

  it("auto, Qbox config unreadable: qbx_core's default, its own menu", async () => {
    const { log } = await start({ states: "qbx_core = 'started'" });
    expect(await log()).toBe(WAIT);
  });

  it("auto, the setting only counts outside comments", async () => {
    const file = `return {\n  characters = {\n    -- useExternalCharacters = true,\n    useExternalCharacters = false,\n  },\n}`;
    const { log } = await start({ states: "qbx_core = 'started'", file });
    expect(await log()).toBe(WAIT);
  });

  it("auto, no Qbox (QBCore, ESX, standalone): closes it as soon as the game has loaded", async () => {
    const { r, log } = await start({ states: "['qb-core'] = 'started', ['qb-multicharacter'] = 'started'" });
    expect(await r.run(`return Loading.qboxCharacters()`)).toBe(false);
    expect(await log()).toBe(CLOSE);
  });

  it("an explicit setting wins over detection", async () => {
    const off = await start({ states: "qbx_core = 'started'", file: qbxConfig("false"), override: "Config.externalShutdown = false" });
    expect(await off.log()).toBe(CLOSE);
    client.close();
    const on = await start({ override: "Config.externalShutdown = true" });
    expect(await on.log()).toBe(WAIT);
  });
});
