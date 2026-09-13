import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"

import { AUTH_ROUTES } from "@/features/auth/constants"
import { AuthCard } from "@/features/auth/ui/auth-card"
import { ResendVerificationForm } from "@/features/auth/ui/resend-verification-form"
import { VerifyEmailRunner } from "@/features/auth/ui/verify-email-runner"

export const metadata: Metadata = { title: "Verify email" }

/**
 * Server component: the token is read and handed straight to a Server Action,
 * so it is never exposed to client-side JavaScript. Every failure mode the API
 * can produce (missing, malformed, expired, already-used, or API down) is
 * resolved server-side and rendered as a recoverable state rather than an
 * unhandled error.
 */
export default async function VerifyEmailPage(
  props: PageProps<"/verify-email">
) {
  const { token } = await props.searchParams
  const value = typeof token === "string" ? token.trim() : ""

  if (!value) {
    return (
      <AuthCard
        title="Nothing to verify"
        description="This page needs a verification link to do anything."
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Open the link from your verification email, or request a new one
            below.
          </p>
          <ResendVerificationForm />
          <Button
            nativeButton={false}
            render={<Link href={AUTH_ROUTES.login} />}
            variant="ghost"
            className="w-full"
          >
            Back to sign in
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Verifying your email">
      <VerifyEmailRunner token={value} />
    </AuthCard>
  )
}
