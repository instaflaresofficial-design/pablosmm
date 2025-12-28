// Minimal API client for SMM provider(s)
export type EarthPanelService = {
	service: string; // id as string
	type: string;
	rate: string | number;
	min: string | number;
	max: string | number;
	name: string;
	category: string;
	description?: string;
	desc?: string;
	dripfeed?: boolean;
	refill?: boolean;
	cancel?: boolean;
	average_time?: number | string;
};

const PROVIDER_URL = 'https://www.theearthpanel.com/api/v2';

function getApiKey(): string {
	// Prefer env var, fallback to provided key if present (development only)
	const fromEnv = process.env.EARTHPANEL_API_KEY || process.env.NEXT_PUBLIC_EARTHPANEL_API_KEY;
	return (fromEnv && fromEnv.trim()) || '65f019a6902877f30a7961997e01c6496514db7b';
}

async function postForm<T = unknown>(url: string, body: Record<string, string>): Promise<T> {
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams(body).toString(),
		// Avoid caching provider responses implicitly
		cache: 'no-store',
	});
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`Provider HTTP ${res.status}: ${text}`);
	}
	return (await res.json()) as T;
}

export async function fetchEarthPanelServices(): Promise<EarthPanelService[]> {
	const key = getApiKey();
	const data = await postForm<EarthPanelService[] | { error: string }>(PROVIDER_URL, {
		key,
		action: 'services',
	});
	if (!Array.isArray(data)) {
		throw new Error('Provider returned an error or unexpected payload');
	}
	return data;
}

