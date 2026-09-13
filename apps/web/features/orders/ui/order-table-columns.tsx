import { createColumnHelper } from "@tanstack/react-table"

import type { Order } from "../model"
import { formatOrderDate, formatOrderItemsSummary } from "./order-formatters"
import { OrderStatusBadge } from "./order-status-badge"

const columnHelper = createColumnHelper<Order>()

export const orderTableColumns = [
  columnHelper.accessor("id", {
    header: "Order ID",
    cell: (info) => (
      <span className="font-mono text-xs font-bold">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("customerName", {
    header: "Customer",
    cell: (info) => <span className="font-semibold">{info.getValue()}</span>,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => <OrderStatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor("items", {
    header: "Items",
    cell: (info) => (
      <span className="text-xs text-muted-foreground">
        {formatOrderItemsSummary(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("createdAt", {
    header: "Created",
    cell: (info) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatOrderDate(info.getValue())}
      </span>
    ),
  }),
]
