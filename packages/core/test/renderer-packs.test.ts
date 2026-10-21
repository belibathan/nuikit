// @vitest-environment jsdom
// The frame's renderer-pack loader (systems/nuikit/web/src/packs.ts): a pack's renderer replaces
// the default for its kind; a broken pack falls back to the default and is reported.
import { describe, expect, it } from "vitest";
import { createRendererPacks, pickRenderer } from "../../../systems/nuikit/web/src/packs";

const renderer = (kind: string) => ({ kind, mount: () => {} });

describe("renderer packs: loader", () => {
  it("loads a pack's renderer for a kind, drops it when Lua clears the kind", async () => {
    const fetched: string[] = [];
    const packs = createRendererPacks({
      fetchModule: async ({ url }) => {
        fetched.push(url);
        return { notify: renderer("notify"), menu: renderer("menu") };
      },
    });
    const failed: unknown[] = [];
    await packs.apply({ notify: { resource: "neon", url: "https://cfx-nui-neon/web/dist/renderers.js", gen: 1 }, menu: { resource: "neon", url: "https://cfx-nui-neon/web/dist/renderers.js", gen: 1 } });
    expect(fetched).toHaveLength(1); // one script for both kinds
    expect(packs.get("notify")?.resource).toBe("neon");
    expect(packs.get("menu")?.def.kind).toBe("menu");
    expect(packs.get("input")).toBeUndefined();
    const el = packs.get("notify")!.mountEl();
    expect(el.getRootNode()).toBeInstanceOf(ShadowRoot);
    await packs.apply({ menu: { resource: "neon", url: "https://cfx-nui-neon/web/dist/renderers.js", gen: 1 } });
    expect(packs.get("notify")).toBeUndefined();
    expect(packs.get("menu")?.resource).toBe("neon");
    await packs.apply({});
    expect(packs.get("menu")).toBeUndefined();
    expect(document.querySelector("nk-pack")).toBeNull();
    expect(failed).toEqual([]);
  });

  it("falls back to the default and reports when the script fails or has no renderer for the kind", async () => {
    const failed: { kind: string; resource: string; message: string }[] = [];
    const packs = createRendererPacks(
      {
        fetchModule: async ({ url }) => {
          if (url.includes("missing")) throw new Error(`could not load ${url}`);
          return renderer("menu");
        },
      },
      { onFailed: (i) => failed.push({ kind: i.kind, resource: i.resource, message: i.message }) },
    );
    await packs.apply({ notify: { resource: "gone", url: "https://cfx-nui-gone/missing.js", gen: 1 }, menu: { resource: "wrong", url: "https://cfx-nui-wrong/renderers.js", gen: 1 }, input: { resource: "wrong", url: "https://cfx-nui-wrong/renderers.js", gen: 1 } });
    expect(packs.get("notify")).toBeUndefined();
    expect(packs.get("menu")?.resource).toBe("wrong");
    expect(packs.get("input")).toBeUndefined();
    expect(failed).toEqual([
      { kind: "notify", resource: "gone", message: "could not load https://cfx-nui-gone/missing.js" },
      { kind: "input", resource: "wrong", message: 'the module\'s renderer draws "menu", not "input"' },
    ]);
    expect(packs.status().notify?.status).toBe("failed");
  });

  it("pickRenderer accepts one renderer, a record or a list", () => {
    expect(pickRenderer(renderer("notify"), "notify").kind).toBe("notify");
    expect(pickRenderer([renderer("menu"), renderer("notify")], "notify").kind).toBe("notify");
    expect(pickRenderer({ a: renderer("notify") }, "notify").kind).toBe("notify");
    expect(() => pickRenderer({ x: 1 }, "notify")).toThrow(/exports no renderer/);
  });
});
