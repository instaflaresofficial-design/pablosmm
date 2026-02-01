package server

import (
	"log"
	"net/http"

	"pablosmm/backend/internal/config"
	"pablosmm/backend/internal/db"
	"pablosmm/backend/internal/handlers"
	"pablosmm/backend/internal/service/fx"
	"pablosmm/backend/internal/service/metadata"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func New(cfg *config.Config) *http.Server {
	database, err := db.New(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	fxSvc := fx.New(cfg.UsdToInr)
	metaSvc := metadata.New()
	h := handlers.New(database, cfg, fxSvc, metaSvc)

	r := chi.NewRouter()

	// Basic middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "https://pablosmm-one.vercel.app"}, // Required for cookies
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "x-user-email"},
		AllowCredentials: true,
	}))

	// API Routes
	r.Route("/api", func(r chi.Router) {
		// Init Auth (runtime check)
		handlers.InitAuth()

		// Public Auth
		r.Post("/auth/register", h.Register)
		r.Post("/auth/login", h.Login)
		r.Post("/auth/logout", h.Logout)
		r.Get("/auth/google/login", h.GoogleLogin)
		r.Get("/auth/google/callback", h.GoogleCallback)

		// Protected Auth
		r.Group(func(r chi.Router) {
			r.Use(h.AuthMiddleware)
			r.Get("/auth/me", h.Me)
			r.Post("/wallet/deposit", h.RequestDeposit)
			r.Get("/orders", h.GetOrders)
			r.Post("/orders/{id}/cancel", h.CancelOrder)
			r.Post("/orders", h.CreateOrder)
		})

		r.Get("/services", h.GetServices)
		r.Get("/profile", h.GetProfile)
		r.Get("/fx", h.GetFX)
		r.Get("/metadata", h.GetMetadata)
		r.Post("/admin/services/override", h.UpdateServiceOverride)
		r.Post("/admin/services/bulk-override", h.BulkUpdateServiceOverrides)
		r.Post("/admin/services/ai-rewrite", h.AIRewriteService)

		// Admin User Management
		r.Get("/admin/users", h.GetUsers)
		r.Get("/admin/users/{id}", h.GetUser)
		r.Post("/admin/users/{id}/wallet", h.UpdateUserWallet)
		r.Patch("/admin/users/{id}", h.UpdateUser)

		// Admin Orders
		r.Get("/admin/orders", h.GetAdminOrders)
		r.Post("/admin/orders/{id}/refund", h.RefundOrder)

		// Admin Wallet Requests
		r.Get("/admin/wallet-requests", h.ListWalletRequests)
		r.Post("/admin/wallet-requests/{id}/approve", h.ApproveWalletRequest)
		r.Post("/admin/wallet-requests/{id}/reject", h.RejectWalletRequest)
	})

	return &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}
}
