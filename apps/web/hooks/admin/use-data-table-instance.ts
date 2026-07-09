"use no memo";
import * as React from "react";

import {
  type ColumnDef,
  type ColumnFiltersState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  type SortingState,
  type GroupingState,
  type ExpandedState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";

type UseDataTableInstanceProps<TData, TValue> = {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  enableRowSelection?: boolean;
  defaultPageIndex?: number;
  defaultPageSize?: number;
  getRowId?: (row: TData, index: number) => string;
  globalFilter?: any;
  onGlobalFilterChange?: (value: any) => void;
  initialGrouping?: GroupingState;
};

export function useDataTableInstance<TData, TValue>({
  data,
  columns,
  enableRowSelection = true,
  defaultPageIndex,
  defaultPageSize,
  getRowId,
  globalFilter,
  onGlobalFilterChange,
  initialGrouping = [],
}: UseDataTableInstanceProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [grouping, setGrouping] = React.useState<GroupingState>(initialGrouping);
  const [expanded, setExpanded] = React.useState<ExpandedState>(true); // All expanded by default

  const [pagination, setPagination] = React.useState({
    pageIndex: defaultPageIndex ?? 0,
    pageSize: defaultPageSize ?? 1000, // Show all by default for better scanability with virtualization
  });

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
      globalFilter,
      grouping,
      expanded,
    },
    enableRowSelection,
    getRowId: getRowId ?? ((row) => (row as any).id.toString()),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onGlobalFilterChange: onGlobalFilterChange,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    // Disable auto-reset behaviors to prevent state updates during render
    autoResetPageIndex: false,
    autoResetExpanded: false,
    autoResetAll: false,
  });

  return table;
}
