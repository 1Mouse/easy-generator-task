"use client"

import { Field, FieldError } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { useFieldContext } from "./form-contexts"

interface TextFieldProps extends React.ComponentProps<typeof Input> {
  label: string
}

/**
 * A form field is always the same three things — label, control, error — so
 * they live together here. Bound to the form via context, so usage is just
 * `<form.AppField name="email">{(f) => <f.TextField label="Email" />}</form.AppField>`.
 */
export function TextField({ label, ...props }: TextFieldProps) {
  const field = useFieldContext<string>()
  // Only nag once the user has left the field or tried to submit.
  const errors = field.state.meta.isTouched ? field.state.meta.errors : []
  const message = errors[0]
  const invalid = Boolean(message)

  return (
    <Field invalid={invalid}>
      <Label htmlFor={field.name}>{label}</Label>
      <Input
        id={field.name}
        name={field.name}
        value={field.state.value}
        onChange={(event) => field.handleChange(event.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={invalid}
        {...props}
      />
      {invalid ? (
        <FieldError match>
          {typeof message === "string" ? message : message?.message}
        </FieldError>
      ) : null}
    </Field>
  )
}
