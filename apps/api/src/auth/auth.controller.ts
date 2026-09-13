import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  UseGuards,
} from "@nestjs/common"
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger"
import { ThrottlerGuard } from "@nestjs/throttler"

import {
  CurrentUser,
  type CurrentUserPayload,
} from "../common/decorators/current-user.decorator.js"
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard.js"
import { UsersService } from "../users/users.service.js"
import { AuthService } from "./auth.service.js"
import { AuthResponseDto } from "./dto/auth-response.dto.js"
import { SignInDto } from "./dto/sign-in.dto.js"
import { SignUpDto } from "./dto/sign-up.dto.js"

@ApiTags("auth")
@Controller("auth")
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @Post("signup")
  @ApiOperation({ summary: "Create a new account" })
  @ApiResponse({ status: HttpStatus.CREATED, type: AuthResponseDto })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Email already registered",
  })
  signUp(@Body() dto: SignUpDto): Promise<AuthResponseDto> {
    return this.authService.signUp(dto)
  }

  @Post("signin")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Sign in with email and password" })
  @ApiResponse({ status: HttpStatus.OK, type: AuthResponseDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Invalid credentials",
  })
  signIn(@Body() dto: SignInDto): Promise<AuthResponseDto> {
    return this.authService.signIn(dto)
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the current authenticated user (protected)" })
  async me(@CurrentUser() user: CurrentUserPayload) {
    const found = await this.usersService.findById(user.userId)
    if (!found) {
      throw new NotFoundException("User not found")
    }
    return { id: found.id, email: found.email, name: found.name }
  }
}
