package metadata

import (
	"encoding/json"
	"fmt"
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
			Timeout: 15 * time.Second,
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
				s.saveCache(targetURL, meta)
				return meta, nil
			}
		}
	}

	// General Scraping
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return nil, err
	}

	// Use a modern User-Agent to avoid detection
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Upgrade-Insecure-Requests", "1")
	req.Header.Set("Sec-Ch-Ua", "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Google Chrome\";v=\"120\"")
	req.Header.Set("Sec-Ch-Ua-Mobile", "?0")
	req.Header.Set("Sec-Ch-Ua-Platform", "\"Windows\"")
	req.Header.Set("Sec-Fetch-Dest", "document")
	req.Header.Set("Sec-Fetch-Mode", "navigate")
	req.Header.Set("Sec-Fetch-Site", "none")
	req.Header.Set("Sec-Fetch-User", "?1")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Metadata fetch warning: %s returned %d", targetURL, resp.StatusCode)
		// If 404 or 429, we might want to return partial data or error
		if resp.StatusCode == 404 {
			return nil, fmt.Errorf("page not found")
		}
	}

	// Read bigger chunk (512KB) to capture stats often at the bottom of head or in body
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 512*1024))
	htmlContent := string(body)

	m := &Metadata{
		Title:       html.UnescapeString(extractTag(htmlContent, "title")),
		Description: html.UnescapeString(extractMeta(htmlContent, "description")),
		Image:       html.UnescapeString(extractMeta(htmlContent, "image")),
	}

	// Image fallbacks
	if m.Image == "" {
		m.Image = html.UnescapeString(extractMeta(htmlContent, "thumbnail"))
	}
	if m.Image == "" {
		m.Image = html.UnescapeString(extractMeta(htmlContent, "twitter:image"))
	}

	// Title fallback
	if m.Title == "" {
		m.Title = html.UnescapeString(extractMeta(htmlContent, "title"))
	}
	if m.Title == "" {
		m.Title = html.UnescapeString(extractMeta(htmlContent, "twitter:title"))
	}

	// PLATFORM SPECIFIC PARSING
	if strings.Contains(targetURL, "instagram.com") {
		// IG Parsing
		desc := m.Description
		if desc == "" {
			desc = html.UnescapeString(extractMeta(htmlContent, "twitter:description"))
		}
		m.Followers, m.Following, m.Posts = parseInstagramStats(desc)

	} else if strings.Contains(targetURL, "tiktok.com") {
		// TikTok Parsing
		// TikTok often puts stats in description: "X Followers, Y Following, Z Likes"
		desc := m.Description
		if desc == "" {
			desc = html.UnescapeString(extractMeta(htmlContent, "twitter:description"))
		}
		// TikTok OEmbed is also an option but let's try scraping first
		m.Followers, m.Following, m.Posts = parseTikTokStats(desc)
		if m.Followers == 0 {
			// Try oEmbed as fallback for profiles? TikTok oEmbed is mostly for videos.
		}

	} else if strings.Contains(targetURL, "youtube.com") || strings.Contains(targetURL, "youtu.be") {
		// YouTube Parsing
		// Try extracting from body text "1.2M subscribers"
		m.Followers = extractYouTubeSubscribers(htmlContent)
		
		// If video, try oEmbed
		if m.Title == "" || m.Image == "" {
			// Simple oEmbed for Title/Image
			oembedURL := "https://www.youtube.com/oembed?url=" + url.QueryEscape(targetURL) + "&format=json"
			if oResp, err := s.client.Get(oembedURL); err == nil && oResp.StatusCode == 200 {
				var oData struct {
					Title string `json:"title"` 
					Thumb string `json:"thumbnail_url"`
					Auth  string `json:"author_name"`
				}
				json.NewDecoder(oResp.Body).Decode(&oData)
				if m.Title == "" { m.Title = oData.Title }
				if m.Image == "" { m.Image = oData.Thumb }
				if m.Description == "" { m.Description = "By " + oData.Auth }
			}
		}
	} else if strings.Contains(targetURL, "x.com") || strings.Contains(targetURL, "twitter.com") {
		// X Parsing: hard to scrape.
		// Use unavatar for image if missing
		if m.Image == "" {
			parts := strings.Split(targetURL, "/")
			if len(parts) > 3 {
				username := parts[3]
				// Basic cleaning
				username = strings.Split(username, "?")[0]
				m.Image = "https://unavatar.io/twitter/" + username
			}
		}
	}

	s.saveCache(targetURL, m)
	return m, nil
}

func (s *Service) saveCache(url string, m *Metadata) {
	s.mu.Lock()
	s.cache[url] = cacheItem{
		data:   m,
		expiry: time.Now().Add(1 * time.Hour),
	}
	s.mu.Unlock()
}

func parseInstagramStats(desc string) (followers, following, posts int) {
	fRe := regexp.MustCompile(`(?i)([\d,.]+)([KMB]?)\s*Followers`)
	fingRe := regexp.MustCompile(`(?i)([\d,.]+)([KMB]?)\s*Following`)
	pRe := regexp.MustCompile(`(?i)([\d,.]+)([KMB]?)\s*Posts`)

	if match := fRe.FindStringSubmatch(desc); len(match) >= 3 {
		followers = parseCount(match[1], match[2])
	}
	if match := fingRe.FindStringSubmatch(desc); len(match) >= 3 {
		following = parseCount(match[1], match[2])
	}
	if match := pRe.FindStringSubmatch(desc); len(match) >= 3 {
		posts = parseCount(match[1], match[2])
	}
	return
}

func parseTikTokStats(desc string) (followers, following, likes int) {
	// "10.5K Followers, 20 Following, 100 Likes..."
	fRe := regexp.MustCompile(`(?i)([\d,.]+)([KMB]?)\s*Followers`)
	fingRe := regexp.MustCompile(`(?i)([\d,.]+)([KMB]?)\s*Following`)
	lRe := regexp.MustCompile(`(?i)([\d,.]+)([KMB]?)\s*Likes`)

	if match := fRe.FindStringSubmatch(desc); len(match) >= 3 {
		followers = parseCount(match[1], match[2])
	}
	if match := fingRe.FindStringSubmatch(desc); len(match) >= 3 {
		following = parseCount(match[1], match[2])
	}
	if match := lRe.FindStringSubmatch(desc); len(match) >= 3 {
		likes = parseCount(match[1], match[2]) // We map likes to posts for generic struct if needed, or ignore
	}
	return followers, following, likes
}

func extractYouTubeSubscribers(html string) int {
	// Look for "1.2M subscribers" in text
	re := regexp.MustCompile(`(?i)([\d,.]+)([KMB]?)\s*subscribers`)
	match := re.FindStringSubmatch(html)
	if len(match) >= 3 {
		return parseCount(match[1], match[2])
	}
	return 0
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

func extractTag(htmlContent, tag string) string {
	re := regexp.MustCompile("(?i)<" + tag + "[^>]*>([^<]+)")
	match := re.FindStringSubmatch(htmlContent)
	if len(match) > 1 {
		return strings.TrimSpace(match[1])
	}
	return ""
}

func extractMeta(htmlContent, property string) string {
	patterns := []string{
		`(?is)<meta\s+[^>]*(?:property|name|itemprop)=["'](?:og:|twitter:)?` + property + `["'][^>]*content=["']([^"']+)["']`,
		`(?is)<meta\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["'](?:og:|twitter:)?` + property + `["']`,
	}
	for _, p := range patterns {
		re := regexp.MustCompile(p)
		if match := re.FindStringSubmatch(htmlContent); len(match) > 1 {
			return strings.TrimSpace(match[1])
		}
	}
	return ""
}

func (s *Service) fetchInstagramOEmbed(targetURL string) (*Metadata, error) {
	oembedURL := "https://api.instagram.com/oembed/?url=" + url.QueryEscape(targetURL)
	req, err := http.NewRequest("GET", oembedURL, nil)
	if err != nil { return nil, err }
	
	resp, err := s.client.Do(req)
	if err != nil { return nil, err }
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK { return nil, fmt.Errorf("status %d", resp.StatusCode) }

	var oembedData struct {
		Title        string `json:"title"`
		AuthorName   string `json:"author_name"`
		ThumbnailURL string `json:"thumbnail_url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&oembedData); err != nil { return nil, err }

	return &Metadata{
		Title:       oembedData.Title,
		Description: "By " + oembedData.AuthorName,
		Image:       oembedData.ThumbnailURL,
	}, nil
}

