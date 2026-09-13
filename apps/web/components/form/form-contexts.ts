"use client"

import { createFormHookContexts } from "@tanstack/react-form"

/**
 * Split out from the hook itself because the bound field components need the
 * contexts, and the hook needs the components — importing them in one module
 * would be circular.
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts()
