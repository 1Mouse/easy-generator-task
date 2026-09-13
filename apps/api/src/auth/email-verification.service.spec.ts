import { Test } from "@nestjs/testing"
import { getModelToken } from "@nestjs/mongoose"
import { UnauthorizedException } from "@nestjs/common"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { MailService } from "../mail/mail.service.js"
import { EmailVerificationService } from "./email-verification.service.js"
import { EmailVerificationToken } from "./schemas/email-verification-token.schema.js"

describe("EmailVerificationService", () => {
  let service: EmailVerificationService
  let tokenModel: {
    create: ReturnType<typeof vi.fn>
    findOne: ReturnType<typeof vi.fn>
  }
  let mailService: { sendMail: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    tokenModel = { create: vi.fn(), findOne: vi.fn() }
    mailService = { sendMail: vi.fn().mockResolvedValue(undefined) }

    const module = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        {
          provide: getModelToken(EmailVerificationToken.name),
          useValue: tokenModel,
        },
        { provide: MailService, useValue: mailService },
      ],
    }).compile()

    service = module.get(EmailVerificationService)
  })

  describe("createAndSendToken", () => {
    it("stores a hash (never the raw token) and emails a link containing the raw token", async () => {
      tokenModel.create.mockResolvedValue({})

      await service.createAndSendToken({ id: "1", email: "jane@example.com" })

      expect(tokenModel.create).toHaveBeenCalledTimes(1)
      const createArg = tokenModel.create.mock.calls[0]![0] as {
        userId: string
        tokenHash: string
        expiresAt: Date
      }
      expect(createArg.userId).toBe("1")
      expect(createArg.tokenHash).toMatch(/^[a-f0-9]{64}$/)
      expect(createArg.expiresAt.getTime()).toBeGreaterThan(Date.now())

      expect(mailService.sendMail).toHaveBeenCalledTimes(1)
      const mailArg = mailService.sendMail.mock.calls[0]![0] as {
        to: string
        text: string
      }
      expect(mailArg.to).toBe("jane@example.com")
      const rawToken = mailArg.text.match(/[?&]token=([^&\s]+)/)?.[1]
      expect(rawToken).toBeTruthy()
      expect(rawToken).not.toBe(createArg.tokenHash)
    })
  })

  describe("consumeToken", () => {
    it("throws when no active token matches", async () => {
      tokenModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      })

      await expect(
        service.consumeToken("missing-token")
      ).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it("marks the token used and returns the userId when valid", async () => {
      const doc = {
        userId: { toString: () => "1" },
        usedAt: null,
        save: vi.fn(),
      }
      tokenModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(doc),
      })

      const result = await service.consumeToken("valid-token")

      expect(doc.usedAt).toBeInstanceOf(Date)
      expect(doc.save).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ userId: "1" })
    })
  })
})
