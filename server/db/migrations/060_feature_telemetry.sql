-- Feature Usage Telemetry Migration
-- Tracks feature usage for analytics and recommendations

-- Feature usage counters table
CREATE TABLE IF NOT EXISTS feature_usage_counters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    feature_code TEXT NOT NULL,
    usage_date DATE NOT NULL,
    usage_count INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, feature_code, usage_date)
);

-- Feature usage events table (for detailed tracking)
CREATE TABLE IF NOT EXISTS feature_usage_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    feature_code TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'route_visit', 'action_click', 'feature_toggle', etc.
    event_data JSON,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Feature usage recommendations table
CREATE TABLE IF NOT EXISTS feature_usage_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    feature_code TEXT NOT NULL,
    recommendation_type TEXT NOT NULL, -- 'enable_default', 'disable_default', 'deprecate', 'promote'
    confidence_score REAL DEFAULT 0.0, -- 0.0 to 1.0
    reasoning TEXT,
    usage_data JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_applied BOOLEAN DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_usage_counters_tenant_date 
ON feature_usage_counters(tenant_id, usage_date);

CREATE INDEX IF NOT EXISTS idx_feature_usage_counters_feature 
ON feature_usage_counters(feature_code);

CREATE INDEX IF NOT EXISTS idx_feature_usage_events_tenant_user 
ON feature_usage_events(tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_feature_usage_events_feature_date 
ON feature_usage_events(feature_code, created_at);

CREATE INDEX IF NOT EXISTS idx_feature_usage_events_type 
ON feature_usage_events(event_type);

CREATE INDEX IF NOT EXISTS idx_feature_recommendations_tenant 
ON feature_usage_recommendations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_feature_recommendations_feature 
ON feature_usage_recommendations(feature_code);

-- Trigger to update counters when events are inserted
CREATE TRIGGER IF NOT EXISTS update_feature_usage_counters
AFTER INSERT ON feature_usage_events
BEGIN
    INSERT OR REPLACE INTO feature_usage_counters (
        tenant_id, 
        feature_code, 
        usage_date, 
        usage_count, 
        unique_users,
        updated_at
    )
    SELECT 
        NEW.tenant_id,
        NEW.feature_code,
        DATE(NEW.created_at),
        COALESCE((
            SELECT usage_count + 1 
            FROM feature_usage_counters 
            WHERE tenant_id = NEW.tenant_id 
            AND feature_code = NEW.feature_code 
            AND usage_date = DATE(NEW.created_at)
        ), 1),
        COALESCE((
            SELECT COUNT(DISTINCT user_id) 
            FROM feature_usage_events 
            WHERE tenant_id = NEW.tenant_id 
            AND feature_code = NEW.feature_code 
            AND DATE(created_at) = DATE(NEW.created_at)
        ), 1),
        CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
        SELECT 1 FROM feature_usage_counters 
        WHERE tenant_id = NEW.tenant_id 
        AND feature_code = NEW.feature_code 
        AND usage_date = DATE(NEW.created_at)
    );
    
    -- Update existing counter
    UPDATE feature_usage_counters 
    SET 
        usage_count = usage_count + 1,
        unique_users = (
            SELECT COUNT(DISTINCT user_id) 
            FROM feature_usage_events 
            WHERE tenant_id = NEW.tenant_id 
            AND feature_code = NEW.feature_code 
            AND DATE(created_at) = DATE(NEW.created_at)
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = NEW.tenant_id 
    AND feature_code = NEW.feature_code 
    AND usage_date = DATE(NEW.created_at);
END;










