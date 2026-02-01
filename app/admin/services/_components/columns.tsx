"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { EllipsisVertical, Info } from "lucide-react";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/admin/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/admin/ui/tooltip";
import { DataTableColumnHeader } from "@/components/admin/data-table/data-table-column-header";
import type { Service } from "./schema";
import { useState } from "react";
import { RewriteDialog } from "./rewrite-dialog";
import { cn } from "@/lib/admin/utils";
import { useCurrency } from "@/components/layout/CurrencyProvider";
import { Checkbox } from "@/components/admin/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/admin/ui/popover";

// Component to handle currency formatting hook usage
function PriceCell({ row }: { row: { original: Service } }) {
    const { formatMoney } = useCurrency();
    const profit = row.original.ratePer1000 - row.original.baseRatePer1000;
    const profitPercent = (profit / row.original.baseRatePer1000) * 100;

    return (
        <div className="flex flex-col gap-1.5 py-1 min-w-[120px]">
            <div className="flex flex-col">
                <span className="text-[10px] uppercase text-muted-foreground/70 font-bold tracking-tighter">Your Price</span>
                <span className="font-bold font-mono text-base text-primary leading-none">
                    {formatMoney(row.original.ratePer1000)}
                </span>
            </div>

            <div className="flex flex-col border-t border-muted/30 pt-1.5">
                <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Provider Cost:</span>
                    <span className="font-mono text-muted-foreground font-medium">
                        {formatMoney(row.original.baseRatePer1000)}
                    </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-tighter">Profit</span>
                    <div className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full flex gap-1 items-center",
                        profit > 0 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                    )}>
                        <span>{profitPercent > 0 ? "+" : ""}{profitPercent.toFixed(0)}%</span>
                        <span className="opacity-50 text-[9px] font-medium">
                            ({formatMoney(profit)})
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActionsCell({ service }: { service: Service }) {
    const [showRewriteDialog, setShowRewriteDialog] = useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="size-8 p-0 hover:bg-muted" size="icon">
                        <EllipsisVertical className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => setShowRewriteDialog(true)} className="cursor-pointer">
                        Edit Service
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive cursor-pointer">
                        Hide Service
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <RewriteDialog
                open={showRewriteDialog}
                onOpenChange={setShowRewriteDialog}
                service={service}
                onSuccess={() => {
                    // Refresh data without full page reload if possible, 
                    // but stay safe for now as parent state management is simple.
                    window.location.reload();
                }}
            />
        </>
    );
}

export const serviceColumns: ColumnDef<Service>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
                className="translate-y-[2px]"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                className="translate-y-[2px]"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "id",
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
        cell: ({ row }) => (
            <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] text-muted-foreground">#{row.original.sourceServiceId}</span>
                <Badge variant="outline" className="text-[9px] px-1 h-3.5 w-fit font-mono tracking-tighter">
                    {row.original.source}
                </Badge>
            </div>
        ),
    },
    {
        accessorKey: "displayName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Service Details" />,
        cell: ({ row }) => {
            const name = row.original.displayName || row.original.providerName || "Unnamed Service";
            const originalName = row.original.providerName;
            const hasRewrite = !!row.original.displayName;

            // Flags
            const flags = [
                { key: 'refill', label: 'Refill', val: row.original.refill, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
                { key: 'dripfeed', label: 'Drip', val: row.original.dripfeed, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
                { key: 'cancel', label: 'Cancel', val: row.original.cancel, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
            ].filter(f => f.val);

            // Metadata
            const meta = [
                { val: row.original.targeting, label: 'Targeting', color: 'text-purple-600 bg-purple-500/10 border-purple-500/20' },
                { val: row.original.quality, label: 'Quality', color: 'text-orange-600 bg-orange-500/10 border-orange-500/20' },
                { val: row.original.stability, label: 'Stability', color: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/20' },
            ].filter(m => m.val);

            return (
                <div className="flex flex-col gap-2.5 py-3 max-w-[420px]">
                    {/* Header Row: Platform | ID | Source */}
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-[4px] px-1.5 py-0 h-4 text-[9px] font-bold uppercase tracking-wider bg-primary/5 border-primary/20 text-primary/80">
                            {row.original.platform}
                        </Badge>
                        <div className="h-2.5 w-[1px] bg-border/60" />
                        <span className="text-[10px] font-mono text-muted-foreground/60 tracking-tight">
                            ID: <span className="font-bold text-foreground/80">{row.original.displayId || '-'}</span>
                        </span>
                        <div className="h-2.5 w-[1px] bg-border/60" />
                        <span className="text-[10px] font-mono text-muted-foreground/40 tracking-tight">
                            #{row.original.sourceServiceId}
                        </span>
                    </div>

                    {/* Service Name */}
                    {/* <div className="space-y-0.5"> */}
                    <div className="flex items-start justify-between gap-3">
                        <span className={cn(
                            "font-bold text-[13px] leading-snug whitespace-normal tracking-tight",
                            hasRewrite ? "text-foreground" : "text-muted-foreground/90"
                        )}>
                            {name}
                        </span>
                        {hasRewrite && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center justify-center size-5 bg-muted/30 rounded-full hover:bg-muted/50 cursor-help transition-colors shrink-0">
                                            <Info className="size-3 text-muted-foreground/60" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="p-3">
                                        <div className="max-w-xs space-y-1.5">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Original Provider Name</p>
                                            <p className="text-xs font-medium leading-relaxed">{originalName}</p>
                                            <div className="pt-1.5 mt-1.5 border-t border-border/50 flex flex-col gap-1">
                                                <span className="text-[10px] text-muted-foreground/80">
                                                    <span className="font-semibold text-foreground/80">Category:</span> {row.original.rawProviderCategory || "N/A"}
                                                </span>
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>

                    {/* Specs Row: Category | Flags | Metadata */}
                    <div className="flex flex-wrap items-center gap-1.5 row-span-2">
                        {/* App Category Badge */}
                        <div className="flex items-center bg-muted/40 rounded border border-border/40 px-1.5 py-0.5 h-5">
                            <span className="text-[9px] font-semibold uppercase tracking-tight text-muted-foreground">
                                {row.original.category && row.original.category !== "" ? row.original.category : "Unassigned"}
                            </span>
                        </div>

                        {/* Divider if we have other items */}
                        {(flags.length > 0 || meta.length > 0) && (
                            <div className="h-3 w-[1px] bg-border/60 mx-0.5" />
                        )}

                        {/* Feature Badges */}
                        {flags.map(f => (
                            <Badge key={f.key} variant="outline" className={cn("px-1.5 py-0 h-4 text-[9px] font-bold uppercase tracking-tight  border rounded-[3px]", f.color)}>
                                {f.label}
                            </Badge>
                        ))}

                        {/* Metadata Badges */}
                        {meta.map(m => (
                            <Badge key={m.label} variant="outline" className={cn("px-1.5 py-0 h-4 text-[9px] font-bold uppercase tracking-tight border rounded-[3px]", m.color)}>
                                {m.val}
                            </Badge>
                        ))}
                    </div>

                    {/* Footer Row: Tags & Description Trigger */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap gap-1">
                            {row.original.tags && row.original.tags.map(tag => (
                                <span key={tag} className={cn(
                                    "px-1.5 py-0.5 rounded-[2px] text-[8px] font-black uppercase tracking-tight",
                                    tag.toLowerCase() === 'premium' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                        tag.toLowerCase() === 'recommended' ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" :
                                            tag.toLowerCase() === 'cheap' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                                "bg-muted text-muted-foreground"
                                )}>
                                    {tag}
                                </span>
                            ))}
                        </div>

                        {(row.original.displayDescription || row.original.description) && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="text-[9px] font-bold text-muted-foreground/60 hover:text-primary transition-colors uppercase tracking-widest flex items-center gap-1">
                                        Features <span className="text-[8px] opacity-50">▼</span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0 shadow-xl border-muted overflow-hidden" align="start">
                                    <div className="bg-muted/30 px-3 py-2 border-b border-border/50">
                                        <h4 className="font-bold text-[10px] uppercase text-muted-foreground tracking-wider">Service Description</h4>
                                    </div>
                                    <div className="p-3 max-h-[300px] overflow-y-auto bg-card">
                                        <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap font-mono">
                                            {row.original.description}
                                        </p>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                    {/* Admin Group - Subtle at bottom */}
                    {row.original.providerCategory && (
                        <div className="text-[9px] text-muted-foreground/30 font-medium truncate max-w-[300px] select-all cursor-text" title="Original Provider Category">
                            {row.original.providerCategory}
                        </div>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: "ratePer1000",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Pricing" />,
        cell: ({ row }) => <PriceCell row={row} />,
    },
    {
        accessorKey: "min",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Limits" />,
        cell: ({ row }) => (
            <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-muted-foreground w-8">Min:</span>
                    <span className="font-mono font-medium text-foreground">{row.original.min.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-muted-foreground w-8">Max:</span>
                    <span className="font-mono font-medium text-foreground">{row.original.max.toLocaleString()}</span>
                </div>
            </div>
        ),
    },
    {
        accessorKey: "purchaseCount",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Sales" />,
        cell: ({ row }) => {
            const count = row.original.purchaseCount || 0;
            return (
                <div className="flex flex-col items-center gap-1 min-w-[60px]">
                    <div className={cn(
                        "px-2 py-1 rounded flex items-center gap-1.5 border border-transparent transition-all",
                        count > 0
                            ? "bg-blue-500/10 text-blue-600 font-bold border-blue-500/20 shadow-sm"
                            : "bg-muted/30 text-muted-foreground/40 font-medium grayscale opacity-50"
                    )}>
                        <span className="text-[11px] font-mono leading-none">{count}</span>
                        <span className="text-[8px] uppercase tracking-tighter font-bold">Orders</span>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
            const isHidden = row.original.status === "hidden";
            return (
                <div className="flex flex-col items-center gap-1 min-w-[60px]">
                    <Badge
                        variant={isHidden ? "outline" : "default"}
                        className={cn(
                            "px-2 py-0.5 h-5 text-[10px] font-bold border-none",
                            isHidden
                                ? "bg-rose-500/10 text-rose-600"
                                : "bg-emerald-500/10 text-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                        )}
                    >
                        {isHidden ? "HIDDEN" : "LIVE"}
                    </Badge>
                </div>
            );
        },
    },
    {
        accessorKey: "providerCategory",
        header: "Provider Category",
        enableHiding: true,
        // This column is mainly for grouping logic
        cell: ({ row }) => <span className="text-[10px] text-muted-foreground italic">{row.original.providerCategory}</span>,
    },
    {
        id: "actions",
        cell: ({ row }) => <ActionsCell service={row.original} />,
    },
];
