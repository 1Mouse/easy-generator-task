"use client"

import { Button } from "@workspace/ui/components/button"

import { useFormContext } from "./form-contexts"

interface SubmitButtonProps extends React.ComponentProps<typeof Button> {
  label: string
  pendingLabel?: string
}

/**
 * Subscribes to the form's own submit state so callers never have to thread
 * `isSubmitting` through by hand.
 */
export function SubmitButton({
  label,
  pendingLabel = "Please wait…",
  ...props
}: SubmitButtonProps) {
  const form = useFormContext()

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button type="submit" disabled={isSubmitting} {...props}>
          {isSubmitting ? pendingLabel : label}
        </Button>
      )}
    </form.Subscribe>
  )
}
