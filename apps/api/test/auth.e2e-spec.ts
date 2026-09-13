import { INestApplication, ValidationPipe } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

describe("Auth (e2e)", () => {
  let app: INestApplication
  let mongod: MongoMemoryServer
  let mockMailService: { sendMail: ReturnType<typeof vi.fn> }

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
    process.env.MONGODB_URI = mongod.getUri()
    process.env.JWT_ACCESS_SECRET ??= "test-access-secret"
    process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret"
    // This suite exercises auth behaviour, not rate limiting — keep the
    // limiter out of the way so unrelated tests can't trip it.
    process.env.THROTTLE_LIMIT = "1000"

    const { AppModule } = await import("../src/app.module.js")
    const { MailService } = await import("../src/mail/mail.service.js")

    mockMailService = { sendMail: vi.fn().mockResolvedValue(undefined) }

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mockMailService)
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
  })

  afterAll(async () => {
    await app.close()
    await mongoose.disconnect()
    await mongod.stop()
  })

  function extractTokenForEmail(email: string): string {
    const calls = mockMailService.sendMail.mock.calls as [
      { to: string; text: string },
    ][]
    const match = [...calls].reverse().find(([arg]) => arg.to === email)
    const token = match?.[0].text.match(/[?&]token=([^&\s]+)/)?.[1]
    if (!token) {
      throw new Error(`no verification token captured for ${email}`)
    }
    return token
  }

  const validSignUp = {
    email: "jane@example.com",
    name: "Jane Doe",
    password: "Str0ng!Pass",
  }

  it("signs up with valid fields, sends a verification email, and returns no token", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .send(validSignUp)

    expect(response.status).toBe(201)
    expect(response.body.accessToken).toBeUndefined()
    expect(response.body.user).toMatchObject({
      email: validSignUp.email,
      name: validSignUp.name,
    })
    expect(mockMailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: validSignUp.email })
    )
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

  it("rejects sign in before the email is verified", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/signin")
      .send({ email: validSignUp.email, password: validSignUp.password })

    expect(response.status).toBe(403)
    expect(response.body.code).toBe("EMAIL_NOT_VERIFIED")
  })

  let verificationToken: string

  it("verifies the email and returns the user with an access and refresh token", async () => {
    verificationToken = extractTokenForEmail(validSignUp.email)

    const response = await request(app.getHttpServer())
      .post("/api/auth/verify-email")
      .send({ token: verificationToken })

    expect(response.status).toBe(200)
    expect(typeof response.body.accessToken).toBe("string")
    expect(typeof response.body.refreshToken).toBe("string")
    expect(response.body.user).toMatchObject({
      email: validSignUp.email,
      name: validSignUp.name,
    })
    expect(response.body.user.id).toEqual(expect.any(String))
  })

  it("rejects reusing the same verification token", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/verify-email")
      .send({ token: verificationToken })

    expect(response.status).toBe(401)
    expect(response.body.code).toBe("INVALID_EMAIL_VERIFICATION_TOKEN")
  })

  it("rejects an unrecognized verification token", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/verify-email")
      .send({ token: "a".repeat(64) })

    expect(response.status).toBe(401)
    expect(response.body.code).toBe("INVALID_EMAIL_VERIFICATION_TOKEN")
  })

  it("signs in with valid credentials once verified", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/signin")
      .send({ email: validSignUp.email, password: validSignUp.password })

    expect(response.status).toBe(200)
    expect(typeof response.body.accessToken).toBe("string")
    expect(typeof response.body.refreshToken).toBe("string")
    expect(response.body.user).toMatchObject({
      email: validSignUp.email,
      name: validSignUp.name,
    })
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

  describe("resend verification email", () => {
    const unverifiedEmail = "unverified@example.com"

    it("sends a new email for a still-unverified account", async () => {
      await request(app.getHttpServer()).post("/api/auth/signup").send({
        email: unverifiedEmail,
        name: "Unverified User",
        password: "Str0ng!Pass",
      })
      mockMailService.sendMail.mockClear()

      const response = await request(app.getHttpServer())
        .post("/api/auth/resend-verification-email")
        .send({ email: unverifiedEmail })

      expect(response.status).toBe(200)
      expect(mockMailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: unverifiedEmail })
      )
    })

    it("sends a token that actually completes verification", async () => {
      const resendEmail = "resend-then-verify@example.com"
      await request(app.getHttpServer()).post("/api/auth/signup").send({
        email: resendEmail,
        name: "Resend Verify",
        password: "Str0ng!Pass",
      })

      mockMailService.sendMail.mockClear()
      await request(app.getHttpServer())
        .post("/api/auth/resend-verification-email")
        .send({ email: resendEmail })

      const response = await request(app.getHttpServer())
        .post("/api/auth/verify-email")
        .send({ token: extractTokenForEmail(resendEmail) })

      expect(response.status).toBe(200)
      expect(typeof response.body.accessToken).toBe("string")
      expect(response.body.user.email).toBe(resendEmail)
    })

    it("returns the identical generic message for a nonexistent email and an already-verified email", async () => {
      const nonexistentResponse = await request(app.getHttpServer())
        .post("/api/auth/resend-verification-email")
        .send({ email: "does-not-exist@example.com" })

      const alreadyVerifiedResponse = await request(app.getHttpServer())
        .post("/api/auth/resend-verification-email")
        .send({ email: validSignUp.email })

      expect(nonexistentResponse.status).toBe(200)
      expect(alreadyVerifiedResponse.status).toBe(200)
      expect(nonexistentResponse.body).toEqual(alreadyVerifiedResponse.body)
    })
  })

  // The schema lowercases `email` on write, so every lookup path has to agree
  // on casing or users get duplicate accounts / can't sign back in.
  describe("email casing", () => {
    const mixedCase = "MixedCase@Example.COM"
    const lowered = mixedCase.toLowerCase()

    it("stores the address lowercased on signup", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/auth/signup")
        .send({ email: mixedCase, name: "Mixed Case", password: "Str0ng!Pass" })

      expect(response.status).toBe(201)
      expect(response.body.user.email).toBe(lowered)
    })

    it("treats a differently-cased address as a duplicate", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/auth/signup")
        .send({ email: lowered, name: "Mixed Case", password: "Str0ng!Pass" })

      expect(response.status).toBe(409)
    })

    it("verifies and signs in regardless of the casing used", async () => {
      const verify = await request(app.getHttpServer())
        .post("/api/auth/verify-email")
        .send({ token: extractTokenForEmail(lowered) })
      expect(verify.status).toBe(200)

      const response = await request(app.getHttpServer())
        .post("/api/auth/signin")
        .send({ email: "MIXEDCASE@example.com", password: "Str0ng!Pass" })

      expect(response.status).toBe(200)
      expect(response.body.user.email).toBe(lowered)
    })
  })

  describe("refresh and logout", () => {
    async function signInFresh() {
      const response = await request(app.getHttpServer())
        .post("/api/auth/signin")
        .send({ email: validSignUp.email, password: validSignUp.password })
      return response.body as {
        accessToken: string
        refreshToken: string
        user: { id: string }
      }
    }

    it("exchanges a refresh token for a new access and refresh token", async () => {
      const session = await signInFresh()

      const response = await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .send({ refreshToken: session.refreshToken })

      expect(response.status).toBe(200)
      expect(typeof response.body.accessToken).toBe("string")
      expect(typeof response.body.refreshToken).toBe("string")
      expect(response.body.refreshToken).not.toBe(session.refreshToken)
      expect(response.body.user).toMatchObject({ email: validSignUp.email })
    })

    it("issues an access token from refresh that works on a protected route", async () => {
      const session = await signInFresh()

      const refreshed = await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .send({ refreshToken: session.refreshToken })

      const me = await request(app.getHttpServer())
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${refreshed.body.accessToken}`)

      expect(me.status).toBe(200)
      expect(me.body.email).toBe(validSignUp.email)
    })

    it("rejects reusing a refresh token that was already rotated", async () => {
      const session = await signInFresh()

      await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .send({ refreshToken: session.refreshToken })

      const replay = await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .send({ refreshToken: session.refreshToken })

      expect(replay.status).toBe(401)
      expect(replay.body.code).toBe("INVALID_REFRESH_TOKEN")
    })

    // The refresh guard runs before the ValidationPipe, so a malformed token is
    // rejected as unauthorized rather than as a bad request body.
    it("rejects a malformed refresh token", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .send({ refreshToken: "a.b.c" })

      expect(response.status).toBe(401)
    })

    it("rejects using an access token as a refresh token", async () => {
      const session = await signInFresh()

      const response = await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .send({ refreshToken: session.accessToken })

      expect(response.status).toBe(401)
    })

    it("revokes the refresh token on logout so it can no longer be exchanged", async () => {
      const session = await signInFresh()

      const logout = await request(app.getHttpServer())
        .post("/api/auth/logout")
        .send({ refreshToken: session.refreshToken })

      expect(logout.status).toBe(200)

      const afterLogout = await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .send({ refreshToken: session.refreshToken })

      expect(afterLogout.status).toBe(401)
      expect(afterLogout.body.code).toBe("INVALID_REFRESH_TOKEN")
    })
  })
})
