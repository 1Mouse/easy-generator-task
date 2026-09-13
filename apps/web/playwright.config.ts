import { defineConfig, devices } from "@playwright/test"

const isCI = !!process.env.CI
const appPort = process.env.PORT ?? "3000"
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${appPort}`

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
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(webServer ? { webServer } : {}),
})
