import { toApiError } from "@/lib/api-error"

import type { SessionUser } from "../model"
import type {
  ResendVerificationValues,
  SignInValues,
  SignUpValues,
} from "../schemas"

/**
 * Browser-side calls always target this app's own /api/auth/* routes, never the
 * API directly — that's what lets the tokens stay in httpOnly cookies.
 */
async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!response.ok) throw await toApiError(response)
  return (await response.json()) as T
}

export function login(values: SignInValues): Promise<{ user: SessionUser }> {
  return post("/api/auth/login", values)
}

export function signup(
  values: SignUpValues
): Promise<{ user: SessionUser; message: string }> {
  return post("/api/auth/signup", values)
}

export function logout(): Promise<{ ok: boolean }> {
  return post("/api/auth/logout", {})
}

export function resendVerification(
  values: ResendVerificationValues
): Promise<{ message: string }> {
  return post("/api/auth/resend-verification", values)
}

export async function fetchSession(): Promise<SessionUser | null> {
  const response = await fetch("/api/auth/me")
  if (!response.ok) throw await toApiError(response)

  const { user } = (await response.json()) as { user: SessionUser | null }
  return user
}
