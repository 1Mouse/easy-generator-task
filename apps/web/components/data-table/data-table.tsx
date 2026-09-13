"use client"

import { Fragment } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import type { DataTableProps, DataTableQueryParsers } from "./types"
import { DataTableToolbar } from "./data-table-toolbar"
import { DataTablePagination } from "./data-table-pagination"
import { DataTableEmptyState } from "./data-table-empty-state"

export function DataTable<T, TQueryParsers extends DataTableQueryParsers>({
  data,
  columns,
  queryParsers,
  toolbarConfig,
  emptyState,
  mobileCard,
  getRowId,
  entityName,
}: DataTableProps<T, TQueryParsers>) {
  const table = useReactTable({
    data: data.data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: data.totalPages,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    state: {
      pagination: {
        pageIndex: data.page - 1,
        pageSize: data.pageSize,
      },
    },
  })

  return (
    <div className="flex flex-col gap-4" data-testid="data-table">
      <DataTableToolbar config={toolbarConfig} queryParsers={queryParsers} />

      {data.data.length === 0 ? (
        <div className="border-2 border-border bg-card shadow-md">
          <DataTableEmptyState config={emptyState} />
        </div>
      ) : (
        <>
          <div
            className={cn(
              "border-2 border-border bg-card shadow-md",
              mobileCard && "hidden md:block"
            )}
          >
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="border-b-2 border-border bg-muted hover:bg-muted"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="text-xs font-bold tracking-wider uppercase"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row, index) => (
                  <TableRow
                    key={row.id}
                    data-testid={`data-table-row-${row.id}`}
                    className={cn(
                      "border-b border-border transition-colors hover:bg-secondary/20",
                      index % 2 === 1 && "bg-muted/40"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {mobileCard && (
            <div
              className="flex flex-col gap-3 md:hidden"
              data-testid="mobile-card-container"
            >
              {data.data.map((item, index) => (
                <Fragment key={getRowId?.(item) ?? index}>
                  {mobileCard(item, index)}
                </Fragment>
              ))}
            </div>
          )}
        </>
      )}

      {data.totalPages > 1 && (
        <DataTablePagination
          pagination={{
            page: data.page,
            totalPages: data.totalPages,
            total: data.total,
            pageSize: data.pageSize,
          }}
          queryParsers={queryParsers}
          entityName={entityName}
        />
      )}
    </div>
  )
}
