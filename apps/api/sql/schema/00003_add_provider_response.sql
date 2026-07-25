-- +goose Up

ALTER TABLE order_requests ADD COLUMN IF NOT EXISTS provider_response TEXT;

-- +goose Down
ALTER TABLE order_requests DROP COLUMN IF EXISTS provider_response;
