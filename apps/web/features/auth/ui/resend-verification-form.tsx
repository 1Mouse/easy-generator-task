"use client"

import { useAppForm } from "@/components/form"

import { useResendVerification } from "../hooks/use-auth-mutations"
import { resendVerificationSchema } from "../schemas"

/**
 * Shown on the failure states of the verify-email page: an expired or
 * already-used link is only recoverable by sending a new one.
 */
export function ResendVerificationForm({
  defaultEmail = "",
}: {
  defaultEmail?: string
}) {
  const resend = useResendVerification()

  const form = useAppForm({
    defaultValues: { email: defaultEmail },
    validators: { onSubmit: resendVerificationSchema },
    onSubmit: async ({ value }) => {
      await resend.mutateAsync(value).catch(() => undefined)
    },
  })

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
      className="flex flex-col gap-3"
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

      <form.AppForm>
        <form.SubmitButton
          label="Send a new link"
          pendingLabel="Sending…"
          variant="outline"
          className="w-full"
        />
      </form.AppForm>
    </form>
  )
}
