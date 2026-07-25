package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"pablosmm/backend/internal/db/sqlc"
)

// GetAdminOrderRequests returns pending order requests for admin
func (h *Handler) GetAdminOrderRequests(w http.ResponseWriter, r *http.Request) {
	requests, err := h.db.Queries.ListPendingOrderRequests(context.Background())
	if err != nil {
		log.Printf("Failed to list order requests: %v", err)
		http.Error(w, "Failed to load requests", http.StatusInternalServerError)
		return
	}

	type mappedReq struct {
		ID               int32  `json:"id"`
		OrderID          int32  `json:"order_id"`
		UserID           int32  `json:"user_id"`
		RequestType      string `json:"request_type"`
		Status           string `json:"status"`
		CreatedAt        string `json:"created_at"`
		UpdatedAt        string `json:"updated_at"`
		ProviderResponse string `json:"provider_response"`
		ServiceID        string `json:"service_id"`
		Quantity         int32  `json:"quantity"`
		ProviderOrderID  string `json:"provider_order_id"`
		OrderStatus      string `json:"order_status"`
		Email            string `json:"email"`
		Username         string `json:"username"`
	}

	res := make([]mappedReq, len(requests))
	for i, req := range requests {
		res[i] = mappedReq{
			ID:               req.ID,
			OrderID:          req.OrderID,
			UserID:           req.UserID,
			RequestType:      req.RequestType,
			Status:           req.Status.String,
			CreatedAt:        req.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:        req.UpdatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
			ProviderResponse: req.ProviderResponse.String,
			ServiceID:        req.ServiceID,
			Quantity:         req.Quantity,
			ProviderOrderID:  req.ProviderOrderID.String,
			OrderStatus:      req.OrderStatus,
			Email:            req.Email.String,
			Username:         req.Username.String,
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"requests": res,
	})
}

func (h *Handler) ApproveOrderRequest(w http.ResponseWriter, r *http.Request) {
	reqIDStr := chi.URLParam(r, "id")
	reqID, _ := strconv.Atoi(reqIDStr)

	err := h.db.Queries.UpdateOrderRequestStatus(context.Background(), sqlc.UpdateOrderRequestStatusParams{
		ID:     int32(reqID),
		Status: pgtype.Text{String: "approved", Valid: true},
	})

	if err != nil {
		log.Printf("Failed to approve request: %v", err)
		http.Error(w, "Failed to approve request", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
	})
}

func (h *Handler) RejectOrderRequest(w http.ResponseWriter, r *http.Request) {
	reqIDStr := chi.URLParam(r, "id")
	reqID, _ := strconv.Atoi(reqIDStr)

	err := h.db.Queries.UpdateOrderRequestStatus(context.Background(), sqlc.UpdateOrderRequestStatusParams{
		ID:     int32(reqID),
		Status: pgtype.Text{String: "rejected", Valid: true},
	})

	if err != nil {
		log.Printf("Failed to reject request: %v", err)
		http.Error(w, "Failed to reject request", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
	})
}
