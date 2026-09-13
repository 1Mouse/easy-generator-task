import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsString, Matches, MinLength } from "class-validator"

import {
  MIN_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX,
} from "../../common/password-policy.js"

export class SignUpDto {
  @ApiProperty({ example: "jane@example.com" })
  @IsEmail()
  email!: string

  @ApiProperty({ example: "Jane Doe", minLength: MIN_NAME_LENGTH })
  @IsString()
  @MinLength(MIN_NAME_LENGTH)
  name!: string

  @ApiProperty({ example: "Str0ng!Pass", minLength: MIN_PASSWORD_LENGTH })
  @MinLength(MIN_PASSWORD_LENGTH)
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  password!: string
}
