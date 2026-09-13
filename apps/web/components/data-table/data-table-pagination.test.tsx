import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DataTablePagination } from "./data-table-pagination"
import { parseAsInteger } from "nuqs"

const mockSetParams = vi.fn()

vi.mock("nuqs", async () => {
  const actual = await vi.importActual("nuqs")
  return {
    ...actual,
    useQueryStates: () => [{}, mockSetParams],
  }
})

const queryParsers = {
  page: parseAsInteger.withDefault(1),
}

describe("DataTablePagination", () => {
  beforeEach(() => {
    cleanup()
    mockSetParams.mockClear()
  })

  it("renders showing X-Y of Z items", () => {
    render(
      <DataTablePagination
        pagination={{ page: 1, totalPages: 3, total: 25, pageSize: 10 }}
        queryParsers={queryParsers}
      />
    )

    expect(screen.getByText("1-10")).toBeInTheDocument()
    expect(screen.getByText("25")).toBeInTheDocument()
  })

  it("renders page number buttons", () => {
    render(
      <DataTablePagination
        pagination={{ page: 1, totalPages: 3, total: 25, pageSize: 10 }}
        queryParsers={queryParsers}
      />
    )

    const buttons = screen.getAllByRole("button")
    // prev + pages 1,2,3 + next = 5 buttons
    expect(buttons).toHaveLength(5)
  })

  it("disables previous button on first page", () => {
    render(
      <DataTablePagination
        pagination={{ page: 1, totalPages: 3, total: 25, pageSize: 10 }}
        queryParsers={queryParsers}
      />
    )

    const buttons = screen.getAllByRole("button")
    expect(buttons[0]).toBeDisabled()
  })

  it("disables next button on last page", () => {
    render(
      <DataTablePagination
        pagination={{ page: 3, totalPages: 3, total: 25, pageSize: 10 }}
        queryParsers={queryParsers}
      />
    )

    const buttons = screen.getAllByRole("button")
    expect(buttons[buttons.length - 1]).toBeDisabled()
  })

  it("calls setParams when clicking next page", async () => {
    const user = userEvent.setup()

    render(
      <DataTablePagination
        pagination={{ page: 1, totalPages: 3, total: 25, pageSize: 10 }}
        queryParsers={queryParsers}
      />
    )

    // Click the last button (next)
    const buttons = screen.getAllByRole("button")
    const nextButton = buttons[buttons.length - 1]!
    await user.click(nextButton)

    expect(mockSetParams).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 })
    )
  })

  it("uses custom entityName", () => {
    render(
      <DataTablePagination
        pagination={{ page: 1, totalPages: 1, total: 5, pageSize: 10 }}
        queryParsers={queryParsers}
        entityName="orders"
      />
    )

    expect(screen.getByText(/orders/)).toBeInTheDocument()
  })
})
