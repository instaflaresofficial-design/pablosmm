-- +goose Up
CREATE TABLE IF NOT EXISTS smm_providers (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    api_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_smm_providers_updated_at ON smm_providers;
CREATE TRIGGER update_smm_providers_updated_at 
BEFORE UPDATE ON smm_providers 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE service_overrides ADD COLUMN IF NOT EXISTS custom_input_required BOOLEAN DEFAULT FALSE;
ALTER TABLE service_overrides ADD COLUMN IF NOT EXISTS custom_input_label TEXT DEFAULT '';

-- +goose Down
ALTER TABLE service_overrides DROP COLUMN IF EXISTS custom_input_label;
ALTER TABLE service_overrides DROP COLUMN IF EXISTS custom_input_required;
DROP TABLE IF EXISTS smm_providers CASCADE;
