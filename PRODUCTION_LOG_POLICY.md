# Production Log Policy & Rotation

## Overview

This document outlines the production logging policy for the POS Grocery System, ensuring low-noise, durable logs with proper rotation to prevent unbounded growth.

## Log Format Standards

### Production Logging
- **Format**: Structured JSON only
- **No Pretty Printing**: Disabled in production
- **Encoding**: UTF-8
- **Timestamp**: ISO 8601 format
- **Level**: Configurable (default: info)

### Log Structure
```json
{
  "level": "info",
  "time": "2025-10-09T16:00:00.000Z",
  "service": "pos-grocery",
  "version": "1.0.0",
  "environment": "production",
  "requestId": "req-123",
  "method": "GET",
  "url": "/api/health",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "msg": "Health check completed",
  "duration": 15
}
```

## Log Rotation Configuration

### PM2 Log Rotation

#### Configuration
```javascript
// ecosystem.config.js
{
  // Log rotation settings
  log_type: 'json',
  log_rotate_max_size: '10M',
  log_rotate_retain: 7,
  log_rotate_compress: true,
  log_rotate_interval: '1d',
}
```

#### Settings Explained
- **log_type**: 'json' - Ensures structured JSON format
- **log_rotate_max_size**: '10M' - Rotate when log reaches 10MB
- **log_rotate_retain**: 7 - Keep 7 rotated log files
- **log_rotate_compress**: true - Compress rotated logs
- **log_rotate_interval**: '1d' - Daily rotation regardless of size

#### PM2 Commands
```bash
# Enable log rotation
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss

# Check log rotation status
pm2 show pm2-logrotate

# View logs
pm2 logs pos-server
pm2 logs pos-server --lines 100
pm2 logs pos-server --err
pm2 logs pos-server --out
```

### Systemd Log Rotation

#### Logrotate Configuration
```bash
# /etc/logrotate.d/pos-grocery
/var/log/pos/pos-grocery*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 pos pos
    postrotate
        systemctl reload pos-grocery > /dev/null 2>&1 || true
    endscript
}
```

#### Journald Configuration
```bash
# /etc/systemd/journald.conf
[Journal]
Storage=persistent
SystemMaxUse=1G
SystemKeepFree=1G
SystemMaxFileSize=10M
SystemMaxFiles=100
MaxRetentionSec=30d
```

#### Commands
```bash
# View logs
journalctl -u pos-grocery -f
journalctl -u pos-grocery --since "1 hour ago"
journalctl -u pos-grocery --since "2025-10-09" --until "2025-10-10"

# Check log size
journalctl --disk-usage

# Clean old logs
journalctl --vacuum-time=30d
journalctl --vacuum-size=1G
```

## Log Aggregation

### Central Log Aggregation Setup

#### Fluent Bit Configuration
```ini
# /etc/fluent-bit/fluent-bit.conf
[SERVICE]
    Flush         1
    Log_Level     info
    Daemon        off
    Parsers_File  parsers.conf
    HTTP_Server   On
    HTTP_Listen   0.0.0.0
    HTTP_Port     2020

[INPUT]
    Name              tail
    Path              /var/log/pos/pos-grocery*.log
    Parser            json
    Tag               pos-grocery
    Refresh_Interval  5
    Mem_Buf_Limit     50MB
    Skip_Long_Lines   On

[FILTER]
    Name                modify
    Match               pos-grocery
    Add                 hostname ${HOSTNAME}
    Add                 service pos-grocery
    Add                 environment production

[OUTPUT]
    Name                forward
    Match               pos-grocery
    Host                log-aggregator.company.com
    Port                24224
    Shared_Key          your-shared-key
    Self_Hostname       ${HOSTNAME}
```

#### ELK Stack Integration
```yaml
# logstash.conf
input {
  beats {
    port => 5044
  }
}

filter {
  if [fields][service] == "pos-grocery" {
    json {
      source => "message"
    }
    
    date {
      match => [ "time", "ISO8601" ]
    }
    
    mutate {
      add_field => { "log_level" => "%{level}" }
      add_field => { "service_name" => "%{service}" }
      add_field => { "request_id" => "%{requestId}" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "pos-grocery-%{+YYYY.MM.dd}"
  }
}
```

#### Prometheus + Grafana Integration
```yaml
# promtail.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: pos-grocery
    static_configs:
      - targets:
          - localhost
        labels:
          job: pos-grocery
          __path__: /var/log/pos/pos-grocery*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            service: service
            requestId: requestId
            message: msg
      - timestamp:
          source: time
          format: RFC3339
      - labels:
          level:
          service:
          requestId:
```

## Log Monitoring

### Health Checks
```bash
# Check log file sizes
du -sh /var/log/pos/
du -sh /opt/pos-grocery/server/logs/

# Check log rotation status
logrotate -d /etc/logrotate.d/pos-grocery

# Monitor log growth
watch -n 60 'du -sh /var/log/pos/'

# Check for log errors
grep -i error /var/log/pos/pos-grocery*.log | tail -10
```

### Alerting Rules
```yaml
# prometheus-rules.yml
groups:
- name: pos-grocery-logs
  rules:
  - alert: LogFileSizeHigh
    expr: log_file_size_bytes{job="pos-grocery"} > 100000000  # 100MB
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "POS Grocery log file size is high"
      
  - alert: LogRotationFailed
    expr: increase(logrotate_failures_total[1h]) > 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Log rotation has failed"
```

## Log Retention Policy

### Retention Schedule
- **Application Logs**: 30 days
- **Error Logs**: 90 days
- **Audit Logs**: 7 years (compliance)
- **Access Logs**: 1 year
- **Debug Logs**: 7 days

### Storage Requirements
- **Daily Log Volume**: ~100MB
- **Monthly Storage**: ~3GB
- **Annual Storage**: ~36GB
- **Compression Ratio**: ~70% (after gzip)

## Log Security

### Sensitive Data Handling
```javascript
// Example: Sanitizing sensitive data
const sanitizeLogData = (data) => {
  const sensitiveFields = ['password', 'pin', 'ssn', 'creditCard'];
  const sanitized = { ...data };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};
```

### Access Control
```bash
# Set proper permissions
chmod 640 /var/log/pos/pos-grocery*.log
chown pos:pos /var/log/pos/pos-grocery*.log

# Restrict access to log files
chmod 750 /var/log/pos/
chown pos:pos /var/log/pos/
```

## Troubleshooting

### Common Issues

#### Logs Not Rotating
```bash
# Check logrotate configuration
logrotate -d /etc/logrotate.d/pos-grocery

# Force log rotation
logrotate -f /etc/logrotate.d/pos-grocery

# Check logrotate status
cat /var/lib/logrotate/status | grep pos-grocery
```

#### Log Files Growing Too Large
```bash
# Check current sizes
ls -lh /var/log/pos/

# Manually rotate logs
pm2 reload pos-server
# or
systemctl reload pos-grocery

# Clean old logs
find /var/log/pos/ -name "*.log.*" -mtime +30 -delete
```

#### Log Format Issues
```bash
# Verify JSON format
head -1 /var/log/pos/pos-grocery.log | jq .

# Check for malformed JSON
grep -v '^{' /var/log/pos/pos-grocery.log | head -5
```

## Best Practices

### 1. Log Levels
- **ERROR**: System errors, exceptions, failures
- **WARN**: Recoverable issues, deprecated usage
- **INFO**: Important business events, state changes
- **DEBUG**: Detailed debugging information (dev only)

### 2. Log Content
- **Include Context**: Request ID, user ID, operation
- **Avoid Sensitive Data**: Never log passwords, PINs, SSNs
- **Use Structured Data**: JSON objects, not strings
- **Include Timestamps**: Always include precise timestamps

### 3. Performance
- **Async Logging**: Use async loggers to avoid blocking
- **Batch Writes**: Group log entries for efficiency
- **Compression**: Enable compression for rotated logs
- **Monitoring**: Monitor log performance impact

### 4. Compliance
- **Retention**: Follow regulatory requirements
- **Audit Trail**: Maintain complete audit logs
- **Access Control**: Restrict log file access
- **Encryption**: Encrypt sensitive log data

This comprehensive log policy ensures durable, manageable logs that support both operational needs and compliance requirements while preventing unbounded growth.




