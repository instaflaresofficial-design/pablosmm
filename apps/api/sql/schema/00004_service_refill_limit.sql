-- +goose Up
ALTER TABLE service_overrides ADD COLUMN IF NOT EXISTS refill_limit INTEGER DEFAULT 3;

-- +goose Down
ALTER TABLE service_overrides DROP COLUMN IF EXISTS refill_limit;
