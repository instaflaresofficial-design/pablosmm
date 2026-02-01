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
	godotenv.Load(".env")
	dbURL := os.Getenv("DATABASE_URL")

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	var resp []byte
	err = pool.QueryRow(context.Background(), "SELECT provider_resp FROM orders WHERE id=1").Scan(&resp)
	if err != nil {
		log.Printf("Error: %v", err)
	} else {
		fmt.Printf("Order 1 Provider Resp: %s\n", string(resp))
	}
}
