import { NextResponse, type NextRequest } from "next/server"

import { resendVerificationEmail } from "@/features/auth/server/api"
import { errorResponse } from "@/features/auth/server/route-helpers"
import { resendVerificationSchema } from "@/features/auth/schemas"

export async function POST(request: NextRequest) {
  const parsed = resendVerificationSchema.safeParse(await request.json())

  if (!parsed.success) {
    return NextResponse.json(
      { statusCode: 400, message: "Enter a valid email address" },
      { status: 400 }
    )
  }

  try {
    return NextResponse.json(await resendVerificationEmail(parsed.data.email))
  } catch (error) {
    return errorResponse(error)
  }
}
