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

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error": msg,
	})
}

// GetOrders lists current user's orders
func (h *Handler) GetOrders(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int)

	statusFilter := r.URL.Query().Get("status")

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
		jsonError(w, "Failed to fetch orders", http.StatusInternalServerError)
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
		Remains       int     `json:"remains"`
		ServiceType   string  `json:"serviceType"`
		Category      string  `json:"category"`
		PendingCancel bool    `json:"pendingCancel"`
	}

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
			svcMap[s.ID] = info
			svcMap[s.SourceServiceID] = info
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
		o.PendingCancel = row.PendingCancel

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

		if o.Status == "submitted" {
			o.Status = "active"
		}

		orders = append(orders, o)
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
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(context.Background())

	qtx := h.db.Queries.WithTx(tx)

	orderRow, err := qtx.GetOrderForCancel(context.Background(), sqlc.GetOrderForCancelParams{
		ID:     int32(orderID),
		UserID: int32(userID),
	})

	if err != nil {
		jsonError(w, "Order not found", http.StatusNotFound)
		return
	}
	status := orderRow.Status
	amountCents := int(orderRow.AmountCents)
	providerOrderID := orderRow.ProviderOrderID

	if status == "canceled" || status == "completed" {
		jsonError(w, "Order already finalized", http.StatusBadRequest)
		return
	}

	if providerOrderID != "" {
		var providerRespJSON string
		resp, err := h.smm.CancelOrder(providerOrderID)
		if err == nil && resp != nil {
			log.Printf("Provider cancel response for #%s: %v", providerOrderID, resp)
			b, _ := json.Marshal(resp)
			providerRespJSON = string(b)
		} else {
			log.Printf("Provider cancel failed/unsupported for #%s: %v", providerOrderID, err)
			providerRespJSON = fmt.Sprintf(`{"error": "%v"}`, err)
		}

		_, err = qtx.CreateOrderRequest(context.Background(), sqlc.CreateOrderRequestParams{
			OrderID:          int32(orderID),
			UserID:           int32(userID),
			RequestType:      "cancel",
			ProviderResponse: pgtype.Text{String: providerRespJSON, Valid: providerRespJSON != ""},
		})
		if err != nil {
			log.Printf("Failed to create cancel request: %v", err)
			jsonError(w, "Failed to submit cancellation request", http.StatusInternalServerError)
			return
		}
		
		tx.Commit(context.Background())
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":     "success",
			"message":    "Cancellation request submitted. Our team will review it.",
		})
		return
	}

	err = qtx.CancelOrder(context.Background(), int32(orderID))
	if err != nil {
		jsonError(w, "Failed to update order", http.StatusInternalServerError)
		return
	}

	err = qtx.UpsertWalletBalance(context.Background(), sqlc.UpsertWalletBalanceParams{
		UserID:  int32(userID),
		Balance: int32(amountCents),
	})
	if err != nil {
		log.Printf("Refund failed: %v", err)
		jsonError(w, "Refund process failed", http.StatusInternalServerError)
		return
	}

	newBalance, _ := qtx.GetWalletBalance(context.Background(), int32(userID))

	refundAmount := float64(amountCents) / 100.0
	err = qtx.InsertTransaction(context.Background(), sqlc.InsertTransactionParams{
		UserID:      pgtype.Int4{Int32: int32(userID), Valid: true},
		Amount:      func() pgtype.Numeric { n := pgtype.Numeric{}; n.Scan(fmt.Sprintf("%f", refundAmount)); return n }(),
		Type:        "credit",
		Description: pgtype.Text{String: fmt.Sprintf("Refund for Order #%d", orderID), Valid: true},
	})

	if err != nil {
		jsonError(w, "Transaction log failed", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(context.Background()); err != nil {
		jsonError(w, "Commit failed", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":     "success",
		"message":    "Order canceled and refunded",
		"newBalance": float64(newBalance) / 100.0,
	})
}

// RefillOrder attempts to refill an order
func (h *Handler) RefillOrder(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int)
	orderIDStr := chi.URLParam(r, "id")
	orderID, _ := strconv.Atoi(orderIDStr)

	tx, err := h.db.Pool.Begin(context.Background())
	if err != nil {
		jsonError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(context.Background())

	qtx := h.db.Queries.WithTx(tx)

	orderRow, err := qtx.GetOrderForCancel(context.Background(), sqlc.GetOrderForCancelParams{
		ID:     int32(orderID),
		UserID: int32(userID),
	})
	if err != nil {
		jsonError(w, "Order not found", http.StatusNotFound)
		return
	}
	providerOrderID := orderRow.ProviderOrderID

	pending, err := qtx.GetPendingOrderRequestsByOrder(context.Background(), int32(orderID))
	if err == nil {
		for _, req := range pending {
			if req.RequestType == "refill" {
				jsonError(w, "Refill request already pending", http.StatusBadRequest)
				return
			}
		}
	}

	var providerRespJSON string
	if providerOrderID != "" {
		resp, err := h.smm.RefillOrder(providerOrderID)
		if err == nil && resp != nil {
			log.Printf("Provider refill response for #%s: %v", providerOrderID, resp)
			b, _ := json.Marshal(resp)
			providerRespJSON = string(b)
			
			// If provider rejected it, return the error directly and don't deduct refills
			if errorMsg, ok := resp["error"].(string); ok {
				jsonError(w, errorMsg, http.StatusBadRequest)
				return
			}
		} else {
			log.Printf("Provider refill failed/unsupported for #%s: %v", providerOrderID, err)
			providerRespJSON = fmt.Sprintf(`{"error": "%v"}`, err)
		}
	}

	_, err = qtx.CreateOrderRequest(context.Background(), sqlc.CreateOrderRequestParams{
		OrderID:          int32(orderID),
		UserID:           int32(userID),
		RequestType:      "refill",
		ProviderResponse: pgtype.Text{String: providerRespJSON, Valid: providerRespJSON != ""},
	})
	if err != nil {
		log.Printf("Failed to create refill request: %v", err)
		jsonError(w, "Failed to submit refill request", http.StatusInternalServerError)
		return
	}
	
	err = qtx.DecrementOrderRefills(context.Background(), int32(orderID))
	if err != nil {
		log.Printf("Failed to decrement refills: %v", err)
	}

	if err := tx.Commit(context.Background()); err != nil {
		jsonError(w, "Commit failed", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "Refill request submitted. Our team will review it.",
	})
}
