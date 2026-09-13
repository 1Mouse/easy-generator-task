"use client"

import {
  debounce,
  useQueryStates,
  type Nullable,
  type inferParserType,
} from "nuqs"
import { MagnifyingGlassIcon, FunnelIcon } from "@phosphor-icons/react"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Button } from "@workspace/ui/components/button"
import type { DataTableQueryParsers, ToolbarConfig } from "./types"

type QueryUpdates<TQueryParsers extends DataTableQueryParsers> = Partial<
  Nullable<inferParserType<TQueryParsers>>
>

const SEARCH_URL_DEBOUNCE = debounce(500)

interface DataTableToolbarProps<TQueryParsers extends DataTableQueryParsers> {
  config: ToolbarConfig<Extract<keyof TQueryParsers, string>>
  queryParsers: TQueryParsers
}

export function DataTableToolbar<TQueryParsers extends DataTableQueryParsers>({
  config,
  queryParsers,
}: DataTableToolbarProps<TQueryParsers>) {
  const [params, setParams] = useQueryStates(queryParsers, {
    shallow: false,
  })

  const searchConfig = config.search
  const sortConfig = config.sort
  const searchKey = searchConfig?.paramKey
  const searchParam = searchKey ? params[searchKey] : undefined
  const searchValue = typeof searchParam === "string" ? searchParam : ""

  function handleSearch(
    paramKey: Extract<keyof TQueryParsers, string>,
    value: string
  ) {
    setParams(createPageResetUpdate(paramKey, value || null), {
      limitUrlUpdates: SEARCH_URL_DEBOUNCE,
    })
  }

  function handleFilterChange(
    paramKey: Extract<keyof TQueryParsers, string>,
    value: string | null
  ) {
    setParams(
      createPageResetUpdate(paramKey, !value || value === "all" ? "" : value)
    )
  }

  function handleSortChange(
    paramKey: Extract<keyof TQueryParsers, string>,
    currentValue: string,
    options: { value: string }[]
  ) {
    const currentIndex = options.findIndex((o) => o.value === currentValue)
    const nextIndex = (currentIndex + 1) % options.length

    setParams(createPageResetUpdate(paramKey, options[nextIndex]!.value))
  }

  const activeSortOption = sortConfig
    ? (sortConfig.options.find(
        (option) => option.value === params[sortConfig.paramKey]
      ) ?? sortConfig.options[0]!)
    : null

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 gap-3">
        {searchConfig && (
          <div className="relative max-w-sm flex-1">
            <MagnifyingGlassIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchConfig.placeholder}
              value={searchValue}
              onChange={(event) =>
                handleSearch(searchConfig.paramKey, event.target.value)
              }
              className="pl-9"
              data-testid="search-input"
            />
          </div>
        )}

        {config.filters?.map((filter) => (
          <Select
            key={filter.paramKey}
            value={
              typeof params[filter.paramKey] === "string" &&
              params[filter.paramKey]
                ? params[filter.paramKey]
                : "all"
            }
            onValueChange={(value) =>
              handleFilterChange(filter.paramKey, value)
            }
          >
            <SelectTrigger
              className="w-[160px]"
              data-testid={`filter-${filter.paramKey}`}
            >
              <FunnelIcon className="mr-1 size-4" />
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{filter.label}</SelectItem>
              {filter.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      {sortConfig && activeSortOption && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const sortKey = sortConfig.paramKey

            handleSortChange(
              sortKey,
              activeSortOption.value,
              sortConfig.options
            )
          }}
          className="gap-1.5"
          data-testid="sort-button"
        >
          <>
            {activeSortOption.icon}
            {activeSortOption.label}
          </>
        </Button>
      )}
    </div>
  )

  function createPageResetUpdate(
    paramKey: Extract<keyof TQueryParsers, string>,
    value: string | null
  ): QueryUpdates<TQueryParsers> {
    return {
      [paramKey]: value,
      page: 1,
    } as unknown as QueryUpdates<TQueryParsers>
  }
}
