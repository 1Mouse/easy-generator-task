import { INestApplication, ValidationPipe } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

// The auth controller is rate limited to 10 requests / 60s. Nest's throttler
// keys per handler *and* per client, which is why the other e2e files never
// trip it (they spread ~31 requests across seven endpoints). This file hammers
// a single endpoint, so it lives on its own: a shared app instance would leak
// exhausted buckets into unrelated tests.
const LIMIT = 10

describe("Throttler (e2e)", () => {
  let app: INestApplication
  let mongod: MongoMemoryServer

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
    process.env.MONGODB_URI = mongod.getUri()
    process.env.JWT_ACCESS_SECRET ??= "test-access-secret"
    process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret"
    // Pin the limit this suite asserts against rather than inheriting whatever
    // the deployment default happens to be.
    process.env.THROTTLE_LIMIT = String(LIMIT)
    process.env.THROTTLE_TTL_MS = "60000"

    const { AppModule } = await import("../src/app.module.js")
    const { MailService } = await import("../src/mail/mail.service.js")

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue({ sendMail: vi.fn().mockResolvedValue(undefined) })
      .compile()

    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix("api")
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    )
    await app.init()
  }, 60_000)

  afterAll(async () => {
    await app.close()
    await mongoose.disconnect()
    await mongod.stop()
  })

  it("rate limits the auth controller once the per-window limit is exceeded", async () => {
    const statuses: number[] = []
    for (let i = 0; i < LIMIT + 3; i++) {
      const response = await request(app.getHttpServer())
        .post("/api/auth/signin")
        .send({ email: "nobody@example.com", password: "Str0ng!Pass" })
      statuses.push(response.status)
    }

    // Credentials are deliberately wrong, so anything that gets through is a
    // 401 — the point is that the tail turns into 429s.
    expect(statuses.slice(0, LIMIT)).toEqual(Array(LIMIT).fill(401))
    expect(statuses.slice(LIMIT)).toEqual(
      Array(statuses.length - LIMIT).fill(429)
    )
  })

  it("does not rate limit unguarded routes", async () => {
    const statuses: number[] = []
    for (let i = 0; i < LIMIT + 3; i++) {
      const response = await request(app.getHttpServer()).get("/api/health")
      statuses.push(response.status)
    }

    expect(statuses.every((status) => status === 200)).toBe(true)
  })
})
