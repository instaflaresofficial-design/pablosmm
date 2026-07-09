"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Loader2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/admin/ui/table";
import { getApiBaseUrl } from "@/lib/config";
import { useAuth } from "@/components/providers/auth-provider";

export interface Order {
    id: number;
    serviceId: string;
    charge: number;
    quantity: number;
    status: string;
    date: string;
    link: string;
    startCount: number;
    remains: number;
}

interface OrdersTableProps {
    orders: Order[];
    loading: boolean;
    onRefresh: () => void;
}

export function OrdersTable({ orders, loading, onRefresh }: OrdersTableProps) {
    const { convertPrice } = useAuth();
    const [cancelling, setCancelling] = useState<number | null>(null);

    const handleCancel = async (id: number) => {
        if (!confirm("Are you sure you want to cancel this order? Funds will be refunded.")) return;

        setCancelling(id);
        try {
            const res = await fetch(`${getApiBaseUrl()}/orders/${id}/cancel`, {
                method: "POST",
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to cancel");
            }

            const data = await res.json();
            toast.success("Order canceled successfully");
            if (data.newBalance !== undefined) {
                toast.info(`Refunded. New Balance: ${convertPrice(data.newBalance)}`);
            }
            onRefresh();
        } catch (error: any) {
            toast.error(error.message || "Failed to cancel order");
        } finally {
            setCancelling(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "default"; // black
            case "active": return "secondary";  // gray
            case "pending": return "outline";
            case "processing": return "outline"; // blue-ish usually
            case "canceled": return "destructive";
            case "failed": return "destructive";
            default: return "secondary";
        }
    };

    return (
        <div className="rounded-md border bg-white shadow-sm">
            <Table>
                <TableHeader className="bg-orange-500">
                    <TableRow className="hover:bg-orange-600 border-none">
                        <TableHead className="text-white font-bold">Order ID</TableHead>
                        <TableHead className="text-white font-bold">Date</TableHead>
                        <TableHead className="text-white font-bold">Link</TableHead>
                        <TableHead className="text-white font-bold">Charge</TableHead>
                        <TableHead className="text-white font-bold">Start count</TableHead>
                        <TableHead className="text-white font-bold">Quantity</TableHead>
                        <TableHead className="text-white font-bold">Service</TableHead>
                        <TableHead className="text-white font-bold">Status</TableHead>
                        <TableHead className="text-white font-bold">Remains</TableHead>
                        <TableHead className="text-white font-bold text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={10} className="h-24 text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                            </TableCell>
                        </TableRow>
                    ) : orders.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                                No orders found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        orders.map((order) => (
                            <TableRow key={order.id} className="hover:bg-gray-50">
                                <TableCell className="font-mono text-xs">{order.id}</TableCell>
                                <TableCell className="text-xs">
                                    <div>{order.date ? format(new Date(order.date), "yyyy-MM-dd") : "-"}</div>
                                    <div className="text-muted-foreground">{order.date ? format(new Date(order.date), "HH:mm:ss") : ""}</div>
                                </TableCell>
                                <TableCell className="max-w-[150px] truncate">
                                    <a href={order.link} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">
                                        {order.link}
                                    </a>
                                </TableCell>
                                <TableCell className="font-bold text-xs">{convertPrice(order.charge)}</TableCell>
                                <TableCell className="text-xs">{order.startCount}</TableCell>
                                <TableCell className="text-xs">{order.quantity}</TableCell>
                                <TableCell className="text-xs max-w-[200px] truncate" title={order.serviceId}>
                                    {order.serviceId}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={getStatusColor(order.status) as any} className="uppercase text-[10px]">
                                        {order.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs">{order.remains}</TableCell>
                                <TableCell className="text-right">
                                    {(order.status === 'pending' || order.status === 'processing') && (
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="h-7 text-xs px-2"
                                            disabled={cancelling === order.id}
                                            onClick={() => handleCancel(order.id)}
                                        >
                                            {cancelling === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancel"}
                                        </Button>
                                    )}
                                    {(order.status === 'completed' || order.status === 'canceled') && (
                                        <Button size="sm" variant="outline" className="h-7 text-xs px-2 bg-orange-500 text-white hover:bg-orange-600 hover:text-white border-none">
                                            Reorder
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
