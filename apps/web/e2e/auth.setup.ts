import path from "node:path"
import { expect, test as setup } from "@playwright/test"

import {
  TEST_PASSWORD,
  uniqueEmail,
  waitForVerificationToken,
} from "./helpers/mailpit"

export const AUTH_STATE_PATH = path.join(
  import.meta.dirname,
  "../playwright/.auth/user.json"
)

/**
 * Creates a real, verified account and saves the resulting session so the
 * authenticated specs don't each have to sign in. It deliberately drives the
 * actual sign-up and verification screens rather than seeding cookies, so the
 * happy path is covered before anything else runs.
 */
setup("authenticate", async ({ page, request }) => {
  const email = uniqueEmail("e2e-user")

  await page.goto("/signup")
  await page.getByLabel("Name").fill("E2E User")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(TEST_PASSWORD)
  await page.getByRole("button", { name: "Create account" }).click()

  await expect(page.getByText("Almost there.")).toBeVisible()

  const token = await waitForVerificationToken(request, email)

  // Opening the emailed link verifies the address and starts the session.
  await page.goto(`/verify-email?token=${token}`)
  await page.waitForURL("**/orders")
  await expect(page.getByTestId("page-heading")).toBeVisible()

  await page.context().storageState({ path: AUTH_STATE_PATH })
})
