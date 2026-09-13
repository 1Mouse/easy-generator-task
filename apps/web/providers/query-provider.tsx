"use client"

import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { ApiError } from "@/lib/api-error"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Retrying an auth failure just delays the redirect; anything else gets
        // one retry for transient network blips.
        retry: (failureCount, error) =>
          error instanceof ApiError && error.status < 500
            ? false
            : failureCount < 1,
      },
    },
  })
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Created in state so each browser session gets one client, and so a client
  // is never shared across requests during SSR.
  const [queryClient] = useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
