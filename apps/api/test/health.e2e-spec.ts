import { INestApplication, ValidationPipe } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

describe("Health (e2e)", () => {
  let app: INestApplication
  let mongod: MongoMemoryServer

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
    process.env.MONGODB_URI = mongod.getUri()
    process.env.JWT_SECRET ??= "test-secret"

    // Deferred until after MONGODB_URI is set — env.validation.ts reads
    // process.env eagerly the moment this module (and its AppModule chain)
    // is first imported.
    const { AppModule } = await import("../src/app.module.js")

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix("api")
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
  })

  afterAll(async () => {
    await app.close()
    await mongoose.disconnect()
    await mongod.stop()
  })

  it("GET /api/health returns 200 with no Authorization header", async () => {
    const response = await request(app.getHttpServer()).get("/api/health")

    expect(response.status).toBe(200)
    expect(response.body.status).toBe("ok")
  })
})
