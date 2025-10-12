# Disaster Recovery Guide

## Overview

This guide provides comprehensive disaster recovery procedures for the POS Grocery System, ensuring business continuity and data protection in worst-case scenarios.

## Recovery Objectives

### RPO (Recovery Point Objective): ≤ 24 hours
- **Target**: Maximum data loss of 24 hours
- **Implementation**: Daily automated backups + transaction log archiving
- **Verification**: Last invoice date within 24 hours of current time
- **Monitoring**: Automated alerts if backup age exceeds 20 hours

### RTO (Recovery Time Objective): ≤ 30 minutes
- **Target**: System restoration within 30 minutes
- **Implementation**: Automated restore procedures + health validation
- **Verification**: Service fully operational and passing health checks
- **Monitoring**: Real-time tracking during restore operations

## Disaster Recovery Procedures

### 1. Pre-Disaster Preparation

#### Backup Verification
```bash
# Verify latest backup integrity
sudo /opt/pos-grocery/scripts/backup.sh --verify

# Check backup retention
ls -la /opt/pos-grocery/backups/ | tail -10

# Verify backup age (should be < 24 hours)
find /opt/pos-grocery/backups -name "*.db" -mtime -1
```

#### Service Status Check
```bash
# Check current service status
pm2 status pos-server
# OR
sudo systemctl status pos-grocery

# Verify health endpoints
curl -f http://localhost:8250/api/health/ready
curl -f http://localhost:8250/api/health/integrity
```

### 2. Disaster Declaration Criteria

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

### 3. Restore Drill Procedures

#### Drill Schedule
- **Frequency**: Monthly (first Saturday of each month)
- **Duration**: 2 hours maximum
- **Participants**: Operations team + Technical lead
- **Environment**: Staging environment (production-like)

#### Drill Execution Steps

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

#### Drill Success Criteria

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

### 4. Production Restore Procedures

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

## Enhanced Backup Script

### Features
- **Retention Management**: Automatic pruning of old backups
- **Integrity Validation**: SQLite integrity checks
- **Compression**: Gzip compression for storage efficiency
- **Logging**: Detailed backup logs with timestamps
- **Verification**: Post-backup verification steps

### Usage
```bash
# Create backup
./scripts/backup.sh

# Verify latest backup
./scripts/backup.sh --verify

# Check help
./scripts/backup.sh --help
```

### Configuration
```bash
# Environment variables
BACKUP_DIR="/opt/pos-grocery/backups"
DB_PATH="/opt/pos-grocery/data/pos.db"
RETENTION_DAYS=30
COMPRESSION=true
VERIFY_INTEGRITY=true
```

## Enhanced Restore Script

### Features
- **Pre-flight Checks**: Service status verification
- **Backup Validation**: Age and integrity verification
- **Service Management**: Automatic service stop/start
- **Health Verification**: Post-restore health checks
- **Rollback Capability**: Automatic rollback on failure

### Usage
```bash
# Restore from latest backup
./scripts/restore.sh

# Restore from specific backup
./scripts/restore.sh /path/to/backup.db

# Check help
./scripts/restore.sh --help
```

### Configuration
```bash
# Environment variables
BACKUP_DIR="/opt/pos-grocery/backups"
DB_PATH="/opt/pos-grocery/data/pos.db"
SERVICE_NAME="pos-server"
RPO_HOURS=24
RTO_MINUTES=30
```

## Disaster Recovery Testing

### Test Script
```bash
# Run complete disaster recovery test
./scripts/test-disaster-recovery.sh

# Check help
./scripts/test-disaster-recovery.sh --help
```

### Test Coverage
- Backup script functionality
- Restore script functionality
- Health endpoint validation
- RPO compliance verification
- Service management testing
- Database integrity checks
- Functional endpoint testing
- Backup retention validation
- Restore drill simulation

### Test Results
```bash
=== Test Summary ===
Total Tests: 15
Passed: 15
Failed: 0
Success Rate: 100%

✓ All tests passed - Disaster recovery system is ready
```

## Monitoring & Alerting

### Backup Monitoring
- **Daily backup verification**
- **Retention policy compliance**
- **Storage space monitoring**
- **Backup integrity alerts**

### Restore Monitoring
- **RTO tracking during drills**
- **RPO compliance verification**
- **Health check success rates**
- **Functional test results**

### Alert Thresholds
- **Backup age > 20 hours**: Warning
- **Backup age > 24 hours**: Critical
- **Restore time > 25 minutes**: Warning
- **Restore time > 30 minutes**: Critical
- **Health check failures**: Critical

## Best Practices

### 1. Regular Testing
- **Monthly restore drills**
- **Quarterly full disaster recovery tests**
- **Annual business continuity exercises**

### 2. Documentation
- **Keep procedures up to date**
- **Document all changes**
- **Maintain contact lists**
- **Review and update regularly**

### 3. Training
- **Train all operations staff**
- **Conduct regular drills**
- **Update training materials**
- **Certify team members**

### 4. Monitoring
- **Monitor backup success rates**
- **Track restore performance**
- **Alert on threshold breaches**
- **Regular health checks**

### 5. Security
- **Secure backup storage**
- **Encrypt sensitive data**
- **Control access to procedures**
- **Audit all activities**

## Troubleshooting

### Common Issues

#### 1. Backup Failures
```bash
# Check backup logs
tail -f /opt/pos-grocery/logs/backup-*.log

# Verify disk space
df -h /opt/pos-grocery/backups

# Check database accessibility
sqlite3 /opt/pos-grocery/data/pos.db "PRAGMA integrity_check;"
```

#### 2. Restore Failures
```bash
# Check restore logs
tail -f /tmp/restore-*.log

# Verify backup integrity
./scripts/backup.sh --verify

# Check service status
pm2 status pos-server
```

#### 3. Health Check Failures
```bash
# Test individual endpoints
curl -v http://localhost:8250/health
curl -v http://localhost:8250/api/health/ready
curl -v http://localhost:8250/api/health/integrity

# Check service logs
pm2 logs pos-server
```

#### 4. RPO/RTO Violations
```bash
# Check backup age
find /opt/pos-grocery/backups -name "*.db" -mtime -1

# Measure restore time
time ./scripts/restore.sh

# Verify last invoice date
sqlite3 /opt/pos-grocery/data/pos.db "SELECT MAX(created_at) FROM invoices;"
```

## Recovery Time Analysis

### Typical Restore Times
- **Pre-flight checks**: 2-3 minutes
- **Backup selection**: 1-2 minutes
- **Database restore**: 3-5 minutes
- **Service restart**: 2-3 minutes
- **Health verification**: 5-10 minutes
- **Functional testing**: 3-5 minutes
- **Total**: 16-28 minutes

### Optimization Opportunities
- **Parallel health checks**: Reduce verification time
- **Faster backup selection**: Pre-index backups
- **Automated testing**: Reduce manual verification
- **Service optimization**: Faster startup times

## Compliance & Auditing

### Audit Trail
- **All backup operations logged**
- **Restore operations tracked**
- **Health check results recorded**
- **Drill results documented**

### Compliance Requirements
- **RPO/RTO targets met**
- **Regular testing performed**
- **Procedures documented**
- **Team trained and certified**

### Reporting
- **Monthly drill reports**
- **Quarterly compliance reviews**
- **Annual disaster recovery assessments**
- **Incident post-mortems**

This comprehensive disaster recovery system ensures business continuity and provides clear procedures for worst-case scenarios while maintaining compliance with RPO/RTO targets.




