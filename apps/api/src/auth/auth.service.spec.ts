import { Test } from "@nestjs/testing"
import { JwtService } from "@nestjs/jwt"
import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common"
import * as bcrypt from "bcryptjs"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { UsersService } from "../users/users.service.js"
import { AuthService } from "./auth.service.js"
import { EmailVerificationService } from "./email-verification.service.js"
import { RefreshTokenService } from "./refresh-token.service.js"

const VERIFIED_USER = {
  id: "1",
  email: "jane@example.com",
  name: "Jane",
  emailVerifiedAt: new Date(),
}

const EXPECTED_SESSION = {
  user: { id: "1", email: "jane@example.com", name: "Jane" },
  accessToken: "signed.access.token",
  refreshToken: "signed.refresh.token",
}

describe("AuthService", () => {
  let authService: AuthService
  let usersService: {
    findByEmail: ReturnType<typeof vi.fn>
    findById: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    markEmailVerified: ReturnType<typeof vi.fn>
  }
  let jwtService: { signAsync: ReturnType<typeof vi.fn> }
  let emailVerificationService: {
    createAndSendToken: ReturnType<typeof vi.fn>
    consumeToken: ReturnType<typeof vi.fn>
  }
  let refreshTokenService: {
    issue: ReturnType<typeof vi.fn>
    consume: ReturnType<typeof vi.fn>
    revoke: ReturnType<typeof vi.fn>
  }

  beforeEach(async () => {
    usersService = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      markEmailVerified: vi.fn(),
    }
    jwtService = { signAsync: vi.fn().mockResolvedValue("signed.access.token") }
    emailVerificationService = {
      createAndSendToken: vi.fn(),
      consumeToken: vi.fn(),
    }
    refreshTokenService = {
      issue: vi.fn().mockResolvedValue("signed.refresh.token"),
      consume: vi.fn(),
      revoke: vi.fn(),
    }

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: EmailVerificationService,
          useValue: emailVerificationService,
        },
        { provide: RefreshTokenService, useValue: refreshTokenService },
      ],
    }).compile()

    authService = module.get(AuthService)
  })

  describe("signUp", () => {
    it("throws ConflictException when the email is already registered", async () => {
      usersService.findByEmail.mockResolvedValue(VERIFIED_USER)

      await expect(
        authService.signUp({
          email: "jane@example.com",
          name: "Jane",
          password: "Str0ng!Pass",
        })
      ).rejects.toBeInstanceOf(ConflictException)

      expect(usersService.create).not.toHaveBeenCalled()
    })

    it("hashes the password, sends a verification email, and issues no tokens", async () => {
      usersService.findByEmail.mockResolvedValue(null)
      usersService.create.mockResolvedValue(VERIFIED_USER)

      const result = await authService.signUp({
        email: "jane@example.com",
        name: "Jane",
        password: "Str0ng!Pass",
      })

      const createdArg = usersService.create.mock.calls[0]![0] as {
        passwordHash: string
      }
      expect(createdArg.passwordHash).not.toBe("Str0ng!Pass")
      expect(await bcrypt.compare("Str0ng!Pass", createdArg.passwordHash)).toBe(
        true
      )
      expect(emailVerificationService.createAndSendToken).toHaveBeenCalledWith({
        id: "1",
        email: "jane@example.com",
      })
      expect(result).toEqual({
        user: { id: "1", email: "jane@example.com", name: "Jane" },
        message: expect.any(String),
      })
      expect(jwtService.signAsync).not.toHaveBeenCalled()
      expect(refreshTokenService.issue).not.toHaveBeenCalled()
    })
  })

  describe("signIn", () => {
    it("throws UnauthorizedException when the user does not exist", async () => {
      usersService.findByEmail.mockResolvedValue(null)

      await expect(
        authService.signIn({
          email: "missing@example.com",
          password: "whatever1!",
        })
      ).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it("throws UnauthorizedException when the password does not match", async () => {
      const passwordHash = await bcrypt.hash("Str0ng!Pass", 10)
      usersService.findByEmail.mockResolvedValue({
        ...VERIFIED_USER,
        passwordHash,
      })

      await expect(
        authService.signIn({
          email: "jane@example.com",
          password: "WrongPass1!",
        })
      ).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it("throws ForbiddenException with EMAIL_NOT_VERIFIED when the account is unverified", async () => {
      const passwordHash = await bcrypt.hash("Str0ng!Pass", 10)
      usersService.findByEmail.mockResolvedValue({
        ...VERIFIED_USER,
        passwordHash,
        emailVerifiedAt: null,
      })

      const error: unknown = await authService
        .signIn({ email: "jane@example.com", password: "Str0ng!Pass" })
        .catch((err: unknown) => err)

      expect(error).toBeInstanceOf(ForbiddenException)
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        code: "EMAIL_NOT_VERIFIED",
      })
    })

    it("returns the user plus an access and refresh token when credentials are valid", async () => {
      const passwordHash = await bcrypt.hash("Str0ng!Pass", 10)
      usersService.findByEmail.mockResolvedValue({
        ...VERIFIED_USER,
        passwordHash,
      })

      const result = await authService.signIn({
        email: "jane@example.com",
        password: "Str0ng!Pass",
      })

      expect(refreshTokenService.issue).toHaveBeenCalledWith({
        id: "1",
        email: "jane@example.com",
      })
      expect(result).toEqual(EXPECTED_SESSION)
    })
  })

  describe("verifyEmail", () => {
    it("marks the user verified and returns a full session", async () => {
      emailVerificationService.consumeToken.mockResolvedValue({ userId: "1" })
      usersService.markEmailVerified.mockResolvedValue(VERIFIED_USER)

      const result = await authService.verifyEmail({ token: "raw-token" })

      expect(emailVerificationService.consumeToken).toHaveBeenCalledWith(
        "raw-token"
      )
      expect(usersService.markEmailVerified).toHaveBeenCalledWith("1")
      expect(result).toEqual(EXPECTED_SESSION)
    })

    it("propagates the exception when the token is invalid", async () => {
      emailVerificationService.consumeToken.mockRejectedValue(
        new UnauthorizedException({ code: "INVALID_EMAIL_VERIFICATION_TOKEN" })
      )

      await expect(
        authService.verifyEmail({ token: "bad-token" })
      ).rejects.toBeInstanceOf(UnauthorizedException)
    })
  })

  describe("refresh", () => {
    it("consumes the presented token and returns a brand new session", async () => {
      usersService.findById.mockResolvedValue(VERIFIED_USER)

      const result = await authService.refresh("1", "old.refresh.token")

      expect(refreshTokenService.consume).toHaveBeenCalledWith(
        "1",
        "old.refresh.token"
      )
      expect(refreshTokenService.issue).toHaveBeenCalledWith({
        id: "1",
        email: "jane@example.com",
      })
      expect(result).toEqual(EXPECTED_SESSION)
    })

    it("propagates the exception when the token was already used or revoked", async () => {
      refreshTokenService.consume.mockRejectedValue(
        new UnauthorizedException({ code: "INVALID_REFRESH_TOKEN" })
      )

      await expect(
        authService.refresh("1", "replayed.token")
      ).rejects.toBeInstanceOf(UnauthorizedException)
      expect(refreshTokenService.issue).not.toHaveBeenCalled()
    })

    it("throws when the token is valid but the user no longer exists", async () => {
      usersService.findById.mockResolvedValue(null)

      await expect(
        authService.refresh("1", "orphaned.token")
      ).rejects.toBeInstanceOf(UnauthorizedException)
    })
  })

  describe("logout", () => {
    it("revokes the presented refresh token", async () => {
      const result = await authService.logout({ refreshToken: "some.token" })

      expect(refreshTokenService.revoke).toHaveBeenCalledWith("some.token")
      expect(result).toEqual({ message: expect.any(String) })
    })
  })

  describe("resendVerificationEmail", () => {
    const GENERIC_MESSAGE = { message: expect.any(String) }

    it("sends a new token when the user exists and is unverified", async () => {
      usersService.findByEmail.mockResolvedValue({
        ...VERIFIED_USER,
        emailVerifiedAt: null,
      })

      const result = await authService.resendVerificationEmail({
        email: "jane@example.com",
      })

      expect(emailVerificationService.createAndSendToken).toHaveBeenCalledWith({
        id: "1",
        email: "jane@example.com",
      })
      expect(result).toEqual(GENERIC_MESSAGE)
    })

    it("returns the generic message without sending when the user does not exist", async () => {
      usersService.findByEmail.mockResolvedValue(null)

      const result = await authService.resendVerificationEmail({
        email: "nobody@example.com",
      })

      expect(emailVerificationService.createAndSendToken).not.toHaveBeenCalled()
      expect(result).toEqual(GENERIC_MESSAGE)
    })

    it("returns the generic message without sending when the user is already verified", async () => {
      usersService.findByEmail.mockResolvedValue(VERIFIED_USER)

      const result = await authService.resendVerificationEmail({
        email: "jane@example.com",
      })

      expect(emailVerificationService.createAndSendToken).not.toHaveBeenCalled()
      expect(result).toEqual(GENERIC_MESSAGE)
    })
  })
})
