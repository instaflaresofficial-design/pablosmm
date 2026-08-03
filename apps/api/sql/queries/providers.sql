-- name: ListSmmProvidersAdmin :many
SELECT id, key, name, api_url, api_key, currency, is_active, created_at, updated_at
FROM smm_providers
ORDER BY id ASC;

-- name: GetActiveSmmProviders :many
SELECT id, key, name, api_url, api_key, currency, is_active, created_at, updated_at
FROM smm_providers
WHERE is_active = TRUE
ORDER BY id ASC;

-- name: GetSmmProviderByKey :one
SELECT id, key, name, api_url, api_key, currency, is_active, created_at, updated_at
FROM smm_providers
WHERE key = $1;

-- name: UpsertSmmProvider :one
INSERT INTO smm_providers (key, name, api_url, api_key, currency, is_active, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
ON CONFLICT (key)
DO UPDATE SET
    name = EXCLUDED.name,
    api_url = EXCLUDED.api_url,
    api_key = EXCLUDED.api_key,
    currency = EXCLUDED.currency,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP
RETURNING id, key, name, api_url, api_key, currency, is_active, created_at, updated_at;

-- name: DeleteSmmProvider :exec
DELETE FROM smm_providers WHERE id = $1;
