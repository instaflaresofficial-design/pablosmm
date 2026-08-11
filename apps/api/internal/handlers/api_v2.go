package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"pablosmm/backend/internal/db/sqlc"
	"pablosmm/backend/internal/service/smm"
	
	"github.com/jackc/pgx/v5/pgtype"
)

// GenerateAPIKey generates a new key and updates the user
func (h *Handler) GenerateAPIKey(w http.ResponseWriter, r *http.Request) {
	userIDVal := r.Context().Value("userID")
	if userIDVal == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	userID := userIDVal.(int)

	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		http.Error(w, "Failed to generate key", http.StatusInternalServerError)
		return
	}
	newKey := hex.EncodeToString(bytes)

	err := h.db.Queries.GenerateAPIKey(r.Context(), sqlc.GenerateAPIKeyParams{
		ApiKey: pgtype.Text{String: newKey, Valid: true},
		ID:     int32(userID),
	})
	if err != nil {
		http.Error(w, "Failed to update API key", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"api_key": newKey})
}

// SmmApiV2 implements the standard SMM /api/v2 endpoint
func (h *Handler) SmmApiV2(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if err := r.ParseForm(); err != nil {
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	key := r.FormValue("key")
	action := r.FormValue("action")

	if key == "" || action == "" {
		json.NewEncoder(w).Encode(map[string]string{"error": "Incorrect request"})
		return
	}

	var userID int
	var balanceCents int
	userRow, err := h.db.Queries.GetUserByAPIKey(r.Context(), pgtype.Text{String: key, Valid: true})
	userID = int(userRow.ID)
	balanceCents = int(userRow.Balance)

	if err != nil {
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid API key"})
		return
	}

	switch action {
	case "balance":
		json.NewEncoder(w).Encode(map[string]string{
			"balance":  fmt.Sprintf("%.4f", float64(balanceCents)/100.0),
			"currency": "INR", // Internal base is INR
		})
		return

	case "services":
		services, err := h.smm.FetchServices()
		if err != nil {
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to retrieve services"})
			return
		}

		type ApiServiceOutput struct {
			Service  string `json:"service"`
			Name     string `json:"name"`
			Type     string `json:"type"`
			Category string `json:"category"`
			Rate     string `json:"rate"`
			Min      string `json:"min"`
			Max      string `json:"max"`
			Dripfeed bool   `json:"dripfeed"`
			Refill   bool   `json:"refill"`
			Cancel   bool   `json:"cancel"`
		}

		var res []ApiServiceOutput
		for _, s := range services {
			// SMM panels expect price corresponding to wallet. Wallet is INR based. Let's return price in INR.
			rateINR := s.RatePer1000
			
			name := s.DisplayName
			if name == "" {
				name = s.ProviderName
			}
			
			res = append(res, ApiServiceOutput{
				Service:  s.ID,
				Name:     name,
				Type:     "Default",
				Category: s.Category,
				Rate:     fmt.Sprintf("%.4f", rateINR),
				Min:      strconv.Itoa(s.Min),
				Max:      strconv.Itoa(s.Max),
				Dripfeed: s.Dripfeed,
				Refill:   s.Refill,
				Cancel:   s.Cancel,
			})
		}
		json.NewEncoder(w).Encode(res)
		return

	case "status":
		orderIDStr := r.FormValue("order")
		// orderIDs := r.FormValue("orders") // multi-status not fully supported for now, just fallback to single if provided multiple

		if orderIDStr != "" {
			// Extract just the first if multiple provided improperly
			if strings.Contains(orderIDStr, ",") {
				orderIDStr = strings.Split(orderIDStr, ",")[0]
			}

			orderID, err := strconv.Atoi(orderIDStr)
			if err != nil {
				json.NewEncoder(w).Encode(map[string]string{"error": "Incorrect order ID"})
				return
			}
			
			var oCharge int
			var oStartCount int
			var oStatus string
			var oRemains int
			oRow, err := h.db.Queries.GetOrderStatusForAPI(r.Context(), sqlc.GetOrderStatusForAPIParams{
				ID:     int32(orderID),
				UserID: int32(userID),
			})
			oCharge = int(oRow.AmountCents)
			oStartCount = int(oRow.StartCount)
			oStatus = oRow.Status
			oRemains = int(oRow.Remains)
			
			if err != nil {
				json.NewEncoder(w).Encode(map[string]string{"error": "Incorrect order ID"})
				return
			}
			
			statusMap := map[string]string{
				"pending": "Pending",
				"processing": "Processing",
				"in_progress": "In progress",
				"completed": "Completed",
				"partial": "Partial",
				"canceled": "Canceled",
				"refunded": "Refunded",
				"failed": "Fail",
				"submitted": "In progress",
				"active": "In progress",
			}
			mappedStatus, exists := statusMap[oStatus]
			if !exists { mappedStatus = "Pending" }
			
			json.NewEncoder(w).Encode(map[string]string{
				"charge":      fmt.Sprintf("%.4f", float64(oCharge)/100.0),
				"start_count": strconv.Itoa(oStartCount),
				"status":      mappedStatus,
				"remains":     strconv.Itoa(oRemains),
				"currency":    "INR",
			})
			return
		}
		json.NewEncoder(w).Encode(map[string]string{"error": "Incorrect request"})
		return

	case "add":
		serviceID := r.FormValue("service")
		link := r.FormValue("link")
		quantityStr := r.FormValue("quantity")
		
		if serviceID == "" || link == "" || quantityStr == "" {
			json.NewEncoder(w).Encode(map[string]string{"error": "Incorrect request"})
			return
		}
		
		quantity, err := strconv.Atoi(quantityStr)
		if err != nil || quantity <= 0 {
			json.NewEncoder(w).Encode(map[string]string{"error": "Incorrect quantity"})
			return
		}
		
		services, err := h.smm.FetchServices()
		if err != nil {
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to retrieve service data"})
			return
		}
		
		var selectedService *smm.NormalizedSmmService
		for _, s := range services {
			if s.ID == serviceID {
				selectedService = &s
				break
			}
		}
		
		if selectedService == nil {
			json.NewEncoder(w).Encode(map[string]string{"error": "Service not found"})
			return
		}
		
		if quantity < selectedService.Min || quantity > selectedService.Max {
			json.NewEncoder(w).Encode(map[string]string{"error": "Incorrect quantity"})
			return
		}
		
		rateINR := selectedService.RatePer1000
		totalINR := (rateINR * float64(quantity)) / 1000.0
		amountCents := int(totalINR * 100) 
		if amountCents <= 0 { amountCents = 1 }
		
		if balanceCents < amountCents {
			json.NewEncoder(w).Encode(map[string]string{"error": "Not enough funds on balance"})
			return
		}
		
		if err := validateLink(selectedService.Platform, selectedService.ServiceType, link); err != nil {
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}
		
		tx, err := h.db.Pool.Begin(context.Background())
		if err != nil {
			json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
			return
		}
		defer tx.Rollback(context.Background())
		
		qtx := h.db.Queries.WithTx(tx)
		
		err = qtx.DebitWallet(context.Background(), sqlc.DebitWalletParams{
			Balance: int32(amountCents),
			UserID: int32(userID),
		})
		if err != nil {
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to debit wallet"})
			return
		}
		
		var newOrderID int32
		newOrderID, err = qtx.InsertAPIOrder(context.Background(), sqlc.InsertAPIOrderParams{
			UserID:      int32(userID),
			ServiceID:   selectedService.ID,
			Quantity:    int32(quantity),
			AmountCents: int32(amountCents),
			Status:      "pending",
			Link:        pgtype.Text{String: link, Valid: true},
		})
		if err != nil {
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create order"})
			return
		}
		
		tx.Commit(context.Background())
		
		resp, placeErr := h.smm.PlaceOrder(selectedService.Source, selectedService.SourceServiceID, quantityStr, link)
		var providerError string
		if placeErr != nil {
			providerError = placeErr.Error()
		} else if errStr, ok := resp["error"].(string); ok && errStr != "" {
			providerError = errStr
		}
		
		if providerError != "" {
			rtx, _ := h.db.Pool.Begin(context.Background())
			if rtx != nil {
				qrtx := h.db.Queries.WithTx(rtx)
				qrtx.CreditWallet(context.Background(), sqlc.CreditWalletParams{
					Balance: int32(amountCents),
					UserID: int32(userID),
				})
				qrtx.UpdateAPIOrderStatusFailed(context.Background(), newOrderID)
				rtx.Commit(context.Background())
			}
			json.NewEncoder(w).Encode(map[string]string{"error": providerError})
			return
		}
		
		respJSON, _ := json.Marshal(resp)
		var providerOrderID string
		if id, ok := resp["order"].(string); ok { 
			providerOrderID = id 
		} else if id, ok := resp["order"].(float64); ok { 
			providerOrderID = fmt.Sprintf("%.0f", id) 
		} else {
			providerOrderID = fmt.Sprintf("%v", resp["order"])
		}
		
		h.db.Queries.UpdateAPIOrderStatusSubmitted(context.Background(), sqlc.UpdateAPIOrderStatusSubmittedParams{
			ProviderResp:    respJSON,
			ProviderOrderID: pgtype.Text{String: providerOrderID, Valid: true},
			Status:          "submitted",
			ID:              newOrderID,
		})
			
		json.NewEncoder(w).Encode(map[string]interface{}{"order": newOrderID})
		return

	default:
		json.NewEncoder(w).Encode(map[string]string{"error": "Incorrect request"})
		return
	}
}
