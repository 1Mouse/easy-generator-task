import { NextResponse, type NextRequest } from "next/server"

import { env } from "@/env"
import {
  ACCESS_TOKEN_COOKIE,
  AFTER_LOGIN_ROUTE,
  AUTH_ROUTES,
  PROTECTED_ROUTES,
  REFRESH_TOKEN_COOKIE,
} from "@/features/auth/constants"

interface RefreshedSession {
  accessToken: string
  refreshToken: string
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const

/**
 * Refresh lives here rather than in the pages themselves because a server
 * component cannot set cookies while rendering — it could rotate the refresh
 * token but never persist the new one, silently burning the session. Proxy can
 * write to both the forwarded request (so this render sees the new token) and
 * the response (so the browser keeps it).
 */
async function rotate(refreshToken: string): Promise<RefreshedSession | null> {
  try {
    const response = await fetch(`${env.API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    })

    if (!response.ok) return null
    return (await response.json()) as RefreshedSession
  } catch {
    // The API being unreachable shouldn't hard-fail navigation; the request
    // continues unauthenticated and protected routes redirect to login.
    return null
  }
}

function isProtected(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

function isAuthPage(pathname: string): boolean {
  return pathname === AUTH_ROUTES.login || pathname === AUTH_ROUTES.signup
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value

  let hasSession = Boolean(accessToken)

  // The access cookie expires with its token, so "missing access + present
  // refresh" is exactly the case that needs a silent rotation.
  if (!accessToken && refreshToken) {
    const session = await rotate(refreshToken)

    if (session) {
      request.cookies.set(ACCESS_TOKEN_COOKIE, session.accessToken)
      request.cookies.set(REFRESH_TOKEN_COOKIE, session.refreshToken)
      response = NextResponse.next({ request })
      response.cookies.set(
        ACCESS_TOKEN_COOKIE,
        session.accessToken,
        COOKIE_OPTIONS
      )
      response.cookies.set(
        REFRESH_TOKEN_COOKIE,
        session.refreshToken,
        COOKIE_OPTIONS
      )
      hasSession = true
    } else {
      // Refresh token is spent, revoked, or expired — drop it so we stop
      // retrying on every navigation.
      response.cookies.delete(REFRESH_TOKEN_COOKIE)
    }
  }

  if (!hasSession && isProtected(pathname)) {
    const loginUrl = new URL(AUTH_ROUTES.login, request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (hasSession && isAuthPage(pathname)) {
    return NextResponse.redirect(new URL(AFTER_LOGIN_ROUTE, request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|assets|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
