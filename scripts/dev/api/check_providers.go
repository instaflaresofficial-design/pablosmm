package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("No .env file found")
	}
	dburl := os.Getenv("DATABASE_URL")
	pool, err := pgxpool.New(context.Background(), dburl)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	rows, err := pool.Query(context.Background(), "SELECT key, api_url FROM smm_providers WHERE is_active = true;")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var key, url string
		rows.Scan(&key, &url)
		fmt.Printf("Provider: %s, URL: %s\n", key, url)
	}
}
