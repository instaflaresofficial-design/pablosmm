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

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	// Update Order 3 with found ID and reset status to 'submitted' so syncer can update it to 'partial'
	_, err = pool.Exec(context.Background(), "UPDATE orders SET provider_order_id = '504885', status='submitted' WHERE id = 3")
	if err != nil {
		log.Printf("Update Order 3 failed: %v", err)
	} else {
		log.Println("Order 3 updated to 504885 and status reset to submitted")
	}
}
