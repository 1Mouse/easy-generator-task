"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { ApiError } from "@/lib/api-error"

import { AFTER_LOGIN_ROUTE } from "../constants"
import { verifyEmail } from "./api"
import { writeSessionCookies } from "./session-cookies"

export type VerifyEmailState =
  | { status: "idle" }
  | { status: "error"; reason: VerifyFailureReason; message: string }

export type VerifyFailureReason =
  | "missing-token"
  | "invalid-token"
  | "malformed-link"
  | "unavailable"

function failure(
  reason: VerifyFailureReason,
  message: string
): VerifyEmailState {
  return { status: "error", reason, message }
}

/**
 * Runs as a Server Action rather than during render because verification is a
 * one-shot mutation that has to persist a session — and a server component
 * can't write cookies. Being a POST also keeps the single-use token safe from
 * email scanners and link prefetchers that follow GET links.
 */
export async function verifyEmailAction(
  _previous: VerifyEmailState,
  formData: FormData
): Promise<VerifyEmailState> {
  const token = formData.get("token")

  if (typeof token !== "string" || token.length === 0) {
    return failure(
      "missing-token",
      "This link is missing its verification code."
    )
  }

  try {
    const session = await verifyEmail(token)
    writeSessionCookies(await cookies(), session)
  } catch (error) {
    if (error instanceof ApiError) {
      // The API answers 401 for missing, already-used, and expired tokens
      // alike — deliberately, so a probe can't tell them apart.
      if (error.isUnauthorized) {
        return failure(
          "invalid-token",
          "This verification link has expired or has already been used."
        )
      }
      if (error.status === 400) {
        return failure(
          "malformed-link",
          "This verification link looks incomplete. Try opening it again from your email."
        )
      }
    }

    return failure(
      "unavailable",
      "We couldn't verify your email right now. Please try again in a moment."
    )
  }

  // Outside the try: redirect() signals by throwing, and catching it here would
  // turn a success into a spurious error state.
  redirect(AFTER_LOGIN_ROUTE)
}
