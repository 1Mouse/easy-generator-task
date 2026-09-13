import "server-only"

import { redirect } from "next/navigation"

import { apiFetch } from "@/features/auth/server/api"
import { AUTH_ROUTES } from "@/features/auth/constants"
import { readTokens } from "@/features/auth/server/session-cookies"
import { ApiError } from "@/lib/api-error"

import type { OrderListQuery } from "../query-state"
import type { PaginatedOrders } from "../model"

function toSearchParams(query: OrderListQuery): string {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    sort: query.sort,
  })
  if (query.status) params.set("status", query.status)
  if (query.search) params.set("search", query.search)
  return params.toString()
}

/**
 * Reads the protected orders endpoint on behalf of the signed-in user. The
 * proxy has already rotated an expired access token by the time we get here, so
 * a 401 at this point means the session is genuinely gone.
 */
export async function fetchOrders(
  query: OrderListQuery
): Promise<PaginatedOrders> {
  const { accessToken } = await readTokens()

  if (!accessToken) {
    redirect(`${AUTH_ROUTES.login}?next=/orders`)
  }

  try {
    return await apiFetch<PaginatedOrders>(
      `/api/orders?${toSearchParams(query)}`,
      { accessToken }
    )
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) {
      redirect(`${AUTH_ROUTES.login}?next=/orders`)
    }
    throw error
  }
}
