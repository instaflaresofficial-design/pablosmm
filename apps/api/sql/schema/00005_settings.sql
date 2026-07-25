-- +goose Up

CREATE TABLE IF NOT EXISTS global_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- +goose StatementBegin
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_global_settings_updated_at') THEN
        CREATE TRIGGER update_global_settings_updated_at 
        BEFORE UPDATE ON global_settings 
        FOR EACH ROW 
        EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END
$$;
-- +goose StatementEnd
