-- +goose Up
CREATE TABLE IF NOT EXISTS pablo_catalog (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    variant_name TEXT,
    sell_price_inr DECIMAL(10,2) NOT NULL,
    platform TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    provider_id TEXT, 
    provider_service_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_pablo_catalog_updated_at ON pablo_catalog;
CREATE TRIGGER update_pablo_catalog_updated_at 
BEFORE UPDATE ON pablo_catalog 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- +goose Down
DROP TABLE IF EXISTS pablo_catalog CASCADE;
