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
  XCircle,
  Save,
  Server,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp,
  Folder,
  Edit3,
  ListOrdered,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/admin/utils";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/admin/ui/card";
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

export interface SmmProvider {
  id: number;
  key: string;
  name: string;
  api_url: string;
  api_key: string;
  currency: string;
  is_active: boolean;
}

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
  variant?: string;
  ratePer1000: number;
  baseRatePer1000?: number;
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
  dripfeed: boolean;
  averageTime?: number | null;
  status?: "active" | "hidden" | "disabled";
  isHidden?: boolean;
  displayName?: string;
  displayDescription?: string;
  tags?: string[];
  quality?: string;
  targeting?: string;
  description?: string;
  hasPendingProviderSubmission?: boolean;
  pendingProviderStatus?: string;
  proposedStatus?: string;
  proposedMin?: number;
  proposedMax?: number;
  proposedRefillTag?: string;
  proposedQuality?: string;
  proposedCancel?: boolean;
}

// 1. Platforms Config
const PLATFORMS = [
  { id: "instagram", name: "Instagram", synonyms: ["instagram", "ig"], icon: Instagram, color: "text-pink-500", bg: "bg-pink-500/10" },
  { id: "youtube", name: "YouTube", synonyms: ["youtube", "yt"], icon: Youtube, color: "text-red-600", bg: "bg-red-600/10" },
  { id: "tiktok", name: "TikTok", synonyms: ["tiktok"], icon: Music2, color: "text-zinc-900 dark:text-white", bg: "bg-zinc-500/10" },
  { id: "telegram", name: "Telegram", synonyms: ["telegram", "tg"], icon: Send, color: "text-sky-500", bg: "bg-sky-500/10" },
  { id: "facebook", name: "Facebook", synonyms: ["facebook", "fb"], icon: Facebook, color: "text-blue-600", bg: "bg-blue-600/10" },
  { id: "x", name: "X (Twitter)", synonyms: ["twitter", "x"], icon: Twitter, color: "text-zinc-900 dark:text-white", bg: "bg-zinc-500/10" },
  { id: "whatsapp", name: "WhatsApp", synonyms: ["whatsapp", "wa"], icon: MessageSquare, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "threads", name: "Threads", synonyms: ["threads"], icon: AtSign, color: "text-purple-500", bg: "bg-purple-500/10" },
];

// 2. Real Platform Taxonomy Map
const PLATFORM_TAXONOMY: Record<string, {
  types: { id: string; name: string; synonyms: string[] }[];
  variants: { id: string; name: string }[];
}> = {
  instagram: {
    types: [
      { id: "all", name: "All Instagram Services", synonyms: [] },
      { id: "followers", name: "Followers", synonyms: ["follower", "sub"] },
      { id: "likes", name: "Likes", synonyms: ["like", "favorite"] },
      { id: "views", name: "Views", synonyms: ["view", "watch", "impression", "reel"] },
      { id: "comments", name: "Comments", synonyms: ["comment"] },
      { id: "shares", name: "Shares", synonyms: ["share"] },
      { id: "saves", name: "Saves", synonyms: ["save", "bookmark"] },
      { id: "votes", name: "Story Poll Votes", synonyms: ["vote", "poll"] },
      { id: "reactions", name: "Channel Reactions", synonyms: ["reaction", "emoji"] },
      { id: "repost", name: "Reposts", synonyms: ["repost"] },
    ],
    variants: [
      { id: "all", name: "All Variants" },
      { id: "profile", name: "Profile / Account" },
      { id: "post", name: "Post" },
      { id: "reel", name: "Reel" },
      { id: "story", name: "Story" },
      { id: "igtv", name: "IGTV" },
      { id: "channel", name: "Broadcast Channel" },
    ],
  },
  youtube: {
    types: [
      { id: "all", name: "All YouTube Services", synonyms: [] },
      { id: "followers", name: "Subscribers", synonyms: ["subscriber", "sub", "follower"] },
      { id: "views", name: "Views & Watch Time", synonyms: ["view", "watch", "stream", "hour"] },
      { id: "likes", name: "Likes & Dislikes", synonyms: ["like", "favorite"] },
      { id: "comments", name: "Comments", synonyms: ["comment"] },
      { id: "shares", name: "Shares", synonyms: ["share"] },
    ],
    variants: [
      { id: "all", name: "All Variants" },
      { id: "video", name: "Regular Video" },
      { id: "short", name: "Shorts" },
      { id: "live", name: "Live Stream" },
      { id: "community", name: "Community Post" },
      { id: "adword", name: "Google AdWords Views" },
    ],
  },
  tiktok: {
    types: [
      { id: "all", name: "All TikTok Services", synonyms: [] },
      { id: "followers", name: "Followers", synonyms: ["follower", "sub"] },
      { id: "likes", name: "Likes", synonyms: ["like", "favorite"] },
      { id: "views", name: "Video Views", synonyms: ["view", "play"] },
      { id: "comments", name: "Comments", synonyms: ["comment"] },
      { id: "shares", name: "Shares", synonyms: ["share"] },
      { id: "saves", name: "Favorites & Saves", synonyms: ["save", "favorite"] },
      { id: "repost", name: "Reposts", synonyms: ["repost"] },
    ],
    variants: [
      { id: "all", name: "All Variants" },
      { id: "video", name: "Video" },
      { id: "live", name: "Live Stream" },
    ],
  },
  telegram: {
    types: [
      { id: "all", name: "All Telegram Services", synonyms: [] },
      { id: "followers", name: "Members (Channel/Group)", synonyms: ["member", "sub", "follower"] },
      { id: "views", name: "Post Views", synonyms: ["view", "post"] },
      { id: "reactions", name: "Emoji Reactions", synonyms: ["reaction", "emoji", "like"] },
      { id: "shares", name: "Post Shares / Forwards", synonyms: ["share", "forward"] },
      { id: "votes", name: "Poll Votes", synonyms: ["vote", "poll"] },
    ],
    variants: [
      { id: "all", name: "All Variants" },
      { id: "channel", name: "Public Channel" },
      { id: "group", name: "Private Group" },
      { id: "post", name: "Single Post" },
      { id: "future", name: "Auto Future Posts" },
      { id: "premium", name: "Telegram Premium" },
    ],
  },
  facebook: {
    types: [
      { id: "all", name: "All Facebook Services", synonyms: [] },
      { id: "followers", name: "Page Followers & Likes", synonyms: ["follower", "page", "like"] },
      { id: "likes", name: "Post Likes & Reactions", synonyms: ["like", "reaction"] },
      { id: "views", name: "Video & Reel Views", synonyms: ["view", "watch"] },
      { id: "comments", name: "Comments", synonyms: ["comment"] },
      { id: "shares", name: "Post Shares", synonyms: ["share"] },
      { id: "votes", name: "Poll Votes", synonyms: ["vote", "poll"] },
    ],
    variants: [
      { id: "all", name: "All Variants" },
      { id: "page", name: "Page / Profile" },
      { id: "post", name: "Post" },
      { id: "reel", name: "Reel" },
      { id: "video", name: "Video" },
      { id: "live", name: "Live Stream" },
    ],
  },
  x: {
    types: [
      { id: "all", name: "All X (Twitter) Services", synonyms: [] },
      { id: "followers", name: "Followers", synonyms: ["follower", "sub"] },
      { id: "likes", name: "Likes", synonyms: ["like"] },
      { id: "views", name: "Tweet Views & Impressions", synonyms: ["view", "impression"] },
      { id: "shares", name: "Retweets & Reposts", synonyms: ["retweet", "share", "repost"] },
      { id: "comments", name: "Comments & Replies", synonyms: ["comment", "reply"] },
      { id: "votes", name: "Poll Votes", synonyms: ["vote", "poll"] },
    ],
    variants: [
      { id: "all", name: "All Variants" },
      { id: "profile", name: "Profile" },
      { id: "tweet", name: "Tweet" },
      { id: "video", name: "Video" },
    ],
  },
  whatsapp: {
    types: [
      { id: "all", name: "All WhatsApp Services", synonyms: [] },
      { id: "followers", name: "Channel Members", synonyms: ["member", "sub"] },
      { id: "reactions", name: "Channel Post Reactions", synonyms: ["reaction", "emoji"] },
      { id: "votes", name: "Poll Votes", synonyms: ["vote", "poll"] },
    ],
    variants: [
      { id: "all", name: "All Variants" },
      { id: "channel", name: "Channel" },
      { id: "post", name: "Post" },
    ],
  },
  threads: {
    types: [
      { id: "all", name: "All Threads Services", synonyms: [] },
      { id: "followers", name: "Followers", synonyms: ["follower", "sub"] },
      { id: "likes", name: "Likes", synonyms: ["like"] },
      { id: "comments", name: "Comments", synonyms: ["comment"] },
      { id: "shares", name: "Reposts / Shares", synonyms: ["repost", "share"] },
    ],
    variants: [
      { id: "all", name: "All Variants" },
      { id: "profile", name: "Profile" },
      { id: "post", name: "Post" },
    ],
  },
};

const VARIANT_SYNONYMS: Record<string, string[]> = {
  all: [],
  post: ["post", "photo", "picture", "feed"],
  reel: ["reel", "reels"],
  story: ["story", "stories"],
  video: ["video", "watch", "play"],
  short: ["short", "shorts"],
  live: ["live", "stream", "concurrent"],
  channel: ["channel", "broadcast"],
  group: ["group", "private group"],
  profile: ["profile", "account", "page"],
  igtv: ["igtv"],
  community: ["community"],
  adword: ["adword", "adwords", "ads", "ad-based"],
  future: ["future", "auto post", "auto-post"],
  premium: ["premium"],
  tweet: ["tweet", "twitter"],
};

const REFILL_OPTIONS = [
  { value: "auto", label: "Auto / API Default" },
  { value: "none", label: "No Refill (0 Days)" },
  { value: "30d", label: "30 Days Guarantee" },
  { value: "60d", label: "60 Days Guarantee" },
  { value: "90d", label: "90 Days Guarantee" },
  { value: "365d", label: "365 Days Guarantee" },
  { value: "lifetime", label: "Lifetime Guarantee" },
];

const QUALITY_OPTIONS = [
  { value: "default", label: "Default Quality" },
  { value: "hq", label: "High Quality (HQ)" },
  { value: "real", label: "Real / Organic" },
  { value: "cheap", label: "Cheap / Bot" },
  { value: "india", label: "India Targeted" },
  { value: "usa", label: "USA Targeted" },
  { value: "global", label: "Worldwide" },
];

function formatInrRate(rate: number): string {
  if (typeof rate !== "number" || isNaN(rate)) return "₹0.00";
  return `₹${rate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

export function ProviderMappingAudit({ initialServices }: { initialServices: ServiceItem[] }) {
  const { formatMoney } = useCurrency();
  
  // State
  const [providers, setProviders] = React.useState<SmmProvider[]>([]);
  const [selectedProviderKey, setSelectedProviderKey] = React.useState<string>("topsmm");
  const [selectedPlatform, setSelectedPlatform] = React.useState<string>("instagram");
  const [selectedType, setSelectedType] = React.useState<string>("all");
  const [selectedVariant, setSelectedVariant] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [submissionFilter, setSubmissionFilter] = React.useState<"all" | "provider_picked" | "active_only">("all");
  const [services, setServices] = React.useState<ServiceItem[]>(initialServices);

  // Auto-switch filter if provider submissions exist
  React.useEffect(() => {
    const hasSubmissions = initialServices.some(s => s.hasPendingProviderSubmission);
    if (hasSubmissions) {
      setSubmissionFilter("provider_picked");
    }
  }, [initialServices]);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Detail Modal State
  const [activeEditingService, setActiveEditingService] = React.useState<ServiceItem | null>(null);

  // Collapsed Category Sections State
  const [collapsedCategories, setCollapsedCategories] = React.useState<Record<string, boolean>>({});

  // Mappings local state
  const [activeMap, setActiveMap] = React.useState<Record<string, boolean>>({});
  const [refillMap, setRefillMap] = React.useState<Record<string, string>>({});
  const [qualityMap, setQualityMap] = React.useState<Record<string, string>>({});
  const [displayNameMap, setDisplayNameMap] = React.useState<Record<string, string>>({});
  const [displayDescMap, setDisplayDescMap] = React.useState<Record<string, string>>({});

  // Reset selectedType & selectedVariant when platform changes
  React.useEffect(() => {
    setSelectedType("all");
    setSelectedVariant("all");
    setCollapsedCategories({});
  }, [selectedPlatform]);

  // Load providers list
  React.useEffect(() => {
    async function loadProviders() {
      try {
        const data = await apiClient.get<SmmProvider[]>("/admin/providers");
        if (data && data.length > 0) {
          setProviders(data);
          setSelectedProviderKey(data[0].key);
        }
      } catch (err) {
        console.error("Failed to load providers", err);
      }
    }
    loadProviders();
  }, []);

  // Sync initialServices into maps
  React.useEffect(() => {
    setActiveMap((prev) => {
      const actMap: Record<string, boolean> = { ...prev };
      const hasPendingSubmissions = services.some((s) => s.hasPendingProviderSubmission);

      services.forEach((s) => {
        const id = s.id || s.sourceServiceId;
        const sourceId = s.sourceServiceId || (s.id.includes(":") ? s.id.split(":")[1] : s.id);
        const isPickedByProvider =
          s.hasPendingProviderSubmission ||
          s.pendingProviderStatus === "active" ||
          s.proposedStatus === "active" ||
          (s.tags && s.tags.some((t) => t.includes("provider_status:active") || t.includes("proposed_status:active") || t.includes("provider_pending:")));

        if (actMap[id] === undefined && actMap[sourceId] === undefined) {
          const hasDbOverride =
            (s.tags && s.tags.length > 0) ||
            Boolean(s.displayName) ||
            Boolean(s.proposedStatus) ||
            s.hasPendingProviderSubmission ||
            s.pendingProviderStatus === "active";

          let isAct = false;
          if (hasPendingSubmissions) {
            isAct = Boolean(isPickedByProvider);
          } else if (hasDbOverride) {
            isAct = s.status === "active" && !s.isHidden;
          } else {
            isAct = false;
          }

          actMap[id] = isAct;
          actMap[sourceId] = isAct;
        }
      });
      return actMap;
    });

    setRefillMap((prev) => {
      const next = { ...prev };
      services.forEach((s) => {
        const id = s.id || s.sourceServiceId;
        if (!next[id] && s.proposedRefillTag) next[id] = s.proposedRefillTag;
      });
      return next;
    });

    setQualityMap((prev) => {
      const next = { ...prev };
      services.forEach((s) => {
        const id = s.id || s.sourceServiceId;
        if (!next[id] && s.quality) next[id] = s.quality;
      });
      return next;
    });

    setDisplayNameMap((prev) => {
      const next = { ...prev };
      services.forEach((s) => {
        const id = s.id || s.sourceServiceId;
        if (!next[id] && s.displayName) next[id] = s.displayName;
      });
      return next;
    });

    setDisplayDescMap((prev) => {
      const next = { ...prev };
      services.forEach((s) => {
        const id = s.id || s.sourceServiceId;
        if (!next[id] && s.displayDescription) next[id] = s.displayDescription;
      });
      return next;
    });
  }, [services]);

  // Refresh services from backend
  const handleRefreshServices = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/admin/services?refresh=true");
      if (!res.ok) throw new Error("Failed to fetch services");
      const data = await res.json();
      if (data.services) {
        setServices(data.services);
        toast.success(`Refreshed ${data.services.length} services from providers!`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to refresh services");
    } finally {
      setIsRefreshing(false);
    }
  };

  const currentTaxonomy = PLATFORM_TAXONOMY[selectedPlatform] || PLATFORM_TAXONOMY.instagram;

  // Filtered candidate services preserving TopSMM API array order
  const candidateServices = React.useMemo(() => {
    const currentPlatformObj = PLATFORMS.find((p) => p.id === selectedPlatform) || PLATFORMS[0];
    const platformSynonyms = currentPlatformObj.synonyms;

    const currentTypeObj = currentTaxonomy.types.find((t) => t.id === selectedType) || currentTaxonomy.types[0];
    const typeSynonyms = currentTypeObj.synonyms;

    return services.filter((s) => {
      // 0. Provider Line Match
      if (selectedProviderKey && selectedProviderKey !== "all") {
        const pKey = selectedProviderKey.toLowerCase();
        const sProv = (s.providerName || "").toLowerCase();
        const sId = (s.id || s.sourceServiceId || "").toLowerCase();
        const matchesProv = sProv.includes(pKey) || sId.startsWith(pKey) || sId.includes(`:${pKey}`);
        if (sProv && !matchesProv) return false;
      }

      // 1. Platform Match
      const sPlatform = (s.platform || "").toLowerCase();
      const sCategory = (s.rawProviderCategory || s.providerCategory || s.category || "").toLowerCase();
      const sName = (s.displayName || s.name || s.providerName || "").toLowerCase();

      const matchesPlatform =
        platformSynonyms.some((syn) => sPlatform.includes(syn)) ||
        platformSynonyms.some((syn) => sCategory.includes(syn));

      if (!matchesPlatform) return false;

      // 2. Service Type Match
      let matchesType = true;
      if (selectedType !== "all") {
        const sType = (s.type || "").toLowerCase();
        const matchesExactType = sType === selectedType;
        const matchesSynonym = typeSynonyms.some(
          (syn) => sName.includes(syn) || sCategory.includes(syn)
        );
        matchesType = matchesExactType || matchesSynonym;
      }

      if (!matchesType) return false;

      // 3. Sub-Selection Variant Match
      let matchesVariant = true;
      if (selectedVariant !== "all") {
        const vSynonyms = VARIANT_SYNONYMS[selectedVariant] || [selectedVariant];
        const sVariant = (s.variant || "").toLowerCase();
        matchesVariant =
          vSynonyms.some((syn) => sVariant.includes(syn)) ||
          vSynonyms.some((syn) => sName.includes(syn)) ||
          vSynonyms.some((syn) => sCategory.includes(syn));
      }

      if (!matchesVariant) return false;

      // 4. Keyword Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          sName.includes(query) ||
          s.sourceServiceId.includes(query) ||
          sCategory.includes(query) ||
          (s.displayName && s.displayName.toLowerCase().includes(query));

        if (!matchesSearch) return false;
      }

      // 5. Submission / Status Filter
      if (submissionFilter === "provider_picked") {
        const isCurated =
          s.hasPendingProviderSubmission ||
          s.pendingProviderStatus === "active" ||
          (s.tags && s.tags.some((t) => t.includes("provider_status:") || t.includes("provider_pending:"))) ||
          activeMap[s.id || s.sourceServiceId] ||
          (!s.isHidden && s.status !== "hidden");
        if (!isCurated) return false;
      } else if (submissionFilter === "active_only") {
        const isAct = activeMap[s.id || s.sourceServiceId];
        if (!isAct) return false;
      }

      return true;
    });
  }, [services, selectedProviderKey, selectedPlatform, selectedType, selectedVariant, searchQuery, submissionFilter, activeMap, currentTaxonomy]);

  // Group Candidate Services & Preserve 100% RAW TopSMM API Sequence
  const { categoryOrder, groupedCandidateServices } = React.useMemo(() => {
    const categoryOrder: string[] = [];
    const groupedCandidateServices: Record<string, ServiceItem[]> = {};

    candidateServices.forEach((s) => {
      const catName =
        s.rawProviderCategory ||
        s.providerCategory ||
        s.category ||
        `${selectedPlatform.toUpperCase()} General Category`;

      if (!groupedCandidateServices[catName]) {
        groupedCandidateServices[catName] = [];
        categoryOrder.push(catName);
      }
      groupedCandidateServices[catName].push(s);
    });

    return { categoryOrder, groupedCandidateServices };
  }, [candidateServices, selectedPlatform]);

  // Toggle Collapse Section for a raw category
  const toggleCategoryCollapse = (catName: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  // Toggle all services inside a specific raw category
  const toggleGroupServices = (catName: string, enable: boolean) => {
    const groupItems = groupedCandidateServices[catName] || [];
    setActiveMap((prev) => {
      const next = { ...prev };
      groupItems.forEach((s) => {
        const id = s.id || s.sourceServiceId;
        next[id] = enable;
      });
      return next;
    });
  };

  // Toggle Single Service Active Status
  const toggleActive = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const sourceId = id.includes(":") ? id.split(":")[1] : id;
    const prefixedId = id.includes(":") ? id : `topsmm:${id}`;
    setActiveMap((prev) => {
      const currentVal = prev[id] ?? prev[sourceId] ?? prev[prefixedId] ?? false;
      const nextVal = !currentVal;
      return {
        ...prev,
        [id]: nextVal,
        [sourceId]: nextVal,
        [prefixedId]: nextVal,
      };
    });
  };

  // Batch toggle all visible in candidate list
  const toggleSelectAllVisible = (enable: boolean) => {
    const nextMap = { ...activeMap };
    candidateServices.forEach((s) => {
      const id = s.id || s.sourceServiceId;
      const sourceId = s.sourceServiceId || (id.includes(":") ? id.split(":")[1] : id);
      nextMap[id] = enable;
      nextMap[sourceId] = enable;
    });
    setActiveMap(nextMap);
  };

  // Save Mappings & Curation to Backend
  const handleSaveMappings = async () => {
    try {
      setIsSaving(true);
      const uniqueUpdatesMap = new Map<string, any>();

      Object.keys(activeMap).forEach((id) => {
        const sourceId = id.includes(":") ? id.split(":")[1] : id;
        uniqueUpdatesMap.set(sourceId, {
          id: sourceId,
          status: activeMap[id] ? "active" : "hidden",
          displayName: displayNameMap[id] || undefined,
          quality: qualityMap[id] || undefined,
          refillTag: refillMap[id] || undefined,
        });
      });

      const updates = Array.from(uniqueUpdatesMap.values());

      if (updates.length === 0) {
        toast.info("No services found to save.");
        return;
      }

      await apiClient.post("/admin/services/curate", { updates });
      toast.success(`Successfully saved canonical mapping for ${updates.length} services!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save canonical mappings");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Approve Single Pending Provider Submission
  const handleAcceptSinglePending = async (service: ServiceItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const id = service.id || service.sourceServiceId;
    const newStatus = service.proposedStatus || service.pendingProviderStatus || "active";
    const isActive = newStatus === "active";

    try {
      setActiveMap((prev) => ({ ...prev, [id]: isActive }));
      setServices((prev) =>
        prev.map((s) =>
          (s.id || s.sourceServiceId) === id
            ? {
                ...s,
                status: newStatus as any,
                isHidden: !isActive,
                min: service.proposedMin || s.min,
                max: service.proposedMax || s.max,
                quality: service.proposedQuality || s.quality,
                hasPendingProviderSubmission: false,
              }
            : s
        )
      );

      const sourceId = id.includes(":") ? id.split(":")[1] : id;
      await apiClient.post("/admin/services/curate", {
        updates: [
          {
            id: sourceId,
            status: newStatus,
            min: service.proposedMin || undefined,
            max: service.proposedMax || undefined,
            refillTag: service.proposedRefillTag || undefined,
            quality: service.proposedQuality || undefined,
            approveProviderSubmission: true,
          },
        ],
      });

      toast.success(`Accepted provider update for #${service.sourceServiceId}!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to accept provider update");
    }
  };

  // Handle Reject Single Pending Provider Submission
  const handleRejectSinglePending = async (service: ServiceItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const id = service.id || service.sourceServiceId;

    try {
      const sourceId = id.includes(":") ? id.split(":")[1] : id;
      await apiClient.post("/admin/services/curate", {
        updates: [{ id: sourceId, status: service.status || "active", rejectProviderSubmission: true }],
      });

      setServices((prev) =>
        prev.map((s) =>
          (s.id || s.sourceServiceId) === id ? { ...s, hasPendingProviderSubmission: false } : s
        )
      );

      toast.info(`Rejected provider proposal for #${service.sourceServiceId}. Reverted to original settings.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to reject provider update");
    }
  };

  // Handle Accept All Pending Submissions
  const handleApproveAllPending = async () => {
    const pendingItems = services.filter((s) => s.hasPendingProviderSubmission);
    if (pendingItems.length === 0) return;

    const pendingItemIds = new Set(pendingItems.map((s) => s.id || s.sourceServiceId));

    try {
      await apiClient.post("/admin/services/clear-pending-provider-submissions?action=accept_all", {});

      // Synchronize submission batch status in JSON audit file to 'approved'
      try {
        await fetch("/api/provider/services/curate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        });
      } catch (err) {
        console.error("Failed to sync submission file approval status", err);
      }

      const nextActiveMap: Record<string, boolean> = {};
      const updates: any[] = [];

      services.forEach((s) => {
        const id = s.id || s.sourceServiceId;
        const sourceId = id.includes(":") ? id.split(":")[1] : id;
        
        // Preserve previously active services (already approved) + new pending services
        const isPreviouslyActive = activeMap[id] || (!s.isHidden && s.status !== "hidden");
        const isPickedByProvider = pendingItemIds.has(id) || s.pendingProviderStatus === "active" || isPreviouslyActive;

        nextActiveMap[id] = isPickedByProvider;

        updates.push({
          id: sourceId,
          status: isPickedByProvider ? "active" : "hidden",
          min: pendingItemIds.has(id) ? s.proposedMin || s.min : s.min,
          max: pendingItemIds.has(id) ? s.proposedMax || s.max : s.max,
          refillTag: pendingItemIds.has(id) ? s.proposedRefillTag || undefined : undefined,
          quality: pendingItemIds.has(id) ? s.proposedQuality || s.quality : s.quality,
        });
      });

      // Save curation override to DB permanently
      await apiClient.post("/admin/services/curate", { updates });

      setActiveMap(nextActiveMap);
      setServices((prev) =>
        prev.map((s) => {
          const id = s.id || s.sourceServiceId;
          const isPicked = pendingItemIds.has(id) || s.pendingProviderStatus === "active";
          return {
            ...s,
            hasPendingProviderSubmission: false,
            status: isPicked ? "active" : "hidden",
            isHidden: !isPicked,
          };
        })
      );

      setSubmissionFilter("active_only");
      toast.success(`Accepted ${pendingItems.length} provider-verified services! Only provider-verified working services are now active.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to accept all provider updates");
    }
  };

  // Handle Reject All Pending Submissions
  const handleRejectAllPending = async () => {
    try {
      await apiClient.post("/admin/services/clear-pending-provider-submissions?action=reject_all", {});
      try {
        await fetch("/api/provider/services/curate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reject" }),
        });
      } catch (err) {
        console.error("Failed to sync submission file rejection status", err);
      }

      setServices((prev) =>
        prev.map((s) => ({ ...s, hasPendingProviderSubmission: false }))
      );
      toast.info("Cleared all pending provider submission alerts permanently.");
    } catch (err: any) {
      toast.error(err.message || "Failed to clear pending submissions");
    }
  };

  const pendingProviderServices = services.filter((s) => s.hasPendingProviderSubmission);

  const activeCountInCandidates = candidateServices.filter(
    (s) => activeMap[s.id || s.sourceServiceId]
  ).length;

  const currentPlatformObj = PLATFORMS.find((p) => p.id === selectedPlatform) || PLATFORMS[0];
  const CurrentPlatformIcon = currentPlatformObj.icon;

  return (
    <div className="flex flex-col space-y-4 w-full pb-12">
      {/* PENDING PROVIDER VERIFICATION AUDIT STAGING BANNER */}
      {pendingProviderServices.length > 0 && (
        <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-500 rounded-lg shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                ⚡ Provider Submitted {pendingProviderServices.length} Verification Audits for Review
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                TopSMM supplier team verified working services & corrected API limits. Review and accept or reject below.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex-1 md:flex-initial"
              onClick={handleApproveAllPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Accept All ({pendingProviderServices.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500/10 text-xs flex-1 md:flex-initial"
              onClick={handleRejectAllPending}
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Reject All
            </Button>
          </div>
        </div>
      )}

      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-lg border", currentPlatformObj.bg)}>
            <CurrentPlatformIcon className={cn("w-6 h-6", currentPlatformObj.color)} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              Canonical Provider Audit Matrix
              <Badge variant="secondary" className="text-xs font-mono">
                {categoryOrder.length} Supplier Categories ({candidateServices.length} Services)
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              Manage live website status, titles & options for all TopSMM services.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshServices}
            disabled={isRefreshing}
            className="gap-2 text-xs"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            Sync Provider API
          </Button>

          <Button
            size="sm"
            onClick={handleSaveMappings}
            disabled={isSaving}
            className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow text-xs font-bold"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Main 2-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* LEFT SIDEBAR (~30% / 4 Cols) - PLATFORM TAXONOMY */}
        <Card className="lg:col-span-4 flex flex-col border shadow-sm sticky top-4">
          <CardHeader className="p-4 border-b bg-muted/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" /> Platform Taxonomy Filters
            </CardTitle>
            <CardDescription className="text-xs">
              Select platform & service category
            </CardDescription>
          </CardHeader>

          <div className="p-4 space-y-5 max-h-[calc(100vh-14rem)] overflow-y-auto">
            {/* 1. Provider Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-primary" /> Provider Line
              </Label>
              <Select value={selectedProviderKey} onValueChange={setSelectedProviderKey}>
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-bold">All Providers Catalog</SelectItem>
                  {providers.length > 0 ? (
                    providers.map((p) => (
                      <SelectItem key={p.key} value={p.key} className="text-xs">
                        {p.name} ({p.currency || "USD"})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="topsmm" className="text-xs">TOPSMM (Default)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Platform Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">1️⃣ Select Platform</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {PLATFORMS.map((p) => {
                  const Icon = p.icon;
                  const isSelected = selectedPlatform === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlatform(p.id)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg text-xs font-medium transition-all text-left border",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                          : "hover:bg-muted/80 bg-background border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary-foreground" : p.color)} />
                      <span className="truncate">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. DYNAMIC Categories tailored per Platform */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>2️⃣ {currentPlatformObj.name} Categories</span>
                <span className="text-[10px] text-primary">{currentTaxonomy.types.length - 1} Types</span>
              </Label>
              <div className="space-y-1">
                {currentTaxonomy.types.map((t) => {
                  const isSelected = selectedType === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedType(t.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors border",
                        isSelected
                          ? "bg-secondary text-secondary-foreground border-primary/50 font-semibold shadow-xs"
                          : "hover:bg-muted/50 bg-background border-transparent text-muted-foreground"
                      )}
                    >
                      <span>{t.name}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. DYNAMIC Variants Sub-Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">3️⃣ Sub-Type Variant</Label>
              <div className="flex flex-wrap gap-1">
                {currentTaxonomy.variants.map((v) => {
                  const isSelected = selectedVariant === v.id;
                  return (
                    <Button
                      key={v.id}
                      variant={isSelected ? "default" : "outline"}
                      size="xs"
                      onClick={() => setSelectedVariant(v.id)}
                      className="text-xs h-7 rounded-md"
                    >
                      {v.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* 5. Search Filter */}
            <div className="space-y-1.5 pt-2 border-t">
              <Label className="text-xs font-medium text-muted-foreground">Search Services</Label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search Service ID or Title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* RIGHT MAIN CANVAS (~70% / 8 Cols) - CLEAN PRODUCT CARDS */}
        <Card className="lg:col-span-8 flex flex-col border shadow-sm min-h-[600px]">
          {/* Subheader Toolbar */}
          <div className="p-3.5 border-b bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1 bg-background p-1 rounded-lg border">
                <Button
                  size="xs"
                  variant={submissionFilter === "all" ? "default" : "ghost"}
                  onClick={() => setSubmissionFilter("all")}
                  className="text-[11px] h-7 px-2.5"
                >
                  All Provider Catalog
                </Button>
                <Button
                  size="xs"
                  variant={submissionFilter === "provider_picked" ? "default" : "ghost"}
                  onClick={() => setSubmissionFilter("provider_picked")}
                  className={cn(
                    "text-[11px] h-7 px-2.5 gap-1",
                    submissionFilter === "provider_picked"
                      ? "bg-amber-600 text-white font-bold"
                      : "text-amber-600 dark:text-amber-400 font-semibold"
                  )}
                >
                  <Sparkles className="w-3 h-3" /> Curated (Live + Pending)
                </Button>
                <Button
                  size="xs"
                  variant={submissionFilter === "active_only" ? "default" : "ghost"}
                  onClick={() => setSubmissionFilter("active_only")}
                  className={cn(
                    "text-[11px] h-7 px-2.5",
                    submissionFilter === "active_only" ? "bg-emerald-600 text-white font-bold" : "text-emerald-600"
                  )}
                >
                  Active Only ({activeCountInCandidates})
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => toggleSelectAllVisible(true)}
                className="text-xs h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              >
                <CheckSquare className="w-3.5 h-3.5 mr-1" /> Enable All Group
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => toggleSelectAllVisible(false)}
                className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Square className="w-3.5 h-3.5 mr-1" /> Disable All
              </Button>
            </div>
          </div>

          {/* CATEGORY SECTION GROUPS CONTAINER */}
          <div className="p-4 max-h-[calc(100vh-14rem)] overflow-y-auto space-y-6">
            {categoryOrder.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                <XCircle className="w-12 h-12 mb-3 text-muted-foreground/40" />
                <p className="font-semibold text-base text-foreground">No Services Match This Selection</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  Showing <strong>{selectedPlatform}</strong> ➔ <strong>{selectedType}</strong>.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedType("all");
                    setSelectedVariant("all");
                    setSearchQuery("");
                  }}
                  className="mt-4 gap-2 text-xs"
                >
                  <Layers className="w-4 h-4" /> Reset Filters & Show All {selectedPlatform} Services ({services.length} Total)
                </Button>
              </div>
            ) : (
              /* CLEAN CATEGORY CONTAINERS */
              categoryOrder.map((catName) => {
                const groupItems = groupedCandidateServices[catName] || [];
                const isCollapsed = !!collapsedCategories[catName];
                const activeCountInGroup = groupItems.filter(
                  (s) => activeMap[s.id || s.sourceServiceId]
                ).length;

                return (
                  <div key={catName} className="border rounded-xl bg-card overflow-hidden shadow-xs space-y-0">
                    {/* CATEGORY HEADER */}
                    <div
                      onClick={() => toggleCategoryCollapse(catName)}
                      className="p-3 bg-muted/40 hover:bg-muted/70 transition-colors border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <Folder className="w-4 h-4 text-primary shrink-0" />
                        <h3 className="font-bold text-xs text-foreground flex items-center gap-2 leading-snug">
                          {catName}
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {groupItems.length} Services
                          </Badge>
                          <Badge
                            className={cn(
                              "text-[10px]",
                              activeCountInGroup > 0 ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                            )}
                          >
                            {activeCountInGroup} Active on Store
                          </Badge>
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroupServices(catName, true);
                          }}
                          className="h-6 text-[10px] text-emerald-600 hover:bg-emerald-50 px-2"
                        >
                          <CheckSquare className="w-3 h-3 mr-1" /> Enable Group
                        </Button>

                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroupServices(catName, false);
                          }}
                          className="h-6 text-[10px] text-red-600 hover:bg-red-50 px-2"
                        >
                          <Square className="w-3 h-3 mr-1" /> Hide Group
                        </Button>

                        <Button size="xs" variant="ghost" className="h-6 w-6 p-0">
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* CLEAN PRODUCT CARDS GRID */}
                    {!isCollapsed && (
                      <div className="p-3.5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {groupItems.map((service) => {
                            const id = service.id || service.sourceServiceId;
                            const isActive = !!activeMap[id];

                            const serviceTitle =
                              displayNameMap[id] ||
                              service.displayName ||
                              service.name ||
                              service.providerName ||
                              `Service #${service.sourceServiceId}`;

                            return (
                              <Card
                                key={id}
                                onClick={() => setActiveEditingService(service)}
                                className={cn(
                                  "relative flex flex-col justify-between transition-all border p-4 rounded-xl shadow-xs cursor-pointer hover:border-primary hover:shadow-md group",
                                  isActive
                                    ? "border-emerald-500/60 bg-emerald-500/[0.03]"
                                    : "border-border opacity-85 hover:opacity-100 bg-background"
                                )}
                              >
                                <div className="space-y-3">
                                  {/* Top Badge: Provider ID & Price */}
                                  <div className="flex items-center justify-between gap-2">
                                    <Badge variant="outline" className="font-mono text-[11px] font-bold bg-muted/60">
                                      #{service.sourceServiceId}
                                    </Badge>
                                    <Badge className="bg-emerald-600 text-white font-mono text-[11px] font-bold">
                                      {formatInrRate(service.ratePer1000)} / 1k
                                    </Badge>
                                  </div>

                                  {/* Clean Service Title */}
                                  <div>
                                    <h4 className="font-bold text-xs text-foreground leading-snug line-clamp-3 group-hover:text-primary transition-colors">
                                      {serviceTitle}
                                    </h4>
                                    <p className="text-[10px] text-muted-foreground font-mono mt-1">
                                      Limits: {service.min} - {service.max.toLocaleString()}
                                    </p>
                                  </div>

                                  {/* Pending Provider Audit Proposal Banner & Detailed Diff */}
                                  {service.hasPendingProviderSubmission && (
                                    <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-2.5 flex flex-col gap-2 text-xs">
                                      <div className="flex items-center justify-between font-bold">
                                        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-300 text-[11px]">
                                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                          TopSMM Proposed Audit:
                                        </span>
                                        <Badge
                                          className={cn(
                                            "text-[10px] font-bold",
                                            service.proposedStatus === "active" || service.pendingProviderStatus === "active"
                                              ? "bg-emerald-600 text-white"
                                              : "bg-red-600 text-white"
                                          )}
                                        >
                                          {service.proposedStatus === "active" || service.pendingProviderStatus === "active"
                                            ? "🟢 Working"
                                            : "🔴 Broken"}
                                        </Badge>
                                      </div>

                                      {/* Detailed Change Diff Lines */}
                                      <div className="text-[11px] space-y-0.5 text-foreground/90 font-mono bg-background/50 p-2 rounded-lg border border-amber-500/20">
                                        {service.proposedStatus && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Status:</span>
                                            <span className="font-semibold text-amber-600 dark:text-amber-300">
                                              {isActive ? "Active" : "Hidden"} ➔ {service.proposedStatus === "active" ? "🟢 Working" : "🔴 Hidden"}
                                            </span>
                                          </div>
                                        )}
                                        {!!service.proposedMin && service.proposedMin !== service.min && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Min Limit:</span>
                                            <span className="font-semibold text-amber-600 dark:text-amber-300">
                                              {service.min} ➔ {service.proposedMin}
                                            </span>
                                          </div>
                                        )}
                                        {!!service.proposedMax && service.proposedMax !== service.max && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Max Limit:</span>
                                            <span className="font-semibold text-amber-600 dark:text-amber-300">
                                              {service.max.toLocaleString()} ➔ {service.proposedMax.toLocaleString()}
                                            </span>
                                          </div>
                                        )}
                                        {!!service.proposedRefillTag && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Refill Tag:</span>
                                            <span className="font-semibold text-amber-600 dark:text-amber-300">
                                              {service.proposedRefillTag}
                                            </span>
                                          </div>
                                        )}
                                        {!!service.proposedQuality && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">Quality Tag:</span>
                                            <span className="font-semibold text-amber-600 dark:text-amber-300">
                                              {service.proposedQuality}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1.5 pt-0.5">
                                        <Button
                                          size="xs"
                                          className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex-1"
                                          onClick={(e) => handleAcceptSinglePending(service, e)}
                                        >
                                          <CheckCircle2 className="w-3 h-3 mr-1" /> Accept
                                        </Button>
                                        <Button
                                          size="xs"
                                          variant="outline"
                                          className="h-6 text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500/10 flex-1 font-bold"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveEditingService(service);
                                          }}
                                        >
                                          <Edit3 className="w-3 h-3 mr-1" /> Modify
                                        </Button>
                                        <Button
                                          size="xs"
                                          variant="outline"
                                          className="h-6 text-[10px] border-red-500/40 text-red-500 hover:bg-red-500/10 flex-1 font-bold"
                                          onClick={(e) => handleRejectSinglePending(service, e)}
                                        >
                                          <XCircle className="w-3 h-3 mr-1" /> Reject
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Bottom Action Bar */}
                                <div className="pt-3 border-t mt-3 flex items-center justify-between gap-2">
                                  <button
                                    onClick={(e) => toggleActive(id, e)}
                                    className={cn(
                                      "py-1.5 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border transition-all cursor-pointer",
                                      isActive
                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                        : "bg-muted/40 hover:bg-muted text-muted-foreground border-border"
                                    )}
                                  >
                                    {isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                                    {isActive ? "Active on Site" : "Hidden"}
                                  </button>

                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveEditingService(service);
                                    }}
                                    className="h-7 text-[11px] gap-1 text-primary border-primary/30 hover:bg-primary/10 font-bold"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" /> Edit
                                  </Button>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* CLEAN, PAINLESS EDIT MODAL */}
      <Dialog open={!!activeEditingService} onOpenChange={(open) => !open && setActiveEditingService(null)}>
        {activeEditingService && (
          <DialogContent className="max-w-md p-6 rounded-2xl">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs font-bold">
                  TopSMM #{activeEditingService.sourceServiceId}
                </Badge>
                <Badge className={cn("text-xs font-bold", activeMap[activeEditingService.id || activeEditingService.sourceServiceId] ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground")}>
                  {activeMap[activeEditingService.id || activeEditingService.sourceServiceId] ? "🟢 ACTIVE ON SITE" : "⚪ HIDDEN"}
                </Badge>
              </div>
              <DialogTitle className="text-base font-bold leading-snug pt-1 text-foreground">
                Edit Service Settings
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Customize how this service appears to customers on your store.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* 1. Store Active Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
                <div>
                  <div className="font-bold text-xs text-foreground">Website Visibility</div>
                  <div className="text-[11px] text-muted-foreground">
                    {activeMap[activeEditingService.id || activeEditingService.sourceServiceId]
                      ? "Visible on customer order page"
                      : "Hidden from customer order page"}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={activeMap[activeEditingService.id || activeEditingService.sourceServiceId] ? "default" : "outline"}
                  onClick={() => toggleActive(activeEditingService.id || activeEditingService.sourceServiceId)}
                  className={cn("gap-1.5 text-xs font-bold", activeMap[activeEditingService.id || activeEditingService.sourceServiceId] && "bg-emerald-600 text-white hover:bg-emerald-700")}
                >
                  {activeMap[activeEditingService.id || activeEditingService.sourceServiceId] ? "Visible" : "Hidden"}
                </Button>
              </div>

              {/* 2. Customer Title Input */}
              <div className="space-y-1.5">
                <Label className="font-bold text-xs">Customer Facing Title</Label>
                <Input
                  placeholder={activeEditingService.name || activeEditingService.providerName}
                  value={displayNameMap[activeEditingService.id || activeEditingService.sourceServiceId] || ""}
                  onChange={(e) =>
                    setDisplayNameMap((prev) => ({
                      ...prev,
                      [activeEditingService.id || activeEditingService.sourceServiceId]: e.target.value,
                    }))
                  }
                  className="text-xs h-9 bg-background"
                />
                <p className="text-[10px] text-muted-foreground">
                  Original Title: <span className="italic">{activeEditingService.name || activeEditingService.providerName}</span>
                </p>
              </div>

              {/* 3. Cost & Limits Info */}
              <div className="grid grid-cols-2 gap-2 bg-muted/40 p-3 rounded-xl border font-mono text-center">
                <div>
                  <div className="text-[10px] text-muted-foreground">Cost Price</div>
                  <div className="font-bold text-xs text-emerald-600">{formatInrRate(activeEditingService.ratePer1000)} / 1k</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Min - Max</div>
                  <div className="font-bold text-xs">{activeEditingService.min} - {activeEditingService.max.toLocaleString()}</div>
                </div>
              </div>

              {/* 4. Refill Tag */}
              <div className="space-y-1.5">
                <Label className="font-bold text-xs">Refill Guarantee</Label>
                <Select
                  value={refillMap[activeEditingService.id || activeEditingService.sourceServiceId] || "auto"}
                  onValueChange={(val) =>
                    setRefillMap((prev) => ({
                      ...prev,
                      [activeEditingService.id || activeEditingService.sourceServiceId]: val,
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFILL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="border-t pt-3 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setActiveEditingService(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handleSaveMappings();
                  setActiveEditingService(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold"
              >
                <Save className="w-4 h-4" /> Save Settings
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
