-- name: GetSetting :one
SELECT value FROM global_settings WHERE key = $1;

-- name: UpsertSetting :exec
INSERT INTO global_settings (key, value)
VALUES ($1, $2)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;

-- name: GetAllSettings :many
SELECT key, value FROM global_settings;
