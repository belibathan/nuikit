// Shared harness for the motion bench: the ox_lib override's built page, served as in game
// (https://cfx-nui-ox_lib/, GetParentResourceName() = "ox_lib"), with every NUI callback (POST
// https://ox_lib/<name>) answered locally and logged with its performance.now() time.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const OUT = path.join(REPO, "bench/motion/.out");

const require = createRequire(import.meta.url);
/** playwright-core: this checkout's, else the main checkout's (worktrees share it). */
export function playwright() {
  for (const base of [REPO, "/home/claude/nuikit"]) {
    const dir = path.join(base, "node_modules/.pnpm");
    if (!fs.existsSync(dir)) continue;
    const pkg = fs.readdirSync(dir).find((d) => d.startsWith("playwright-core@"));
    if (pkg) return require(path.join(dir, pkg, "node_modules/playwright-core"));
  }
  throw new Error("playwright-core not found: pnpm install in the repo");
}
export const CHROMIUM = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium";

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };

/**
 * Open the ox_lib page from `build` (a vite build folder) in a new context.
 * Math.random is fixed at 0.5 so a skill check's zone is the same every run (easy: 215°–265°).
 */
export async function openOxLib(browser, build, { width = 1920, height = 1080, motion } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(() => {
    Object.defineProperty(window, "GetParentResourceName", { value: () => "ox_lib" });
    Math.random = () => 0.5;
    window.__posts = [];
    const real = window.fetch.bind(window);
    window.fetch = (url, opts) => {
      const u = String(url);
      if (u.startsWith("https://ox_lib/")) {
        window.__posts.push({ name: u.slice("https://ox_lib/".length), body: opts?.body, t: performance.now() });
        return Promise.resolve(new Response("1", { headers: { "content-type": "application/json" } }));
      }
      return real(url, opts);
    };
  });
  await context.route(/^https:\/\/cfx-nui-ox_lib\//, (route) => {
    const file = path.join(build, decodeURIComponent(new URL(route.request().url()).pathname));
    if (!file.startsWith(build) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ status: 200, contentType: TYPES[path.extname(file)] ?? "application/octet-stream", body: fs.readFileSync(file) });
  });
  const page = await context.newPage();
  await page.goto("https://cfx-nui-ox_lib/index.html");
  await page.waitForFunction(() => window.__posts.some((p) => p.name === "init"));
  await page.waitForTimeout(300);
  if (motion) await page.evaluate((m) => document.documentElement.setAttribute("data-nk-motion", m), motion);
  return { context, page };
}

/** Send a Lua → UI message; returns its performance.now() time in the page. */
export const send = (page, action, data) =>
  page.evaluate(([action, data]) => {
    const t = performance.now();
    window.postMessage({ action, data }, "*");
    return t;
  }, [action, data]);

/** The page's callback log since `since` (performance.now() ms). */
export const posts = (page, since = 0) => page.evaluate((s) => window.__posts.filter((p) => p.t >= s), since);
