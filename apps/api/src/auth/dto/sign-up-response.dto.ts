import { ApiProperty } from "@nestjs/swagger"

import { UserSummaryDto } from "./user-summary.dto.js"

export class SignUpResponseDto {
  @ApiProperty({ type: UserSummaryDto })
  user!: UserSummaryDto

  @ApiProperty()
  message!: string
}
