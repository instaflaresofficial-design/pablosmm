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
  Check,
  SendHorizontal,
  Sliders,
  Edit3,
  ShieldCheck,
  Clock,
  RotateCcw,
  Sparkles,
  FileText,
  Plus,
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
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
  status?: "active" | "hidden" | "disabled";
  isHidden?: boolean;
  displayName?: string;
  quality?: string;
  description?: string;
  displayDescription?: string;
  raw?: {
    description?: string;
    [key: string]: any;
  };
}

// 1. Platforms Config
function formatInrRate(rate: number): string {
  if (typeof rate !== "number" || isNaN(rate)) return "₹0.00";
  return `₹${rate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

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

export function detectRefillFromTitle(title?: string): {
  hasRefill: boolean;
  tagValue: string | null;
  label: string | null;
  detectedFromTitle: boolean;
} {
  if (!title) return { hasRefill: false, tagValue: null, label: null, detectedFromTitle: false };

  const lower = title.toLowerCase();

  // 0. Explicit NO REFILL Guard (Must check FIRST!)
  const isExplicitNoRefill =
    lower.includes("no refill") ||
    lower.includes("no-refill") ||
    lower.includes("without refill") ||
    lower.includes("no guarantee") ||
    lower.includes("0 days refill") ||
    lower.includes("0-day refill") ||
    lower.includes("0d refill") ||
    lower.includes("non-refill") ||
    lower.includes("no refill button") ||
    lower.includes("no auto refill") ||
    lower.includes("not refillable") ||
    lower.includes("no refill guarantee");

  if (isExplicitNoRefill) {
    return { hasRefill: false, tagValue: "none", label: "No Refill", detectedFromTitle: true };
  }

  // 1. Lifetime
  if (lower.includes("lifetime") || lower.includes("forever")) {
    return { hasRefill: true, tagValue: "lifetime", label: "Lifetime Guarantee", detectedFromTitle: true };
  }

  // 2. 365 days / 1 year
  if (
    lower.includes("365 day") ||
    lower.includes("365-day") ||
    lower.includes("365d") ||
    lower.includes("365 days") ||
    lower.includes("1 year refill") ||
    lower.includes("r365")
  ) {
    return { hasRefill: true, tagValue: "365d", label: "365 Days Guarantee", detectedFromTitle: true };
  }

  // 3. 90 days
  if (
    lower.includes("90 day") ||
    lower.includes("90-day") ||
    lower.includes("90d") ||
    lower.includes("90 days") ||
    lower.includes("r90")
  ) {
    return { hasRefill: true, tagValue: "90d", label: "90 Days Guarantee", detectedFromTitle: true };
  }

  // 4. 60 days
  if (
    lower.includes("60 day") ||
    lower.includes("60-day") ||
    lower.includes("60d") ||
    lower.includes("60 days") ||
    lower.includes("r60")
  ) {
    return { hasRefill: true, tagValue: "60d", label: "60 Days Guarantee", detectedFromTitle: true };
  }

  // 5. 30 days
  if (
    lower.includes("30 day") ||
    lower.includes("30-day") ||
    lower.includes("30d") ||
    lower.includes("30 days") ||
    lower.includes("r30")
  ) {
    return { hasRefill: true, tagValue: "30d", label: "30 Days Guarantee", detectedFromTitle: true };
  }

  // 6. Regex for N days refill
  const daysMatch = lower.match(/(\d+)\s*(?:days?|d)\s*(?:refill|guarantee|button|auto)/i);
  if (daysMatch) {
    const num = parseInt(daysMatch[1], 10);
    if (num >= 300) return { hasRefill: true, tagValue: "365d", label: `${num} Days Guarantee`, detectedFromTitle: true };
    if (num >= 80) return { hasRefill: true, tagValue: "90d", label: `${num} Days Guarantee`, detectedFromTitle: true };
    if (num >= 50) return { hasRefill: true, tagValue: "60d", label: `${num} Days Guarantee`, detectedFromTitle: true };
    return { hasRefill: true, tagValue: "30d", label: `${num} Days Guarantee`, detectedFromTitle: true };
  }

  // 7. Generic refill / non-drop keywords (only if positive)
  if (lower.includes("auto-refill") || lower.includes("autorefill") || lower.includes("with refill") || lower.includes("refill button")) {
    return { hasRefill: true, tagValue: "30d", label: "30 Days Guarantee", detectedFromTitle: true };
  }

  return { hasRefill: false, tagValue: null, label: null, detectedFromTitle: false };
}

export function ProviderVerificationPortal({
  initialServices,
  providerName,
}: {
  initialServices: ServiceItem[];
  /** When set, personalises the portal banner for a specific provider. */
  providerName?: string;
}) {
  const { formatMoney } = useCurrency();
  const [selectedPlatform, setSelectedPlatform] = React.useState<string>("instagram");
  const [selectedType, setSelectedType] = React.useState<string>("all");
  const [selectedVariant, setSelectedVariant] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [quickSearchInput, setQuickSearchInput] = React.useState<string>("");
  const [showOnlyWorking, setShowOnlyWorking] = React.useState<boolean>(false);
  const [services, setServices] = React.useState<ServiceItem[]>(initialServices);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Active editing modal service
  const [activeEditingService, setActiveEditingService] = React.useState<ServiceItem | null>(null);

  // Provider overrides maps
  const [workingMap, setWorkingMap] = React.useState<Record<string, boolean>>({});
  const [minMap, setMinMap] = React.useState<Record<string, string>>({});
  const [maxMap, setMaxMap] = React.useState<Record<string, string>>({});
  const [refillMap, setRefillMap] = React.useState<Record<string, string>>({});
  const [qualityMap, setQualityMap] = React.useState<Record<string, string>>({});
  const [cancelMap, setCancelMap] = React.useState<Record<string, boolean>>({});
  const [collapsedCategories, setCollapsedCategories] = React.useState<Record<string, boolean>>({});

  // Reset selectedType & selectedVariant when platform changes
  React.useEffect(() => {
    setSelectedType("all");
    setSelectedVariant("all");
    setCollapsedCategories({});
  }, [selectedPlatform]);

  // Initialize maps from initial services
  React.useEffect(() => {
    const wMap: Record<string, boolean> = {};
    const mnMap: Record<string, string> = {};
    const mxMap: Record<string, string> = {};
    const rMap: Record<string, string> = {};
    const qMap: Record<string, string> = {};
    const cMap: Record<string, boolean> = {};

    services.forEach((s) => {
      const id = s.id || s.sourceServiceId;
      wMap[id] = s.status !== "hidden" && !s.isHidden;
      mnMap[id] = String(s.min);
      mxMap[id] = String(s.max);
      cMap[id] = s.cancel;
      if (s.quality) qMap[id] = s.quality;
    });

    setWorkingMap(wMap);
    setMinMap(mnMap);
    setMaxMap(mxMap);
    setRefillMap(rMap);
    setQualityMap(qMap);
    setCancelMap(cMap);
  }, [services]);

  const currentPlatformObj = PLATFORMS.find((p) => p.id === selectedPlatform) || PLATFORMS[0];
  const CurrentPlatformIcon = currentPlatformObj.icon;
  const currentTaxonomy = PLATFORM_TAXONOMY[selectedPlatform] || PLATFORM_TAXONOMY.instagram;

  // Filter candidate services matching platform, type & variant
  const candidateServices = React.useMemo(() => {
    const platformSynonyms = currentPlatformObj.synonyms;
    const currentTypeObj = currentTaxonomy.types.find((t) => t.id === selectedType) || currentTaxonomy.types[0];
    const typeSynonyms = currentTypeObj.synonyms;

    return services.filter((s) => {
      // 1. Platform Match
      const sPlatform = (s.platform || "").toLowerCase();
      const sCategory = (s.rawProviderCategory || s.providerCategory || s.category || "").toLowerCase();
      const sName = (s.name || s.providerName || "").toLowerCase();

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

      // 3. Variant Sub-Selection Match
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
        const matchesQuery =
          sName.includes(query) ||
          s.sourceServiceId.includes(query) ||
          sCategory.includes(query);
        if (!matchesQuery) return false;
      }

      // 5. Show Only Working Services Filter
      if (showOnlyWorking) {
        const id = s.id || s.sourceServiceId;
        return !!workingMap[id];
      }

      return true;
    });
  }, [services, selectedPlatform, selectedType, selectedVariant, searchQuery, showOnlyWorking, workingMap, currentPlatformObj, currentTaxonomy]);

  // Global Quick Search Results across all 300+ items
  const quickSearchResults = React.useMemo(() => {
    if (!quickSearchInput.trim()) return [];
    const query = quickSearchInput.toLowerCase().trim();
    return services
      .filter((s) => {
        const id = (s.sourceServiceId || s.id || "").toLowerCase();
        const name = (s.name || s.providerName || "").toLowerCase();
        const cat = (s.rawProviderCategory || s.category || "").toLowerCase();
        return id.includes(query) || name.includes(query) || cat.includes(query);
      })
      .slice(0, 15);
  }, [services, quickSearchInput]);

  // Group services into categories in exact raw TopSMM order
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

  // Track explicitly modified service IDs
  const [modifiedIds, setModifiedIds] = React.useState<Record<string, boolean>>({});

  // Toggle single service working status
  const toggleWorking = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWorkingMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
    setModifiedIds((prev) => ({
      ...prev,
      [id]: true,
    }));
  };

  // Toggle whole category working status
  const toggleCategoryWorking = (catName: string, enable: boolean) => {
    const items = groupedCandidateServices[catName] || [];
    setWorkingMap((prev) => {
      const next = { ...prev };
      items.forEach((s) => {
        const id = s.id || s.sourceServiceId;
        next[id] = enable;
      });
      return next;
    });
    setModifiedIds((prev) => {
      const next = { ...prev };
      items.forEach((s) => {
        const id = s.id || s.sourceServiceId;
        next[id] = true;
      });
      return next;
    });
  };

  // Toggle Collapse Section
  const toggleCategoryCollapse = (catName: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  // Auto-tag refill guarantee from titles for a specific category
  const autoTagCategoryRefills = (catName: string) => {
    const items = groupedCandidateServices[catName] || [];
    let count = 0;

    setRefillMap((prev) => {
      const next = { ...prev };
      items.forEach((s) => {
        const id = s.id || s.sourceServiceId;
        const serviceTitle = s.name || s.providerName || "";
        const detected = detectRefillFromTitle(serviceTitle);
        if (detected.hasRefill && detected.tagValue) {
          next[id] = detected.tagValue;
          count++;
        }
      });
      return next;
    });

    setModifiedIds((prev) => {
      const next = { ...prev };
      items.forEach((s) => {
        const id = s.id || s.sourceServiceId;
        const serviceTitle = s.name || s.providerName || "";
        const detected = detectRefillFromTitle(serviceTitle);
        if (detected.hasRefill && detected.tagValue) {
          next[id] = true;
        }
      });
      return next;
    });

    if (count > 0) {
      toast.success(`Auto-tagged refill guarantees for ${count} service(s) from titles!`);
    } else {
      toast.info("No untagged refill keywords found in service titles.");
    }
  };

  // Auto-tag refill guarantee from titles across ALL candidate services in current view
  const autoTagAllRefills = () => {
    let count = 0;
    setRefillMap((prev) => {
      const next = { ...prev };
      candidateServices.forEach((s) => {
        const id = s.id || s.sourceServiceId;
        const serviceTitle = s.name || s.providerName || "";
        const detected = detectRefillFromTitle(serviceTitle);
        if (detected.hasRefill && detected.tagValue) {
          next[id] = detected.tagValue;
          count++;
        }
      });
      return next;
    });

    setModifiedIds((prev) => {
      const next = { ...prev };
      candidateServices.forEach((s) => {
        const id = s.id || s.sourceServiceId;
        const serviceTitle = s.name || s.providerName || "";
        const detected = detectRefillFromTitle(serviceTitle);
        if (detected.hasRefill && detected.tagValue) {
          next[id] = true;
        }
      });
      return next;
    });

    if (count > 0) {
      toast.success(`Auto-tagged refill guarantees for ${count} service(s) from titles!`);
    } else {
      toast.info("No untagged refill keywords found in service titles.");
    }
  };

  // Submit Verification & Correction Data to Backend
  const handleSubmitVerification = async (singleId?: string) => {
    try {
      setIsSubmitting(true);

      const targetIds = singleId
        ? [singleId]
        : Object.keys(modifiedIds).filter((id) => modifiedIds[id]);

      if (targetIds.length === 0) {
        toast.info("No modifications detected to submit.");
        return;
      }

      const updates = targetIds.map((id) => {
        const sourceId = id.includes(":") ? id.split(":")[1] : id;

        return {
          id: sourceId,
          status: workingMap[id] ? "active" : "hidden",
          min: minMap[id] ? parseInt(minMap[id], 10) : undefined,
          max: maxMap[id] ? parseInt(maxMap[id], 10) : undefined,
          refillTag: refillMap[id] || undefined,
          quality: qualityMap[id] || undefined,
          cancel: cancelMap[id] !== undefined ? cancelMap[id] : undefined,
          isProviderSubmission: true,
        };
      });

      await apiClient.post("/provider/services/curate", { updates });

      // Reset submitted IDs from modified tracking
      setModifiedIds((prev) => {
        const next = { ...prev };
        targetIds.forEach((id) => delete next[id]);
        return next;
      });

      toast.success(`Verification submitted! ${updates.length} service audit(s) sent to admin for final review.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit verification");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalWorkingInPlatform = candidateServices.filter(
    (s) => workingMap[s.id || s.sourceServiceId]
  ).length;

  return (
    <div className="flex flex-col space-y-4 w-full pb-16 max-w-7xl mx-auto px-4 pt-4">
      {/* Provider Portal Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-card to-emerald-500/10 border-2 border-primary/20 p-5 rounded-2xl shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className={cn("p-3 rounded-xl border bg-card shadow-xs shrink-0", currentPlatformObj.bg)}>
            <CurrentPlatformIcon className={cn("w-7 h-7", currentPlatformObj.color)} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {providerName ? `${providerName} — Service Verification Portal` : "Provider Service Verification & Correction Portal"}
              <Badge className="bg-emerald-600 text-white font-mono text-xs">
                {totalWorkingInPlatform} / {candidateServices.length} Marked Working
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl leading-relaxed">
              <strong>Provider Verification Instructions:</strong> Mark working services below. Click <strong>Correct Data</strong> on any card to update Min/Max limits, Refill guarantee duration, or Quality tags.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto shrink-0">
          <Button
            size="lg"
            variant="outline"
            onClick={autoTagAllRefills}
            className="w-full sm:w-auto gap-1.5 text-xs font-bold border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 h-11 px-4 rounded-xl"
            title="Automatically scan service titles and apply refill guarantee tags (30d, 60d, 365d, lifetime)"
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            Auto-Detect Title Refills
          </Button>

          <Button
            size="lg"
            onClick={() => handleSubmitVerification()}
            disabled={isSubmitting}
            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md text-sm font-bold h-11 px-6 rounded-xl shrink-0"
          >
            <SendHorizontal className="w-4 h-4" />
            {isSubmitting ? "Submitting Verification..." : "Submit Working Services & Edits"}
          </Button>
        </div>
      </div>

      {/* Main 2-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* LEFT SIDEBAR: Platform, Category & Variant Selector */}
        <Card className="lg:col-span-4 flex flex-col border shadow-sm sticky top-4 rounded-xl">
          <CardHeader className="p-4 border-b bg-muted/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" /> Platform & Category Filters
            </CardTitle>
            <CardDescription className="text-xs">
              Select platform, service type & variant
            </CardDescription>
          </CardHeader>

          <div className="p-4 space-y-5 max-h-[calc(100vh-14rem)] overflow-y-auto">
            {/* 1. Platform Selector */}
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
                          ? "bg-primary text-primary-foreground border-primary shadow-sm font-bold"
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

            {/* 2. DYNAMIC Service Types (Followers, Likes, Views...) */}
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
                          ? "bg-secondary text-secondary-foreground border-primary/50 font-bold shadow-xs"
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

            {/* 3. DYNAMIC Sub-Type Variants (Post, Reel, Story...) */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">3️⃣ Variant Sub-Selection</Label>
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

            {/* 4. Keyword Search */}
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

        {/* RIGHT MAIN CANVAS: Categories & Working Toggles */}
        <Card className="lg:col-span-8 flex flex-col border shadow-sm p-4 space-y-4 rounded-xl min-h-[600px]">
          <div className="border-b pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                {currentPlatformObj.name} Services Verification
              </h3>
              <p className="text-xs text-muted-foreground">
                Click any service card to correct Min/Max limits, Refill guarantee or Quality tags.
              </p>
            </div>
          </div>

          {/* Quick Search & Add Working Service Bar */}
          <div className="bg-gradient-to-r from-primary/10 via-card to-purple-500/10 border-2 border-primary/20 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h4 className="text-xs sm:text-sm font-bold text-foreground">
                  Quick Add Working Service by ID / Title
                </h4>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30">
                  {services.length} Total Catalog
                </Badge>
              </div>

              <Button
                size="sm"
                variant={showOnlyWorking ? "default" : "outline"}
                onClick={() => setShowOnlyWorking(!showOnlyWorking)}
                className="gap-1.5 text-xs font-semibold self-start sm:self-auto shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {showOnlyWorking ? "Showing Marked Working Only" : "Show Marked Working Only"}
              </Button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Type Service ID (e.g. 1540) or title keyword (e.g. 'Refill Followers') to search 300+ services & add instantly..."
                value={quickSearchInput}
                onChange={(e) => setQuickSearchInput(e.target.value)}
                className="pl-9 pr-24 h-10 text-xs bg-background/90 font-medium rounded-lg border-primary/30 focus:border-primary"
              />
              {quickSearchInput && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setQuickSearchInput("")}
                  className="absolute right-2 top-1.5 h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear Search
                </Button>
              )}
            </div>

            {/* Quick Search Dropdown / Instant Results */}
            {quickSearchInput.trim().length > 0 && (
              <div className="mt-2 space-y-2 max-h-72 overflow-y-auto bg-card border-2 border-primary/30 rounded-xl p-3 shadow-xl divide-y divide-border/60">
                {quickSearchResults.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-3 text-center">
                    No matching services found for "{quickSearchInput}". Try typing a numeric Service ID or keyword.
                  </div>
                ) : (
                  quickSearchResults.map((svc) => {
                    const id = svc.id || svc.sourceServiceId;
                    const isWorking = !!workingMap[id];
                    return (
                      <div key={id} className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[11px]">
                              #{svc.sourceServiceId || id}
                            </span>
                            <span className="font-semibold text-foreground truncate max-w-md">
                              {svc.name || svc.providerName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                            <span>Platform: <strong className="capitalize">{svc.platform}</strong></span>
                            <span>•</span>
                            <span>Cat: {svc.rawProviderCategory || svc.category}</span>
                            <span>•</span>
                            <span>Rate: <strong>{formatInrRate(svc.ratePer1000)}</strong>/1k</span>
                            <span>•</span>
                            <span>Min/Max: {svc.min} / {svc.max}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <Button
                            size="xs"
                            variant={isWorking ? "outline" : "default"}
                            onClick={() => {
                              toggleWorking(id);
                              if (!isWorking) {
                                setActiveEditingService(svc);
                              }
                              toast.success(
                                isWorking
                                  ? `Unmarked Service #${svc.sourceServiceId || id}`
                                  : `Marked Service #${svc.sourceServiceId || id} as WORKING!`,
                                { description: svc.name }
                              );
                            }}
                            className={cn(
                              "gap-1 font-bold",
                              isWorking
                                ? "border-emerald-500 text-emerald-500 hover:bg-emerald-500/10"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            )}
                          >
                            {isWorking ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            {isWorking ? "Marked Working ✅" : "+ Mark Working & Add"}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Categories Accordion */}
          <div className="space-y-4">
            {categoryOrder.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground border-2 border-dashed rounded-xl">
                No TopSMM services match the selected platform/category filter.
              </div>
            ) : (
              categoryOrder.map((catName) => {
                const items = groupedCandidateServices[catName] || [];
                const isCollapsed = !!collapsedCategories[catName];
                const workingInGroup = items.filter(
                  (s) => workingMap[s.id || s.sourceServiceId]
                ).length;

                return (
                  <div key={catName} className="border rounded-xl bg-card overflow-hidden shadow-xs">
                    {/* Category Header */}
                    <div
                      onClick={() => toggleCategoryCollapse(catName)}
                      className="p-3 bg-muted/40 hover:bg-muted/70 transition-colors border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <Folder className="w-4 h-4 text-primary shrink-0" />
                        <h4 className="font-bold text-xs text-foreground flex items-center gap-2">
                          {catName}
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {items.length} Total
                          </Badge>
                          <Badge className={cn("text-[10px]", workingInGroup > 0 ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground")}>
                            {workingInGroup} Marked Working
                          </Badge>
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            autoTagCategoryRefills(catName);
                          }}
                          className="h-6 text-[10px] text-purple-600 hover:bg-purple-50 px-2 font-bold"
                          title="Auto-tag refill durations from service titles in this category"
                        >
                          <Sparkles className="w-3 h-3 mr-1 text-purple-500" /> Auto-Tag Refills
                        </Button>

                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategoryWorking(catName, true);
                          }}
                          className="h-6 text-[10px] text-emerald-600 hover:bg-emerald-50 px-2 font-bold"
                        >
                          <Check className="w-3 h-3 mr-1" /> Mark All Working
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategoryWorking(catName, false);
                          }}
                          className="h-6 text-[10px] text-red-600 hover:bg-red-50 px-2 font-bold"
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Mark All Broken
                        </Button>
                        <Button size="xs" variant="ghost" className="h-6 w-6 p-0">
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Cards Grid */}
                    {!isCollapsed && (
                      <div className="p-3.5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {items.map((service) => {
                            const id = service.id || service.sourceServiceId;
                            const isWorking = !!workingMap[id];
                            const serviceTitle = service.name || service.providerName || `Service #${service.sourceServiceId}`;
                            const minVal = minMap[id] || String(service.min);
                            const maxVal = maxMap[id] || String(service.max);
                            const refillVal = refillMap[id] || "auto";
                            const detectedRefill = detectRefillFromTitle(serviceTitle);

                            return (
                              <Card
                                key={id}
                                onClick={() => setActiveEditingService(service)}
                                className={cn(
                                  "relative flex flex-col justify-between transition-all border p-4 rounded-xl shadow-xs cursor-pointer hover:border-primary hover:shadow-md group",
                                  isWorking
                                    ? "border-emerald-500/60 bg-emerald-500/[0.04]"
                                    : "border-border opacity-70 bg-background hover:opacity-100"
                                )}
                              >
                                <div className="space-y-2.5">
                                  {/* Top Row: Service ID & Rate */}
                                  <div className="flex items-center justify-between gap-2">
                                    <Badge variant="outline" className="font-mono text-[11px] font-bold bg-muted/60">
                                      #{service.sourceServiceId}
                                    </Badge>
                                    <Badge className="bg-emerald-600 text-white font-mono text-[11px] font-bold">
                                      {formatInrRate(service.ratePer1000)} / 1k
                                    </Badge>
                                  </div>

                                  {/* Title */}
                                  <div>
                                    <h5 className="font-bold text-xs text-foreground leading-snug line-clamp-3 group-hover:text-primary transition-colors">
                                      {serviceTitle}
                                    </h5>
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono mt-1 pt-1 border-t">
                                      <span>Min/Max: {minVal} - {parseInt(maxVal).toLocaleString()}</span>
                                      <div className="flex items-center gap-1">
                                        {refillVal !== "auto" ? (
                                          <span className="bg-purple-600 text-white px-1 rounded text-[9px] font-bold">
                                            {refillVal}
                                          </span>
                                        ) : service.refill ? (
                                          <span className="bg-emerald-500/10 text-emerald-600 px-1 rounded text-[9px] font-semibold">
                                            Refill
                                          </span>
                                        ) : detectedRefill.hasRefill ? (
                                          <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 px-1 rounded text-[9px] font-bold" title="Refill duration detected in title">
                                            🔍 {detectedRefill.label}
                                          </span>
                                        ) : (
                                          <span className="bg-muted text-muted-foreground px-1 rounded text-[9px] font-semibold">
                                            No Refill
                                          </span>
                                        )}
                                        {service.cancel && (
                                          <span className="bg-sky-500/10 text-sky-600 px-1 rounded text-[9px] font-semibold">
                                            Cancel
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Working Toggle & Edit Actions */}
                                <div className="pt-3 border-t mt-3 flex items-center gap-1.5">
                                  <button
                                    onClick={(e) => toggleWorking(id, e)}
                                    className={cn(
                                      "flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer",
                                      isWorking
                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                        : "bg-muted/40 hover:bg-muted text-muted-foreground border-border"
                                    )}
                                  >
                                    {isWorking ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground" />}
                                    {isWorking ? "WORKING" : "BROKEN"}
                                  </button>

                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveEditingService(service);
                                    }}
                                    className="h-8 text-[11px] px-2 gap-1 text-primary border-primary/30 font-bold"
                                  >
                                    <Sliders className="w-3 h-3" /> Correct Data
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

      {/* PROVIDER SERVICE CORRECTION & VERIFICATION MODAL */}
      <Dialog open={!!activeEditingService} onOpenChange={(open) => !open && setActiveEditingService(null)}>
        {activeEditingService && (
          <DialogContent className="max-w-lg p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="space-y-2 border-b pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs font-bold bg-muted/60">
                  {providerName || activeEditingService.providerName || "Provider"} #{activeEditingService.sourceServiceId}
                </Badge>
                <Badge className="capitalize text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                  {activeEditingService.platform}
                </Badge>
                <Badge className={cn("text-xs font-bold ml-auto", workingMap[activeEditingService.id || activeEditingService.sourceServiceId] ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground")}>
                  {workingMap[activeEditingService.id || activeEditingService.sourceServiceId] ? "🟢 WORKING & STABLE" : "⚪ BROKEN"}
                </Badge>
              </div>
              <DialogTitle className="text-base font-bold leading-snug pt-1 text-foreground">
                {activeEditingService.name || activeEditingService.displayName || activeEditingService.providerName || `Service #${activeEditingService.sourceServiceId}`}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Review complete service specifications and submit data corrections below.
              </DialogDescription>
            </DialogHeader>

            {/* FULL SERVICE DETAILS SUMMARY BOX */}
            <div className="bg-muted/30 border rounded-xl p-3.5 space-y-2.5 text-xs">
              <div className="font-semibold text-xs text-foreground flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Service Overview</span>
                <span className="font-mono text-emerald-600 font-bold text-xs">
                  {formatInrRate(activeEditingService.ratePer1000)} / 1,000
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Raw Category</span>
                  <span className="font-medium text-foreground truncate block">
                    {activeEditingService.rawProviderCategory || activeEditingService.providerCategory || activeEditingService.category || "General"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Original API Limits</span>
                  <span className="font-mono font-semibold text-foreground block">
                    {activeEditingService.min} Min — {activeEditingService.max.toLocaleString()} Max
                  </span>
                </div>
              </div>

              {/* API Default Capabilities */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[10px]">API Refill Default:</span>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-bold", activeEditingService.refill ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30")}>
                    {activeEditingService.refill ? "✓ Enabled" : "✕ Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[10px]">API Cancel Default:</span>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-bold", activeEditingService.cancel ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30")}>
                    {activeEditingService.cancel ? "✓ Supported" : "✕ No Cancel"}
                  </Badge>
                </div>
              </div>

              {(activeEditingService.type || activeEditingService.variant) && (
                <div className="flex items-center gap-2 pt-1.5 border-t text-[10px]">
                  {activeEditingService.type && (
                    <span className="bg-background px-2 py-0.5 rounded border text-muted-foreground font-mono">
                      Type: {activeEditingService.type}
                    </span>
                  )}
                  {activeEditingService.variant && (
                    <span className="bg-background px-2 py-0.5 rounded border text-muted-foreground font-mono">
                      Variant: {activeEditingService.variant}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* SERVICE DESCRIPTION BOX */}
            {(() => {
              const rawObj = (activeEditingService.raw || {}) as Record<string, any>;
              const item = activeEditingService as any;
              const desc =
                activeEditingService.description ||
                activeEditingService.displayDescription ||
                rawObj.description ||
                rawObj.desc ||
                rawObj.details ||
                rawObj.note ||
                rawObj.info ||
                rawObj.instruction ||
                rawObj.instructions ||
                item.desc ||
                item.details ||
                item.note ||
                item.info;

              return (
                <div className="bg-card border rounded-xl p-3 space-y-1.5 text-xs shadow-xs">
                  <div className="font-bold text-[11px] text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary shrink-0" /> Service Description & Specifications
                    </span>
                  </div>
                  {desc && String(desc).trim() ? (
                    <div className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto pt-1 font-sans border-t mt-1">
                      {String(desc).trim()}
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground italic pt-0.5 border-t mt-1">
                      No description text parameter provided in the raw provider API payload.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* EDIT & CORRECTION FIELDS */}
            <div className="space-y-4 py-2 text-xs">
              {/* Working Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
                <div>
                  <div className="font-bold text-xs text-foreground">Service Working Status</div>
                  <div className="text-[11px] text-muted-foreground">
                    {workingMap[activeEditingService.id || activeEditingService.sourceServiceId]
                      ? "Service is working reliably on API"
                      : "Service is currently broken or non-working"}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={workingMap[activeEditingService.id || activeEditingService.sourceServiceId] ? "default" : "outline"}
                  onClick={() => toggleWorking(activeEditingService.id || activeEditingService.sourceServiceId)}
                  className={cn("gap-1.5 text-xs font-bold shrink-0", workingMap[activeEditingService.id || activeEditingService.sourceServiceId] && "bg-emerald-600 text-white hover:bg-emerald-700")}
                >
                  {workingMap[activeEditingService.id || activeEditingService.sourceServiceId] ? "Working" : "Broken"}
                </Button>
              </div>

              {/* Min & Max Order Limits Correction */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Actual Min Order</Label>
                  <Input
                    type="number"
                    value={minMap[activeEditingService.id || activeEditingService.sourceServiceId] || ""}
                    onChange={(e) =>
                      setMinMap((prev) => ({
                        ...prev,
                        [activeEditingService.id || activeEditingService.sourceServiceId]: e.target.value,
                      }))
                    }
                    className="text-xs h-9 bg-background font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="font-bold text-xs">Actual Max Order</Label>
                  <Input
                    type="number"
                    value={maxMap[activeEditingService.id || activeEditingService.sourceServiceId] || ""}
                    onChange={(e) =>
                      setMaxMap((prev) => ({
                        ...prev,
                        [activeEditingService.id || activeEditingService.sourceServiceId]: e.target.value,
                      }))
                    }
                    className="text-xs h-9 bg-background font-mono"
                  />
                </div>
              </div>

              {/* Refill Guarantee Duration */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-xs">Actual Refill Guarantee Duration</Label>
                  <span className="text-[10px] text-muted-foreground">
                    API Default: <strong className={activeEditingService.refill ? "text-emerald-600" : "text-amber-600"}>{activeEditingService.refill ? "Refill On" : "No Refill"}</strong>
                  </span>
                </div>

                {(() => {
                  const serviceTitle = activeEditingService.name || activeEditingService.displayName || activeEditingService.providerName || "";
                  const detected = detectRefillFromTitle(serviceTitle);
                  if (detected.hasRefill) {
                    const currentSel = refillMap[activeEditingService.id || activeEditingService.sourceServiceId];
                    return (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-[11px] font-medium my-1.5">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          Title mentions: <strong>{detected.label}</strong>
                        </span>
                        <Button
                          size="xs"
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            const id = activeEditingService.id || activeEditingService.sourceServiceId;
                            if (detected.tagValue) {
                              setRefillMap((prev) => ({ ...prev, [id]: detected.tagValue! }));
                              setModifiedIds((prev) => ({ ...prev, [id]: true }));
                              toast.success(`Applied ${detected.label} tag!`);
                            }
                          }}
                          className="h-6 text-[10px] font-bold px-2 bg-purple-600 text-white hover:bg-purple-700 shrink-0"
                        >
                          {currentSel === detected.tagValue ? "✓ Applied" : `Apply ${detected.tagValue}`}
                        </Button>
                      </div>
                    );
                  }
                  return null;
                })()}

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

              {/* Quality & Geo Speed Tag */}
              <div className="space-y-1">
                <Label className="font-bold text-xs">Quality / Speed Tag</Label>
                <Select
                  value={qualityMap[activeEditingService.id || activeEditingService.sourceServiceId] || "default"}
                  onValueChange={(val) =>
                    setQualityMap((prev) => ({
                      ...prev,
                      [activeEditingService.id || activeEditingService.sourceServiceId]: val,
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cancel Button Support */}
              <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
                <div>
                  <div className="font-bold text-xs">Cancel API Supported</div>
                  <div className="text-[10px] text-muted-foreground">
                    API Default: <span className={activeEditingService.cancel ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>{activeEditingService.cancel ? "Supported" : "Not Supported"}</span>
                  </div>
                </div>
                <Button
                  size="xs"
                  variant={cancelMap[activeEditingService.id || activeEditingService.sourceServiceId] ? "default" : "outline"}
                  onClick={() =>
                    setCancelMap((prev) => ({
                      ...prev,
                      [activeEditingService.id || activeEditingService.sourceServiceId]: !prev[activeEditingService.id || activeEditingService.sourceServiceId],
                    }))
                  }
                  className="font-bold text-xs shrink-0"
                >
                  {cancelMap[activeEditingService.id || activeEditingService.sourceServiceId] ? "Cancel Allowed" : "No Cancel"}
                </Button>
              </div>
            </div>

            <DialogFooter className="border-t pt-3 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setActiveEditingService(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const id = activeEditingService.id || activeEditingService.sourceServiceId;
                  setModifiedIds((prev) => ({ ...prev, [id]: true }));
                  handleSubmitVerification(id);
                  setActiveEditingService(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold"
              >
                <Save className="w-4 h-4" /> Save Corrections
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
