"use client";

import { useState, useCallback, useEffect } from "react";
import { OrdersTable } from "./_components/orders-table";
import { AdminOrder, columns } from "./_components/columns";
import { Input } from "@/components/admin/ui/input";
import { Card } from "@/components/admin/ui/card";
import { getApiBaseUrl } from "@/lib/config";
import { Loader2, Search } from "lucide-react";
import { OrderDetailsDialog } from "./_components/order-details-dialog";

export default function OrdersPage() {
    const [data, setData] = useState<AdminOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                // page/limit support later
                status: status === "all" ? "" : status,
                // userId support later
            });

            const res = await fetch(`${getApiBaseUrl()}/admin/orders?${params}`);
            if (!res.ok) throw new Error("Failed to fetch orders");

            const json = await res.json();
            setData(json.orders || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [status]);

    const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Local Search Filter
    const filteredData = data.filter(o =>
        o.id.toString().includes(search) ||
        o.userEmail.toLowerCase().includes(search.toLowerCase()) ||
        o.serviceName?.toLowerCase().includes(search.toLowerCase())
    );

    const handleRowClick = (order: AdminOrder) => {
        setSelectedOrder(order);
        setDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
                    <p className="text-muted-foreground">
                        View and manage all customer orders.
                    </p>
                </div>
            </div>

            <Card className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by ID, User, or Service..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="rounded-md border">
                    {loading ? (
                        <div className="flex h-[400px] items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <OrdersTable
                            columns={columns}
                            data={filteredData}
                            onRowClick={handleRowClick}
                        />
                    )}
                </div>
            </Card>

            <OrderDetailsDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                order={selectedOrder}
                onSuccess={fetchOrders}
            />
        </div>
    );
}
