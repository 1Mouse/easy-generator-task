import { z } from "zod"

// Mirrors apps/api/src/common/password-policy.ts — the API enforces these same
// rules server-side, this is purely so users get feedback before a round trip.
// Keep the two in sync.
const MIN_NAME_LENGTH = 3
const MIN_PASSWORD_LENGTH = 8
const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/

const email = z
  .string()
  .min(1, "Email is required")
  .email("Enter a valid email address")

const password = z
  .string()
  .min(1, "Password is required")
  .min(MIN_PASSWORD_LENGTH, `At least ${MIN_PASSWORD_LENGTH} characters`)
  .regex(
    PASSWORD_POLICY,
    "Must include a letter, a number, and a special character"
  )

export const signUpSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(MIN_NAME_LENGTH, `At least ${MIN_NAME_LENGTH} characters`),
  email,
  password,
})

export const signInSchema = z.object({
  email,
  // Deliberately not the full policy: an existing account's password only has
  // to match, and echoing the rules back on sign-in leaks nothing useful.
  password: z.string().min(1, "Password is required"),
})

export const resendVerificationSchema = z.object({ email })

export type SignUpValues = z.infer<typeof signUpSchema>
export type SignInValues = z.infer<typeof signInSchema>
export type ResendVerificationValues = z.infer<typeof resendVerificationSchema>
