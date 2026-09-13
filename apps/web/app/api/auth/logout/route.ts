import { revokeRefreshToken } from "@/features/auth/server/api"
import { clearedSessionResponse } from "@/features/auth/server/route-helpers"
import { readTokens } from "@/features/auth/server/session-cookies"

export async function POST() {
  const { refreshToken } = await readTokens()

  if (refreshToken) {
    // Best effort: even if the API rejects the token (already revoked, expired)
    // the cookies still get cleared, so the user is signed out locally either
    // way and never gets stuck in a half-authenticated state.
    await revokeRefreshToken(refreshToken).catch(() => undefined)
  }

  return clearedSessionResponse()
}
