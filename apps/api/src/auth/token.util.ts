import { createHash, randomBytes } from "node:crypto"

// Opaque random token (email verification). Never stored — only its hash is.
export function generateOpaqueToken(): string {
  return randomBytes(48).toString("base64url")
}

// Used for anything persisted as a lookup key: email-verification tokens and
// refresh tokens are both stored as hashes so a database leak can't be replayed.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}
