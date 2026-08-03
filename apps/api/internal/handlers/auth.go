package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"pablosmm/backend/internal/db/sqlc"
)

var jwtKey = []byte(os.Getenv("JWT_SECRET"))
var googleOauthConfig *oauth2.Config

// InitAuth ensures JWT secret is available and Oauth is configured
func InitAuth() {
	// Re-check env in case it was loaded after global init
	if secret := os.Getenv("JWT_SECRET"); secret != "" {
		jwtKey = []byte(secret)
	}

	if len(jwtKey) == 0 {
		jwtKey = []byte("super-secret-default-key-change-me") // Fallback for dev
		log.Println("WARNING: JWT_SECRET not set, using default.")
	}

	// We assume backend is on port 8080 or use env
	apiBase := os.Getenv("API_BASE_URL")
	if apiBase == "" {
		apiBase = "http://localhost:8080"
	}

	googleOauthConfig = &oauth2.Config{
		RedirectURL:  fmt.Sprintf("%s/api/auth/google/callback", apiBase),
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
		Endpoint:     google.Endpoint,
	}
}

type RegisterReq struct {
	FullName string `json:"fullName"`
	Email    string `json:"email"`
	Username string `json:"username"`
	Mobile   string `json:"mobile"`
	Password string `json:"password"`
}

type LoginReq struct {
	Login    string `json:"login"` // Email or Username
	Password string `json:"password"`
}

type Claims struct {
	UserID int    `json:"userId"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// Register creates a new user
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" || req.Username == "" {
		http.Error(w, "Email, Username and Password are required", http.StatusBadRequest)
		return
	}

	// Check if user exists
	exists, err := h.db.Queries.CheckUserExists(context.Background(), sqlc.CheckUserExistsParams{
		Email:    pgtype.Text{String: req.Email, Valid: true},
		Username: pgtype.Text{String: req.Username, Valid: true},
	})
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if exists {
		http.Error(w, "User with this email or username already exists", http.StatusConflict)
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	// Insert user
	// Assuming 'role' defaults to 'user' in DB or we set it explicitly
	err = h.db.Queries.CreateUser(context.Background(), sqlc.CreateUserParams{
		Name:         pgtype.Text{String: req.FullName, Valid: req.FullName != ""},
		Email:        pgtype.Text{String: req.Email, Valid: true},
		Username:     pgtype.Text{String: req.Username, Valid: true},
		Mobile:       pgtype.Text{String: req.Mobile, Valid: req.Mobile != ""},
		PasswordHash: pgtype.Text{String: string(hashedPassword), Valid: true},
	})

	if err != nil {
		log.Printf("Registration failed: %v", err)
		http.Error(w, "Failed to register user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "User registered successfully"})
}

// Login authenticates a user
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var user struct {
		ID           int
		PasswordHash string
		Role         string
	}

	// Find by email OR username
	userRow, err := h.db.Queries.GetUserForLogin(context.Background(), pgtype.Text{String: req.Login, Valid: true})
	user.ID = int(userRow.ID)
	user.PasswordHash = userRow.PasswordHash.String
	user.Role = userRow.Role

	if err != nil {
		// Simple error masking
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Generate JWT
	expirationTime := time.Now().Add(24 * time.Hour * 7) // 7 days
	claims := &Claims{
		UserID: user.ID,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	// Set Cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    tokenString,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
		// Secure: true, // Uncomment in production with HTTPS
	})

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"user": map[string]interface{}{
			"id":   user.ID,
			"role": user.Role,
		},
	})
}

// Logout clears the auth cookie
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HttpOnly: true,
		Path:     "/",
	})
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// Me returns the current authenticated user
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	// Log request details for debugging mobile issues
	log.Printf("📱 [Me] Request from: %s | Origin: %s | User-Agent: %s",
		r.RemoteAddr,
		r.Header.Get("Origin"),
		r.Header.Get("User-Agent"))

	// UserID is injected by middleware
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		log.Printf("❌ [Me] No userID in context - Unauthorized")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	log.Printf("🔍 [Me] Fetching user data for userID: %d", userID)

	var u AdminUser // Reusing struct from users.go
	var balanceCents int
	var totalSpendCents int
	var createdAtTime interface{}
	var passwordHash string // Check if password is set

	uRow, err := h.db.Queries.GetUserDataForMe(context.Background(), int32(userID))
	if err == nil {
		u.ID = int(uRow.ID)
		u.Name = uRow.Name.String
		u.Username = uRow.Username
		u.Email = uRow.Email.String
		u.Mobile = uRow.Mobile
		u.Role = uRow.Role
		u.Currency = uRow.Currency
		createdAtTime = uRow.CreatedAt.Time
		passwordHash = uRow.PasswordHash
		balanceCents = int(uRow.Balance)
		u.OrderCount = int(uRow.OrderCount)
		totalSpendCents = int(uRow.TotalSpend)
	}

	if err != nil {
		log.Printf("❌ [Me] Error fetching user %d: %v", userID, err)
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	log.Printf("✅ [Me] Successfully fetched user %d (%s)", userID, u.Email)

	u.Balance = float64(balanceCents) / 100.0
	u.TotalSpend = float64(totalSpendCents) / 100.0
	u.CreatedAt = fmt.Sprintf("%v", createdAtTime)

	// Fetch detailed order stats (same as GetProfile)
	var stats struct {
		Active    int `json:"active"`
		Completed int `json:"completed"`
		Failed    int `json:"failed"`
	}

	statsRow, err := h.db.Queries.GetOrderStatsForUser(context.Background(), int32(userID))
	if err == nil {
		stats.Active = int(statsRow.ActiveCount)
		stats.Completed = int(statsRow.CompletedCount)
		stats.Failed = int(statsRow.FailedCount)
	}

	if err != nil {
		log.Printf("Failed to fetch order stats for user %d: %v", userID, err)
		// Don't fail the response, just zero stats
	}

	// Get current FX rate
	fxRate := h.fx.GetUsdToInr()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"user": map[string]interface{}{
			"id":          u.ID,
			"name":        u.Name,
			"username":    u.Username,
			"email":       u.Email,
			"mobile":      u.Mobile,
			"role":        u.Role,
			"currency":    u.Currency,
			"balance":     u.Balance,
			"totalSpend":  u.TotalSpend,
			"orderCount":  u.OrderCount,
			"stats":       stats,
			"hasPassword": passwordHash != "",
		},
		"fxRate": fxRate,
	})
}

// GoogleLogin redirects to Google
func (h *Handler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	url := googleOauthConfig.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// GoogleCallback handles the callback from Google
func (h *Handler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	token, err := googleOauthConfig.Exchange(context.Background(), code)
	if err != nil {
		http.Error(w, "Code exchange failed", http.StatusInternalServerError)
		return
	}

	resp, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + token.AccessToken)
	if err != nil {
		http.Error(w, "User info failed", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	content, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Parse failed", http.StatusInternalServerError)
		return
	}

	var googleUser struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}

	if err := json.Unmarshal(content, &googleUser); err != nil {
		http.Error(w, "Unmarshal failed", http.StatusInternalServerError)
		return
	}

	// Upsert User Logic (Fail-safe)
	var userID int
	var role string

	// 1. Check if user exists by email or google_id
	gUserRow, err := h.db.Queries.CheckGoogleUser(context.Background(), sqlc.CheckGoogleUserParams{
		Email:    pgtype.Text{String: googleUser.Email, Valid: true},
		GoogleID: pgtype.Text{String: googleUser.ID, Valid: true},
	})
	userID = int(gUserRow.ID)
	role = gUserRow.Role

	if err == nil {
		// User exists: Update Google info
		err = h.db.Queries.UpdateGoogleInfo(context.Background(), sqlc.UpdateGoogleInfoParams{
			GoogleID:  pgtype.Text{String: googleUser.ID, Valid: true},
			AvatarUrl: pgtype.Text{String: googleUser.Picture, Valid: true},
			ID:        int32(userID),
		})
		if err != nil {
			log.Printf("Failed to update user: %v", err)
			// Continue anyway, just login
		}
	} else {
		// User does not exist: Create new user
		// Generate unique username
		baseName := strings.Split(googleUser.Email, "@")[0]
		// Sanitize baseName
		baseName = strings.ReplaceAll(baseName, ".", "_")
		username := fmt.Sprintf("%s_%d", baseName, time.Now().Unix()) // e.g. digxofficial_1700000000

		newUserRow, err := h.db.Queries.CreateGoogleUser(context.Background(), sqlc.CreateGoogleUserParams{
			Name:      pgtype.Text{String: googleUser.Name, Valid: true},
			Email:     pgtype.Text{String: googleUser.Email, Valid: true},
			GoogleID:  pgtype.Text{String: googleUser.ID, Valid: true},
			AvatarUrl: pgtype.Text{String: googleUser.Picture, Valid: true},
			Username:  pgtype.Text{String: username, Valid: true},
		})
		userID = int(newUserRow.ID)
		role = newUserRow.Role

		if err != nil {
			log.Printf("Google registration failed: %v", err)
			http.Error(w, "Registration failed", http.StatusInternalServerError)
			return
		}
	}

	// Generate JWT
	expirationTime := time.Now().Add(24 * time.Hour * 7)
	claims := &Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	jwtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := jwtToken.SignedString(jwtKey)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	// Set Cookie with production-safe settings
	// For dev/mobile debugging over HTTP, we must disable Secure and use Lax
	isProd := os.Getenv("APP_ENV") == "production"

	cookie := &http.Cookie{
		Name:     "auth_token",
		Value:    tokenString,
		Expires:  expirationTime,
		HttpOnly: true,
		Secure:   isProd,               // Only true in prod
		SameSite: http.SameSiteLaxMode, // Lax works for HTTP same-site (or proxied)
		Path:     "/",
	}

	// If we are on production, set the Domain to .pablosmm.com to allow sharing between api. and root
	if strings.Contains(os.Getenv("FRONTEND_URL"), "pablosmm.com") {
		cookie.Domain = ".pablosmm.com"
	}

	http.SetCookie(w, cookie)

	// Redirect to frontend profile
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}
	http.Redirect(w, r, fmt.Sprintf("%s/profile", frontendURL), http.StatusTemporaryRedirect)
}

// AuthMiddleware validates JWT and sets context
func (h *Handler) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("🔐 [AuthMiddleware] Request to %s from %s", r.URL.Path, r.RemoteAddr)

		cookie, err := r.Cookie("auth_token")
		if err != nil {
			if err == http.ErrNoCookie {
				log.Printf("❌ [AuthMiddleware] No auth_token cookie found")
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized: No session cookie"})
				return
			}
			log.Printf("❌ [AuthMiddleware] Cookie error: %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Bad request"})
			return
		}

		log.Printf("🍪 [AuthMiddleware] auth_token cookie found, validating...")
		tokenStr := cookie.Value
		claims := &Claims{}

		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err != nil {
			log.Printf("❌ [AuthMiddleware] Token parse error: %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized: Invalid token"})
			return
		}

		if !token.Valid {
			log.Printf("❌ [AuthMiddleware] Token is not valid")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized: Token invalid"})
			return
		}

		log.Printf("✅ [AuthMiddleware] Authenticated user %d (role: %s)", claims.UserID, claims.Role)

		// Pass user ID to context
		ctx := context.WithValue(r.Context(), "userID", claims.UserID)
		ctx = context.WithValue(ctx, "userRole", claims.Role)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

type ChangePasswordReq struct {
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"password"` // Changed from NewPassword to password for consistency
}

// ChangePassword updates the user's password
func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int)

	var req ChangePasswordReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.NewPassword == "" || len(req.NewPassword) < 6 {
		http.Error(w, "New password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	// 1. Get current password hash
	currentHash, err := h.db.Queries.GetPasswordHash(context.Background(), int32(userID))
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// 2. Verify old password ONLY if current hash is not empty
	if currentHash != "" {
		if req.OldPassword == "" {
			http.Error(w, "Old password is required", http.StatusUnauthorized)
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(req.OldPassword)); err != nil {
			http.Error(w, "Incorrect old password", http.StatusUnauthorized)
			return
		}
	} else {
		// If no current password, we skip verification
		log.Printf("User %d has no password set, allowing creation", userID)
	}

	// 3. Hash new password
	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	// 4. Update DB
	err = h.db.Queries.UpdatePassword(context.Background(), sqlc.UpdatePasswordParams{
		PasswordHash: pgtype.Text{String: string(newHash), Valid: true},
		ID:           int32(userID),
	})
	if err != nil {
		http.Error(w, "Failed to update password", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Password changed successfully"})
}

// AdminAuthMiddleware validates JWT and enforces role == "admin"
func (h *Handler) AdminAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var tokenStr string

		// 1. Check Cookie
		if cookie, err := r.Cookie("auth_token"); err == nil && cookie.Value != "" {
			tokenStr = cookie.Value
		} else {
			// 2. Check Authorization Header
			authHeader := r.Header.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
			}
		}

		if tokenStr == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized: Admin authentication required"})
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized: Invalid or expired token"})
			return
		}

		// Verify role in database for maximum security
		var currentRole string
		err = h.db.Pool.QueryRow(context.Background(), "SELECT role FROM users WHERE id = $1", claims.UserID).Scan(&currentRole)
		if err != nil || currentRole != "admin" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{"error": "Forbidden: Admin privileges required"})
			return
		}

		ctx := context.WithValue(r.Context(), "userID", claims.UserID)
		ctx = context.WithValue(ctx, "userRole", "admin")
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// AdminLogin authenticates an admin user specifically
func (h *Handler) AdminLogin(w http.ResponseWriter, r *http.Request) {
	var req LoginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	loginStr := strings.TrimSpace(req.Login)
	if loginStr == "" || req.Password == "" {
		http.Error(w, "ID/Username/Email and Password are required", http.StatusBadRequest)
		return
	}

	userRow, err := h.db.Queries.GetUserForLogin(context.Background(), pgtype.Text{String: loginStr, Valid: true})
	if err != nil {
		http.Error(w, "Invalid Admin ID or Password", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(userRow.PasswordHash.String), []byte(req.Password)); err != nil {
		http.Error(w, "Invalid Admin ID or Password", http.StatusUnauthorized)
		return
	}

	if userRow.Role != "admin" {
		http.Error(w, "Access Denied: Account does not have admin privileges", http.StatusForbidden)
		return
	}

	expirationTime := time.Now().Add(24 * time.Hour * 7)
	claims := &Claims{
		UserID: int(userRow.ID),
		Role:   "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	isProd := os.Getenv("APP_ENV") == "production"
	cookie := &http.Cookie{
		Name:     "auth_token",
		Value:    tokenString,
		Expires:  expirationTime,
		HttpOnly: true,
		Secure:   isProd,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
	}

	if strings.Contains(os.Getenv("FRONTEND_URL"), "pablosmm.com") {
		cookie.Domain = ".pablosmm.com"
	}

	http.SetCookie(w, cookie)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"token":  tokenString,
		"user": map[string]interface{}{
			"id":   userRow.ID,
			"role": "admin",
		},
	})
}

// EnsureDefaultAdminUser creates or promotes the default admin account if no admin exists
func (h *Handler) EnsureDefaultAdminUser() {
	var count int
	err := h.db.Pool.QueryRow(context.Background(), "SELECT COUNT(*) FROM users WHERE role = 'admin'").Scan(&count)
	if err == nil && count > 0 {
		return
	}

	adminUsername := getEnvOrDefault("ADMIN_USERNAME", "admin")
	adminEmail := getEnvOrDefault("ADMIN_EMAIL", "admin@pablosmm.com")
	adminPassword := getEnvOrDefault("ADMIN_PASSWORD", "admin123456")

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("ERROR: Failed to hash admin password: %v", err)
		return
	}

	var newAdminID int32
	err = h.db.Pool.QueryRow(context.Background(),
		`INSERT INTO users (name, email, username, password_hash, role)
		 VALUES ($1, $2, $3, $4, 'admin')
		 ON CONFLICT (username) DO UPDATE SET role = 'admin', password_hash = EXCLUDED.password_hash
		 RETURNING id`,
		"Administrator", adminEmail, adminUsername, string(hashedPassword),
	).Scan(&newAdminID)

	if err != nil {
		log.Printf("ERROR: Failed to create default admin user: %v", err)
		return
	}

	h.db.Pool.Exec(context.Background(), "INSERT INTO wallets (user_id, balance) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING", newAdminID)
	log.Printf("🔒 Default admin account verified (Username: %s, Email: %s)", adminUsername, adminEmail)
}

func getEnvOrDefault(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
