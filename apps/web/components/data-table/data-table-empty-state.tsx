import type { EmptyStateConfig } from "./types"

interface DataTableEmptyStateProps {
  config: EmptyStateConfig
}

export function DataTableEmptyState({ config }: DataTableEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-16"
      data-testid="empty-state"
    >
      <div className="text-muted-foreground [&>svg]:size-12">{config.icon}</div>
      <div className="text-center">
        <p className="text-lg font-bold">{config.title}</p>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </div>
    </div>
  )
}
