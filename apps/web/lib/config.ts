export function getApiBaseUrl(): string {
    // Browser-side: ALWAYS use relative path for Next.js proxy
    // This works for localhost, network IPs (192.168.x.x), and production
    if (typeof window !== 'undefined') {
        console.log('[getApiBaseUrl] Client-side: returning /api');
        return '/api';
    }

    // Server-side: Use env var or default to localhost
    const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    console.log('[getApiBaseUrl] Server-side: returning', serverUrl);
    return serverUrl;
}
