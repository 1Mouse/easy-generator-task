import { cn } from "@workspace/ui/lib/utils"

interface LogoProps {
  /** Hide the wordmark and show the mark alone. */
  markOnly?: boolean
  className?: string
}

/**
 * Inline rather than an <Image> so the mark inherits theme colours, stays crisp
 * at any size, and costs no extra request. The standalone asset in
 * `public/assets/orderly-logo.svg` exists for contexts that need a URL.
 */
export function Logo({ markOnly = false, className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 96 96"
        role="img"
        aria-label={markOnly ? "Orderly" : undefined}
        aria-hidden={markOnly ? undefined : true}
        className="size-8 shrink-0"
      >
        <rect width="96" height="96" className="fill-primary" />
        <circle
          cx="48"
          cy="48"
          r="26"
          strokeWidth="12"
          fill="none"
          className="stroke-primary-foreground"
        />
      </svg>
      {markOnly ? null : (
        <span className="text-xl font-bold tracking-tight">Orderly</span>
      )}
    </span>
  )
}
