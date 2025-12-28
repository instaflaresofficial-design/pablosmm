import { fetchEarthPanelServices, EarthPanelService } from './apiClient';
import type { NormalizedSmmService, Platform, ServiceType, Variant } from '@/types/smm';
import { getCache, setCache } from './cache';

const SUPPORTED_PLATFORMS: Platform[] = ['instagram', 'facebook', 'x', 'telegram', 'tiktok', 'youtube'];
const SUPPORTED_TYPES: ServiceType[] = ['followers', 'likes', 'views', 'comments', 'shares', 'votes'];

const platformRegex: Record<Platform, RegExp> = {
	instagram: /(\binstagram\b|\big\b)/i,
	facebook: /\bfacebook\b|\bfb\b/i,
	x: /\btwitter\b|\bX\b/i,
	telegram: /\btelegram\b|\btg\b/i,
	tiktok: /\btiktok\b|\btt\b/i,
	youtube: /\byoutube\b|\byt\b/i,
};

const typeRegex: Record<ServiceType, RegExp> = {
	followers: /follow|subscriber|member/i,
	likes: /like|heart/i,
	views: /view|play|watch/i,
	comments: /comment/i,
	shares: /share|repost|retweet/i,
	votes: /vote|poll/i,
};

const variantRegexByPlatform: Record<Platform, Array<{ variant: Variant; rx: RegExp }>> = {
	instagram: [
		{ variant: 'reel', rx: /\breel/i },
		{ variant: 'story', rx: /\bstory|stories/i },
		{ variant: 'igtv', rx: /\bigtv\b/i },
		{ variant: 'live', rx: /\blive\b/i },
		{ variant: 'video', rx: /\bvideo\b/i },
		{ variant: 'post', rx: /\bpost|photo|image/i },
	],
	facebook: [
		{ variant: 'video', rx: /\bvideo\b/i },
		{ variant: 'post', rx: /\bpost\b/i },
		{ variant: 'live', rx: /\blive\b/i },
	],
	x: [
		{ variant: 'post', rx: /tweet|post/i },
		{ variant: 'video', rx: /video/i },
	],
	telegram: [
		{ variant: 'post', rx: /post|channel|group/i },
	],
	tiktok: [
		{ variant: 'video', rx: /video/i },
		{ variant: 'live', rx: /live/i },
		{ variant: 'post', rx: /post/i },
	],
	youtube: [
		{ variant: 'short', rx: /short/i },
		{ variant: 'video', rx: /video/i },
		{ variant: 'live', rx: /live/i },
		{ variant: 'post', rx: /post|community/i },
	],
};

function detectPlatform(s: EarthPanelService): Platform | null {
	const hay = `${s.category} ${s.name}`;
	for (const p of SUPPORTED_PLATFORMS) {
		if (platformRegex[p].test(hay)) return p;
	}
	return null;
}

function detectType(s: EarthPanelService): ServiceType | null {
	const hay = `${s.category} ${s.name}`;
	// Prefer more specific matches first
	const order: ServiceType[] = ['followers', 'likes', 'views', 'comments', 'shares', 'votes'];
	for (const t of order) {
		if (typeRegex[t].test(hay)) return t;
	}
	return null;
}

function detectVariant(platform: Platform, s: EarthPanelService): Variant {
	const hay = `${s.category} ${s.name}`;
	for (const { variant, rx } of variantRegexByPlatform[platform]) {
		if (rx.test(hay)) return variant;
	}
	return 'any';
}

function toNumber(n: string | number | undefined): number | null {
	if (n === undefined) return null;
	const num = typeof n === 'number' ? n : Number(String(n).replace(/[^0-9.]/g, ''));
	return Number.isFinite(num) ? num : null;
}

export async function loadNormalizedServices(): Promise<NormalizedSmmService[]> {
	const cacheKey = 'earthpanel:services:v1';
	const cached = getCache<NormalizedSmmService[]>(cacheKey);
	if (cached) return cached;

	const raw = await fetchEarthPanelServices();
	const normalized: NormalizedSmmService[] = [];

	for (const s of raw) {
		const platform = detectPlatform(s);
		if (!platform) continue;
		const type = detectType(s);
		if (!type || !SUPPORTED_TYPES.includes(type)) continue;

		const variant = detectVariant(platform, s);
		const ratePer1000 = toNumber(s.rate) ?? 0;
		const min = toNumber(s.min) ?? 0;
		const max = toNumber(s.max) ?? 0;

		normalized.push({
			id: String(s.service),
			platform,
			type,
			variant,
			providerName: s.name,
			category: s.category,
			ratePer1000,
			min,
			max,
			refill: Boolean(s.refill),
			dripfeed: Boolean(s.dripfeed),
			cancel: Boolean(s.cancel),
			averageTime: toNumber(s.average_time) ?? null,
			raw: s,
		});
	}

	// Cache for 10 minutes
	setCache(cacheKey, normalized, 10 * 60 * 1000);
	return normalized;
}

export async function getPlatformTypes(platform: Platform): Promise<Set<ServiceType>> {
	const list = await loadNormalizedServices();
	return new Set(list.filter((s) => s.platform === platform).map((s) => s.type));
}

export async function getVariantsFor(platform: Platform, type: ServiceType): Promise<Set<Variant>> {
	const list = await loadNormalizedServices();
	return new Set(list.filter((s) => s.platform === platform && s.type === type).map((s) => s.variant));
}

export async function getServicesFor(platform: Platform, type: ServiceType, variant?: Variant): Promise<NormalizedSmmService[]> {
	const list = await loadNormalizedServices();
	return list.filter((s) => s.platform === platform && s.type === type && (!variant || s.variant === variant));
}

