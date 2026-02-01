import { z } from "zod";

export const serviceSchema = z.object({
    id: z.string(), // Internal ID (e.g. topsmm:123)
    sourceServiceId: z.string(), // Original Provider ID
    name: z.string().optional(), // Provider Name
    source: z.string().optional(),
    displayName: z.string().optional(), // Rewritten Name
    description: z.string().optional(),
    displayDescription: z.string().optional(),
    ratePer1000: z.number(), // My rate in USD (converted to active currency on client)
    baseRatePer1000: z.number(), // Provider rate in USD
    category: z.string(),
    providerCategory: z.string().optional(),
    platform: z.string(),
    min: z.number(),
    max: z.number(),
    averageTime: z.number().nullable(),
    tags: z.array(z.string()).optional(),
    rawProviderCategory: z.string().optional(),
    purchaseCount: z.number().default(0),
    refill: z.boolean().default(false),
    cancel: z.boolean().default(false),
    dripfeed: z.boolean().default(false),
    displayId: z.string().optional(),
    raw: z.any().optional(),
    providerName: z.string().optional(),
    type: z.string().optional(),
    targeting: z.string().optional(),
    quality: z.string().optional(),
    stability: z.string().optional(),
    status: z.enum(["active", "hidden", "disabled"]).default("active"),
});

export type Service = z.infer<typeof serviceSchema>;
