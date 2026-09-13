import { NextResponse, type NextRequest } from "next/server"

import { signIn } from "@/features/auth/server/api"
import {
  errorResponse,
  sessionResponse,
} from "@/features/auth/server/route-helpers"
import { signInSchema } from "@/features/auth/schemas"

export async function POST(request: NextRequest) {
  const parsed = signInSchema.safeParse(await request.json())

  if (!parsed.success) {
    return NextResponse.json(
      { statusCode: 400, message: "Enter a valid email and password" },
      { status: 400 }
    )
  }

  try {
    return sessionResponse(await signIn(parsed.data))
  } catch (error) {
    return errorResponse(error)
  }
}
