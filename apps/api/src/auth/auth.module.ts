import { Module } from "@nestjs/common"
import { JwtModule } from "@nestjs/jwt"
import { MongooseModule } from "@nestjs/mongoose"
import { PassportModule } from "@nestjs/passport"
import { ThrottlerModule } from "@nestjs/throttler"

import { MailModule } from "../mail/mail.module.js"
import { UsersModule } from "../users/users.module.js"
import { env } from "../config/env.validation.js"
import { AuthController } from "./auth.controller.js"
import { AuthService } from "./auth.service.js"
import { EmailVerificationService } from "./email-verification.service.js"
import { RefreshTokenService } from "./refresh-token.service.js"
import {
  EmailVerificationToken,
  EmailVerificationTokenSchema,
} from "./schemas/email-verification-token.schema.js"
import {
  RefreshToken,
  RefreshTokenSchema,
} from "./schemas/refresh-token.schema.js"
import { JwtRefreshStrategy } from "./strategies/jwt-refresh.strategy.js"
import { JwtStrategy } from "./strategies/jwt.strategy.js"

@Module({
  imports: [
    UsersModule,
    MailModule,
    MongooseModule.forFeature([
      {
        name: EmailVerificationToken.name,
        schema: EmailVerificationTokenSchema,
      },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    PassportModule.register({ defaultStrategy: "jwt" }),
    // Defaults here sign *access* tokens; refresh tokens pass their own secret
    // and expiry explicitly so the two can never be swapped for one another.
    JwtModule.register({
      secret: env.JWT_ACCESS_SECRET,
      // @nestjs/jwt narrows `expiresIn` to `ms`'s StringValue union; ours is a
      // validated-but-freeform env string (e.g. "5m"), so it needs a cast here.
      signOptions: { expiresIn: env.JWT_ACCESS_EXPIRES_IN as never },
    }),
    ThrottlerModule.forRoot([
      { ttl: env.THROTTLE_TTL_MS, limit: env.THROTTLE_LIMIT },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    EmailVerificationService,
    RefreshTokenService,
  ],
})
export class AuthModule {}
