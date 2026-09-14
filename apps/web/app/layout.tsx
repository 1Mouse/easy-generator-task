import type { Metadata } from "next"
import { DM_Sans, Space_Mono } from "next/font/google"

import "@workspace/ui/globals.css"
import { AppProviders } from "@/providers"
import { ThemeToggle } from "@/components/theme-toggle"
import { env } from "@/env"
import { cn } from "@workspace/ui/lib/utils"

const fontSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
})

const description = "Manage and track customer orders — calm, ordered, Orderly."

export const metadata: Metadata = {
  title: {
    default: "Orderly",
    template: "%s | Orderly",
  },
  description,
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  openGraph: {
    title: "Orderly",
    description,
    type: "website",
    // No explicit `images` here on purpose: `opengraph-image.tsx` generates the
    // social card, and Next wires it up automatically. Pointing these at the
    // SVG logo instead would break previews — most scrapers reject SVG.
  },
  twitter: {
    card: "summary_large_image",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontSans.variable,
        "font-mono",
        fontMono.variable
      )}
    >
      <body>
        <AppProviders>
          <div className="fixed end-4 top-4 z-50">
            <ThemeToggle />
          </div>
          {children}
        </AppProviders>
      </body>
    </html>
  )
}
