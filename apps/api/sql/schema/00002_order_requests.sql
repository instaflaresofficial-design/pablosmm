-- +goose Up

-- Order Requests Table
CREATE TABLE IF NOT EXISTS order_requests (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('cancel', 'refill')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_requests_order_id ON order_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_order_requests_status ON order_requests(status);

-- Add refills_remaining to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refills_remaining INTEGER DEFAULT 3;

-- Trigger for updated_at
CREATE TRIGGER update_order_requests_updated_at BEFORE UPDATE ON order_requests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- +goose Down
DROP TRIGGER IF EXISTS update_order_requests_updated_at ON order_requests;
ALTER TABLE orders DROP COLUMN IF EXISTS refills_remaining;
DROP TABLE IF EXISTS order_requests CASCADE;
