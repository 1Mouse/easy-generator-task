import { ApiProperty } from "@nestjs/swagger"

export class UserSummaryDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  email!: string

  @ApiProperty()
  name!: string
}
