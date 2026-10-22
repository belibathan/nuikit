// systems/nuikit_chat: theme.js (plain JS, runs inside the cfx chat page) and the chat_theme
// templates in its fxmanifest. theme.js must convert colours exactly like the core runtime.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { toRgba } from "../src/theme";
import { compileTheme } from "../src/tokens";

const dir = fileURLToPath(new URL("../../../systems/nuikit_chat/", import.meta.url));
const source = readFileSync(dir + "theme/theme.js", "utf8");
const chat = (() => {
  const module = { exports: {} as any };
  new Function("module", source)(module);
  return module.exports as {
    toRgba(v: string): number[] | null;
    parseTheme(css: string): { light: Record<string, string>; dark: Record<string, string> };
    themeDecls(css: string): Record<string, string>;
    varsDecls(vars: Record<string, string>): Record<string, string>;
    importUrls(css: string): string[];
    inserted(before: string, after: string): [number, number] | null;
  };
})();

describe("nuikit_chat theme.js", () => {
  it("finds what was typed for the smooth caret (a keystroke, a paste, a deletion, a recall)", () => {
    expect(chat.inserted("/car ad", "/car add")).toEqual([7, 8]);
    expect(chat.inserted("/car", "/c ar")).toEqual([2, 3]);
    expect(chat.inserted("", "/car adder")).toEqual([0, 10]);
    expect(chat.inserted("/car adder", "/car adde")).toBeNull();
    expect(chat.inserted("same", "same")).toBeNull();
    expect(chat.inserted("aaa", "aaaa")).toEqual([3, 4]);
  });

  it("converts colours exactly like nuikit-core", () => {
    const colours = [
      "oklch(0.145 0 0)",
      "oklch(0.985 0 0)",
      "oklch(0.704 0.191 22.216)",
      "oklch(0.62 0.24 295)",
      "oklch(0.577 0.245 27.325)",
      "oklch(0.9 0.3 140)", // out of gamut
      "oklch(1 0 0 / 10%)",
      "oklch(72% 0.17 295deg / 0.5)",
      "oklab(0.6 0.1 -0.1)",
      "hsl(240 5% 26%)",
      "hsl(0, 100%, 50%)",
      "rgb(1 2 3 / .5)",
      "#ff000080",
      "#abc",
    ];
    for (const c of colours) expect(chat.toRgba(c), c).toEqual(toRgba(c));
    expect(chat.toRgba("0.625rem")).toBeNull();
    expect(chat.toRgba("Inter, sans-serif")).toBeNull();
  });

  it("turns a pasted TweakCN theme into Chromium-103-safe --nk-* variables", () => {
    const css = `@import url("https://fonts.googleapis.com/css2?family=Inter");
:root { --primary: oklch(0.6 0.2 150); --radius: 0.5rem; --font-sans: Inter, sans-serif; }
.dark { --primary: oklch(0.7 0.2 150); --border: oklch(1 0 0 / 10%); --sidebar-ring: var(--ring); --shadow: 0 1px 2px oklch(0 0 0 / 0.1); }`;
    const d = chat.themeDecls(css);
    expect(d["--nk-primary"]).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    expect(d["--nk-primary-rgb"]).toBe(toRgba("oklch(0.7 0.2 150)")!.slice(0, 3).join(", ")); // .dark wins
    expect(d["--nk-border"]).toBe("rgba(255, 255, 255, 0.1)");
    expect(d["--nk-border-a"]).toBe("0.1");
    expect(d["--nk-radius"]).toBe("0.5rem");
    expect(d["--nk-font-sans"]).toBe("Inter, sans-serif");
    expect(d["--nk-sidebar-ring"]).toBe("var(--nk-ring)");
    expect(d["--nk-shadow"]).toBeUndefined(); // oklch inside a compound value can't be lowered: skipped
    for (const v of Object.values(d)) expect(v).not.toMatch(/okl(ch|ab)\(|color-mix\(/);
  });

  it("reads the stock nuikit/theme.css", () => {
    const d = chat.themeDecls(readFileSync(dir + "../nuikit/theme.css", "utf8"));
    expect(d["--nk-card"]).toBe("rgb(23, 23, 23)");
    expect(d["--nk-background-rgb"]).toBe("10, 10, 10");
  });

  it("style.css ships only colours Chromium 103 can read", () => {
    const css = readFileSync(dir + "theme/style.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/okl(ch|ab)\(|color-mix\(|:has\(|@container/);
    // every --nk-*-rgb the stylesheet reads has a built-in fallback
    const used = new Set([...css.matchAll(/var\((--nk-[\w-]+-rgb)\)/g)].map((m) => m[1]));
    for (const v of used) if (v !== "--nk-tone-rgb") expect(css, v).toContain(`${v}:`);
  });
});

describe("nuikit_chat theme.js with the compiled theme (tokens v1)", () => {
  const stock = compileTheme(readFileSync(dir + "../nuikit/theme.css", "utf8"));

  it("sets every token, semantic ones included, from the nuikit resource's compiled vars", () => {
    const d = chat.varsDecls(stock.vars);
    expect(d["--nk-success"]).toBe(stock.vars.success);
    expect(d["--nk-warning-rgb"]).toBe(toRgba(stock.vars.warning!)!.slice(0, 3).join(", "));
    expect(d["--nk-hud-a"]).toBe("0.45");
  });

  it("style.css's built-in status colours are the stock theme's derived tokens", () => {
    const css = readFileSync(dir + "theme/style.css", "utf8");
    for (const name of ["success", "warning", "info"]) {
      const rgb = toRgba(stock.vars[name]!)!.slice(0, 3).join(", ");
      expect(css, name).toContain(`--nk-${name}-rgb: ${rgb};`);
    }
  });

  it("reads Google Fonts imports with ; in the URL", () => {
    expect(chat.importUrls(`@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap");`)).toEqual([
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap",
    ]);
  });
});

describe("nuikit_chat templates", () => {
  const manifest = readFileSync(dir + "fxmanifest.lua", "utf8");
  const templates: Record<string, string> = Object.fromEntries(
    [...manifest.matchAll(/^\s*(\w+) = '(<[^']*)',?$/gm)].map((m) => [m[1]!, m[2]!]),
  );

  it("covers chat's own ids and the ones Qbox resources send", () => {
    for (const id of ["default", "defaultAlt", "print", "user", "join", "quit", "system", "info", "success", "warning", "error"]) {
      expect(templates[id], id).toBeTruthy();
    }
  });

  it("wraps every argument in its own span, and has no empty span chat would strip", () => {
    for (const [id, html] of Object.entries(templates)) {
      expect(html.match(/\{\d\}/g)!.length, id).toBe(html.match(/<span>\{\d\}<\/span>/g)!.length);
      expect(html, id).not.toMatch(/<span[^>]*><\/span[^>]*>/);
      expect(html, id).not.toContain("'");
    }
  });
});
