"use client";

import * as React from "react";
import { useDataTableInstance } from "@/hooks/admin/use-data-table-instance";
import { DataTable as TableUI } from "@/components/admin/data-table/data-table";
import { DataTablePagination } from "@/components/admin/data-table/data-table-pagination";
import { AdminUser, getColumns } from "./columns";

interface UsersTableProps {
    data: AdminUser[];
    pageCount?: number;
    onRowClick?: (row: any) => void;
    onAction?: (action: string, user: AdminUser) => void;
}

export function UsersTable({ data, onRowClick, onAction }: UsersTableProps) {
    const columns = React.useMemo(() => getColumns(onAction || (() => { })), [onAction]);

    const table = useDataTableInstance({
        data,
        columns,
        getRowId: (row) => row.id.toString(),
        defaultPageSize: 50,
    });

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <TableUI table={table} columns={columns} />
            </div>
            <DataTablePagination table={table} />
        </div>
    );
}
