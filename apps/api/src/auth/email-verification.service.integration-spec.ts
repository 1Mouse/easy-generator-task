import { UnauthorizedException } from "@nestjs/common"
import { getModelToken, MongooseModule } from "@nestjs/mongoose"
import { Test } from "@nestjs/testing"
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose, { Model } from "mongoose"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { MailService } from "../mail/mail.service.js"
import { EmailVerificationService } from "./email-verification.service.js"
import {
  EmailVerificationToken,
  EmailVerificationTokenDocument,
  EmailVerificationTokenSchema,
} from "./schemas/email-verification-token.schema.js"

const USER = { id: "6aa6a036468af70f24acb8ed", email: "jane@example.com" }

describe("EmailVerificationService (integration)", () => {
  let mongod: MongoMemoryServer
  let service: EmailVerificationService
  let tokenModel: Model<EmailVerificationTokenDocument>
  let mailService: { sendMail: ReturnType<typeof vi.fn> }

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
    mailService = { sendMail: vi.fn().mockResolvedValue(undefined) }

    const module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([
          {
            name: EmailVerificationToken.name,
            schema: EmailVerificationTokenSchema,
          },
        ]),
      ],
      providers: [
        EmailVerificationService,
        { provide: MailService, useValue: mailService },
      ],
    }).compile()

    service = module.get(EmailVerificationService)
    tokenModel = module.get(getModelToken(EmailVerificationToken.name))
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await mongod.stop()
  })

  async function issueToken(): Promise<string> {
    mailService.sendMail.mockClear()
    await service.createAndSendToken(USER)
    const [{ text }] = mailService.sendMail.mock.calls.at(-1) as [
      { text: string },
    ]
    const token = text.match(/[?&]token=([^&\s]+)/)?.[1]
    if (!token) throw new Error("no token was emailed")
    return token
  }

  it("round-trips a freshly issued token", async () => {
    const token = await issueToken()

    await expect(service.consumeToken(token)).resolves.toEqual({
      userId: USER.id,
    })
  })

  it("persists only the hash, never the raw token", async () => {
    const token = await issueToken()

    const stored = await tokenModel.findOne({ usedAt: null }).sort({ _id: -1 })
    expect(stored).not.toBeNull()
    expect(stored!.tokenHash).not.toBe(token)
    expect(stored!.tokenHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it("rejects a token that has already been used", async () => {
    const token = await issueToken()
    await service.consumeToken(token)

    await expect(service.consumeToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException
    )
  })

  // The expiry guard lives in consumeToken's query (`expiresAt: { $gt: now }`).
  // Backdating the stored row is the only way to prove that clause is real —
  // without it the token below would still verify.
  it("rejects a token whose expiry has passed", async () => {
    const token = await issueToken()
    const stored = await tokenModel.findOne({ usedAt: null }).sort({ _id: -1 })
    await tokenModel.updateOne(
      { _id: stored!._id },
      { expiresAt: new Date(Date.now() - 1_000) }
    )

    await expect(service.consumeToken(token)).rejects.toBeInstanceOf(
      UnauthorizedException
    )
  })

  it("rejects a token that was never issued", async () => {
    await expect(service.consumeToken("never-issued")).rejects.toBeInstanceOf(
      UnauthorizedException
    )
  })
})
