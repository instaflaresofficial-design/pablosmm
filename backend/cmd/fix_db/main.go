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

	// Update Order 2 with found ID
	_, err = pool.Exec(context.Background(), "UPDATE orders SET provider_order_id = '504865' WHERE id = 2")
	if err != nil {
		log.Printf("Update Order 2 failed: %v", err)
	} else {
		log.Println("Order 2 provider_order_id updated to 504865")
	}

	// Update Order 1 to failed (since it actually failed at provider)
	_, err = pool.Exec(context.Background(), "UPDATE orders SET status = 'failed' WHERE id = 1")
	if err != nil {
		log.Printf("Update Order 1 failed: %v", err)
	} else {
		log.Println("Order 1 status updated to failed")
	}
}
