import { expect, test } from "@playwright/test"

import {
  TEST_PASSWORD,
  uniqueEmail,
  waitForVerificationToken,
} from "./helpers/mailpit"

// These run signed out — the auth screens redirect away when a session exists.
test.describe("Sign in", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
  })

  test("shows field errors instead of submitting an invalid form", async ({
    page,
  }) => {
    await page.getByLabel("Email").fill("not-an-email")
    await page.getByLabel("Password").fill("")
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(page.getByText("Enter a valid email address")).toBeVisible()
    await expect(page.getByText("Password is required")).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test("surfaces a server error as a toast, not a field error", async ({
    page,
  }) => {
    await page.getByLabel("Email").fill("nobody@example.com")
    await page.getByLabel("Password").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(page.getByText("Invalid email or password")).toBeVisible()
  })

  test("tells an unverified user to verify before signing in", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("e2e-unverified")

    await request.post("/api/auth/signup", {
      data: { name: "Unverified User", email, password: TEST_PASSWORD },
    })

    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(
      page.getByText("Please verify your email before signing in")
    ).toBeVisible()
  })

  test("redirects back to the page that required a session", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("e2e-redirect")
    await request.post("/api/auth/signup", {
      data: { name: "Redirect User", email, password: TEST_PASSWORD },
    })
    const token = await waitForVerificationToken(request, email)
    await request.post("/api/auth/resend-verification", { data: { email } })

    // Land on the guarded page first so the proxy appends ?next=
    await page.goto("/orders")
    await expect(page).toHaveURL(/\/login\?next=%2Forders/)

    await page.goto(`/verify-email?token=${token}`)
    await page.waitForURL("**/orders")
    await expect(page.getByTestId("page-heading")).toBeVisible()
  })
})

test.describe("Sign up", () => {
  test("validates the password policy before calling the API", async ({
    page,
  }) => {
    await page.goto("/signup")
    await page.getByLabel("Name").fill("Jo")
    await page.getByLabel("Email").fill("jane@example.com")
    await page.getByLabel("Password").fill("weak")
    await page.getByRole("button", { name: "Create account" }).click()

    await expect(page.getByText("At least 3 characters")).toBeVisible()
    await expect(page.getByText("At least 8 characters")).toBeVisible()
  })

  test("reports a duplicate email from the server as a toast", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("e2e-duplicate")
    await request.post("/api/auth/signup", {
      data: { name: "Existing User", email, password: TEST_PASSWORD },
    })

    await page.goto("/signup")
    await page.getByLabel("Name").fill("Existing User")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Create account" }).click()

    await expect(
      page.getByText("An account with this email already exists")
    ).toBeVisible()
  })
})

test.describe("Verify email", () => {
  test("explains a link with no token and offers a new one", async ({
    page,
  }) => {
    await page.goto("/verify-email")

    await expect(page.getByText("Nothing to verify")).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Send a new link" })
    ).toBeVisible()
  })

  test("handles an already-used link and offers a resend", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("e2e-reused")
    await request.post("/api/auth/signup", {
      data: { name: "Reuse User", email, password: TEST_PASSWORD },
    })
    const token = await waitForVerificationToken(request, email)

    // Burn the token, then try it a second time.
    await page.goto(`/verify-email?token=${token}`)
    await page.waitForURL("**/orders")

    await page.context().clearCookies()
    await page.goto(`/verify-email?token=${token}`)

    await expect(
      page.getByText(/expired or has already been used/i)
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Send a new link" })
    ).toBeVisible()
  })

  test("rejects a malformed token without crashing", async ({ page }) => {
    await page.goto("/verify-email?token=too-short")

    await expect(page.getByText(/looks incomplete/i)).toBeVisible()
  })
})
