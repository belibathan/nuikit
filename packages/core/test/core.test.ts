// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { __reset, closeNui, emit, fetchNui, getVisible, isBrowser, mockNui, NuiError, onNui, onNuiCall, setVisible } from "../src/index";

afterEach(() => {
  __reset();
  delete (window as any).GetParentResourceName;
  vi.restoreAllMocks();
});

describe("environment", () => {
  it("detects the browser", () => {
    expect(isBrowser()).toBe(true);
    (window as any).GetParentResourceName = () => "my-hud";
    expect(isBrowser()).toBe(false);
  });
});

describe("events (Lua → UI)", () => {
  it("delivers SendNUIMessage-shaped messages to subscribers", async () => {
    const seen: unknown[] = [];
    onNui("hud:vitals", (d) => seen.push(d));
    window.postMessage({ action: "hud:vitals", data: { health: 80 } }, "*");
    await new Promise((r) => setTimeout(r, 0));
    expect(seen).toEqual([{ health: 80 }]);
  });

  it("emit() behaves like Lua and unsubscribe works", () => {
    const fn = vi.fn();
    const off = onNui("a", fn);
    emit("a", 1);
    off();
    emit("a", 2);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it("ignores foreign postMessage traffic", () => {
    const fn = vi.fn();
    onNui("a", fn);
    window.dispatchEvent(new MessageEvent("message", { data: "webpackHotUpdate" }));
    window.dispatchEvent(new MessageEvent("message", { data: { type: "x" } }));
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("callbacks (UI → Lua)", () => {
  it("resolves mocks in the browser", async () => {
    mockNui("bank:balance", () => ({ cash: 1 }));
    await expect(fetchNui("bank:balance")).resolves.toEqual({ cash: 1 });
  });

  it("falls back to options.mock, then {}", async () => {
    await expect(fetchNui("x", {}, { mock: { ok: true } })).resolves.toEqual({ ok: true });
    await expect(fetchNui("y")).resolves.toEqual({});
  });

  it("passes request data to mock functions and logs calls", async () => {
    const log = vi.fn();
    onNuiCall(log);
    mockNui("double", (d: any) => ({ n: d.n * 2 }));
    await expect(fetchNui("double", { n: 21 })).resolves.toEqual({ n: 42 });
    expect(log).toHaveBeenCalledWith({ name: "double", data: { n: 21 }, response: { n: 42 }, mocked: true });
  });

  it("POSTs to https://<resource>/<name> in game", async () => {
    (window as any).GetParentResourceName = () => "my-hud";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    await expect(fetchNui("inventory:use", { slot: 3 })).resolves.toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://my-hud/inventory:use",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ slot: 3 }) }),
    );
  });

  it("turns Lua errors into NuiError", async () => {
    (window as any).GetParentResourceName = () => "my-hud";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "no item" })));
    await expect(fetchNui("inventory:use", { slot: 3 })).rejects.toBeInstanceOf(NuiError);
  });

  it("explains timeouts", async () => {
    (window as any).GetParentResourceName = () => "my-hud";
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_u, init) =>
        new Promise((_r, reject) =>
          (init as RequestInit).signal!.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))),
        ),
    );
    await expect(fetchNui("missing", {}, { timeout: 10 })).rejects.toThrow(/timed out/);
  });
});

describe("visibility", () => {
  it("follows the built-in nuikit:visible event", () => {
    setVisible(false);
    emit("nuikit:visible", true);
    expect(getVisible()).toBe(true);
    emit("nuikit:visible", false);
    expect(getVisible()).toBe(false);
  });

  it("closeNui hides locally and calls nuikit:close", async () => {
    const log = vi.fn();
    onNuiCall(log);
    await closeNui();
    expect(getVisible()).toBe(false);
    expect(log.mock.calls[0]![0].name).toBe("nuikit:close");
  });
});
