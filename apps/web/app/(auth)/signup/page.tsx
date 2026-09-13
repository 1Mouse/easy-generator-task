import type { Metadata } from "next"

import { AUTH_ROUTES } from "@/features/auth/constants"
import { AuthCard } from "@/features/auth/ui/auth-card"
import { SignUpForm } from "@/features/auth/ui/signup-form"

export const metadata: Metadata = { title: "Create account" }

export default function SignUpPage() {
  return (
    <AuthCard
      title="Create account"
      description="We'll email you a link to verify your address."
      footer={{
        prompt: "Already have an account?",
        linkLabel: "Sign in",
        href: AUTH_ROUTES.login,
      }}
    >
      <SignUpForm />
    </AuthCard>
  )
}
