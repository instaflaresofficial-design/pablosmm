package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5/pgtype"
	"pablosmm/backend/internal/db/sqlc"

	"github.com/go-chi/chi/v5"
)

type CatalogServicePayload struct {
	Name              string  `json:"name"`
	VariantName       string  `json:"variantName"`
	SellPriceInr      float64 `json:"sellPriceInr"`
	Platform          string  `json:"platform"`
	Category          string  `json:"category"`
	ProviderID        string  `json:"providerId"`
	ProviderServiceID string  `json:"providerServiceId"`
	IsActive          bool    `json:"isActive"`
}

type CatalogServiceResponse struct {
	ID                int32   `json:"id"`
	Name              string  `json:"name"`
	VariantName       string  `json:"variant_name"`
	SellPriceInr      float64 `json:"sell_price_inr"`
	Platform          string  `json:"platform"`
	Category          string  `json:"category"`
	IsActive          bool    `json:"is_active"`
	ProviderID        string  `json:"provider_id"`
	ProviderServiceID string  `json:"provider_service_id"`
}

func (h *Handler) GetCatalogServicesAdmin(w http.ResponseWriter, r *http.Request) {
	services, err := h.db.Queries.GetActiveCatalogServices(context.Background())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var res []CatalogServiceResponse
	for _, s := range services {
		var price float64
		if s.SellPriceInr.Valid {
			f, _ := s.SellPriceInr.Float64Value()
			price = f.Float64
		}
		res = append(res, CatalogServiceResponse{
			ID:                s.ID,
			Name:              s.Name,
			VariantName:       s.VariantName.String,
			SellPriceInr:      price,
			Platform:          s.Platform.String,
			Category:          s.Category.String,
			IsActive:          s.IsActive.Bool,
			ProviderID:        s.ProviderID.String,
			ProviderServiceID: s.ProviderServiceID.String,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

func (h *Handler) CreateCatalogServiceAdmin(w http.ResponseWriter, r *http.Request) {
	var p CatalogServicePayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	// For pgtype.Numeric
	priceNumeric := pgtype.Numeric{}
	priceNumeric.Scan(strconv.FormatFloat(p.SellPriceInr, 'f', 2, 64))

	service, err := h.db.Queries.CreateCatalogService(context.Background(), sqlc.CreateCatalogServiceParams{
		Name:              p.Name,
		VariantName:       pgtype.Text{String: p.VariantName, Valid: p.VariantName != ""},
		SellPriceInr:      priceNumeric,
		Platform:          pgtype.Text{String: p.Platform, Valid: p.Platform != ""},
		Category:          pgtype.Text{String: p.Category, Valid: p.Category != ""},
		ProviderID:        pgtype.Text{String: p.ProviderID, Valid: p.ProviderID != ""},
		ProviderServiceID: pgtype.Text{String: p.ProviderServiceID, Valid: p.ProviderServiceID != ""},
		IsActive:          pgtype.Bool{Bool: p.IsActive, Valid: true},
	})

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.smm.InvalidateCache()
	json.NewEncoder(w).Encode(service)
}

func (h *Handler) UpdateCatalogServiceAdmin(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var p CatalogServicePayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	priceNumeric := pgtype.Numeric{}
	priceNumeric.Scan(strconv.FormatFloat(p.SellPriceInr, 'f', 2, 64))

	service, err := h.db.Queries.UpdateCatalogService(context.Background(), sqlc.UpdateCatalogServiceParams{
		ID:                int32(id),
		Name:              p.Name,
		VariantName:       pgtype.Text{String: p.VariantName, Valid: p.VariantName != ""},
		SellPriceInr:      priceNumeric,
		Platform:          pgtype.Text{String: p.Platform, Valid: p.Platform != ""},
		Category:          pgtype.Text{String: p.Category, Valid: p.Category != ""},
		ProviderID:        pgtype.Text{String: p.ProviderID, Valid: p.ProviderID != ""},
		ProviderServiceID: pgtype.Text{String: p.ProviderServiceID, Valid: p.ProviderServiceID != ""},
		IsActive:          pgtype.Bool{Bool: p.IsActive, Valid: true},
	})

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.smm.InvalidateCache()
	json.NewEncoder(w).Encode(service)
}

func (h *Handler) DeleteCatalogServiceAdmin(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	err = h.db.Queries.DeleteCatalogService(context.Background(), int32(id))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.smm.InvalidateCache()
	w.WriteHeader(http.StatusOK)
}
