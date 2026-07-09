-- +goose Up

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    email_verified TIMESTAMP WITH TIME ZONE,
    image TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    username VARCHAR(255) UNIQUE,
    password_hash TEXT,
    mobile VARCHAR(20),
    google_id VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    api_key TEXT UNIQUE,
    api_key_enabled BOOLEAN DEFAULT true,
    currency TEXT DEFAULT 'USD'
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0, -- Store cents as integer
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    provider_resp JSONB,
    provider_order_id TEXT,
    refunded_amount INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    remains INTEGER DEFAULT 0,
    start_count INTEGER DEFAULT 0,
    link TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- NextAuth related tables
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    UNIQUE(provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    session_token TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(identifier, token)
);

-- Simple trigger for updating updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Service overrides
CREATE TABLE IF NOT EXISTS service_overrides (
    id SERIAL PRIMARY KEY,
    source_service_id TEXT UNIQUE NOT NULL,
    display_name TEXT,
    display_description TEXT,
    rate_multiplier FLOAT DEFAULT 1.2,
    is_hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    provider_category TEXT DEFAULT '',
    purchase_count INTEGER DEFAULT 0,
    display_id TEXT,
    refill BOOLEAN DEFAULT NULL,
    cancel BOOLEAN DEFAULT NULL,
    dripfeed BOOLEAN DEFAULT NULL,
    service_type TEXT DEFAULT NULL,
    targeting TEXT DEFAULT NULL,
    quality TEXT DEFAULT NULL,
    stability TEXT DEFAULT NULL
);

CREATE TRIGGER update_service_overrides_updated_at 
BEFORE UPDATE ON service_overrides 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_service_overrides_display_id ON service_overrides(display_id);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Wallet Requests
CREATE TABLE IF NOT EXISTS wallet_requests (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255) UNIQUE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unique_amount DECIMAL(15, 2)
);

CREATE INDEX IF NOT EXISTS idx_wallet_requests_user_id ON wallet_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_requests_status ON wallet_requests(status);
CREATE INDEX IF NOT EXISTS idx_wallet_requests_unique_amount ON wallet_requests(unique_amount);

-- UPI Notifications
CREATE TABLE IF NOT EXISTS upi_notifications (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(15, 2) NOT NULL,
    utr VARCHAR(255),
    sender_upi VARCHAR(255),
    raw_text TEXT,
    matched_request_id INT REFERENCES wallet_requests(id),
    status VARCHAR(20) DEFAULT 'unmatched' CHECK (status IN ('unmatched', 'matched', 'ignored')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upi_notifications_status ON upi_notifications(status);

-- +goose Down
DROP TABLE IF EXISTS upi_notifications CASCADE;
DROP TABLE IF EXISTS wallet_requests CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS service_overrides CASCADE;
DROP TABLE IF EXISTS verification_tokens CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
