import { NuqsAdapter } from "nuqs/adapters/next/app"
import { ToastProvider } from "@workspace/ui/components/toast"

import { QueryProvider } from "@/providers/query-provider"
import { ThemeProvider } from "@/providers/theme-provider"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <ThemeProvider>
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
      </ThemeProvider>
    </NuqsAdapter>
  )
}
