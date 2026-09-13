import "server-only"

import { env } from "@/env"
import { ApiError, toApiError } from "@/lib/api-error"

import type { AuthSession } from "../model"

/**
 * Single place that knows how to reach the API. Everything server-side —
 * route handlers, server components, middleware — goes through here so the
 * base URL, error envelope, and caching policy are decided once.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { accessToken?: string } = {}
): Promise<T> {
  const { accessToken, headers, ...rest } = init

  const response = await fetch(`${env.API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    // Auth and per-user data must never be served from a shared cache.
    cache: "no-store",
  })

  if (!response.ok) {
    throw await toApiError(response)
  }

  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T)
}

export function signIn(body: {
  email: string
  password: string
}): Promise<AuthSession> {
  return apiFetch<AuthSession>("/api/auth/signin", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function signUp(body: {
  name: string
  email: string
  password: string
}): Promise<{ user: AuthSession["user"]; message: string }> {
  return apiFetch("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function verifyEmail(token: string): Promise<AuthSession> {
  return apiFetch<AuthSession>("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  })
}

export function resendVerificationEmail(
  email: string
): Promise<{ message: string }> {
  return apiFetch("/api/auth/resend-verification-email", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export function refreshSession(refreshToken: string): Promise<AuthSession> {
  return apiFetch<AuthSession>("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  })
}

export function revokeRefreshToken(refreshToken: string): Promise<unknown> {
  return apiFetch("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  })
}

export function fetchCurrentUser(
  accessToken: string
): Promise<AuthSession["user"]> {
  return apiFetch<AuthSession["user"]>("/api/auth/me", { accessToken })
}

export { ApiError }
