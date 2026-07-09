/**
 * Multi-Platform URL Parser Utility
 * Detects platform from URL and extracts username/handle
 */

export type SupportedPlatform = 'instagram' | 'facebook' | 'twitter' | 'x' | 'youtube' | 'telegram' | 'tiktok' | 'threads';

export interface PlatformInfo {
    platform: SupportedPlatform;
    username: string;
    isProfile: boolean;
    isPost: boolean;
}

/**
 * Detect platform from URL
 */
export function detectPlatform(url: string): SupportedPlatform | null {
    const lower = url.toLowerCase();

    if (lower.includes('instagram.com')) return 'instagram';
    if (lower.includes('facebook.com') || lower.includes('fb.com')) return 'facebook';
    if (lower.includes('twitter.com')) return 'twitter';
    if (lower.includes('x.com')) return 'x';
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
    if (lower.includes('t.me') || lower.includes('telegram.me')) return 'telegram';
    if (lower.includes('tiktok.com')) return 'tiktok';
    if (lower.includes('threads.net')) return 'threads';

    return null;
}

/**
 * Parse platform-specific URL patterns
 */
export function parsePlatformUrl(url: string): PlatformInfo | null {
    const platform = detectPlatform(url);
    if (!platform) return null;

    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const segments = pathname.split('/').filter(Boolean);

        switch (platform) {
            case 'instagram': {
                // Profile: instagram.com/username
                // Post: instagram.com/p/CODE or /reel/CODE or /tv/CODE
                const isPost = pathname.includes('/p/') || pathname.includes('/reel/') || pathname.includes('/tv/');
                const username = isPost ? '' : segments[0]?.replace('@', '') || '';
                return { platform, username, isProfile: !isPost, isPost };
            }

            case 'facebook': {
                // Profile: facebook.com/username or facebook.com/profile.php?id=123
                // Post: facebook.com/username/posts/123 or /photo or /video
                const isPost = pathname.includes('/posts/') || pathname.includes('/photo') || pathname.includes('/video');
                let username = '';
                if (urlObj.searchParams.has('id')) {
                    username = urlObj.searchParams.get('id') || '';
                } else {
                    username = segments[0] || '';
                }
                return { platform, username, isProfile: !isPost, isPost };
            }

            case 'twitter':
            case 'x': {
                // Profile: twitter.com/username or x.com/username
                // Post: twitter.com/username/status/123
                const isPost = pathname.includes('/status/');
                const username = segments[0]?.replace('@', '') || '';
                return { platform, username, isProfile: !isPost, isPost };
            }

            case 'youtube': {
                // Channel: youtube.com/@username or /channel/ID or /c/username
                // Video: youtube.com/watch?v=ID or youtu.be/ID
                const isPost = pathname.includes('/watch') || pathname.includes('/shorts/') || url.includes('youtu.be');
                let username = '';
                if (pathname.startsWith('/@')) {
                    username = segments[0]?.replace('@', '') || '';
                } else if (pathname.startsWith('/c/')) {
                    username = segments[1] || '';
                } else if (pathname.startsWith('/channel/')) {
                    username = segments[1] || '';
                }
                return { platform, username, isProfile: !isPost, isPost };
            }

            case 'telegram': {
                // Channel/Group: t.me/username
                // Post: t.me/username/123
                const isPost = segments.length > 1 && /^\d+$/.test(segments[1]);
                const username = segments[0] || '';
                return { platform, username, isProfile: !isPost, isPost };
            }

            case 'tiktok': {
                // Profile: tiktok.com/@username
                // Video: tiktok.com/@username/video/123
                const isPost = pathname.includes('/video/');
                const username = segments[0]?.replace('@', '') || '';
                return { platform, username, isProfile: !isPost, isPost };
            }

            case 'threads': {
                // Profile: threads.net/@username
                // Post: threads.net/@username/post/CODE
                const isPost = pathname.includes('/post/');
                const username = segments[0]?.replace('@', '') || '';
                return { platform, username, isProfile: !isPost, isPost };
            }

            default:
                return null;
        }
    } catch (error) {
        console.error('[parsePlatformUrl] Error:', error);
        return null;
    }
}

/**
 * Parse number with K/M/B suffixes
 */
export function parseMetricNumber(value: string, suffix?: string): number {
    let num = parseFloat(value.replace(/,/g, ''));
    if (isNaN(num)) return 0;

    const s = (suffix || '').toUpperCase();
    if (s === 'K') num *= 1000;
    else if (s === 'M') num *= 1000000;
    else if (s === 'B') num *= 1000000000;

    return Math.floor(num);
}

/**
 * Extract stats from description text for different platforms
 */
export function extractPlatformStats(description: string, platform: SupportedPlatform) {
    const stats = {
        followers: 0,
        following: 0,
        posts: 0,
        subscribers: 0,
        members: 0,
        videos: 0,
        likes: 0,
    };

    if (!description) return stats;

    switch (platform) {
        case 'instagram':
        case 'threads': {
            // Instagram/Threads: "1.2K Followers, 500 Following, 30 Posts"
            const fMatch = description.match(/([\d,.]+)([KMB]?)\s*Followers/i);
            if (fMatch) stats.followers = parseMetricNumber(fMatch[1], fMatch[2]);

            const fingMatch = description.match(/([\d,.]+)([KMB]?)\s*Following/i);
            if (fingMatch) stats.following = parseMetricNumber(fingMatch[1], fingMatch[2]);

            const pMatch = description.match(/([\d,.]+)([KMB]?)\s*Posts/i);
            if (pMatch) stats.posts = parseMetricNumber(pMatch[1], pMatch[2]);
            break;
        }

        case 'facebook': {
            // Facebook: "1.2K followers" or "1.2K likes"
            const fMatch = description.match(/([\d,.]+)([KMB]?)\s*(followers?|likes?)/i);
            if (fMatch) stats.followers = parseMetricNumber(fMatch[1], fMatch[2]);
            break;
        }

        case 'twitter':
        case 'x': {
            // X/Twitter: "1.2K Followers, 500 Following"
            const fMatch = description.match(/([\d,.]+)([KMB]?)\s*Followers/i);
            if (fMatch) stats.followers = parseMetricNumber(fMatch[1], fMatch[2]);

            const fingMatch = description.match(/([\d,.]+)([KMB]?)\s*Following/i);
            if (fingMatch) stats.following = parseMetricNumber(fingMatch[1], fingMatch[2]);
            break;
        }

        case 'youtube': {
            // YouTube: "1.2M subscribers, 500 videos"
            const sMatch = description.match(/([\d,.]+)([KMB]?)\s*subscribers?/i);
            if (sMatch) stats.subscribers = parseMetricNumber(sMatch[1], sMatch[2]);

            const vMatch = description.match(/([\d,.]+)([KMB]?)\s*videos?/i);
            if (vMatch) stats.videos = parseMetricNumber(vMatch[1], vMatch[2]);
            break;
        }

        case 'telegram': {
            // Telegram: "1.2K members" or "1.2K subscribers"
            const mMatch = description.match(/([\d,.]+)([KMB]?)\s*(members?|subscribers?)/i);
            if (mMatch) stats.members = parseMetricNumber(mMatch[1], mMatch[2]);
            break;
        }

        case 'tiktok': {
            // TikTok: "1.2M Followers, 500 Following, 10.5M Likes"
            const fMatch = description.match(/([\d,.]+)([KMB]?)\s*Followers/i);
            if (fMatch) stats.followers = parseMetricNumber(fMatch[1], fMatch[2]);

            const fingMatch = description.match(/([\d,.]+)([KMB]?)\s*Following/i);
            if (fingMatch) stats.following = parseMetricNumber(fingMatch[1], fingMatch[2]);

            const lMatch = description.match(/([\d,.]+)([KMB]?)\s*Likes/i);
            if (lMatch) stats.likes = parseMetricNumber(lMatch[1], lMatch[2]);
            break;
        }
    }

    return stats;
}
