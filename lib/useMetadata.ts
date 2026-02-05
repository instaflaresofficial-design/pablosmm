"use client";
import { useState, useEffect } from 'react';
import { getApiBaseUrl } from './config';
import { detectPlatform, extractPlatformStats } from './platformParser';

export interface LinkMetadata {
    title: string;
    description: string;
    image: string;
    followers?: number;
    following?: number;
    posts?: number;
}

// Wrapper to capitalize title
const wrapperTitle = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function extractYoutubeStats(html: string): { subscribers: number, videos: number } {
    const stats = { subscribers: 0, videos: 0 };

    try {
        // 1. Extract Subscribers
        // Pattern 1: JSON "subscriberCountText": { "simpleText": "1.2M subscribers" }
        let subMatch = html.match(/"subscriberCountText":\s*\{[^}]*"simpleText":\s*"([^"]+)"/);

        // Pattern 2: JSON "subscriberCountText": { "accessibility": { "accessibilityData": { "label": "1.2M subscribers" } } }
        if (!subMatch) {
            subMatch = html.match(/"subscriberCountText":\s*\{[^}]*"label":\s*"([^"]+)"/);
        }

        // Pattern 3: Raw text fallback (e.g., "1.2M subscribers" inside title or metatags)
        if (!subMatch) {
            subMatch = html.match(/([\d.,]+[KMB]?)\s+subscribers/i);
        }

        if (subMatch) {
            const text = subMatch[1] || subMatch[0]; // subMatch[0] for raw text
            // Extract number and suffix, handle "1.2M" or "1.2M subscribers"
            const numMatch = text.match(/([\d.,]+)\s*([KMB]?)/i);
            if (numMatch) {
                let num = parseFloat(numMatch[1].replace(/,/g, ''));
                const suffix = numMatch[2].toUpperCase();

                if (suffix === 'K') num *= 1000;
                else if (suffix === 'M') num *= 1000000;
                else if (suffix === 'B') num *= 1000000000;

                stats.subscribers = Math.floor(num);
            }
        }

        // 2. Extract Videos
        // Pattern 1: JSON "videoCountText"
        let vidMatch = html.match(/"videoCountText":\s*\{[^}]*"label":\s*"([^"]+)"/);

        // Pattern 2: simpleText for videos
        if (!vidMatch) {
            vidMatch = html.match(/"videoCountText":\s*\{[^}]*"simpleText":\s*"([^"]+)"/);
        }

        // Pattern 3: Raw text fallback (e.g. "34 videos" or "1.2K videos")
        if (!vidMatch) {
            // Look for "34 videos" or "1.2K videos" but avoid matching "Recommended videos" etc.
            // We look for a number followed immediately by "videos"
            vidMatch = html.match(/([\d.,]+[KMB]?)\s*videos(?!\w)/i);
        }

        // Pattern 4: Meta tags description often contains "x subscribers • y videos"
        if (!vidMatch) {
            const metaDesc = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
            if (metaDesc) {
                const search = metaDesc[1].match(/([\d.,]+[KMB]?)\s*videos/i);
                if (search) vidMatch = search;
            }
        }

        if (vidMatch) {
            const text = vidMatch[1] || vidMatch[0];
            const numMatch = text.match(/([\d.,]+)\s*([KMB]?)/i);
            if (numMatch) {
                let num = parseFloat(numMatch[1].replace(/,/g, ''));
                const suffix = numMatch[2].toUpperCase();

                if (suffix === 'K') num *= 1000;
                else if (suffix === 'M') num *= 1000000;
                else if (suffix === 'B') num *= 1000000000;

                stats.videos = Math.floor(num);
            }
        }

    } catch (e) {
        console.warn('Error parsing YouTube stats:', e);
    }
    return stats;
}

export function useMetadata(url: string, service?: string) {
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
            let targetFetchUrl: any = url;
            if (url.includes('instagram.com') && url.includes('/c/')) {
                const match = url.match(/(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[^/?#]+)/);
                if (match) {
                    targetFetchUrl = match[1];
                }
            }

            try {
                // 1. Try Backend First
                const base = getApiBaseUrl();
                console.log(`[useMetadata] Fetching from backend: ${base}/metadata`);

                // Store backend data for fallthrough scenarios
                let backendData: any = null;
                let backendSuccess = false;

                try {
                    const res = await fetch(`${base}/metadata?url=${encodeURIComponent(targetFetchUrl)}`);
                    const data = await res.json();
                    backendData = data; // Store for later use

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
                        backendSuccess = true;

                        // If YouTube/X/Telegram/TikTok specific stats are needed and missing/zero, 
                        // fallthrough to client-side logic
                        const needsClientFetch = (
                            (targetFetchUrl.includes('youtube.com') || targetFetchUrl.includes('youtu.be')) ||
                            (targetFetchUrl.includes('x.com') || targetFetchUrl.includes('twitter.com')) ||
                            (targetFetchUrl.includes('t.me') || targetFetchUrl.includes('telegram.me')) ||
                            targetFetchUrl.includes('tiktok.com')
                        );

                        if (needsClientFetch && data.followers === 0 && data.posts === 0) {
                            console.log("[useMetadata] Backend returned 0 stats, continuing to client-side fetch...");
                            backendSuccess = false; // Force fallthrough to client logic
                        } else if (!needsClientFetch) {
                            return; // For other platforms (Instagram, Facebook), respect backend
                        } else if (needsClientFetch && (data.followers > 0 || data.posts > 0)) {
                            return; // Backend had valid stats, use them
                        }
                        // If needsClientFetch && 0 stats, fallthrough to client logic below
                    }
                } catch (e) {
                    console.warn("[useMetadata] Backend fetch failed, falling back...");
                }

                // 1.5. YouTube Handling (Channels & Videos)
                if (active && (targetFetchUrl.includes('youtube.com') || targetFetchUrl.includes('youtu.be'))) {
                    // Check if it's a channel URL
                    const isChannel = targetFetchUrl.match(/(@[\w.-]+|\/channel\/|\/c\/|\/user\/)/);

                    if (isChannel) {
                        // Progressive Loading: 
                        // 1. Show Instant Preview based on URL
                        console.log("[useMetadata] Detected YouTube Channel URL, setting instant preview...");

                        let title = 'YouTube Channel';
                        const handleMatch = targetFetchUrl.match(/@([\w.-]+)/);
                        if (handleMatch) {
                            title = handleMatch[1];
                        }

                        // Set initial "Instant" metadata
                        setMetadata(prev => {
                            if (prev && prev.title === wrapperTitle(title)) return prev; // Avoid flicker
                            return {
                                title: wrapperTitle(title),
                                description: 'YouTube Channel',
                                image: '/platforms/youtube.png',
                                followers: 0,
                                following: 0,
                                posts: 0
                            };
                        });

                        // DO NOT return here (unless we already have successful backend data which we checked above)
                        // Allow falling through to Proxy Fetch to get real stats
                        setLoading(false); // Stop spinner, show preview

                        console.log("[useMetadata] Fetching real stats in background...");
                    } else {
                        // Video Logic (oEmbed) - Fast & Official
                        console.log("[useMetadata] Trying YouTube oEmbed API...");
                        try {
                            const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(targetFetchUrl)}&format=json`;
                            const res = await fetch(oembedUrl);

                            if (res.ok) {
                                const data = await res.json();
                                console.log("[useMetadata] YouTube oEmbed success:", data);

                                setMetadata({
                                    title: data.title || '',
                                    description: `By ${data.author_name || 'YouTube'}`,
                                    image: data.thumbnail_url || '',
                                    followers: 0, // Initial 0
                                    following: 0,
                                    posts: 0
                                });
                                setLoading(false);

                                // Background fetch for subscriber count IF needed
                                const needsSubscriberCount = service === 'followers' || service === 'subscribers';
                                if (needsSubscriberCount && data.author_url) {
                                    console.log("[useMetadata] Converting video to channel fetch for stats in background...");
                                    targetFetchUrl = data.author_url; // Continue to proxy fetch using channel URL
                                    // Fallthrough to proxy logic
                                } else {
                                    return;
                                }
                            }
                        } catch (err) {
                            console.warn("[useMetadata] YouTube oEmbed failed:", err);
                        }
                    }
                }

                // 1.6. X (Twitter) Handling
                if (active && (targetFetchUrl.includes('x.com') || targetFetchUrl.includes('twitter.com'))) {
                    const isPost = targetFetchUrl.includes('/status/');

                    if (isPost) {
                        // Try X oEmbed for tweets
                        console.log("[useMetadata] Trying X oEmbed API...");
                        try {
                            const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(targetFetchUrl)}`;
                            const res = await fetch(oembedUrl);

                            if (res.ok) {
                                const data = await res.json();
                                console.log("[useMetadata] X oEmbed success:", data);

                                // Image Strategy:
                                // 1. Backend Image (Preferred)
                                // 2. Author Profile Pic via unavatar.io (Fallback)
                                // 3. Generic Icon (Worst case)
                                let displayImage = backendData?.image;

                                if (!displayImage) {
                                    // Extract author handle from author_url (e.g. https://twitter.com/UBSTheFilm)
                                    const authorHandle = data.author_url ? data.author_url.split('/').pop() : null;
                                    if (authorHandle) {
                                        displayImage = `https://unavatar.io/twitter/${authorHandle}`;
                                    }
                                }

                                setMetadata({
                                    title: data.author_name || 'X Post',
                                    description: data.html?.replace(/<[^>]*>/g, '').substring(0, 200) || 'X Post',
                                    image: displayImage || '/platforms/x.png',
                                    followers: 0,
                                    following: 0,
                                    posts: 0
                                });
                                setLoading(false);
                                return;
                            }
                        } catch (err) {
                            console.warn("[useMetadata] X oEmbed failed:", err);
                        }
                    }

                    // Profile: Instant preview (safe approach, no scraping)
                    console.log("[useMetadata] X Profile URL - instant preview (stats hidden)");
                    const usernameMatch = targetFetchUrl.match(/(?:x\.com|twitter\.com)\/([^/?#]+)/);
                    const username = usernameMatch ? usernameMatch[1].replace('@', '') : 'X Profile';

                    // Image Strategy: Backend -> unavatar.io -> Default
                    let displayImage = backendData?.image;
                    if (!displayImage && username !== 'X Profile') {
                        displayImage = `https://unavatar.io/twitter/${username}`;
                    }

                    setMetadata({
                        title: wrapperTitle(username),
                        description: 'X Profile',
                        image: displayImage || '/platforms/x.png',
                        followers: 0,
                        following: 0,
                        posts: 0
                    });
                    setLoading(false);
                    return; // Don't attempt scraping X (rate limiting risk)
                }

                // 1.7. Telegram Handling
                if (active && (targetFetchUrl.includes('t.me') || targetFetchUrl.includes('telegram.me'))) {
                    console.log("[useMetadata] Telegram URL - instant preview (stats hidden)");
                    const usernameMatch = targetFetchUrl.match(/t\.me\/([^/?#]+)/);
                    const username = usernameMatch ? usernameMatch[1].replace('@', '') : 'Telegram';

                    setMetadata({
                        title: wrapperTitle(username),
                        description: 'Telegram Channel/Group',
                        image: '/platforms/telegram.png',
                        followers: 0, // Members mapped to followers
                        following: 0,
                        posts: 0
                    });
                    setLoading(false);
                    return; // Telegram requires auth, don't scrape
                }

                // 1.8. TikTok Handling
                if (active && targetFetchUrl.includes('tiktok.com')) {
                    const isPost = targetFetchUrl.includes('/video/');

                    if (isPost) {
                        // TikTok video - try oEmbed
                        console.log("[useMetadata] Trying TikTok oEmbed API...");
                        try {
                            const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(targetFetchUrl)}`;
                            const res = await fetch(oembedUrl);

                            if (res.ok) {
                                const data = await res.json();
                                console.log("[useMetadata] TikTok oEmbed success:", data);

                                setMetadata({
                                    title: data.title || 'TikTok Video',
                                    description: data.author_name || 'TikTok',
                                    image: data.thumbnail_url || '/platforms/tiktok.png',
                                    followers: 0,
                                    following: 0,
                                    posts: 0
                                });
                                setLoading(false);
                                return;
                            }
                        } catch (err) {
                            console.warn("[useMetadata] TikTok oEmbed failed:", err);
                        }
                    }

                    // Profile: Instant preview
                    console.log("[useMetadata] TikTok Profile URL - instant preview (stats hidden)");
                    const usernameMatch = targetFetchUrl.match(/tiktok\.com\/@([^/?#]+)/);
                    const username = usernameMatch ? usernameMatch[1] : 'TikTok Profile';

                    setMetadata({
                        title: wrapperTitle(username),
                        description: 'TikTok Profile',
                        image: '/platforms/tiktok.png',
                        followers: 0,
                        following: 0,
                        posts: 0
                    });
                    setLoading(false);
                    return; // Don't scrape TikTok (heavy anti-bot)
                }

                // 2. Fallback: Client-side fetch via CORS Proxies (YouTube Channels falls through here)
                if (active) {
                    // console.log("[useMetadata] Fetching full metadata via proxy...");
                    let clientTarget = targetFetchUrl;

                    // Instagram normalization
                    if (targetFetchUrl.includes('instagram.com') && !targetFetchUrl.includes('/embed')) {
                        const isPost = targetFetchUrl.includes('/p/') || targetFetchUrl.includes('/reels/') || targetFetchUrl.includes('/reel/') || targetFetchUrl.includes('/tv/');
                        if (isPost) {
                            clientTarget = targetFetchUrl.replace(/\/$/, '') + '/embed/';
                        }
                    }

                    // YouTube normalization - convert shorts/watch to embed (only if NOT Channel URL)
                    // If it is a channel URL (passed from above), we want to fetch the CHANNEL PAGE, not embed.
                    const isChannel = targetFetchUrl.match(/(@[\w.-]+|\/channel\/|\/c\/|\/user\/)/);

                    if (!isChannel && (targetFetchUrl.includes('youtube.com') || targetFetchUrl.includes('youtu.be'))) {
                        let videoId = null;

                        // Shorts: youtube.com/shorts/VIDEO_ID
                        const shortsMatch = targetFetchUrl.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
                        if (shortsMatch) videoId = shortsMatch[1];

                        // Watch: youtube.com/watch?v=VIDEO_ID
                        if (!videoId) {
                            const watchMatch = targetFetchUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/);
                            if (watchMatch) videoId = watchMatch[1];
                        }

                        // Short URL: youtu.be/VIDEO_ID
                        if (!videoId) {
                            const shortMatch = targetFetchUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
                            if (shortMatch) videoId = shortMatch[1];
                        }

                        if (videoId) {
                            clientTarget = `https://www.youtube.com/embed/${videoId}`;
                            // console.log(`[useMetadata] Normalized YouTube URL: ${targetFetchUrl} -> ${clientTarget}`);
                        }
                    }

                    const fetchWithFallback = async (target: string) => {
                        // For YouTube (Videos, NOT Channels), try direct fetch first
                        if (!isChannel && target.includes('youtube.com')) {
                            try {
                                const res = await fetch(target);
                                if (res.ok) return await res.text();
                            } catch (e) {
                                // console.warn("[useMetadata] Direct YouTube fetch failed, trying proxies...");
                            }
                        }

                        // Try corsproxy.io FIRST (More reliable for YouTube)
                        try {
                            const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(target)}`);
                            if (res.ok) return await res.text();
                        } catch (e) {
                            console.warn("[useMetadata] corsproxy.io failed, trying fallback...");
                        }

                        // Try AllOrigins as fallback
                        try {
                            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(target)}`);
                            if (res.ok) {
                                const data = await res.json();
                                return data.contents;
                            }
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

                        // console.log("[useMetadata] Proxy result:", { title, image: image ? "found" : "not found" });

                        if (image || isChannel) { // Always update for channels if we parse stats

                            // Multi-platform stats extraction
                            const platform = detectPlatform(url);
                            let stats: any;

                            // Specific YouTube Stats (Robust)
                            if (platform === 'youtube' && isChannel) {
                                const ytStats = extractYoutubeStats(html);
                                stats = {
                                    followers: 0, // Request: HIDE subscribers (or set to 0) because fetch is unreliable/wrong
                                    subscribers: 0, // Request: HIDE
                                    following: 0,
                                    posts: 0,
                                    videos: ytStats.videos,
                                    likes: 0,
                                };
                                console.log(`[useMetadata] YouTube Stats (Subscribers hidden as requested):`, stats);
                            } else {
                                stats = platform ? extractPlatformStats(desc, platform) : {
                                    followers: 0,
                                    following: 0,
                                    posts: 0,
                                    subscribers: 0,
                                    members: 0,
                                    videos: 0,
                                    likes: 0,
                                };
                            }

                            setMetadata(prev => ({
                                title: title || prev?.title || '',
                                description: desc || prev?.description || '',
                                image: image || prev?.image || '',
                                followers: stats.followers || stats.subscribers || stats.members || prev?.followers || 0,
                                following: stats.following || prev?.following || 0,
                                posts: stats.posts || stats.videos || prev?.posts || 0
                            }));
                        }
                    }
                }
            } catch (err) {
                console.error('[useMetadata] Error:', err);
                if (active && !metadata) setMetadata(null); // Only clear if we have nothing
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
    }, [url, service]); // Re-add service dependency

    return { metadata, loading };
}
