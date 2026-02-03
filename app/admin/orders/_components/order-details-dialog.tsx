"use client";

import { useOrderManagement } from "@/hooks/use-order-management"; // We will create this hook or use fetching logic
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/admin/ui/dialog";
import { Button } from "@/components/admin/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { AdminOrder } from "../../orders/_components/columns"; // Import type
import { useState } from "react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/lib/config";

interface OrderDetailsDialogProps {
    order: AdminOrder | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function OrderDetailsDialog({ order, open, onOpenChange, onSuccess }: OrderDetailsDialogProps) {
    const [refunding, setRefunding] = useState(false);

    if (!order) return null;

    const handleRefund = async () => {
        if (!confirm("Are you sure you want to refund this order? This action cannot be undone.")) return;

        setRefunding(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/admin/orders/${order.id}/refund`, {
                method: "POST"
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to refund order");
            }

            toast.success("Order refunded successfully");
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setRefunding(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Order #{order.id}</DialogTitle>
                    <DialogDescription>
                        Placed on {new Date(order.date).toLocaleString()}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4 text-sm">
                    <div className="grid grid-cols-3 items-center gap-4">
                        <span className="font-semibold">User:</span>
                        <span className="col-span-2 truncate">{order.userEmail}</span>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                        <span className="font-semibold">Service:</span>
                        <div className="col-span-2 flex flex-col">
                            <span>{order.serviceName}</span>
                            <span className="text-muted-foreground text-xs">Display ID: {order.displayId}</span>
                            <span className="text-muted-foreground text-xs">Provider ID: {order.serviceId}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                        <span className="font-semibold">Status:</span>
                        <span className="col-span-2 uppercase font-bold">{order.status}</span>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                        <span className="font-semibold">Quantity:</span>
                        <span className="col-span-2">{order.quantity}</span>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                        <span className="font-semibold">Charge:</span>
                        <span className="col-span-2 font-mono">₹{(order.charge || 0).toFixed(2)}</span>
                    </div>
                    {order.link && (
                        <div className="grid grid-cols-3 items-center gap-4">
                            <span className="font-semibold">Link:</span>
                            <a href={order.link} target="_blank" className="col-span-2 text-blue-500 hover:underline truncate">{order.link}</a>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-col sm:justify-between sm:flex-row gap-2">
                    {/* Only show refund if not already refunded/failed/cancelled? Or maybe always allow override? 
                        Safe to show for active/completed/submitted. 
                    */}
                    {(order.status !== 'canceled' && order.status !== 'failed' && order.status !== 'refunded') && (
                        <Button variant="destructive" onClick={handleRefund} disabled={refunding} className="w-full sm:w-auto">
                            {refunding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Refund Order
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
