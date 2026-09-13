import { describe, it, expect } from "vitest"
import { listOrders } from "./list-orders"
import type { Order } from "../model"

const mockOrders: Order[] = [
  {
    id: "ord-1",
    customerName: "Alice Smith",
    status: "New",
    items: ["Widget"],
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ord-2",
    customerName: "Bob Jones",
    status: "Delivering",
    items: ["Gadget"],
    createdAt: "2025-01-02T00:00:00Z",
  },
  {
    id: "ord-3",
    customerName: "Charlie Brown",
    status: "New",
    items: ["Bolt"],
    createdAt: "2025-01-03T00:00:00Z",
  },
  {
    id: "ord-4",
    customerName: "Diana Prince",
    status: "Delivered",
    items: ["Shield"],
    createdAt: "2025-01-04T00:00:00Z",
  },
  {
    id: "ord-5",
    customerName: "Eve Adams",
    status: "Picking",
    items: ["Lamp"],
    createdAt: "2025-01-05T00:00:00Z",
  },
]

const defaults = {
  page: 1,
  pageSize: 10,
  status: "" as const,
  search: "",
  sort: "desc" as const,
}

describe("listOrders", () => {
  it("returns all orders when no filters applied", () => {
    const result = listOrders(defaults, mockOrders)
    expect(result.total).toBe(5)
    expect(result.data).toHaveLength(5)
  })

  it("sorts descending by default (newest first)", () => {
    const result = listOrders(defaults, mockOrders)
    expect(result.data[0]!.id).toBe("ord-5")
    expect(result.data[4]!.id).toBe("ord-1")
  })

  it("sorts ascending when specified", () => {
    const result = listOrders({ ...defaults, sort: "asc" }, mockOrders)
    expect(result.data[0]!.id).toBe("ord-1")
    expect(result.data[4]!.id).toBe("ord-5")
  })

  it("filters by status", () => {
    const result = listOrders({ ...defaults, status: "New" }, mockOrders)
    expect(result.total).toBe(2)
    expect(result.data.every((o) => o.status === "New")).toBe(true)
  })

  it("filters by search on customerName", () => {
    const result = listOrders({ ...defaults, search: "alice" }, mockOrders)
    expect(result.total).toBe(1)
    expect(result.data[0]!.customerName).toBe("Alice Smith")
  })

  it("filters by search on id", () => {
    const result = listOrders({ ...defaults, search: "ord-3" }, mockOrders)
    expect(result.total).toBe(1)
    expect(result.data[0]!.id).toBe("ord-3")
  })

  it("paginates correctly", () => {
    const result = listOrders({ ...defaults, pageSize: 2, page: 2 }, mockOrders)
    expect(result.data).toHaveLength(2)
    expect(result.page).toBe(2)
    expect(result.totalPages).toBe(3)
    expect(result.total).toBe(5)
  })

  it("clamps page to totalPages when page exceeds total", () => {
    const result = listOrders(
      { ...defaults, pageSize: 2, page: 99 },
      mockOrders
    )
    expect(result.page).toBe(3)
  })

  it("returns empty data with totalPages 1 when no matches", () => {
    const result = listOrders(
      { ...defaults, search: "nonexistent" },
      mockOrders
    )
    expect(result.data).toHaveLength(0)
    expect(result.total).toBe(0)
    expect(result.totalPages).toBe(1)
  })

  it("combines status filter and search", () => {
    const result = listOrders(
      { ...defaults, status: "New", search: "charlie" },
      mockOrders
    )
    expect(result.total).toBe(1)
    expect(result.data[0]!.id).toBe("ord-3")
  })
})
