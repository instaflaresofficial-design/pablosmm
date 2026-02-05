export function getApiBaseUrl(): string {
    // 1. If explicit API URL is set in environment (e.g. for separate backend domain)
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    // 2. Browser-side logic
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;

        // If localhost/127.0.0.1, assume local backend on port 8080
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:8080/api';
        }

        // For mobile testing on local network (e.g. 192.168.x.x)
        if (hostname.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
            return `http://${hostname}:8080/api`;
        }

        // 3. Production/Vercel default: Use relative path to allow Next.js Rewrites to handle it
        return '/api';
    }

    // 4. Server-side default (during SSG/SSR)
    // If we are strictly server-side, relative URLs won't work well without a base.
    // But usually SSG doesn't need this unless pre-fetching.
    // Fallback to localhost for build time if not set.
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
}
