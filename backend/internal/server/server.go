package server

import (
	"log"
	"net/http"
	"strings"

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
		AllowOriginFunc: func(r *http.Request, origin string) bool {
			// Allow local development (localhost, 127.0.0.1)
			if origin == "http://localhost:3000" || origin == "http://127.0.0.1:3000" {
				log.Printf("✅ [CORS] Allowed localhost origin: %s", origin)
				return true
			}
			// Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
			if strings.HasPrefix(origin, "http://192.168.") || strings.HasPrefix(origin, "http://10.") || strings.HasPrefix(origin, "http://172.") {
				log.Printf("✅ [CORS] Allowed local network origin: %s", origin)
				return true
			}
			// Allow production domains
			if origin == "https://pablosmm.com" || origin == "https://www.pablosmm.com" || origin == "https://api.pablosmm.com" || strings.HasSuffix(origin, ".vercel.app") {
				log.Printf("✅ [CORS] Allowed production origin: %s", origin)
				return true
			}
			log.Printf("❌ [CORS] Rejected origin: %s", origin)
			return false
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "x-user-email"},
		AllowCredentials: true,
	}))

	// API Routes
	r.Route("/api", func(r chi.Router) {
		// Init Auth (runtime check)
		handlers.InitAuth()

		// Health check (no auth required)
		r.Get("/health", h.HealthCheck)
		r.Post("/webhooks/cryptomus", h.CryptomusWebhook)

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
			r.Post("/wallet/cryptomus/create", h.CreateCryptomusPayment)
			r.Get("/orders", h.GetOrders)
			r.Post("/orders/{id}/cancel", h.CancelOrder)
			r.Post("/orders", h.CreateOrder)
			r.Get("/orders/{id}", h.GetSingleOrder)
			r.Post("/auth/change-password", h.ChangePassword)
			r.Put("/profile", h.UpdateProfile) // Secure profile update
		})

		r.Get("/services", h.GetServices)
		r.Get("/profile", h.GetProfile)
		r.Get("/fx", h.GetFX)
		r.Get("/metadata", h.GetMetadata)
		r.Get("/admin/services/refresh", h.RefreshServices)
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
