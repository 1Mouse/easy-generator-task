"use client"

import { useQuery } from "@tanstack/react-query"

import { fetchSession } from "../client/auth-api"

export const sessionQueryKey = ["session"] as const

/**
 * The signed-in user, for chrome that needs it (greeting, sign-out button).
 * Mutations invalidate this key so the UI follows the session automatically.
 */
export function useSession() {
  const query = useQuery({
    queryKey: sessionQueryKey,
    queryFn: fetchSession,
    staleTime: 60_000,
    retry: false,
  })

  return {
    user: query.data ?? null,
    isPending: query.isPending,
    isAuthenticated: Boolean(query.data),
  }
}
