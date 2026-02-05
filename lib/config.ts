export function getApiBaseUrl(): string {
    // Check if we're in browser
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;

        // If accessing via localhost, use localhost backend
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:8080/api';
        }

        // If accessing via network IP (e.g., 192.168.x.x), use network IP backend
        // This works for mobile devices on the same network
        return `http://${hostname}:8080/api`;
    }

    // Server-side rendering fallback
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
}
