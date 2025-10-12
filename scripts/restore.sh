#!/bin/bash

# Enhanced Restore Script for POS Grocery System
# Features: Pre-flight checks, backup validation, service management, health verification, rollback

set -euo pipefail

# Configuration
BACKUP_DIR="/opt/pos-grocery/backups"
DB_PATH="/opt/pos-grocery/data/pos.db"
SERVICE_NAME="pos-server"
SYSTEMD_SERVICE="pos-grocery"
LOG_DIR="/opt/pos-grocery/logs"
RESTORE_LOG="/tmp/restore-$(date +%Y%m%d_%H%M%S).log"
RPO_HOURS=24
RTO_MINUTES=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$RESTORE_LOG"
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    echo -e "${RED}✗ Restore failed: $1${NC}"
    exit 1
}

# Success function
success() {
    log "SUCCESS" "$1"
    echo -e "${GREEN}✓ $1${NC}"
}

# Warning function
warning() {
    log "WARNING" "$1"
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Info function
info() {
    log "INFO" "$1"
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if running as root or with sudo
check_permissions() {
    if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
        error_exit "This script requires root privileges or sudo access"
    fi
}

# Pre-flight checks
pre_flight_checks() {
    info "Performing pre-flight checks..."
    
    # Check if backup directory exists
    if [ ! -d "$BACKUP_DIR" ]; then
        error_exit "Backup directory not found: $BACKUP_DIR"
    fi
    
    # Check if data directory exists
    if [ ! -d "$(dirname "$DB_PATH")" ]; then
        error_exit "Data directory not found: $(dirname "$DB_PATH")"
    fi
    
    # Check if log directory exists
    if [ ! -d "$LOG_DIR" ]; then
        warning "Log directory not found, creating: $LOG_DIR"
        mkdir -p "$LOG_DIR" || error_exit "Failed to create log directory"
    fi
    
    # Check if required tools are available
    local required_tools=("sqlite3" "curl" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            error_exit "Required tool not found: $tool"
        fi
    done
    
    success "Pre-flight checks passed"
}

# List available backups
list_backups() {
    info "Available backups:"
    
    if ! ls "$BACKUP_DIR"/pos_*.db* >/dev/null 2>&1; then
        error_exit "No backups found in $BACKUP_DIR"
    fi
    
    local backup_count=0
    while IFS= read -r -d '' backup_file; do
        backup_count=$((backup_count + 1))
        local file_size
        file_size=$(stat -c %s "$backup_file" 2>/dev/null | numfmt --to=iec || echo "Unknown")
        local file_age_hours
        file_age_hours=$(($(($(date +%s) - $(stat -c %Y "$backup_file"))) / 3600))
        
        printf "  %2d. %s (%s, %dh old)\n" "$backup_count" "$(basename "$backup_file")" "$file_size" "$file_age_hours"
    done < <(find "$BACKUP_DIR" -name "pos_*.db*" -type f -print0 | sort -rz)
    
    echo
}

# Select backup
select_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        # Auto-select latest backup
        backup_file=$(ls -t "$BACKUP_DIR"/pos_*.db* 2>/dev/null | head -1)
        if [ -z "$backup_file" ]; then
            error_exit "No backups found for auto-selection"
        fi
        info "Auto-selected latest backup: $(basename "$backup_file")"
    else
        # Use provided backup file
        if [ ! -f "$backup_file" ]; then
            error_exit "Backup file not found: $backup_file"
        fi
        info "Using specified backup: $(basename "$backup_file")"
    fi
    
    echo "$backup_file"
}

# Validate backup
validate_backup() {
    local backup_file="$1"
    
    info "Validating backup: $(basename "$backup_file")"
    
    # Check backup age
    local backup_age_hours
    backup_age_hours=$(($(($(date +%s) - $(stat -c %Y "$backup_file"))) / 3600))
    
    if [ "$backup_age_hours" -gt "$RPO_HOURS" ]; then
        warning "Backup exceeds RPO (${RPO_HOURS}h) - Age: ${backup_age_hours}h"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error_exit "Restore cancelled due to RPO violation"
        fi
    else
        success "Backup age within RPO: ${backup_age_hours}h"
    fi
    
    # Check backup integrity
    local temp_db="/tmp/restore_verify_$(date +%s).db"
    
    if [[ "$backup_file" == *.gz ]]; then
        # Decompress for verification
        if ! gunzip -c "$backup_file" > "$temp_db"; then
            error_exit "Failed to decompress backup for verification"
        fi
    else
        # Copy for verification
        if ! cp "$backup_file" "$temp_db"; then
            error_exit "Failed to copy backup for verification"
        fi
    fi
    
    # Verify database integrity
    local integrity_result
    integrity_result=$(sqlite3 "$temp_db" "PRAGMA integrity_check;" 2>&1)
    
    if [ "$integrity_result" = "ok" ]; then
        success "Backup integrity verification passed"
    else
        rm -f "$temp_db"
        error_exit "Backup integrity verification failed: $integrity_result"
    fi
    
    # Clean up temporary file
    rm -f "$temp_db"
    
    success "Backup validation completed"
}

# Stop services
stop_services() {
    info "Stopping services..."
    
    # Try PM2 first
    if command -v pm2 >/dev/null 2>&1 && pm2 list | grep -q "$SERVICE_NAME"; then
        info "Stopping PM2 service: $SERVICE_NAME"
        if pm2 stop "$SERVICE_NAME"; then
            success "PM2 service stopped"
        else
            warning "Failed to stop PM2 service"
        fi
    fi
    
    # Try systemd
    if systemctl is-active --quiet "$SYSTEMD_SERVICE" 2>/dev/null; then
        info "Stopping systemd service: $SYSTEMD_SERVICE"
        if systemctl stop "$SYSTEMD_SERVICE"; then
            success "Systemd service stopped"
        else
            warning "Failed to stop systemd service"
        fi
    fi
    
    # Wait for services to stop
    sleep 5
    
    # Verify services are stopped
    local services_running=false
    
    if command -v pm2 >/dev/null 2>&1 && pm2 list | grep -q "$SERVICE_NAME.*online"; then
        services_running=true
        warning "PM2 service still running"
    fi
    
    if systemctl is-active --quiet "$SYSTEMD_SERVICE" 2>/dev/null; then
        services_running=true
        warning "Systemd service still running"
    fi
    
    if [ "$services_running" = true ]; then
        warning "Some services are still running, proceeding anyway"
    else
        success "All services stopped"
    fi
}

# Create backup of current database
backup_current_db() {
    if [ -f "$DB_PATH" ]; then
        local backup_name="pos.db.pre-restore.$(date +%Y%m%d_%H%M%S)"
        local backup_path="$(dirname "$DB_PATH")/$backup_name"
        
        info "Creating backup of current database: $backup_name"
        
        if cp "$DB_PATH" "$backup_path"; then
            success "Current database backed up: $backup_path"
            echo "$backup_path" > /tmp/restore_rollback_path
        else
            warning "Failed to backup current database"
        fi
    else
        info "No current database to backup"
    fi
}

# Restore database
restore_database() {
    local backup_file="$1"
    
    info "Restoring database from: $(basename "$backup_file")"
    
    # Create data directory if it doesn't exist
    mkdir -p "$(dirname "$DB_PATH")"
    
    if [[ "$backup_file" == *.gz ]]; then
        # Decompress and restore
        if gunzip -c "$backup_file" > "$DB_PATH"; then
            success "Database restored from compressed backup"
        else
            error_exit "Failed to restore from compressed backup"
        fi
    else
        # Copy backup
        if cp "$backup_file" "$DB_PATH"; then
            success "Database restored from backup"
        else
            error_exit "Failed to restore database"
        fi
    fi
    
    # Set proper permissions
    chown pos-grocery:pos-grocery "$DB_PATH" 2>/dev/null || warning "Failed to set database ownership"
    chmod 660 "$DB_PATH" || warning "Failed to set database permissions"
    
    # Verify restored database
    if sqlite3 "$DB_PATH" "PRAGMA integrity_check;" | grep -q "ok"; then
        success "Restored database integrity verified"
    else
        error_exit "Restored database integrity check failed"
    fi
}

# Start services
start_services() {
    info "Starting services..."
    
    # Try PM2 first
    if command -v pm2 >/dev/null 2>&1; then
        info "Starting PM2 service: $SERVICE_NAME"
        if pm2 start "$SERVICE_NAME"; then
            success "PM2 service started"
        else
            warning "Failed to start PM2 service"
        fi
    fi
    
    # Try systemd
    if systemctl is-enabled --quiet "$SYSTEMD_SERVICE" 2>/dev/null; then
        info "Starting systemd service: $SYSTEMD_SERVICE"
        if systemctl start "$SYSTEMD_SERVICE"; then
            success "Systemd service started"
        else
            warning "Failed to start systemd service"
        fi
    fi
    
    # Wait for services to start
    info "Waiting for services to start..."
    sleep 10
}

# Health verification
verify_health() {
    info "Verifying service health..."
    
    local max_attempts=30
    local attempt=0
    local health_ok=false
    
    while [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))
        info "Health check attempt $attempt/$max_attempts"
        
        # Check basic health
        if curl -sf http://localhost:8250/health >/dev/null 2>&1; then
            info "Basic health check passed"
            
            # Check readiness
            if curl -sf http://localhost:8250/api/health/ready >/dev/null 2>&1; then
                info "Readiness check passed"
                
                # Check integrity
                if curl -sf http://localhost:8250/api/health/integrity >/dev/null 2>&1; then
                    success "All health checks passed"
                    health_ok=true
                    break
                else
                    warning "Integrity check failed"
                fi
            else
                warning "Readiness check failed"
            fi
        else
            warning "Basic health check failed"
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            sleep 10
        fi
    done
    
    if [ "$health_ok" = false ]; then
        error_exit "Health verification failed after $max_attempts attempts"
    fi
}

# Verify RPO compliance
verify_rpo() {
    info "Verifying RPO compliance..."
    
    # Check last invoice date (if invoices table exists)
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
            success "RPO compliance verified: Last invoice $hours_since_invoice hours ago"
        else
            warning "RPO violation: Last invoice $hours_since_invoice hours ago (exceeds ${RPO_HOURS}h)"
        fi
    else
        info "No invoices found, RPO check skipped"
    fi
}

# Functional testing
functional_test() {
    info "Performing functional tests..."
    
    # Test product search
    if curl -sf "http://localhost:8250/api/products/search?q=test" >/dev/null 2>&1; then
        success "Product search test passed"
    else
        warning "Product search test failed"
    fi
    
    # Test health endpoints
    if curl -sf http://localhost:8250/api/health >/dev/null 2>&1; then
        success "Health endpoint test passed"
    else
        warning "Health endpoint test failed"
    fi
    
    # Test catalog endpoints
    if curl -sf http://localhost:8250/api/categories >/dev/null 2>&1; then
        success "Categories endpoint test passed"
    else
        warning "Categories endpoint test failed"
    fi
    
    success "Functional tests completed"
}

# Rollback function
rollback() {
    local rollback_path="$1"
    
    if [ -f "$rollback_path" ]; then
        warning "Rolling back to previous database..."
        
        if cp "$rollback_path" "$DB_PATH"; then
            success "Rollback completed"
        else
            error_exit "Rollback failed"
        fi
    else
        warning "No rollback path available"
    fi
}

# Generate restore report
generate_report() {
    local start_time="$1"
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    info "Generating restore report..."
    
    cat >> "$RESTORE_LOG" << EOF

=== RESTORE REPORT ===
Start Time: $(date -d "@$start_time")
End Time: $(date -d "@$end_time")
Duration: ${duration} seconds
RTO Target: ${RTO_MINUTES} minutes
RPO Target: ${RPO_HOURS} hours

=== SERVICE STATUS ===
EOF

    # Check service status
    if command -v pm2 >/dev/null 2>&1; then
        pm2 status >> "$RESTORE_LOG" 2>&1 || true
    fi
    
    if systemctl is-active --quiet "$SYSTEMD_SERVICE" 2>/dev/null; then
        systemctl status "$SYSTEMD_SERVICE" >> "$RESTORE_LOG" 2>&1 || true
    fi
    
    # Check health endpoints
    echo "=== HEALTH CHECKS ===" >> "$RESTORE_LOG"
    curl -s http://localhost:8250/health >> "$RESTORE_LOG" 2>&1 || true
    echo "" >> "$RESTORE_LOG"
    curl -s http://localhost:8250/api/health/ready >> "$RESTORE_LOG" 2>&1 || true
    echo "" >> "$RESTORE_LOG"
    curl -s http://localhost:8250/api/health/integrity >> "$RESTORE_LOG" 2>&1 || true
    
    # Archive log
    local archived_log="${LOG_DIR}/restore-$(date +%Y%m%d_%H%M%S).log"
    cp "$RESTORE_LOG" "$archived_log"
    
    success "Restore report generated: $archived_log"
}

# Main restore function
main() {
    local backup_file="${1:-}"
    local start_time=$(date +%s)
    
    echo -e "${BLUE}=== POS Grocery Restore Script ===${NC}"
    echo -e "RTO Target: ${RTO_MINUTES} minutes"
    echo -e "RPO Target: ${RPO_HOURS} hours"
    echo
    
    # Execute restore steps
    check_permissions
    pre_flight_checks
    list_backups
    backup_file=$(select_backup "$backup_file")
    validate_backup "$backup_file"
    stop_services
    backup_current_db
    restore_database "$backup_file"
    start_services
    verify_health
    verify_rpo
    functional_test
    generate_report "$start_time"
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    success "Restore completed successfully in ${duration} seconds"
    
    # Check RTO compliance
    if [ $duration -le $((RTO_MINUTES * 60)) ]; then
        success "RTO target met: ${duration}s < ${RTO_MINUTES}m"
    else
        warning "RTO target exceeded: ${duration}s > ${RTO_MINUTES}m"
    fi
    
    echo -e "${GREEN}✓ Restore completed successfully${NC}"
    echo -e "  Duration: ${duration}s"
    echo -e "  Log: $RESTORE_LOG"
}

# Handle command line arguments
case "${1:-}" in
    --help)
        echo "Usage: $0 [backup_file] [--help]"
        echo "  backup_file  Path to backup file (optional, auto-selects latest)"
        echo "  --help       Show this help message"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac