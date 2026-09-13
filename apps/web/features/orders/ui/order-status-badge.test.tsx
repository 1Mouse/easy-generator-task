import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { OrderStatusBadge } from "./order-status-badge"
import { ORDER_STATUSES } from "../model"

describe("OrderStatusBadge", () => {
  it.each(ORDER_STATUSES)("renders '%s' status text", (status) => {
    render(<OrderStatusBadge status={status} />)
    expect(screen.getByText(status)).toBeInTheDocument()
  })
})
