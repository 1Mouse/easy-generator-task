import type { APIRequestContext } from "@playwright/test"

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025"

interface MailpitMessage {
  Snippet: string
}

/**
 * Polls Mailpit for the verification email sent to `email` and pulls the token
 * out of the link. Mirrors how a real user would read it out of their inbox.
 */
export async function waitForVerificationToken(
  request: APIRequestContext,
  email: string,
  timeoutMs = 10_000
): Promise<string> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const response = await request.get(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`
    )

    if (response.ok()) {
      const { messages } = (await response.json()) as {
        messages: MailpitMessage[]
      }
      const token = messages[0]?.Snippet.match(/[?&]token=([^&\s"]+)/)?.[1]
      if (token) return token
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(
    `No verification email for ${email} arrived at ${MAILPIT_URL} within ${timeoutMs}ms. ` +
      `Is the stack running (podman compose up -d)?`
  )
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`
}

export const TEST_PASSWORD = "Str0ng!Pass"
