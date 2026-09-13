import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import * as bcrypt from "bcryptjs"

import { UsersService } from "../users/users.service.js"
import { SignInDto } from "./dto/sign-in.dto.js"
import { SignUpDto } from "./dto/sign-up.dto.js"

const SALT_ROUNDS = 10

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  async signUp(dto: SignUpDto): Promise<{ accessToken: string }> {
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

    return this.signToken(user.id, user.email)
  }

  async signIn(dto: SignInDto): Promise<{ accessToken: string }> {
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

    return this.signToken(user.id, user.email)
  }

  private signToken(userId: string, email: string): { accessToken: string } {
    const accessToken = this.jwtService.sign({ sub: userId, email })
    return { accessToken }
  }
}
