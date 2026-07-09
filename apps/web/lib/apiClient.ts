import { getApiBaseUrl } from './config';

const API_BASE = getApiBaseUrl().replace(/\/api$/, '');

async function request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
	const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

	const res = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options.headers,
		},
	});

	if (!res.ok) {
		const error = await res.json().catch(() => ({ error: 'Unknown error' }));
		throw new Error(error.error || `HTTP error ${res.status}`);
	}

	return res.json() as Promise<T>;
}

export const apiClient = {
	get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
	post: <T>(endpoint: string, body: any) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
};

export default apiClient;
