import { Injectable } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import type { Request } from "express"
import { ExtractJwt, Strategy } from "passport-jwt"

import { env } from "../../config/env.validation.js"

interface JwtRefreshPayload {
  sub: string
  email: string
}

export interface RefreshRequestUser {
  userId: string
  email: string
  refreshToken: string
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  "jwt-refresh"
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField("refreshToken"),
      ignoreExpiration: false,
      secretOrKey: env.JWT_REFRESH_SECRET,
      // The raw token has to reach the service so it can be looked up by hash
      // and rotated — passport only hands back the decoded payload otherwise.
      passReqToCallback: true,
    })
  }

  validate(request: Request, payload: JwtRefreshPayload): RefreshRequestUser {
    const { refreshToken } = request.body as { refreshToken: string }
    return { userId: payload.sub, email: payload.email, refreshToken }
  }
}
