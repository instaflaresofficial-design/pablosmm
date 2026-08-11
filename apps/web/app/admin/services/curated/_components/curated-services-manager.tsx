"use client";

import * as React from "react";
import {
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Send,
  Music2,
  MessageSquare,
  AtSign,
  Search,
  CheckCircle2,
  Save,
  Filter,
  RefreshCw,
  Sparkles,
  Layers,
  PlusCircle,
  ShieldCheck,
  Tag,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/admin/utils";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
import { Card } from "@/components/admin/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { Label } from "@/components/admin/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/admin/ui/dialog";
import { toast } from "sonner";
import { useCurrency } from "@/components/layout/CurrencyProvider";
import { apiClient } from "@/lib/apiClient";

export interface ServiceItem {
  id: string;
  sourceServiceId: string;
  name?: string;
  providerName?: string;
  category?: string;
  providerCategory?: string;
  rawProviderCategory?: string;
  platform: string;
  type?: string;
  ratePer1000: number;
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
  status?: "active" | "hidden" | "disabled";
  isHidden?: boolean;
  displayName?: string;
  displayCategory?: string;
  quality?: string;
  refillTag?: string;
}

const PLATFORMS = [
  { id: "all", name: "All Platforms", icon: Layers, color: "text-emerald-500" },
  { id: "instagram", name: "Instagram", icon: Instagram, color: "text-pink-500" },
  { id: "youtube", name: "YouTube", icon: Youtube, color: "text-red-600" },
  { id: "tiktok", name: "TikTok", icon: Music2, color: "text-zinc-900 dark:text-white" },
  { id: "telegram", name: "Telegram", icon: Send, color: "text-sky-500" },
  { id: "facebook", name: "Facebook", icon: Facebook, color: "text-blue-600" },
  { id: "x", name: "X (Twitter)", icon: Twitter, color: "text-zinc-900 dark:text-white" },
  { id: "whatsapp", name: "WhatsApp", icon: MessageSquare, color: "text-emerald-500" },
  { id: "threads", name: "Threads", icon: AtSign, color: "text-purple-500" },
];

const ITEMS_PER_PAGE = 30;

function formatInrRate(rate: number): string {
  if (typeof rate !== "number" || isNaN(rate)) return "₹0.00";
  return `₹${rate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

export function CuratedServicesManager({ initialServices }: { initialServices: ServiceItem[] }) {
  // State
  const [submissions, setSubmissions] = React.useState<any[]>([]);
  const [services, setServices] = React.useState<ServiceItem[]>(initialServices);
  const [selectedPlatform, setSelectedPlatform] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [selectedProviderFilter, setSelectedProviderFilter] = React.useState<string>("all");
  const [onlyProviderVerified, setOnlyProviderVerified] = React.useState<boolean>(true);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Custom Category Editing State
  const [customCategories, setCustomCategories] = React.useState<string[]>([
    "⚡ Instagram High Quality Followers [Instant]",
    "🔥 Instagram Real Likes [Refill 30 Days]",
    "👁️ YouTube Organic Views [Non-Drop]",
    "🚀 Telegram Channel Members [Real]",
    "⭐ TikTok Trending Views & Likes",
    "👍 Facebook Page Likes & Followers",
  ]);

  const [newCatDialogOpen, setNewCatDialogOpen] = React.useState(false);
  const [newCatName, setNewCatName] = React.useState("");

  // Map of serviceId -> custom category & display name
  const [serviceCustomCatMap, setServiceCustomCatMap] = React.useState<Record<string, string>>({});
  const [serviceCustomNameMap, setServiceCustomNameMap] = React.useState<Record<string, string>>({});
  const [serviceActiveMap, setServiceActiveMap] = React.useState<Record<string, boolean>>({});

  // Reset page to 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlatform, selectedProviderFilter, searchQuery, onlyProviderVerified]);

  // Fetch provider submissions to identify provider-selected services
  const loadSubmissions = React.useCallback(async () => {
    try {
      const res = await fetch("/api/provider/services/curate");
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error("Failed to load submissions", err);
    }
  }, []);

  React.useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  // Map service ID -> Submitted Provider Name
  const serviceIdToProviderNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    submissions.forEach((sub) => {
      const pName = sub.providerName || "Provider Verification";
      (sub.updates || []).forEach((u: any) => {
        if (u.id) {
          map[String(u.id)] = pName;
        }
      });
    });
    return map;
  }, [submissions]);

  // Set of service IDs verified by providers across submission batches
  const providerVerifiedServiceIds = React.useMemo(() => {
    const ids = new Set<string>();
    submissions.forEach((sub) => {
      (sub.updates || []).forEach((u: any) => {
        if (u.id) ids.add(String(u.id));
      });
    });
    return ids;
  }, [submissions]);

  // Clean Provider Names list (Only actual suppliers: TOPSMM, CheapSMMZone)
  const providerNames = React.useMemo(() => {
    const names = new Set<string>(["TOPSMM", "CheapSMMZone"]);
    submissions.forEach((s) => {
      if (s.providerName && s.providerName.length <= 30) {
        names.add(s.providerName);
      }
    });
    return Array.from(names);
  }, [submissions]);

  // Filtered Services List
  const curatedServices = React.useMemo(() => {
    return services.filter((s) => {
      const sId = String(s.sourceServiceId || s.id);
      const sPlatform = (s.platform || "").toLowerCase();
      const sCategory = (s.rawProviderCategory || s.category || "").toLowerCase();
      const sName = (s.displayName || s.name || "").toLowerCase();

      // 1. Provider Verified Filter (Strictly check if marked by provider when ON)
      if (onlyProviderVerified) {
        if (!providerVerifiedServiceIds.has(sId)) {
          return false;
        }
      }

      // 2. Supplier / Provider Filter
      if (selectedProviderFilter !== "all") {
        const provKey = selectedProviderFilter.toLowerCase();
        const submittedProv = (serviceIdToProviderNameMap[sId] || "").toLowerCase();
        const sIdLower = sId.toLowerCase();

        let matchProv = false;
        if (submittedProv) {
          matchProv = submittedProv.includes(provKey);
        } else {
          if (provKey.includes("cheapsmm") && sIdLower.includes("cheap")) {
            matchProv = true;
          } else if (provKey.includes("topsmm") && !sIdLower.includes("cheap")) {
            matchProv = true;
          }
        }
        if (!matchProv) return false;
      }

      // 3. Platform Match
      if (selectedPlatform !== "all") {
        const matchPlatform = sPlatform.includes(selectedPlatform) || sCategory.includes(selectedPlatform);
        if (!matchPlatform) return false;
      }

      // 4. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          sName.includes(q) ||
          sId.includes(q) ||
          sCategory.includes(q) ||
          (s.displayName && s.displayName.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [services, onlyProviderVerified, providerVerifiedServiceIds, serviceIdToProviderNameMap, selectedProviderFilter, selectedPlatform, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(curatedServices.length / ITEMS_PER_PAGE));
  const paginatedServices = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return curatedServices.slice(start, start + ITEMS_PER_PAGE);
  }, [curatedServices, currentPage]);

  // Group paginated services by Category for fast rendering
  const groupedCuratedServices = React.useMemo(() => {
    const groups: Record<string, ServiceItem[]> = {};

    paginatedServices.forEach((s) => {
      const sId = s.id || s.sourceServiceId;
      const customCat =
        serviceCustomCatMap[sId] ||
        s.displayCategory ||
        s.rawProviderCategory ||
        s.category ||
        "General Verified Services";

      if (!groups[customCat]) groups[customCat] = [];
      groups[customCat].push(s);
    });

    return groups;
  }, [paginatedServices, serviceCustomCatMap]);

  // Create new custom category
  const handleAddCustomCategory = () => {
    if (!newCatName.trim()) return;
    const cat = newCatName.trim();
    if (!customCategories.includes(cat)) {
      setCustomCategories((prev) => [...prev, cat]);
      toast.success(`Created category: ${cat}`);
    }
    setNewCatName("");
    setNewCatDialogOpen(false);
  };

  // Save Curation & Category Mappings
  const handleSaveCatalog = async () => {
    try {
      setIsSaving(true);
      const updates = curatedServices.map((s) => {
        const sId = s.id || s.sourceServiceId;
        return {
          id: s.sourceServiceId || s.id,
          displayCategory: serviceCustomCatMap[sId] || s.displayCategory,
          displayName: serviceCustomNameMap[sId] || s.displayName || s.name,
          status: serviceActiveMap[sId] !== false ? "active" : "hidden",
        };
      });

      await apiClient.post("/admin/services/curate", { updates });
      toast.success(`Saved curated category mapping for ${updates.length} services!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save curated catalog");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await loadSubmissions();
      const res = await fetch("/api/admin/services?refresh=true");
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
        toast.success("Refreshed live service catalog!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to refresh");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col space-y-5 w-full pb-12">
      {/* Top Banner Control Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-zinc-900 to-teal-950 text-white p-5 rounded-2xl border border-emerald-500/30 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs">
                ✨ Provider Verified Catalog
              </Badge>
              <Badge variant="outline" className="text-white border-white/20 text-xs font-mono">
                {curatedServices.length} Matching Services
              </Badge>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
              Curated Services & Custom Category Studio
            </h2>
            <p className="text-xs text-emerald-200/80 max-w-2xl">
              Organize provider-verified services into your custom website categories. Fast, responsive, & real-time.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-zinc-900/80 border-white/20 text-white hover:bg-zinc-800 text-xs font-semibold"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isRefreshing && "animate-spin")} />
              Sync API
            </Button>

            <Button
              size="sm"
              onClick={() => setNewCatDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              New Category
            </Button>

            <Button
              size="sm"
              onClick={handleSaveCatalog}
              disabled={isSaving}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-extrabold text-xs shadow-lg gap-1.5"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Catalog"}
            </Button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="pt-3 border-t border-emerald-500/20 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Supplier Selection Filter */}
          <div className="sm:col-span-4 flex items-center gap-2 bg-zinc-900/80 border border-white/10 p-2 rounded-xl text-xs">
            <Filter className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-zinc-400 text-[11px] shrink-0 font-medium">Supplier:</span>
            <Select value={selectedProviderFilter} onValueChange={setSelectedProviderFilter}>
              <SelectTrigger className="h-7 text-xs bg-transparent border-0 text-white focus:ring-0">
                <SelectValue placeholder="All Providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-bold">All Providers Catalog</SelectItem>
                {providerNames.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Toggle: Only Provider Selected vs All Catalog */}
          <div className="sm:col-span-4 flex items-center justify-between bg-zinc-900/80 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-zinc-300 font-medium text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Only Provider Verified
            </span>
            <button
              onClick={() => setOnlyProviderVerified(!onlyProviderVerified)}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer",
                onlyProviderVerified ? "bg-emerald-500 text-zinc-950" : "bg-zinc-700 text-zinc-300"
              )}
            >
              {onlyProviderVerified ? "ON (Verified Only)" : "OFF (All Services)"}
            </button>
          </div>

          {/* Search Box */}
          <div className="sm:col-span-4 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search verified services by ID or name..."
              className="h-8 pl-8 text-xs bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-500 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Platform Taxonomy Ribbon */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-2">
          {PLATFORMS.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedPlatform === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPlatform(p.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shrink-0 cursor-pointer",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", p.color)} />
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>

        {/* Top Pagination Controls */}
        <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
          <span className="text-muted-foreground text-[11px]">
            Page {currentPage} of {totalPages} ({curatedServices.length} items)
          </span>
          <Button
            size="xs"
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="h-7 w-7 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="xs"
            variant="outline"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Category Groups & Services Grid */}
      {curatedServices.length === 0 ? (
        <Card className="p-12 text-center space-y-3 rounded-2xl border-dashed">
          <ShieldCheck className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-base font-bold text-foreground">No Verified Services Found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {onlyProviderVerified
              ? "Your providers haven't verified any services matching this filter yet, or try turning off 'Only Provider Verified'."
              : "No services match your search query."}
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(groupedCuratedServices).map(([catName, groupServices]) => (
            <Card key={catName} className="border-2 shadow-sm rounded-2xl overflow-hidden bg-card space-y-0">
              {/* Category Header */}
              <div className="p-3.5 bg-muted/40 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                      {catName}
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {groupServices.length} Services on Page
                      </Badge>
                    </h3>
                  </div>
                </div>

                <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 font-mono w-fit">
                  Provider Approved Group
                </Badge>
              </div>

              {/* Service Cards List inside Category */}
              <div className="divide-y divide-border">
                {groupServices.map((s) => {
                  const sId = s.id || s.sourceServiceId;
                  const submittedProv = serviceIdToProviderNameMap[sId] || s.providerName || "TopSMM";
                  const currentCustomCat = serviceCustomCatMap[sId] || s.displayCategory || catName;
                  const currentCustomName = serviceCustomNameMap[sId] || s.displayName || s.name || `Service #${s.sourceServiceId}`;
                  const isActive = serviceActiveMap[sId] !== false;

                  return (
                    <div
                      key={sId}
                      className={cn(
                        "p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors hover:bg-muted/20",
                        !isActive && "opacity-60 bg-muted/30"
                      )}
                    >
                      {/* Left: ID, Name, Provider Info */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-primary text-primary-foreground font-mono text-[11px]">
                            #{s.sourceServiceId}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-mono capitalize border-emerald-500/40 text-emerald-600">
                            {submittedProv}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {s.platform || "general"}
                          </Badge>
                        </div>

                        {/* Editable Service Name Input */}
                        <Input
                          value={currentCustomName}
                          onChange={(e) =>
                            setServiceCustomNameMap((prev) => ({ ...prev, [sId]: e.target.value }))
                          }
                          className="h-8 text-xs font-bold text-foreground bg-background border-border max-w-xl"
                          placeholder="Enter custom service display name..."
                        />

                        <p className="text-[11px] text-muted-foreground truncate">
                          Raw Category: <span className="font-mono text-foreground">{s.rawProviderCategory || s.category || "General"}</span>
                        </p>
                      </div>

                      {/* Middle: Category Assign Select */}
                      <div className="w-full lg:w-72 space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                          <Tag className="w-3 h-3 text-emerald-500" /> Custom Category
                        </Label>
                        <Select
                          value={currentCustomCat}
                          onValueChange={(val) =>
                            setServiceCustomCatMap((prev) => ({ ...prev, [sId]: val }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs font-semibold bg-background">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {customCategories.map((c) => (
                              <SelectItem key={c} value={c} className="text-xs">
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Right: Rate, Limits, Status Toggle */}
                      <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 border-t lg:border-t-0 pt-2 lg:pt-0">
                        <div className="text-left lg:text-right space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Rate / 1k (INR)</span>
                          <span className="text-sm font-mono font-extrabold text-emerald-600">
                            {formatInrRate(s.ratePer1000)}
                          </span>
                        </div>

                        <div className="text-left lg:text-right space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Min / Max</span>
                          <span className="text-xs font-mono font-semibold text-foreground">
                            {s.min} - {s.max ? s.max.toLocaleString() : "50,000"}
                          </span>
                        </div>

                        <Button
                          size="xs"
                          variant={isActive ? "outline" : "secondary"}
                          onClick={() =>
                            setServiceActiveMap((prev) => ({ ...prev, [sId]: !isActive }))
                          }
                          className={cn(
                            "h-8 px-3 text-xs gap-1 font-bold cursor-pointer",
                            isActive ? "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          {isActive ? "Active" : "Hidden"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}

          {/* Bottom Pagination Controls */}
          <div className="flex items-center justify-between p-3 bg-card border rounded-2xl text-xs font-mono">
            <span className="text-muted-foreground">
              Showing page {currentPage} of {totalPages} ({curatedServices.length} total verified services)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="gap-1 text-xs"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="gap-1 text-xs"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Category Dialog */}
      <Dialog open={newCatDialogOpen} onOpenChange={setNewCatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-500" />
              Create Custom Website Category
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter a custom title for displaying provider-verified services on your store.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label className="text-xs font-medium">Category Name</Label>
            <Input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. ⚡ Instagram High Quality Followers [Instant]"
              className="text-xs h-9"
            />
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setNewCatDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddCustomCategory} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
