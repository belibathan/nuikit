import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { lowerCss, parseColor, splitTop, unwrapAtRule } from "../src/compat";

const dir = path.join(__dirname, "fixtures");
let tailwindOut = "";

beforeAll(() => {
  // Compile the stock shadcn/ui globals + real shadcn class strings with Tailwind v4.
  const bin = path.join(__dirname, "../node_modules/.bin/tailwindcss");
  // On Windows node_modules/.bin holds .cmd shims, which only run through a shell.
  const input = path.join(dir, "shadcn.css");
  tailwindOut =
    process.platform === "win32"
      ? execSync(`"${bin}.cmd" -i "${input}"`, { cwd: dir, encoding: "utf8" })
      : execFileSync(bin, ["-i", input], { cwd: dir, encoding: "utf8" });
}, 60_000);

describe("lowerCss on real Tailwind v4 + shadcn output", () => {
  it("leaves nothing Chromium 103 can't parse outside @supports guards", () => {
    const { code, report } = lowerCss(tailwindOut);
    const outside = code.replace(/@supports[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, "");
    expect(outside).not.toMatch(/okl(ch|ab)\(/);
    expect(outside).not.toMatch(/\(width\s*>=/);
    expect(outside).not.toMatch(/color-mix\(in oklab, var\(--(primary|destructive|ring|input|chart-1)\)/);
    expect(report.opacityRewrites).toBeGreaterThanOrEqual(10);
  });

  it("gives every shadcn token live rgb channels, in light and dark", () => {
    const { code } = lowerCss(tailwindOut);
    expect(code).toMatch(/--primary: #171717; --primary-rgb: 23, 23, 23; --primary-a: 1/);
    expect(code).toMatch(/\.dark \{[^}]*--primary-rgb: 229, 229, 229/);
    // alpha tokens like --border: oklch(1 0 0 / 10%) keep their alpha
    expect(code).toMatch(/--border-a: \.10?\d?;/);
  });

  it("rewrites opacity modifiers to channel math", () => {
    const { code } = lowerCss(tailwindOut);
    expect(code).toContain("rgba(var(--primary-rgb), calc(var(--primary-a) * .1))");
    expect(code).toContain("rgba(var(--destructive-rgb), calc(var(--destructive-a) * .9))");
    // and the @supports(color-mix) guard is gone so the rule applies on 103
    expect(code).not.toMatch(/@supports \(color: color-mix\(in lab, red, red\)\)/);
  });

  it("flags :has() by default, polyfills it with css-has-pseudo when opted in", () => {
    const on = lowerCss(tailwindOut, { has: true });
    expect(on.report.hasSelectors).toBeGreaterThan(0);
    expect(on.code).toContain(".js-has-pseudo [csstools-has-");
    expect(on.report.warnings.map((w) => w.feature)).not.toContain(":has()");
    const off = lowerCss(tailwindOut);
    expect(off.report.warnings.map((w) => w.feature)).toContain(":has()");
  });

  it("is safe to minify", () => {
    const { code } = lowerCss(tailwindOut, { minify: true });
    expect(code.replace(/\s+/g, "")).toContain("rgba(var(--primary-rgb),calc(var(--primary-a)*.1))");
    expect(code).not.toContain("\n  ");
  });
});

describe("transforms", () => {
  it("lowers Tailwind's individual transform properties", () => {
    const css = `.x{--tw-translate-x:-50%;translate:var(--tw-translate-x) var(--tw-translate-y)}.y{rotate:45deg}.z{scale:var(--tw-scale-x) var(--tw-scale-y)}`;
    const { code, report } = lowerCss(css);
    expect(report.transformRewrites).toBe(3);
    expect(code).toContain("--nk-translate: translate(var(--tw-translate-x), var(--tw-translate-y))");
    expect(code).toContain("--nk-rotate: rotate(45deg)");
    expect(code).toContain("transform: var(--nk-translate) var(--nk-rotate) var(--nk-scale)");
    expect(code).toMatch(/@property --nk-translate \{[^}]*inherits: false/);
  });

  it("leaves keyframes alone", () => {
    const { code } = lowerCss(`@keyframes a{from{translate:0 0}to{translate:10px 0}}`);
    expect(code).not.toContain("--nk-translate:");
  });
});

describe("helpers", () => {
  it("parses colors", () => {
    expect(parseColor("#fff")).toEqual([255, 255, 255, 1]);
    expect(parseColor("#ffffff1a")![3]).toBeCloseTo(0.1, 2);
    expect(parseColor("rgb(1 2 3 / 50%)")).toEqual([1, 2, 3, 0.5]);
    expect(parseColor("var(--x)")).toBeNull();
  });
  it("splits on top-level whitespace", () => {
    expect(splitTop("calc(1px + 2px) var(--a)")).toEqual(["calc(1px + 2px)", "var(--a)"]);
  });
  it("unwraps nested at-rules", () => {
    expect(unwrapAtRule("@supports (x) { a{b:c} @supports (x) { d{e:f} } }", /@supports \(x\) \{/g).replace(/\s+/g, "")).toBe("a{b:c}d{e:f}");
  });
});

describe("gradients", () => {
  it("drops interpolation color spaces Chromium 103 rejects", () => {
    const css = `.a{--tw-gradient-position:to bottom right in oklab;background-image:linear-gradient(var(--tw-gradient-stops))}
.b{--tw-gradient-position:in oklab;background-image:radial-gradient(var(--tw-gradient-stops))}
.c{--tw-gradient-position:in oklch longer hue;background-image:linear-gradient(var(--tw-gradient-stops))}
.d{background:linear-gradient(in oklab, red, blue)}
@supports (background-image: linear-gradient(in lab, red, red)) { .e{--tw-gradient-position:to right in oklab} }`;
    const { code, report } = lowerCss(css);
    expect(code).toMatch(/\.a \{\s*--tw-gradient-position: to bottom right;/);
    expect(code).toMatch(/\.b \{\s*--tw-gradient-position: ellipse;/);
    expect(code).toMatch(/\.c \{\s*--tw-gradient-position: 180deg;/);
    expect(code).toMatch(/linear-gradient\(red, (red|#f00)?,?\s*blue\)|linear-gradient\(red, blue\)/);
    expect(code).toMatch(/\.e \{\s*--tw-gradient-position: to right in oklab/); // guarded: untouched
    expect(report.gradientRewrites).toBe(4);
  });
});
