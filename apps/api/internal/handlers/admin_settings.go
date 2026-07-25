package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"pablosmm/backend/internal/db/sqlc"
)

func (h *Handler) GetSettings(w http.ResponseWriter, r *http.Request) {
	// Only admin allowed, which should be protected by middleware in server.go
	
	settings, err := h.db.Queries.GetAllSettings(context.Background())
	if err != nil {
		http.Error(w, "Failed to get settings", http.StatusInternalServerError)
		return
	}

	// Map settings for easy JSON consumption
	resp := make(map[string]string)
	for _, s := range settings {
		resp[s.Key] = s.Value
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var payload map[string]string
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	ctx := context.Background()

	// Update each setting
	for key, value := range payload {
		err := h.db.Queries.UpsertSetting(ctx, sqlc.UpsertSettingParams{
			Key:   key,
			Value: value,
		})
		if err != nil {
			http.Error(w, "Failed to update setting: "+key, http.StatusInternalServerError)
			return
		}
	}

	h.GetSettings(w, r)
}
