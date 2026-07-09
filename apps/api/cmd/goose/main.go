package main

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	"github.com/pressly/goose/v3"
)

func main() {
	_ = godotenv.Load(".env")
	
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}

	goose.SetBaseFS(nil)

	if err := goose.SetDialect("postgres"); err != nil {
		log.Fatalf("failed to set goose dialect: %v", err)
	}

	command := "up"
	args := []string{}

	if len(os.Args) > 1 {
		command = os.Args[1]
		args = os.Args[2:]
	}

	dir := "./sql/schema"

	if err := goose.Run(command, db, dir, args...); err != nil {
		log.Fatalf("goose %v: %v", command, err)
	}

	log.Printf("goose %v completed successfully", command)
}
