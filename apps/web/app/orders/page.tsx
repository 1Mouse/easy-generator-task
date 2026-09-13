import type { Metadata } from "next"

import { SessionBadge } from "@/features/auth/ui/session-badge"
import { loadOrderListQuery } from "@/features/orders/query-state"
import { fetchOrders } from "@/features/orders/server/fetch-orders"
import { OrderTable } from "@/features/orders/ui/order-table"

export const metadata: Metadata = {
  title: "Orders",
}

export default async function OrdersPage(props: PageProps<"/orders">) {
  const query = await loadOrderListQuery(props.searchParams)
  const data = await fetchOrders(query)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            data-testid="page-heading"
          >
            Orders
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and track all customer orders.
          </p>
        </div>
        <SessionBadge />
      </div>
      <OrderTable data={data} />
    </main>
  )
}
