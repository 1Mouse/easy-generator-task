import Image from "next/image"
import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Link href="/" aria-label="Home">
        <Image
          src="/assets/rabbit-logo.png"
          alt="Rabbit"
          width={160}
          height={40}
          priority
          className="h-auto not-dark:bg-primary"
        />
      </Link>
      {children}
    </main>
  )
}
