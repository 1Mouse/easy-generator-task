"use client"

import { createFormHook } from "@tanstack/react-form"

import { fieldContext, formContext } from "./form-contexts"
import { SubmitButton } from "./submit-button"
import { TextField } from "./text-field"

/**
 * The app's form entry point. `useAppForm` returns a form whose fields already
 * know about our components, so a screen only describes *what* it collects:
 *
 *   const form = useAppForm({ defaultValues, validators: { onSubmit: schema } })
 *   <form.AppField name="email">{(f) => <f.TextField label="Email" />}</form.AppField>
 *   <form.AppForm><form.SubmitButton label="Sign in" /></form.AppForm>
 */
export const { useAppForm, withForm } = createFormHook({
  fieldComponents: { TextField },
  formComponents: { SubmitButton },
  fieldContext,
  formContext,
})

export { TextField, SubmitButton }
