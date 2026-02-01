package fx

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"
)

type FXService struct {
	mu           sync.RWMutex
	usdToInr     float64
	lastUpdated  time.Time
	cacheTimeout time.Duration
	fallback     float64
}

func New(fallback float64) *FXService {
	return &FXService{
		fallback:     fallback,
		cacheTimeout: 5 * time.Minute,
	}
}

type erAPIResponse struct {
	Rates map[string]float64 `json:"rates"`
}

func (s *FXService) GetUsdToInr() float64 {
	s.mu.RLock()
	if time.Since(s.lastUpdated) < s.cacheTimeout && s.usdToInr > 0 {
		rate := s.usdToInr
		s.mu.RUnlock()
		return rate
	}
	s.mu.RUnlock()

	// Update cache
	rate := s.fetchRate()

	s.mu.Lock()
	s.usdToInr = rate
	s.lastUpdated = time.Now()
	s.mu.Unlock()

	return rate
}

func (s *FXService) fetchRate() float64 {
	client := &http.Client{Timeout: 5 * time.Second}

	// Primary source
	resp, err := client.Get("https://open.er-api.com/v6/latest/USD")
	if err == nil {
		defer resp.Body.Close()
		var apiResp erAPIResponse
		if err := json.NewDecoder(resp.Body).Decode(&apiResp); err == nil {
			if rate, ok := apiResp.Rates["INR"]; ok && rate > 0 {
				log.Printf("Fetched live FX rate: 1 USD = %.2f INR", rate)
				return rate
			}
		}
	} else {
		log.Printf("FX: primary source failed: %v", err)
	}

	// Double fallback (just use the previous value if it exists, otherwise the init fallback)
	s.mu.RLock()
	prev := s.usdToInr
	s.mu.RUnlock()
	if prev > 0 {
		return prev
	}

	return s.fallback
}

func (s *FXService) StartUpdateLoop() {
	ticker := time.NewTicker(s.cacheTimeout)
	for range ticker.C {
		rate := s.fetchRate()
		if rate > 0 {
			s.mu.Lock()
			s.usdToInr = rate
			s.lastUpdated = time.Now()
			s.mu.Unlock()
		}
	}
}
