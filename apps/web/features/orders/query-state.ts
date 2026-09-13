import {
  createLoader,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  type ParserMap,
  type SearchParams,
  type inferParserType,
} from "nuqs/server"

import { ORDER_STATUSES } from "./model"

const ORDER_SORT_DIRECTIONS = ["asc", "desc"] as const
const ORDER_STATUS_FILTERS = ["", ...ORDER_STATUSES] as const

export const DEFAULT_ORDER_PAGE = 1
export const DEFAULT_ORDER_PAGE_SIZE = 10
export const MAX_ORDER_PAGE_SIZE = 50

export const orderListQueryParsers = {
  page: parseAsInteger.withDefault(DEFAULT_ORDER_PAGE),
  pageSize: parseAsInteger.withDefault(DEFAULT_ORDER_PAGE_SIZE),
  status: parseAsStringLiteral(ORDER_STATUS_FILTERS).withDefault(""),
  search: parseAsString.withDefault(""),
  sort: parseAsStringLiteral(ORDER_SORT_DIRECTIONS).withDefault("desc"),
} satisfies ParserMap

export type OrderListQueryParsers = typeof orderListQueryParsers
export type OrderListQuery = inferParserType<OrderListQueryParsers>

const loadOrderListQueryInput = createLoader(orderListQueryParsers)

export function normalizeOrderListQuery(
  params: OrderListQuery
): OrderListQuery {
  return {
    ...params,
    page: normalizePositiveInteger(params.page, DEFAULT_ORDER_PAGE),
    pageSize: clampPageSize(params.pageSize),
    search: params.search.trim(),
  }
}

export async function loadOrderListQuery(
  searchParams: SearchParams | Promise<SearchParams>
): Promise<OrderListQuery> {
  const params = loadOrderListQueryInput(await searchParams)
  return normalizeOrderListQuery(params)
}

function normalizePositiveInteger(value: number, fallback: number): number {
  return Number.isInteger(value) && value > 0 ? value : fallback
}

function clampPageSize(value: number): number {
  return Math.min(
    MAX_ORDER_PAGE_SIZE,
    Math.max(1, normalizePositiveInteger(value, DEFAULT_ORDER_PAGE_SIZE))
  )
}
