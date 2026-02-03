-- Add updated_at column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Set updated_at to created_at for existing rows
UPDATE orders SET updated_at = created_at WHERE updated_at IS NULL;
