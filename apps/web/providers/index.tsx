import { NuqsAdapter } from "nuqs/adapters/next/app"
import { ThemeProvider } from "@/providers/theme-provider"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <ThemeProvider>{children}</ThemeProvider>
    </NuqsAdapter>
  )
}
