# Health Check System Guide

## Overview

This document describes the comprehensive health check system implemented for the POS Grocery application. The system provides robust probes for orchestration and operations monitoring, ensuring reliable service availability and database integrity.

## Health Endpoints

### 1. Basic Health Check - `/health`
**Purpose**: Quick "up" check to verify the server is running  
**Response Time**: < 10ms  
**Status Codes**: Always 200 (if server is responding)

```json
{
  "ok": true,
  "timestamp": "2025-10-09T16:00:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "environment": "production",
  "service": "pos-grocery"
}
```

### 2. Detailed Health Check - `/api/health`
**Purpose**: Comprehensive health status with service dependencies  
**Response Time**: < 50ms  
**Status Codes**: 200 (healthy), 503 (unhealthy)

```json
{
  "ok": true,
  "timestamp": "2025-10-09T16:00:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "environment": "production",
  "service": "pos-grocery",
  "services": {
    "database": {
      "ok": true,
      "responseTime": 15
    },
    "memory": {
      "ok": true,
      "usage": 0.45,
      "heapUsed": 67108864,
      "heapTotal": 134217728
    }
  }
}
```

### 3. Readiness Probe - `/api/health/ready`
**Purpose**: Checks if the application is ready to serve traffic  
**Response Time**: < 100ms  
**Status Codes**: 200 (ready), 503 (not ready)

```json
{
  "ok": true,
  "timestamp": "2025-10-09T16:00:00.000Z",
  "service": "pos-grocery",
  "checks": {
    "database": {
      "status": "pass",
      "message": "Database is ready for operations",
      "duration": 25,
      "details": {
        "responseTime": 25,
        "databases": 1
      }
    }
  }
}
```

### 4. Liveness Probe - `/api/health/live`
**Purpose**: Checks if the application is alive (always returns ok if server is running)  
**Response Time**: < 5ms  
**Status Codes**: Always 200 (if server is responding)

```json
{
  "ok": true,
  "timestamp": "2025-10-09T16:00:00.000Z",
  "service": "pos-grocery",
  "uptime": 3600.5
}
```

### 5. Integrity Check - `/api/health/integrity`
**Purpose**: Comprehensive database integrity validation  
**Response Time**: < 500ms  
**Status Codes**: 200 (with ok: true/false), 500 (check failed)

```json
{
  "ok": true,
  "timestamp": "2025-10-09T16:00:00.000Z",
  "service": "pos-grocery",
  "checks": [
    {
      "name": "schema_presence",
      "status": "pass",
      "message": "All required tables present",
      "duration": 15,
      "details": {
        "requiredTables": ["products", "categories", "suppliers", "audit_logs"],
        "existingTables": ["products", "categories", "suppliers", "audit_logs"],
        "totalTables": 4
      }
    },
    {
      "name": "table_structure",
      "status": "pass",
      "message": "All table structures are valid",
      "duration": 25,
      "details": {
        "tableChecks": [
          {
            "table": "products",
            "status": "pass",
            "missingColumns": []
          }
        ]
      }
    }
  ],
  "summary": {
    "total": 5,
    "passed": 5,
    "failed": 0
  }
}
```

## Database Health Checks

### Connectivity Check
- **Purpose**: Verify basic database connection
- **Query**: `SELECT 1 as test`
- **Timeout**: 5 seconds
- **Failure**: Database unreachable or locked

### Readiness Check
- **Purpose**: Verify database is ready for operations
- **Tests**:
  - Database accessibility
  - Write operation capability
  - Lock status verification
- **Timeout**: 10 seconds
- **Failure**: Database locked or not writable

### Integrity Checks

#### 1. Schema Presence
- **Purpose**: Verify required tables exist
- **Required Tables**: `products`, `categories`, `suppliers`, `audit_logs`
- **Query**: `SELECT name FROM sqlite_master WHERE type='table'`
- **Failure**: Missing critical tables

#### 2. Table Structure
- **Purpose**: Verify table schemas are correct
- **Tests**:
  - Required columns present
  - Column types correct
  - Constraints valid
- **Query**: `PRAGMA table_info(table_name)`
- **Failure**: Schema corruption or missing columns

#### 3. Index Integrity
- **Purpose**: Verify required indexes exist
- **Required Indexes**:
  - `idx_audit_logs_timestamp`
  - `idx_audit_logs_request_id`
  - `idx_audit_logs_actor`
- **Query**: `SELECT name FROM sqlite_master WHERE type='index'`
- **Failure**: Missing performance-critical indexes

#### 4. Data Consistency
- **Purpose**: Verify data integrity
- **Tests**:
  - No orphaned records
  - Valid price data (non-negative)
  - No duplicate barcodes
  - Referential integrity
- **Queries**: Various consistency checks
- **Failure**: Data corruption or constraint violations

#### 5. Migration Status
- **Purpose**: Verify migration system is working
- **Tests**:
  - Migrations table exists
  - Migration records accessible
  - Migration count reasonable
- **Query**: `SELECT COUNT(*) FROM migrations`
- **Failure**: Migration system broken

## Implementation Details

### Database Health Checker Class

```typescript
export class DatabaseHealthChecker {
  // Basic connectivity check
  async checkConnectivity(): Promise<HealthCheck>
  
  // Comprehensive readiness check
  async checkReadiness(): Promise<HealthCheck>
  
  // Full integrity validation
  async checkIntegrity(): Promise<IntegrityCheck[]>
}
```

### Health Check Interface

```typescript
interface HealthCheck {
  name: string;
  status: 'pass' | 'fail';
  message: string;
  duration?: number;
  details?: any;
}
```

### Integrity Check Interface

```typescript
interface IntegrityCheck {
  name: string;
  status: 'pass' | 'fail';
  message: string;
  duration?: number;
  details?: any;
}
```

## Orchestration Integration

### Kubernetes Probes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pos-grocery
spec:
  template:
    spec:
      containers:
      - name: pos-grocery
        image: pos-grocery:latest
        ports:
        - containerPort: 8250
        livenessProbe:
          httpGet:
            path: /api/health/live
            port: 8250
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 8250
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /health
            port: 8250
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 12
```

### Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8250/api/health/ready || exit 1
```

### Load Balancer Health Checks

```nginx
upstream pos_grocery {
    server 127.0.0.1:8250;
    
    # Health check configuration
    health_check uri=/api/health/ready interval=10s fails=3 passes=2;
}
```

## Monitoring and Alerting

### Prometheus Metrics

```typescript
// Health check metrics
const healthCheckDuration = new prometheus.Histogram({
  name: 'health_check_duration_seconds',
  help: 'Duration of health checks',
  labelNames: ['endpoint', 'status']
});

const healthCheckStatus = new prometheus.Gauge({
  name: 'health_check_status',
  help: 'Health check status (1 = healthy, 0 = unhealthy)',
  labelNames: ['endpoint']
});
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "POS Grocery Health",
    "panels": [
      {
        "title": "Health Check Status",
        "type": "stat",
        "targets": [
          {
            "expr": "health_check_status{endpoint=\"ready\"}"
          }
        ]
      },
      {
        "title": "Health Check Duration",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(health_check_duration_seconds_sum[5m])"
          }
        ]
      }
    ]
  }
}
```

### Alert Rules

```yaml
groups:
- name: pos-grocery-health
  rules:
  - alert: ServiceDown
    expr: health_check_status{endpoint="ready"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "POS Grocery service is down"
      
  - alert: DatabaseIntegrityIssues
    expr: health_check_status{endpoint="integrity"} == 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Database integrity issues detected"
```

## Testing

### Unit Tests

```typescript
describe('Health Checks', () => {
  it('should return healthy status when database is accessible', async () => {
    const healthCheck = await dbHealthChecker.checkConnectivity();
    expect(healthCheck.status).toBe('pass');
    expect(healthCheck.duration).toBeLessThan(100);
  });
  
  it('should return unhealthy status when database is locked', async () => {
    // Mock database lock
    mockDatabase.lock();
    
    const readinessCheck = await dbHealthChecker.checkReadiness();
    expect(readinessCheck.status).toBe('fail');
  });
});
```

### Integration Tests

```typescript
describe('Health Endpoints', () => {
  it('should return 200 for basic health check', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });
  
  it('should return 503 when database is not ready', async () => {
    // Mock database failure
    mockDatabase.fail();
    
    const response = await request(app).get('/api/health/ready');
    expect(response.status).toBe(503);
    expect(response.body.ok).toBe(false);
  });
});
```

### Load Testing

```bash
# Test health endpoint performance
wrk -t12 -c400 -d30s http://localhost:8250/health

# Test readiness endpoint under load
wrk -t12 -c400 -d30s http://localhost:8250/api/health/ready

# Test integrity endpoint (heavier load)
wrk -t4 -c100 -d30s http://localhost:8250/api/health/integrity
```

## Best Practices

### 1. Response Time Optimization
- **Basic Health**: < 10ms response time
- **Readiness**: < 100ms response time
- **Integrity**: < 500ms response time
- Use caching for expensive checks when appropriate

### 2. Error Handling
- Never crash the process on health check failures
- Return structured error responses
- Log health check failures for debugging
- Use circuit breakers for external dependencies

### 3. Security
- Health endpoints should not expose sensitive data
- Use authentication for integrity checks in production
- Rate limit health check endpoints if needed
- Sanitize error messages

### 4. Monitoring
- Set up alerts for health check failures
- Monitor response times and trends
- Track health check success rates
- Use health check data for capacity planning

### 5. Documentation
- Document all health check endpoints
- Provide examples of healthy/unhealthy responses
- Explain what each check validates
- Include troubleshooting guides

## Troubleshooting

### Common Issues

#### 1. Database Lock Errors
```json
{
  "ok": false,
  "message": "Database not ready: database is locked",
  "details": {
    "error": "database is locked"
  }
}
```
**Solution**: Check for long-running transactions or concurrent access

#### 2. Missing Tables
```json
{
  "name": "schema_presence",
  "status": "fail",
  "message": "Missing required tables: audit_logs",
  "details": {
    "missingTables": ["audit_logs"]
  }
}
```
**Solution**: Run database migrations

#### 3. Data Consistency Issues
```json
{
  "name": "data_consistency",
  "status": "fail",
  "message": "Data consistency issues found: invalid_prices",
  "details": {
    "failedChecks": [
      {
        "check": "invalid_prices",
        "count": 5
      }
    ]
  }
}
```
**Solution**: Review and fix data quality issues

### Health Check Status Codes

| Endpoint | Healthy | Unhealthy | Notes |
|----------|---------|-----------|-------|
| `/health` | 200 | N/A | Always 200 if server running |
| `/api/health` | 200 | 503 | 503 if critical services down |
| `/api/health/ready` | 200 | 503 | 503 if not ready for traffic |
| `/api/health/live` | 200 | N/A | Always 200 if server running |
| `/api/health/integrity` | 200 | 200 | Returns ok: false for integrity issues |

This comprehensive health check system ensures reliable service monitoring and provides clear indicators for orchestration systems to make informed decisions about service availability and routing.




