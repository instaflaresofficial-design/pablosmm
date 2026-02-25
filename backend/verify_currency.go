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

	fmt.Println("Connecting to database...")
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer pool.Close()

	// Check if currency column exists
	var exists bool
	err = pool.QueryRow(context.Background(), `
		SELECT EXISTS (
			SELECT FROM information_schema.columns 
			WHERE table_name = 'users' 
			AND column_name = 'currency'
		);
	`).Scan(&exists)

	if err != nil {
		log.Fatalf("Query failed: %v\n", err)
	}

	if exists {
		fmt.Println("✅ Currency column EXISTS in users table")

		// Get a sample user to verify
		var count int
		err = pool.QueryRow(context.Background(), "SELECT COUNT(*) FROM users").Scan(&count)
		if err != nil {
			log.Printf("Could not count users: %v\n", err)
		} else {
			fmt.Printf("📊 Total users in database: %d\n", count)
		}
	} else {
		fmt.Println("❌ Currency column DOES NOT EXIST in users table")
		fmt.Println("Running migration now...")

		_, err = pool.Exec(context.Background(), `ALTER TABLE users ADD COLUMN currency VARCHAR(10) DEFAULT 'USD';`)
		if err != nil {
			log.Fatalf("Migration failed: %v\n", err)
		}

		fmt.Println("✅ Currency column added successfully!")
	}
}
