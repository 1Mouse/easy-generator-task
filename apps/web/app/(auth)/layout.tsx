import Link from "next/link"

import { Logo } from "@/components/brand/logo"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Link href="/" aria-label="Orderly home">
        <Logo />
      </Link>
      {children}
    </main>
  )
}
