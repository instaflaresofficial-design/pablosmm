-- name: GetOrdersForSync :many
SELECT id, provider_order_id, status, COALESCE(provider_key, '')::text as provider_key 
FROM orders 
WHERE status IN ('pending', 'processing', 'submitted', 'in_progress', 'active', 'canceled', 'failed', 'completed', 'refunded') 
AND provider_order_id IS NOT NULL 
AND provider_order_id != ''
AND created_at > NOW() - INTERVAL '7 days'
LIMIT 100;

-- name: GetOrderForSyncUpdate :one
SELECT amount_cents, user_id, quantity, status FROM orders WHERE id = $1;

-- name: UpdateOrderSyncWithRefund :exec
UPDATE orders 
SET status = $1, remains = $2, start_count = $3, refunded_amount = COALESCE(refunded_amount, 0) + $4
WHERE id = $5;

-- name: UpdateOrderSyncNoRefund :exec
UPDATE orders 
SET status = $1, remains = $2, start_count = $3 
WHERE id = $4;
