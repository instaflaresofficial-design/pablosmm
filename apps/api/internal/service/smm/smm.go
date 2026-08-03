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
	Name                string      `json:"name"`
	ProviderName        string      `json:"providerName"`
	Description         string      `json:"description"`
	Category            string      `json:"category"`
	ProviderCategory    string      `json:"providerCategory"`
	RatePer1000         float64     `json:"ratePer1000"`
	BaseRatePer1000     float64     `json:"baseRatePer1000"`    // Raw cost from provider in USD
	OriginalMultiplier  float64     `json:"originalMultiplier"` // The raw rate_multiplier from the DB
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
	RefillLimit         int         `json:"refillLimit"`
	IsHidden                     bool        `json:"isHidden"`
	Status                       string      `json:"status"`
	CustomInputRequired          bool        `json:"customInputRequired"`
	CustomInputLabel             string      `json:"customInputLabel"`
	HasPendingProviderSubmission bool        `json:"hasPendingProviderSubmission"`
	PendingProviderStatus        string      `json:"pendingProviderStatus"`
	ProposedStatus               string      `json:"proposedStatus,omitempty"`
	ProposedMin                  int         `json:"proposedMin,omitempty"`
	ProposedMax                  int         `json:"proposedMax,omitempty"`
	ProposedRefillTag            string      `json:"proposedRefillTag,omitempty"`
	ProposedQuality              string      `json:"proposedQuality,omitempty"`
	ProposedCancel               *bool       `json:"proposedCancel,omitempty"`
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
		"likes":     regexp.MustCompile("(?i)\\blike(s)?\\b|\\bheart(s)?\\b"),
		"followers": regexp.MustCompile("(?i)\\bfollow(er)?(s)?\\b|\\bsubscriber(s)?\\b|\\bmember(s)?\\b"),
		"views":     regexp.MustCompile("(?i)\\bview(s)?\\b|\\bplay(s)?\\b|\\bwatch(es)?\\b|\\bimpression(s)?\\b|\\breach\\b"),
		"shares":    regexp.MustCompile("(?i)\\bshare(s)?\\b|\\bretweet(s)?\\b|\\bforward(s)?\\b"),
		"repost":    regexp.MustCompile("(?i)\\brepost(s)?\\b"),
		"votes":     regexp.MustCompile("(?i)\\bvote(s)?\\b|\\bpoll(s)?\\b|\\banswer(s)?\\b"),
		"saves":     regexp.MustCompile("(?i)\\bsave(s)?\\b|\\bbookmark(s)?\\b|\\bsaved\\b"),
		"reactions": regexp.MustCompile("(?i)\\breaction(s)?\\b|\\breact(s)?\\b|\\bemoji(s)?\\b"),
	}

	variantRegex = map[string][]struct {
		variant string
		rx      *regexp.Regexp
	}{
		"instagram": {
			{"custom", regexp.MustCompile("(?i)\\bcustom\\b")},
			{"random", regexp.MustCompile("(?i)\\brandom\\b")},
			{"comments", regexp.MustCompile("(?i)\\bcomment(s)?\\b")},
			{"reel", regexp.MustCompile("(?i)\\breel(s)?\\b")},
			{"story", regexp.MustCompile("(?i)\\bstory|stories|poll\\b")},
			{"igtv", regexp.MustCompile("(?i)\\bigtv\\b")},
			{"live", regexp.MustCompile("(?i)\\blive|livestream\\b")},
			{"video", regexp.MustCompile("(?i)\\bvideo\\b")},
			{"post", regexp.MustCompile("(?i)\\bpost|photo|image\\b")},
			{"channel", regexp.MustCompile("(?i)\\bchannel|broadcast\\b")},
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
	s.cache = nil
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

	type ProviderTarget struct {
		Key      string
		Name     string
		ApiUrl   string
		ApiKey   string
		Currency string
	}

	var targets []ProviderTarget

	if dbProviders, err := s.db.Queries.GetActiveSmmProviders(context.Background()); err == nil && len(dbProviders) > 0 {
		for _, p := range dbProviders {
			targets = append(targets, ProviderTarget{
				Key:      p.Key,
				Name:     p.Name,
				ApiUrl:   p.ApiUrl,
				ApiKey:   p.ApiKey,
				Currency: p.Currency,
			})
		}
	} else {
		// Fallback to default env provider if DB table is empty
		targets = append(targets, ProviderTarget{
			Key:      "topsmm",
			Name:     "TOPSMM",
			ApiUrl:   s.cfg.SMMAPIURL,
			ApiKey:   s.cfg.SMMAPIKey,
			Currency: s.cfg.SmmCurrency,
		})
	}

	type FetchedServiceList struct {
		Provider ProviderTarget
		Services []PanelV2Service
	}

	var allFetched []FetchedServiceList

	for _, target := range targets {
		if target.ApiUrl == "" || target.ApiKey == "" {
			continue
		}
		formData := url.Values{}
		formData.Set("key", target.ApiKey)
		formData.Add("action", "services")

		resp, err := http.PostForm(target.ApiUrl, formData)
		if err != nil {
			log.Printf("ERROR: failed to fetch services for provider %s: %v", target.Key, err)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			log.Printf("ERROR: provider %s returned status %d", target.Key, resp.StatusCode)
			continue
		}

		var rawServices []PanelV2Service
		if err := json.NewDecoder(resp.Body).Decode(&rawServices); err != nil {
			resp.Body.Close()
			log.Printf("ERROR: failed to decode services for provider %s: %v", target.Key, err)
			continue
		}
		resp.Body.Close()

		allFetched = append(allFetched, FetchedServiceList{
			Provider: target,
			Services: rawServices,
		})
	}

	// Fetch overrides from DB
	overrides := make(map[string]struct {
		DisplayName         string
		DisplayDesc         string
		Multiplier          float64
		IsHidden            bool
		Category            string
		Tags                []string
		ProviderCategory    string
		PurchaseCount       int
		DisplayID           string
		Refill              *bool
		Cancel              *bool
		Dripfeed            *bool
		ServiceType         *string
		Targeting           *string
		Quality             *string
		Stability           *string
		RefillLimit         int
		CustomInputRequired bool
		CustomInputLabel    string
	})

	rows, err := s.db.Queries.GetAllServiceOverrides(context.Background())
	if err != nil {
		log.Printf("ERROR: Query service_overrides failed: %v", err)
	} else {
		for _, row := range rows {
			displayName := ""
			if row.DisplayName.Valid {
				displayName = row.DisplayName.String
			}
			displayDesc := ""
			if row.DisplayDescription.Valid {
				displayDesc = row.DisplayDescription.String
			}
			category := ""
			if row.Category.Valid {
				category = row.Category.String
			}
			providerCategory := ""
			if row.ProviderCategory.Valid {
				providerCategory = row.ProviderCategory.String
			}
			displayID := ""
			if row.DisplayID.Valid {
				displayID = row.DisplayID.String
			}

			var refill, cancel, dripfeed *bool
			if row.Refill.Valid {
				b := row.Refill.Bool
				refill = &b
			}
			if row.Cancel.Valid {
				b := row.Cancel.Bool
				cancel = &b
			}
			if row.Dripfeed.Valid {
				b := row.Dripfeed.Bool
				dripfeed = &b
			}

			var stype, targeting, quality, stability *string
			if row.ServiceType.Valid {
				s := row.ServiceType.String
				stype = &s
			}
			if row.Targeting.Valid {
				s := row.Targeting.String
				targeting = &s
			}
			if row.Quality.Valid {
				s := row.Quality.String
				quality = &s
			}
			if row.Stability.Valid {
				s := row.Stability.String
				stability = &s
			}

			tags := row.Tags
			if tags == nil {
				tags = []string{}
			}

			customRequired := false
			if row.CustomInputRequired.Valid {
				customRequired = row.CustomInputRequired.Bool
			}
			customLabel := ""
			if row.CustomInputLabel.Valid {
				customLabel = row.CustomInputLabel.String
			}

			overrides[row.SourceServiceID] = struct {
				DisplayName         string
				DisplayDesc         string
				Multiplier          float64
				IsHidden            bool
				Category            string
				Tags                []string
				ProviderCategory    string
				PurchaseCount       int
				DisplayID           string
				Refill              *bool
				Cancel              *bool
				Dripfeed            *bool
				ServiceType         *string
				Targeting           *string
				Quality             *string
				Stability           *string
				RefillLimit         int
				CustomInputRequired bool
				CustomInputLabel    string
			}{
				displayName, displayDesc, row.RateMultiplier.Float64, row.IsHidden.Bool,
				category, tags, providerCategory, int(row.PurchaseCount.Int32), displayID,
				refill, cancel, dripfeed, stype, targeting, quality, stability, int(row.RefillLimit.Int32),
				customRequired, customLabel,
			}
		}
		log.Printf("DEBUG: Successfully loaded %d overrides from database", len(overrides))
	}

	normalized := make([]NormalizedSmmService, 0)
	for _, batch := range allFetched {
		providerKey := batch.Provider.Key

		for _, raw := range batch.Services {
			platform := detectPlatform(raw)
			serviceType := detectType(raw)
			variant := detectVariant(platform, raw)

			providerCurr := strings.ToUpper(batch.Provider.Currency)
			if providerCurr == "" || strings.ToLower(batch.Provider.Key) == "topsmm" || strings.Contains(strings.ToLower(batch.Provider.Name), "topsmm") {
				providerCurr = "INR"
			}

			baseRatePer1000 := toNumber(raw.Rate)
			if providerCurr == "INR" && baseRatePer1000 > 0 {
				baseRatePer1000 = baseRatePer1000 / s.fx.GetUsdToInr()
			}
			ratePer1000 := baseRatePer1000 * 1.0 // Default 1.0x multiplier
			originalMultiplier := 1.0

			// Overrides
			displayName := ""
			displayDescription := ""
			category := raw.Category
			providerCategory := raw.Category
			purchaseCount := 0
			displayID := ""
			var tags []string = []string{}
			var overrideRefill, overrideCancel, overrideDripfeed *bool
			isHidden := false
			customInputRequired := false
			customInputLabel := ""

			rawSID := raw.Service.String()
			fullSID := fmt.Sprintf("%s:%s", providerKey, rawSID)

			var ov struct {
				DisplayName         string
				DisplayDesc         string
				Multiplier          float64
				IsHidden            bool
				Category            string
				Tags                []string
				ProviderCategory    string
				PurchaseCount       int
				DisplayID           string
				Refill              *bool
				Cancel              *bool
				Dripfeed            *bool
				ServiceType         *string
				Targeting           *string
				Quality             *string
				Stability           *string
				RefillLimit         int
				CustomInputRequired bool
				CustomInputLabel    string
			}
			found := false

			if o, ok := overrides[fullSID]; ok {
				ov = o
				found = true
			} else if o, ok := overrides[rawSID]; ok {
				ov = o
				found = true
			}

			if found {
				isHidden = ov.IsHidden
				if ov.DisplayName != "" {
					displayName = ov.DisplayName
				}
				if ov.DisplayDesc != "" {
					displayDescription = ov.DisplayDesc
				}
				if ov.Multiplier > 0 {
					ratePer1000 = baseRatePer1000 * ov.Multiplier
					originalMultiplier = ov.Multiplier
				}
				if ov.Tags != nil {
					tags = ov.Tags
				}
				if ov.Category != "" {
					category = ov.Category
					lowCat := strings.ToLower(ov.Category)
					knownTypes := []string{"followers", "likes", "views", "comments", "shares", "repost", "votes", "saves", "reactions"}
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
				customInputRequired = ov.CustomInputRequired
				customInputLabel = ov.CustomInputLabel
			}

			// Metadata extraction logic (from overrides)
			var targeting, quality, stability string
			if ov.Targeting != nil {
				targeting = *ov.Targeting
			}
			if ov.Quality != nil {
				quality = *ov.Quality
			}
			if ov.Stability != nil {
				stability = *ov.Stability
			}

			if platform == "" && category != "" {
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

			if platform == "" {
				lowHay := strings.ToLower(raw.Category + " " + raw.Name)
				if strings.Contains(lowHay, "instagram") || strings.Contains(lowHay, "ig") {
					platform = "instagram"
				} else if strings.Contains(lowHay, "youtube") || strings.Contains(lowHay, "yt") {
					platform = "youtube"
				} else if strings.Contains(lowHay, "facebook") || strings.Contains(lowHay, "fb") {
					platform = "facebook"
				} else if strings.Contains(lowHay, "tiktok") || strings.Contains(lowHay, "tt") {
					platform = "tiktok"
				} else if strings.Contains(lowHay, "telegram") || strings.Contains(lowHay, "tg") {
					platform = "telegram"
				} else if strings.Contains(lowHay, "twitter") || strings.Contains(lowHay, " x ") {
					platform = "x"
				} else if strings.Contains(lowHay, "whatsapp") || strings.Contains(lowHay, "wa") {
					platform = "whatsapp"
				} else if strings.Contains(lowHay, "threads") {
					platform = "threads"
				} else {
					platform = "other"
				}
			}

			if serviceType == "" {
				lowHay := strings.ToLower(raw.Category + " " + raw.Name)
				if strings.Contains(lowHay, "follower") || strings.Contains(lowHay, "sub") || strings.Contains(lowHay, "member") {
					serviceType = "followers"
				} else if strings.Contains(lowHay, "like") || strings.Contains(lowHay, "favorite") {
					serviceType = "likes"
				} else if strings.Contains(lowHay, "view") || strings.Contains(lowHay, "watch") || strings.Contains(lowHay, "play") {
					serviceType = "views"
				} else if strings.Contains(lowHay, "comment") {
					serviceType = "comments"
				} else if strings.Contains(lowHay, "share") || strings.Contains(lowHay, "retweet") {
					serviceType = "shares"
				} else if strings.Contains(lowHay, "vote") || strings.Contains(lowHay, "poll") {
					serviceType = "votes"
				} else if strings.Contains(lowHay, "repost") {
					serviceType = "repost"
				} else if strings.Contains(lowHay, "react") || strings.Contains(lowHay, "emoji") {
					serviceType = "reactions"
				} else if strings.Contains(lowHay, "save") {
					serviceType = "saves"
				} else {
					serviceType = "other"
				}
			}

			if displayID == "" {
				serviceIDInt := 0
				fmt.Sscanf(raw.Service.String(), "%d", &serviceIDInt)
				displayID = fmt.Sprintf("%04d", (serviceIDInt*7919)%10000)
			}

			if category == raw.Category || category == "" {
				category = serviceType
			}

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

			minVal := int(toNumber(raw.Min))
			maxVal := int(toNumber(raw.Max))
			hasPending := false
			pendingStatus := ""
			proposedStatus := ""
			proposedMin := 0
			proposedMax := 0
			proposedRefillTag := ""
			proposedQuality := ""
			var proposedCancel *bool

			for _, tag := range tags {
				if strings.HasPrefix(tag, "min:") {
					if v, err := strconv.ParseInt(strings.TrimPrefix(tag, "min:"), 10, 64); err == nil && v > 0 {
						minVal = int(v)
					}
				} else if strings.HasPrefix(tag, "max:") {
					if v, err := strconv.ParseInt(strings.TrimPrefix(tag, "max:"), 10, 64); err == nil && v > 0 {
						maxVal = int(v)
					}
				} else if tag == "provider_pending:true" {
					hasPending = true
				} else if strings.HasPrefix(tag, "provider_status:") || strings.HasPrefix(tag, "proposed_status:") {
					pendingStatus = strings.TrimPrefix(strings.TrimPrefix(tag, "provider_status:"), "proposed_status:")
					proposedStatus = pendingStatus
				} else if strings.HasPrefix(tag, "proposed_min:") {
					if v, err := strconv.ParseInt(strings.TrimPrefix(tag, "proposed_min:"), 10, 64); err == nil && v > 0 {
						proposedMin = int(v)
					}
				} else if strings.HasPrefix(tag, "proposed_max:") {
					if v, err := strconv.ParseInt(strings.TrimPrefix(tag, "proposed_max:"), 10, 64); err == nil && v > 0 {
						proposedMax = int(v)
					}
				} else if strings.HasPrefix(tag, "proposed_refill:") {
					proposedRefillTag = strings.TrimPrefix(tag, "proposed_refill:")
				} else if strings.HasPrefix(tag, "proposed_quality:") {
					proposedQuality = strings.TrimPrefix(tag, "proposed_quality:")
				} else if strings.HasPrefix(tag, "proposed_cancel:") {
					b := strings.TrimPrefix(tag, "proposed_cancel:") == "true"
					proposedCancel = &b
				}
			}

			n := NormalizedSmmService{
				ID:                           fullSID,
				Source:                       providerKey,
				SourceServiceID:              raw.Service.String(),
				Platform:                     platform,
				ServiceType:                  serviceType,
				Variant:                      variant,
				Name:                         raw.Name,
				ProviderName:                 raw.Name,
				Description:                  raw.Description,
				Category:                     category,
				ProviderCategory:             providerCategory,
				DisplayName:                  displayName,
				DisplayDescription:           displayDescription,
				BaseRatePer1000:              baseRatePer1000,
				RatePer1000:                  ratePer1000,
				OriginalMultiplier:           originalMultiplier,
				ProviderCurrency:             batch.Provider.Currency,
				Min:                          minVal,
				Max:                          maxVal,
				Refill:                       finalRefill,
				Dripfeed:                     finalDripfeed,
				Cancel:                       finalCancel,
				Tags:                         tags,
				RawProviderCategory:          raw.Category,
				PurchaseCount:                purchaseCount,
				DisplayID:                    displayID,
				Raw:                          raw,
				Targeting:                    targeting,
				Quality:                      quality,
				Stability:                    stability,
				RefillLimit:                  func() int { if ov.RefillLimit > 0 { return ov.RefillLimit } else if finalRefill { return 3 }; return 0 }(),
				IsHidden:                     isHidden,
				Status:                       func() string { if isHidden { return "hidden" } else { return "active" } }(),
				CustomInputRequired:          customInputRequired,
				CustomInputLabel:             customInputLabel,
				HasPendingProviderSubmission: hasPending,
				PendingProviderStatus:        pendingStatus,
				ProposedStatus:               proposedStatus,
				ProposedMin:                  proposedMin,
				ProposedMax:                  proposedMax,
				ProposedRefillTag:            proposedRefillTag,
				ProposedQuality:              proposedQuality,
				ProposedCancel:               proposedCancel,
			}

			avgTime := int(toNumber(raw.AverageTime))
			if avgTime > 0 {
				n.AverageTime = &avgTime
			}

			normalized = append(normalized, n)
		}
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

// RefillOrder attempts to refill an order on the provider side
func (s *ProviderService) RefillOrder(orderID string) (map[string]interface{}, error) {
	formData := url.Values{}
	formData.Set("key", s.cfg.SMMAPIKey)
	formData.Set("action", "refill")
	formData.Set("order", orderID)

	resp, err := http.PostForm(s.cfg.SMMAPIURL, formData)
	if err != nil {
		return nil, fmt.Errorf("failed to refill order: %v", err)
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode refill response: %v", err)
	}

	return result, nil
}
