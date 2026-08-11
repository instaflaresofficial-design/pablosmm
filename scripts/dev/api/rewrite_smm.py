import io

file_path = r"d:\Works\pablosmm\apps\api\internal\service\smm\smm.go"
with io.open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update FetchServices logic
fetch_start = "// Fetch overrides from DB"
fetch_end = "return normalized, nil\n}"
fetch_idx_start = content.find(fetch_start)
fetch_idx_end = content.find(fetch_end) + len(fetch_end)

new_fetch = """	// Build live provider map
	liveData := make(map[string]PanelV2Service)
	for _, batch := range allFetched {
		providerKey := batch.Provider.Key
		for _, raw := range batch.Services {
			fullSID := fmt.Sprintf("%s:%s", providerKey, raw.Service.String())
			liveData[fullSID] = raw
		}
	}

	// Fetch Catalog from DB
	catalog, err := s.db.Queries.GetActiveCatalogServices(context.Background())
	if err != nil {
		log.Printf("ERROR: Query pablo_catalog failed: %v", err)
	}

	normalized := make([]NormalizedSmmService, 0)
	for _, catSvc := range catalog {
		providerKey := ""
		if catSvc.ProviderID.Valid {
			providerKey = catSvc.ProviderID.String
		}
		providerServiceID := ""
		if catSvc.ProviderServiceID.Valid {
			providerServiceID = catSvc.ProviderServiceID.String
		}

		fullSID := fmt.Sprintf("%s:%s", providerKey, providerServiceID)
		
		raw, hasLive := liveData[fullSID]
		
		minVal := 50
		maxVal := 10000
		refill := false
		cancel := false
		dripfeed := false
		desc := ""
		providerCategory := ""
		
		if hasLive {
			minVal = int(toNumber(raw.Min))
			maxVal = int(toNumber(raw.Max))
			refill = toBool(raw.Refill)
			cancel = toBool(raw.Cancel)
			dripfeed = toBool(raw.Dripfeed)
			desc = raw.Description
			providerCategory = raw.Category
		}

		sellPrice, _ := catSvc.SellPriceInr.Float64Value()

		platform := ""
		if catSvc.Platform.Valid {
			platform = catSvc.Platform.String
		}
		category := ""
		if catSvc.Category.Valid {
			category = catSvc.Category.String
		}
		variant := ""
		if catSvc.VariantName.Valid {
			variant = catSvc.VariantName.String
		}

		n := NormalizedSmmService{
			ID:                           fmt.Sprintf("%d", catSvc.ID), // PabloSMM Catalog ID
			Source:                       providerKey,
			SourceServiceID:              providerServiceID,
			Platform:                     platform,
			ServiceType:                  category,
			Variant:                      variant,
			Name:                         catSvc.Name,
			ProviderName:                 catSvc.Name,
			Description:                  desc,
			Category:                     category,
			ProviderCategory:             providerCategory,
			DisplayName:                  catSvc.Name,
			DisplayDescription:           desc,
			BaseRatePer1000:              0, 
			RatePer1000:                  sellPrice.Float64 * 1000.0, 
			OriginalMultiplier:           1.0,
			ProviderCurrency:             "INR",
			Min:                          minVal,
			Max:                          maxVal,
			Refill:                       refill,
			Dripfeed:                     dripfeed,
			Cancel:                       cancel,
			Tags:                         []string{}, 
			RawProviderCategory:          providerCategory,
			PurchaseCount:                0,
			DisplayID:                    fmt.Sprintf("%04d", catSvc.ID),
			Raw:                          raw,
			Targeting:                    "",
			Quality:                      "",
			Stability:                    "",
			RefillLimit:                  func() int { if refill { return 3 }; return 0 }(),
			IsHidden:                     !catSvc.IsActive.Bool,
			Status:                       func() string { if !catSvc.IsActive.Bool { return "hidden" } else { return "active" } }(),
			CustomInputRequired:          false,
			CustomInputLabel:             "",
			HasPendingProviderSubmission: false,
			PendingProviderStatus:        "",
			ProposedStatus:               "",
			ProposedMin:                  0,
			ProposedMax:                  0,
			ProposedRefillTag:            "",
			ProposedQuality:              "",
			ProposedCancel:               nil,
		}

		if hasLive {
			avgTime := int(toNumber(raw.AverageTime))
			if avgTime > 0 {
				n.AverageTime = &avgTime
			}
		}

		normalized = append(normalized, n)
	}

	s.cache = normalized
	s.lastUpdate = time.Now()

	return normalized, nil
}"""

content = content[:fetch_idx_start] + new_fetch + content[fetch_idx_end:]

# 2. Update PlaceOrder, CancelOrder, RefillOrder to take ProviderKey and fetch dynamic URL/Key
start_place = "func (s *ProviderService) PlaceOrder(serviceID, quantity, link string) (map[string]interface{}, error) {"
end_place = content.find(start_place)

place_block = """
func (s *ProviderService) getProviderCreds(providerKey string) (string, string, error) {
	if providerKey == "" || providerKey == "topsmm" {
		return s.cfg.SMMAPIURL, s.cfg.SMMAPIKey, nil
	}
	dbProviders, err := s.db.Queries.GetActiveSmmProviders(context.Background())
	if err == nil {
		for _, p := range dbProviders {
			if p.Key == providerKey {
				return p.ApiUrl, p.ApiKey, nil
			}
		}
	}
	return s.cfg.SMMAPIURL, s.cfg.SMMAPIKey, nil
}

func (s *ProviderService) PlaceOrder(providerKey, serviceID, quantity, link string) (map[string]interface{}, error) {
	apiURL, apiKey, err := s.getProviderCreds(providerKey)
	if err != nil {
		return nil, err
	}

	formData := url.Values{}
	formData.Set("key", apiKey)
	formData.Set("action", "add")
	formData.Set("service", serviceID)
	formData.Set("link", link)
	formData.Set("quantity", quantity)

	resp, err := http.PostForm(apiURL, formData)
	if err != nil {
		return nil, fmt.Errorf("failed to place order: %v", err)
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode SMM response: %v", err)
	}

	if errorMsg, ok := result["error"].(string); ok {
		return nil, fmt.Errorf("SMM Provider Error: %s", errorMsg)
	}

	return result, nil
}

func (s *ProviderService) CancelOrder(providerKey, orderID string) (map[string]interface{}, error) {
	apiURL, apiKey, err := s.getProviderCreds(providerKey)
	if err != nil {
		return nil, err
	}
	
	formData := url.Values{}
	formData.Set("key", apiKey)
	formData.Set("action", "cancel")
	formData.Set("order", orderID)

	resp, err := http.PostForm(apiURL, formData)
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

func (s *ProviderService) RefillOrder(providerKey, orderID string) (map[string]interface{}, error) {
	apiURL, apiKey, err := s.getProviderCreds(providerKey)
	if err != nil {
		return nil, err
	}
	
	formData := url.Values{}
	formData.Set("key", apiKey)
	formData.Set("action", "refill")
	formData.Set("order", orderID)

	resp, err := http.PostForm(apiURL, formData)
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
"""

content = content[:end_place] + place_block

with io.open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
