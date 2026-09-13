import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "node:path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@/": path.resolve(import.meta.dirname, "./") + "/",
      "@workspace/ui/":
        path.resolve(import.meta.dirname, "../../packages/ui/src/") + "/",
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    exclude: ["e2e/**", "node_modules/**"],
  },
})
