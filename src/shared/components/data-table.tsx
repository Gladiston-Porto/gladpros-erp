"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  ColumnFiltersState,
  useReactTable,
} from "@tanstack/react-table";
import { cn } from "@/shared/lib/utils";
import { Input } from "@gladpros/ui/input";
import { Button } from "@gladpros/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@gladpros/ui/table";

export interface DataTableProps<TData extends Record<string, unknown>, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchable?: boolean;
  searchKey?: keyof TData & string;
  searchPlaceholder?: string;
  pageSize?: number;
  className?: string;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData extends Record<string, unknown>, TValue>({
  columns,
  data,
  searchable,
  searchKey,
  searchPlaceholder = "Pesquisar...",
  pageSize = 10,
  className,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const enableSearch = searchable ?? Boolean(searchKey);

  const filteredData = React.useMemo(() => {
    if (!enableSearch || !searchKey || !globalFilter.trim()) {
      return data;
    }

    const term = globalFilter.toLowerCase();
    return data.filter((item) => {
      const value = item?.[searchKey];
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(term);
    });
  }, [data, enableSearch, globalFilter, searchKey]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
  });

  return (
    <div className={cn("space-y-4", className)}>
      {enableSearch && (
        <div className="flex items-center">
          <Input
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder={searchPlaceholder}
            className="max-w-sm"
          />
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          "flex items-center gap-2",
                          header.column.getCanSort() && "cursor-pointer select-none"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <span className="text-muted-foreground">
                            {{
                              asc: "↑",
                              desc: "↓",
                            }[header.column.getIsSorted() as string] ?? "↕"}
                          </span>
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    onRowClick && "cursor-pointer hover:bg-muted/60"
                  )}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {table.getState().pagination.pageIndex * pageSize + 1} a {" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * pageSize,
              filteredData.length
            )}{" "}
            de {filteredData.length} resultados
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
