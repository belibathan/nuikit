// Renders the README art to PNG: node docs/assets/src/render.mjs
// Uses the repo's playwright-core (found by walking up to node_modules/.pnpm) and the local Chrome.
// Pages are served over HTTP from the repo root so the fonts in packages/core/fonts load.
import { createServer } from "node:http";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const out = resolve(here, "..");

function findPlaywright() {
  for (let dir = root; ; dir = dirname(dir)) {
    const pnpm = join(dir, "node_modules/.pnpm");
    if (existsSync(pnpm)) {
      const pkg = readdirSync(pnpm).find((d) => d.startsWith("playwright-core@"));
      if (pkg) return join(pnpm, pkg, "node_modules/playwright-core/index.mjs");
    }
    if (dirname(dir) === dir) throw new Error("playwright-core not found; run pnpm install");
  }
}
const { chromium } = await import(pathToFileURL(findPlaywright()).href);

const types = { ".html": "text/html", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  const file = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!file.startsWith(root) || !existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/docs/assets/src/`;

const jobs = [
  { page: "social.html", file: "social-preview.png", width: 1280, height: 640, scale: 1 },
  { page: "banner.html", file: "banner.png", width: 1600, height: 560, scale: 2 },
];

const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const job of jobs) {
    const page = await browser.newPage({ viewport: { width: job.width, height: job.height }, deviceScaleFactor: job.scale });
    page.on("pageerror", (e) => console.error(job.page, e.message));
    await page.goto(base + job.page, { waitUntil: "networkidle" });
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.style} ${f.weight}`);
    });
    if (!fonts.some((f) => f.startsWith("Barlow Condensed")) || !fonts.some((f) => f.startsWith("Geist"))) {
      throw new Error(`${job.page}: fonts did not load (${fonts.join(", ") || "none"})`);
    }
    await page.screenshot({ path: join(out, job.file) });
    console.log(`${job.file} ${job.width * job.scale}x${job.height * job.scale} (${fonts.length} faces)`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
