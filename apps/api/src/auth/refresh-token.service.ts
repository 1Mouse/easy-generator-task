import { randomUUID } from "node:crypto"

import { Injectable, UnauthorizedException } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"

import { env } from "../config/env.validation.js"
import {
  RefreshToken,
  RefreshTokenDocument,
} from "./schemas/refresh-token.schema.js"
import { hashToken } from "./token.util.js"

export interface RefreshTokenSubject {
  id: string
  email: string
}

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectModel(RefreshToken.name)
    private readonly tokenModel: Model<RefreshTokenDocument>,
    private readonly jwtService: JwtService
  ) {}

  async issue(user: RefreshTokenSubject): Promise<string> {
    const token = await this.jwtService.signAsync(
      // `jti` keeps every issued token unique: without it two sign-ins for the
      // same user inside the same second produce byte-identical JWTs (same
      // payload, same second-resolution `iat`) and collide on `tokenHash`.
      { sub: user.id, email: user.email, jti: randomUUID() },
      {
        secret: env.JWT_REFRESH_SECRET,
        expiresIn: env.JWT_REFRESH_EXPIRES_IN as never,
      }
    )

    await this.tokenModel.create({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: this.expiryOf(token),
    })

    return token
  }

  // Refresh-token rotation: the presented token is consumed (revoked) and the
  // caller issues a fresh one, so a stolen token is only usable until the
  // legitimate client next refreshes.
  async consume(userId: string, token: string): Promise<void> {
    const stored = await this.tokenModel
      .findOne({
        userId,
        tokenHash: hashToken(token),
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .exec()

    if (!stored) {
      throw new UnauthorizedException({
        message: "Invalid or expired refresh token",
        code: "INVALID_REFRESH_TOKEN",
      })
    }

    stored.revokedAt = new Date()
    await stored.save()
  }

  async revoke(token: string): Promise<void> {
    await this.tokenModel
      .updateOne(
        { tokenHash: hashToken(token), revokedAt: null },
        { revokedAt: new Date() }
      )
      .exec()
  }

  private expiryOf(token: string): Date {
    const decoded = this.jwtService.decode(token) as { exp?: number } | null
    if (!decoded?.exp) {
      throw new Error("Signed refresh token is missing an exp claim")
    }
    return new Date(decoded.exp * 1000)
  }
}
