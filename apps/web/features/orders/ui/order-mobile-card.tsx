import { cn } from "@workspace/ui/lib/utils"

import type { Order } from "../model"
import { formatOrderDate } from "./order-formatters"
import { OrderStatusBadge } from "./order-status-badge"

interface OrderMobileCardProps {
  order: Order
  index: number
}

export function OrderMobileCard({ order, index }: OrderMobileCardProps) {
  return (
    <div
      data-testid={`mobile-card-${order.id}`}
      className={cn(
        "border-2 border-border p-4 shadow-sm",
        index % 2 === 1 && "bg-muted/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs font-bold">{order.id}</p>
          <p className="font-semibold">{order.customerName}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        <p>{order.items.join(", ")}</p>
        <p className="mt-1 tabular-nums">{formatOrderDate(order.createdAt)}</p>
      </div>
    </div>
  )
}
