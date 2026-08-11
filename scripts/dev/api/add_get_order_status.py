import re
import io

file_path = r"d:\Works\pablosmm\apps\api\internal\service\smm\smm.go"
with io.open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

get_order_status = """func (s *ProviderService) GetOrderStatus(providerKey string, orderIDs []string) (map[string]interface{}, error) {
	apiURL, apiKey, err := s.getProviderCreds(providerKey)
	if err != nil {
		return nil, err
	}

	formData := url.Values{}
	formData.Set("key", apiKey)
	formData.Set("action", "status")
	formData.Set("orders", strings.Join(orderIDs, ","))

	resp, err := http.PostForm(apiURL, formData)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch order status: %v", err)
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode status response: %v", err)
	}

	return result, nil
}
"""

if "func (s *ProviderService) GetOrderStatus" not in content:
    content += "\n" + get_order_status

with io.open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
