// Renderer packs (systems/nuikit/client/renderers.lua): discovery through fxmanifest metadata,
// packs starting before and after nuikit, the newest pack winning a kind, stop → the previous one
// or the default, page reload sync, and the fallback report.
import { afterEach, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { createClient } from "./harness";

let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

const RENDERERS = fileURLToPath(new URL("../../../../systems/nuikit/client/renderers.lua", import.meta.url));
const startRuntime = () => client.start("nuikit", { scripts: [RENDERERS] });
const states = (host: { messages: { action: string; data: any }[] }) => host.messages.filter((m) => m.action === "nuikit:renderer").map((m) => m.data.active);
const last = (host: { messages: { action: string; data: any }[] }) => states(host).at(-1);

describe("renderer packs: discovery", () => {
  it("finds packs started before nuikit, with the default module path, and ignores unknown kinds", async () => {
    client = await createClient();
    await client.start("neon", { metadata: { nuikit_renderer: ["notify", "toast"] } });
    await client.start("plain");
    const host = await startRuntime();
    expect(last(host)).toEqual({ notify: { resource: "neon", url: "https://cfx-nui-neon/web/dist/renderers.js", gen: 1 } });
    expect(await host.run("return NUI.rendererPacks().notify.resource")).toBe("neon");
  });

  it("a pack started later claims its kinds with its own module path; the newest pack wins; stop falls back", async () => {
    client = await createClient();
    const host = await startRuntime();
    await client.start("neon", { metadata: { nuikit_renderer: ["notify", "menu"] } });
    expect(last(host).menu.resource).toBe("neon");
    await client.start("glass", { metadata: { nuikit_renderer: ["Notify"], nuikit_renderer_module: ["dist/pack.js"] } });
    expect(last(host)).toEqual({
      notify: { resource: "glass", url: "https://cfx-nui-glass/dist/pack.js", gen: 2 },
      menu: { resource: "neon", url: "https://cfx-nui-neon/web/dist/renderers.js", gen: 1 },
    });
    client.stop("glass");
    expect(last(host).notify.resource).toBe("neon");
    client.stop("neon");
    expect(last(host)).toEqual({});
  });

  it("resends the state when the page reloads, and reports a failed pack on F8 and to the server", async () => {
    client = await createClient();
    const host = await startRuntime();
    await client.start("neon", { metadata: { nuikit_renderer: ["notify"] } });
    host.messages.length = 0;
    expect(await host.call("nuikit:renderer:sync")).toEqual({ ok: true });
    expect(last(host).notify.resource).toBe("neon");
    expect(await host.call("nuikit:renderer:failed", { kind: "notify", resource: "neon", url: "x", message: "could not load x" })).toEqual({ ok: true });
    expect(host.serverEvents.at(-1)).toEqual({ event: "nuikit:renderer:failed", args: [{ resource: "neon", kind: "notify", message: "could not load x" }] });
  });
});
