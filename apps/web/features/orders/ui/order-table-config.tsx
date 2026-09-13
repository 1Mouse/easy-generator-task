import {
  PackageIcon,
  SortAscendingIcon,
  SortDescendingIcon,
} from "@phosphor-icons/react"

import type {
  EmptyStateConfig,
  ToolbarConfig,
} from "@/components/data-table/types"

import { ORDER_STATUSES } from "../model"
import type { OrderListQueryParsers } from "../query-state"

type OrderTableQueryKey = Extract<keyof OrderListQueryParsers, string>

export const orderTableToolbarConfig = {
  search: {
    placeholder: "Search by name or ID...",
    paramKey: "search",
  },
  filters: [
    {
      label: "All Statuses",
      paramKey: "status",
      options: ORDER_STATUSES.map((status) => ({
        label: status,
        value: status,
      })),
    },
  ],
  sort: {
    paramKey: "sort",
    options: [
      {
        value: "desc",
        label: "Newest first",
        icon: <SortDescendingIcon className="size-4" />,
      },
      {
        value: "asc",
        label: "Oldest first",
        icon: <SortAscendingIcon className="size-4" />,
      },
    ],
  },
} satisfies ToolbarConfig<OrderTableQueryKey>

export const orderTableEmptyState = {
  icon: <PackageIcon className="size-4" />,
  title: "No orders found",
  description: "Try adjusting your search or filter criteria.",
} satisfies EmptyStateConfig
