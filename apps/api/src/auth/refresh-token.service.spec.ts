import { Test } from "@nestjs/testing"
import { getModelToken } from "@nestjs/mongoose"
import { JwtService } from "@nestjs/jwt"
import { UnauthorizedException } from "@nestjs/common"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RefreshTokenService } from "./refresh-token.service.js"
import { RefreshToken } from "./schemas/refresh-token.schema.js"
import { hashToken } from "./token.util.js"

const FUTURE_EXP = Math.floor(Date.now() / 1000) + 3600

describe("RefreshTokenService", () => {
  let service: RefreshTokenService
  let tokenModel: {
    create: ReturnType<typeof vi.fn>
    findOne: ReturnType<typeof vi.fn>
    updateOne: ReturnType<typeof vi.fn>
  }
  let jwtService: {
    signAsync: ReturnType<typeof vi.fn>
    decode: ReturnType<typeof vi.fn>
  }

  beforeEach(async () => {
    tokenModel = { create: vi.fn(), findOne: vi.fn(), updateOne: vi.fn() }
    jwtService = {
      signAsync: vi.fn().mockResolvedValue("signed.refresh.token"),
      decode: vi.fn().mockReturnValue({ sub: "1", exp: FUTURE_EXP }),
    }

    const module = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: getModelToken(RefreshToken.name), useValue: tokenModel },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile()

    service = module.get(RefreshTokenService)
  })

  describe("issue", () => {
    it("stores only the hash and mirrors the JWT's own expiry", async () => {
      const token = await service.issue({ id: "1", email: "jane@example.com" })

      expect(token).toBe("signed.refresh.token")
      const createArg = tokenModel.create.mock.calls[0]![0] as {
        userId: string
        tokenHash: string
        expiresAt: Date
      }
      expect(createArg.userId).toBe("1")
      expect(createArg.tokenHash).toBe(hashToken("signed.refresh.token"))
      expect(createArg.tokenHash).not.toBe("signed.refresh.token")
      expect(createArg.expiresAt).toEqual(new Date(FUTURE_EXP * 1000))
    })

    it("signs with the refresh secret, not the module's access-token default", async () => {
      await service.issue({ id: "1", email: "jane@example.com" })

      const [, options] = jwtService.signAsync.mock.calls[0] as [
        unknown,
        { secret: string; expiresIn: string },
      ]
      expect(options.secret).toBeTruthy()
      expect(options.expiresIn).toBeTruthy()
    })
  })

  describe("consume", () => {
    it("throws when no matching active token is stored", async () => {
      tokenModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      })

      await expect(
        service.consume("1", "unknown.token")
      ).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it("looks the token up by hash and revokes it on use (rotation)", async () => {
      const stored = { revokedAt: null, save: vi.fn() }
      tokenModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(stored),
      })

      await service.consume("1", "valid.token")

      const filter = tokenModel.findOne.mock.calls[0]![0] as {
        userId: string
        tokenHash: string
        revokedAt: null
      }
      expect(filter.userId).toBe("1")
      expect(filter.tokenHash).toBe(hashToken("valid.token"))
      expect(filter.revokedAt).toBeNull()
      expect(stored.revokedAt).toBeInstanceOf(Date)
      expect(stored.save).toHaveBeenCalledTimes(1)
    })
  })

  describe("revoke", () => {
    it("marks the stored hash revoked", async () => {
      tokenModel.updateOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      })

      await service.revoke("some.token")

      const [filter, update] = tokenModel.updateOne.mock.calls[0] as [
        { tokenHash: string },
        { revokedAt: Date },
      ]
      expect(filter.tokenHash).toBe(hashToken("some.token"))
      expect(update.revokedAt).toBeInstanceOf(Date)
    })
  })
})
