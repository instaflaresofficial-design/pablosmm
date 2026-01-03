// Minimal API client for SMM provider(s) using common SMM v2 API
export type PanelV2Service = {
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

async function postForm<T = unknown>(url: string, body: Record<string, string>): Promise<T> {
	// add a short timeout to avoid hanging when a provider is slow/unreachable
	const controller = new AbortController();
	const timeoutMs = 7000;
	const id = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams(body).toString(),
			// Avoid caching provider responses implicitly
			cache: 'no-store',
			signal: controller.signal,
		});
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(`Provider HTTP ${res.status}: ${text}`);
		}
		return (await res.json()) as T;
	} finally {
		clearTimeout(id);
	}
}

export async function fetchPanelServices(apiUrl: string, apiKey: string): Promise<PanelV2Service[]> {
	const data = await postForm<PanelV2Service[] | { error: string }>(apiUrl, {
		key: apiKey,
		action: 'services',
	});
	if (!Array.isArray(data)) {
		throw new Error('Provider returned an error or unexpected payload');
	}
	return data;
}

export { postForm };

