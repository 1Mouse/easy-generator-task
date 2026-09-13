import "server-only"

import { cookies } from "next/headers"

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "../constants"
import type { AuthSession } from "../model"

interface CookieWriter {
  set(name: string, value: string, options: CookieOptions): void
  delete(name: string): void
}

interface CookieOptions {
  httpOnly: boolean
  sameSite: "lax"
  secure: boolean
  path: string
  expires?: Date
}

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  }
}

/**
 * Expire the cookie exactly when its token does, so a stale cookie is never
 * sent. These are our own tokens and the API re-verifies every one of them —
 * this read is only used to pick an expiry, never to trust a claim.
 */
function expiryOf(token: string): Date | undefined {
  const payload = token.split(".")[1]
  if (!payload) return undefined

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as { exp?: number }
    return decoded.exp ? new Date(decoded.exp * 1000) : undefined
  } catch {
    return undefined
  }
}

export function writeSessionCookies(
  store: CookieWriter,
  session: Pick<AuthSession, "accessToken" | "refreshToken">
): void {
  store.set(ACCESS_TOKEN_COOKIE, session.accessToken, {
    ...baseOptions(),
    expires: expiryOf(session.accessToken),
  })
  store.set(REFRESH_TOKEN_COOKIE, session.refreshToken, {
    ...baseOptions(),
    expires: expiryOf(session.refreshToken),
  })
}

export function clearSessionCookies(store: CookieWriter): void {
  store.delete(ACCESS_TOKEN_COOKIE)
  store.delete(REFRESH_TOKEN_COOKIE)
}

export async function readTokens(): Promise<{
  accessToken?: string
  refreshToken?: string
}> {
  const store = await cookies()
  return {
    accessToken: store.get(ACCESS_TOKEN_COOKIE)?.value,
    refreshToken: store.get(REFRESH_TOKEN_COOKIE)?.value,
  }
}
