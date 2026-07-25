-- name: GetProfileStats :one
SELECT 
    COUNT(*) FILTER (WHERE status IN ('pending', 'processing', 'submitted', 'in_progress', 'active'))::int as active_count,
    COUNT(*) FILTER (WHERE status IN ('completed', 'partial'))::int as completed_count,
    COUNT(*) FILTER (WHERE status IN ('canceled', 'failed', 'refunded'))::int as failed_count
FROM orders 
WHERE user_id = $1;

-- name: GetProfileTotalSpend :one
SELECT COALESCE(SUM(
    CASE 
        WHEN status IN ('failed', 'canceled', 'refunded') THEN 0 
        ELSE amount_cents - COALESCE(refunded_amount, 0) 
    END
), 0)::int FROM orders WHERE user_id = $1;

-- name: UpsertServiceOverride :exec
INSERT INTO service_overrides (
    source_service_id, display_name, display_description, rate_multiplier, is_hidden, 
    category, tags, provider_category, display_id, refill, cancel, dripfeed, service_type,
    targeting, quality, stability, refill_limit, updated_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
ON CONFLICT (source_service_id) 
DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    display_description = EXCLUDED.display_description,
    rate_multiplier = EXCLUDED.rate_multiplier,
    is_hidden = EXCLUDED.is_hidden,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    provider_category = EXCLUDED.provider_category,
    display_id = EXCLUDED.display_id,
    refill = EXCLUDED.refill,
    cancel = EXCLUDED.cancel,
    dripfeed = EXCLUDED.dripfeed,
    service_type = EXCLUDED.service_type,
    targeting = EXCLUDED.targeting,
    quality = EXCLUDED.quality,
    stability = EXCLUDED.stability,
    refill_limit = EXCLUDED.refill_limit,
    updated_at = CURRENT_TIMESTAMP;

-- name: BulkUpsertServiceOverride :exec
INSERT INTO service_overrides (
    source_service_id, display_name, display_description, rate_multiplier, is_hidden, 
    category, tags, provider_category, display_id, 
    refill, cancel, dripfeed, service_type,
    targeting, quality, stability, refill_limit, updated_at
)
VALUES ($1, 
    COALESCE($2, ''),
    COALESCE($3, ''),
    CASE WHEN $4 > 0 THEN $4 ELSE 1.0 END,
    COALESCE($5, false),
    COALESCE($6, ''),
    COALESCE($7, '{}'::text[]),
    COALESCE($8, ''),
    COALESCE($9, ''),
    COALESCE($10, false),
    COALESCE($11, false),
    COALESCE($12, false),
    COALESCE($13, ''),
    COALESCE($14, ''),
    COALESCE($15, ''),
    COALESCE($16, ''),
    COALESCE($17, 3),
    CURRENT_TIMESTAMP)
ON CONFLICT (source_service_id) 
DO UPDATE SET 
    display_name = COALESCE(EXCLUDED.display_name, service_overrides.display_name),
    display_description = COALESCE(EXCLUDED.display_description, service_overrides.display_description),
    rate_multiplier = CASE WHEN EXCLUDED.rate_multiplier > 0 THEN EXCLUDED.rate_multiplier ELSE service_overrides.rate_multiplier END,
    is_hidden = COALESCE(EXCLUDED.is_hidden, service_overrides.is_hidden),
    category = COALESCE(EXCLUDED.category, service_overrides.category),
    tags = COALESCE(EXCLUDED.tags, service_overrides.tags),
    provider_category = COALESCE(EXCLUDED.provider_category, service_overrides.provider_category),
    display_id = COALESCE(EXCLUDED.display_id, service_overrides.display_id),
    refill = COALESCE(EXCLUDED.refill, service_overrides.refill),
    cancel = COALESCE(EXCLUDED.cancel, service_overrides.cancel),
    dripfeed = COALESCE(EXCLUDED.dripfeed, service_overrides.dripfeed),
    service_type = COALESCE(EXCLUDED.service_type, service_overrides.service_type),
    targeting = COALESCE(EXCLUDED.targeting, service_overrides.targeting),
    quality = COALESCE(EXCLUDED.quality, service_overrides.quality),
    stability = COALESCE(EXCLUDED.stability, service_overrides.stability),
    refill_limit = COALESCE(EXCLUDED.refill_limit, service_overrides.refill_limit),
    updated_at = CURRENT_TIMESTAMP;

-- name: IncrementServicePurchaseCount :exec
INSERT INTO service_overrides (source_service_id, purchase_count, rate_multiplier, updated_at)
VALUES ($1, 1, 1.0, CURRENT_TIMESTAMP)
ON CONFLICT (source_service_id)
DO UPDATE SET purchase_count = service_overrides.purchase_count + 1, updated_at = CURRENT_TIMESTAMP;

-- name: GetAllServiceOverrides :many
SELECT source_service_id, display_name, display_description, rate_multiplier, is_hidden, category, tags, provider_category, purchase_count, display_id, refill, cancel, dripfeed, service_type, targeting, quality, stability, refill_limit FROM service_overrides;
