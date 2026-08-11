-- name: CreateCatalogService :one
INSERT INTO pablo_catalog (
    name, variant_name, sell_price_inr, platform, category, provider_id, provider_service_id, is_active
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING *;

-- name: UpdateCatalogService :one
UPDATE pablo_catalog 
SET 
    name = $2,
    variant_name = $3,
    sell_price_inr = $4,
    platform = $5,
    category = $6,
    provider_id = $7,
    provider_service_id = $8,
    is_active = $9
WHERE id = $1
RETURNING *;

-- name: DeleteCatalogService :exec
DELETE FROM pablo_catalog WHERE id = $1;

-- name: GetCatalogService :one
SELECT * FROM pablo_catalog WHERE id = $1;

-- name: GetAllCatalogServices :many
SELECT * FROM pablo_catalog ORDER BY created_at DESC;

-- name: GetActiveCatalogServices :many
SELECT * FROM pablo_catalog WHERE is_active = true ORDER BY created_at DESC;
