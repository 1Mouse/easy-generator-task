import { describe, it, expect } from "vitest"
import {
  normalizeOrderListQuery,
  DEFAULT_ORDER_PAGE,
  DEFAULT_ORDER_PAGE_SIZE,
  MAX_ORDER_PAGE_SIZE,
  type OrderListQuery,
} from "./query-state"

describe("normalizeOrderListQuery", () => {
  const defaults: OrderListQuery = {
    page: DEFAULT_ORDER_PAGE,
    pageSize: DEFAULT_ORDER_PAGE_SIZE,
    status: "",
    search: "",
    sort: "desc",
  }

  it("returns defaults as-is", () => {
    expect(normalizeOrderListQuery(defaults)).toEqual(defaults)
  })

  it("resets negative page to default", () => {
    const result = normalizeOrderListQuery({ ...defaults, page: -1 })
    expect(result.page).toBe(DEFAULT_ORDER_PAGE)
  })

  it("resets zero page to default", () => {
    const result = normalizeOrderListQuery({ ...defaults, page: 0 })
    expect(result.page).toBe(DEFAULT_ORDER_PAGE)
  })

  it("resets fractional page to default", () => {
    const result = normalizeOrderListQuery({ ...defaults, page: 1.5 })
    expect(result.page).toBe(DEFAULT_ORDER_PAGE)
  })

  it("clamps pageSize to MAX_ORDER_PAGE_SIZE", () => {
    const result = normalizeOrderListQuery({ ...defaults, pageSize: 999 })
    expect(result.pageSize).toBe(MAX_ORDER_PAGE_SIZE)
  })

  it("resets negative pageSize to default", () => {
    const result = normalizeOrderListQuery({ ...defaults, pageSize: -5 })
    expect(result.pageSize).toBe(DEFAULT_ORDER_PAGE_SIZE)
  })

  it("trims search whitespace", () => {
    const result = normalizeOrderListQuery({ ...defaults, search: "  hello  " })
    expect(result.search).toBe("hello")
  })

  it("preserves valid values unchanged", () => {
    const input = {
      ...defaults,
      page: 3,
      pageSize: 25,
      search: "test",
      status: "New" as const,
    }
    const result = normalizeOrderListQuery(input)
    expect(result).toEqual(input)
  })
})
