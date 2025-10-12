# Production Runbook - POS Grocery System

## Overview

This runbook provides complete instructions for deploying and operating the POS Grocery System in production environments. It covers everything from initial setup to ongoing maintenance.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Deployment](#initial-deployment)
3. [Process Management](#process-management)
4. [Reverse Proxy Setup](#reverse-proxy-setup)
5. [Health & Monitoring](#health--monitoring)
6. [Backup & Restore](#backup--restore)
7. [Disaster Recovery](#disaster-recovery)
8. [Logging & Monitoring](#logging--monitoring)
9. [Maintenance & Updates](#maintenance--updates)
10. [Troubleshooting](#troubleshooting)
11. [Security Considerations](#security-considerations)

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **CPU**: 2+ cores
- **RAM**: 4GB+ (8GB recommended)
- **Storage**: 20GB+ SSD
- **Node.js**: 18.0.0+
- **Database**: SQLite (included) or PostgreSQL (optional)

### Required Software
```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 (Process Manager)
sudo npm install -g pm2

# Nginx (Reverse Proxy)
sudo apt-get install -y nginx

# Git
sudo apt-get install -y git
```

## Initial Deployment

### 1. One-Click Setup (Recommended)

**Windows:**
```bash
# Clone repository
git clone <repository-url> /opt/pos-grocery
cd /opt/pos-grocery

# Copy environment file
cp .env.example .env

# Double-click setup launcher
tools\launchers\setup-project.bat
```

**macOS/Linux:**
```bash
# Clone repository
git clone <repository-url> /opt/pos-grocery
cd /opt/pos-grocery

# Copy environment file
cp .env.example .env

# Make launchers executable and run setup
chmod +x tools/launchers/*.command
./tools/launchers/setup-project.command
```

**VS Code:**
1. Open project in VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Tasks: Run Task" → "Setup Project"

### 2. Manual Setup (Alternative)

```bash
# Clone repository
git clone <repository-url> /opt/pos-grocery
cd /opt/pos-grocery

# Copy environment file
cp .env.example .env

# Install dependencies
npm run setup

# Create production environment
cp server/env.example server/.env
```

## 🎯 Deployment Buttons

### Available Launchers

| Launcher | Description | Frontend | Backend | Use Case |
|----------|-------------|----------|---------|----------|
| **start-dev-all** | Full development mode | http://localhost:5173 | http://localhost:8250 | Daily development |
| **start-dev-fast** | Fast development mode | http://localhost:5173 | http://localhost:8250 | Quick iteration |
| **start-prod** | Production mode | http://localhost:8080 | http://localhost:8250 | Production testing |
| **check-health** | Health check | - | http://localhost:8250 | Service monitoring |
| **setup-project** | Project setup | - | - | First-time setup |

### Quick Start Commands

```bash
# Development
npm run dev:all              # Start both frontend and backend
npm run dev:all:fast         # Fast development mode
npm run dev:server           # Backend only
npm run dev:client           # Frontend only

# Production
npm run build:all            # Build everything
npm run start:all:prod       # Start production mode
npm run deploy:prod          # Build and start production

# Health Checks
npm run check:health         # Basic health check
npm run check:ready          # Readiness check
npm run check:integrity      # Database integrity check
npm run check:full           # Complete health verification

# Utilities
npm run setup                # Complete project setup
npm run reset                # Reset project data
npm run quick:start          # Quick development start
npm run quick:build          # Quick build
npm run quick:check          # Quick health check
```

### VS Code Tasks

Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS) and type "Tasks: Run Task" to access:

- 🚀 **Start Dev (All)** - Full development environment
- ⚡ **Start Dev (Fast)** - Fast development with skipped migrations
- 🏗️ **Build All** - Build both frontend and backend
- 🚀 **Start Production** - Production deployment
- 🔍 **Check Health** - Service health verification
- ⚙️ **Setup Project** - Complete project setup

### 2. Configure Production Environment

Edit `/opt/pos-grocery/server/.env`:

```env
NODE_ENV=production
PORT=8250
DB_PATH=/opt/pos-grocery/data/pos.db
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
LOG_LEVEL=info
FAST_DEV=false
SKIP_MIGRATIONS=false
SKIP_HARDWARE_CHECKS=false
```

### 3. Build and Test

```bash
# Build production assets
npm run build:all

# Test production build
npm run start:prod

# Verify health endpoints
curl http://localhost:8250/health
curl http://localhost:8250/api/health
```

## Process Management

### Option 1: PM2 (Recommended)

#### Install PM2
```bash
sudo npm install -g pm2
```

#### Create PM2 Configuration

Create `/opt/pos-grocery/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'pos-server',
      script: 'dist/index.js',
      cwd: '/opt/pos-grocery/server',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8250
      },
      error_file: '/var/log/pos/server-error.log',
      out_file: '/var/log/pos/server-out.log',
      log_file: '/var/log/pos/server-combined.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};
```

#### PM2 Commands
```bash
# Start application
pm2 start /opt/pos-grocery/ecosystem.config.js

# Stop application
pm2 stop pos-server

# Restart application
pm2 restart pos-server

# View logs
pm2 logs pos-server

# Monitor
pm2 monit

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### Option 2: Systemd

#### Create Systemd Service

Create `/etc/systemd/system/pos-grocery.service`:

```ini
[Unit]
Description=POS Grocery System
After=network.target

[Service]
Type=simple
User=pos
Group=pos
WorkingDirectory=/opt/pos-grocery/server
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=pos-grocery
Environment=NODE_ENV=production
Environment=PORT=8250

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/pos-grocery/data
ReadWritePaths=/var/log/pos

[Install]
WantedBy=multi-user.target
```

#### Systemd Commands
```bash
# Create user
sudo useradd -r -s /bin/false pos

# Set permissions
sudo chown -R pos:pos /opt/pos-grocery
sudo mkdir -p /var/log/pos
sudo chown -R pos:pos /var/log/pos

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable pos-grocery
sudo systemctl start pos-grocery

# Check status
sudo systemctl status pos-grocery

# View logs
sudo journalctl -u pos-grocery -f
```

## Reverse Proxy Setup

### Nginx Configuration

Create `/etc/nginx/sites-available/pos-grocery`:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=static:10m rate=50r/s;

# Upstream servers
upstream pos_backend {
    server 127.0.0.1:8250;
    keepalive 32;
}

upstream pos_frontend {
    server 127.0.0.1:8080;
    keepalive 32;
}

# Main server block
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws://localhost:*;" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # API endpoints
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://pos_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }
    
    # Health check endpoints
    location /health {
        limit_req zone=api burst=5 nodelay;
        
        proxy_pass http://pos_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static frontend
    location / {
        limit_req zone=static burst=100 nodelay;
        
        proxy_pass http://pos_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Security
    location ~ /\. {
        deny all;
    }
    
    location ~ /(data|logs)/ {
        deny all;
    }
}
```

#### Enable Nginx Configuration
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/pos-grocery /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Health & Monitoring

### Startup SLA & Performance

#### SLA Requirements
- **Primary SLA**: <300ms cold start to "listening" log
- **Database Init**: <500ms (production mode)
- **Hardware Checks**: <1000ms (production mode)
- **Memory Usage**: <80% heap utilization during startup
- **Error Rate**: <1% startup failures

#### Performance Monitoring
```bash
# Check startup metrics
curl http://localhost:8250/api/health/startup

# Check SLA compliance
curl http://localhost:8250/api/health/startup | jq '.metrics.sla'

# Monitor startup performance
curl http://localhost:8250/api/health/startup | jq '.metrics.performance'
```

#### Alert Thresholds
- **Critical**: Startup time >300ms, Readiness failing, 5xx spike >5%
- **Warning**: Startup time 200-300ms, Memory usage >80%, DB init >300ms
- **Info**: Performance score <75

#### Alert Response Procedures

##### Critical Alerts (Immediate Action Required)
1. **Startup Time Exceeds SLA** (>300ms)
   - Check service status: `curl http://localhost:8250/api/health/startup`
   - Restart service if startup time >500ms
   - Check system resources and database connectivity
   - Response time: <5 minutes

2. **Readiness Probe Failing** (503 response)
   - Check database connectivity
   - Verify service initialization
   - Check resource usage (CPU, memory, disk)
   - Response time: <2 minutes

3. **5xx Error Spike** (>5% in 5-minute window)
   - Check error logs: `pm2 logs pos-server --err`
   - Monitor system resources
   - Check database and external service health
   - Response time: <3 minutes

##### Warning Alerts (Investigation Required)
1. **Slow Startup** (200-300ms)
   - Monitor closely, investigate performance
   - Check for resource constraints
   - Review recent deployments
   - Response time: <15 minutes

2. **High Memory Usage** (>80%)
   - Check for memory leaks
   - Monitor garbage collection
   - Review application memory usage
   - Response time: <30 minutes

3. **Database Slow Init** (>300ms)
   - Check database connection pool
   - Verify database performance
   - Review network connectivity
   - Response time: <30 minutes

### Health Endpoints

The system provides multiple health check endpoints:

- `GET /health` - Basic health check
- `GET /api/health` - Detailed health check
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe
- `GET /api/health/startup` - Startup metrics and SLA compliance

### Health Check Response Format

```json
{
  "ok": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": {
      "ok": true,
      "responseTime": 5
    },
    "memory": {
      "ok": true,
      "usage": 0.45
    }
  }
}
```

### Monitoring Setup

#### Prometheus Metrics (Optional)
```bash
# Install prometheus client
npm install prom-client

# Add to server/index.ts
const client = require('prom-client');
const register = new client.Registry();

// Add metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

## Backup & Restore

### Database Backup

#### Automated Backup Script

Create `/opt/pos-grocery/scripts/backup.sh`:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/opt/pos-grocery/backups"
DB_PATH="/opt/pos-grocery/data/pos.db"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
sqlite3 $DB_PATH ".backup '$BACKUP_DIR/pos_$DATE.db'"

# Compress backup
gzip "$BACKUP_DIR/pos_$DATE.db"

# Clean old backups
find $BACKUP_DIR -name "pos_*.db.gz" -mtime +$RETENTION_DAYS -delete

# Log backup
echo "$(date): Backup created - pos_$DATE.db.gz" >> /var/log/pos/backup.log
```

#### Setup Cron Job
```bash
# Make script executable
chmod +x /opt/pos-grocery/scripts/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /opt/pos-grocery/scripts/backup.sh
```

### Restore Database

```bash
# Stop application
pm2 stop pos-server
# OR
sudo systemctl stop pos-grocery

# Restore from backup
gunzip -c /opt/pos-grocery/backups/pos_20240115_020000.db.gz | sqlite3 /opt/pos-grocery/data/pos.db

# Start application
pm2 start pos-server
# OR
sudo systemctl start pos-grocery
```

## Disaster Recovery

### Recovery Objectives

#### RPO (Recovery Point Objective): ≤ 24 hours
- **Target**: Maximum data loss of 24 hours
- **Implementation**: Daily automated backups + transaction log archiving
- **Verification**: Last invoice date within 24 hours of current time

#### RTO (Recovery Time Objective): ≤ 30 minutes
- **Target**: System restoration within 30 minutes
- **Implementation**: Automated restore procedures + health validation
- **Verification**: Service fully operational and passing health checks

### Disaster Recovery Procedures

#### 1. Pre-Disaster Preparation

##### Backup Verification
```bash
# Verify latest backup integrity
sudo /opt/pos-grocery/scripts/backup.sh --verify

# Check backup retention
ls -la /opt/pos-grocery/backups/ | tail -10

# Verify backup age (should be < 24 hours)
find /opt/pos-grocery/backups -name "*.db" -mtime -1
```

##### Service Status Check
```bash
# Check current service status
pm2 status pos-server
# OR
sudo systemctl status pos-grocery

# Verify health endpoints
curl -f http://localhost:8250/api/health/ready
curl -f http://localhost:8250/api/health/integrity
```

#### 2. Disaster Declaration Criteria

**Immediate Disaster Declaration Required When:**
- Database corruption detected
- Service unavailable for > 5 minutes
- Data integrity issues found
- Security breach confirmed
- Hardware failure affecting data storage

**Escalation Process:**
1. **Level 1**: Operations team (0-5 minutes)
2. **Level 2**: Technical lead (5-15 minutes)
3. **Level 3**: Management (15+ minutes)

#### 3. Restore Drill Procedures

##### Drill Schedule
- **Frequency**: Monthly (first Saturday of each month)
- **Duration**: 2 hours maximum
- **Participants**: Operations team + Technical lead
- **Environment**: Staging environment (production-like)

##### Drill Execution Steps

**Step 1: Pre-Flight Checks (5 minutes)**
```bash
# 1. Document current system state
echo "=== PRE-DRILL SYSTEM STATE ===" > /tmp/drill-log-$(date +%Y%m%d).log
date >> /tmp/drill-log-$(date +%Y%m%d).log
pm2 status >> /tmp/drill-log-$(date +%Y%m%d).log
curl -s http://localhost:8250/api/health >> /tmp/drill-log-$(date +%Y%m%d).log

# 2. Stop services
pm2 stop pos-server
# OR
sudo systemctl stop pos-grocery

# 3. Verify service stopped
pm2 status pos-server
# OR
sudo systemctl status pos-grocery
```

**Step 2: Backup Selection (2 minutes)**
```bash
# 1. List available backups
ls -la /opt/pos-grocery/backups/

# 2. Select most recent backup (within RPO)
LATEST_BACKUP=$(ls -t /opt/pos-grocery/backups/*.db | head -1)
echo "Selected backup: $LATEST_BACKUP"

# 3. Verify backup age
BACKUP_AGE=$(($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")))
BACKUP_AGE_HOURS=$((BACKUP_AGE / 3600))
echo "Backup age: $BACKUP_AGE_HOURS hours"

# 4. Verify RPO compliance
if [ $BACKUP_AGE_HOURS -gt 24 ]; then
    echo "WARNING: Backup exceeds RPO (24h) - Age: $BACKUP_AGE_HOURS hours"
    exit 1
fi
```

**Step 3: Database Restore (5 minutes)**
```bash
# 1. Backup current database (if exists)
if [ -f "/opt/pos-grocery/data/pos.db" ]; then
    cp /opt/pos-grocery/data/pos.db /opt/pos-grocery/data/pos.db.pre-restore.$(date +%Y%m%d_%H%M%S)
fi

# 2. Restore database
cp "$LATEST_BACKUP" /opt/pos-grocery/data/pos.db

# 3. Set proper permissions
chown pos-grocery:pos-grocery /opt/pos-grocery/data/pos.db
chmod 660 /opt/pos-grocery/data/pos.db

# 4. Verify database integrity
sqlite3 /opt/pos-grocery/data/pos.db "PRAGMA integrity_check;"
```

**Step 4: Service Restart (3 minutes)**
```bash
# 1. Start service
pm2 start pos-server
# OR
sudo systemctl start pos-grocery

# 2. Wait for startup
sleep 10

# 3. Verify service started
pm2 status pos-server
# OR
sudo systemctl status pos-grocery
```

**Step 5: Health Verification (10 minutes)**
```bash
# 1. Basic health check
echo "=== HEALTH VERIFICATION ===" >> /tmp/drill-log-$(date +%Y%m%d).log
curl -f http://localhost:8250/health >> /tmp/drill-log-$(date +%Y%m%d).log 2>&1

# 2. Readiness check
curl -f http://localhost:8250/api/health/ready >> /tmp/drill-log-$(date +%Y%m%d).log 2>&1

# 3. Integrity check
curl -f http://localhost:8250/api/health/integrity >> /tmp/drill-log-$(date +%Y%m%d).log 2>&1

# 4. Verify last invoice date (RPO compliance)
LAST_INVOICE=$(sqlite3 /opt/pos-grocery/data/pos.db "SELECT MAX(created_at) FROM invoices;" 2>/dev/null || echo "No invoices")
echo "Last invoice date: $LAST_INVOICE" >> /tmp/drill-log-$(date +%Y%m%d).log
```

**Step 6: Functional Testing (5 minutes)**
```bash
# 1. Smoke test - Create test sale
echo "=== FUNCTIONAL TESTING ===" >> /tmp/drill-log-$(date +%Y%m%d).log

# Test product search
curl -s "http://localhost:8250/api/products/search?q=test" >> /tmp/drill-log-$(date +%Y%m%d).log 2>&1

# Test health endpoints
curl -s http://localhost:8250/api/health >> /tmp/drill-log-$(date +%Y%m%d).log 2>&1

# 2. Test refund functionality (if applicable)
# curl -s -X POST http://localhost:8250/api/refunds/create \
#   -H "Content-Type: application/json" \
#   -d '{"orderId":"test","items":[{"productId":"1","quantity":1,"unitPrice":10.00}],"refundReason":"Test refund","paymentMethod":"cash","managerPin":"1234"}' \
#   >> /tmp/drill-log-$(date +%Y%m%d).log 2>&1

echo "Functional testing completed" >> /tmp/drill-log-$(date +%Y%m%d).log
```

**Step 7: Drill Completion (5 minutes)**
```bash
# 1. Calculate total restore time
RESTORE_START=$(grep "PRE-DRILL SYSTEM STATE" /tmp/drill-log-$(date +%Y%m%d).log | cut -d' ' -f2-3)
RESTORE_END=$(date)
echo "Restore completed at: $RESTORE_END" >> /tmp/drill-log-$(date +%Y%m%d).log

# 2. Verify RTO compliance
# (Manual calculation - should be < 30 minutes)

# 3. Document drill results
echo "=== DRILL RESULTS ===" >> /tmp/drill-log-$(date +%Y%m%d).log
echo "Status: SUCCESS" >> /tmp/drill-log-$(date +%Y%m%d).log
echo "RPO Compliance: $(if [ $BACKUP_AGE_HOURS -le 24 ]; then echo "PASS"; else echo "FAIL"; fi)" >> /tmp/drill-log-$(date +%Y%m%d).log
echo "RTO Compliance: [MANUAL VERIFICATION REQUIRED]" >> /tmp/drill-log-$(date +%Y%m%d).log

# 4. Archive drill log
mv /tmp/drill-log-$(date +%Y%m%d).log /opt/pos-grocery/logs/drill-$(date +%Y%m%d).log
```

##### Drill Success Criteria

**Must Pass All:**
- [ ] Service starts successfully
- [ ] `/api/health/ready` returns 200
- [ ] `/api/health/integrity` passes all checks
- [ ] Last invoice date ≤ 24 hours old
- [ ] Smoke test sale completes successfully
- [ ] Total restore time ≤ 30 minutes

**Drill Failure Triggers:**
- Any health check fails
- Service won't start
- Database integrity issues
- RPO/RTO targets exceeded
- Functional tests fail

#### 4. Production Restore Procedures

**Emergency Contact List:**
- **Primary**: Operations Team Lead
- **Secondary**: Technical Lead
- **Escalation**: Management

**Immediate Actions (0-5 minutes):**
1. Declare disaster
2. Notify stakeholders
3. Begin restore process
4. Document timeline

**Restore Execution (5-30 minutes):**
1. Execute restore drill procedures
2. Verify all health checks
3. Test critical functionality
4. Notify stakeholders of completion

**Post-Restore (30+ minutes):**
1. Monitor system stability
2. Investigate root cause
3. Update procedures if needed
4. Conduct post-mortem

### Backup & Restore Scripts

#### Enhanced Backup Script

The backup script now includes:
- **Retention Management**: Automatic pruning of old backups
- **Integrity Validation**: SQLite integrity checks
- **Compression**: Gzip compression for storage efficiency
- **Logging**: Detailed backup logs with timestamps
- **Verification**: Post-backup verification steps

#### Enhanced Restore Script

The restore script now includes:
- **Pre-flight Checks**: Service status verification
- **Backup Validation**: Age and integrity verification
- **Service Management**: Automatic service stop/start
- **Health Verification**: Post-restore health checks
- **Rollback Capability**: Automatic rollback on failure

### Monitoring & Alerting

#### Backup Monitoring
- **Daily backup verification**
- **Retention policy compliance**
- **Storage space monitoring**
- **Backup integrity alerts**

#### Restore Monitoring
- **RTO tracking during drills**
- **RPO compliance verification**
- **Health check success rates**
- **Functional test results**

## Logging & Monitoring

### Production Log Policy

#### Log Format
- **Format**: Structured JSON only (no pretty printing)
- **Encoding**: UTF-8
- **Timestamp**: ISO 8601 format
- **Level**: Configurable (default: info)

#### Log Rotation
- **PM2**: 10MB max size, 7 days retention, daily rotation
- **Systemd**: 30 days retention, daily rotation
- **Compression**: Enabled for rotated logs
- **Monitoring**: Automated size and rotation checks

#### Log Structure
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
  "msg": "Health check completed"
}
```

### Log Rotation Commands

#### PM2 Log Management
```bash
# Enable log rotation
pm2 install pm2-logrotate

# Configure rotation settings
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# View logs
pm2 logs pos-server
pm2 logs pos-server --lines 100

# Check log rotation status
pm2 show pm2-logrotate
```

#### Systemd Log Management
```bash
# View logs
journalctl -u pos-grocery -f
journalctl -u pos-grocery --since "1 hour ago"

# Check log size
journalctl --disk-usage

# Clean old logs
journalctl --vacuum-time=30d
```

#### Logrotate Management
```bash
# Test logrotate configuration
logrotate -d /etc/logrotate.d/pos-grocery

# Force log rotation
logrotate -f /etc/logrotate.d/pos-grocery

# Check log file sizes
du -sh /var/log/pos/
```

### Log Configuration

Production logging is structured JSON format:

```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "msg": "Server started",
  "port": 8250,
  "env": "production",
  "pid": 1234
}
```

### Log Rotation

Create `/etc/logrotate.d/pos-grocery`:

```
/var/log/pos/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 pos pos
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Monitoring Commands

```bash
# View real-time logs
pm2 logs pos-server --lines 100

# View error logs only
pm2 logs pos-server --err --lines 50

# Monitor system resources
pm2 monit

# Check application status
pm2 status

# View system logs (systemd)
sudo journalctl -u pos-grocery -f --since "1 hour ago"
```

## Maintenance & Updates

### Application Updates

```bash
# 1. Create backup
/opt/pos-grocery/scripts/backup.sh

# 2. Pull latest changes
cd /opt/pos-grocery
git pull origin main

# 3. Install dependencies
npm install
npm --prefix server install

# 4. Build application
npm run build:all

# 5. Restart application
pm2 restart pos-server
# OR
sudo systemctl restart pos-grocery

# 6. Verify health
curl http://localhost:8250/health
```

### Database Migrations

```bash
# Run migrations manually if needed
cd /opt/pos-grocery/server
node -e "require('./dist/db').runMigrations()"
```

### System Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Restart services
sudo systemctl restart nginx
pm2 restart pos-server
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check logs
pm2 logs pos-server --err

# Check port availability
netstat -tlnp | grep :8250

# Check permissions
ls -la /opt/pos-grocery/data/
```

#### 2. Database Issues
```bash
# Check database file
ls -la /opt/pos-grocery/data/pos.db

# Test database connection
sqlite3 /opt/pos-grocery/data/pos.db "SELECT 1;"

# Check database integrity
sqlite3 /opt/pos-grocery/data/pos.db "PRAGMA integrity_check;"
```

#### 3. High Memory Usage
```bash
# Check memory usage
pm2 monit

# Restart if needed
pm2 restart pos-server

# Check for memory leaks
node --inspect dist/index.js
```

#### 4. Nginx Issues
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Reload configuration
sudo systemctl reload nginx
```

### Health Check Failures

```bash
# Check all health endpoints
curl -v http://localhost:8250/health
curl -v http://localhost:8250/api/health
curl -v http://localhost:8250/api/health/ready
curl -v http://localhost:8250/api/health/live

# Check database connectivity
curl -v http://localhost:8250/api/health | jq '.services.database'
```

## Security Considerations

### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### SSL/TLS Setup

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
0 12 * * * /usr/bin/certbot renew --quiet
```

### Application Security

1. **Environment Variables**: Never commit `.env` files
2. **Database Permissions**: Restrict database file permissions
3. **Log Security**: Sanitize logs to avoid sensitive data exposure
4. **Rate Limiting**: Configure appropriate rate limits
5. **CORS**: Restrict CORS origins to known domains only

### Regular Security Tasks

```bash
# Update dependencies
npm audit
npm audit fix

# Check for vulnerabilities
npm audit --audit-level moderate

# Review logs for suspicious activity
grep -i "error\|warn\|fail" /var/log/pos/*.log
```

## Emergency Procedures

### Complete System Recovery

```bash
# 1. Stop all services
pm2 stop all
sudo systemctl stop nginx

# 2. Restore from latest backup
gunzip -c /opt/pos-grocery/backups/pos_latest.db.gz | sqlite3 /opt/pos-grocery/data/pos.db

# 3. Restart services
pm2 start all
sudo systemctl start nginx

# 4. Verify functionality
curl http://localhost:8250/health
```

### Data Corruption Recovery

```bash
# 1. Stop application
pm2 stop pos-server

# 2. Backup corrupted database
cp /opt/pos-grocery/data/pos.db /opt/pos-grocery/data/pos_corrupted.db

# 3. Restore from backup
gunzip -c /opt/pos-grocery/backups/pos_20240115_020000.db.gz | sqlite3 /opt/pos-grocery/data/pos.db

# 4. Start application
pm2 start pos-server
```

## Support Contacts

- **System Administrator**: admin@yourdomain.com
- **Development Team**: dev@yourdomain.com
- **Emergency Contact**: +1-XXX-XXX-XXXX

## Appendix

### Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | Yes |
| `PORT` | Server port | `8250` | Yes |
| `DB_PATH` | Database file path | `./data/pos.db` | Yes |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:5173` | Yes |
| `LOG_LEVEL` | Logging level | `info` | No |
| `FAST_DEV` | Fast development mode | `false` | No |
| `SKIP_MIGRATIONS` | Skip database migrations | `false` | No |
| `SKIP_HARDWARE_CHECKS` | Skip hardware checks | `false` | No |

### Port Reference

| Port | Service | Description |
|------|---------|-------------|
| 80 | Nginx | HTTP (redirects to HTTPS) |
| 443 | Nginx | HTTPS |
| 8250 | POS Server | Backend API |
| 8080 | POS Frontend | Frontend (internal) |

---

**Last Updated**: January 15, 2024  
**Version**: 1.0.0  
**Maintainer**: Development Team
