// scripts/new-system.mjs: a scaffolded system's build script only names files the scaffold wrote
// (lane F's report: it copied the HUD's `vite build -c vite.module.config.ts` without the config).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../../..");
const made: string[] = [];
afterAll(() => made.forEach((d) => fs.rmSync(path.join(root, d), { recursive: true, force: true })));

function scaffold(dir: string, ...args: string[]) {
  fs.rmSync(path.join(root, dir), { recursive: true, force: true });
  made.push(dir);
  execFileSync(process.execPath, [path.join(root, "scripts/new-system.mjs"), dir, "Scaffold test", ...args], { cwd: root, stdio: "pipe" });
  return path.join(root, dir, "web");
}

describe("new-system.mjs", () => {
  for (const [dir, args] of [
    ["systems/nuikit_scaffold_test", []],
    ["addons/scaffold_test_addon", ["--resource", "scaffold_test_addon", "--path", "web/build"]],
  ] as const) {
    it(`${dir}: every config its build script names exists`, () => {
      const web = scaffold(dir, ...args);
      const pkg = JSON.parse(fs.readFileSync(path.join(web, "package.json"), "utf8"));
      expect(pkg.scripts.build).toBe("tsc -b && vite build");
      const configs = [...String(pkg.scripts.build).matchAll(/-c\s+(\S+)/g)].map((m) => m[1]!);
      for (const c of [...configs, "vite.config.ts", "tsconfig.json", "index.html"]) expect(fs.existsSync(path.join(web, c)), c).toBe(true);
    });
  }
});
