ALTER TABLE service_overrides ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0;
ALTER TABLE service_overrides ADD COLUMN IF NOT EXISTS display_id TEXT;
-- Create an index on display_id for faster lookups later
CREATE INDEX IF NOT EXISTS idx_service_overrides_display_id ON service_overrides(display_id);
