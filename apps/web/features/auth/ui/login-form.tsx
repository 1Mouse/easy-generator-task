"use client"

import { useAppForm } from "@/components/form"

import { useLogin } from "../hooks/use-auth-mutations"
import { signInSchema } from "../schemas"

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const login = useLogin(redirectTo)

  const form = useAppForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: signInSchema },
    onSubmit: async ({ value }) => {
      // Errors are surfaced as a toast by the mutation itself; swallowing here
      // keeps the form usable instead of leaving it stuck in a submitting state.
      await login.mutateAsync(value).catch(() => undefined)
    },
  })

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
      className="flex flex-col gap-4"
    >
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
            autoComplete="current-password"
          />
        )}
      </form.AppField>

      <form.AppForm>
        <form.SubmitButton
          label="Sign in"
          pendingLabel="Signing in…"
          className="mt-1 w-full"
        />
      </form.AppForm>
    </form>
  )
}
