package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

type DepositReq struct {
	Amount        float64 `json:"amount"`
	Method        string  `json:"method"`
	TransactionID string  `json:"transaction_id"`
}

type WalletRequest struct {
	ID            int       `json:"id"`
	UserID        int       `json:"user_id"`
	UserEmail     string    `json:"user_email"`
	Amount        float64   `json:"amount"`
	UniqueAmount  *float64  `json:"unique_amount,omitempty"`
	Method        string    `json:"method"`
	TransactionID string    `json:"transaction_id"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
}

// generateUniqueAmount adds random paise (0.01-0.99) to the requested amount
// and ensures no other pending request has the same unique amount within a 30-min window.
func (h *Handler) generateUniqueAmount(ctx context.Context, baseAmount float64) (float64, error) {
	for attempts := 0; attempts < 50; attempts++ {
		// Generate random paise between 1 and 99
		paise := rand.Intn(99) + 1
		uniqueAmount := baseAmount + float64(paise)/100.0
		// Round to 2 decimal places
		uniqueAmount = math.Round(uniqueAmount*100) / 100

		// Check if this unique amount is already used by a pending request in the last 30 minutes
		var count int
		err := h.db.Pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM wallet_requests
			WHERE unique_amount = $1
			AND status = 'pending'
			AND created_at > NOW() - INTERVAL '30 minutes'
		`, uniqueAmount).Scan(&count)

		if err != nil {
			return 0, fmt.Errorf("failed to check unique amount: %w", err)
		}

		if count == 0 {
			return uniqueAmount, nil
		}
	}
	// Fallback: just return base + random (extremely unlikely to collide after 50 tries)
	return baseAmount + float64(rand.Intn(99)+1)/100.0, nil
}

// RequestDeposit allows user to submit a manual UPI payment request
func (h *Handler) RequestDeposit(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int)
	var req DepositReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Amount <= 0 {
		http.Error(w, "Invalid amount", http.StatusBadRequest)
		return
	}

	// Rate limit: max 3 pending requests per user
	var pendingCount int
	_ = h.db.Pool.QueryRow(context.Background(), `
		SELECT COUNT(*) FROM wallet_requests
		WHERE user_id = $1 AND status = 'pending'
	`, userID).Scan(&pendingCount)

	if pendingCount >= 10 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusTooManyRequests)
		json.NewEncoder(w).Encode(map[string]string{"error": "Too many pending requests. Please wait for existing ones to be processed."})
		return
	}

	ctx := context.Background()

	// Generate unique amount for UPI method
	var uniqueAmount *float64
	var upiID string

	if req.Method == "UPI" {
		ua, err := h.generateUniqueAmount(ctx, req.Amount)
		if err != nil {
			log.Printf("Failed to generate unique amount: %v", err)
			http.Error(w, "Failed to process request", http.StatusInternalServerError)
			return
		}
		uniqueAmount = &ua

		// Pick a random UPI ID from config
		if h.cfg.UPIIDs != "" {
			ids := strings.Split(h.cfg.UPIIDs, ",")
			for i := range ids {
				ids[i] = strings.TrimSpace(ids[i])
			}
			if len(ids) > 0 {
				upiID = ids[rand.Intn(len(ids))]
			}
		}
	}

	// Double check duplicate UTR (only if UTR provided)
	if req.TransactionID != "" {
		var exists int
		err := h.db.Pool.QueryRow(ctx, "SELECT 1 FROM wallet_requests WHERE transaction_id=$1", req.TransactionID).Scan(&exists)
		if err == nil {
			http.Error(w, "Transaction ID already used", http.StatusConflict)
			return
		}
	}

	// Insert with or without transaction_id (UTR may come later via notification)
	var txnID *string
	if req.TransactionID != "" {
		txnID = &req.TransactionID
	}

	var requestID int
	err := h.db.Pool.QueryRow(ctx, `
		INSERT INTO wallet_requests (user_id, amount, unique_amount, method, transaction_id, status)
		VALUES ($1, $2, $3, $4, $5, 'pending')
		RETURNING id
	`, userID, req.Amount, uniqueAmount, req.Method, txnID).Scan(&requestID)

	if err != nil {
		log.Printf("Deposit request failed: %v", err)
		http.Error(w, "Failed to submit request", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"message":    "Deposit request submitted successfully",
		"request_id": requestID,
	}

	if uniqueAmount != nil {
		response["unique_amount"] = *uniqueAmount
	}
	if upiID != "" {
		response["upi_id"] = upiID
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// UpdateDepositUTR allows user to attach a UTR to an existing pending UPI deposit request
func (h *Handler) UpdateDepositUTR(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int)

	var req struct {
		RequestID     int    `json:"request_id"`
		TransactionID string `json:"transaction_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.RequestID <= 0 || req.TransactionID == "" {
		http.Error(w, "Missing request_id or transaction_id", http.StatusBadRequest)
		return
	}

	// Check duplicate UTR
	var exists int
	err := h.db.Pool.QueryRow(context.Background(),
		"SELECT 1 FROM wallet_requests WHERE transaction_id=$1", req.TransactionID).Scan(&exists)
	if err == nil {
		http.Error(w, "Transaction ID already used", http.StatusConflict)
		return
	}

	// Update only if the request belongs to this user and is still pending
	res, err := h.db.Pool.Exec(context.Background(), `
		UPDATE wallet_requests SET transaction_id=$1, updated_at=NOW()
		WHERE id=$2 AND user_id=$3 AND status='pending'
	`, req.TransactionID, req.RequestID, userID)

	if err != nil {
		log.Printf("Failed to update UTR: %v", err)
		http.Error(w, "Failed to update", http.StatusInternalServerError)
		return
	}

	if res.RowsAffected() == 0 {
		http.Error(w, "Request not found or already processed", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "UTR updated successfully"})
}

// UPINotification is the payload sent by the Android notification listener app
type UPINotification struct {
	Amount    float64 `json:"amount"`
	UTR       string  `json:"utr"`
	SenderUPI string  `json:"sender_upi"`
	RawText   string  `json:"raw_text"`
}

// AutoVerifyDeposit is called by the Android notification listener app
// to automatically verify and approve UPI deposits
func (h *Handler) AutoVerifyDeposit(w http.ResponseWriter, r *http.Request) {
	// 1. Validate API key
	apiKey := r.Header.Get("X-Notify-Key")
	if apiKey == "" || apiKey != h.cfg.UPINotifyKey {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. Parse request
	var notif UPINotification
	if err := json.NewDecoder(r.Body).Decode(&notif); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if notif.Amount <= 0 {
		http.Error(w, "Invalid amount", http.StatusBadRequest)
		return
	}

	log.Printf("[UPI-NOTIFY] Received: amount=%.2f, utr=%s, sender=%s", notif.Amount, notif.UTR, notif.SenderUPI)

	ctx := context.Background()

	// 3. Check for duplicate UTR first (idempotency)
	if notif.UTR != "" {
		var existingID int
		err := h.db.Pool.QueryRow(ctx, `
			SELECT id FROM upi_notifications WHERE utr = $1
		`, notif.UTR).Scan(&existingID)
		if err == nil {
			// Already processed this notification
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status":  "duplicate",
				"message": "This notification was already processed",
			})
			return
		}
	}

	// 4. Try to match against pending wallet_requests by unique_amount
	// Match within a 30-minute window with ±0.01 tolerance
	var reqID, userID int
	var reqAmount float64
	err := h.db.Pool.QueryRow(ctx, `
		SELECT id, user_id, amount FROM wallet_requests
		WHERE status = 'pending'
		AND method = 'UPI'
		AND unique_amount IS NOT NULL
		AND ABS(unique_amount - $1) < 0.02
		AND created_at > NOW() - INTERVAL '30 minutes'
		ORDER BY created_at DESC
		LIMIT 1
	`, notif.Amount).Scan(&reqID, &userID, &reqAmount)

	if err != nil {
		// No matching pending request found — log as unmatched
		log.Printf("[UPI-NOTIFY] No matching pending request for amount=%.2f", notif.Amount)

		h.db.Pool.Exec(ctx, `
			INSERT INTO upi_notifications (amount, utr, sender_upi, raw_text, status)
			VALUES ($1, $2, $3, $4, 'unmatched')
		`, notif.Amount, notif.UTR, notif.SenderUPI, notif.RawText)

		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "no_match",
			"message": "No matching pending request found",
		})
		return
	}

	// 5. Found a match! Auto-approve in a transaction
	log.Printf("[UPI-NOTIFY] Matched request %d (user %d, amount %.2f) with notification amount %.2f", reqID, userID, reqAmount, notif.Amount)

	tx, err := h.db.Pool.Begin(ctx)
	if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	// 5a. Lock and verify still pending
	var currentStatus string
	err = tx.QueryRow(ctx, "SELECT status FROM wallet_requests WHERE id=$1 FOR UPDATE", reqID).Scan(&currentStatus)
	if err != nil || currentStatus != "pending" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "already_processed",
			"message": "Request was already processed",
		})
		return
	}

	// 5b. Update request status + set the UTR
	_, err = tx.Exec(ctx, `
		UPDATE wallet_requests
		SET status='approved', transaction_id=$1, updated_at=NOW()
		WHERE id=$2
	`, notif.UTR, reqID)
	if err != nil {
		log.Printf("[UPI-NOTIFY] Failed to update request: %v", err)
		http.Error(w, "Failed to update", http.StatusInternalServerError)
		return
	}

	// 5c. Credit user wallet (amount is the ORIGINAL requested amount, not unique amount)
	amountCents := int(reqAmount * 100)
	_, err = tx.Exec(ctx, `
		INSERT INTO wallets (user_id, balance) VALUES ($1, $2)
		ON CONFLICT (user_id)
		DO UPDATE SET balance = wallets.balance + $2, updated_at = NOW()
	`, userID, amountCents)
	if err != nil {
		log.Printf("[UPI-NOTIFY] Failed to credit wallet: %v", err)
		http.Error(w, "Failed to credit wallet", http.StatusInternalServerError)
		return
	}

	// 5d. Log transaction
	_, err = tx.Exec(ctx, `
		INSERT INTO transactions (user_id, amount, type, description)
		VALUES ($1, $2, 'credit', 'UPI Deposit (Auto-Verified)')
	`, userID, reqAmount)
	if err != nil {
		log.Printf("[UPI-NOTIFY] Failed to log transaction: %v", err)
	}

	// 5e. Commit
	if err := tx.Commit(ctx); err != nil {
		http.Error(w, "Commit failed", http.StatusInternalServerError)
		return
	}

	// 6. Log the notification as matched
	h.db.Pool.Exec(ctx, `
		INSERT INTO upi_notifications (amount, utr, sender_upi, raw_text, matched_request_id, status)
		VALUES ($1, $2, $3, $4, $5, 'matched')
	`, notif.Amount, notif.UTR, notif.SenderUPI, notif.RawText, reqID)

	log.Printf("[UPI-NOTIFY] ✅ Auto-approved request %d for user %d, amount ₹%.2f", reqID, userID, reqAmount)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":     "approved",
		"message":    fmt.Sprintf("Auto-approved ₹%.2f for user %d", reqAmount, userID),
		"request_id": reqID,
	})
}

// Admin: List Requests
func (h *Handler) ListWalletRequests(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Pool.Query(context.Background(), `
		SELECT r.id, r.user_id, u.email, r.amount, r.method, COALESCE(r.transaction_id, ''), r.status, r.created_at
		FROM wallet_requests r
		JOIN users u ON r.user_id = u.id
		ORDER BY r.created_at DESC
	`)
	if err != nil {
		http.Error(w, "Failed to fetch requests", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var requests []WalletRequest
	for rows.Next() {
		var req WalletRequest
		if err := rows.Scan(&req.ID, &req.UserID, &req.UserEmail, &req.Amount, &req.Method, &req.TransactionID, &req.Status, &req.CreatedAt); err != nil {
			log.Printf("Scan error: %v", err)
			continue
		}
		requests = append(requests, req)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"requests": requests})
}

// Admin: Approve Request
func (h *Handler) ApproveWalletRequest(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, _ := strconv.Atoi(idStr)

	ctx := context.Background()
	tx, err := h.db.Pool.Begin(ctx)
	if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	// 1. Get Request and Lock
	var userID int
	var amount float64
	var status string
	err = tx.QueryRow(ctx, "SELECT user_id, amount, status FROM wallet_requests WHERE id=$1 FOR UPDATE", id).Scan(&userID, &amount, &status)
	if err != nil {
		log.Printf("Error finding request %d: %v", id, err)
		http.Error(w, "Request not found", http.StatusNotFound)
		return
	}

	if status != "pending" {
		log.Printf("Request %d not pending: %s", id, status)
		http.Error(w, "Request already processed", http.StatusBadRequest)
		return
	}

	// 2. Update Request Status
	_, err = tx.Exec(ctx, "UPDATE wallet_requests SET status='approved', updated_at=NOW() WHERE id=$1", id)
	if err != nil {
		log.Printf("Error updating request status: %v", err)
		http.Error(w, "Failed to update status", http.StatusInternalServerError)
		return
	}

	// 3. Update User Balance (Upsert into wallets table)
	amountCents := int(amount * 100)
	_, err = tx.Exec(ctx, `
		INSERT INTO wallets (user_id, balance)
		VALUES ($1, $2)
		ON CONFLICT (user_id)
		DO UPDATE SET balance = wallets.balance + $2, updated_at = NOW()
	`, userID, amountCents)

	if err != nil {
		log.Printf("Error updating wallet balance: %v", err)
		http.Error(w, "Failed to update balance", http.StatusInternalServerError)
		return
	}

	// 4. Insert Transaction Log
	_, err = tx.Exec(ctx, `
		INSERT INTO transactions (user_id, amount, type, description)
		VALUES ($1, $2, 'credit', 'Manual Deposit Approved')
	`, userID, amount)
	if err != nil {
		http.Error(w, "Failed to log transaction", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		http.Error(w, "Commit failed", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Approved successfully"})
}

// Admin: Reject Request
func (h *Handler) RejectWalletRequest(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, _ := strconv.Atoi(idStr)

	_, err := h.db.Pool.Exec(context.Background(), "UPDATE wallet_requests SET status='rejected', updated_at=NOW() WHERE id=$1 AND status='pending'", id)
	if err != nil {
		http.Error(w, "Failed to reject", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Rejected successfully"})
}

// GetDepositStatus returns the current status of a wallet deposit request
// Used by the frontend to poll for auto-verification
func (h *Handler) GetDepositStatus(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int)
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		http.Error(w, "Missing request id", http.StatusBadRequest)
		return
	}

	reqID, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid request id", http.StatusBadRequest)
		return
	}

	var status string
	err = h.db.Pool.QueryRow(context.Background(),
		"SELECT status FROM wallet_requests WHERE id=$1 AND user_id=$2",
		reqID, userID).Scan(&status)

	if err != nil {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"status": status})
}
