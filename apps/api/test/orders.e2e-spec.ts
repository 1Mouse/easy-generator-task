import { INestApplication, ValidationPipe } from "@nestjs/common"
import { getModelToken } from "@nestjs/mongoose"
import { Test } from "@nestjs/testing"
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose, { Model } from "mongoose"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

describe("Orders (e2e)", () => {
  let app: INestApplication
  let mongod: MongoMemoryServer
  let accessToken: string

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
    process.env.MONGODB_URI = mongod.getUri()
    process.env.JWT_ACCESS_SECRET ??= "test-access-secret"
    process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret"

    const { AppModule } = await import("../src/app.module.js")
    const { Order } = await import("../src/orders/schemas/order.schema.js")
    const { MailService } = await import("../src/mail/mail.service.js")

    const mockMailService = { sendMail: vi.fn().mockResolvedValue(undefined) }

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mockMailService)
      .compile()
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

    const ordersUserEmail = "orders-user@example.com"
    await request(app.getHttpServer()).post("/api/auth/signup").send({
      email: ordersUserEmail,
      name: "Orders User",
      password: "Str0ng!Pass",
    })

    const calls = mockMailService.sendMail.mock.calls as [
      { to: string; text: string },
    ][]
    const sentCall = calls.find(([arg]) => arg.to === ordersUserEmail)
    const verificationToken =
      sentCall?.[0].text.match(/[?&]token=([^&\s]+)/)?.[1]

    const verifyEmail = await request(app.getHttpServer())
      .post("/api/auth/verify-email")
      .send({ token: verificationToken })
    accessToken = verifyEmail.body.accessToken
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
