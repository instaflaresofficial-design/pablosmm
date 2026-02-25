package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
)

type AdminUser struct {
	ID         int     `json:"id"`
	Name       string  `json:"name"`
	Username   string  `json:"username"`
	Email      string  `json:"email"`
	Mobile     string  `json:"mobile"`
	Role       string  `json:"role"`
	Balance    float64 `json:"balance"` // Converted from cents
	OrderCount int     `json:"orderCount"`
	TotalSpend float64 `json:"totalSpend"` // Converted from cents
	Currency   string  `json:"currency"`
	CreatedAt  string  `json:"createdAt"`
}

type WalletUpdateReq struct {
	Amount      float64 `json:"amount"` // Amount in main currency unit (e.g. USD)
	Type        string  `json:"type"`   // "credit" or "debit"
	Description string  `json:"description"`
}

type UserUpdateReq struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	Mobile   string `json:"mobile"`
	Currency string `json:"currency"`
}

// GetUsers lists all users with pagination and search
func (h *Handler) GetUsers(w http.ResponseWriter, r *http.Request) {
	// Parse query params
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")
	search := r.URL.Query().Get("search")

	page := 1
	limit := 50
	if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
		page = p
	}
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}
	offset := (page - 1) * limit

	// Build query
	baseQuery := `
		SELECT 
			u.id, u.name, COALESCE(u.username, ''), u.email, COALESCE(u.mobile, ''), u.role, COALESCE(u.currency, 'USD'), u.created_at,
			COALESCE(w.balance, 0),
			(SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id),
			(SELECT COALESCE(SUM(o.amount_cents), 0) FROM orders o WHERE o.user_id = u.id)
		FROM users u
		LEFT JOIN wallets w ON u.id = w.user_id
		WHERE 1=1
	`
	args := []interface{}{}
	argCounter := 1

	if search != "" {
		baseQuery += fmt.Sprintf(" AND (u.name ILIKE $%d OR u.email ILIKE $%d)", argCounter, argCounter)
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern)
		argCounter++
	}

	baseQuery += fmt.Sprintf(" ORDER BY u.created_at DESC LIMIT $%d OFFSET $%d", argCounter, argCounter+1)
	args = append(args, limit, offset)

	// Execute
	rows, err := h.db.Pool.Query(context.Background(), baseQuery, args...)
	if err != nil {
		log.Printf("Error fetching users: %v", err)
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := []AdminUser{}
	for rows.Next() {
		var u AdminUser
		var balanceCents int
		var totalSpendCents int
		var createdAtTime interface{}

		if err := rows.Scan(&u.ID, &u.Name, &u.Username, &u.Email, &u.Mobile, &u.Role, &u.Currency, &createdAtTime, &balanceCents, &u.OrderCount, &totalSpendCents); err != nil {
			log.Printf("Error scanning user row: %v", err)
			continue
		}

		u.Balance = float64(balanceCents) / 100.0
		u.TotalSpend = float64(totalSpendCents) / 100.0
		u.CreatedAt = fmt.Sprintf("%v", createdAtTime) // Simple string conversion for now
		users = append(users, u)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"users": users,
		"page":  page,
		"limit": limit,
	})
}

// GetUser returns detailed info for a single user
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var u AdminUser
	var balanceCents int
	var totalSpendCents int
	var createdAtTime interface{}

	// Fetch basic info
	err = h.db.Pool.QueryRow(context.Background(), `
		SELECT 
			u.id, u.name, COALESCE(u.username, ''), u.email, COALESCE(u.mobile, ''), u.role, COALESCE(u.currency, 'USD'), u.created_at,
			COALESCE(w.balance, 0),
			(SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id),
			(SELECT COALESCE(SUM(o.amount_cents), 0) FROM orders o WHERE o.user_id = u.id)
		FROM users u
		LEFT JOIN wallets w ON u.id = w.user_id
		WHERE u.id = $1
	`, id).Scan(&u.ID, &u.Name, &u.Username, &u.Email, &u.Mobile, &u.Role, &u.Currency, &createdAtTime, &balanceCents, &u.OrderCount, &totalSpendCents)

	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	u.Balance = float64(balanceCents) / 100.0
	u.TotalSpend = float64(totalSpendCents) / 100.0
	u.CreatedAt = fmt.Sprintf("%v", createdAtTime)

	u.Balance = float64(balanceCents) / 100.0
	u.TotalSpend = float64(totalSpendCents) / 100.0
	u.CreatedAt = fmt.Sprintf("%v", createdAtTime)

	// Fetch recent orders (last 5)
	type OrderSummary struct {
		ID        int     `json:"id"`
		ServiceID string  `json:"serviceId"`
		Amount    float64 `json:"amount"`
		Status    string  `json:"status"`
		CreatedAt string  `json:"createdAt"`
	}

	orders := []OrderSummary{}
	rows, err := h.db.Pool.Query(context.Background(), `
		SELECT id, service_id, amount_cents, status, created_at 
		FROM orders 
		WHERE user_id = $1 
		ORDER BY created_at DESC 
		LIMIT 5
	`, id)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var o OrderSummary
			var amtCents int
			var t interface{}
			if err := rows.Scan(&o.ID, &o.ServiceID, &amtCents, &o.Status, &t); err == nil {
				o.Amount = float64(amtCents) / 100.0
				o.CreatedAt = fmt.Sprintf("%v", t)
				orders = append(orders, o)
			}
		}
	}

	// Fetch recent transactions (last 10)
	type TransactionSummary struct {
		ID          int     `json:"id"`
		Amount      float64 `json:"amount"`
		Type        string  `json:"type"`
		Description string  `json:"description"`
		CreatedAt   string  `json:"createdAt"`
	}

	transactions := []TransactionSummary{}
	rowsTx, err := h.db.Pool.Query(context.Background(), `
		SELECT id, amount, type, description, created_at 
		FROM transactions 
		WHERE user_id = $1 
		ORDER BY created_at DESC 
		LIMIT 10
	`, id)
	if err == nil {
		defer rowsTx.Close()
		for rowsTx.Next() {
			var t TransactionSummary
			var tm time.Time
			// transactions amount is DECIMAL(15,2), so scan into &t.Amount directly usually works, or float64
			if err := rowsTx.Scan(&t.ID, &t.Amount, &t.Type, &t.Description, &tm); err == nil {
				t.CreatedAt = tm.Format(time.RFC3339)
				transactions = append(transactions, t)
			}
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"user":         u,
		"orders":       orders,
		"transactions": transactions,
	})
}

// UpdateUserWallet adds or removes funds
func (h *Handler) UpdateUserWallet(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	userID, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var req WalletUpdateReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Amount <= 0 {
		http.Error(w, "Amount must be positive", http.StatusBadRequest)
		return
	}

	amountCents := int(req.Amount * 100)
	if req.Type == "debit" {
		amountCents = -amountCents
	} else if req.Type != "credit" {
		http.Error(w, "Invalid transaction type", http.StatusBadRequest)
		return
	}

	// Update wallet logic (upsert wallet if not exists)
	tx, err := h.db.Pool.Begin(context.Background())
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(context.Background())

	// Ensure wallet exists
	_, err = tx.Exec(context.Background(), `
		INSERT INTO wallets (user_id, balance) VALUES ($1, 0)
		ON CONFLICT (user_id) DO NOTHING
	`, userID)
	if err != nil {
		log.Printf("Failed to ensure wallet exists: %v", err)
		http.Error(w, "Wallet error", http.StatusInternalServerError)
		return
	}

	// Update balance
	var newBalance int
	err = tx.QueryRow(context.Background(), `
		UPDATE wallets 
		SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
		WHERE user_id = $2
		RETURNING balance
	`, amountCents, userID).Scan(&newBalance)

	if err != nil {
		log.Printf("Failed to update wallet: %v", err)
		http.Error(w, "Failed to update balance", http.StatusInternalServerError)
		return
	}

	// Log Transaction
	_, err = tx.Exec(context.Background(), `
		INSERT INTO transactions (user_id, amount, type, description)
		VALUES ($1, $2, $3, $4)
	`, userID, req.Amount, req.Type, req.Description)

	if err != nil {
		log.Printf("Failed to log transaction: %v", err)
		http.Error(w, "Transaction logging failed", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(context.Background()); err != nil {
		http.Error(w, "Transaction failed", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":     "success",
		"newBalance": float64(newBalance) / 100.0,
	})
}

// UpdateUser updates profile info
func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var req UserUpdateReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Dynamic update query
	query := "UPDATE users SET "
	args := []interface{}{}
	argID := 1
	updates := []string{}

	if req.Name != "" {
		updates = append(updates, fmt.Sprintf("name=$%d", argID))
		args = append(args, req.Name)
		argID++
	}
	if req.Email != "" {
		updates = append(updates, fmt.Sprintf("email=$%d", argID))
		args = append(args, req.Email)
		argID++
	}
	if req.Role != "" {
		updates = append(updates, fmt.Sprintf("role=$%d", argID))
		args = append(args, req.Role)
		argID++
	}
	if req.Mobile != "" {
		updates = append(updates, fmt.Sprintf("mobile=$%d", argID))
		args = append(args, req.Mobile)
		argID++
	}
	if req.Currency != "" {
		updates = append(updates, fmt.Sprintf("currency=$%d", argID))
		args = append(args, req.Currency)
		argID++
	}

	if len(updates) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	query += fmt.Sprintf("%s WHERE id=$%d",
		// Join updates with commas
		func() string {
			res := ""
			for i, u := range updates {
				if i > 0 {
					res += ", "
				}
				res += u
			}
			return res
		}(),
		argID,
	)
	args = append(args, id)

	_, err = h.db.Pool.Exec(context.Background(), query, args...)
	if err != nil {
		log.Printf("Update user failed: %v", err)
		http.Error(w, "Failed to update user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// UpdateProfile updates the authenticated user's profile (restricted fields)
func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userIDVal := r.Context().Value("userID")
	if userIDVal == nil {
		log.Printf("❌ [UpdateProfile] No userID in context")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID := userIDVal.(int)

	var req UserUpdateReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Dynamic update query
	query := "UPDATE users SET "
	args := []interface{}{}
	argID := 1
	updates := []string{}

	if req.Name != "" {
		updates = append(updates, fmt.Sprintf("name=$%d", argID))
		args = append(args, req.Name)
		argID++
	}
	// Do NOT allow updating email or role here for safety
	// if req.Email != "" {
	// 	updates = append(updates, fmt.Sprintf("email=$%d", argID))
	// 	args = append(args, req.Email)
	// 	argID++
	// }
	if req.Mobile != "" {
		updates = append(updates, fmt.Sprintf("mobile=$%d", argID))
		args = append(args, req.Mobile)
		argID++
	}
	if req.Currency != "" {
		updates = append(updates, fmt.Sprintf("currency=$%d", argID))
		args = append(args, req.Currency)
		argID++
	}

	if len(updates) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	query += fmt.Sprintf("%s WHERE id=$%d",
		func() string {
			res := ""
			for i, u := range updates {
				if i > 0 {
					res += ", "
				}
				res += u
			}
			return res
		}(),
		argID,
	)
	args = append(args, userID)

	_, err := h.db.Pool.Exec(context.Background(), query, args...)
	if err != nil {
		log.Printf("Update profile failed: %v", err)
		http.Error(w, "Failed to update profile", http.StatusInternalServerError)
		return
	}

	// Fetch updated user to return
	// Or just return success
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}
