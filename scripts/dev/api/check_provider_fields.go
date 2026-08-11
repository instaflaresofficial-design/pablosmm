package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load(".env")
	conn, err := pgx.Connect(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close(context.Background())

	rows, _ := conn.Query(context.Background(), "SELECT key, name, api_url, api_key, currency FROM smm_providers WHERE is_active = true ORDER BY key")
	defer rows.Close()

	type Provider struct {
		Key     string
		Name    string
		ApiUrl  string
		ApiKey  string
		Currency string
	}

	var providers []Provider
	for rows.Next() {
		var p Provider
		rows.Scan(&p.Key, &p.Name, &p.ApiUrl, &p.ApiKey, &p.Currency)
		providers = append(providers, p)
		fmt.Printf("%-20s | %-15s | currency=%-5s\n", p.Key, p.Name, p.Currency)
	}

	fmt.Println("\n=== Checking each provider's actual API fields ===")
	for _, p := range providers {
		fmt.Printf("\n--- %s ---\n", p.Name)
		formData := url.Values{}
		formData.Set("key", p.ApiKey)
		formData.Set("action", "services")

		resp, err := http.PostForm(p.ApiUrl, formData)
		if err != nil {
			fmt.Printf("  ERROR: %v\n", err)
			continue
		}

		var services []map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&services); err != nil {
			fmt.Printf("  DECODE ERROR: %v\n", err)
			resp.Body.Close()
			continue
		}
		resp.Body.Close()

		if len(services) == 0 {
			fmt.Println("  No services returned")
			continue
		}

		// Show keys from first service
		first := services[0]
		keys := make([]string, 0)
		for k := range first {
			keys = append(keys, k)
		}
		fmt.Printf("  Fields: %v\n", keys)
		fmt.Printf("  First service rate: %v | min: %v | max: %v | name: %v\n",
			first["rate"], first["min"], first["max"], first["name"])
		if first["description"] != nil {
			fmt.Printf("  description: %v\n", first["description"])
		}
		if first["average_time"] != nil {
			fmt.Printf("  average_time: %v\n", first["average_time"])
		}
	}
}
