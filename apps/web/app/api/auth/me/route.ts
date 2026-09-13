import { NextResponse } from "next/server"

import { fetchCurrentUser } from "@/features/auth/server/api"
import {
  clearedSessionResponse,
  errorResponse,
} from "@/features/auth/server/route-helpers"
import { readTokens } from "@/features/auth/server/session-cookies"
import { ApiError } from "@/lib/api-error"

export async function GET() {
  const { accessToken } = await readTokens()

  if (!accessToken) {
    return NextResponse.json({ user: null })
  }

  try {
    return NextResponse.json({ user: await fetchCurrentUser(accessToken) })
  } catch (error) {
    // Middleware already rotates when it can; a 401 here means the session is
    // genuinely gone, so clear it rather than leaving a dead cookie behind.
    if (error instanceof ApiError && error.isUnauthorized) {
      return clearedSessionResponse({ user: null })
    }
    return errorResponse(error)
  }
}
