"use client"

import type { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table/data-table"

import type { Order, PaginatedOrders } from "../model"
import { orderListQueryParsers } from "../query-state"
import { OrderMobileCard } from "./order-mobile-card"
import { orderTableColumns } from "./order-table-columns"
import {
  orderTableEmptyState,
  orderTableToolbarConfig,
} from "./order-table-config"

interface OrderTableProps {
  data: PaginatedOrders
}

export function OrderTable({ data }: OrderTableProps) {
  return (
    <DataTable
      data={data}
      columns={orderTableColumns as ColumnDef<Order>[]}
      queryParsers={orderListQueryParsers}
      toolbarConfig={orderTableToolbarConfig}
      emptyState={orderTableEmptyState}
      mobileCard={(order, index) => (
        <OrderMobileCard order={order} index={index} />
      )}
      getRowId={(order) => order.id}
      entityName="orders"
    />
  )
}
