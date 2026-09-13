import { NextResponse, type NextRequest } from "next/server"

import { signUp } from "@/features/auth/server/api"
import { errorResponse } from "@/features/auth/server/route-helpers"
import { signUpSchema } from "@/features/auth/schemas"

export async function POST(request: NextRequest) {
  const parsed = signUpSchema.safeParse(await request.json())

  if (!parsed.success) {
    return NextResponse.json(
      {
        statusCode: 400,
        message: parsed.error.issues[0]?.message ?? "Check the form and retry",
      },
      { status: 400 }
    )
  }

  try {
    // No cookies are set here: signup deliberately doesn't start a session —
    // the account is inert until the emailed link is opened.
    return NextResponse.json(await signUp(parsed.data), { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}
