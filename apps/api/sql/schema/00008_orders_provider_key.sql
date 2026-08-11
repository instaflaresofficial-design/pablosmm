-- +goose Up
ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_key TEXT;
-- +goose Down
ALTER TABLE orders DROP COLUMN IF EXISTS provider_key;
