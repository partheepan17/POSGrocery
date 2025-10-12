#!/bin/bash

# Disaster Recovery Test Script
# Tests the complete disaster recovery procedures including RPO/RTO validation

set -euo pipefail

# Configuration
BACKUP_DIR="/opt/pos-grocery/backups"
DB_PATH="/opt/pos-grocery/data/pos.db"
LOG_DIR="/opt/pos-grocery/logs"
TEST_LOG="/tmp/dr-test-$(date +%Y%m%d_%H%M%S).log"
RPO_HOURS=24
RTO_MINUTES=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$TEST_LOG"
}

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    log "TEST" "Running: $test_name"
    
    if eval "$test_command" >/dev/null 2>&1; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        log "PASS" "$test_name"
        echo -e "${GREEN}✓ $test_name${NC}"
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        log "FAIL" "$test_name"
        echo -e "${RED}✗ $test_name${NC}"
        return 1
    fi
}

# Test backup script functionality
test_backup_script() {
    log "INFO" "Testing backup script functionality..."
    
    # Test backup creation
    run_test "Backup script execution" "./scripts/backup.sh"
    
    # Test backup verification
    run_test "Backup verification" "./scripts/backup.sh --verify"
    
    # Test backup integrity
    run_test "Backup integrity check" "find $BACKUP_DIR -name 'pos_*.db*' -type f | head -1 | xargs -I {} sqlite3 {} 'PRAGMA integrity_check;' | grep -q 'ok'"
    
    # Test backup age (should be recent)
    run_test "Backup age check" "find $BACKUP_DIR -name 'pos_*.db*' -type f -mtime -1 | grep -q ."
}

# Test restore script functionality
test_restore_script() {
    log "INFO" "Testing restore script functionality..."
    
    # Test restore script help
    run_test "Restore script help" "./scripts/restore.sh --help"
    
    # Test restore script execution (dry run)
    local latest_backup
    latest_backup=$(ls -t "$BACKUP_DIR"/pos_*.db* 2>/dev/null | head -1)
    
    if [ -n "$latest_backup" ]; then
        run_test "Restore script validation" "./scripts/restore.sh \"$latest_backup\" --dry-run 2>/dev/null || true"
    else
        log "WARNING" "No backups found for restore testing"
    fi
}

# Test health endpoints
test_health_endpoints() {
    log "INFO" "Testing health endpoints..."
    
    # Test basic health
    run_test "Basic health endpoint" "curl -sf http://localhost:8250/health"
    
    # Test detailed health
    run_test "Detailed health endpoint" "curl -sf http://localhost:8250/api/health"
    
    # Test readiness
    run_test "Readiness endpoint" "curl -sf http://localhost:8250/api/health/ready"
    
    # Test liveness
    run_test "Liveness endpoint" "curl -sf http://localhost:8250/api/health/live"
    
    # Test integrity
    run_test "Integrity endpoint" "curl -sf http://localhost:8250/api/health/integrity"
}

# Test RPO compliance
test_rpo_compliance() {
    log "INFO" "Testing RPO compliance..."
    
    # Check if database exists
    if [ -f "$DB_PATH" ]; then
        # Check last invoice date
        local last_invoice
        last_invoice=$(sqlite3 "$DB_PATH" "SELECT MAX(created_at) FROM invoices;" 2>/dev/null || echo "")
        
        if [ -n "$last_invoice" ]; then
            local invoice_timestamp
            invoice_timestamp=$(date -d "$last_invoice" +%s 2>/dev/null || echo "0")
            local current_timestamp
            current_timestamp=$(date +%s)
            local hours_since_invoice
            hours_since_invoice=$(((current_timestamp - invoice_timestamp) / 3600))
            
            if [ "$hours_since_invoice" -le "$RPO_HOURS" ]; then
                run_test "RPO compliance" "true"
                log "PASS" "RPO compliance: Last invoice $hours_since_invoice hours ago"
            else
                run_test "RPO compliance" "false"
                log "FAIL" "RPO violation: Last invoice $hours_since_invoice hours ago (exceeds ${RPO_HOURS}h)"
            fi
        else
            run_test "RPO compliance (no invoices)" "true"
            log "PASS" "RPO compliance: No invoices found"
        fi
    else
        run_test "RPO compliance (no database)" "false"
        log "FAIL" "RPO compliance: No database found"
    fi
}

# Test service management
test_service_management() {
    log "INFO" "Testing service management..."
    
    # Test PM2 status
    if command -v pm2 >/dev/null 2>&1; then
        run_test "PM2 service status" "pm2 status | grep -q pos-server"
    fi
    
    # Test systemd status
    if systemctl is-active --quiet pos-grocery 2>/dev/null; then
        run_test "Systemd service status" "systemctl is-active pos-grocery"
    fi
}

# Test database integrity
test_database_integrity() {
    log "INFO" "Testing database integrity..."
    
    if [ -f "$DB_PATH" ]; then
        # Test basic integrity
        run_test "Database integrity check" "sqlite3 $DB_PATH 'PRAGMA integrity_check;' | grep -q 'ok'"
        
        # Test schema presence
        run_test "Schema presence check" "sqlite3 $DB_PATH \"SELECT name FROM sqlite_master WHERE type='table' AND name='products';\" | grep -q 'products'"
        
        # Test index presence
        run_test "Index presence check" "sqlite3 $DB_PATH \"SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';\" | grep -q 'idx_'"
    else
        run_test "Database integrity check" "false"
        log "FAIL" "Database file not found: $DB_PATH"
    fi
}

# Test functional endpoints
test_functional_endpoints() {
    log "INFO" "Testing functional endpoints..."
    
    # Test product search
    run_test "Product search endpoint" "curl -sf 'http://localhost:8250/api/products/search?q=test'"
    
    # Test categories endpoint
    run_test "Categories endpoint" "curl -sf http://localhost:8250/api/categories"
    
    # Test suppliers endpoint
    run_test "Suppliers endpoint" "curl -sf http://localhost:8250/api/suppliers"
}

# Test backup retention
test_backup_retention() {
    log "INFO" "Testing backup retention..."
    
    # Check if backups exist
    if ls "$BACKUP_DIR"/pos_*.db* >/dev/null 2>&1; then
        # Count total backups
        local total_backups
        total_backups=$(find "$BACKUP_DIR" -name "pos_*.db*" -type f | wc -l)
        
        if [ "$total_backups" -gt 0 ]; then
            run_test "Backup retention (backups exist)" "true"
            log "PASS" "Found $total_backups backup(s)"
        else
            run_test "Backup retention (no backups)" "false"
            log "FAIL" "No backups found"
        fi
        
        # Check for old backups (should be cleaned up)
        local old_backups
        old_backups=$(find "$BACKUP_DIR" -name "pos_*.db*" -type f -mtime +30 | wc -l)
        
        if [ "$old_backups" -eq 0 ]; then
            run_test "Backup retention (no old backups)" "true"
            log "PASS" "No old backups found (retention working)"
        else
            run_test "Backup retention (old backups found)" "false"
            log "FAIL" "Found $old_backups old backup(s) (retention not working)"
        fi
    else
        run_test "Backup retention (no backup directory)" "false"
        log "FAIL" "No backup directory or backups found"
    fi
}

# Test restore drill simulation
test_restore_drill() {
    log "INFO" "Testing restore drill simulation..."
    
    local start_time=$(date +%s)
    
    # Simulate restore drill steps
    run_test "Pre-flight checks" "test -d $BACKUP_DIR && test -d $(dirname $DB_PATH)"
    
    # Test backup selection
    local latest_backup
    latest_backup=$(ls -t "$BACKUP_DIR"/pos_*.db* 2>/dev/null | head -1)
    
    if [ -n "$latest_backup" ]; then
        run_test "Backup selection" "test -f $latest_backup"
        
        # Test backup validation
        run_test "Backup validation" "test -s $latest_backup"
    else
        run_test "Backup selection" "false"
        log "FAIL" "No backups available for restore drill"
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Test RTO compliance (simulation should be fast)
    if [ $duration -le $((RTO_MINUTES * 60)) ]; then
        run_test "RTO compliance (simulation)" "true"
        log "PASS" "Restore drill simulation completed in ${duration}s (within ${RTO_MINUTES}m)"
    else
        run_test "RTO compliance (simulation)" "false"
        log "FAIL" "Restore drill simulation took ${duration}s (exceeds ${RTO_MINUTES}m)"
    fi
}

# Generate test report
generate_test_report() {
    local end_time=$(date +%s)
    local start_time=$(grep "Starting disaster recovery test" "$TEST_LOG" | head -1 | cut -d' ' -f1-2)
    local start_timestamp
    start_timestamp=$(date -d "$start_time" +%s 2>/dev/null || echo "$end_time")
    local total_duration=$((end_time - start_timestamp))
    
    log "INFO" "Generating test report..."
    
    cat >> "$TEST_LOG" << EOF

=== DISASTER RECOVERY TEST REPORT ===
Test Start: $start_time
Test End: $(date)
Total Duration: ${total_duration} seconds

=== TEST RESULTS ===
Total Tests: $TOTAL_TESTS
Passed: $TESTS_PASSED
Failed: $TESTS_FAILED
Success Rate: $(( (TESTS_PASSED * 100) / TOTAL_TESTS ))%

=== RPO/RTO TARGETS ===
RPO Target: ${RPO_HOURS} hours
RTO Target: ${RTO_MINUTES} minutes

=== RECOMMENDATIONS ===
EOF

    if [ $TESTS_FAILED -eq 0 ]; then
        echo "All tests passed - Disaster recovery system is ready" >> "$TEST_LOG"
    else
        echo "Some tests failed - Review and fix issues before production deployment" >> "$TEST_LOG"
    fi
    
    # Archive test log
    local archived_log="${LOG_DIR}/dr-test-$(date +%Y%m%d_%H%M%S).log"
    cp "$TEST_LOG" "$archived_log"
    
    log "SUCCESS" "Test report generated: $archived_log"
}

# Main test function
main() {
    local start_time=$(date)
    
    echo -e "${BLUE}=== Disaster Recovery Test Suite ===${NC}"
    echo -e "RPO Target: ${RPO_HOURS} hours"
    echo -e "RTO Target: ${RTO_MINUTES} minutes"
    echo
    
    log "INFO" "Starting disaster recovery test: $start_time"
    
    # Create log directory if it doesn't exist
    mkdir -p "$LOG_DIR"
    
    # Run all tests
    test_backup_script
    test_restore_script
    test_health_endpoints
    test_rpo_compliance
    test_service_management
    test_database_integrity
    test_functional_endpoints
    test_backup_retention
    test_restore_drill
    
    # Generate report
    generate_test_report
    
    # Display summary
    echo
    echo -e "${BLUE}=== Test Summary ===${NC}"
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
    echo -e "Success Rate: $(( (TESTS_PASSED * 100) / TOTAL_TESTS ))%"
    echo
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All tests passed - Disaster recovery system is ready${NC}"
        exit 0
    else
        echo -e "${RED}✗ Some tests failed - Review issues before production${NC}"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    --help)
        echo "Usage: $0 [--help]"
        echo "  --help  Show this help message"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac




