-- name: GetOrders :many
SELECT 
	o.id, 
	o.service_id, 
	o.amount_cents, 
	o.quantity, 
	o.status, 
	o.created_at, 
	o.provider_order_id,
	COALESCE(so.display_id, '')::text as display_id,
	COALESCE(so.display_name, '')::text as display_name,
	COALESCE(o.remains, 0)::int as remains,
	COALESCE(o.start_count, 0)::int as start_count,
	COALESCE(o.link, '')::text as link,
	(SELECT COALESCE(balance, 0)::int FROM wallets WHERE user_id = o.user_id) as user_balance,
	COALESCE(so.service_type, '')::text as service_type,
	COALESCE(so.category, '')::text as category
FROM orders o
LEFT JOIN service_overrides so ON (
	o.service_id = so.source_service_id 
	OR split_part(o.service_id, ':', 2) = so.source_service_id
	OR o.service_id = so.source_service_id || ':' || split_part(o.service_id, ':', 2)
	OR split_part(o.service_id, ':', 2) = split_part(so.source_service_id, ':', 2)
)
WHERE o.user_id = $1
AND (sqlc.narg('status_filter')::text IS NULL OR 
     (sqlc.narg('status_filter') = 'active' AND o.status IN ('pending', 'processing', 'submitted', 'active', 'in_progress')) OR
     (sqlc.narg('status_filter') != 'active' AND o.status = sqlc.narg('status_filter'))
    )
ORDER BY o.created_at DESC;

-- name: GetOrderForCancel :one
SELECT status, amount_cents, COALESCE(provider_order_id, '')::text as provider_order_id 
FROM orders 
WHERE id=$1 AND user_id=$2 
FOR UPDATE;

-- name: CancelOrder :exec
UPDATE orders SET status='canceled' WHERE id=$1;

-- name: GetOrderForRefundAdmin :one
SELECT status, amount_cents, COALESCE(refunded_amount, 0)::int as refunded_amount, user_id 
FROM orders WHERE id = $1 FOR UPDATE;

-- name: UpdateOrderRefundAdmin :one
UPDATE orders SET status = $1, refunded_amount = $2 WHERE id = $3 RETURNING COALESCE(provider_order_id, '')::text;

-- name: GetAdminOrders :many
SELECT 
	o.id, 
	o.service_id, 
	o.amount_cents, 
	o.quantity, 
	o.status, 
	o.created_at, 
	COALESCE(o.provider_order_id, '')::text as provider_order_id,
	COALESCE(so.display_id, '')::text as display_id,
	COALESCE(so.display_name, '')::text as display_name,
	COALESCE(o.remains, 0)::int as remains,
	COALESCE(o.start_count, 0)::int as start_count,
	COALESCE(o.link, '')::text as link,
	u.email,
	COALESCE(o.refunded_amount, 0)::int as refunded_amount
FROM orders o
LEFT JOIN service_overrides so ON (o.service_id = so.source_service_id OR split_part(o.service_id, ':', 2) = so.source_service_id)
JOIN users u ON o.user_id = u.id
WHERE (sqlc.narg('status_filter')::text IS NULL OR o.status = sqlc.narg('status_filter'))
AND (sqlc.narg('user_id')::int IS NULL OR o.user_id = sqlc.narg('user_id'))
ORDER BY o.created_at DESC;

-- name: InsertOrder :one
INSERT INTO orders (user_id, service_id, amount_cents, quantity, link, status, provider_order_id, provider_resp)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id;

-- name: DeleteOrder :exec
DELETE FROM orders WHERE id = $1;

-- name: GetSingleOrder :one
SELECT 
	o.id, 
	o.service_id, 
	o.amount_cents, 
	o.quantity, 
	o.status, 
	o.created_at, 
    o.updated_at,
	COALESCE(so.display_id, '')::text as display_id,
	COALESCE(so.display_name, '')::text as display_name,
	COALESCE(o.remains, 0)::int as remains,
	COALESCE(o.start_count, 0)::int as start_count,
	COALESCE(o.link, '')::text as link,
	COALESCE(so.service_type, '')::text as service_type,
	COALESCE(so.category, '')::text as category
FROM orders o
LEFT JOIN service_overrides so ON (
	o.service_id = so.source_service_id 
	OR split_part(o.service_id, ':', 2) = so.source_service_id
	OR o.service_id = so.source_service_id || ':' || split_part(o.service_id, ':', 2)
	OR split_part(o.service_id, ':', 2) = split_part(so.source_service_id, ':', 2)
)
WHERE o.id = $1 AND o.user_id = $2;

-- name: UpdateOrderProvider :exec
UPDATE orders SET provider_resp = $1, provider_order_id = $2, status = $3 WHERE id = $4;
