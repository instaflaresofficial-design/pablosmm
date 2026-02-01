package metadata

import (
	"encoding/json"
	"html"
	"io"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Metadata struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Image       string `json:"image"`
	Followers   int    `json:"followers"`
	Following   int    `json:"following"`
	Posts       int    `json:"posts"`
}

type Service struct {
	client *http.Client
	mu     sync.RWMutex
	cache  map[string]cacheItem
}

type cacheItem struct {
	data   *Metadata
	expiry time.Time
}

func New() *Service {
	return &Service{
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		cache: make(map[string]cacheItem),
	}
}

func (s *Service) Fetch(targetURL string) (*Metadata, error) {
	s.mu.RLock()
	if item, ok := s.cache[targetURL]; ok && time.Now().Before(item.expiry) {
		s.mu.RUnlock()
		log.Printf("[Metadata] Cache hit for %s", targetURL)
		return item.data, nil
	}
	s.mu.RUnlock()

	// Instagram optimization: Try oEmbed API first for Reels/Posts (FAST!)
	if strings.Contains(targetURL, "instagram.com") {
		isPost := strings.Contains(targetURL, "/p/") ||
			strings.Contains(targetURL, "/reels/") ||
			strings.Contains(targetURL, "/reel/") ||
			strings.Contains(targetURL, "/tv/")

		if isPost {
			log.Printf("[Metadata] Trying Instagram oEmbed API for %s", targetURL)
			if meta, err := s.fetchInstagramOEmbed(targetURL); err == nil && meta.Image != "" {
				log.Printf("[Metadata] oEmbed success for %s", targetURL)
				// Cache the result
				s.mu.Lock()
				s.cache[targetURL] = cacheItem{
					data:   meta,
					expiry: time.Now().Add(1 * time.Hour),
				}
				s.mu.Unlock()
				return meta, nil
			} else {
				log.Printf("[Metadata] oEmbed failed: %v, falling back to scraping", err)
			}
		}
	}

	fetchURL := targetURL

	// For Instagram, DON'T use /embed/ - it redirects to Facebook and gets blocked
	// Instead, use direct URL with mobile headers

	req, err := http.NewRequest("GET", fetchURL, nil)
	if err != nil {
		return nil, err
	}

	// Masquerade as a real Mobile browser (more likely to be allowed for basic info)
	req.Header.Set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Cache-Control", "no-cache")
	req.Header.Set("Pragma", "no-cache")
	req.Header.Set("Sec-Fetch-Dest", "document")
	req.Header.Set("Sec-Fetch-Mode", "navigate")
	req.Header.Set("Sec-Fetch-Site", "none")
	req.Header.Set("Sec-Fetch-User", "?1")
	req.Header.Set("Upgrade-Insecure-Requests", "1")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Metadata fetch warning: %s (via %s) returned %d", targetURL, fetchURL, resp.StatusCode)
	}

	// Read first 256KB for IG/Modern pages
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 262144))
	htmlContent := string(body)

	m := &Metadata{
		Title:       html.UnescapeString(extractTag(htmlContent, "title")),
		Description: html.UnescapeString(extractMeta(htmlContent, "description")),
		Image:       html.UnescapeString(extractMeta(htmlContent, "image")),
	}

	// Secondary check for common thumbnail tags
	if m.Image == "" {
		m.Image = html.UnescapeString(extractMeta(htmlContent, "thumbnail"))
	}
	if m.Image == "" {
		m.Image = html.UnescapeString(extractMeta(htmlContent, "twitter:image"))
	}

	// Fallback to og:title if plain title failed
	if m.Title == "" {
		m.Title = html.UnescapeString(extractMeta(htmlContent, "title"))
	}

	// Instagram Specific: Extract stats from description or twitter:description
	if strings.Contains(targetURL, "instagram.com") {
		desc := m.Description
		if desc == "" {
			desc = html.UnescapeString(extractMeta(htmlContent, "twitter:description"))
		}

		log.Printf("[Metadata] Parsing Instagram Stats from: %s", desc)
		m.Followers, m.Following, m.Posts = parseInstagramStats(desc)

		if m.Followers == 0 && m.Following == 0 && m.Posts == 0 {
			// Log just the start of the body to see what we're getting
			limit := len(htmlContent)
			if limit > 2000 {
				limit = 2000
			}
			log.Printf("[Metadata] DEBUG: HTML Start: %s", htmlContent[:limit])
		}
	}

	log.Printf("Metadata Result for %s: Image=%s, Title=%s, Stats=%d/%d/%d", targetURL, m.Image, m.Title, m.Followers, m.Following, m.Posts)

	// Cache the result for 1 hour
	s.mu.Lock()
	s.cache[targetURL] = cacheItem{
		data:   m,
		expiry: time.Now().Add(1 * time.Hour),
	}
	s.mu.Unlock()

	return m, nil
}

func parseInstagramStats(desc string) (followers, following, posts int) {
	// Independent search for each stat to handle varied order
	// Patterns: "123 Followers", "1.2K Following", "45 Posts"
	fRe := regexp.MustCompile(`(?i)([\d,.]+)([KMB]?)\s*Followers`)
	fingRe := regexp.MustCompile(`(?i)([\d,.]+)([KMB]?)\s*Following`)
	pRe := regexp.MustCompile(`(?i)([\d,.]+)([KMB]?)\s*Posts`)

	if fMatch := fRe.FindStringSubmatch(desc); len(fMatch) >= 3 {
		followers = parseCount(fMatch[1], fMatch[2])
	}
	if fingMatch := fingRe.FindStringSubmatch(desc); len(fingMatch) >= 3 {
		following = parseCount(fingMatch[1], fingMatch[2])
	}
	if pMatch := pRe.FindStringSubmatch(desc); len(pMatch) >= 3 {
		posts = parseCount(pMatch[1], pMatch[2])
	}

	if followers == 0 && following == 0 && posts == 0 {
		log.Printf("[Metadata] All stats failed for description: %s", desc)
	}
	return
}

func parseCount(val, suffix string) int {
	val = strings.ReplaceAll(val, ",", "")
	f, _ := strconv.ParseFloat(val, 64)
	switch strings.ToUpper(suffix) {
	case "K":
		f *= 1000
	case "M":
		f *= 1000000
	case "B":
		f *= 1000000000
	}
	return int(f)
}

func extractTag(html, tag string) string {
	re := regexp.MustCompile("(?i)<" + tag + "[^>]*>([^<]+)")
	match := re.FindStringSubmatch(html)
	if len(match) > 1 {
		return strings.TrimSpace(match[1])
	}
	return ""
}

func extractMeta(html, property string) string {
	// Try multiple variations for OpenGraph and Twitter tags
	// Using (?s) to match across newlines and [^>]* to handle intermediate attributes
	patterns := []string{
		`(?is)<meta\s+[^>]*(?:property|name|itemprop)=["'](?:og:|twitter:)?` + property + `["'][^>]*content=["']([^"']+)["']`,
		`(?is)<meta\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["'](?:og:|twitter:)?` + property + `["']`,
	}

	for _, p := range patterns {
		re := regexp.MustCompile(p)
		if match := re.FindStringSubmatch(html); len(match) > 1 {
			return strings.TrimSpace(match[1])
		}
	}
	return ""
}

// fetchInstagramOEmbed fetches metadata using Instagram's official oEmbed API
// This is MUCH faster and more reliable than scraping for Reels/Posts
func (s *Service) fetchInstagramOEmbed(targetURL string) (*Metadata, error) {
	// Instagram oEmbed endpoint
	oembedURL := "https://api.instagram.com/oembed/?url=" + url.QueryEscape(targetURL)

	req, err := http.NewRequest("GET", oembedURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, err
	}

	var oembedData struct {
		Title        string `json:"title"`
		AuthorName   string `json:"author_name"`
		ThumbnailURL string `json:"thumbnail_url"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&oembedData); err != nil {
		return nil, err
	}

	return &Metadata{
		Title:       oembedData.Title,
		Description: "By " + oembedData.AuthorName,
		Image:       oembedData.ThumbnailURL,
	}, nil
}
