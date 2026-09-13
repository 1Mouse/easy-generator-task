import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsNotEmpty, IsString } from "class-validator"

export class SignInDto {
  @ApiProperty({ example: "jane@example.com" })
  @IsEmail()
  email!: string

  @ApiProperty({ example: "Str0ng!Pass" })
  @IsString()
  @IsNotEmpty()
  password!: string
}
