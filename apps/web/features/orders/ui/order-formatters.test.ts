import { describe, it, expect } from "vitest"
import { formatOrderDate, formatOrderItemsSummary } from "./order-formatters"

describe("formatOrderDate", () => {
  it("formats an ISO date string to en-US locale", () => {
    expect(formatOrderDate("2025-01-15T10:30:00Z")).toBe("Jan 15, 2025")
  })

  it("formats a different date correctly", () => {
    expect(formatOrderDate("2024-12-01T00:00:00Z")).toBe("Dec 1, 2024")
  })
})

describe("formatOrderItemsSummary", () => {
  it("returns single item as-is", () => {
    expect(formatOrderItemsSummary(["Apple"])).toBe("Apple")
  })

  it("joins two items with comma", () => {
    expect(formatOrderItemsSummary(["Apple", "Banana"])).toBe("Apple, Banana")
  })

  it("truncates three items showing +1 more", () => {
    expect(formatOrderItemsSummary(["Apple", "Banana", "Cherry"])).toBe(
      "Apple, Banana +1 more"
    )
  })

  it("truncates many items showing correct count", () => {
    expect(
      formatOrderItemsSummary([
        "Apple",
        "Banana",
        "Cherry",
        "Date",
        "Elderberry",
      ])
    ).toBe("Apple, Banana +3 more")
  })

  it("handles empty array", () => {
    expect(formatOrderItemsSummary([])).toBe("")
  })
})
