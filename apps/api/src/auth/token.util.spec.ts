import { describe, expect, it } from "vitest"

import { generateOpaqueToken, hashToken } from "./token.util.js"

describe("token.util", () => {
  it("generates a sufficiently long, url-safe random token", () => {
    const token = generateOpaqueToken()

    expect(token.length).toBeGreaterThanOrEqual(32)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it("generates a different token on each call", () => {
    expect(generateOpaqueToken()).not.toBe(generateOpaqueToken())
  })

  it("hashes deterministically and never returns the input", () => {
    const token = generateOpaqueToken()

    const hash1 = hashToken(token)
    const hash2 = hashToken(token)

    expect(hash1).toBe(hash2)
    expect(hash1).not.toBe(token)
    expect(hash1).toMatch(/^[a-f0-9]{64}$/)
  })
})
