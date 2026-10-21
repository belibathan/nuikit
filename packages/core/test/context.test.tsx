// @vitest-environment jsdom
// The server context (currency, locale): `nuikit:context` from bridge.lua → getContext() /
// onContext() / useNuiContext() (protocol §7.2).
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { __reset, DEFAULT_CONTEXT, emit, getContext, onContext, useNuiContext } from "../src/react";

afterEach(() => __reset());

function Price({ amount }: { amount: number }) {
  const { currency, locale } = useNuiContext();
  return <span data-testid="price">{new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount)}</span>;
}

describe("server context", () => {
  it("is USD / en-US until Lua sends one", () => {
    expect(getContext()).toEqual({ currency: "USD", locale: "en-US" });
    expect(getContext()).toBe(DEFAULT_CONTEXT);
  });

  it("keeps the message even when nothing has read it yet, and notifies listeners once per change", () => {
    emit("nuikit:context", { currency: "EUR", locale: "de-DE" }); // before any getContext()
    expect(getContext()).toEqual({ currency: "EUR", locale: "de-DE" });
    const seen = vi.fn();
    const off = onContext(seen);
    emit("nuikit:context", { currency: "EUR", locale: "de-DE" }); // same: no notification
    expect(seen).not.toHaveBeenCalled();
    const before = getContext();
    emit("nuikit:context", { currency: "GBP", locale: "en-GB" });
    expect(seen).toHaveBeenCalledTimes(1);
    expect(getContext()).not.toBe(before); // a new object per change (useSyncExternalStore)
    off();
    emit("nuikit:context", { currency: "JPY", locale: "ja-JP" });
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("falls back field by field on a malformed message", () => {
    emit("nuikit:context", { currency: "", locale: "fr-FR" } as never);
    expect(getContext()).toEqual({ currency: "USD", locale: "fr-FR" });
    emit("nuikit:context", null as never);
    expect(getContext()).toEqual(DEFAULT_CONTEXT);
  });

  it("useNuiContext re-renders with the server's currency and locale", () => {
    render(<Price amount={1520} />);
    expect(screen.getByTestId("price").textContent).toBe("$1,520");
    act(() => emit("nuikit:context", { currency: "EUR", locale: "de-DE" }));
    expect(screen.getByTestId("price").textContent!.replace(/ /g, " ")).toBe("1.520 €");
    act(() => emit("nuikit:context", { currency: "JPY", locale: "ja-JP" }));
    expect(screen.getByTestId("price").textContent).toBe("￥1,520");
  });
});
