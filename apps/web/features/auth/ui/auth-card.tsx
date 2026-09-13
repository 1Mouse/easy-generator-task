import Link from "next/link"

interface AuthCardProps {
  title: string
  description?: string
  children: React.ReactNode
  footer?: { prompt: string; linkLabel: string; href: string }
}

/** Shared shell for every auth screen so they stay visually identical. */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <div className="w-full max-w-sm border border-border bg-card p-6">
      <div className="mb-5 space-y-1">
        <h1 className="text-lg font-bold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {children}

      {footer ? (
        <p className="mt-5 text-xs text-muted-foreground">
          {footer.prompt}{" "}
          <Link
            href={footer.href}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {footer.linkLabel}
          </Link>
        </p>
      ) : null}
    </div>
  )
}
