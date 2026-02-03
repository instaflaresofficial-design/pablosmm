package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"pablosmm/backend/internal/config"
	"pablosmm/backend/internal/db"
	"pablosmm/backend/internal/service/fx"
	"pablosmm/backend/internal/service/metadata"
	"pablosmm/backend/internal/service/smm"
	"strconv"
	"time"
)

type Handler struct {
	db       *db.DB
	cfg      *config.Config
	smm      *smm.ProviderService
	fx       *fx.FXService
	metadata *metadata.Service
}

func New(database *db.DB, cfg *config.Config, fxSvc *fx.FXService, metaSvc *metadata.Service) *Handler {
	return &Handler{
		db:       database,
		cfg:      cfg,
		smm:      smm.New(database, cfg, fxSvc),
		fx:       fxSvc,
		metadata: metaSvc,
	}
}

func (h *Handler) GetServices(w http.ResponseWriter, r *http.Request) {
	services, err := h.smm.FetchServices()
	if err != nil {
		log.Printf("DEBUG: FetchServices error: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	log.Printf("DEBUG: GetServices returned %d services", len(services))

	json.NewEncoder(w).Encode(map[string]interface{}{
		"services": services,
	})
}

func (h *Handler) GetFX(w http.ResponseWriter, r *http.Request) {
	rate := h.fx.GetUsdToInr()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"usd_to_inr": rate,
	})
}

func (h *Handler) GetMetadata(w http.ResponseWriter, r *http.Request) {
	url := r.URL.Query().Get("url")
	if url == "" {
		http.Error(w, "URL is required", http.StatusBadRequest)
		return
	}

	data, err := h.metadata.Fetch(url)
	if err != nil {
		http.Error(w, "Failed to fetch metadata", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(data)
}

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	email := r.Header.Get("x-user-email")
	if email == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var user struct {
		ID    int    `json:"id"`
		Name  string `json:"name"`
		Email string `json:"email"`
		Role  string `json:"role"`
	}
	var wallet struct {
		Balance int `json:"balance"`
	}

	err := h.db.Pool.QueryRow(context.Background(),
		"SELECT u.id, u.name, u.email, u.role, w.balance FROM users u LEFT JOIN wallets w ON u.id = w.user_id WHERE u.email = $1",
		email).Scan(&user.ID, &user.Name, &user.Email, &user.Role, &wallet.Balance)

	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Fetch detailed order stats
	var stats struct {
		Active    int `json:"active"`
		Completed int `json:"completed"`
		Failed    int `json:"failed"`
	}

	// Active: pending, processing, submitted, in_progress, active
	// Completed: completed, partial
	// Failed: canceled, failed, refunded
	err = h.db.Pool.QueryRow(context.Background(), `
		SELECT 
			COUNT(*) FILTER (WHERE status IN ('pending', 'processing', 'submitted', 'in_progress', 'active')) as active_count,
			COUNT(*) FILTER (WHERE status IN ('completed', 'partial')) as completed_count,
			COUNT(*) FILTER (WHERE status IN ('canceled', 'failed', 'refunded')) as failed_count
		FROM orders 
		WHERE user_id = $1
	`, user.ID).Scan(&stats.Active, &stats.Completed, &stats.Failed)

	if err != nil {
		log.Printf("Failed to fetch order stats for user %d: %v", user.ID, err)
		// Don't fail the written response, just zero stats
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":    user.ID,
		"name":  user.Name,
		"email": user.Email,
		"role":  user.Role,
		"wallet": map[string]interface{}{
			"balance": wallet.Balance,
		},
		"stats": stats,
	})
}

func (h *Handler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ServiceID       string `json:"serviceId"`
		SourceServiceID string `json:"sourceServiceId"`
		Quantity        int    `json:"quantity"`
		Link            string `json:"link"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 1. Get user and wallet from Context (injected by AuthMiddleware)
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		// Should not happen if middleware is active, but safe guard
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var balanceCents int
	err := h.db.Pool.QueryRow(context.Background(),
		"SELECT balance FROM wallets WHERE user_id = $1",
		userID).Scan(&balanceCents)

	if err != nil {
		// Create wallet if not exists (auto-repair) or return error
		// For now, assume 0 balance if not found
		balanceCents = 0
	}

	// 2. Compute price
	services, err := h.smm.FetchServices()
	if err != nil {
		http.Error(w, "Failed to retrieve service data", http.StatusInternalServerError)
		return
	}

	var selectedService *smm.NormalizedSmmService // Use pointer to smm package struct
	for _, s := range services {
		if s.ID == body.ServiceID || s.SourceServiceID == body.SourceServiceID {
			selectedService = &s
			break
		}
	}

	if selectedService == nil {
		http.Error(w, "Service not found", http.StatusBadRequest)
		return
	}

	// Calculate Cost
	// RatePer1000 is in USD. Wallet is in INR (Paisa).
	rateUSD := selectedService.RatePer1000
	fxRate := h.fx.GetUsdToInr()
	rateINR := rateUSD * fxRate

	totalINR := (rateINR * float64(body.Quantity)) / 1000.0
	amountCents := int(totalINR * 100) // Convert to Paisa

	if amountCents <= 0 {
		amountCents = 1 // Minimum 1 paisa to prevent free orders due to rounding
	}

	if balanceCents < amountCents {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusPaymentRequired)
		json.NewEncoder(w).Encode(map[string]string{
			"error": fmt.Sprintf("Insufficient balance. Required: ₹%.2f, Available: ₹%.2f", float64(amountCents)/100.0, float64(balanceCents)/100.0),
		})
		return
	}

	// 3. Transactional update: Create order and debit wallet
	tx, err := h.db.Pool.Begin(context.Background())
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(context.Background())

	_, err = tx.Exec(context.Background(),
		"UPDATE wallets SET balance = balance - $1 WHERE user_id = $2",
		amountCents, userID)
	if err != nil {
		http.Error(w, "Failed to debit wallet", http.StatusInternalServerError)
		return
	}

	var orderID int
	err = tx.QueryRow(context.Background(),
		"INSERT INTO orders (user_id, service_id, quantity, amount_cents, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id",
		userID, body.ServiceID, body.Quantity, amountCents, "pending").Scan(&orderID)
	if err != nil {
		http.Error(w, "Failed to create order", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(context.Background()); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	// 4. Update sales count (Best effort, ignore errors)
	// Try to update using full ID or suffix ID
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		h.db.Pool.Exec(ctx, `
			UPDATE service_overrides 
			SET purchase_count = purchase_count + 1 
			WHERE source_service_id = $1 OR source_service_id = split_part($1, ':', 2)
		`, body.ServiceID)
	}()

	// 5. Forward to SMM Provider
	resp, placeErr := h.smm.PlaceOrder(body.SourceServiceID, strconv.Itoa(body.Quantity), body.Link)

	// Check for provider Error (API failure or Logic failure)
	var providerError string
	if placeErr != nil {
		providerError = placeErr.Error()
	} else if errStr, ok := resp["error"].(string); ok && errStr != "" {
		providerError = errStr
	}

	if providerError != "" {
		log.Printf("Provider failed for Order #%d: %s. Initiating Refund.", orderID, providerError)

		// REFUND LOGIC
		// We start a new transaction since the previous one passed
		rtx, rerr := h.db.Pool.Begin(context.Background())
		if rerr == nil {
			defer rtx.Rollback(context.Background())
			// 1. Credit Wallet back
			_, _ = rtx.Exec(context.Background(), "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2", amountCents, userID)
			// 2. Mark Order Failed
			failReason := fmt.Sprintf("Provider Error: %s", providerError)
			_, _ = rtx.Exec(context.Background(), "UPDATE orders SET status = 'failed', provider_resp = $1 WHERE id = $2",
				fmt.Sprintf(`{"error": "%s"}`, failReason), orderID)

			rtx.Commit(context.Background())
		}

		w.Header().Set("Content-Type", "application/json")
		// We return 200 OK because we handled it gracefully, but with error payload
		// Frontend will read order.error
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "failed",
			"order": map[string]interface{}{
				"error": providerError,
			},
		})
		return
	}

	// 5. Update order with provider response (Success)
	respJSON, _ := json.Marshal(resp)
	var providerOrderID string
	if id, ok := resp["order"].(string); ok {
		providerOrderID = id
	} else if id, ok := resp["order"].(float64); ok {
		providerOrderID = fmt.Sprintf("%.0f", id)
	} else {
		providerOrderID = fmt.Sprintf("%v", resp["order"])
	}

	if providerOrderID == "<nil>" {
		providerOrderID = ""
	}

	_, _ = h.db.Pool.Exec(context.Background(),
		"UPDATE orders SET provider_resp = $1, provider_order_id = $2, status = $3 WHERE id = $4",
		respJSON, providerOrderID, "submitted", orderID)

	// Increment purchase count in service_overrides
	if providerOrderID != "" {
		_, err = h.db.Pool.Exec(context.Background(), `
			INSERT INTO service_overrides (source_service_id, purchase_count, updated_at)
			VALUES ($1, 1, CURRENT_TIMESTAMP)
			ON CONFLICT (source_service_id)
			DO UPDATE SET purchase_count = service_overrides.purchase_count + 1, updated_at = CURRENT_TIMESTAMP
		`, body.SourceServiceID)
		if err != nil {
			log.Printf("Failed to increment purchase count for service %s: %v", body.SourceServiceID, err)
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"order":  resp,
	})
}

func (h *Handler) UpdateServiceOverride(w http.ResponseWriter, r *http.Request) {
	// Read raw body for debugging
	rawBody, _ := io.ReadAll(r.Body)
	log.Printf("DEBUG: Raw body received: %s", string(rawBody))

	// Re-assign body to a new reader so it can be decoded
	r.Body = io.NopCloser(bytes.NewBuffer(rawBody))

	var body struct {
		SourceServiceID    string  `json:"sourceServiceId"`
		DisplayName        *string `json:"displayName"`
		DisplayDescription *string `json:"displayDescription"`
		RateMultiplier     float64 `json:"rateMultiplier"`
		IsHidden           bool    `json:"isHidden"`

		Category         *string  `json:"category"`
		Tags             []string `json:"tags"`
		ProviderCategory *string  `json:"providerCategory"`
		DisplayID        string   `json:"displayId"`
		Refill           *bool    `json:"refill"`
		Cancel           *bool    `json:"cancel"`
		Dripfeed         *bool    `json:"dripfeed"`
		Type             *string  `json:"type"`
		Targeting        *string  `json:"targeting"`
		Quality          *string  `json:"quality"`
		Stability        *string  `json:"stability"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		syntaxErr, isSyntax := err.(*json.SyntaxError)
		unmarshalErr, isUnmarshal := err.(*json.UnmarshalTypeError)
		if isSyntax {
			log.Printf("DEBUG: JSON Syntax Error at offset %d: %v", syntaxErr.Offset, syntaxErr)
		} else if isUnmarshal {
			log.Printf("DEBUG: JSON Unmarshal Type Error: expected %v, got %v at offset %d", unmarshalErr.Type, unmarshalErr.Value, unmarshalErr.Offset)
		} else {
			log.Printf("DEBUG: Decode error: %v", err)
		}
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("DEBUG: Received override request for service %s: %+v", body.SourceServiceID, body)

	if body.SourceServiceID == "" {
		http.Error(w, "Source Service ID is required", http.StatusBadRequest)
		return
	}

	query := `
		INSERT INTO service_overrides (
			source_service_id, display_name, display_description, rate_multiplier, is_hidden, 
			category, tags, provider_category, display_id, refill, cancel, dripfeed, service_type,
			targeting, quality, stability, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
		ON CONFLICT (source_service_id) 
		DO UPDATE SET 
			display_name = EXCLUDED.display_name,
			display_description = EXCLUDED.display_description,
			rate_multiplier = EXCLUDED.rate_multiplier,
			is_hidden = EXCLUDED.is_hidden,
			category = EXCLUDED.category,
			tags = EXCLUDED.tags,
			provider_category = EXCLUDED.provider_category,
			display_id = EXCLUDED.display_id,
			refill = EXCLUDED.refill,
			cancel = EXCLUDED.cancel,
			dripfeed = EXCLUDED.dripfeed,
			service_type = EXCLUDED.service_type,
			targeting = EXCLUDED.targeting,
			quality = EXCLUDED.quality,
			stability = EXCLUDED.stability,
			updated_at = CURRENT_TIMESTAMP
	`

	_, err := h.db.Pool.Exec(context.Background(), query,
		body.SourceServiceID,
		body.DisplayName,
		body.DisplayDescription,
		body.RateMultiplier,
		body.IsHidden,
		body.Category,
		body.Tags,
		body.ProviderCategory,
		body.DisplayID,
		body.Refill,
		body.Cancel,
		body.Dripfeed,
		body.Type,
		body.Targeting,
		body.Quality,
		body.Stability,
	)

	if err != nil {
		log.Printf("Failed to update override: %v", err)
		http.Error(w, "Failed to save override", http.StatusInternalServerError)
		return
	}

	// Invalidate cache immediately so changes appear
	h.smm.InvalidateCache()

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *Handler) BulkUpdateServiceOverrides(w http.ResponseWriter, r *http.Request) {
	var body struct {
		SourceServiceIDs   []string `json:"sourceServiceIds"`
		DisplayName        *string  `json:"displayName"`
		DisplayDescription *string  `json:"displayDescription"`
		RateMultiplier     float64  `json:"rateMultiplier"`
		IsHidden           *bool    `json:"isHidden"`
		Category           *string  `json:"category"`
		Tags               []string `json:"tags"`
		ProviderCategory   *string  `json:"providerCategory"`
		DisplayID          *string  `json:"displayId"`
		Refill             *bool    `json:"refill"`
		Cancel             *bool    `json:"cancel"`
		Dripfeed           *bool    `json:"dripfeed"`
		Type               *string  `json:"type"`
		Targeting          *string  `json:"targeting"`
		Quality            *string  `json:"quality"`
		Stability          *string  `json:"stability"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(body.SourceServiceIDs) == 0 {
		http.Error(w, "Source Service IDs are required", http.StatusBadRequest)
		return
	}

	tx, err := h.db.Pool.Begin(context.Background())
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(context.Background()) // Ensure rollback on error

	query := `
		INSERT INTO service_overrides (
			source_service_id, display_name, display_description, rate_multiplier, is_hidden, 
			category, tags, provider_category, display_id, 
			refill, cancel, dripfeed, service_type,
			targeting, quality, stability, updated_at
		)
		VALUES ($1, 
			COALESCE($2, ''),
			COALESCE($3, ''),
			CASE WHEN $4 > 0 THEN $4 ELSE 1.0 END,
			COALESCE($5, false),
			COALESCE($6, ''),
			COALESCE($7, '{}'::text[]),
			COALESCE($8, ''),
			COALESCE($9, ''),
			COALESCE($10, false),
			COALESCE($11, false),
			COALESCE($12, false),
			COALESCE($13, ''),
			COALESCE($14, ''),
			COALESCE($15, ''),
			COALESCE($16, ''),
			CURRENT_TIMESTAMP)
		ON CONFLICT (source_service_id) 
		DO UPDATE SET 
			display_name = COALESCE(EXCLUDED.display_name, service_overrides.display_name),
			display_description = COALESCE(EXCLUDED.display_description, service_overrides.display_description),
			rate_multiplier = CASE WHEN EXCLUDED.rate_multiplier > 0 THEN EXCLUDED.rate_multiplier ELSE service_overrides.rate_multiplier END,
			is_hidden = COALESCE(EXCLUDED.is_hidden, service_overrides.is_hidden),
			category = COALESCE(EXCLUDED.category, service_overrides.category),
			tags = COALESCE(EXCLUDED.tags, service_overrides.tags),
			provider_category = COALESCE(EXCLUDED.provider_category, service_overrides.provider_category),
			display_id = COALESCE(EXCLUDED.display_id, service_overrides.display_id),
			refill = COALESCE(EXCLUDED.refill, service_overrides.refill),
			cancel = COALESCE(EXCLUDED.cancel, service_overrides.cancel),
			dripfeed = COALESCE(EXCLUDED.dripfeed, service_overrides.dripfeed),
			service_type = COALESCE(EXCLUDED.service_type, service_overrides.service_type),
			targeting = COALESCE(EXCLUDED.targeting, service_overrides.targeting),
			quality = COALESCE(EXCLUDED.quality, service_overrides.quality),
			stability = COALESCE(EXCLUDED.stability, service_overrides.stability),
			updated_at = CURRENT_TIMESTAMP
	`

	for _, id := range body.SourceServiceIDs {
		// Calculate isHidden for each (since body.IsHidden is optional for bulk)
		isHidden := false
		if body.IsHidden != nil {
			isHidden = *body.IsHidden
		}

		_, err = tx.Exec(context.Background(), query,
			id, body.DisplayName, body.DisplayDescription, body.RateMultiplier, isHidden,
			body.Category, body.Tags, body.ProviderCategory, body.DisplayID,
			body.Refill, body.Cancel, body.Dripfeed, body.Type,
			body.Targeting, body.Quality, body.Stability,
		)
		if err != nil {
			log.Printf("Bulk update failed for %s: %v", id, err)
			tx.Rollback(context.Background())
			http.Error(w, "Bulk update failed", http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(context.Background()); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	h.smm.InvalidateCache()
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}
