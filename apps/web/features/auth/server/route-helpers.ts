import "server-only"

import { NextResponse } from "next/server"

import { ApiError } from "@/lib/api-error"

import type { AuthSession } from "../model"
import { clearSessionCookies, writeSessionCookies } from "./session-cookies"

/**
 * Turns anything thrown by the API client into the same envelope the API would
 * have produced, so the browser sees one consistent error shape no matter
 * whether the failure came from the API or from this proxy layer.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { statusCode: error.status, message: error.message, code: error.code },
      { status: error.status }
    )
  }

  return NextResponse.json(
    {
      statusCode: 502,
      message: "Could not reach the server. Please try again.",
    },
    { status: 502 }
  )
}

/**
 * Returns the session's *user* to the browser and keeps the tokens in httpOnly
 * cookies — the client half of the app never sees a token.
 */
export function sessionResponse(session: AuthSession): NextResponse {
  const response = NextResponse.json({ user: session.user })
  writeSessionCookies(response.cookies, session)
  return response
}

export function clearedSessionResponse(body: unknown = { ok: true }) {
  const response = NextResponse.json(body)
  clearSessionCookies(response.cookies)
  return response
}
