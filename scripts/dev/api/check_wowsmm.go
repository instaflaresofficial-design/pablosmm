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

	rows, err := pool.Query(context.Background(), "SELECT api_url, api_key FROM smm_providers WHERE key = 'wowsmm';")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var url, key string
		rows.Scan(&url, &key)
		fmt.Printf("URL: %s\nKEY: %s\n", url, key)
	}
}
