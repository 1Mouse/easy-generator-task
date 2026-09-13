import { Module } from "@nestjs/common"
import { JwtModule } from "@nestjs/jwt"
import { PassportModule } from "@nestjs/passport"
import { ThrottlerModule } from "@nestjs/throttler"

import { UsersModule } from "../users/users.module.js"
import { env } from "../config/env.validation.js"
import { AuthController } from "./auth.controller.js"
import { AuthService } from "./auth.service.js"
import { JwtStrategy } from "./strategies/jwt.strategy.js"

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: env.JWT_SECRET,
      // @nestjs/jwt narrows `expiresIn` to `ms`'s StringValue union; ours is a
      // validated-but-freeform env string (e.g. "1h"), so it needs a cast here.
      signOptions: { expiresIn: env.JWT_EXPIRES_IN as never },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
