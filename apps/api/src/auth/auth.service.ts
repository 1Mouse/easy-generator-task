import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import * as bcrypt from "bcryptjs"

import { UsersService } from "../users/users.service.js"
import { UserDocument } from "../users/schemas/user.schema.js"
import { AuthSessionDto } from "./dto/auth-session.dto.js"
import { MessageResponseDto } from "./dto/message-response.dto.js"
import { RefreshTokenDto } from "./dto/refresh-token.dto.js"
import { ResendVerificationEmailDto } from "./dto/resend-verification-email.dto.js"
import { SignInDto } from "./dto/sign-in.dto.js"
import { SignUpDto } from "./dto/sign-up.dto.js"
import { SignUpResponseDto } from "./dto/sign-up-response.dto.js"
import { UserSummaryDto } from "./dto/user-summary.dto.js"
import { VerifyEmailDto } from "./dto/verify-email.dto.js"
import { EmailVerificationService } from "./email-verification.service.js"
import { RefreshTokenService } from "./refresh-token.service.js"

const SALT_ROUNDS = 10
const RESEND_GENERIC_MESSAGE =
  "If an unverified account exists, a verification email has been sent"

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly refreshTokenService: RefreshTokenService
  ) {}

  async signUp(dto: SignUpDto): Promise<SignUpResponseDto> {
    const existing = await this.usersService.findByEmail(dto.email)
    if (existing) {
      throw new ConflictException("An account with this email already exists")
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS)
    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    })

    await this.emailVerificationService.createAndSendToken({
      id: user.id,
      email: user.email,
    })

    return {
      user: this.toUserSummary(user),
      message: "Account created. Check your email to verify your account.",
    }
  }

  async signIn(dto: SignInDto): Promise<AuthSessionDto> {
    const user = await this.usersService.findByEmail(dto.email)
    if (!user) {
      throw new UnauthorizedException("Invalid email or password")
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash
    )
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password")
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException({
        message: "Please verify your email before signing in",
        code: "EMAIL_NOT_VERIFIED",
      })
    }

    return this.createSession(user)
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<AuthSessionDto> {
    const { userId } = await this.emailVerificationService.consumeToken(
      dto.token
    )
    const user = await this.usersService.markEmailVerified(userId)
    if (!user) {
      throw new UnauthorizedException({
        message: "Invalid or expired verification token",
        code: "INVALID_EMAIL_VERIFICATION_TOKEN",
      })
    }

    return this.createSession(user)
  }

  async refresh(
    userId: string,
    presentedRefreshToken: string
  ): Promise<AuthSessionDto> {
    await this.refreshTokenService.consume(userId, presentedRefreshToken)

    const user = await this.usersService.findById(userId)
    if (!user) {
      throw new UnauthorizedException({
        message: "Invalid or expired refresh token",
        code: "INVALID_REFRESH_TOKEN",
      })
    }

    return this.createSession(user)
  }

  async logout(dto: RefreshTokenDto): Promise<MessageResponseDto> {
    await this.refreshTokenService.revoke(dto.refreshToken)
    return { message: "Signed out" }
  }

  async resendVerificationEmail(
    dto: ResendVerificationEmailDto
  ): Promise<MessageResponseDto> {
    const user = await this.usersService.findByEmail(dto.email)
    if (user && !user.emailVerifiedAt) {
      await this.emailVerificationService.createAndSendToken({
        id: user.id,
        email: user.email,
      })
    }

    return { message: RESEND_GENERIC_MESSAGE }
  }

  private async createSession(user: UserDocument): Promise<AuthSessionDto> {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    })
    const refreshToken = await this.refreshTokenService.issue({
      id: user.id,
      email: user.email,
    })

    return { user: this.toUserSummary(user), accessToken, refreshToken }
  }

  private toUserSummary(user: UserDocument): UserSummaryDto {
    return { id: user.id, email: user.email, name: user.name }
  }
}
