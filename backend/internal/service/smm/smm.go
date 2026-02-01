package smm

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"pablosmm/backend/internal/config"
	"pablosmm/backend/internal/db"
	"pablosmm/backend/internal/service/fx"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

// PanelV2Service represents the raw service response from an SMM panel API v2
type PanelV2Service struct {
	Service     json.Number `json:"service"`
	Name        string      `json:"name"`
	Type        string      `json:"type"`
	Category    string      `json:"category"`
	Rate        json.Number `json:"rate"`
	Min         json.Number `json:"min"`
	Max         json.Number `json:"max"`
	Refill      interface{} `json:"refill"`
	Dripfeed    interface{} `json:"dripfeed"`
	Cancel      interface{} `json:"cancel"`
	AverageTime json.Number `json:"average_time"`
	Description string      `json:"description"`
	Desc        string      `json:"desc"`
}

// NormalizedSmmService matches the frontend structure in types/smm.ts
type NormalizedSmmService struct {
	ID                  string      `json:"id"`
	Source              string      `json:"source"`
	SourceServiceID     string      `json:"sourceServiceId"`
	Platform            string      `json:"platform"`
	ServiceType         string      `json:"type"`
	Variant             string      `json:"variant"`
	ProviderName        string      `json:"providerName"`
	Description         string      `json:"description"`
	Category            string      `json:"category"`
	ProviderCategory    string      `json:"providerCategory"`
	RatePer1000         float64     `json:"ratePer1000"`
	BaseRatePer1000     float64     `json:"baseRatePer1000"`
	ProviderCurrency    string      `json:"providerCurrency"`
	DisplayName         string      `json:"displayName,omitempty"`
	DisplayDescription  string      `json:"displayDescription,omitempty"`
	Min                 int         `json:"min"`
	Max                 int         `json:"max"`
	Refill              bool        `json:"refill"`
	Dripfeed            bool        `json:"dripfeed"`
	Cancel              bool        `json:"cancel"`
	AverageTime         *int        `json:"averageTime"`
	Tags                []string    `json:"tags"`
	RawProviderCategory string      `json:"rawProviderCategory"`
	PurchaseCount       int         `json:"purchaseCount"`
	DisplayID           string      `json:"displayId"`
	Raw                 interface{} `json:"raw"`
	Targeting           string      `json:"targeting"`
	Quality             string      `json:"quality"`
	Stability           string      `json:"stability"`
}

type ProviderService struct {
	db         *db.DB
	cfg        *config.Config
	fx         *fx.FXService
	mu         sync.RWMutex
	cache      []NormalizedSmmService
	lastUpdate time.Time
}

func New(database *db.DB, cfg *config.Config, fxSvc *fx.FXService) *ProviderService {
	return &ProviderService{db: database, cfg: cfg, fx: fxSvc}
}

// Regex definitions for detection (ported from original TypeScript)
var (
	platformRegex = map[string]*regexp.Regexp{
		"instagram": regexp.MustCompile("(?i)(\\binstagram\\b|\\big\\b|\\binsta\\b)"),
		"facebook":  regexp.MustCompile("(?i)\\bfacebook\\b|\\bfb\\b"),
		"x":         regexp.MustCompile("(?i)\\btwitter\\b|\\bX\\b"),
		"telegram":  regexp.MustCompile("(?i)\\btelegram\\b|\\btg\\b"),
		"tiktok":    regexp.MustCompile("(?i)\\btiktok\\b|\\btt\\b"),
		"youtube":   regexp.MustCompile("(?i)\\byoutube\\b|\\byt\\b"),
	}

	typeRegex = map[string]*regexp.Regexp{
		"comments":  regexp.MustCompile("(?i)\\bcomment(s)?\\b|\\brepl(y|ies)\\b|\\breview(s)?\\b"),
		"likes":     regexp.MustCompile("(?i)\\blike(s)?\\b|\\bheart(s)?\\b|\\breaction(s)?\\b"),
		"followers": regexp.MustCompile("(?i)\\bfollow(er)?(s)?\\b|\\bsubscriber(s)?\\b|\\bmember(s)?\\b"),
		"views":     regexp.MustCompile("(?i)\\bview(s)?\\b|\\bplay(s)?\\b|\\bwatch(es)?\\b|\\bimpression(s)?\\b|\\breach\\b"),
		"shares":    regexp.MustCompile("(?i)\\bshare(s)?\\b|\\brepost(s)?\\b|\\bretweet(s)?\\b|\\bforward(s)?\\b"),
		"votes":     regexp.MustCompile("(?i)\\bvote(s)?\\b|\\bpoll(s)?\\b"),
		"saves":     regexp.MustCompile("(?i)\\bsave(s)?\\b|\\bbookmark(s)?\\b|\\bsaved\\b"),
	}

	variantRegex = map[string][]struct {
		variant string
		rx      *regexp.Regexp
	}{
		"instagram": {
			{"reel", regexp.MustCompile("(?i)\\breel")},
			{"story", regexp.MustCompile("(?i)\\bstory|stories")},
			{"igtv", regexp.MustCompile("(?i)\\bigtv\\b")},
			{"live", regexp.MustCompile("(?i)\\blive\\b")},
			{"video", regexp.MustCompile("(?i)\\bvideo\\b")},
			{"post", regexp.MustCompile("(?i)\\bpost|photo|image")},
		},
		"facebook": {
			{"video", regexp.MustCompile("(?i)\\bvideo\\b")},
			{"post", regexp.MustCompile("(?i)\\bpost\\b")},
			{"live", regexp.MustCompile("(?i)\\blive\\b")},
		},
		"x": {
			{"post", regexp.MustCompile("(?i)tweet|post")},
			{"video", regexp.MustCompile("(?i)video")},
		},
		"telegram": {
			{"post", regexp.MustCompile("(?i)post|channel|group")},
		},
		"tiktok": {
			{"video", regexp.MustCompile("(?i)video")},
			{"live", regexp.MustCompile("(?i)live")},
			{"post", regexp.MustCompile("(?i)post")},
		},
		"youtube": {
			{"short", regexp.MustCompile("(?i)short")},
			{"video", regexp.MustCompile("(?i)video")},
			{"live", regexp.MustCompile("(?i)live")},
			{"post", regexp.MustCompile("(?i)post|community")},
		},
	}

	hardExcludeRx = regexp.MustCompile("(?i)(\\bdm\\b|direct\\s*message|inbox)")
)

func (s *ProviderService) InvalidateCache() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.lastUpdate = time.Time{}
}

func (s *ProviderService) FetchServices() ([]NormalizedSmmService, error) {
	s.mu.RLock()
	if !s.lastUpdate.IsZero() && time.Since(s.lastUpdate) < 10*time.Minute {
		defer s.mu.RUnlock()
		return s.cache, nil
	}
	s.mu.RUnlock()

	s.mu.Lock()
	defer s.mu.Unlock()

	// Re-check after acquiring lock
	if !s.lastUpdate.IsZero() && time.Since(s.lastUpdate) < 10*time.Minute {
		return s.cache, nil
	}

	formData := url.Values{}
	formData.Set("key", s.cfg.SMMAPIKey)
	formData.Add("action", "services")

	resp, err := http.PostForm(s.cfg.SMMAPIURL, formData)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch services: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("provider returned status %d", resp.StatusCode)
	}

	var rawServices []PanelV2Service
	if err := json.NewDecoder(resp.Body).Decode(&rawServices); err != nil {
		return nil, fmt.Errorf("failed to decode services: %v", err)
	}

	// Fetch overrides from DB
	overrides := make(map[string]struct {
		DisplayName      string
		DisplayDesc      string
		Multiplier       float64
		IsHidden         bool
		Category         string
		Tags             []string
		ProviderCategory string
		PurchaseCount    int
		DisplayID        string
		Refill           *bool
		Cancel           *bool
		Dripfeed         *bool
		ServiceType      *string
		Targeting        *string
		Quality          *string
		Stability        *string
	})

	rows, err := s.db.Pool.Query(context.Background(), `
		SELECT source_service_id, display_name, display_description, rate_multiplier, is_hidden, 
		category, tags, provider_category, purchase_count, display_id,
		refill, cancel, dripfeed, service_type, targeting, quality, stability
		FROM service_overrides
	`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var sid, name, desc string
			var multi float64
			var hidden bool
			var cat, pcat, did, stype, targeting, quality, stability *string
			var tags []string
			var count int
			var refill, cancel, dripfeed *bool

			if err := rows.Scan(&sid, &name, &desc, &multi, &hidden, &cat, &tags, &pcat, &count, &did, &refill, &cancel, &dripfeed, &stype, &targeting, &quality, &stability); err == nil {
				category := ""
				if cat != nil {
					category = *cat
				}
				if tags == nil {
					tags = []string{}
				}
				providerCategory := ""
				if pcat != nil {
					providerCategory = *pcat
				}
				displayID := ""
				if did != nil {
					displayID = *did
				}

				overrides[sid] = struct {
					DisplayName      string
					DisplayDesc      string
					Multiplier       float64
					IsHidden         bool
					Category         string
					Tags             []string
					ProviderCategory string
					PurchaseCount    int
					DisplayID        string
					Refill           *bool
					Cancel           *bool
					Dripfeed         *bool
					ServiceType      *string
					Targeting        *string
					Quality          *string
					Stability        *string
				}{name, desc, multi, hidden, category, tags, providerCategory, count, displayID, refill, cancel, dripfeed, stype, targeting, quality, stability}
			} else {
				log.Printf("DEBUG: Scan error: %v", err)
			}
		}
		log.Printf("DEBUG: Loaded %d overrides from database", len(overrides))
	} else {
		log.Printf("DEBUG: Query overrides error: %v", err)
	}

	normalized := make([]NormalizedSmmService, 0)
	for _, raw := range rawServices {
		platform := detectPlatform(raw)
		serviceType := detectType(raw)

		variant := detectVariant(platform, raw)

		baseRatePer1000 := toNumber(raw.Rate)
		// Currency normalization: Internal representation is USD per 1000
		if s.cfg.SmmCurrency == "INR" && baseRatePer1000 > 0 {
			baseRatePer1000 = baseRatePer1000 / s.fx.GetUsdToInr()
		}
		ratePer1000 := baseRatePer1000

		// Apply Overrides
		displayName := ""
		displayDescription := ""
		category := raw.Category
		providerCategory := raw.Category
		purchaseCount := 0
		displayID := ""
		var tags []string = []string{}

		// Flag Overrides (pointers to allow tri-state: true/false/nil)
		var overrideRefill, overrideCancel, overrideDripfeed *bool

		if ov, ok := overrides[raw.Service.String()]; ok {
			if ov.IsHidden {
				continue
			}
			if ov.DisplayName != "" {
				displayName = ov.DisplayName
			}
			if ov.DisplayDesc != "" {
				displayDescription = ov.DisplayDesc
			}
			if ov.Multiplier > 0 {
				ratePer1000 = ratePer1000 * ov.Multiplier
			}
			if ov.Tags != nil {
				tags = ov.Tags
			}
			if ov.Category != "" {
				category = ov.Category
				// Update serviceType based on manual category if it's one of our known types
				lowCat := strings.ToLower(ov.Category)
				knownTypes := []string{"followers", "likes", "views", "comments", "shares", "votes", "saves"}
				for _, kt := range knownTypes {
					if lowCat == kt {
						serviceType = kt
						break
					}
				}
			}
			if ov.ProviderCategory != "" {
				providerCategory = ov.ProviderCategory
			}
			purchaseCount = ov.PurchaseCount
			displayID = ov.DisplayID

			// New overrides
			if ov.Refill != nil {
				overrideRefill = ov.Refill
			}
			if ov.Cancel != nil {
				overrideCancel = ov.Cancel
			}
			if ov.Dripfeed != nil {
				overrideDripfeed = ov.Dripfeed
			}
			if ov.ServiceType != nil && *ov.ServiceType != "" && *ov.ServiceType != "default" {
				serviceType = *ov.ServiceType
			}
		}

		// Metadata extraction logic (from overrides)
		var targeting, quality, stability string
		if ov, ok := overrides[raw.Service.String()]; ok {
			if ov.Targeting != nil {
				targeting = *ov.Targeting
			}
			if ov.Quality != nil {
				quality = *ov.Quality
			}
			if ov.Stability != nil {
				stability = *ov.Stability
			}
		}

		if platform == "" && category != "" {
			// Fallback: If detection failed but manual category exists, try to guess platform
			lowCat := strings.ToLower(category)
			if strings.Contains(lowCat, "instagram") {
				platform = "instagram"
			} else if strings.Contains(lowCat, "youtube") {
				platform = "youtube"
			} else if strings.Contains(lowCat, "facebook") {
				platform = "facebook"
			} else if strings.Contains(lowCat, "tiktok") {
				platform = "tiktok"
			} else if strings.Contains(lowCat, "telegram") {
				platform = "telegram"
			} else if strings.Contains(lowCat, "twitter") || strings.Contains(lowCat, " x ") {
				platform = "x"
			}
		}

		// If still check passes
		if platform == "" {
			continue
		}

		if serviceType == "" {
			// Fallback detection from manual category or overridden name
			lowHay := strings.ToLower(category + " " + raw.Name)
			if strings.Contains(lowHay, "follower") {
				serviceType = "followers"
			} else if strings.Contains(lowHay, "like") {
				serviceType = "likes"
			} else if strings.Contains(lowHay, "view") {
				serviceType = "views"
			} else if strings.Contains(lowHay, "comment") {
				serviceType = "comments"
			} else if strings.Contains(lowHay, "share") {
				serviceType = "shares"
			}
		}

		if serviceType == "" {
			continue
		}

		// Finalize Boolean Flags
		finalRefill := toBool(raw.Refill)
		if overrideRefill != nil {
			finalRefill = *overrideRefill
		}

		finalCancel := toBool(raw.Cancel)
		if overrideCancel != nil {
			finalCancel = *overrideCancel
		}

		finalDripfeed := toBool(raw.Dripfeed)
		if overrideDripfeed != nil {
			finalDripfeed = *overrideDripfeed
		}

		n := NormalizedSmmService{
			ID:                  fmt.Sprintf("%s:%s", "topsmm", raw.Service.String()),
			Source:              "topsmm",
			SourceServiceID:     raw.Service.String(),
			Platform:            platform,
			ServiceType:         serviceType,
			Variant:             variant,
			ProviderName:        raw.Name,
			Description:         raw.Description, // Always original
			Category:            category,
			ProviderCategory:    providerCategory,
			DisplayName:         displayName,
			DisplayDescription:  displayDescription,
			BaseRatePer1000:     baseRatePer1000,
			RatePer1000:         ratePer1000,
			ProviderCurrency:    s.cfg.SmmCurrency,
			Min:                 int(toNumber(raw.Min)),
			Max:                 int(toNumber(raw.Max)),
			Refill:              finalRefill,
			Dripfeed:            finalDripfeed,
			Cancel:              finalCancel,
			Tags:                tags,
			RawProviderCategory: raw.Category,
			PurchaseCount:       purchaseCount,
			DisplayID:           displayID,
			Raw:                 raw,
			Targeting:           targeting,
			Quality:             quality,
			Stability:           stability,
		}

		avgTime := int(toNumber(raw.AverageTime))
		if avgTime > 0 {
			n.AverageTime = &avgTime
		}

		normalized = append(normalized, n)
	}

	s.cache = normalized
	s.lastUpdate = time.Now()

	return normalized, nil
}

func detectPlatform(s PanelV2Service) string {
	hay := strings.ToLower(s.Category + " " + s.Name)
	platforms := []string{"instagram", "facebook", "x", "telegram", "tiktok", "youtube"}
	for _, p := range platforms {
		if platformRegex[p].MatchString(hay) {
			return p
		}
	}
	return ""
}

func detectType(s PanelV2Service) string {
	hay := strings.ToLower(s.Category + " " + s.Name)
	if hardExcludeRx.MatchString(hay) {
		return ""
	}

	best := ""
	bestScore := 0
	catHay := strings.ToLower(s.Category)

	types := []string{"comments", "likes", "followers", "views", "shares", "votes", "saves"}
	for _, t := range types {
		score := countMatches(typeRegex[t], hay)*2 + countMatches(typeRegex[t], catHay)*10
		if score > bestScore {
			best = t
			bestScore = score
		}
	}

	if bestScore > 0 {
		return best
	}
	return ""
}

func detectVariant(platform string, s PanelV2Service) string {
	hay := strings.ToLower(s.Category + " " + s.Name)
	if variants, ok := variantRegex[platform]; ok {
		for _, v := range variants {
			if v.rx.MatchString(hay) {
				return v.variant
			}
		}
	}
	return "any"
}

func countMatches(rx *regexp.Regexp, text string) int {
	return len(rx.FindAllString(text, -1))
}

func toNumber(n json.Number) float64 {
	if n == "" {
		return 0
	}
	f, err := n.Float64()
	if err != nil {
		// Try cleaning it
		s := regexp.MustCompile("[^0-9.]").ReplaceAllString(n.String(), "")
		f, _ = strconv.ParseFloat(s, 64)
	}
	return f
}

func toBool(v interface{}) bool {
	if v == nil {
		return false
	}
	switch val := v.(type) {
	case bool:
		return val
	case string:
		const s = "1trueyesavailable"
		lower := strings.ToLower(val)
		if strings.Contains(s, lower) {
			return true
		}
	case float64:
		return val == 1
	case int:
		return val == 1
	case json.Number:
		return val.String() == "1"
	}
	return false
}

func (s *ProviderService) PlaceOrder(serviceID, quantity, link string) (map[string]interface{}, error) {
	formData := url.Values{}
	formData.Set("key", s.cfg.SMMAPIKey)
	formData.Set("action", "add")
	formData.Set("service", serviceID)
	formData.Set("quantity", quantity)
	formData.Set("link", link)

	resp, err := http.PostForm(s.cfg.SMMAPIURL, formData)
	if err != nil {
		return nil, fmt.Errorf("failed to place order: %v", err)
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode order response: %v", err)
	}

	return result, nil
}

// GetOrderStatus fetches the status of multiple orders
func (s *ProviderService) GetOrderStatus(orderIDs []string) (map[string]interface{}, error) {
	formData := url.Values{}
	formData.Set("key", s.cfg.SMMAPIKey)
	formData.Set("action", "status")
	formData.Set("orders", strings.Join(orderIDs, ","))

	resp, err := http.PostForm(s.cfg.SMMAPIURL, formData)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch order status: %v", err)
	}
	defer resp.Body.Close()

	// Response is usually a map of orderID -> status object
	// Or sometimes a list if single order.
	// But standard API V2 for "orders" param returns an object where keys are order IDs.
	// Let's assume standard JAP/SmartPanel response.

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode status response: %v", err)
	}

	return result, nil
}

// CancelOrder attempts to cancel an order on the provider side
func (s *ProviderService) CancelOrder(orderID string) (map[string]interface{}, error) {
	formData := url.Values{}
	formData.Set("key", s.cfg.SMMAPIKey)
	formData.Set("action", "cancel")
	formData.Set("order", orderID)

	resp, err := http.PostForm(s.cfg.SMMAPIURL, formData)
	if err != nil {
		return nil, fmt.Errorf("failed to cancel order: %v", err)
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode cancel response: %v", err)
	}

	return result, nil
}
