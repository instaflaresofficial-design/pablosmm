export function getApiBaseUrl(): string {
    // If we are on the server, use NEXT_PUBLIC_API_URL or default to localhost
    if (typeof window === 'undefined') {
        return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    }

    // On the client, return '/api' to leverage Next.js rewrites/proxy
    return '/api';
}
