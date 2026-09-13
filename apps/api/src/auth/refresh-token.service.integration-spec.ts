import { UnauthorizedException } from "@nestjs/common"
import { JwtModule } from "@nestjs/jwt"
import { getModelToken, MongooseModule } from "@nestjs/mongoose"
import { Test } from "@nestjs/testing"
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose, { Model } from "mongoose"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { RefreshTokenService } from "./refresh-token.service.js"
import {
  RefreshToken,
  RefreshTokenDocument,
  RefreshTokenSchema,
} from "./schemas/refresh-token.schema.js"
import { hashToken } from "./token.util.js"

const USER = { id: "6aa6a036468af70f24acb8ed", email: "jane@example.com" }

describe("RefreshTokenService (integration)", () => {
  let mongod: MongoMemoryServer
  let service: RefreshTokenService
  let tokenModel: Model<RefreshTokenDocument>

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()

    const module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([
          { name: RefreshToken.name, schema: RefreshTokenSchema },
        ]),
        JwtModule.register({ secret: "integration-secret" }),
      ],
      providers: [RefreshTokenService],
    }).compile()

    service = module.get(RefreshTokenService)
    tokenModel = module.get(getModelToken(RefreshToken.name))
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await mongod.stop()
  })

  it("issues a token that can be consumed exactly once (rotation)", async () => {
    const token = await service.issue(USER)

    await expect(service.consume(USER.id, token)).resolves.toBeUndefined()
    await expect(service.consume(USER.id, token)).rejects.toBeInstanceOf(
      UnauthorizedException
    )
  })

  it("persists only the hash, never the raw token", async () => {
    const token = await service.issue(USER)

    const stored = await tokenModel.findOne({ tokenHash: hashToken(token) })
    expect(stored).not.toBeNull()
    expect(stored!.tokenHash).not.toBe(token)
    await expect(tokenModel.findOne({ tokenHash: token })).resolves.toBeNull()
  })

  it("issues distinct tokens for back-to-back sessions in the same second", async () => {
    const [first, second] = await Promise.all([
      service.issue(USER),
      service.issue(USER),
    ])

    expect(first).not.toBe(second)
    await expect(service.consume(USER.id, first)).resolves.toBeUndefined()
    await expect(service.consume(USER.id, second)).resolves.toBeUndefined()
  })

  // Proves consume()'s `expiresAt: { $gt: now }` clause is load-bearing: the JWT
  // itself is still signature-valid here, only the stored row has aged out.
  it("rejects a token whose stored expiry has passed", async () => {
    const token = await service.issue(USER)
    await tokenModel.updateOne(
      { tokenHash: hashToken(token) },
      { expiresAt: new Date(Date.now() - 1_000) }
    )

    await expect(service.consume(USER.id, token)).rejects.toBeInstanceOf(
      UnauthorizedException
    )
  })

  it("rejects a token belonging to a different user", async () => {
    const token = await service.issue(USER)

    await expect(
      service.consume("6aa6a036468af70f24acb8ee", token)
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it("revoke() makes a live token unusable", async () => {
    const token = await service.issue(USER)

    await service.revoke(token)

    await expect(service.consume(USER.id, token)).rejects.toBeInstanceOf(
      UnauthorizedException
    )
  })
})
