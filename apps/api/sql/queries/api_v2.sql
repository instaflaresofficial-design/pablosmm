-- name: GenerateAPIKey :exec
UPDATE users SET api_key = $1 WHERE id = $2;

-- name: GetUserByAPIKey :one
SELECT u.id, COALESCE(w.balance, 0)::int as balance, COALESCE(u.currency, 'INR')::text as currency 
FROM users u 
LEFT JOIN wallets w ON u.id = w.user_id 
WHERE u.api_key = $1 AND u.api_key_enabled = TRUE;

-- name: GetOrderStatusForAPI :one
SELECT amount_cents, COALESCE(start_count, 0)::int as start_count, status, COALESCE(remains, 0)::int as remains
FROM orders WHERE id = $1 AND user_id = $2;

-- name: InsertAPIOrder :one
INSERT INTO orders (user_id, service_id, quantity, amount_cents, status, created_at, link) 
VALUES ($1, $2, $3, $4, $5, NOW(), $6) RETURNING id;

-- name: UpdateAPIOrderStatusFailed :exec
UPDATE orders SET status = 'failed' WHERE id = $1;

-- name: UpdateAPIOrderStatusSubmitted :exec
UPDATE orders SET provider_resp = $1, provider_order_id = $2, status = $3 WHERE id = $4;
