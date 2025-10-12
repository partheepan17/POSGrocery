#!/bin/bash

# Log Rotation Verification Script
# Verifies that log rotation is working correctly and logs don't grow unbounded

set -euo pipefail

# Configuration
LOG_DIR="/var/log/pos"
PM2_LOG_DIR="/opt/pos-grocery/server/logs"
MAX_LOG_SIZE="50M"  # Alert if any log exceeds this size
RETENTION_DAYS=7
COMPRESSION_ENABLED=true

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
    echo "[$timestamp] [$level] $message"
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    echo -e "${RED}✗ $1${NC}"
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

# Check log file sizes
check_log_sizes() {
    info "Checking log file sizes..."
    
    local oversized_logs=()
    local total_size=0
    
    # Check systemd logs
    if [ -d "$LOG_DIR" ]; then
        while IFS= read -r -d '' log_file; do
            local file_size
            file_size=$(stat -c %s "$log_file" 2>/dev/null || echo "0")
            local file_size_mb=$((file_size / 1024 / 1024))
            total_size=$((total_size + file_size))
            
            if [ "$file_size" -gt 52428800 ]; then  # 50MB in bytes
                oversized_logs+=("$log_file ($file_size_mb MB)")
            fi
            
            info "Log file: $(basename "$log_file") - ${file_size_mb} MB"
        done < <(find "$LOG_DIR" -name "*.log" -type f -print0)
    else
        warning "Systemd log directory not found: $LOG_DIR"
    fi
    
    # Check PM2 logs
    if [ -d "$PM2_LOG_DIR" ]; then
        while IFS= read -r -d '' log_file; do
            local file_size
            file_size=$(stat -c %s "$log_file" 2>/dev/null || echo "0")
            local file_size_mb=$((file_size / 1024 / 1024))
            total_size=$((total_size + file_size))
            
            if [ "$file_size" -gt 52428800 ]; then  # 50MB in bytes
                oversized_logs+=("$log_file ($file_size_mb MB)")
            fi
            
            info "PM2 log file: $(basename "$log_file") - ${file_size_mb} MB"
        done < <(find "$PM2_LOG_DIR" -name "*.log" -type f -print0)
    else
        warning "PM2 log directory not found: $PM2_LOG_DIR"
    fi
    
    local total_size_mb=$((total_size / 1024 / 1024))
    info "Total log size: ${total_size_mb} MB"
    
    if [ ${#oversized_logs[@]} -gt 0 ]; then
        error_exit "Oversized log files found: ${oversized_logs[*]}"
    else
        success "All log files are within size limits"
    fi
}

# Check log rotation configuration
check_rotation_config() {
    info "Checking log rotation configuration..."
    
    # Check logrotate configuration
    if [ -f "/etc/logrotate.d/pos-grocery" ]; then
        success "Logrotate configuration found"
        
        # Verify logrotate configuration
        if logrotate -d /etc/logrotate.d/pos-grocery >/dev/null 2>&1; then
            success "Logrotate configuration is valid"
        else
            warning "Logrotate configuration has issues"
        fi
    else
        warning "Logrotate configuration not found: /etc/logrotate.d/pos-grocery"
    fi
    
    # Check PM2 log rotation
    if command -v pm2 >/dev/null 2>&1; then
        if pm2 show pm2-logrotate >/dev/null 2>&1; then
            success "PM2 log rotation is enabled"
            
            # Check PM2 log rotation settings
            local max_size
            max_size=$(pm2 jlist | jq -r '.[] | select(.name=="pm2-logrotate") | .pm2_env.pm2_logrotate_max_size' 2>/dev/null || echo "unknown")
            local retain
            retain=$(pm2 jlist | jq -r '.[] | select(.name=="pm2-logrotate") | .pm2_env.pm2_logrotate_retain' 2>/dev/null || echo "unknown")
            
            info "PM2 log rotation settings: max_size=$max_size, retain=$retain"
        else
            warning "PM2 log rotation is not enabled"
        fi
    else
        warning "PM2 not found, skipping PM2 log rotation check"
    fi
}

# Check log retention
check_log_retention() {
    info "Checking log retention..."
    
    local old_logs=()
    local cutoff_date
    cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%s 2>/dev/null || echo "0")
    
    # Check systemd logs
    if [ -d "$LOG_DIR" ]; then
        while IFS= read -r -d '' log_file; do
            local file_date
            file_date=$(stat -c %Y "$log_file" 2>/dev/null || echo "0")
            
            if [ "$file_date" -lt "$cutoff_date" ]; then
                old_logs+=("$log_file")
            fi
        done < <(find "$LOG_DIR" -name "*.log.*" -type f -print0)
    fi
    
    # Check PM2 logs
    if [ -d "$PM2_LOG_DIR" ]; then
        while IFS= read -r -d '' log_file; do
            local file_date
            file_date=$(stat -c %Y "$log_file" 2>/dev/null || echo "0")
            
            if [ "$file_date" -lt "$cutoff_date" ]; then
                old_logs+=("$log_file")
            fi
        done < <(find "$PM2_LOG_DIR" -name "*.log.*" -type f -print0)
    fi
    
    if [ ${#old_logs[@]} -gt 0 ]; then
        warning "Old log files found (older than $RETENTION_DAYS days):"
        for log_file in "${old_logs[@]}"; do
            echo "  - $log_file"
        done
    else
        success "No old log files found (retention policy working)"
    fi
}

# Check log compression
check_log_compression() {
    info "Checking log compression..."
    
    local compressed_logs=0
    local uncompressed_logs=0
    
    # Check for compressed logs
    if [ -d "$LOG_DIR" ]; then
        compressed_logs=$(find "$LOG_DIR" -name "*.log.*.gz" -type f | wc -l)
        uncompressed_logs=$(find "$LOG_DIR" -name "*.log.*" -not -name "*.gz" -type f | wc -l)
    fi
    
    if [ -d "$PM2_LOG_DIR" ]; then
        compressed_logs=$((compressed_logs + $(find "$PM2_LOG_DIR" -name "*.log.*.gz" -type f | wc -l)))
        uncompressed_logs=$((uncompressed_logs + $(find "$PM2_LOG_DIR" -name "*.log.*" -not -name "*.gz" -type f | wc -l)))
    fi
    
    info "Compressed logs: $compressed_logs"
    info "Uncompressed logs: $uncompressed_logs"
    
    if [ "$uncompressed_logs" -gt 0 ]; then
        warning "Some rotated logs are not compressed"
    else
        success "All rotated logs are compressed"
    fi
}

# Check log format
check_log_format() {
    info "Checking log format..."
    
    local malformed_logs=0
    local total_logs=0
    
    # Check systemd logs
    if [ -d "$LOG_DIR" ]; then
        while IFS= read -r -d '' log_file; do
            total_logs=$((total_logs + 1))
            
            # Check if log file contains valid JSON
            if ! head -1 "$log_file" | jq . >/dev/null 2>&1; then
                malformed_logs=$((malformed_logs + 1))
                warning "Malformed JSON in log file: $log_file"
            fi
        done < <(find "$LOG_DIR" -name "*.log" -type f -print0)
    fi
    
    # Check PM2 logs
    if [ -d "$PM2_LOG_DIR" ]; then
        while IFS= read -r -d '' log_file; do
            total_logs=$((total_logs + 1))
            
            # Check if log file contains valid JSON
            if ! head -1 "$log_file" | jq . >/dev/null 2>&1; then
                malformed_logs=$((malformed_logs + 1))
                warning "Malformed JSON in log file: $log_file"
            fi
        done < <(find "$PM2_LOG_DIR" -name "*.log" -type f -print0)
    fi
    
    if [ "$malformed_logs" -eq 0 ]; then
        success "All log files have valid JSON format"
    else
        warning "Found $malformed_logs malformed log files out of $total_logs total"
    fi
}

# Test log rotation
test_log_rotation() {
    info "Testing log rotation..."
    
    # Test logrotate configuration
    if [ -f "/etc/logrotate.d/pos-grocery" ]; then
        if logrotate -d /etc/logrotate.d/pos-grocery >/dev/null 2>&1; then
            success "Logrotate test passed"
        else
            error_exit "Logrotate test failed"
        fi
    fi
    
    # Test PM2 log rotation (if available)
    if command -v pm2 >/dev/null 2>&1 && pm2 show pm2-logrotate >/dev/null 2>&1; then
        info "PM2 log rotation is configured and running"
    fi
}

# Generate report
generate_report() {
    local end_time=$(date +%s)
    local start_time=$(grep "Starting log rotation verification" /tmp/log-rotation-check.log 2>/dev/null | head -1 | cut -d' ' -f1-2 || echo "")
    local start_timestamp
    start_timestamp=$(date -d "$start_time" +%s 2>/dev/null || echo "$end_time")
    local duration=$((end_time - start_timestamp))
    
    info "Generating verification report..."
    
    cat >> /tmp/log-rotation-check.log << EOF

=== LOG ROTATION VERIFICATION REPORT ===
Verification Start: $start_time
Verification End: $(date)
Duration: ${duration} seconds

=== SUMMARY ===
- Log sizes: Checked
- Rotation config: Checked
- Log retention: Checked
- Compression: Checked
- Log format: Checked
- Rotation test: Completed

=== RECOMMENDATIONS ===
EOF

    if [ -f "/etc/logrotate.d/pos-grocery" ]; then
        echo "- Logrotate configuration is present" >> /tmp/log-rotation-check.log
    else
        echo "- Install logrotate configuration: cp pos-grocery.logrotate /etc/logrotate.d/pos-grocery" >> /tmp/log-rotation-check.log
    fi
    
    if command -v pm2 >/dev/null 2>&1 && pm2 show pm2-logrotate >/dev/null 2>&1; then
        echo "- PM2 log rotation is enabled" >> /tmp/log-rotation-check.log
    else
        echo "- Enable PM2 log rotation: pm2 install pm2-logrotate" >> /tmp/log-rotation-check.log
    fi
    
    # Archive report
    local archived_report="/opt/pos-grocery/logs/log-rotation-check-$(date +%Y%m%d_%H%M%S).log"
    cp /tmp/log-rotation-check.log "$archived_report" 2>/dev/null || true
    
    success "Verification report generated: $archived_report"
}

# Main verification function
main() {
    local start_time=$(date)
    
    echo -e "${BLUE}=== Log Rotation Verification ===${NC}"
    echo -e "Max log size: $MAX_LOG_SIZE"
    echo -e "Retention days: $RETENTION_DAYS"
    echo -e "Compression: $COMPRESSION_ENABLED"
    echo
    
    log "INFO" "Starting log rotation verification: $start_time"
    
    # Create log file
    echo "=== LOG ROTATION VERIFICATION ===" > /tmp/log-rotation-check.log
    echo "Start Time: $start_time" >> /tmp/log-rotation-check.log
    echo "" >> /tmp/log-rotation-check.log
    
    # Execute verification steps
    check_permissions
    check_log_sizes
    check_rotation_config
    check_log_retention
    check_log_compression
    check_log_format
    test_log_rotation
    generate_report
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_timestamp))
    
    success "Log rotation verification completed in ${duration} seconds"
    
    echo -e "${GREEN}✓ Log rotation verification completed${NC}"
    echo -e "  Duration: ${duration}s"
    echo -e "  Report: /tmp/log-rotation-check.log"
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




