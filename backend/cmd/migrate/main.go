package main

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load(".env")
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL not set")
	}

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatal(err)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	ctx := context.Background()

	// Step 9: Auth Schema
	log.Println("Applying Auth Schema migrations...")
	queries := []string{
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR(20)",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT",
		`CREATE TABLE IF NOT EXISTS transactions (
			id SERIAL PRIMARY KEY,
			user_id INT REFERENCES users(id) ON DELETE CASCADE,
			amount DECIMAL(15, 2) NOT NULL,
			type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit')),
			description TEXT,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)`,
		"CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)",
		"CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
	}

	for _, q := range queries {
		_, err = pool.Exec(ctx, q)
		if err != nil {
			log.Fatalf("Failed to execute query: %s\nError: %v", q, err)
		}
	}

	// Step 10: Wallet Requests
	log.Println("Applying Wallet Requests migrations...")
	queries = []string{
		`CREATE TABLE IF NOT EXISTS wallet_requests (
            id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(id) ON DELETE CASCADE,
            amount DECIMAL(15, 2) NOT NULL,
            method VARCHAR(50) NOT NULL,
            transaction_id VARCHAR(255) UNIQUE NOT NULL,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`,
		"CREATE INDEX IF NOT EXISTS idx_wallet_requests_user_id ON wallet_requests(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_wallet_requests_status ON wallet_requests(status)",
	}

	for _, q := range queries {
		_, err = pool.Exec(ctx, q)
		if err != nil {
			log.Fatalf("Failed to execute query: %s\nError: %v", q, err)
		}
	}

	// Step 11: Order Sync Columns
	log.Println("Applying Order Sync migrations...")
	queries = []string{
		"ALTER TABLE orders ADD COLUMN IF NOT EXISTS remains INTEGER DEFAULT 0",
		"ALTER TABLE orders ADD COLUMN IF NOT EXISTS start_count INTEGER DEFAULT 0",
		"ALTER TABLE orders ADD COLUMN IF NOT EXISTS link TEXT",
		"ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()",
	}

	for _, q := range queries {
		_, err = pool.Exec(ctx, q)
		if err != nil {
			log.Fatalf("Failed to execute query: %s\nError: %v", q, err)
		}
	}

	log.Println("Migration applied successfully!")
}
