// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { __reset, closeNui, configureNui, getNuiDiagnostics, emit, fetchNui, getVisible, isBrowser, mockNui, NuiError, onNui, onNuiCall, setVisible } from "../src/index";

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
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ name: "double", data: { n: 21 }, response: { n: 42 }, mocked: true, ms: expect.any(Number) }));
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

describe("NuiError codes", () => {
  const game = () => ((window as any).GetParentResourceName = () => "my-hud");
  const hang = () =>
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_u, init) =>
        new Promise((_r, reject) =>
          (init as RequestInit).signal!.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))),
        ),
    );
  const code = async (p: Promise<unknown>) => p.then(() => "ok", (e) => (e as NuiError).code);

  it("TIMEOUT via timeoutMs and via the configured default", async () => {
    game();
    hang();
    expect(await code(fetchNui("m", {}, { timeoutMs: 10 }))).toBe("TIMEOUT");
    configureNui({ timeoutMs: 10 });
    expect(await code(fetchNui("m", {}))).toBe("TIMEOUT");
  });

  it("CANCELLED via AbortSignal, also when already aborted", async () => {
    game();
    hang();
    const c = new AbortController();
    const p = code(fetchNui("m", {}, { signal: c.signal }));
    c.abort();
    expect(await p).toBe("CANCELLED");
    expect(await code(fetchNui("m", {}, { signal: c.signal }))).toBe("CANCELLED");
  });

  it("TRANSPORT when fetch fails", async () => {
    game();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("net"));
    expect(await code(fetchNui("m"))).toBe("TRANSPORT");
  });

  it("UNKNOWN_CALLBACK from Lua's reply, and from strictMocks in the browser", async () => {
    game();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "UNKNOWN_CALLBACK", message: "no NUI callback" })));
    const err = (await fetchNui("m").catch((e) => e)) as NuiError;
    expect(err.code).toBe("UNKNOWN_CALLBACK");
    expect(err.message).toMatch(/no NUI callback/);
    delete (window as any).GetParentResourceName;
    configureNui({ strictMocks: true });
    expect(await code(fetchNui("nothing"))).toBe("UNKNOWN_CALLBACK");
    expect(await fetchNui("nothing", {}, { mock: { ok: true } })).toEqual({ ok: true });
  });

  it("INVALID for a Lua { error } and for a non-JSON reply", async () => {
    game();
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ error: "no item" })));
    expect(await code(fetchNui("m"))).toBe("INVALID");
    f.mockImplementation(async () => new Response("<html>"));
    expect(await code(fetchNui("m"))).toBe("INVALID");
  });

  it("a mock that returns { error } fails like the game would", async () => {
    mockNui("m", () => ({ error: "UNKNOWN_CALLBACK" }) as never);
    expect(await code(fetchNui("m"))).toBe("UNKNOWN_CALLBACK");
  });

  it("logs code and ms per call, and keeps per-resource diagnostics", async () => {
    const log = vi.fn();
    onNuiCall(log);
    game();
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("{}"));
    await fetchNui("a");
    await fetchNui("a");
    f.mockImplementation(async () => new Response(JSON.stringify({ error: "x" })));
    await code(fetchNui("a"));
    expect(log.mock.calls[2]![0]).toMatchObject({ code: "INVALID", mocked: false });
    expect(log.mock.calls[0]![0].code).toBeUndefined();
    const [d] = getNuiDiagnostics();
    expect(d).toMatchObject({ resource: "my-hud", calls: 3, errors: { INVALID: 1 } });
    expect(d!.p95).toBeGreaterThanOrEqual(d!.p50);
    expect((window as any)["nuikit:diagnostics"]()).toEqual(getNuiDiagnostics());
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
