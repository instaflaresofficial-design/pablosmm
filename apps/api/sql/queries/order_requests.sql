-- name: CreateOrderRequest :one
INSERT INTO order_requests (order_id, user_id, request_type, provider_response, status)
VALUES ($1, $2, $3, $4, 'pending')
RETURNING id, order_id, user_id, request_type, status, created_at, updated_at;

-- name: GetPendingOrderRequestsByOrder :many
SELECT * FROM order_requests
WHERE order_id = $1 AND status = 'pending';

-- name: ListPendingOrderRequests :many
SELECT req.id, req.order_id, req.user_id, req.request_type, req.status, req.created_at, req.updated_at,
       req.provider_response,
       o.service_id, o.quantity, o.provider_order_id, o.status as order_status,
       u.email, u.username
FROM order_requests req
JOIN orders o ON req.order_id = o.id
JOIN users u ON req.user_id = u.id
WHERE req.status = 'pending'
ORDER BY req.created_at DESC;

-- name: UpdateOrderRequestStatus :exec
UPDATE order_requests
SET status = $2
WHERE id = $1;

-- name: DecrementOrderRefills :exec
UPDATE orders
SET refills_remaining = refills_remaining - 1
WHERE id = $1 AND refills_remaining > 0;
