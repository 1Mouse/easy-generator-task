import type { PaginatedResponse } from "@/types/pagination"

export const ORDER_STATUSES = [
  "New",
  "Picking",
  "Delivering",
  "Delivered",
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export interface Order {
  id: string
  customerName: string
  status: OrderStatus
  items: string[]
  createdAt: string
}

export type PaginatedOrders = PaginatedResponse<Order>
