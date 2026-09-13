import type { Order, PaginatedOrders } from "../model"
import { normalizeOrderListQuery, type OrderListQuery } from "../query-state"
import { MOCK_ORDERS } from "./mock-orders"

export function listOrders(
  params: OrderListQuery,
  allOrders: Order[] = MOCK_ORDERS
): PaginatedOrders {
  const query = normalizeOrderListQuery(params)

  let filteredOrders = allOrders

  if (query.status) {
    filteredOrders = filteredOrders.filter(
      (order) => order.status === query.status
    )
  }

  if (query.search) {
    const searchTerm = query.search.toLowerCase()
    filteredOrders = filteredOrders.filter(
      (order) =>
        order.customerName.toLowerCase().includes(searchTerm) ||
        order.id.toLowerCase().includes(searchTerm)
    )
  }

  const sortedOrders = [...filteredOrders].sort((left, right) => {
    const timeDifference =
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()

    return query.sort === "asc" ? timeDifference : -timeDifference
  })

  const total = sortedOrders.length
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize))
  const page = Math.min(query.page, totalPages)
  const startIndex = (page - 1) * query.pageSize
  const data = sortedOrders.slice(startIndex, startIndex + query.pageSize)

  return {
    data,
    total,
    page,
    pageSize: query.pageSize,
    totalPages,
  }
}
