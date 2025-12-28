export type Platform = 'instagram' | 'facebook' | 'x' | 'telegram' | 'tiktok' | 'youtube';
export type ServiceType = 'followers' | 'likes' | 'views' | 'comments' | 'shares' | 'votes';
export type Variant = 'any' | 'post' | 'reel' | 'story' | 'igtv' | 'video' | 'live' | 'short';

export interface NormalizedSmmService {
	id: string; // provider service id
	platform: Platform;
	type: ServiceType;
	variant: Variant;
	providerName: string;
	category: string;
	ratePer1000: number; // price per 1000 units
	min: number;
	max: number;
	refill: boolean;
	dripfeed: boolean;
	cancel: boolean;
	averageTime: number | null;
	raw?: unknown; // full provider payload for debugging
}

