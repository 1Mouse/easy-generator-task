import { Test } from "@nestjs/testing"
import { getModelToken, MongooseModule } from "@nestjs/mongoose"
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose, { Model } from "mongoose"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { OrdersModule } from "./orders.module.js"
import { OrdersService } from "./orders.service.js"
import { Order, OrderDocument } from "./schemas/order.schema.js"

const SEED: Order[] = [
  {
    id: "ORD-0001",
    customerName: "Alice Johnson",
    status: "New",
    items: ["Bananas"],
    createdAt: "2026-01-03T00:00:00.000Z",
  },
  {
    id: "ORD-0002",
    customerName: "Bob Smith",
    status: "Delivered",
    items: ["Bread"],
    createdAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "ORD-0003",
    customerName: "Alice Johnson",
    status: "Delivered",
    items: ["Milk"],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
]

describe("OrdersService (integration)", () => {
  let mongod: MongoMemoryServer
  let ordersService: OrdersService

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()

    const module = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongod.getUri()), OrdersModule],
    }).compile()

    ordersService = module.get(OrdersService)

    const orderModel = module.get<Model<OrderDocument>>(
      getModelToken(Order.name)
    )
    await orderModel.insertMany(SEED)
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await mongod.stop()
  })

  it("paginates results sorted by createdAt descending by default", async () => {
    const result = await ordersService.list({
      page: 1,
      pageSize: 2,
      sort: "desc",
    })

    expect(result.total).toBe(3)
    expect(result.totalPages).toBe(2)
    expect(result.data.map((o) => o.id)).toEqual(["ORD-0001", "ORD-0002"])
  })

  it("filters by status", async () => {
    const result = await ordersService.list({
      page: 1,
      pageSize: 10,
      sort: "desc",
      status: "Delivered",
    })

    expect(result.total).toBe(2)
    expect(result.data.every((o) => o.status === "Delivered")).toBe(true)
  })

  it("searches by customer name case-insensitively", async () => {
    const result = await ordersService.list({
      page: 1,
      pageSize: 10,
      sort: "desc",
      search: "alice",
    })

    expect(result.total).toBe(2)
    expect(result.data.every((o) => o.customerName === "Alice Johnson")).toBe(
      true
    )
  })

  it("searches by order id", async () => {
    const result = await ordersService.list({
      page: 1,
      pageSize: 10,
      sort: "desc",
      search: "ORD-0002",
    })

    expect(result.total).toBe(1)
    expect(result.data[0]?.id).toBe("ORD-0002")
  })
})
