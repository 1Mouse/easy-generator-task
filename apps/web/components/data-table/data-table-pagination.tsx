"use client"

import { useCallback } from "react"
import { useQueryStates, type Nullable, type inferParserType } from "nuqs"
import { CaretLeft, CaretRight } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import type { DataTableQueryParsers } from "./types"

type QueryUpdates<TQueryParsers extends DataTableQueryParsers> = Partial<
  Nullable<inferParserType<TQueryParsers>>
>

interface PaginationData {
  page: number
  totalPages: number
  total: number
  pageSize: number
}

interface DataTablePaginationProps<
  TQueryParsers extends DataTableQueryParsers,
> {
  pagination: PaginationData
  queryParsers: TQueryParsers
  entityName?: string
}

function generatePageNumbers(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set<number>([1, total, current, current - 1, current + 1])
  const sorted = [...set]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)
  const pages: (number | "...")[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) pages.push("...")
    pages.push(sorted[i]!)
  }
  return pages
}

export function DataTablePagination<
  TQueryParsers extends DataTableQueryParsers,
>({
  pagination,
  queryParsers,
  entityName = "items",
}: DataTablePaginationProps<TQueryParsers>) {
  const [, setParams] = useQueryStates(queryParsers, { shallow: false })

  const goToPage = useCallback(
    (page: number) => {
      setParams({
        page: page <= 1 ? 1 : page,
      } as unknown as QueryUpdates<TQueryParsers>)
      window.scrollTo({ top: 0, behavior: "smooth" })
    },
    [setParams]
  )

  const { page, totalPages, total, pageSize } = pagination
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
      data-testid="pagination"
    >
      <p
        className="text-sm text-muted-foreground"
        data-testid="pagination-info"
      >
        Showing{" "}
        <span className="font-bold text-foreground">
          {start}-{end}
        </span>{" "}
        of <span className="font-bold text-foreground">{total}</span>{" "}
        {entityName}
      </p>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
          data-testid="pagination-prev"
        >
          <CaretLeft className="size-4" />
        </Button>
        {generatePageNumbers(page, totalPages).map((p, i) =>
          p === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="flex size-7 items-center justify-center text-xs text-muted-foreground"
            >
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="icon-sm"
              onClick={() => goToPage(p)}
              className={cn("text-xs", p === page && "pointer-events-none")}
              data-testid={`pagination-page-${p}`}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page >= totalPages}
          onClick={() => goToPage(page + 1)}
          data-testid="pagination-next"
        >
          <CaretRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
