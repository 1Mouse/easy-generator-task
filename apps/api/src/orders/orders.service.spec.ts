import { Test } from "@nestjs/testing"
import { getModelToken } from "@nestjs/mongoose"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Order } from "./schemas/order.schema.js"
import { OrdersService } from "./orders.service.js"

function createFluentQueryMock(result: unknown) {
  const query = {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(result),
  }
  return query
}

describe("OrdersService", () => {
  let ordersService: OrdersService
  let orderModel: {
    find: ReturnType<typeof vi.fn>
    countDocuments: ReturnType<typeof vi.fn>
  }

  beforeEach(async () => {
    orderModel = {
      find: vi.fn(),
      countDocuments: vi
        .fn()
        .mockReturnValue({ exec: vi.fn().mockResolvedValue(0) }),
    }

    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: orderModel },
      ],
    }).compile()

    ordersService = module.get(OrdersService)
  })

  it("builds an empty filter and default sort/pagination when no query params are given", async () => {
    orderModel.find.mockReturnValue(createFluentQueryMock([]))

    const result = await ordersService.list({
      page: 1,
      pageSize: 10,
      sort: "desc",
    })

    expect(orderModel.find).toHaveBeenCalledWith({}, { _id: 0 })
    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    })
  })

  it("filters by status and a case-insensitive search term across customerName/id", async () => {
    orderModel.find.mockReturnValue(createFluentQueryMock([]))
    orderModel.countDocuments.mockReturnValue({
      exec: vi.fn().mockResolvedValue(0),
    })

    await ordersService.list({
      page: 1,
      pageSize: 10,
      sort: "desc",
      status: "New",
      search: "alice",
    })

    const [filter] = orderModel.find.mock.calls[0]!
    expect(filter.status).toBe("New")
    expect(filter.$or).toEqual([
      { customerName: expect.any(RegExp) },
      { id: expect.any(RegExp) },
    ])
  })

  it("clamps pageSize to the maximum and page to the last available page", async () => {
    orderModel.find.mockReturnValue(createFluentQueryMock([]))
    orderModel.countDocuments.mockReturnValue({
      exec: vi.fn().mockResolvedValue(5),
    })

    const result = await ordersService.list({
      page: 99,
      pageSize: 500,
      sort: "desc",
    })

    expect(result.pageSize).toBe(50)
    expect(result.totalPages).toBe(1)
    expect(result.page).toBe(1)
  })

  it("sorts ascending or descending by createdAt based on the sort param", async () => {
    const fluent = createFluentQueryMock([])
    orderModel.find.mockReturnValue(fluent)

    await ordersService.list({ page: 1, pageSize: 10, sort: "asc" })

    expect(fluent.sort).toHaveBeenCalledWith({ createdAt: 1 })
  })
})
