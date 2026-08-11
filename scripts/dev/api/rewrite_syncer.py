import io

file_path = r"d:\Works\pablosmm\apps\api\internal\service\syncer\syncer.go"
with io.open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

import re

# Find where rows are looped
start_marker = "var orderIDs []string"
end_marker = "// 3. Update DB"
start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

new_code = """	// provider_key -> []orderIDs
	providerGroups := make(map[string][]string)
	orderMap := make(map[string]int) // providerID -> localID

	for _, row := range rows {
		providerKey := row.ProviderKey
		if providerKey == "" {
			providerKey = "topsmm" // default fallback
		}
		providerGroups[providerKey] = append(providerGroups[providerKey], row.ProviderOrderID.String)
		orderMap[row.ProviderOrderID.String] = int(row.ID)
	}

	if len(orderMap) == 0 {
		log.Println("No orders found to sync.")
		return
	}
	log.Printf("Syncing %d orders across %d providers", len(orderMap), len(providerGroups))

	statusData := make(map[string]interface{})

	// 2. Fetch from Providers
	for providerKey, orderIDs := range providerGroups {
		providerStatus, err := s.smm.GetOrderStatus(providerKey, orderIDs)
		if err != nil {
			log.Printf("Sync provider error for %s: %v", providerKey, err)
			continue
		}
		log.Printf("Provider %s returned status for %d orders", providerKey, len(providerStatus))
		
		for k, v := range providerStatus {
			statusData[k] = v
		}
	}

	"""

content = content[:start_idx] + new_code + content[end_idx:]

with io.open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
