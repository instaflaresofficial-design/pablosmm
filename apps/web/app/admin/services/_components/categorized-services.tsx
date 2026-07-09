"use client";

import * as React from "react";
import {
    Instagram,
    Facebook,
    Twitter,
    Youtube,
    Send,
    Music2,
    Search,
    ChevronRight,
    Filter,
    CheckCircle2,
    XCircle,
    Edit2,
    Eye,
    EyeOff
} from "lucide-react";
import { cn } from "@/lib/admin/utils";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
import { Card } from "@/components/admin/ui/card";
import { ScrollArea } from "@/components/admin/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin/ui/tabs";
import { ServicesTable } from "./data-table";
import type { Service } from "./schema";
import { getApiBaseUrl } from "@/lib/config";
import { toast } from "sonner";

const PLATFORMS = [
    { id: "instagram", name: "Instagram", icon: Instagram, color: "text-pink-500" },
    { id: "tiktok", name: "TikTok", icon: Music2, color: "text-zinc-900 dark:text-white" },
    { id: "youtube", name: "YouTube", icon: Youtube, color: "text-red-600" },
    { id: "telegram", name: "Telegram", icon: Send, color: "text-sky-500" },
    { id: "facebook", name: "Facebook", icon: Facebook, color: "text-blue-600" },
    { id: "x", name: "X (Twitter)", icon: Twitter, color: "text-zinc-900 dark:text-white" },
];

const SERVICE_TYPES = [
    { id: "all", name: "All Services" },
    { id: "followers", name: "Followers" },
    { id: "likes", name: "Likes" },
    { id: "views", name: "Views" },
    { id: "comments", name: "Comments" },
    { id: "shares", name: "Shares" },
];

export function CategorizedServices({ initialData }: { initialData: Service[] }) {
    const [selectedPlatform, setSelectedPlatform] = React.useState("instagram");
    const [selectedType, setSelectedType] = React.useState("all");
    const [searchQuery, setSearchQuery] = React.useState("");
    const [selectionMap, setSelectionMap] = React.useState<Record<string, string[]>>({});
    const selectedIds = React.useMemo(() => Object.values(selectionMap).flat(), [selectionMap]);
    const [isUpdatingBulk, setIsUpdatingBulk] = React.useState(false);

    const handleSelectionChange = React.useCallback((category: string, ids: string[]) => {
        setSelectionMap(prev => {
            const current = prev[category] || [];
            if (current.length === ids.length && current.every((id, i) => id === ids[i])) {
                return prev;
            }
            return {
                ...prev,
                [category]: ids
            };
        });
    }, []);

    // Filter logic
    const filteredServices = React.useMemo(() => {
        return initialData.filter(s => {
            const matchesPlatform = s.platform.toLowerCase() === selectedPlatform.toLowerCase();
            const matchesType = selectedType === "all" || (s.type && s.type.toLowerCase() === selectedType.toLowerCase());
            const name = s.name || "";
            const displayName = s.displayName || "";
            const query = searchQuery.toLowerCase();
            const matchesSearch = name.toLowerCase().includes(query) ||
                displayName.toLowerCase().includes(query) ||
                s.sourceServiceId.includes(searchQuery) ||
                (s.displayId && s.displayId.includes(searchQuery)) ||
                (s.providerCategory && s.providerCategory.toLowerCase().includes(query)) ||
                // Feature checks: if user types "refill", "cancel", or "dripfeed", match corresponding flags
                (query === 'refill' && s.refill) ||
                (query === 'cancel' && s.cancel) ||
                (query.includes('drip') && s.dripfeed); // "drip" or "dripfeed"
            return matchesPlatform && matchesType && matchesSearch;
        });
    }, [initialData, selectedPlatform, selectedType, searchQuery]);

    // Grouping logic is now handled by the table component itself

    const handleBulkUpdate = async (update: { category?: string, tags?: string[] }) => {
        if (selectedIds.length === 0) return;

        try {
            setIsUpdatingBulk(true);
            const res = await fetch(`${getApiBaseUrl()}/admin/services/bulk-override`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceServiceIds: selectedIds.map(Number), // Ensure numeric IDs for backend
                    ...update
                })
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Failed to update services");
            }

            toast.success(`Successfully updated ${selectedIds.length} services`);
            // Refresh
            window.location.reload();
        } catch (error) {
            console.error("Bulk update error:", error);
            toast.error("Failed to update services");
        } finally {
            setIsUpdatingBulk(false);
        }
    };

    const platformCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        initialData.forEach(s => {
            const p = s.platform.toLowerCase();
            counts[p] = (counts[p] || 0) + 1;
        });
        return counts;
    }, [initialData]);

    return (
        <div className="flex flex-1 flex-col gap-4 lg:flex-row min-h-0 h-full">
            {/* Left Sidebar: Platforms */}
            <Card className="flex w-full flex-col overflow-hidden lg:w-64 shrink-0">
                <div className="p-4 font-semibold border-b">Platforms</div>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {PLATFORMS.map((platform) => {
                            const count = platformCounts[platform.id] || 0;
                            const isActive = selectedPlatform === platform.id;
                            return (
                                <button
                                    key={platform.id}
                                    onClick={() => setSelectedPlatform(platform.id)}
                                    className={cn(
                                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                                        isActive
                                            ? "bg-primary text-primary-foreground font-medium shadow-sm"
                                            : "hover:bg-accent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <platform.icon className={cn("size-4", !isActive && platform.color)} />
                                        <span>{platform.name}</span>
                                    </div>
                                    <Badge variant={isActive ? "secondary" : "outline"} className="ml-auto pointer-events-none">
                                        {count}
                                    </Badge>
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>
            </Card>

            {/* Main Area: Category Tabs & Table */}
            <div className="flex flex-1 flex-col gap-4 min-h-0">
                <Card className="flex flex-col flex-1 min-h-0">
                    <div className="flex flex-col gap-4 p-4 border-b md:flex-row md:items-center md:justify-between shrink-0">
                        <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full md:w-auto">
                            <TabsList className="bg-muted/50">
                                {SERVICE_TYPES.map(type => (
                                    <TabsTrigger key={type.id} value={type.id} className="text-xs md:text-sm">
                                        {type.name}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>

                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search in platform..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-9"
                            />
                        </div>
                    </div>

                    <div className="flex-1 p-4 overflow-auto min-h-0 relative">
                        {selectedIds.length > 0 && (
                            <div className="sticky top-0 z-50 mb-4 flex items-center justify-between rounded-xl border bg-primary/95 text-primary-foreground p-3 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-top-4 duration-300 border-primary/20">
                                <div className="flex items-center gap-3 pl-2">
                                    <div className="flex size-6 items-center justify-center rounded-full bg-primary-foreground/20 text-[11px] font-bold">
                                        {selectedIds.length}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-widest leading-none">Services Selected</div>
                                        <div className="text-[10px] opacity-70 mt-0.5">Quick assign to platform category</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pr-1">
                                    <div className="h-8 w-[1px] bg-primary-foreground/10 mx-2" />
                                    <span className="text-[10px] font-bold uppercase opacity-60 mr-1">Assign to:</span>
                                    <div className="flex gap-1">
                                        {["followers", "likes", "views", "comments", "shares"].map(cat => (
                                            <Button
                                                key={cat}
                                                size="sm"
                                                variant="secondary"
                                                className="h-7 text-[10px] font-bold uppercase tracking-tight bg-primary-foreground/10 hover:bg-primary-foreground/20 border-none text-white"
                                                onClick={() => handleBulkUpdate({ category: cat })}
                                                disabled={isUpdatingBulk}
                                            >
                                                {cat}
                                            </Button>
                                        ))}
                                    </div>
                                    <div className="h-8 w-[1px] bg-primary-foreground/10 mx-2" />
                                    <span className="text-[10px] font-bold uppercase opacity-60 mr-1">Tag as:</span>
                                    <div className="flex gap-1">
                                        {["PREMIUM", "CHEAP", "BEST QUALITY", "RECOMMENDED"].map(tag => (
                                            <Button
                                                key={tag}
                                                size="sm"
                                                variant="secondary"
                                                className="h-7 text-[10px] font-bold uppercase tracking-tight bg-primary-foreground/10 hover:bg-primary-foreground/20 border-none text-white px-2"
                                                onClick={() => handleBulkUpdate({ tags: [tag] })}
                                                disabled={isUpdatingBulk}
                                            >
                                                {tag}
                                            </Button>
                                        ))}
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-[10px] font-bold uppercase text-white hover:bg-white/10 ml-2"
                                        onClick={() => setSelectionMap({})}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 h-full">
                            <ServicesTable
                                initialData={filteredServices}
                                onSelectionChange={React.useCallback((ids: string[]) => {
                                    setSelectionMap({ all: ids });
                                }, [])}
                            />

                            {filteredServices.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                                    <div className="size-12 rounded-full bg-muted/30 flex items-center justify-center">
                                        <Search className="size-6 text-muted-foreground/30" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">No services found</p>
                                        <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
