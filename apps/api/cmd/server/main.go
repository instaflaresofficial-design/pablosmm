package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"pablosmm/backend/internal/config"
	"pablosmm/backend/internal/db"
	"pablosmm/backend/internal/server"
	"pablosmm/backend/internal/service/fx"
	"pablosmm/backend/internal/service/smm"
	"pablosmm/backend/internal/service/syncer"

	"github.com/joho/godotenv"
)

func main() {
	log.Println("Starting server application...")
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	cfg := config.Load()

	// Initialize Database
	db, err := db.New(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Services
	fxService := fx.New(85.0) // Fallback rate
	smmService := smm.New(db, cfg, fxService)
	syncerService := syncer.New(db, smmService)

	// Start Background Tasks
	// FX updates every hour (handled internally in StartUpdateLoop, actually cache timeout is 5m in FX service)
	go fxService.StartUpdateLoop()
	// Order Sync updates every 2 minutes
	syncerService.Start(context.Background())

	srv := server.New(cfg)

	// Graceful shutdown setup
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("Starting server on %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Could not listen on %s: %v\n", cfg.Port, err)
		}
	}()

	<-stop

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exiting")
}
