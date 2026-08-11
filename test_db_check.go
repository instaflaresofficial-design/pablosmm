package main
import (
	"context"
	"fmt"
	"log"
	"github.com/jackc/pgx/v5/pgxpool"
)
func main() {
	pool, err := pgxpool.New(context.Background(), "postgres://postgres:postgres@localhost:5432/pablosmm_db?sslmode=disable")
	if err != nil {
		log.Fatal(err)
	}
	rows, err := pool.Query(context.Background(), "SELECT source_service_id, is_hidden, tags FROM service_overrides WHERE source_service_id LIKE '%4200%'")
	if err != nil {
		log.Fatal(err)
	}
	for rows.Next() {
		var id string
		var hidden bool
		var tags []string
		rows.Scan(&id, &hidden, &tags)
		fmt.Printf("ID: %s, Hidden: %v, Tags: %v\n", id, hidden, tags)
	}
}
