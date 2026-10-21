// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __reset,
  closeSurface,
  defineSurface,
  emit,
  getSurface,
  openSurface,
  setSurfaceState,
} from "../src/index";
import { Surface, useNuiStates, useSurface, useSurfaceOpen } from "../src/react";

afterEach(() => {
  __reset();
  delete (window as any).GetParentResourceName;
  vi.restoreAllMocks();
});

const esc = () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

describe("browser surface manager (mirrors lua/nuikit.lua)", () => {
  it("stacks by layer, focuses the top surface that takes input, and Escape closes top-down", async () => {
    defineSurface("hud", { layer: "hud" });
    defineSurface("menu", { layer: "panel" });
    defineSurface("confirm", { layer: "modal" });
    await openSurface("hud");
    await openSurface("confirm", { amount: 5 });
    await openSurface("menu");
    expect(getSurface("confirm")).toMatchObject({ open: true, focused: true, data: { amount: 5 } });
    expect(getSurface("menu").focused).toBe(false);
    expect(getSurface("hud").focused).toBe(false);

    esc();
    expect(getSurface("confirm").open).toBe(false);
    expect(getSurface("menu").focused).toBe(true);
    esc();
    expect(getSurface("menu").open).toBe(false);
    esc(); // HUD takes no input, so Escape leaves it alone
    expect(getSurface("hud").open).toBe(true);
  });

  it("hides, exclusive and blockedBy behave like Lua", async () => {
    defineSurface("hud", { layer: "hud" });
    defineSurface("inventory", { hides: ["hud"], exclusive: true, blockedBy: ["dead"] });
    defineSurface("phone", { exclusive: true });
    await openSurface("hud");
    await openSurface("inventory");
    expect(getSurface("hud")).toMatchObject({ open: true, visible: false });
    await openSurface("phone");
    expect(getSurface("inventory").open).toBe(false);
    expect(getSurface("hud").visible).toBe(true);
    await closeSurface("phone");
    setSurfaceState("dead", true);
    expect(await openSurface("inventory")).toBe(false);
  });

  it("escape: 'back' emits nuikit:back instead of closing", async () => {
    const back = vi.fn();
    render(
      <Surface name="shop" escape="back" onBack={back}>
        shop
      </Surface>,
    );
    await act(() => openSurface("shop"));
    act(esc);
    expect(back).toHaveBeenCalledOnce();
    expect(getSurface("shop").open).toBe(true);
  });
});

describe("in game", () => {
  it("open/close/Escape go to Lua, and Lua's nuikit:surfaces drives state", async () => {
    (window as any).GetParentResourceName = () => "my-ui";
    const calls: { url: string; body: unknown }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) });
      return new Response(JSON.stringify({ ok: true }));
    });
    await openSurface("inventory", { items: [1] });
    expect(calls.at(-1)).toEqual({ url: "https://my-ui/nuikit:surface:open", body: { name: "inventory", data: { items: [1] } } });

    emit("nuikit:surfaces", { surfaces: { inventory: { open: true, visible: true, focused: true, layer: "panel", data: { items: [1] } } }, states: {} });
    expect(getSurface("inventory").focused).toBe(true);
    esc();
    await new Promise((r) => setTimeout(r, 0));
    expect(calls.at(-1)?.url).toBe("https://my-ui/nuikit:escape");
    await closeSurface("inventory");
    expect(calls.at(-1)).toEqual({ url: "https://my-ui/nuikit:surface:close", body: { name: "inventory" } });
    vi.unstubAllGlobals();
  });
});

describe("React", () => {
  it("<Surface> renders while open and visible, with layer z-order", async () => {
    render(
      <>
        <Surface name="hud" layer="hud">
          hud
        </Surface>
        <Surface name="inventory" layer="panel" hides={["hud"]}>
          {(data: any) => `items:${data.items.length}`}
        </Surface>
      </>,
    );
    await act(() => openSurface("hud"));
    expect(screen.getByText("hud")).toBeTruthy();
    await act(() => openSurface("inventory", { items: [1, 2] }));
    // hidden: drawn a moment longer for its exit, taking no input, then gone
    expect(screen.getByText("hud").getAttribute("data-closing")).toBe("true");
    await act(() => new Promise((r) => setTimeout(r, 320)));
    expect(screen.queryByText("hud")).toBeNull();
    const inv = screen.getByText("items:2");
    expect(inv.getAttribute("data-layer")).toBe("panel");
    expect(Number(inv.style.zIndex)).toBeGreaterThan(30);
  });

  it("a closing surface keeps its last content for the exit, with useSurfaceOpen false; none with motion off", async () => {
    function Body({ data }: { data: any }) {
      return <span>{`${data?.label ?? "none"}:${useSurfaceOpen() ? "open" : "closing"}`}</span>;
    }
    render(<Surface name="sheetly">{(data: any) => <Body data={data} />}</Surface>);
    await act(() => openSurface("sheetly", { label: "menu" }));
    expect(screen.getByText("menu:open")).toBeTruthy();
    await act(() => closeSurface("sheetly"));
    expect(screen.getByText("menu:closing")).toBeTruthy();
    await act(() => new Promise((r) => setTimeout(r, 320)));
    expect(screen.queryByText(/menu:/)).toBeNull();
    document.documentElement.setAttribute("data-nk-motion", "off");
    await act(() => openSurface("sheetly", { label: "again" }));
    await act(() => closeSurface("sheetly"));
    expect(screen.queryByText(/again:/)).toBeNull();
    document.documentElement.removeAttribute("data-nk-motion");
  });

  it("useSurface and useNuiStates follow Lua's messages", () => {
    function Probe() {
      const s = useSurface("bank");
      const states = useNuiStates();
      return <span>{`${s.open}:${String(states.dead ?? false)}`}</span>;
    }
    render(<Probe />);
    expect(screen.getByText("false:false")).toBeTruthy();
    act(() => emit("nuikit:surfaces", { surfaces: { bank: { open: true, visible: true, focused: true, layer: "panel" } }, states: { dead: true } }));
    expect(screen.getByText("true:true")).toBeTruthy();
  });
});
