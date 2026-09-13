import { INestApplication, ValidationPipe } from "@nestjs/common"
import { getModelToken } from "@nestjs/mongoose"
import { Test } from "@nestjs/testing"
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose, { Model } from "mongoose"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

describe("Orders (e2e)", () => {
  let app: INestApplication
  let mongod: MongoMemoryServer
  let accessToken: string

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
    process.env.MONGODB_URI = mongod.getUri()
    process.env.JWT_SECRET ??= "test-secret"

    const { AppModule } = await import("../src/app.module.js")
    const { Order } = await import("../src/orders/schemas/order.schema.js")

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix("api")
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()

    type OrderDoc = {
      id: string
      customerName: string
      status: string
      items: string[]
      createdAt: string
    }
    const orderModel = moduleFixture.get<Model<OrderDoc>>(
      getModelToken(Order.name)
    )
    await orderModel.insertMany([
      {
        id: "ORD-0001",
        customerName: "Alice Johnson",
        status: "New",
        items: ["Bananas"],
        createdAt: "2026-01-02T00:00:00.000Z",
      },
      {
        id: "ORD-0002",
        customerName: "Bob Smith",
        status: "Delivered",
        items: ["Bread"],
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ])

    const signUp = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .send({
        email: "orders-user@example.com",
        name: "Orders User",
        password: "Str0ng!Pass",
      })
    accessToken = signUp.body.accessToken
  })

  afterAll(async () => {
    await app.close()
    await mongoose.disconnect()
    await mongod.stop()
  })

  it("rejects GET /api/orders without a token", async () => {
    const response = await request(app.getHttpServer()).get("/api/orders")

    expect(response.status).toBe(401)
  })

  it("rejects GET /api/orders with a malformed token", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/orders")
      .set("Authorization", "Bearer not-a-real-token")

    expect(response.status).toBe(401)
  })

  it("returns paginated orders with a valid token", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/orders?page=1&pageSize=1")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(response.status).toBe(200)
    expect(response.body.total).toBe(2)
    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0].id).toBe("ORD-0001")
  })

  it("filters orders by status", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/orders?status=Delivered")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(response.status).toBe(200)
    expect(response.body.total).toBe(1)
    expect(response.body.data[0].id).toBe("ORD-0002")
  })
})
