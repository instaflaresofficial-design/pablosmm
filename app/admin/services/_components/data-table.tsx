"use client";
import * as React from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { useDataTableInstance } from "@/hooks/admin/use-data-table-instance";
import { DataTable as TableUI } from "@/components/admin/data-table/data-table";
import { DataTablePagination } from "@/components/admin/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/admin/data-table/data-table-view-options";
import { serviceColumns } from "./columns";
import type { Service } from "./schema";

export function ServicesTable({
    initialData,
    onSelectionChange
}: {
    initialData: Service[],
    onSelectionChange?: (selectedIds: string[]) => void
}) {
    const [data, setData] = React.useState(initialData);
    const [globalFilter, setGlobalFilter] = React.useState("");

    // Sync data state when initialData changes
    React.useEffect(() => {
        setData(initialData);
    }, [initialData]);

    const [pageSize, setPageSize] = React.useState(50);
    const observerTarget = React.useRef(null);

    const table = useDataTableInstance({
        data,
        columns: serviceColumns,
        globalFilter,
        onGlobalFilterChange: setGlobalFilter,
        getRowId: (row) => row.id,
        initialGrouping: ["providerCategory"],
        defaultPageSize: pageSize,
        defaultPageIndex: 0
    });

    // Sync external state with table state if needed, or just drive table state deeply.
    // Actually useDataTableInstance uses internal state for pagination if not controlled.
    // It seems useDataTableInstance manages state internally but exposes defaults.
    // But since we want to dynamically update pageSize based on scroll, we should control it or update table options.
    // However, table.setPageSize is available.

    // Effectively start with 50.
    React.useEffect(() => {
        table.setPageSize(pageSize);
    }, [pageSize, table]);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    const currentSize = table.getState().pagination.pageSize;
                    const totalRows = table.getFilteredRowModel().rows.length;

                    if (currentSize < totalRows) {
                        setPageSize(prev => Math.min(prev + 50, totalRows + 50));
                    }
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [table]);

    const selectedRows = table.getSelectedRowModel().rows;
    const selectedIds = React.useMemo(() => selectedRows.map(r => r.original.sourceServiceId), [selectedRows]);

    // Track previous selectedIds to avoid redundant calls
    const prevSelectedRef = React.useRef<string[]>([]);

    // Track if component is mounted to avoid state updates on unmounted components
    const isMounted = React.useRef(false);
    React.useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    React.useEffect(() => {
        const isSame = prevSelectedRef.current.length === selectedIds.length &&
            prevSelectedRef.current.every((id, i) => id === selectedIds[i]);

        if (!isSame && onSelectionChange) {
            prevSelectedRef.current = selectedIds;
            // Use setTimeout to defer the state update
            const timeoutId = setTimeout(() => {
                // Double check mount status inside timeout
                if (isMounted.current) {
                    onSelectionChange(selectedIds);
                }
            }, 0);
            return () => clearTimeout(timeoutId);
        }
    }, [selectedIds, onSelectionChange]);

    React.useEffect(() => {
        // Reset selection when data changes (e.g. tab switch)
        // Use a flag to avoid unnecessary resets if already empty
        if (Object.keys(table.getState().rowSelection).length > 0) {
            table.resetRowSelection();
        }
    }, [initialData]); // Remove table from deps to avoid re-triggering

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <div className="relative w-full max-w-sm hidden">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search services..."
                        value={globalFilter ?? ""}
                        onChange={(event) => setGlobalFilter(event.target.value)}
                        className="pl-8"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <DataTableViewOptions table={table} />
                    <Button variant="default" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Custom Service
                    </Button>
                </div>
            </div>
            <div className="rounded-md border">
                <TableUI table={table} columns={serviceColumns} />
                {/* Sentinel for infinite scroll */}
                <div ref={observerTarget} className="h-4 w-full" />
            </div>
            <div className="text-xs text-muted-foreground text-center py-2">
                Showing {Math.min(table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} of {table.getFilteredRowModel().rows.length} results
            </div>
        </div>
    );
}
