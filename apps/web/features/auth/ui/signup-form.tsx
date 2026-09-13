"use client"

import { useState } from "react"

import { useAppForm } from "@/components/form"

import { useSignup } from "../hooks/use-auth-mutations"
import { signUpSchema } from "../schemas"

export function SignUpForm() {
  const signup = useSignup()
  const [sentTo, setSentTo] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: { name: "", email: "", password: "" },
    validators: { onSubmit: signUpSchema },
    onSubmit: async ({ value }) => {
      const result = await signup.mutateAsync(value).catch(() => null)
      if (result) setSentTo(value.email)
    },
  })

  // Signup doesn't start a session, so there's nowhere to redirect to — the
  // next step lives in the user's inbox. Say so instead of silently resetting.
  if (sentTo) {
    return (
      <div className="space-y-2 text-xs">
        <p className="font-medium text-foreground">Almost there.</p>
        <p className="text-muted-foreground">
          We sent a verification link to{" "}
          <span className="font-medium text-foreground">{sentTo}</span>. Open it
          to activate your account and sign in.
        </p>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <form.AppField name="name">
        {(field) => (
          <field.TextField
            label="Name"
            autoComplete="name"
            placeholder="Jane Doe"
          />
        )}
      </form.AppField>

      <form.AppField name="email">
        {(field) => (
          <field.TextField
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="jane@example.com"
          />
        )}
      </form.AppField>

      <form.AppField name="password">
        {(field) => (
          <field.TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
        )}
      </form.AppField>

      <form.AppForm>
        <form.SubmitButton
          label="Create account"
          pendingLabel="Creating account…"
          className="mt-1 w-full"
        />
      </form.AppForm>
    </form>
  )
}
