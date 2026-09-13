import { ApiProperty } from "@nestjs/swagger"

import { UserSummaryDto } from "./user-summary.dto.js"

export class AuthSessionDto {
  @ApiProperty({ type: UserSummaryDto })
  user!: UserSummaryDto

  @ApiProperty({
    description: "Short-lived token for the Authorization header",
  })
  accessToken!: string

  @ApiProperty({ description: "Long-lived token, exchanged at /auth/refresh" })
  refreshToken!: string
}
