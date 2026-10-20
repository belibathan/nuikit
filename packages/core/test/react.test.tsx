// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { __reset, defineSurface, emit, getHandshake, hasCapability, protocolVersion, setVisible, useNuiState, useNuiVisibility } from "../src/react";

afterEach(() => __reset());

function Vitals() {
  const v = useNuiState("hud:vitals", { health: 100 } as any) as { health: number };
  return <span data-testid="hp">{v.health}</span>;
}

function Menu() {
  const { visible } = useNuiVisibility();
  return visible ? <div data-testid="menu">open</div> : null;
}

describe("react hooks", () => {
  it("useNuiState tracks the latest payload", () => {
    render(<Vitals />);
    expect(screen.getByTestId("hp").textContent).toBe("100");
    act(() => emit("hud:vitals", { health: 12 }));
    expect(screen.getByTestId("hp").textContent).toBe("12");
  });

  it("useNuiVisibility follows Lua and closes on Escape", async () => {
    render(<Menu />);
    expect(screen.queryByTestId("menu")).not.toBeNull();
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(screen.queryByTestId("menu")).toBeNull();
    act(() => setVisible(true));
    expect(screen.queryByTestId("menu")).not.toBeNull();
  });

  it("in game, useNuiVisibility sends Escape to Lua as one nuikit:escape (§3.5), even with surfaces listening", async () => {
    (window as any).GetParentResourceName = () => "my-ui";
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      return new Response(JSON.stringify({ ok: true }));
    });
    defineSurface("main"); // installs the surfaces Escape listener too
    emit("nuikit:surfaces", { surfaces: { main: { open: true, visible: true, focused: true, layer: "panel" } }, states: {} });
    const view = render(<Menu />);
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
    });
    expect(calls.filter((u) => u.endsWith("/nuikit:escape"))).toHaveLength(1);
    expect(calls.some((u) => u.endsWith("/nuikit:close"))).toBe(false);
    expect(view.container.querySelector("[data-testid=menu]")).not.toBeNull(); // Lua decides; it hides the UI with nuikit:visible
    delete (window as any).GetParentResourceName;
    vi.unstubAllGlobals();
  });

  it("no handshake outside the game: protocol 0, no capabilities", () => {
    expect(getHandshake()).toBeNull();
    expect(protocolVersion()).toBe(0);
    expect(hasCapability("theme")).toBe(false);
  });
});
