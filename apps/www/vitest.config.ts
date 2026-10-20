import path from "node:path";
import { defineConfig, mergeConfig } from "vitest/config";
import vite from "./vite.config";

// Logic tests for the registry components and blocks (meter thresholds, load progress…), resolved
// through the same aliases the site uses, plus the site's own (src/*.test.ts).
export default mergeConfig(
  vite,
  defineConfig({
    test: {
      dir: path.resolve(__dirname, "../.."),
      include: ["registry/**/*.test.{ts,tsx}", "apps/www/src/**/*.test.{ts,tsx}"],
    },
  }),
);
