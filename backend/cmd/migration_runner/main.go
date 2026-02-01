package main

import (
	"context"
	"log"
	"os"

	"pablosmm/backend/internal/config"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("No .env file found in ../../, checking current dir")
		if err := godotenv.Load(); err != nil {
			log.Println("No .env file found")
		}
	}

	cfg := config.Load()
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("Unable to ping database: %v", err)
	}
	log.Println("Connected to database")

	// Read migration file
	migrationFile := "../../internal/db/migrations/000003_add_category_to_overrides.up.sql"
	sqlBytes, err := os.ReadFile(migrationFile)
	if err != nil {
		// Try relative to where we might run it
		migrationFile = "internal/db/migrations/000003_add_category_to_overrides.up.sql"
		sqlBytes, err = os.ReadFile(migrationFile)
		if err != nil {
			log.Fatalf("Failed to read migration file: %v", err)
		}
	}

	sql := string(sqlBytes)
	log.Printf("Applying migration:\n%s\n", sql)

	_, err = pool.Exec(ctx, sql)
	if err != nil {
		log.Fatalf("Failed to execute migration: %v", err)
	}

	log.Println("Migration applied successfully!")
}
