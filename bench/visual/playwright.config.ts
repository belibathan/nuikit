// Visual baselines for the registry components (design v2 §5B, docs/design/contract.md item 23).
//   pnpm visual            compare with the committed baselines
//   pnpm visual:update     write new baselines (look at the diff before committing)
// Baselines are only comparable from the same environment: CI runs this in the Playwright 1.56.0 image
// (ci.yml `visual`), and `visual:update` should run there too (run CI by hand with update-baselines).
import { defineConfig } from "@playwright/test";

const port = 5179;

export default defineConfig({
  testDir: ".",
  outputDir: "./.out",
  // one file per section × identity, no platform suffix: the environment is pinned instead
  snapshotPathTemplate: "{testDir}/baselines/{arg}{ext}",
  fullyParallel: true,
  workers: 4,
  retries: 0,
  timeout: 180_000,
  reporter: process.env.CI ? [["github"], ["html", { open: "never", outputFolder: "./.report" }]] : [["list"]],
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      // anti-aliasing noise only; a changed token or layout moves far more than this
      maxDiffPixelRatio: 0.002,
      threshold: 0.15,
    },
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    reducedMotion: "reduce",
    timezoneId: "UTC",
    locale: "en-US",
    browserName: "chromium",
  },
  webServer: {
    command: `pnpm --filter www exec vite --port ${port} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${port}/components`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    cwd: "../..",
  },
});
