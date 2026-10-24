// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { __reset, emit } from "../src/index";
import { __resetServerTheme, applyServerTheme, loadServerTheme, retryDelay } from "../src/remote";
import { applyTheme, clearTheme, getPrefs, getTheme, onTheme, parseTheme, setPrefs, toRgba } from "../src/theme";
import { compileTheme } from "../src/tokens";
import { getZones } from "../src/zones";

const near = (a: number[] | null, b: number[], tol = 2) => {
  expect(a).not.toBeNull();
  a!.slice(0, 3).forEach((v, i) => expect(Math.abs(v - b[i]!)).toBeLessThanOrEqual(tol));
};

describe("toRgba", () => {
  it("matches Lightning CSS for oklch", () => {
    near(toRgba("oklch(0.62 0.24 295)"), [149, 90, 255], 3); // nuikit primary
    near(toRgba("oklch(0.145 0 0)"), [10, 10, 10]); // shadcn foreground
    near(toRgba("oklch(0.577 0.245 27.325)"), [228, 0, 20], 3); // shadcn destructive
  });
  it("handles alpha, hsl, rgb and hex", () => {
    expect(toRgba("oklch(1 0 0 / 10%)")![3]).toBe(0.1);
    near(toRgba("hsl(0 100% 50%)"), [255, 0, 0]);
    near(toRgba("hsl(240, 5%, 26%)"), [63, 63, 70]);
    expect(toRgba("rgb(1 2 3 / .5)")).toEqual([1, 2, 3, 0.5]);
    expect(toRgba("#ff000080")).toEqual([255, 0, 0, 0.502]);
    expect(toRgba("0.5rem")).toBeNull();
  });
});

describe("themes", () => {
  const tweakcn = `:root { --primary: oklch(0.6 0.2 150); --radius: 0.5rem; }
.dark { --primary: oklch(0.7 0.2 150); --border: oklch(1 0 0 / 10%); }`;

  it("parses pasted TweakCN CSS", () => {
    const { light, dark } = parseTheme(tweakcn);
    expect(light.radius).toBe("0.5rem");
    expect(dark.primary).toBe("oklch(0.7 0.2 150)");
  });

  it("applies values and Chromium-103 channels", () => {
    const el = document.createElement("div");
    applyTheme(tweakcn, el, "dark");
    expect(el.style.getPropertyValue("--radius")).toBe("0.5rem");
    expect(el.style.getPropertyValue("--primary")).toMatch(/^rgba?\(/);
    expect(el.style.getPropertyValue("--primary-rgb")).toMatch(/^\d+, \d+, \d+$/);
    expect(el.style.getPropertyValue("--border-a")).toBe("0.1");
  });
});

describe("theme imports", () => {
  it("turns a full TweakCN paste's font @import into one <link>, and still reads the vars", () => {
    const css = `@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap");
:root { --primary: #111111; --font-sans: Inter, sans-serif; }
.dark { --primary: #fafafa; }
@theme inline { --color-primary: var(--primary); --font-sans: var(--font-sans); }`;
    const el = document.createElement("div");
    applyTheme(css, el, "dark");
    applyTheme(css, el, "dark");
    const links = document.querySelectorAll("link[data-nuikit-import]");
    expect(links).toHaveLength(1);
    expect((links[0] as HTMLLinkElement).href).toContain("family=Inter");
    expect(el.style.getPropertyValue("--primary")).toBe("rgb(250, 250, 250)");
    expect(el.style.getPropertyValue("--font-sans")).toBe("Inter, sans-serif");
  });
});

describe("applyTheme (compiled tokens)", () => {
  afterEach(() => {
    clearTheme();
    __reset();
  });
  const html = () => document.documentElement;
  const css = (name: string) => html().style.getPropertyValue(`--${name}`);

  it("paints every token with channels, and tells listeners", () => {
    const seen: string[] = [];
    onTheme((t) => seen.push(t.hash));
    const vars = applyTheme(".dark { --primary: oklch(0.7 0.2 150); }");
    expect(css("primary")).toBe(vars.primary);
    expect(css("success")).toMatch(/^rgb\(/);
    expect(css("hud")).toBe("rgba(0, 0, 0, 0.45)");
    expect(css("hud-a")).toBe("0.45");
    expect(css("vital-health-rgb")).toMatch(/^\d+, \d+, \d+$/);
    expect(css("nk-scale")).toBe("1");
    expect(html().getAttribute("data-nk-motion")).toBe("on");
    expect(seen).toHaveLength(1);
    expect(getTheme()?.vars.primary).toBe(vars.primary);
  });

  it("a plain object patches the current theme; a new theme removes stale extras", () => {
    applyTheme(".dark { --primary: #111111; --sidebar: #222222; }");
    applyTheme({ "--radius": "0.25rem" });
    expect(css("radius")).toBe("0.25rem");
    expect(css("primary")).toBe("rgb(17, 17, 17)");
    applyTheme(".dark { --primary: #333333; }");
    expect(css("sidebar")).toBe("");
    expect(css("sidebar-rgb")).toBe("");
    expect(css("radius")).toBe("0.75rem");
  });

  it("accepts the compiled theme Lua sends as nuikit:theme, and raw CSS from older servers", () => {
    emit("nuikit:theme", compileTheme(".dark { --primary: #ff0000; }"));
    expect(css("primary")).toBe("rgb(255, 0, 0)");
    emit("nuikit:theme", ".dark { --primary: #00ff00; }");
    expect(css("primary")).toBe("rgb(0, 255, 0)");
  });

  it("player prefs repaint: scale multiplies, motion reduced, high contrast", () => {
    applyTheme(".dark { --nk-scale: 1.1; }");
    emit("nuikit:prefs", { scale: 1.2, reducedMotion: true });
    expect(css("nk-scale")).toBe("1.32");
    expect(css("nk-motion")).toBe("0");
    // tokens 1.2: the pref is "reduced" (no movement, fades ≤ 100ms); "off" is the theme's --nk-motion: 0
    expect(html().getAttribute("data-nk-motion")).toBe("reduced");
    expect(css("nk-motion-move")).toBe("0");
    expect(css("nk-time-base")).toBe("100ms");
    expect(css("nk-time-snap")).toBe("90ms");
    setPrefs({ highContrast: true });
    expect(html().getAttribute("data-nk-contrast")).toBe("high");
    expect(css("hud")).toBe("rgba(0, 0, 0, 0.72)");
    expect(getPrefs()).toEqual({ scale: 1.2, reducedMotion: true, highContrast: true, density: 1 });
    // a new theme keeps the prefs
    applyTheme(".dark { --primary: #123456; }");
    expect(css("nk-scale")).toBe("1.2");
  });

  it("prefs before any theme still apply (on the stock theme)", () => {
    setPrefs({ scale: 0.9 });
    expect(css("nk-scale")).toBe("0.9");
    expect(css("background")).toBe("");
    setPrefs({ highContrast: true });
    expect(css("background")).toBe("rgb(10, 10, 10)");
  });
});

describe("loadServerTheme (override pages)", () => {
  afterEach(() => {
    __resetServerTheme();
    clearTheme();
    __reset();
    vi.unstubAllGlobals();
    delete (window as { GetParentResourceName?: unknown }).GetParentResourceName;
  });

  it("does nothing in the browser", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await loadServerTheme()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("asks the nuikit resource for the compiled theme + prefs, then long-polls with the hash", async () => {
    window.GetParentResourceName = () => "ox_lib";
    const theme = compileTheme(".dark { --primary: #ff00ff; }");
    const bodies: unknown[] = [];
    let release: (v: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        bodies.push([url, JSON.parse(String(init?.body))]);
        if (bodies.length === 1) return Promise.resolve(new Response(JSON.stringify({ hash: "a", theme, prefs: { scale: 1.1 } })));
        return new Promise<Response>((r) => (release = r));
      }),
    );
    expect(await loadServerTheme()).toBe(true);
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("rgb(255, 0, 255)");
    expect(document.documentElement.style.getPropertyValue("--nk-scale")).toBe("1.1");
    await new Promise((r) => setTimeout(r, 0));
    expect(bodies).toEqual([
      ["https://nuikit/theme", { hash: null }],
      ["https://nuikit/theme", { hash: "a", wait: true }],
    ]);
    // `nuikit theme reload` on the server → the pending request answers with the new theme
    release(new Response(JSON.stringify({ hash: "b", theme: compileTheme(".dark { --primary: #00ffff; }") })));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("rgb(0, 255, 255)");
  });

  it("takes the screen zones from the same answers; a zone change alone doesn't repaint", async () => {
    window.GetParentResourceName = () => "ox_lib";
    const theme = compileTheme(".dark { --primary: #ff00ff; }");
    let calls = 0;
    let release: (v: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        if (++calls === 1) return Promise.resolve(new Response(JSON.stringify({ hash: "t:z0", themeHash: "t", theme, zones: [] })));
        return new Promise<Response>((r) => (release = r));
      }),
    );
    expect(await loadServerTheme()).toBe(true);
    expect(getZones()).toEqual({});
    await new Promise((r) => setTimeout(r, 0));
    const repaints = vi.fn();
    const off = onTheme(repaints);
    const map = { "nuikit_hud:map": [{ x: 0.8, y: 0, w: 0.2, h: 0.3 }] };
    release(new Response(JSON.stringify({ hash: "t:z1", themeHash: "t", theme, zones: map })));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(getZones()).toEqual(map);
    expect(repaints).not.toHaveBeenCalled();
    off();
  });

  it("falls back to nuikit/theme.css from an older nuikit resource", async () => {
    window.GetParentResourceName = () => "ox_lib";
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(url.endsWith("theme.css") ? new Response(".dark { --primary: #0000ff; }") : new Response("", { status: 404 })),
      ),
    );
    expect(await loadServerTheme({ live: false })).toBe(true);
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("rgb(0, 0, 255)");
  });

  it("keeps asking when nuikit starts after the page, and the server's theme replaces the stale file (0.7.0 F4)", async () => {
    window.GetParentResourceName = () => "ox_lib";
    const bodies: unknown[] = [];
    let asks = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (url.endsWith("theme.css")) return Promise.resolve(new Response(".dark { --primary: #8000ff; }")); // the old violet copy
        bodies.push(JSON.parse(String(init?.body)));
        // nuikit isn't started for the first ask; then it answers, then holds the long-poll
        if (++asks === 1) return Promise.resolve(new Response("", { status: 404 }));
        if (asks === 2) return Promise.resolve(new Response(JSON.stringify({ hash: "s", theme: compileTheme(".dark { --primary: #00ff00; }") })));
        return new Promise<Response>(() => {});
      }),
    );
    expect(await loadServerTheme()).toBe(true);
    for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 0));
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("rgb(0, 255, 0)");
    expect(bodies).toEqual([{ hash: null }, { hash: null, wait: true }, { hash: "s", wait: true }]);
    expect(retryDelay(1)).toBe(2_000);
    expect(retryDelay(31)).toBe(30_000);
  });

  it("applyServerTheme takes raw CSS when the server couldn't compile", () => {
    expect(applyServerTheme({ hash: "x", css: ".dark { --primary: #010203; }" })).toBe(true);
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("rgb(1, 2, 3)");
    expect(applyServerTheme({ hash: "y" })).toBe(false);
  });
});

describe("a themed subtree", () => {
  it("is marked data-nk-theme (kit.css re-derives component tokens there), and cleared with the theme", () => {
    const stage = document.createElement("div");
    document.body.append(stage);
    applyTheme({ primary: "#2563eb" }, stage);
    expect(stage.hasAttribute("data-nk-theme")).toBe(true);
    expect(document.documentElement.hasAttribute("data-nk-theme")).toBe(false);
    clearTheme(undefined, stage);
    expect(stage.hasAttribute("data-nk-theme")).toBe(false);
    stage.remove();
  });
});
