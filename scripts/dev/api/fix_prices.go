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

	rows, err := pool.Query(context.Background(), "SELECT id, name, provider_service_id, sell_price_inr FROM pablo_catalog LIMIT 5;")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var id int32
		var name string
		var srcID string
		var sell float64
		rows.Scan(&id, &name, &srcID, &sell)
		fmt.Printf("ID: %d, Name: %s, SrcID: %s, Sell: %f\n", id, name, srcID, sell)
	}

    fmt.Println("Fixing prices by dividing by 97.279...")
    _, err = pool.Exec(context.Background(), "UPDATE pablo_catalog SET sell_price_inr = sell_price_inr / 97.279")
    if err != nil {
        log.Fatal("Failed to update:", err)
    }
    fmt.Println("Successfully restored INR prices in pablo_catalog.")
}
