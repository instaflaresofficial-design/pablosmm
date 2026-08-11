package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"net/url"

	"pablosmm/backend/internal/provider"
	"pablosmm/backend/internal/service/smm"
)

type ProviderTarget struct {
	Key      string
	Name     string
	ApiUrl   string
	ApiKey   string
	Currency string
}

func (h *Handler) GetRawProviderServices(w http.ResponseWriter, r *http.Request) {
	var targets []ProviderTarget

	if dbProviders, err := h.db.Queries.GetActiveSmmProviders(context.Background()); err == nil && len(dbProviders) > 0 {
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
		// Fallback
		targets = append(targets, ProviderTarget{
			Key:      provider.DefaultKey,
			Name:     provider.DefaultName,
			ApiUrl:   h.cfg.SMMAPIURL,
			ApiKey:   h.cfg.SMMAPIKey,
			Currency: provider.DefaultCurrency,
		})
	}

	type RawWithProvider struct {
		smm.PanelV2Service
		ProviderKey string `json:"providerKey"`
	}

	var allRaw []RawWithProvider

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
			continue
		}

		var rawServices []smm.PanelV2Service
		if err := json.NewDecoder(resp.Body).Decode(&rawServices); err == nil {
			for _, raw := range rawServices {
				allRaw = append(allRaw, RawWithProvider{
					PanelV2Service: raw,
					ProviderKey:    target.Key,
				})
			}
		}
		resp.Body.Close()
	}

	json.NewEncoder(w).Encode(allRaw)
}
