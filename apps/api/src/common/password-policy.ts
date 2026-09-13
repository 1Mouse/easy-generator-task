export const MIN_NAME_LENGTH = 3
export const MIN_PASSWORD_LENGTH = 8

// Requires at least one letter, one digit, and one special character.
// Keep in sync with the frontend's sign-up validation once it's built (apps/web).
export const PASSWORD_POLICY_REGEX =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/

export const PASSWORD_POLICY_MESSAGE =
  "Password must contain at least one letter, one number, and one special character"
