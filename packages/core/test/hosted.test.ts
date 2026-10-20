// @vitest-environment jsdom
// nuikit-core inside a module the nuikit host mounted: the same API, routed through the
// context the host hands over while the module's script runs (src/hosted.ts, docs/host.md).
import { afterEach, describe, expect, it, vi } from "vitest";
import { HOST_CTX_KEY, type HostedContext, type HostedMessage } from "../src/hosted";
import { scopeSelector, splitSelectors } from "../src/host";

function fakeHost(inGame = true) {
  const listeners = new Set<(m: HostedMessage) => void>();
  const posts: { name: string; data: unknown }[] = [];
  const ctx: HostedContext = {
    resource: "shop",
    inGame,
    post: async (name, data) => {
      posts.push({ name, data });
      if (name === "shop:boom") return { error: "nope" };
      return { ok: true, echo: data };
    },
    listen: (h) => {
      listeners.add(h);
      return () => listeners.delete(h);
    },
  };
  return { ctx, posts, send: (action: string, data: unknown) => listeners.forEach((h) => h({ action, data })) };
}

/** Load a fresh copy of nuikit-core the way a module bundle does: with the context set. */
async function loadAsModule(ctx: HostedContext) {
  vi.resetModules();
  (globalThis as any)[HOST_CTX_KEY] = ctx;
  try {
    return await import("../src/index");
  } finally {
    delete (globalThis as any)[HOST_CTX_KEY];
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("hosted module", () => {
  it("routes fetchNui through the host and reports the owning resource", async () => {
    const host = fakeHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const core = await loadAsModule(host.ctx);
    expect(core.isBrowser()).toBe(false);
    expect(core.resourceName()).toBe("shop");
    expect(await core.fetchNui("shop:buy", { id: 1 })).toEqual({ ok: true, echo: { id: 1 } });
    await expect(core.fetchNui("shop:boom")).rejects.toThrow(/nope/);
    expect(fetchSpy).not.toHaveBeenCalled();
    // The handshake goes the same way (state is resent through the host).
    await new Promise((r) => setTimeout(r, 0));
    expect(host.posts.map((p) => p.name)).toContain("nuikit:ready");
  });

  it("receives only the host's messages, not window messages", async () => {
    const host = fakeHost();
    const core = await loadAsModule(host.ctx);
    const got: unknown[] = [];
    core.onNui("shop:stock", (d) => got.push(d));
    host.send("shop:stock", { apples: 3 });
    window.dispatchEvent(new MessageEvent("message", { data: { action: "shop:stock", data: "spoofed" } }));
    core.emit("shop:stock", "local");
    expect(got).toEqual([{ apples: 3 }, "local"]);
  });

  it("uses mocks when the host itself runs in a browser", async () => {
    const host = fakeHost(false);
    const core = await loadAsModule(host.ctx);
    core.mockNui("shop:buy", { ok: "mocked" });
    expect(await core.fetchNui("shop:buy")).toEqual({ ok: "mocked" });
    expect(host.posts).toEqual([]);
  });

  it("two modules keep separate state", async () => {
    const a = fakeHost();
    const b = { ...fakeHost(), ctx: { ...fakeHost().ctx, resource: "bank" } };
    const coreA = await loadAsModule(a.ctx);
    const coreB = await loadAsModule(b.ctx);
    expect(coreA.resourceName()).toBe("shop");
    expect(coreB.resourceName()).toBe("bank");
    coreA.setVisible(false);
    coreB.setVisible(true);
    expect([coreA.getVisible(), coreB.getVisible()]).toEqual([false, true]);
  });
});

describe("host CSS scoping", () => {
  it("splits selector lists on top-level commas only", () => {
    expect(splitSelectors(":root, :host")).toEqual([":root", ":host"]);
    expect(splitSelectors(".a:is(.b, .c), .d[data-x=\"1,2\"]")).toEqual([".a:is(.b, .c)", '.d[data-x="1,2"]']);
  });

  it("shadow roots: document-root selectors become :host, the rest is already scoped", () => {
    expect(scopeSelector(":root", ":host")).toBe(":host");
    expect(scopeSelector(":root, :host", ":host")).toBe(":host, :host");
    expect(scopeSelector(".dark", ":host")).toBe(":host");
    expect(scopeSelector("html .x", ":host")).toBe(":host .x");
    // player prefs live on the host document's <html>
    expect(scopeSelector('html[data-nk-motion="off"] *', ":host")).toBe(':host-context(html[data-nk-motion="off"]) *');
    expect(scopeSelector('html[data-nk-motion="off"] *::before', '[data-nk="hud"]')).toBe('html[data-nk-motion="off"] [data-nk="hud"] *::before');
    expect(scopeSelector(".flex", ":host")).toBe(".flex");
    expect(scopeSelector(".dark\\:bg-x:is(.dark *)", ":host")).toBe(".dark\\:bg-x:is(.dark *)");
  });

  it("scoped mode: every selector gets the module's attribute", () => {
    const s = '[data-nk="shop"]';
    expect(scopeSelector(":root, :host", s)).toBe(`${s}, ${s}`);
    expect(scopeSelector("*, ::before, ::after", s)).toBe(`${s} *, ${s} ::before, ${s} ::after`);
    expect(scopeSelector(".dark .x", s)).toBe(`${s} .x`);
    expect(scopeSelector(".p-4", s)).toBe(`${s} .p-4`);
  });
});
