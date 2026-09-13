import type { ColumnDef } from "@tanstack/react-table"
import type { ReactNode } from "react"
import type { ParserWithOptionalDefault, UseQueryStatesKeysMap } from "nuqs"

import type { PaginatedResponse } from "@/types/pagination"
export type { PaginatedResponse } from "@/types/pagination"

export type DataTableQueryParsers = UseQueryStatesKeysMap & {
  page: ParserWithOptionalDefault<number>
}

export interface SearchConfig<TKey extends string = string> {
  placeholder: string
  paramKey: TKey
}

export interface FilterOption {
  label: string
  value: string
}

export interface FilterConfig<TKey extends string = string> {
  label: string
  paramKey: TKey
  options: FilterOption[]
}

export interface SortOption {
  value: string
  label: string
  icon: ReactNode
}

export interface SortConfig<TKey extends string = string> {
  paramKey: TKey
  options: SortOption[]
}

export interface ToolbarConfig<TKey extends string = string> {
  search?: SearchConfig<TKey>
  filters?: FilterConfig<TKey>[]
  sort?: SortConfig<TKey>
}

export interface EmptyStateConfig {
  icon: ReactNode
  title: string
  description: string
}

export type MobileCardRenderer<T> = (item: T, index: number) => ReactNode

export interface DataTableProps<
  T,
  TQueryParsers extends DataTableQueryParsers,
> {
  data: PaginatedResponse<T>
  columns: ColumnDef<T>[]
  queryParsers: TQueryParsers
  toolbarConfig: ToolbarConfig<Extract<keyof TQueryParsers, string>>
  emptyState: EmptyStateConfig
  mobileCard?: MobileCardRenderer<T>
  getRowId?: (row: T) => string
  entityName?: string
}
