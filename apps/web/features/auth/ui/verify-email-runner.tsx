"use client"

import { useActionState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"

import { AUTH_ROUTES } from "../constants"
import { verifyEmailAction, type VerifyEmailState } from "../server/actions"
import { ResendVerificationForm } from "./resend-verification-form"

const INITIAL: VerifyEmailState = { status: "idle" }

/**
 * Submits the token exactly once on mount. The button is the no-JS fallback —
 * the action itself is a POST, which also keeps the single-use token out of
 * reach of email scanners and link prefetchers that follow GET links.
 */
export function VerifyEmailRunner({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    verifyEmailAction,
    INITIAL
  )
  const formRef = useRef<HTMLFormElement>(null)
  const submitted = useRef(false)

  useEffect(() => {
    if (submitted.current) return
    submitted.current = true
    formRef.current?.requestSubmit()
  }, [])

  if (state.status === "error") {
    // A spent link and a truncated one have the same fix: send a new one.
    // Only an unreachable API leaves nothing useful to offer.
    const canResend =
      state.reason === "invalid-token" || state.reason === "malformed-link"

    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">{state.message}</p>

        {canResend ? (
          <>
            <p className="text-xs text-muted-foreground">
              Enter your email and we&apos;ll send a fresh link.
            </p>
            <ResendVerificationForm />
          </>
        ) : (
          <Button
            nativeButton={false}
            render={<Link href={AUTH_ROUTES.login} />}
            variant="outline"
            className="w-full"
          >
            Back to sign in
          </Button>
        )}
      </div>
    )
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {isPending ? "Verifying your email…" : "Confirming your link…"}
      </p>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Verifying…" : "Verify my email"}
      </Button>
    </form>
  )
}
