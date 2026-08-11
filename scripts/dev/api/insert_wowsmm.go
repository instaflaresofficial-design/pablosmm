package main

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load(".env")
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}
	defer conn.Close(context.Background())

	apiKey := os.Getenv("WOWSMM_API_KEY")
	if apiKey == "" {
		apiKey = "YOUR_WOWSMM_API_KEY"
	}

	_, err = conn.Exec(context.Background(), `
		INSERT INTO smm_providers (key, name, api_url, api_key, currency, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (key) DO UPDATE SET 
			name = EXCLUDED.name,
			api_url = EXCLUDED.api_url,
			api_key = EXCLUDED.api_key,
			currency = EXCLUDED.currency
	`, "wowsmm", "WowSMM", "https://wowsmmpanel.com/api/v2", apiKey, "USD", true)

	if err != nil {
		log.Fatalf("failed to insert: %v", err)
	}

	log.Println("WowSMM inserted successfully!")
}
