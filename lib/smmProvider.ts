import { fetchPanelServices, PanelV2Service } from './apiClient';
import type { NormalizedSmmService, Platform, ServiceType, Variant } from '@/types/smm';
import { readAdminConfig, applyOverrides } from './adminConfig';
import { getCache, setCache } from './cache';
import { readProviders } from './providersConfig';
import { getUsdToInr } from './fx';

const SUPPORTED_PLATFORMS: Platform[] = ['instagram', 'facebook', 'x', 'telegram', 'tiktok', 'youtube'];
const SUPPORTED_TYPES: ServiceType[] = ['followers', 'likes', 'views', 'comments', 'shares', 'votes', 'saves'];

const platformRegex: Record<Platform, RegExp> = {
	instagram: /(\binstagram\b|\big\b|\binsta\b)/i,
	facebook: /\bfacebook\b|\bfb\b/i,
	x: /\btwitter\b|\bX\b/i,
	telegram: /\btelegram\b|\btg\b/i,
	tiktok: /\btiktok\b|\btt\b/i,
	youtube: /\byoutube\b|\byt\b/i,
};

const typeRegex: Record<ServiceType, RegExp> = {
	comments: /\bcomment(s)?\b|\brepl(y|ies)\b|\breview(s)?\b/i,
	likes: /\blike(s)?\b|\bheart(s)?\b|\breaction(s)?\b/i,
	followers: /\bfollow(er)?(s)?\b|\bsubscriber(s)?\b|\bmember(s)?\b/i,
	views: /\bview(s)?\b|\bplay(s)?\b|\bwatch(es)?\b|\bimpression(s)?\b|\breach\b/i,
	shares: /\bshare(s)?\b|\brepost(s)?\b|\bretweet(s)?\b|\bforward(s)?\b/i,
	votes: /\bvote(s)?\b|\bpoll(s)?\b/i,
	saves: /\bsave(s)?\b|\bbookmark(s)?\b|\bsaved\b/i,
};

const hardExcludeRx = /(\bdm\b|direct\s*message|inbox)/i;

function countMatches(rx: RegExp, text: string): number {
	const g = new RegExp(rx.source, rx.flags.includes('g') ? rx.flags : rx.flags + 'g');
	return (text.match(g) || []).length;
}

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

function detectPlatform(s: PanelV2Service): Platform | null {
	const hay = `${s.category} ${s.name}`;
	for (const p of SUPPORTED_PLATFORMS) {
		if (platformRegex[p].test(hay)) return p;
	}
	return null;
}

function detectType(s: PanelV2Service): ServiceType | null {
	const hay = `${s.category} ${s.name} ${s.description ?? ''} ${s.desc ?? ''}`;
	if (hardExcludeRx.test(hay)) return null; // ignore DM/inbox services by default

	// Weight category matches more heavily — many provider panels organize services
	// into category headings (e.g. "Instagram Comments") so prefer explicit category
	// mentions when available to avoid misclassification.
	const catHay = String(s.category || '');
	const scores: Record<ServiceType, number> = {
		comments: countMatches(typeRegex.comments, hay) * 3 + countMatches(typeRegex.comments, catHay) * 10,
		likes: countMatches(typeRegex.likes, hay) * 2 + countMatches(typeRegex.likes, catHay) * 10,
		followers: countMatches(typeRegex.followers, hay) * 2 + countMatches(typeRegex.followers, catHay) * 10,
		views: countMatches(typeRegex.views, hay) * 2 + countMatches(typeRegex.views, catHay) * 10,
		shares: countMatches(typeRegex.shares, hay) + countMatches(typeRegex.shares, catHay) * 10,
		saves: countMatches(typeRegex.saves, hay) + countMatches(typeRegex.saves, catHay) * 10,
		votes: countMatches(typeRegex.votes, hay) + countMatches(typeRegex.votes, catHay) * 10,
	};

	// Resolve common conflicts: prefer explicit term with higher score
	// Example: if both likes and views present, take the higher score
	let best: ServiceType | null = null;
	let bestScore = 0;
	(Object.keys(scores) as ServiceType[]).forEach((t) => {
		const sc = scores[t];
		if (sc > bestScore) {
			best = t;
			bestScore = sc;
		}
	});
	return bestScore > 0 ? best : null;
}

function detectVariant(platform: Platform, s: PanelV2Service): Variant {
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

// Aggregate from all providers without admin overrides (for admin dashboard)
export async function aggregateRawServices(): Promise<NormalizedSmmService[]> {
	const cacheKey = 'providers:raw:v2';
	const cached = getCache<NormalizedSmmService[]>(cacheKey);
	if (cached) return cached;
	const cfg = readProviders();
	let providers = cfg.providers.filter(p => p.enabled !== false);
	if (providers.length === 0) {
		const fallbackKey = process.env.EARTHPANEL_API_KEY || process.env.NEXT_PUBLIC_EARTHPANEL_API_KEY;
		if (fallbackKey) {
			providers = [{ key: 'earthpanel', name: 'EarthPanel', apiUrl: 'https://www.theearthpanel.com/api/v2', apiKey: String(fallbackKey), enabled: true }];
		}
	}
	const all: NormalizedSmmService[] = [];
	// fetch all providers in parallel to avoid sequential timeouts
	const fetchPromises = providers.map(async (prov) => {
		try {
			const raw = await fetchPanelServices(prov.apiUrl, prov.apiKey);
			return { prov, raw } as { prov: typeof prov; raw: PanelV2Service[] };
		} catch (e) {
			return { prov, raw: [] } as { prov: typeof prov; raw: PanelV2Service[] };
		}
	});

	const settled = await Promise.all(fetchPromises);
	// shared FX helper fetched once
	const fxRate = await getUsdToInr();
	for (const item of settled) {
		const prov = item.prov;
		const raw = item.raw || [];
		for (const s of raw) {
			const platform = detectPlatform(s);
			if (!platform) continue;
			const type = detectType(s);
			if (!type || !SUPPORTED_TYPES.includes(type)) continue;
			const variant = detectVariant(platform, s);
			const baseRatePer1000 = toNumber(s.rate) ?? 0;
			const min = toNumber(s.min) ?? 0;
			const max = toNumber(s.max) ?? 0;
			// Normalize provider currency to USD per 1000 for internal representation
			let baseRateUsd = baseRatePer1000;
			const provCurrency = (prov as any).currency || 'USD';
			// If provider returns an explicit USD price field, prefer that (common field names)
			const maybeUsd = toNumber((s as any).usd ?? (s as any).rate_usd ?? (s as any).price_usd ?? (s as any).usd_price);
			if (typeof maybeUsd === 'number' && maybeUsd > 0) {
				baseRateUsd = maybeUsd;
			} else if (provCurrency === 'INR' && baseRatePer1000 > 0) {
				// If provider supplies an explicit fx in config, use it; otherwise fall back to shared fxRate
				const provFx = (prov as any).fx;
				const useFx = typeof provFx === 'number' && provFx > 0 ? provFx : fxRate;
				if (useFx && useFx > 0) {
					baseRateUsd = baseRatePer1000 / useFx;
				}
			}
			all.push({
				id: `${prov.key}:${s.service}`,
				source: prov.key,
				sourceServiceId: String(s.service),
				platform,
				type,
				variant,
				providerName: s.name,
				category: s.category,
				baseRatePer1000: baseRatePer1000,
				providerCurrency: (prov as any).currency || 'USD',
				ratePer1000: baseRateUsd,
				min,
				max,
				refill: Boolean(s.refill),
				dripfeed: Boolean(s.dripfeed),
				cancel: Boolean(s.cancel),
				averageTime: toNumber(s.average_time) ?? null,
				raw: s,
			});
		}
	}
	setCache(cacheKey, all, 5 * 60 * 1000);
	return all;
}

export async function loadNormalizedServices(): Promise<NormalizedSmmService[]> {
	const cacheKey = 'providers:normalized:v1';
	const cached = getCache<NormalizedSmmService[]>(cacheKey);
	if (cached) return cached;

	const admin = readAdminConfig();
	const allNormalized = await aggregateRawServices();
	const finalList = applyOverrides(allNormalized, admin);

	setCache(cacheKey, finalList, 10 * 60 * 1000);
	return finalList;
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

