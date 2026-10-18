// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { __reset, emit, setVisible, useNuiState, useNuiVisibility } from "../src/react";

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
});
