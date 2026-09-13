import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: "./",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.integration-spec.ts"],
    exclude: ["node_modules/**", "dist/**"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
