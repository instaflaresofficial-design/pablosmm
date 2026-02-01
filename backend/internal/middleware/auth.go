package middleware

import (
	"context"
	"net/http"
)

type contextKey string

const UserEmailKey contextKey = "userEmail"

func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		email := r.Header.Get("x-user-email")
		if email == "" {
			// In production, you would check for a JWT or Session token here
			// and probably return an error if missing.
			// For now, we allow it to pass so handlers can handle it or use placeholders.
		}

		ctx := context.WithValue(r.Context(), UserEmailKey, email)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
