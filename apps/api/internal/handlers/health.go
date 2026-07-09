package handlers

import (
	"encoding/json"
	"log"
	"net/http"
)

// HealthCheck is a simple endpoint to test connectivity
func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	log.Printf("🏥 [HealthCheck] Request from: %s | Origin: %s | User-Agent: %s",
		r.RemoteAddr,
		r.Header.Get("Origin"),
		r.Header.Get("User-Agent"))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "ok",
		"message": "Backend is reachable!",
		"your_ip": r.RemoteAddr,
	})
}
