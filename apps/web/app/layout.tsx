import type { Metadata } from "next"
import { DM_Sans, Space_Mono } from "next/font/google"

import "@workspace/ui/globals.css"
import { AppProviders } from "@/providers"
import { ThemeToggle } from "@/components/theme-toggle"
import { env } from "@/env"
import { cn } from "@workspace/ui/lib/utils"

const siteImagePath = "/assets/rabbit-logo.png"

const fontSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    default: "Rabbit Orders",
    template: "%s | Rabbit Orders",
  },
  description:
    "Manage and track customer orders — Rabbit, your household reliable friend.",
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  openGraph: {
    title: "Rabbit Orders",
    description:
      "Manage and track customer orders — Rabbit, your household reliable friend.",
    type: "website",
    images: [
      {
        url: siteImagePath,
        alt: "Rabbit Orders logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [siteImagePath],
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
