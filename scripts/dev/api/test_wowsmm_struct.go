package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
)

func main() {
	formData := url.Values{}
	formData.Set("key", "YOUR_WOWSMM_API_KEY")
	formData.Add("action", "services")

	resp, err := http.PostForm("https://wowsmmpanel.com/api/v2", formData)
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()
	
	body, _ := io.ReadAll(resp.Body)
	
	type PanelV2Service struct {
		Service         interface{} `json:"service"`
		Name            string      `json:"name"`
		Type            string      `json:"type"`
		Category        string      `json:"category"`
		Rate            json.Number `json:"rate"`
		Min             interface{} `json:"min"`
		Max             interface{} `json:"max"`
		Dripfeed        bool        `json:"dripfeed"`
		Refill          bool        `json:"refill"`
		Cancel          bool        `json:"cancel"`
		AverageTime     interface{} `json:"average_time"`
		AverageTimeOld  interface{} `json:"averageTime"`
		Description     string      `json:"description"`
		Desc            string      `json:"desc"`
	}

	var rawServices []PanelV2Service
	if err := json.Unmarshal(body, &rawServices); err != nil {
		log.Fatal("JSON error:", err, "Body:", string(body)[:100])
	}
	
	if len(rawServices) > 0 {
		first := rawServices[0]
		fmt.Printf("Parsed First Service:\nService: %v\nRate: %v\n", first.Service, first.Rate)
		
		out, _ := json.Marshal(first)
		fmt.Printf("Re-encoded: %s\n", string(out))
	}
}
