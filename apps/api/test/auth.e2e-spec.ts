import { INestApplication, ValidationPipe } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

describe("Auth (e2e)", () => {
  let app: INestApplication
  let mongod: MongoMemoryServer

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
    process.env.MONGODB_URI = mongod.getUri()
    process.env.JWT_SECRET ??= "test-secret"

    const { AppModule } = await import("../src/app.module.js")

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
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
  })

  afterAll(async () => {
    await app.close()
    await mongoose.disconnect()
    await mongod.stop()
  })

  const validSignUp = {
    email: "jane@example.com",
    name: "Jane Doe",
    password: "Str0ng!Pass",
  }

  it("signs up with valid fields and returns an access token", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .send(validSignUp)

    expect(response.status).toBe(201)
    expect(typeof response.body.accessToken).toBe("string")
  })

  it("rejects sign up with a duplicate email", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .send(validSignUp)

    expect(response.status).toBe(409)
  })

  it("rejects sign up with an invalid email", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .send({ ...validSignUp, email: "not-an-email" })

    expect(response.status).toBe(400)
  })

  it("rejects sign up with a name shorter than 3 characters", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .send({ ...validSignUp, email: "short@example.com", name: "Jo" })

    expect(response.status).toBe(400)
  })

  it("rejects sign up with a password missing a digit", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .send({
        ...validSignUp,
        email: "nodigit@example.com",
        password: "NoDigits!",
      })

    expect(response.status).toBe(400)
  })

  it("rejects sign up with a password missing a special character", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .send({
        ...validSignUp,
        email: "nospecial@example.com",
        password: "NoSpecial1",
      })

    expect(response.status).toBe(400)
  })

  it("rejects sign up with a password shorter than 8 characters", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .send({ ...validSignUp, email: "short2@example.com", password: "Sh0rt!" })

    expect(response.status).toBe(400)
  })

  it("signs in with valid credentials and returns an access token", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/signin")
      .send({ email: validSignUp.email, password: validSignUp.password })

    expect(response.status).toBe(200)
    expect(typeof response.body.accessToken).toBe("string")
  })

  it("rejects sign in with a wrong password", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/signin")
      .send({ email: validSignUp.email, password: "WrongPass1!" })

    expect(response.status).toBe(401)
  })

  it("rejects sign in for an email that doesn't exist", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/signin")
      .send({ email: "nobody@example.com", password: "Str0ng!Pass" })

    expect(response.status).toBe(401)
  })

  it("returns the current user on GET /api/auth/me with a valid token", async () => {
    const signIn = await request(app.getHttpServer())
      .post("/api/auth/signin")
      .send({ email: validSignUp.email, password: validSignUp.password })

    const response = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${signIn.body.accessToken}`)

    expect(response.status).toBe(200)
    expect(response.body.email).toBe(validSignUp.email)
  })

  it("rejects GET /api/auth/me without a token", async () => {
    const response = await request(app.getHttpServer()).get("/api/auth/me")

    expect(response.status).toBe(401)
  })
})
