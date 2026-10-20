import { defineConfig } from "vitest/config";

// The block templates' server Lua, under real Lua 5.4 (test/harness.ts).
export default defineConfig({
  test: { include: ["test/**/*.test.ts"] },
});
