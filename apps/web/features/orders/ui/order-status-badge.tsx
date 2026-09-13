import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

import type { OrderStatus } from "../model"

const statusStyles: Record<OrderStatus, string> = {
  New: "bg-secondary text-secondary-foreground",
  Picking: "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100",
  Delivering:
    "bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100",
  Delivered: "bg-primary text-primary-foreground",
}

interface OrderStatusBadgeProps {
  status: OrderStatus
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-bold", statusStyles[status])}
      data-testid="order-status-badge"
    >
      {status}
    </Badge>
  )
}
