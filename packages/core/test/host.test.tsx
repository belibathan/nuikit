// @vitest-environment jsdom
// The nuikit host (src/host.ts): messages for a module are held until it is listening, so
// nothing a resource sends between the load and the module's first onNui() is lost.
import { act } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createHost, type Host, type HostEvent } from "../src/host";
import { HOST_CTX_KEY, type HostedContext, type HostedMessage } from "../src/hosted";
import { defineModule, defineReactModule, type ModuleContext, type ModuleDefinition } from "../src/module";

// jsdom has no constructable stylesheets.
class FakeSheet {
  cssRules: unknown[] = [];
  replaceSync() {}
  insertRule() {}
}

let currentScript: HTMLScriptElement | null = null;
let host: Host;
let events: HostEvent[];

// createHost is a singleton per page (window.__nuikit is frozen): one host for the file, a resource per test.
beforeAll(() => {
  vi.stubGlobal("CSSStyleSheet", FakeSheet);
  (document as unknown as { adoptedStyleSheets: unknown[] }).adoptedStyleSheets = [];
  Object.defineProperty(document, "currentScript", { get: () => currentScript, configurable: true });
  events = [];
  host = createHost({ inGame: false, isolation: "scoped", onEvent: (e) => events.push(e) });
});

beforeEach(() => {
  events.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

/** Run a module's script the way the host does: factory() with the context exposed, from the loaded <script>. */
function runModule(resource: string, factory: (ctx: HostedContext) => ModuleDefinition) {
  const script = [...document.head.querySelectorAll("script")].at(-1)!;
  currentScript = script;
  try {
    window.__nuikit!.define(() => factory((globalThis as Record<string, unknown>)[HOST_CTX_KEY] as HostedContext));
  } finally {
    currentScript = null;
  }
}

const status = (resource: string) => host.modules().find((m) => m.resource === resource)?.status;

describe("host: messages wait for the module's listeners", () => {
  it("a 'signal' module gets everything sent before ctx.ready(), in order, then live", () => {
    host.load({ resource: "shop", url: "https://cfx-nui-shop/module.js" });
    host.send("shop", "shop:stock", 1); // script still loading
    const got: HostedMessage[] = [];
    let mctx: ModuleContext | undefined;
    runModule("shop", (ctx) => {
      ctx.listen((m) => got.push(m)); // nuikit-core subscribes while the script runs
      return defineModule({ ready: "signal", mount: (_el, c) => void (mctx = c) });
    });
    expect(status("shop")).toBe("loading"); // mounted, but not listening yet
    host.send("shop", "shop:stock", 2); // the gap: after mount, before the app's onNui
    expect(got).toEqual([]);

    mctx!.ready();
    expect(status("shop")).toBe("mounted");
    expect(got.map((m) => m.data)).toEqual([1, 2]);
    expect(events.map((e) => e.type)).toEqual(["load", "mount"]);

    host.send("shop", "shop:stock", 3);
    expect(got.map((m) => m.data)).toEqual([1, 2, 3]);
    mctx!.ready(); // idempotent (StrictMode runs effects twice)
    expect(events.filter((e) => e.type === "mount")).toHaveLength(1);
  });

  it("a plain module is listening when mount() returns", () => {
    host.load({ resource: "hud", url: "https://cfx-nui-hud/module.js" });
    host.send("hud", "hud:vitals", { health: 50 });
    const got: HostedMessage[] = [];
    runModule("hud", (ctx) => {
      ctx.listen((m) => got.push(m));
      return defineModule({ mount: () => {} });
    });
    expect(status("hud")).toBe("mounted");
    expect(got).toEqual([{ action: "hud:vitals", data: { health: 50 } }]);
  });

  it("holds the latest 200 messages, and delivers them after a module that never signals, with a warning", () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    host.load({ resource: "slow", url: "https://cfx-nui-slow/module.js" });
    const got: HostedMessage[] = [];
    runModule("slow", (ctx) => {
      ctx.listen((m) => got.push(m));
      return defineModule({ ready: "signal", mount: () => {} });
    });
    for (let i = 0; i < 250; i++) host.send("slow", "tick", i);
    expect(got).toEqual([]);
    vi.advanceTimersByTime(10_000);
    expect(status("slow")).toBe("mounted");
    expect(got).toHaveLength(200);
    expect(got[0]!.data).toBe(50);
    expect(got.at(-1)!.data).toBe(249);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/slow: ready\(\) was never called/));
  });

  it("an unloaded module's queue is dropped with it", () => {
    host.load({ resource: "gone", url: "https://cfx-nui-gone/module.js" });
    host.send("gone", "x", 1);
    host.unload("gone");
    expect(status("gone")).toBeUndefined();
    host.send("gone", "x", 2); // nothing to deliver to, nothing thrown
  });
});

describe("defineReactModule signals ready after the App's effects", () => {
  const mount = async (strict: boolean) => {
    const log: string[] = [];
    function App() {
      useEffect(() => {
        log.push("app-effect"); // where onNui()/usePlayer() subscribe
      }, []);
      return null;
    }
    const def = defineReactModule({ App, strict });
    expect(def.ready).toBe("signal");
    const el = document.createElement("div");
    let cleanup: void | (() => void);
    await act(async () => {
      cleanup = def.mount(el, { resource: "app", hosted: true, portal: document.body, reportError: () => {}, ready: () => log.push("ready") });
    });
    await act(async () => cleanup?.());
    return log;
  };

  it("in order: the App's own effects first, then ready()", async () => {
    expect(await mount(false)).toEqual(["app-effect", "ready"]);
  });

  it("under StrictMode too (ready is called again; the host ignores repeats)", async () => {
    const log = await mount(true);
    expect(log[0]).toBe("app-effect");
    expect(log).toContain("ready");
    for (let i = 0; i < log.length; i++) if (log[i] === "ready") expect(log.slice(0, i)).toContain("app-effect");
  });
});

describe("host.fetchModule: renderer packs get their exports without a mount", () => {
  /** Run the pack's script the way the browser would once it loads: define() from its <script>. */
  const runPack = (factory: (deps: unknown) => unknown) => {
    const script = [...document.head.querySelectorAll("script[data-nk-pack]")].at(-1) as HTMLScriptElement;
    currentScript = script;
    try {
      window.__nuikit!.define(factory as never);
    } finally {
      currentScript = null;
    }
  };

  it("resolves with the default export and the host's React; nothing is mounted or recorded", async () => {
    const p = host.fetchModule({ resource: "pack", url: "https://cfx-nui-pack/renderers.js" });
    let seen: { react: unknown } | undefined;
    runPack((deps) => {
      seen = deps as { react: unknown };
      return { default: { kind: "notify", mount: () => {} } };
    });
    const exports = (await p) as { kind: string };
    expect(exports.kind).toBe("notify");
    expect(seen?.react).toBeDefined();
    expect(host.modules().some((m) => m.resource === "pack")).toBe(false);
    expect(document.head.querySelector("script[data-nk-pack]")).toBeNull(); // the <script> is gone once it ran
    expect(events).toEqual([]);
  });

  it("redirects portals aimed at document.body to the pack's portal", async () => {
    const portal = document.createElement("div");
    const p = host.fetchModule({ resource: "pack", url: "https://cfx-nui-pack/renderers.js", portal: () => portal });
    let dom: { createPortal: (c: unknown, t: Element) => { containerInfo: Element } } | undefined;
    runPack((deps) => {
      dom = (deps as { reactDom: typeof dom }).reactDom;
      return { x: 1 };
    });
    expect(await p).toEqual({ x: 1 }); // no default export: the exports object itself
    expect(dom!.createPortal(null, document.body).containerInfo).toBe(portal);
    expect(dom!.createPortal(null, portal).containerInfo).toBe(portal);
  });

  it("rejects when the script fails to load, throws, or never defines", async () => {
    vi.useFakeTimers();
    const failing = host.fetchModule({ resource: "pack", url: "https://cfx-nui-pack/missing.js" });
    const script = [...document.head.querySelectorAll("script[data-nk-pack]")].at(-1) as HTMLScriptElement;
    script.onerror!(new Event("error"));
    await expect(failing).rejects.toThrow(/could not load https:\/\/cfx-nui-pack\/missing.js/);

    const throwing = host.fetchModule({ resource: "pack", url: "https://cfx-nui-pack/renderers.js" });
    runPack(() => {
      throw new Error("boom");
    });
    await expect(throwing).rejects.toThrow("boom");

    const silent = host.fetchModule({ resource: "pack", url: "https://cfx-nui-pack/silent.js", timeoutMs: 50 });
    vi.advanceTimersByTime(60);
    await expect(silent).rejects.toThrow(/defined no module within 50 ms/);
    vi.useRealTimers();
  });

  it("cache-busts a URL fetched again (a restarted pack loads its new build)", () => {
    void host.fetchModule({ resource: "again", url: "https://cfx-nui-again/renderers.js" });
    void host.fetchModule({ resource: "again", url: "https://cfx-nui-again/renderers.js" });
    const srcs = [...document.head.querySelectorAll("script[data-nk-pack='again']")].map((s) => (s as HTMLScriptElement).src);
    expect(srcs).toEqual(["https://cfx-nui-again/renderers.js", "https://cfx-nui-again/renderers.js?v=2"]);
  });
});
