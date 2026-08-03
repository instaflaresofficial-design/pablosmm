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
    CheckCircle2,
    XCircle,
    CheckSquare,
    Square,
    Save
} from "lucide-react";
import { cn } from "@/lib/admin/utils";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
import { Card } from "@/components/admin/ui/card";
import { ScrollArea } from "@/components/admin/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/admin/ui/tabs";
import { ServicesTable } from "./data-table";
import type { Service } from "./schema";
import { getApiBaseUrl } from "@/lib/config";
import { toast } from "sonner";
import { useCurrency } from "@/components/layout/CurrencyProvider";

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
    { id: "repost", name: "Repost" },
    { id: "shares", name: "Shares" },
    { id: "votes", name: "Story Poll Votes" },
    { id: "saves", name: "Saves" },
    { id: "reactions", name: "Channel Reactions" },
];

export function CategorizedServices({ initialData }: { initialData: Service[] }) {
    const { formatMoney } = useCurrency();
    const [selectedPlatform, setSelectedPlatform] = React.useState("instagram");
    const [selectedType, setSelectedType] = React.useState("all");
    const [searchQuery, setSearchQuery] = React.useState("");
    const [curationMode, setCurationMode] = React.useState(false);
    
    // Curation map: service.id -> boolean (true = active/live, false = hidden/dead)
    const [curationMap, setCurationMap] = React.useState<Record<string, boolean>>({});
    const [isSavingCuration, setIsSavingCuration] = React.useState(false);

    const [selectionMap, setSelectionMap] = React.useState<Record<string, string[]>>({});
    const selectedIds = React.useMemo(() => Object.values(selectionMap).flat(), [selectionMap]);
    const [isUpdatingBulk, setIsUpdatingBulk] = React.useState(false);

    // Top-level callback definition
    const handleTableSelectionChange = React.useCallback((ids: string[]) => {
        setSelectionMap({ all: ids });
    }, []);

    // Initialize curation map from initialData
    React.useEffect(() => {
        const map: Record<string, boolean> = {};
        initialData.forEach((s) => {
            map[s.id || s.sourceServiceId] = s.status !== "hidden" && !s.isHidden;
        });
        setCurationMap(map);
    }, [initialData]);

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
                (query === 'refill' && s.refill) ||
                (query === 'cancel' && s.cancel) ||
                (query.includes('drip') && s.dripfeed);
            return matchesPlatform && matchesType && matchesSearch;
        });
    }, [initialData, selectedPlatform, selectedType, searchQuery]);

    const platformCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        initialData.forEach(s => {
            const p = s.platform.toLowerCase();
            counts[p] = (counts[p] || 0) + 1;
        });
        return counts;
    }, [initialData]);

    const handleToggleCurationItem = (id: string) => {
        setCurationMap((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const handleSelectAllCuration = (select: boolean) => {
        setCurationMap((prev) => {
            const next = { ...prev };
            filteredServices.forEach((s) => {
                const id = s.id || s.sourceServiceId;
                next[id] = select;
            });
            return next;
        });
    };

    const handleSaveCuration = async () => {
        try {
            setIsSavingCuration(true);
            const activeIds: string[] = [];
            const hiddenIds: string[] = [];

            filteredServices.forEach((s) => {
                const id = s.id || s.sourceServiceId;
                const isWorking = curationMap[id] ?? (s.status !== "hidden");
                if (isWorking) {
                    activeIds.push(id);
                } else {
                    hiddenIds.push(id);
                }
            });

            const baseUrl = getApiBaseUrl();

            // Save active (isHidden = false)
            if (activeIds.length > 0) {
                await fetch(`${baseUrl}/admin/services/bulk-override`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sourceServiceIds: activeIds,
                        isHidden: false,
                    }),
                });
            }

            // Save hidden (isHidden = true)
            if (hiddenIds.length > 0) {
                await fetch(`${baseUrl}/admin/services/bulk-override`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sourceServiceIds: hiddenIds,
                        isHidden: true,
                    }),
                });
            }

            toast.success(`Curation saved: ${activeIds.length} working, ${hiddenIds.length} hidden`);
            window.location.reload();
        } catch (error: any) {
            toast.error("Failed to save curation: " + error.message);
        } finally {
            setIsSavingCuration(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col gap-4 lg:flex-row min-h-0 h-full">
            {/* Left Sidebar: Platforms */}
            <Card className="flex w-full flex-col overflow-hidden lg:w-64 shrink-0">
                <div className="p-4 font-semibold border-b flex items-center justify-between">
                    <span>Platforms</span>
                    <Badge variant="outline">{initialData.length} Total</Badge>
                </div>
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
                        <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full md:w-auto overflow-x-auto">
                            <TabsList className="bg-muted/50">
                                {SERVICE_TYPES.map(type => (
                                    <TabsTrigger key={type.id} value={type.id} className="text-xs md:text-sm whitespace-nowrap">
                                        {type.name}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search services..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 h-9"
                                />
                            </div>

                            <Button
                                variant={curationMode ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurationMode(!curationMode)}
                                className="h-9 gap-1.5 whitespace-nowrap font-medium"
                            >
                                <CheckSquare className="h-4 w-4" />
                                {curationMode ? "Table Mode" : "Curation Mode"}
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 p-4 overflow-auto min-h-0 relative">
                        {/* Curation Mode Header / Floating Bar */}
                        {curationMode && (
                            <div className="sticky top-0 z-50 mb-4 p-3 rounded-xl border bg-card/95 backdrop-blur shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 border-primary/20">
                                <div className="flex items-center gap-2">
                                    <Badge variant="default" className="bg-primary">
                                        Curation Mode Active
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        Check working services to keep them LIVE. Uncheck broken services to HIDE.
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleSelectAllCuration(true)}
                                        className="h-8 text-xs gap-1"
                                    >
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Select All
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleSelectAllCuration(false)}
                                        className="h-8 text-xs gap-1"
                                    >
                                        <XCircle className="h-3.5 w-3.5 text-destructive" /> Deselect All
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSaveCuration}
                                        disabled={isSavingCuration}
                                        className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                    >
                                        <Save className="h-3.5 w-3.5" />
                                        {isSavingCuration ? "Saving..." : "Save Statuses"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Views */}
                        {!curationMode ? (
                            <ServicesTable initialData={filteredServices} onSelectionChange={handleTableSelectionChange} />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {filteredServices.map((service) => {
                                    const id = service.id || service.sourceServiceId;
                                    const isWorking = curationMap[id] ?? (service.status !== "hidden");

                                    return (
                                        <div
                                            key={id}
                                            onClick={() => handleToggleCurationItem(id)}
                                            className={cn(
                                                "p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 text-xs relative select-none",
                                                isWorking
                                                    ? "bg-emerald-500/5 border-emerald-500/30 dark:bg-emerald-500/10"
                                                    : "bg-muted/40 border-muted opacity-60 hover:opacity-100"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    {isWorking ? (
                                                        <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" />
                                                    ) : (
                                                        <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    )}
                                                    <span className="font-mono text-xs text-muted-foreground font-semibold">
                                                        #{service.sourceServiceId}
                                                    </span>
                                                </div>
                                                <Badge
                                                    variant={isWorking ? "default" : "secondary"}
                                                    className={cn("text-[10px]", isWorking && "bg-emerald-600")}
                                                >
                                                    {isWorking ? "WORKING" : "BROKEN / HIDDEN"}
                                                </Badge>
                                            </div>

                                            <div className="font-medium text-foreground line-clamp-2 leading-snug">
                                                {service.name}
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                                                <span>{formatMoney(service.ratePer1000)}/k</span>
                                                <span>Min: {service.min} | Max: {service.max}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
