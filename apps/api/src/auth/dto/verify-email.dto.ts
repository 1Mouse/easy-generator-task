import { ApiProperty } from "@nestjs/swagger"
import { IsString, Length } from "class-validator"

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  @Length(32, 500)
  token!: string
}
