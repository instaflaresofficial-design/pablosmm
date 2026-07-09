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
	"github.com/jackc/pgx/v5/pgtype"
	"pablosmm/backend/internal/db/sqlc"
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
	var sqlStatusFilter pgtype.Text
	if statusFilter == "" || statusFilter == "all" {
		sqlStatusFilter = pgtype.Text{Valid: false}
	} else {
		sqlStatusFilter = pgtype.Text{String: statusFilter, Valid: true}
	}

	ordersRow, err := h.db.Queries.GetOrders(context.Background(), sqlc.GetOrdersParams{
		UserID:       int32(userID),
		StatusFilter: sqlStatusFilter,
	})
	if err != nil {
		log.Printf("Error fetching orders: %v", err)
		http.Error(w, "Failed to fetch orders", http.StatusInternalServerError)
		return
	}

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
		ServiceType string  `json:"serviceType"`
		Category    string  `json:"category"`
	}

	// Build a service lookup map from the live service cache
	// This enriches orders with serviceType/category/name even if service_overrides has empty values
	type svcInfo struct {
		ServiceType  string
		Category     string
		Platform     string
		DisplayName  string
		ProviderName string
	}
	svcMap := make(map[string]svcInfo)
	if services, svcErr := h.smm.FetchServices(); svcErr == nil {
		for _, s := range services {
			info := svcInfo{
				ServiceType:  s.ServiceType,
				Category:     s.Category,
				Platform:     s.Platform,
				DisplayName:  s.DisplayName,
				ProviderName: s.ProviderName,
			}
			svcMap[s.ID] = info                // "topsmm:2493"
			svcMap[s.SourceServiceID] = info    // "2493"
		}
	}

	orders := []OrderRes{}
	for _, row := range ordersRow {
		var o OrderRes
		o.ID = int(row.ID)
		o.ServiceID = row.ServiceID
		o.Amount = float64(row.AmountCents) / 100.0
		o.Quantity = int(row.Quantity)
		o.Status = row.Status
		o.Date = row.CreatedAt.Time.Format(time.RFC3339)
		o.Link = row.Link
		o.Remains = int(row.Remains)
		o.StartCount = int(row.StartCount)
		o.ServiceType = row.ServiceType
		o.Category = row.Category
		
		o.DisplayID = row.DisplayID
		if o.DisplayID == "" {
			if idx := strings.LastIndex(o.ServiceID, ":"); idx != -1 {
				o.DisplayID = o.ServiceID[idx+1:]
			} else {
				o.DisplayID = o.ServiceID
			}
		}

		if row.DisplayName != "" {
			o.DisplayName = row.DisplayName
		}

		// Enrich from live service cache if DB values are missing
		if info, ok := svcMap[o.ServiceID]; ok {
			if o.ServiceType == "" {
				o.ServiceType = info.ServiceType
			}
			if o.Category == "" {
				o.Category = info.Category
			}
			if o.DisplayName == "" {
				if info.DisplayName != "" {
					o.DisplayName = info.DisplayName
				} else {
					o.DisplayName = info.ProviderName
				}
			}
		} else {
			// Try with just the raw source ID part
			parts := strings.SplitN(o.ServiceID, ":", 2)
			if len(parts) == 2 {
				if info, ok := svcMap[parts[1]]; ok {
					if o.ServiceType == "" {
						o.ServiceType = info.ServiceType
					}
					if o.Category == "" {
						o.Category = info.Category
					}
					if o.DisplayName == "" {
						if info.DisplayName != "" {
							o.DisplayName = info.DisplayName
						} else {
							o.DisplayName = info.ProviderName
						}
					}
				}
			}
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
		log.Printf("Sample Order #%d: ServiceType=%s, Category=%s, Name=%s", orders[0].ID, orders[0].ServiceType, orders[0].Category, orders[0].DisplayName)
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

	qtx := h.db.Queries.WithTx(tx)

	// 1. Lock Order and Check Status
	orderRow, err := qtx.GetOrderForCancel(context.Background(), sqlc.GetOrderForCancelParams{
		ID:     int32(orderID),
		UserID: int32(userID),
	})

	if err != nil {
		http.Error(w, "Order not found", http.StatusNotFound)
		return
	}
	status := orderRow.Status
	amountCents := int(orderRow.AmountCents)
	providerOrderID := orderRow.ProviderOrderID

	// 2. Cancellation Rules
	if status == "canceled" || status == "completed" {
		http.Error(w, "Order already finalized", http.StatusBadRequest)
		return
	}

	// Check if external
	if providerOrderID != "" {
		http.Error(w, "Cannot cancel order sent to provider", http.StatusForbidden)
		return
	}

	// 3. Mark Canceled
	err = qtx.CancelOrder(context.Background(), int32(orderID))
	if err != nil {
		http.Error(w, "Failed to update order", http.StatusInternalServerError)
		return
	}

	// 4. Refund Wallet
	err = qtx.UpsertWalletBalance(context.Background(), sqlc.UpsertWalletBalanceParams{
		UserID:  int32(userID),
		Balance: int32(amountCents),
	})
	if err != nil {
		log.Printf("Refund failed: %v", err)
		http.Error(w, "Refund process failed", http.StatusInternalServerError)
		return
	}

	newBalance, _ := qtx.GetWalletBalance(context.Background(), int32(userID))

	// 5. Log Transaction
	refundAmount := float64(amountCents) / 100.0
	err = qtx.InsertTransaction(context.Background(), sqlc.InsertTransactionParams{
		UserID:      pgtype.Int4{Int32: int32(userID), Valid: true},
		Amount:      func() pgtype.Numeric { n := pgtype.Numeric{}; n.Scan(fmt.Sprintf("%f", refundAmount)); return n }(),
		Type:        "credit",
		Description: pgtype.Text{String: fmt.Sprintf("Refund for Order #%d", orderID), Valid: true},
	})

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
