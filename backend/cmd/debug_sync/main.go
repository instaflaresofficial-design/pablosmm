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

	rows, err := pool.Query(context.Background(), "SELECT id, provider_order_id, status, created_at FROM orders WHERE id=3")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var id int
		var pID *string
		var status string
		var createdAt interface{}
		rows.Scan(&id, &pID, &status, &createdAt)

		valPID := "NULL"
		if pID != nil {
			valPID = *pID
		}
		fmt.Printf("ID: %d | PID: %s | Status: %s | Created: %v\n", id, valPID, status, createdAt)
	}
}
