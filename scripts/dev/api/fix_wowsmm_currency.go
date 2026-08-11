package main

import (
	"context"
	"fmt"
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

	_, err = conn.Exec(context.Background(), `UPDATE smm_providers SET currency = 'USD' WHERE key = 'wowsmm'`)
	if err != nil {
		log.Fatalf("failed to update: %v", err)
	}

	// Verify
	rows, _ := conn.Query(context.Background(), `SELECT key, name, currency FROM smm_providers ORDER BY key`)
	defer rows.Close()
	fmt.Println("Current providers:")
	for rows.Next() {
		var key, name, currency string
		rows.Scan(&key, &name, &currency)
		fmt.Printf("  %s | %s | %s\n", key, name, currency)
	}
	log.Println("Done!")
}
