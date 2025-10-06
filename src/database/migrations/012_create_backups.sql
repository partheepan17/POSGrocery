-- Migration: Create backups table
CREATE TABLE IF NOT EXISTS backups (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT now(),
    type VARCHAR(20) CHECK (type IN ('config')) NOT NULL,
    location_url TEXT NOT NULL,
    checksum VARCHAR(255),
    by_user INTEGER REFERENCES users(id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at);
CREATE INDEX IF NOT EXISTS idx_backups_type ON backups(type);
CREATE INDEX IF NOT EXISTS idx_backups_by_user ON backups(by_user);









