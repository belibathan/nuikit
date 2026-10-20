import path from "node:path";
import { defineConfig, mergeConfig } from "vitest/config";
import vite from "./vite.config";

// Logic tests for the registry components (meter thresholds, money, countdown), resolved through
// the same aliases the site uses.
export default mergeConfig(
  vite,
  defineConfig({
    test: { dir: path.resolve(__dirname, "../../registry"), include: ["**/*.test.{ts,tsx}"] },
  }),
);
