import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { DataTableEmptyState } from "./data-table-empty-state"

describe("DataTableEmptyState", () => {
  it("renders title and description", () => {
    render(
      <DataTableEmptyState
        config={{
          icon: <span data-testid="icon">icon</span>,
          title: "No results",
          description: "Try a different search",
        }}
      />
    )

    expect(screen.getByText("No results")).toBeInTheDocument()
    expect(screen.getByText("Try a different search")).toBeInTheDocument()
    expect(screen.getByTestId("icon")).toBeInTheDocument()
  })
})
