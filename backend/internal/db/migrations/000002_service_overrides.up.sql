-- Service overrides for "rewriting" provider data
CREATE TABLE IF NOT EXISTS service_overrides (
    id SERIAL PRIMARY KEY,
    source_service_id TEXT UNIQUE NOT NULL,
    display_name TEXT,
    display_description TEXT,
    rate_multiplier FLOAT DEFAULT 1.2, -- 20% profit by default
    is_hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at
CREATE TRIGGER update_service_overrides_updated_at 
BEFORE UPDATE ON service_overrides 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
