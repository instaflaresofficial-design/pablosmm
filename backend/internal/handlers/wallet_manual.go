package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
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
	Method        string    `json:"method"`
	TransactionID string    `json:"transaction_id"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
}

// RequestDeposit allows user to submit a manual payment request
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

	// Double check duplicate UTR
	var exists int
	err := h.db.Pool.QueryRow(context.Background(), "SELECT 1 FROM wallet_requests WHERE transaction_id=$1", req.TransactionID).Scan(&exists)
	if err == nil {
		http.Error(w, "Transaction ID already used", http.StatusConflict)
		return
	}

	_, err = h.db.Pool.Exec(context.Background(), `
		INSERT INTO wallet_requests (user_id, amount, method, transaction_id, status)
		VALUES ($1, $2, $3, $4, 'pending')
	`, userID, req.Amount, req.Method, req.TransactionID)

	if err != nil {
		log.Printf("Deposit request failed: %v", err)
		http.Error(w, "Failed to submit request", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Deposit request submitted successfully"})
}

// Admin: List Requests
func (h *Handler) ListWalletRequests(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Pool.Query(context.Background(), `
		SELECT r.id, r.user_id, u.email, r.amount, r.method, r.transaction_id, r.status, r.created_at
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
		// var amountStr string
		// pgx usually supports float64 scanning from numeric, but strict environments might need string
		// Let's try float64 first.
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
	// Amount is in float, convert to cents for wallets table (INTEGER)
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
	// transactions schema: amount DECIMAL(15,2) - so we keep using float amount here
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
