import path from "node:path"
import { defineConfig, devices } from "@playwright/test"

const isCI = !!process.env.CI
const appPort = process.env.PORT ?? "3000"
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${appPort}`

const authStatePath = path.join(
  import.meta.dirname,
  "playwright/.auth/user.json"
)

const webServer = process.env.PLAYWRIGHT_BASE_URL
  ? undefined
  : {
      command: isCI
        ? `pnpm build && pnpm start --hostname localhost --port ${appPort}`
        : `pnpm dev --hostname localhost --port ${appPort}`,
      url: baseURL,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    }

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    // Creates a verified account once and stores its session for reuse.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      // Signed out: the auth screens bounce anyone who already has a session.
      name: "anonymous",
      testMatch: /auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticated",
      testIgnore: /auth\.(spec|setup)\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: authStatePath },
      dependencies: ["setup"],
    },
  ],
  ...(webServer ? { webServer } : {}),
})
