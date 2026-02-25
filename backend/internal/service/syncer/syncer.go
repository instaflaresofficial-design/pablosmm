package syncer

import (
	"context"
	"fmt"
	"log"
	"pablosmm/backend/internal/db"
	"pablosmm/backend/internal/service/smm"
	"strconv"
	"strings"
	"time"
)

type OrderSyncer struct {
	db  *db.DB
	smm *smm.ProviderService
}

func New(database *db.DB, smmSvc *smm.ProviderService) *OrderSyncer {
	return &OrderSyncer{db: database, smm: smmSvc}
}

func (s *OrderSyncer) Start(ctx context.Context) {
	ticker := time.NewTicker(2 * time.Minute)
	// Run once immediately
	go s.SyncOrders(ctx)

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.SyncOrders(ctx)
			}
		}
	}()
}

func (s *OrderSyncer) SyncOrders(ctx context.Context) {
	log.Println("Starting Order Sync...")

	// 1. Fetch pending/processing orders + recently canceled/failed to catch provider corrections
	rows, err := s.db.Pool.Query(ctx, `
		SELECT id, provider_order_id, status 
		FROM orders 
		WHERE status IN ('pending', 'processing', 'submitted', 'in_progress', 'active', 'canceled', 'failed', 'completed', 'refunded') 
		AND provider_order_id IS NOT NULL 
		AND provider_order_id != ''
		AND created_at > NOW() - INTERVAL '7 days'
		LIMIT 100
	`)
	if err != nil {
		log.Printf("Sync fetch error: %v", err)
		return
	}
	defer rows.Close()

	var orderIDs []string
	orderMap := make(map[string]int) // providerID -> localID

	for rows.Next() {
		var id int
		var provID, status string
		if err := rows.Scan(&id, &provID, &status); err == nil {
			orderIDs = append(orderIDs, provID)
			orderMap[provID] = id
		}
	}

	if len(orderIDs) == 0 {
		log.Println("No orders found to sync.")
		return
	}
	log.Printf("Syncing %d orders: %v", len(orderIDs), orderIDs)

	// 2. Fetch from Provider
	statusData, err := s.smm.GetOrderStatus(orderIDs)
	if err != nil {
		log.Printf("Sync provider error: %v", err)
		return
	}
	log.Printf("Provider returned status for %d orders", len(statusData))
	// log.Printf("Raw Data: %v", statusData) // Uncomment for extreme debug

	// 3. Update DB
	for pID, localID := range orderMap {
		if raw, ok := statusData[pID]; ok {
			if data, ok := raw.(map[string]interface{}); ok {
				// Get status string robustly
				var pStatus string
				if s, ok := data["status"].(string); ok {
					pStatus = s
				} else {
					pStatus = fmt.Sprintf("%v", data["status"])
				}

				// Get remains and start_count robustly
				remains := parseInterfaceInt(data["remains"])
				startCount := parseInterfaceInt(data["start_count"])

				if pStatus != "" {
					localStatus := mapProviderStatus(pStatus)

					// CRITICAL: Do NOT overwrite refunded or canceled orders
					// These are terminal states set manually by admins
					// Fetch the order data so we can calculate refunds if topsmm canceled it
					var amountCents, uID, quantity int
					var currentStatus string
					err := s.db.Pool.QueryRow(ctx, "SELECT amount_cents, user_id, quantity, status FROM orders WHERE id = $1", localID).Scan(&amountCents, &uID, &quantity, &currentStatus)
					if err != nil {
						log.Printf("Failed to read order %d for refund sync: %v", localID, err)
						continue
					}

					// Proceed if the DB status is not already terminal
					if currentStatus != "refunded" && currentStatus != "canceled" {
						tx, txErr := s.db.Pool.Begin(ctx)
						if txErr == nil {
							refundCents := 0
							if localStatus == "canceled" {
								refundCents = amountCents // 100% refund
							} else if localStatus == "partial" && quantity > 0 && remains > 0 {
								// Safe integer math: fraction of amount to refund
								refundCents = (amountCents * remains) / quantity
							}

							if refundCents > 0 {
								// Refund Wallet
								tx.Exec(ctx, "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2", refundCents, uID)

								// Log Transaction
								tx.Exec(ctx, "INSERT INTO transactions (user_id, amount, type, description) VALUES ($1, $2, 'credit', $3)",
									uID, float64(refundCents)/100.0, fmt.Sprintf("Auto-Refund for provider status '%s' Order #%d", localStatus, localID))

								// Update Order with Refund Amount
								tx.Exec(ctx, `
									UPDATE orders 
									SET status = $1, remains = $2, start_count = $3, refunded_amount = COALESCE(refunded_amount, 0) + $4
									WHERE id = $5
								`, localStatus, remains, startCount, refundCents, localID)
							} else {
								// Just update the status normally
								tx.Exec(ctx, `
									UPDATE orders 
									SET status = $1, remains = $2, start_count = $3 
									WHERE id = $4
								`, localStatus, remains, startCount, localID)
							}

							tx.Commit(ctx)
						}
					}
				}
			}
		}
	}
	log.Println("Order Sync Complete")
}

func parseInterfaceInt(v interface{}) int {
	if v == nil {
		return 0
	}
	switch val := v.(type) {
	case string:
		i, _ := strconv.Atoi(val)
		return i
	case float64:
		return int(val)
	case int:
		return val
	case int32:
		return int(val)
	}
	// Fallback
	s := fmt.Sprintf("%v", v)
	if s == "<nil>" || s == "" {
		return 0
	}
	f, _ := strconv.ParseFloat(s, 64)
	return int(f)
}

func mapProviderStatus(s string) string {
	s = strings.ToLower(s)
	switch s {
	case "completed", "complete":
		return "completed"
	case "pending":
		return "pending"
	case "processing":
		return "processing"
	case "inprogress", "in progress", "active":
		return "active"
	case "canceled", "cancelled":
		return "canceled"
	case "partial", "partially completed":
		return "partial"
	case "failed", "fail":
		return "failed"
	default:
		return "active"
	}
}

func jsonString(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}
