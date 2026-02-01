"use client";
import { useState, useEffect } from 'react';
import { getApiBaseUrl } from './config';

export interface LinkMetadata {
    title: string;
    description: string;
    image: string;
    followers?: number;
    following?: number;
    posts?: number;
}

export function useMetadata(url: string) {
    const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
    const [loading, setLoading] = useState(!!(url && url.startsWith('http')));

    useEffect(() => {
        // Basic validation to avoid unnecessary calls for invalid links
        if (!url || !url.startsWith('http')) {
            setMetadata(null);
            setLoading(false);
            return;
        }

        setLoading(true);

        let active = true;
        const fetchMetadata = async () => {
            setLoading(true);

            // Normalize URL: Strip /c/ (comment) suffix from Instagram links to get the main post
            // Example: .../p/DUDYBcfk6OF/c/1800.../ -> .../p/DUDYBcfk6OF/
            let targetFetchUrl = url;
            if (url.includes('instagram.com') && url.includes('/c/')) {
                const match = url.match(/(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[^/?#]+)/);
                if (match) {
                    targetFetchUrl = match[1];
                    console.log(`[useMetadata] Normalized URL: ${url} -> ${targetFetchUrl}`);
                }
            }

            try {
                // 1. Try Backend First
                const base = getApiBaseUrl();
                // Avoid logging absolute URLs in production, but helpful for dev
                console.log(`[useMetadata] Fetching from backend: ${base}/metadata`);
                const res = await fetch(`${base}/metadata?url=${encodeURIComponent(targetFetchUrl)}`);
                const data = await res.json();

                if (active && data.image) {
                    console.log("[useMetadata] Success from backend");
                    setMetadata({
                        title: data.title || '',
                        description: data.description || '',
                        image: data.image || '',
                        followers: data.followers || 0,
                        following: data.following || 0,
                        posts: data.posts || 0,
                    });
                    setLoading(false);
                    return;
                }

                // 2. Fallback: Client-side fetch via CORS Proxies
                if (active) {
                    console.log("[useMetadata] Backend empty or failed, trying client-side proxies...");
                    let clientTarget = targetFetchUrl;
                    if (targetFetchUrl.includes('instagram.com') && !targetFetchUrl.includes('/embed')) {
                        const isPost = targetFetchUrl.includes('/p/') || targetFetchUrl.includes('/reels/') || targetFetchUrl.includes('/reel/') || targetFetchUrl.includes('/tv/');
                        if (isPost) {
                            clientTarget = targetFetchUrl.replace(/\/$/, '') + '/embed/';
                        }
                    }

                    const fetchWithFallback = async (target: string) => {
                        // Try AllOrigins first
                        try {
                            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(target)}`);
                            if (res.ok) {
                                const data = await res.json();
                                return data.contents;
                            }
                        } catch (e) {
                            console.warn("[useMetadata] AllOrigins failed, trying fallback...");
                        }

                        // Fallback to corsproxy.io
                        try {
                            const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(target)}`);
                            if (res.ok) return await res.text();
                        } catch (e) {
                            console.error("[useMetadata] All proxies failed");
                        }
                        return null;
                    };

                    const html = await fetchWithFallback(clientTarget);

                    if (html && active) {
                        const doc = new DOMParser().parseFromString(html, 'text/html');

                        // Instagram Embed specific selectors
                        const embedImage = doc.querySelector('img.EmbeddedMediaImage')?.getAttribute('src');

                        const getMeta = (prop: string) =>
                            doc.querySelector(`meta[property="og:${prop}"]`)?.getAttribute('content') ||
                            doc.querySelector(`meta[name="og:${prop}"]`)?.getAttribute('content') ||
                            doc.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') ||
                            doc.querySelector(`meta[name="${prop}"]`)?.getAttribute('content') ||
                            doc.querySelector(`meta[itemprop="${prop}"]`)?.getAttribute('content');

                        const unescape = (str: string) => {
                            if (!str) return '';
                            return str.replace(/&amp;/g, '&')
                                .replace(/&lt;/g, '<')
                                .replace(/&gt;/g, '>')
                                .replace(/&quot;/g, '"')
                                .replace(/&#039;/g, "'");
                        };

                        const image = unescape(embedImage || getMeta('image') || '');
                        const title = unescape(getMeta('title') || doc.title || '');
                        const desc = unescape(getMeta('description') || '');

                        console.log("[useMetadata] Proxy result:", { title, image: image ? "found" : "not found" });

                        if (image) {
                            let followers = 0;
                            let following = 0;
                            let posts = 0;

                            if (url.includes('instagram.com')) {
                                const parseFn = (val: string, suffix: string) => {
                                    let f = parseFloat(val.replace(/,/g, ''));
                                    if (suffix?.toUpperCase() === 'K') f *= 1000;
                                    if (suffix?.toUpperCase() === 'M') f *= 1000000;
                                    if (suffix?.toUpperCase() === 'B') f *= 1000000000;
                                    return Math.floor(f);
                                };

                                const fMatch = desc.match(/([\d,.]+)([KMB]?)\s*Followers/i);
                                if (fMatch) followers = parseFn(fMatch[1], fMatch[2]);

                                const fingMatch = desc.match(/([\d,.]+)([KMB]?)\s*Following/i);
                                if (fingMatch) following = parseFn(fingMatch[1], fingMatch[2]);

                                const pMatch = desc.match(/([\d,.]+)([KMB]?)\s*Posts/i);
                                if (pMatch) posts = parseFn(pMatch[1], pMatch[2]);

                                console.log("[useMetadata] Extracted Stats:", { followers, following, posts });
                            }

                            setMetadata({
                                title: title || '',
                                description: desc,
                                image: image,
                                followers,
                                following,
                                posts
                            });
                        }
                    }
                }
            } catch (err) {
                console.error('[useMetadata] Error:', err);
                if (active) setMetadata(null);
            } finally {
                if (active) setLoading(false);
            }
        };

        // Debounce to avoid hitting the backend on every keystroke
        const timer = setTimeout(fetchMetadata, 800);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [url]);

    return { metadata, loading };
}
