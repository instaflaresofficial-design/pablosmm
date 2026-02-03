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

// RefundOrder refunds an order manually
func (h *Handler) RefundOrder(w http.ResponseWriter, r *http.Request) {
	orderIDStr := chi.URLParam(r, "id")
	orderID, _ := strconv.Atoi(orderIDStr)

	// Parse optional body for partial refund
	var req struct {
		Amount float64 `json:"amount"` // Optional amount to refund
	}
	// Ignore error if body is empty (full refund default)
	_ = json.NewDecoder(r.Body).Decode(&req)

	// Transaction
	tx, err := h.db.Pool.Begin(context.Background())
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(context.Background())

	// 1. Get current status, amount, and already refunded amount
	var status string
	var amountCents int
	var refundedCents int
	var userID int
	err = tx.QueryRow(context.Background(),
		"SELECT status, amount_cents, COALESCE(refunded_amount, 0), user_id FROM orders WHERE id = $1 FOR UPDATE", orderID).
		Scan(&status, &amountCents, &refundedCents, &userID)

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Order not found"})
		return
	}

	// Calculate remaining refundable amount
	remainingCents := amountCents - refundedCents
	if remainingCents <= 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Order is already fully refunded"})
		return
	}

	// Build Refund Amount
	refundAmountCents := remainingCents // Default to full remaining
	isPartial := false

	if req.Amount > 0 {
		reqCents := int(req.Amount * 100)
		if reqCents < remainingCents {
			refundAmountCents = reqCents
			isPartial = true
		} else if reqCents > remainingCents {
			// Cap at remaining
			refundAmountCents = remainingCents
		}
	}

	// 2. Credit Wallet
	_, err = tx.Exec(context.Background(), "UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2", refundAmountCents, userID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to refund wallet"})
		return
	}

	// 3. Log Transaction
	desc := fmt.Sprintf("Refund for Order #%d", orderID)
	if isPartial {
		desc = fmt.Sprintf("Partial Refund for Order #%d", orderID)
	}
	_, err = tx.Exec(context.Background(), `
		INSERT INTO transactions (user_id, amount, type, description)
		VALUES ($1, $2, 'credit', $3)
	`, userID, float64(refundAmountCents)/100.0, desc)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to log transaction"})
		return
	}

	// 4. Update Order
	// Update refunded_amount. Only mark 'refunded' if fully refunded.
	newRefundedTotal := refundedCents + refundAmountCents
	newStatus := status
	if newRefundedTotal >= amountCents {
		newStatus = "refunded"
	} else if status != "refunded" && status != "canceled" {
		// Keep existing status if partial, or maybe mark 'partial_refunded'?
		// For now keep original status (e.g. 'completed' or 'processing') unless fully refunded.
	}

	var providerOrderID *string
	err = tx.QueryRow(context.Background(),
		"UPDATE orders SET status = $1, refunded_amount = $2 WHERE id = $3 RETURNING provider_order_id",
		newStatus, newRefundedTotal, orderID).Scan(&providerOrderID)

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update order status"})
		return
	}

	if err := tx.Commit(context.Background()); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Commit failed"})
		return
	}

	// 5. Provider Cancellation (Only on Full Refund/Cancellation)
	// Only attempt if fully refunded and status changed to refunded
	if newStatus == "refunded" && providerOrderID != nil && *providerOrderID != "" {
		go func(pID string) {
			log.Printf("Attempting to cancel Order #%s on provider side...", pID)
			resp, err := h.smm.CancelOrder(pID)
			if err != nil {
				log.Printf("Provider cancel failed for #%s: %v", pID, err)
			} else {
				log.Printf("Provider cancel response for #%s: %v", pID, resp)
			}
		}(*providerOrderID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": fmt.Sprintf("Refunded %.2f successfully", float64(refundAmountCents)/100.0),
	})
}

// GetAdminOrders lists all orders for admin
func (h *Handler) GetAdminOrders(w http.ResponseWriter, r *http.Request) {
	// Filter params
	statusFilter := r.URL.Query().Get("status")
	userFilter := r.URL.Query().Get("user_id")

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
			u.email
		FROM orders o
		LEFT JOIN service_overrides so ON (o.service_id = so.source_service_id OR split_part(o.service_id, ':', 2) = so.source_service_id)
		JOIN users u ON o.user_id = u.id
		WHERE 1=1
	`
	args := []interface{}{}
	argIdx := 1

	if statusFilter != "" && statusFilter != "all" {
		query += " AND o.status = $" + itoa(argIdx)
		args = append(args, statusFilter)
		argIdx++
	}

	if userFilter != "" {
		query += " AND o.user_id = $" + itoa(argIdx)
		args = append(args, userFilter)
		argIdx++
	}

	query += " ORDER BY o.created_at DESC"

	rows, err := h.db.Pool.Query(context.Background(), query, args...)
	if err != nil {
		log.Printf("Error fetching admin orders: %v", err)
		http.Error(w, "Failed to fetch orders", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type AdminOrderRes struct {
		ID          int     `json:"id"`
		ServiceID   string  `json:"serviceId"`
		DisplayID   string  `json:"displayId"`
		DisplayName string  `json:"serviceName"`
		UserEmail   string  `json:"userEmail"`
		Amount      float64 `json:"charge"`
		Quantity    int     `json:"quantity"`
		Status      string  `json:"status"`
		Date        string  `json:"date"`
		Link        string  `json:"link"`
		Remains     int     `json:"remains"`
		StartCount  int     `json:"startCount"`
	}

	orders := []AdminOrderRes{}
	for rows.Next() {
		var o AdminOrderRes
		var amtCents int
		var tm time.Time
		var provID *string
		var dispIDRaw, dispNameRaw, remainsRaw, startCountRaw, linkRaw, emailRaw interface{}

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
			&emailRaw); err != nil {
			log.Printf("Scan error order %d: %v", o.ID, err)
			continue
		}

		o.Amount = float64(amtCents) / 100.0
		o.Date = tm.Format(time.RFC3339)
		o.Link = anyString(linkRaw)
		o.Remains = anyInt(remainsRaw)
		o.StartCount = anyInt(startCountRaw)
		o.UserEmail = anyString(emailRaw)

		o.DisplayID = anyString(dispIDRaw)
		if o.DisplayID == "" {
			// Strip prefix if present (e.g., "topsmm:123" -> "123")
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
			o.DisplayName = "Service #" + o.DisplayID
		}

		orders = append(orders, o)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"orders": orders,
	})
}

// itoa, anyString, and anyInt removed as they are now in utils.go
