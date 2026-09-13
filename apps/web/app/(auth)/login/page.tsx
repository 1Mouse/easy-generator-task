import type { Metadata } from "next"

import { AUTH_ROUTES } from "@/features/auth/constants"
import { AuthCard } from "@/features/auth/ui/auth-card"
import { LoginForm } from "@/features/auth/ui/login-form"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams
  const redirectTo = typeof next === "string" ? next : undefined

  return (
    <AuthCard
      title="Sign in"
      description="Welcome back. Enter your details to continue."
      footer={{
        prompt: "Don't have an account?",
        linkLabel: "Create one",
        href: AUTH_ROUTES.signup,
      }}
    >
      <LoginForm redirectTo={redirectTo} />
    </AuthCard>
  )
}
