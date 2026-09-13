import { test, expect } from "@playwright/test"

test.describe("Orders page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/orders")
  })

  test("loads and displays orders table", async ({ page }) => {
    await expect(page.getByTestId("page-heading")).toBeVisible()
    await expect(page.getByRole("table")).toBeVisible()

    // Should have at least one row in the table body
    const rows = page.getByTestId(/^data-table-row-/)
    await expect(rows.first()).toBeVisible()
  })

  test("search filters results", async ({ page }) => {
    const searchInput = page.getByTestId("search-input")
    await searchInput.fill("nonexistent-order-xyz")

    // Wait for the debounced URL update
    await page.waitForURL(/search=nonexistent-order-xyz/)

    // Should show empty state
    await expect(page.getByTestId("empty-state")).toBeVisible()
  })

  test("search clears and shows all results again", async ({ page }) => {
    const searchInput = page.getByTestId("search-input")

    await searchInput.fill("nonexistent-order-xyz")
    await page.waitForURL(/search=nonexistent-order-xyz/)
    await expect(page.getByTestId("empty-state")).toBeVisible()

    await searchInput.clear()
    await page.waitForURL((url) => !url.searchParams.has("search"))

    await expect(page.getByRole("table")).toBeVisible()
  })

  test("status filter narrows results", async ({ page }) => {
    // Get initial row count
    const initialRows = await page.getByTestId(/^data-table-row-/).count()

    // Select "New" status filter
    await page.getByTestId("filter-status").click()
    await page.getByRole("option", { name: "New" }).click()

    await page.waitForURL(/status=New/)

    // Filtered rows should be fewer or equal
    const filteredRows = await page.getByTestId(/^data-table-row-/).count()
    expect(filteredRows).toBeLessThanOrEqual(initialRows)

    // All visible status badges should be "New"
    const badges = page.getByTestId("order-status-badge")
    const badgeCount = await badges.count()
    for (let i = 0; i < badgeCount; i++) {
      await expect(badges.nth(i)).toHaveText("New")
    }
  })

  test("sort toggles between newest and oldest first", async ({ page }) => {
    const sortButton = page.getByTestId("sort-button")

    // Default sort is "Newest first"
    await expect(sortButton).toBeVisible()
    await expect(sortButton).toHaveText(/Newest first/)

    // Click to toggle
    await sortButton.click()
    await expect(sortButton).toHaveText(/Oldest first/)

    // Click again to go back
    await sortButton.click()
    await expect(sortButton).toHaveText(/Newest first/)
  })

  test("pagination navigates between pages", async ({ page }) => {
    // Should show pagination info
    const paginationInfo = page.getByTestId("pagination-info")
    await expect(paginationInfo).toBeVisible()

    // Click page 2
    const page2Button = page.getByTestId("pagination-page-2")
    if (await page2Button.isVisible()) {
      await page2Button.click()
      await page.waitForURL(/page=2/)
      await expect(paginationInfo).toBeVisible()
    }
  })
})
