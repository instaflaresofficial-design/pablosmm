"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/config";
import { Card } from "@/components/admin/ui/card";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/admin/ui/table";

interface OrderRequest {
    id: number;
    order_id: number;
    user_id: number;
    email: string;
    username: string;
    request_type: string;
    status: string;
    created_at: string;
    service_id: string;
    quantity: number;
    order_status: string;
    provider_order_id?: string;
    provider_response?: string;
}

export default function OrderRequestsPage() {
    const [requests, setRequests] = useState<OrderRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<number | null>(null);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/admin/order-requests`);
            if (res.ok) {
                const data = await res.json();
                setRequests(data.requests || []);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch requests");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (id: number, action: 'approve' | 'reject') => {
        setProcessing(id);
        try {
            const res = await fetch(`${getApiBaseUrl()}/admin/order-requests/${id}/${action}`, {
                method: "POST"
            });
            if (!res.ok) throw new Error("Action failed");

            toast.success(`Request ${action}d successfully`);
            fetchRequests(); // Refresh list
        } catch (error) {
            toast.error(`Failed to ${action} request`);
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Order Requests</h2>
                <p className="text-muted-foreground">Manage manual cancel and refill requests from users.</p>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Service / Qty</TableHead>
                            <TableHead>Order Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ) : requests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No pending requests found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            requests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {new Date(req.created_at).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{req.username}</span>
                                            <span className="text-xs text-muted-foreground">{req.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono font-bold">
                                        #{req.order_id}
                                        {req.provider_order_id && (
                                            <div className="text-xs font-normal text-muted-foreground mt-1">
                                                Prov: #{req.provider_order_id}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={req.request_type === 'cancel' ? 'destructive' : 'default'}>
                                            {req.request_type.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-xs">{req.service_id}</span>
                                            <span className="text-xs font-mono text-muted-foreground">Qty: {req.quantity}</span>
                                            {req.provider_response && (
                                                <div className="mt-2 text-[10px] bg-muted text-muted-foreground p-1 rounded font-mono max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap" title={req.provider_response}>
                                                    {req.provider_response}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{req.order_status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {req.status === 'pending' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    disabled={processing === req.id}
                                                    onClick={() => handleAction(req.id, 'approve')}
                                                >
                                                    <CheckCircle size={16} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    disabled={processing === req.id}
                                                    onClick={() => handleAction(req.id, 'reject')}
                                                >
                                                    <XCircle size={16} />
                                                </Button>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
