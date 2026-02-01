package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL not set")
	}

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer pool.Close()

	// Run migration
	sql := `
		ALTER TABLE service_overrides 
		ADD COLUMN IF NOT EXISTS refill BOOLEAN DEFAULT NULL,
		ADD COLUMN IF NOT EXISTS cancel BOOLEAN DEFAULT NULL,
		ADD COLUMN IF NOT EXISTS dripfeed BOOLEAN DEFAULT NULL,
		ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT NULL;
	`

	_, err = pool.Exec(context.Background(), sql)
	if err != nil {
		log.Fatalf("Migration failed: %v\n", err)
	}

	fmt.Println("✅ Migration completed successfully!")
	fmt.Println("Added columns: refill, cancel, dripfeed, service_type")
}
