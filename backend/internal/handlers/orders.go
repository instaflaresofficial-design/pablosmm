package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

// GetOrders lists current user's orders
func (h *Handler) GetOrders(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int)

	// Optional filtering by status
	statusFilter := r.URL.Query().Get("status")

	// Join with service_overrides to get display metrics
	// orders.service_id contains prefix (e.g. topsmm:2493)
	// service_overrides.source_service_id is usually raw (e.g. 2493) or prefixed depending on import.
	// We handle both by checking strict equality OR suffix match.
	query := `
		SELECT 
			o.id, 
			o.service_id, 
			o.amount_cents, 
			o.quantity, 
			o.status, 
			o.created_at, 
			o.provider_order_id,
			so.display_id,
			so.display_name,
			o.remains,
			o.start_count,
			o.link,
			(SELECT balance FROM wallets WHERE user_id = o.user_id) as user_balance
		FROM orders o
		LEFT JOIN service_overrides so ON (
			o.service_id = so.source_service_id 
			OR split_part(o.service_id, ':', 2) = so.source_service_id
			OR o.service_id = so.source_service_id || ':' || split_part(o.service_id, ':', 2)
			OR split_part(o.service_id, ':', 2) = split_part(so.source_service_id, ':', 2)
		)
		WHERE o.user_id = $1
	`
	args := []interface{}{userID}

	if statusFilter != "" && statusFilter != "all" {
		if statusFilter == "active" {
			// 'active' in UI covers multiple backend statuses
			query += " AND o.status IN ('pending', 'processing', 'submitted', 'active', 'in_progress')"
		} else {
			query += " AND o.status = $2"
			args = append(args, statusFilter)
		}
	}

	query += " ORDER BY o.created_at DESC"

	rows, err := h.db.Pool.Query(context.Background(), query, args...)
	if err != nil {
		log.Printf("Error fetching orders: %v", err)
		http.Error(w, "Failed to fetch orders", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type OrderRes struct {
		ID          int     `json:"id"`
		ServiceID   string  `json:"serviceId"`   // Original Source ID
		DisplayID   string  `json:"displayId"`   // Custom Display ID
		DisplayName string  `json:"serviceName"` // Custom Name
		Amount      float64 `json:"charge"`
		Quantity    int     `json:"quantity"`
		Status      string  `json:"status"`
		Date        string  `json:"date"`
		Link        string  `json:"link"`
		StartCount  int     `json:"startCount"`
		Remains     int     `json:"remains"`
	}

	orders := []OrderRes{}
	for rows.Next() {
		var o OrderRes
		var amtCents int
		var tm time.Time
		var provID *string
		var dispIDRaw, dispNameRaw, remainsRaw, startCountRaw, linkRaw, balRaw interface{}

		if err := rows.Scan(
			&o.ID,
			&o.ServiceID,
			&amtCents,
			&o.Quantity,
			&o.Status,
			&tm,
			&provID,
			&dispIDRaw,
			&dispNameRaw,
			&remainsRaw,
			&startCountRaw,
			&linkRaw,
			&balRaw); err != nil {
			log.Printf("Scan error order %d: %v", o.ID, err)
			continue
		}

		o.Amount = float64(amtCents) / 100.0
		o.Date = tm.Format(time.RFC3339)
		o.Link = anyString(linkRaw)
		o.Remains = anyInt(remainsRaw)
		o.StartCount = anyInt(startCountRaw)

		o.DisplayID = anyString(dispIDRaw)
		if o.DisplayID == "" {
			if idx := strings.LastIndex(o.ServiceID, ":"); idx != -1 {
				o.DisplayID = o.ServiceID[idx+1:]
			} else {
				o.DisplayID = o.ServiceID
			}
		}

		dispName := anyString(dispNameRaw)
		if dispName != "" {
			o.DisplayName = dispName
		} else {
			o.DisplayName = "" // Let frontend handle the fallback
		}

		// Normalize Status for UI
		// "submitted" -> "active"
		if o.Status == "submitted" {
			o.Status = "active"
		}

		orders = append(orders, o)
	}

	log.Printf("Returning %d orders for user %d", len(orders), userID)
	if len(orders) > 0 {
		log.Printf("Sample Order #%d: Remains=%d, Status=%s", orders[0].ID, orders[0].Remains, orders[0].Status)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"orders": orders,
	})
}

// CancelOrder attempts to cancel a pending order
func (h *Handler) CancelOrder(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int)
	orderIDStr := chi.URLParam(r, "id")
	orderID, _ := strconv.Atoi(orderIDStr)

	tx, err := h.db.Pool.Begin(context.Background())
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(context.Background())

	// 1. Lock Order and Check Status
	var status string
	var amountCents int
	var providerOrderID *string

	err = tx.QueryRow(context.Background(), `
		SELECT status, amount_cents, provider_order_id 
		FROM orders 
		WHERE id=$1 AND user_id=$2 
		FOR UPDATE
	`, orderID, userID).Scan(&status, &amountCents, &providerOrderID)

	if err != nil {
		http.Error(w, "Order not found", http.StatusNotFound)
		return
	}

	// 2. Cancellation Rules
	// Allow cancellation if Pending OR if (In Progress AND provider_order_id is NULL/local)
	// For now, restrict to 'pending' only for safety, or 'processing' if not external.
	// User requirement: "start bhi nhi hua 2-3 din tak" -> likely 'pending' or 'processing' without start_count update.
	// Simplest logic: If status is 'pending' or 'processing' AND provider_order_id is NULL (meaning we haven't sent it yet?), OR we trust the user.
	// Let's assume 'pending' is safe. 'processing' might be sent to provider.
	// If provider_order_id is NOT NULL, we typically cannot auto-cancel without API call to provider.
	// User said "cancel available hota h...".
	// For this task, I will allow cancelling ONLY if provider_order_id is NULL (manual/failed/pending).
	// usage of 'pending' status is key.

	if status == "canceled" || status == "completed" {
		http.Error(w, "Order already finalized", http.StatusBadRequest)
		return
	}

	// Check if external
	if providerOrderID != nil && *providerOrderID != "" {
		// If it has an external ID, we can't auto-cancel locally without consulting provider.
		// Returning error for now.
		http.Error(w, "Cannot cancel order sent to provider", http.StatusForbidden)
		return
	}

	// 3. Mark Canceled
	_, err = tx.Exec(context.Background(), `
		UPDATE orders SET status='canceled' WHERE id=$1
	`, orderID)
	if err != nil {
		http.Error(w, "Failed to update order", http.StatusInternalServerError)
		return
	}

	// 4. Refund Wallet
	var newBalance int
	err = tx.QueryRow(context.Background(), `
		INSERT INTO wallets (user_id, balance) VALUES ($1, $2)
		ON CONFLICT (user_id) 
		DO UPDATE SET balance = wallets.balance + $2, updated_at = NOW()
		RETURNING balance
	`, userID, amountCents).Scan(&newBalance)

	if err != nil {
		log.Printf("Refund failed: %v", err)
		http.Error(w, "Refund process failed", http.StatusInternalServerError)
		return
	}

	// 5. Log Transaction
	refundAmount := float64(amountCents) / 100.0
	_, err = tx.Exec(context.Background(), `
		INSERT INTO transactions (user_id, amount, type, description)
		VALUES ($1, $2, 'credit', $3)
	`, userID, refundAmount, fmt.Sprintf("Refund for Order #%d", orderID))

	if err != nil {
		http.Error(w, "Transaction log failed", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(context.Background()); err != nil {
		http.Error(w, "Commit failed", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":     "success",
		"message":    "Order canceled and refunded",
		"newBalance": float64(newBalance) / 100.0,
	})
}

// anyString and anyInt removed as they are now in utils.go
