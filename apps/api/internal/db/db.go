package db

import (
	"context"
	"fmt"
	"log"

	"pablosmm/backend/internal/config"
	"pablosmm/backend/internal/db/sqlc"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	Pool    *pgxpool.Pool
	Queries *sqlc.Queries
}

func New(cfg *config.Config) (*DB, error) {
	ctx := context.Background()
	
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %v", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("unable to ping database: %v", err)
	}

	log.Println("Successfully connected to PostgreSQL")
	
	queries := sqlc.New(pool)

	return &DB{Pool: pool, Queries: queries}, nil
}

func (db *DB) Close() {
	db.Pool.Close()
}
