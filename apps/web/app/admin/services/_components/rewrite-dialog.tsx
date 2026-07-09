"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/admin/ui/badge";
import { cn } from "@/lib/admin/utils";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/admin/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/admin/ui/form";
import { Input } from "@/components/admin/ui/input";
import { Button } from "@/components/admin/ui/button";
import { Textarea } from "@/components/admin/ui/textarea";
import { Switch } from "@/components/admin/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/admin/ui/select";
import { ScrollArea } from "@/components/admin/ui/scroll-area";
import { getApiBaseUrl } from "@/lib/config";
import { useCurrency } from "@/components/layout/CurrencyProvider";

const formSchema = z.object({
    displayName: z.string().optional(),
    displayDescription: z.string().optional(),
    rateMultiplier: z.coerce.number().min(1, "Multiplier must be at least 1.0"),
    isHidden: z.boolean().default(false),
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    // Allow editing providerCategory for internal organization
    providerCategory: z.string().optional(),
    displayId: z.string().optional(),
    refill: z.boolean().default(false),
    cancel: z.boolean().default(false),
    dripfeed: z.boolean().default(false),
    type: z.string().optional(),
    targeting: z.string().optional(),
    quality: z.string().optional(),
    stability: z.string().optional(),
});

interface RewriteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    service: any;
    onSuccess?: () => void;
}

export function RewriteDialog({ open, onOpenChange, service, onSuccess }: RewriteDialogProps) {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isAIRewriting, setIsAIRewriting] = React.useState(false);
    const { formatMoney, convert, convertToUsd, currency } = useCurrency();

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            displayName: "",
            displayDescription: "",
            rateMultiplier: 1.2,
            isHidden: false,
            category: "",
            tags: [] as string[],
            providerCategory: "",
            displayId: "",
            refill: false,
            cancel: false,
            dripfeed: false,
            type: "default",
            targeting: "",
            quality: "",
            stability: "",
        },
    });

    // Local price state for direct editing
    const [localPrice, setLocalPrice] = React.useState<string>("");

    // Reset form when service changes
    React.useEffect(() => {
        if (service) {
            const multiplier = service.originalMultiplier && service.originalMultiplier > 0
                ? service.originalMultiplier
                : (service.ratePer1000 && service.baseRatePer1000
                    ? parseFloat((service.ratePer1000 / service.baseRatePer1000).toFixed(4))
                    : 1.2);

            form.reset({
                displayName: service.displayName || "",
                displayDescription: service.displayDescription || "",
                rateMultiplier: multiplier,
                isHidden: service.status === "hidden",
                category: (service.category || "").toLowerCase(),
                tags: service.tags || [],
                providerCategory: service.providerCategory || "",
                displayId: service.displayId || "",
                refill: service.refill ?? false,
                cancel: service.cancel ?? false,
                dripfeed: service.dripfeed ?? false,
                type: (service.type || "default").toLowerCase(),
                targeting: service.targeting || "",
                quality: service.quality || "",
                stability: service.stability || "",
            });

            // Set initial local price
            const currentPriceUsd = service.baseRatePer1000 * multiplier;
            setLocalPrice(convert(currentPriceUsd).toFixed(2));
        }
    }, [service, form, convert]);

    // AI Rewrite Handler
    const handleAIRewrite = async () => {
        if (!service) return;

        setIsAIRewriting(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/admin/services/ai-rewrite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    providerName: service.providerName,
                    description: service.description,
                    category: service.category,
                    platform: service.platform,
                }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || `AI rewrite failed with status ${res.status}`);
            }

            const data = await res.json();

            // Update form with AI-generated content
            if (data.displayName) {
                form.setValue("displayName", data.displayName);
            }
            if (data.displayDescription) {
                form.setValue("displayDescription", data.displayDescription);
            }

            // Update metadata if available
            if (data.metadata) {
                if (data.metadata.targeting) form.setValue("targeting", data.metadata.targeting);
                if (data.metadata.quality) form.setValue("quality", data.metadata.quality);
                if (data.metadata.stability) form.setValue("stability", data.metadata.stability);
            }

            toast.success("AI rewrite completed! Review and save changes.");
        } catch (error) {
            console.error("AI Rewrite error:", error);
            toast.error(`AI rewrite failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsAIRewriting(false);
        }
    };

    // Update multiplier when local price changes
    const onLocalPriceChange = (val: string) => {
        setLocalPrice(val);
        const price = parseFloat(val);
        if (!isNaN(price) && service?.baseRatePer1000) {
            const priceUsd = convertToUsd(price);
            const multiplier = priceUsd / service.baseRatePer1000;
            form.setValue("rateMultiplier", parseFloat(multiplier.toFixed(4)));
        }
    };

    // Update local price when multiplier changes (synchronized)
    const multiplierValue = form.watch("rateMultiplier");
    React.useEffect(() => {
        const m = Number(multiplierValue);
        if (service?.baseRatePer1000 && !isNaN(m) && m > 0) {
            const priceUsd = service.baseRatePer1000 * m;
            const priceLocal = convert(priceUsd).toFixed(2);
            if (parseFloat(localPrice).toFixed(2) !== priceLocal) {
                setLocalPrice(priceLocal);
            }
        }
    }, [multiplierValue, service, convert, localPrice]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            const baseUrl = getApiBaseUrl();
            const res = await fetch(`${baseUrl}/admin/services/override`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourceServiceId: service.sourceServiceId,
                    ...values,
                }),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Failed to save override");
            }

            toast.success("Service updated successfully");
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update service");
        } finally {
            setIsSubmitting(false);
        }
    }

    const basePriceLocal = service?.baseRatePer1000 ? (convert(service.baseRatePer1000) as any) : 0;
    const sellingPriceLocal = parseFloat(localPrice) || 0;
    const profitLocal = sellingPriceLocal - (basePriceLocal as any);
    const profitPercent = (basePriceLocal as any) > 0 ? (profitLocal / (basePriceLocal as any)) * 100 : 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl">Refine Service Details</DialogTitle>
                    <DialogDescription>
                        Modify how users see this service. Changes are synced instantly.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-6 space-y-6">
                    {/* Provider Reference Section */}
                    <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Provider Original Data</h4>
                            <Badge variant="outline" className="text-[9px] font-mono h-4 bg-background">
                                SOURCE: {service?.source?.toUpperCase() || "SMM"} #{service?.sourceServiceId}
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            <div>
                                <div className="text-[11px] text-muted-foreground font-medium">NAME</div>
                                <div className="text-sm font-semibold">{service?.providerName || "N/A"}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[11px] text-muted-foreground font-medium">COST (PER 1K)</div>
                                    <div className="text-sm font-mono font-bold text-foreground">
                                        {formatMoney(service?.baseRatePer1000 || 0)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[11px] text-muted-foreground font-medium uppercase">Provider Raw Category</div>
                                    <div className="text-[11px] font-medium leading-tight">{service?.rawProviderCategory || service?.category || "N/A"}</div>
                                </div>
                            </div>

                            {/* Provider Flags */}
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                <div>
                                    <div className="text-[11px] text-muted-foreground font-medium mb-1.5">FEATURES (ORIGINAL)</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(() => {
                                            const raw = service?.raw || {};
                                            const isTrue = (v: any) => v === true || v === 1 || v === "1" || v === "Yes" || v === "yes" || v === "true";
                                            const rawRefill = isTrue(raw.refill);
                                            const rawCancel = isTrue(raw.cancel);
                                            const rawDripfeed = isTrue(raw.dripfeed);

                                            return (
                                                <>
                                                    <Badge variant={rawRefill ? "default" : "secondary"} className="text-[9px] h-5 opacity-80">
                                                        {rawRefill ? "✓ Refill" : "✗ Refill"}
                                                    </Badge>
                                                    <Badge variant={rawCancel ? "default" : "secondary"} className="text-[9px] h-5 opacity-80">
                                                        {rawCancel ? "✓ Cancel" : "✗ Cancel"}
                                                    </Badge>
                                                    <Badge variant={rawDripfeed ? "default" : "secondary"} className="text-[9px] h-5 opacity-80">
                                                        {rawDripfeed ? "✓ Dripfeed" : "✗ Dripfeed"}
                                                    </Badge>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[11px] text-muted-foreground font-medium mb-1.5">LIMITS</div>
                                    <div className="text-[10px] font-mono">
                                        <span className="text-muted-foreground">Min:</span> <span className="font-bold">{service?.min || 0}</span>
                                        {" • "}
                                        <span className="text-muted-foreground">Max:</span> <span className="font-bold">{service?.max || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {service?.description && (
                                <div className="space-y-1">
                                    <div className="text-[11px] text-muted-foreground font-medium uppercase">Original Description</div>
                                    <ScrollArea className="h-[120px] w-full rounded-md border bg-background/50 p-3">
                                        <div className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono italic">
                                            {service.description}
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Rewrite Button */}
                    <div className="flex items-center justify-center">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAIRewrite}
                            disabled={isAIRewriting}
                            className="group relative overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all"
                        >
                            {isAIRewriting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    AI is rewriting...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4 text-primary group-hover:animate-pulse" />
                                    ✨ AI Rewrite
                                </>
                            )}
                        </Button>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="displayName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Display Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Premium IG Likes..." className="h-10" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase text-muted-foreground">App Category (User Facing)</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                value={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="h-10">
                                                        <SelectValue placeholder="Select Category" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="followers">Followers</SelectItem>
                                                    <SelectItem value="likes">Likes</SelectItem>
                                                    <SelectItem value="views">Views</SelectItem>
                                                    <SelectItem value="comments">Comments</SelectItem>
                                                    <SelectItem value="shares">Shares</SelectItem>
                                                    <SelectItem value="votes">Votes</SelectItem>
                                                    <SelectItem value="saves">Saves</SelectItem>
                                                    <SelectItem value="other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="providerCategory"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Admin Group (Internal)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. TikTok Followers | Real Profile" className="h-10 italic" {...field} />
                                        </FormControl>
                                        <FormDescription className="text-[10px]">
                                            Custom internal group. Affects grouping in your admin panel.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="tags"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Service Labels / Tags</FormLabel>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {["PREMIUM", "CHEAPEST", "TOP RATED", "BEST QUALITY"].map(tag => {
                                                const isSelected = field.value?.includes(tag);
                                                return (
                                                    <Badge
                                                        key={tag}
                                                        variant={isSelected ? "default" : "outline"}
                                                        className={cn(
                                                            "cursor-pointer px-3 py-1 text-[10px] font-bold transition-all h-7 uppercase tracking-tight",
                                                            isSelected ? "shadow-md scale-105" : "hover:bg-muted text-muted-foreground opacity-60"
                                                        )}
                                                        onClick={() => {
                                                            const current = field.value || [];
                                                            if (isSelected) {
                                                                field.onChange(current.filter(t => t !== tag));
                                                            } else {
                                                                field.onChange([...current, tag]);
                                                            }
                                                        }}
                                                    >
                                                        {tag}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                        <FormDescription className="text-[10px]">
                                            Selected tags will be displayed as colored highlights to your users.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="displayId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Custom Display ID</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="e.g. 1821" className="bg-muted/5 font-mono" />
                                        </FormControl>
                                        <FormDescription className="text-[10px]">
                                            Clean, unique identifier for users. Auto-generated if left blank.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="displayDescription"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Description Rewrite</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Enter a user-friendly description..."
                                                className="min-h-[100px] bg-muted/10"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Pricing Section */}
                            <div className="space-y-4 pt-2 border-t mt-4">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground">Profit & Pricing</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <FormLabel className="text-[11px] font-medium">Selling Price (per 1,000)</FormLabel>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                                                    {currency === 'INR' ? '₹' : '$'}
                                                </span>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    className="pl-8 h-12 text-lg font-bold font-mono"
                                                    value={localPrice}
                                                    onChange={(e) => onLocalPriceChange(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="rateMultiplier"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <FormLabel className="text-[11px] font-medium text-muted-foreground flex justify-between">
                                                        <span>Price Multiplier</span>
                                                        <span className="font-mono text-primary font-bold">{(field.value as number)}x</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            className="h-8 text-xs font-mono opacity-60 bg-muted/30"
                                                            {...field}
                                                            value={(field.value as number) || ""}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                field.onChange(isNaN(val) ? 0 : val);
                                                            }}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="rounded-xl border bg-primary/[0.03] p-5 flex flex-col justify-between h-full border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.05)]">
                                        <div>
                                            <div className="text-[10px] font-bold text-primary/60 uppercase mb-3 tracking-widest">Profit Analysis</div>
                                            <div className="flex items-baseline gap-2">
                                                <div className="text-3xl font-bold font-mono text-primary tracking-tight">
                                                    {currency === 'INR' ? '₹' : '$'}{profitLocal.toFixed(2)}
                                                </div>
                                                <div className={cn(
                                                    "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                                                    profitPercent > 0 ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"
                                                )}>
                                                    {profitPercent > 0 ? "+" : ""}{profitPercent.toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-primary/10 flex justify-between items-center text-[11px]">
                                            <span className="text-muted-foreground font-medium">Margin on cost</span>
                                            <span className="font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border">
                                                +{profitPercent.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Features Section */}
                            <div className="space-y-4 pt-2 border-t mt-4">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground">Service Features & Type</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[11px] font-medium">Service Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="default">Default</SelectItem>
                                                        <SelectItem value="custom_comments">Custom Comments</SelectItem>
                                                        <SelectItem value="custom_comments_package">Custom Comments Package</SelectItem>
                                                        <SelectItem value="poll">Poll</SelectItem>
                                                        <SelectItem value="mentions_with_hashtags">Mentions with Hashtags</SelectItem>
                                                        <SelectItem value="mentions_custom_list">Mentions Custom List</SelectItem>
                                                        <SelectItem value="mentions_hashtag">Mentions Hashtag</SelectItem>
                                                        <SelectItem value="mentions_user_followers">Mentions User Followers</SelectItem>
                                                        <SelectItem value="mentions_media_likers">Mentions Media Likers</SelectItem>
                                                        <SelectItem value="package">Package</SelectItem>
                                                        <SelectItem value="subscriptions">Subscriptions</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex flex-col gap-2 pt-1">
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { name: "refill", label: "Refill" },
                                                { name: "cancel", label: "Cancel" },
                                                { name: "dripfeed", label: "Dripfeed" }
                                            ].map((feature) => (
                                                <FormField
                                                    key={feature.name}
                                                    control={form.control}
                                                    name={feature.name as any}
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-col items-center justify-center space-y-2 rounded-lg border p-2 bg-muted/5 cursor-pointer hover:bg-muted/10 transition-colors">
                                                            <FormControl>
                                                                <Switch
                                                                    checked={field.value}
                                                                    onCheckedChange={field.onChange}
                                                                    className="scale-90"
                                                                />
                                                            </FormControl>
                                                            <div className="space-y-0.5 text-center">
                                                                <FormLabel className="text-[10px] font-bold uppercase cursor-pointer">
                                                                    {feature.label}
                                                                </FormLabel>
                                                            </div>
                                                        </FormItem>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t mt-4">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground">Service Metadata (For User App Filters)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="targeting"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[11px] font-medium">Targeting</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Global, USA, India..." className="h-8 text-xs font-medium" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="quality"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[11px] font-medium">Quality</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Real, High, HQ..." className="h-8 text-xs font-medium" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="stability"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[11px] font-medium">Stability</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Non-Drop, Stable..." className="h-8 text-xs font-medium" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-4 pt-6 border-t mt-6">
                                <FormField
                                    control={form.control}
                                    name="isHidden"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-3 space-y-0 rounded-lg border px-4 py-2 bg-muted/10 h-10 w-full max-w-[200px] cursor-pointer hover:bg-muted/20 transition-colors">
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    className="scale-90"
                                                />
                                            </FormControl>
                                            <FormLabel className="text-xs font-semibold cursor-pointer whitespace-nowrap">
                                                Hide Service
                                            </FormLabel>
                                        </FormItem>
                                    )}
                                />

                                <div className="flex items-center gap-3 ml-auto">
                                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="h-10">
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="h-10 px-8 font-bold min-w-[140px]" disabled={isSubmitting}>
                                        {isSubmitting ? <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</> : "Save Changes"}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
