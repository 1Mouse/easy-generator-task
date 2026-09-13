import { Test } from "@nestjs/testing"
import { JwtService } from "@nestjs/jwt"
import { ConflictException, UnauthorizedException } from "@nestjs/common"
import * as bcrypt from "bcryptjs"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { UsersService } from "../users/users.service.js"
import { AuthService } from "./auth.service.js"

describe("AuthService", () => {
  let authService: AuthService
  let usersService: {
    findByEmail: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  let jwtService: { sign: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    usersService = { findByEmail: vi.fn(), create: vi.fn() }
    jwtService = { sign: vi.fn().mockReturnValue("signed.jwt.token") }

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile()

    authService = module.get(AuthService)
  })

  describe("signUp", () => {
    it("throws ConflictException when the email is already registered", async () => {
      usersService.findByEmail.mockResolvedValue({
        id: "1",
        email: "jane@example.com",
      })

      await expect(
        authService.signUp({
          email: "jane@example.com",
          name: "Jane",
          password: "Str0ng!Pass",
        })
      ).rejects.toBeInstanceOf(ConflictException)

      expect(usersService.create).not.toHaveBeenCalled()
    })

    it("hashes the password, creates the user, and returns a signed token", async () => {
      usersService.findByEmail.mockResolvedValue(null)
      usersService.create.mockResolvedValue({
        id: "1",
        email: "jane@example.com",
      })

      const result = await authService.signUp({
        email: "jane@example.com",
        name: "Jane",
        password: "Str0ng!Pass",
      })

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: "jane@example.com", name: "Jane" })
      )
      const createdArg = usersService.create.mock.calls[0]![0] as {
        passwordHash: string
      }
      expect(createdArg.passwordHash).not.toBe("Str0ng!Pass")
      expect(await bcrypt.compare("Str0ng!Pass", createdArg.passwordHash)).toBe(
        true
      )
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: "1",
        email: "jane@example.com",
      })
      expect(result).toEqual({ accessToken: "signed.jwt.token" })
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
        id: "1",
        email: "jane@example.com",
        passwordHash,
      })

      await expect(
        authService.signIn({
          email: "jane@example.com",
          password: "WrongPass1!",
        })
      ).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it("returns a signed token when credentials are valid", async () => {
      const passwordHash = await bcrypt.hash("Str0ng!Pass", 10)
      usersService.findByEmail.mockResolvedValue({
        id: "1",
        email: "jane@example.com",
        passwordHash,
      })

      const result = await authService.signIn({
        email: "jane@example.com",
        password: "Str0ng!Pass",
      })

      expect(result).toEqual({ accessToken: "signed.jwt.token" })
    })
  })
})
