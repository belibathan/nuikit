import { describe, expect, it } from "vitest";
import { colorLiterals, isNeutralShadow, paletteClasses, tokenRefs } from "../src/colors";
import { lexCss, lexHtml, lexJs, lexLua, locator, luaBlocks } from "../src/lex";

const strs = (src: string) => lexJs(src).strings.map((s) => src.slice(s.start, s.end));

describe("lexJs", () => {
  it("blanks comments and keeps offsets", () => {
    const src = `const a = 1; // #fff\n/* rgb(0 0 0) */ const b = "#000";`;
    const { code } = lexJs(src);
    expect(code.length).toBe(src.length);
    expect(code).not.toContain("#fff");
    expect(code).not.toContain("rgb(");
    expect(code).toContain('"#000"');
  });

  it("collects string contents, including template text but not ${…}", () => {
    expect(strs(`f("a", 'b', \`c\${x("d")}e\`)`)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("does not treat // inside strings as a comment", () => {
    expect(strs(`fetch("https://res/cb"); const x = "#123456";`)).toEqual(["https://res/cb", "#123456"]);
  });

  it("survives apostrophes in JSX text", () => {
    const src = `<p>Don't panic</p>\nconst c = "bg-red-500";`;
    expect(strs(src)).toContain("bg-red-500");
  });

  it("skips regex literals and JSX closing tags", () => {
    expect(strs(`const r = /"/g; const s = "ok";`)).toEqual(["ok"]);
    expect(strs(`<div>{x}</div>\nconst s = "after";`)).toContain("after");
    expect(strs(`<Foo a={x} />\nconst s = "after";`)).toContain("after");
  });
});

describe("lexCss / lexHtml", () => {
  it("blanks CSS comments", () => {
    expect(lexCss("a{} /* #fff */ b{}")).toBe("a{}            b{}");
  });

  it("splits HTML into markup, styles and scripts", () => {
    const src = `<!-- <b class="bg-red-500"> --><style>.a{color:red}</style><script>let a = "x"</script><i class="x">`;
    const { markup, styles, scripts } = lexHtml(src);
    expect(markup).not.toContain("bg-red-500");
    expect(markup).not.toContain("color:red");
    expect(src.slice(styles[0]!.start, styles[0]!.end)).toBe(".a{color:red}");
    expect(src.slice(scripts[0]!.start, scripts[0]!.end)).toBe('let a = "x"');
  });
});

describe("lexLua", () => {
  it("blanks line and long comments; bare also blanks strings", () => {
    const src = `--[[ SetNuiFocus(true) ]]\nlocal s = 'SetNuiFocus(x)' -- SetNuiFocus\nSetNuiFocus(false, false)\nlocal l = [==[ long ]==]`;
    const { code, bare } = lexLua(src);
    expect(code.match(/SetNuiFocus/g)).toHaveLength(2);
    expect(bare.match(/SetNuiFocus/g)).toHaveLength(1);
    expect(bare).not.toContain("long");
  });

  it("finds block ranges", () => {
    const bare = lexLua(`CreateThread(function()\n  while true do\n    if a then b() end\n    Wait(0)\n  end\nend)`).bare;
    const kinds = luaBlocks(bare).map((b) => b.kind);
    expect(kinds).toEqual(["if", "while", "function"]);
    const loop = luaBlocks(bare).find((b) => b.kind === "while")!;
    expect(bare.slice(loop.start, loop.end)).toMatch(/^while[\s\S]*Wait\(0\)[\s\S]*end$/);
  });

  it("handles for, repeat and do blocks", () => {
    const bare = lexLua(`for i = 1, 3 do x() end\nrepeat y() until z\ndo local q = 1 end`).bare;
    expect(luaBlocks(bare).map((b) => b.kind)).toEqual(["for", "repeat", "do"]);
  });
});

describe("colours", () => {
  it("matches literals, not var()/calc()", () => {
    expect(colorLiterals("rgb(0 0 0 / .5) #fff #12345678 oklch(0.7 0.2 150)").map((h) => h.text)).toEqual(["rgb(0 0 0 / .5)", "#fff", "#12345678", "oklch(0.7 0.2 150)"]);
    expect(colorLiterals("rgb(var(--primary-rgb) / 0.5) hsl(${h} 50% 50%) #root #fade-in")).toEqual([]);
  });

  it("knows neutral shadows", () => {
    for (const c of ["rgb(0 0 0 / 0.6)", "rgba(0,0,0,.35)", "#000", "#0008", "#ffffff40", "hsl(0 0% 0% / 0.1)", "oklch(0 0 0 / 0.2)"]) expect(isNeutralShadow(c)).toBe(true);
    for (const c of ["rgb(255 0 0 / 0.6)", "#f00", "hsl(220 10% 30%)"]) expect(isNeutralShadow(c)).toBe(false);
  });

  it("matches Tailwind palette classes with variants and opacity", () => {
    expect(paletteClasses("bg-emerald-500 hover:text-red-400/80 !border-x-zinc-800 bg-primary text-white bg-black/50").map((h) => h.text)).toEqual([
      "bg-emerald-500",
      "hover:text-red-400/80",
      "!border-x-zinc-800",
    ]);
  });

  it("counts token references", () => {
    expect(tokenRefs("bg-primary text-muted-foreground ring-ring/50 nk-panel var(--vital-health) bg-emerald-500")).toBe(5);
  });
});

describe("locator", () => {
  it("maps offsets to 1-based line and column", () => {
    const at = locator("ab\ncd\n\nef");
    expect(at(0)).toEqual({ line: 1, column: 1 });
    expect(at(4)).toEqual({ line: 2, column: 2 });
    expect(at(7)).toEqual({ line: 4, column: 1 });
  });
});
