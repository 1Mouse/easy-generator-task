import { Injectable } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"

import { env } from "../../config/env.validation.js"
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator.js"

interface JwtPayload {
  sub: string
  email: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
    })
  }

  validate(payload: JwtPayload): CurrentUserPayload {
    return { userId: payload.sub, email: payload.email }
  }
}
