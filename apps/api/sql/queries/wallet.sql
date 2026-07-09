-- name: CheckUniqueAmount :one
SELECT COUNT(*) FROM wallet_requests
WHERE unique_amount = $1
AND status = 'pending'
AND created_at > NOW() - INTERVAL '30 minutes';

-- name: CheckPendingRequestCount :one
SELECT COUNT(*) FROM wallet_requests
WHERE user_id = $1 AND status = 'pending';

-- name: CheckTransactionIDExists :one
SELECT 1 FROM wallet_requests WHERE transaction_id=$1;

-- name: InsertWalletRequest :one
INSERT INTO wallet_requests (user_id, amount, unique_amount, method, transaction_id, status)
VALUES ($1, $2, $3, $4, $5, 'pending')
RETURNING id;

-- name: UpdateDepositUTR :execrows
UPDATE wallet_requests SET transaction_id=$1, updated_at=NOW()
WHERE id=$2 AND user_id=$3 AND status='pending';

-- name: CheckUPINotificationExists :one
SELECT id FROM upi_notifications WHERE utr = $1;

-- name: FindMatchingWalletRequest :one
SELECT id, user_id, amount FROM wallet_requests
WHERE status = 'pending'
AND method = 'UPI'
AND unique_amount IS NOT NULL
AND ABS(unique_amount - $1) < 0.02
AND created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC
LIMIT 1;

-- name: InsertUPINotificationUnmatched :exec
INSERT INTO upi_notifications (amount, utr, sender_upi, raw_text, status)
VALUES ($1, $2, $3, $4, 'unmatched');

-- name: GetWalletRequestStatusForUpdate :one
SELECT status FROM wallet_requests WHERE id=$1 FOR UPDATE;

-- name: UpdateWalletRequestStatusAndTxn :exec
UPDATE wallet_requests
SET status=$1, transaction_id=$2, updated_at=NOW()
WHERE id=$3;

-- name: UpsertWalletBalance :exec
INSERT INTO wallets (user_id, balance) VALUES ($1, $2)
ON CONFLICT (user_id)
DO UPDATE SET balance = wallets.balance + $2, updated_at = NOW();

-- name: InsertTransaction :exec
INSERT INTO transactions (user_id, amount, type, description)
VALUES ($1, $2, $3, $4);

-- name: InsertUPINotificationMatched :exec
INSERT INTO upi_notifications (amount, utr, sender_upi, raw_text, matched_request_id, status)
VALUES ($1, $2, $3, $4, $5, 'matched');

-- name: ListWalletRequestsAdmin :many
SELECT r.id, r.user_id, u.email, r.amount, r.method, COALESCE(r.transaction_id, '')::text as transaction_id, r.status, r.created_at
FROM wallet_requests r
JOIN users u ON r.user_id = u.id
ORDER BY r.created_at DESC;

-- name: GetWalletRequestForUpdateAdmin :one
SELECT user_id, amount, status FROM wallet_requests WHERE id=$1 FOR UPDATE;

-- name: RejectWalletRequest :exec
UPDATE wallet_requests SET status='rejected', updated_at=NOW() WHERE id=$1 AND status='pending';

-- name: GetDepositStatus :one
SELECT status FROM wallet_requests WHERE id=$1 AND user_id=$2;

-- name: DebitWallet :exec
UPDATE wallets SET balance = balance - $1 WHERE user_id = $2;

-- name: CreditWallet :exec
UPDATE wallets SET balance = balance + $1 WHERE user_id = $2;

-- name: GetWalletBalance :one
SELECT balance FROM wallets WHERE user_id = $1;

-- name: CreateCryptomusWalletRequest :one
INSERT INTO wallet_requests (user_id, amount, method, status)
VALUES ($1, $2, 'cryptomus', 'pending')
RETURNING id;

-- name: UpdateCryptomusTransactionID :exec
UPDATE wallet_requests SET transaction_id=$1 WHERE id=$2;

-- name: GetWalletRequestStatus :one
SELECT status FROM wallet_requests WHERE id=$1;

-- name: ApproveCryptomusWalletRequest :exec
UPDATE wallet_requests SET status='approved', updated_at=NOW() WHERE id=$1;

-- name: GetWalletRequestAmount :one
SELECT amount FROM wallet_requests WHERE id=$1;

-- name: GetRecentMoneyTransactions :many
SELECT id, amount, type, description, created_at
FROM transactions
WHERE user_id = $1 AND type = 'credit'
ORDER BY created_at DESC
LIMIT 3;

-- name: GetAllMoneyTransactions :many
SELECT id, amount, type, description, created_at
FROM transactions
WHERE user_id = $1 AND type = 'credit'
ORDER BY created_at DESC
LIMIT 200;
