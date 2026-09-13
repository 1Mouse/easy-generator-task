import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common"
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger"
import { ThrottlerGuard } from "@nestjs/throttler"
import type { Request } from "express"

import {
  CurrentUser,
  type CurrentUserPayload,
} from "../common/decorators/current-user.decorator.js"
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard.js"
import { JwtRefreshGuard } from "../common/guards/jwt-refresh.guard.js"
import { UsersService } from "../users/users.service.js"
import { AuthService } from "./auth.service.js"
import { AuthSessionDto } from "./dto/auth-session.dto.js"
import { MessageResponseDto } from "./dto/message-response.dto.js"
import { RefreshTokenDto } from "./dto/refresh-token.dto.js"
import { ResendVerificationEmailDto } from "./dto/resend-verification-email.dto.js"
import { SignInDto } from "./dto/sign-in.dto.js"
import { SignUpDto } from "./dto/sign-up.dto.js"
import { SignUpResponseDto } from "./dto/sign-up-response.dto.js"
import { UserSummaryDto } from "./dto/user-summary.dto.js"
import { VerifyEmailDto } from "./dto/verify-email.dto.js"
import type { RefreshRequestUser } from "./strategies/jwt-refresh.strategy.js"

@ApiTags("auth")
@Controller("auth")
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @Post("signup")
  @ApiOperation({
    summary: "Create a new account (sends a verification email)",
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: SignUpResponseDto })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Email already registered",
  })
  signUp(@Body() dto: SignUpDto): Promise<SignUpResponseDto> {
    return this.authService.signUp(dto)
  }

  @Post("signin")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Sign in with email and password" })
  @ApiResponse({ status: HttpStatus.OK, type: AuthSessionDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Invalid credentials",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Email not verified",
  })
  signIn(@Body() dto: SignInDto): Promise<AuthSessionDto> {
    return this.authService.signIn(dto)
  }

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify an email address and start a session" })
  @ApiResponse({ status: HttpStatus.OK, type: AuthSessionDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Invalid or expired verification token",
  })
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<AuthSessionDto> {
    return this.authService.verifyEmail(dto)
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({
    summary: "Exchange a refresh token for a new access/refresh pair",
  })
  @ApiResponse({ status: HttpStatus.OK, type: AuthSessionDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Invalid, expired, or already-used refresh token",
  })
  refresh(
    @Body() _dto: RefreshTokenDto,
    @Req() request: Request
  ): Promise<AuthSessionDto> {
    const { userId, refreshToken } = request.user as RefreshRequestUser
    return this.authService.refresh(userId, refreshToken)
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({
    summary: "Revoke a refresh token",
    description:
      "Ends the session by revoking the refresh token, so it can no longer be " +
      "exchanged. The access token is a stateless JWT and is deliberately not " +
      "tracked server-side, so it stays valid until it expires on its own " +
      "(JWT_ACCESS_EXPIRES_IN, default 5m) — clients must discard it on logout.",
  })
  @ApiResponse({ status: HttpStatus.OK, type: MessageResponseDto })
  logout(@Body() dto: RefreshTokenDto): Promise<MessageResponseDto> {
    return this.authService.logout(dto)
  }

  @Post("resend-verification-email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resend the verification email (generic response)" })
  @ApiResponse({ status: HttpStatus.OK, type: MessageResponseDto })
  resendVerificationEmail(
    @Body() dto: ResendVerificationEmailDto
  ): Promise<MessageResponseDto> {
    return this.authService.resendVerificationEmail(dto)
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the current authenticated user (protected)" })
  @ApiResponse({ status: HttpStatus.OK, type: UserSummaryDto })
  async me(@CurrentUser() user: CurrentUserPayload): Promise<UserSummaryDto> {
    const found = await this.usersService.findById(user.userId)
    if (!found) {
      throw new NotFoundException("User not found")
    }
    return { id: found.id, email: found.email, name: found.name }
  }
}
