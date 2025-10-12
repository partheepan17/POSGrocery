#!/bin/bash

# Enhanced Backup Script for POS Grocery System
# Features: Retention management, integrity validation, compression, logging

set -euo pipefail

# Configuration
BACKUP_DIR="/opt/pos-grocery/backups"
DB_PATH="/opt/pos-grocery/data/pos.db"
RETENTION_DAYS=30
COMPRESSION=true
VERIFY_INTEGRITY=true
LOG_DIR="/opt/pos-grocery/logs"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="pos_${DATE}.db"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
LOG_FILE="${LOG_DIR}/backup-${DATE}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    exit 1
}

# Success function
success() {
    log "SUCCESS" "$1"
}

# Warning function
warning() {
    log "WARNING" "$1"
}

# Info function
info() {
    log "INFO" "$1"
}

# Create directories if they don't exist
create_directories() {
    info "Creating backup directories..."
    mkdir -p "$BACKUP_DIR" || error_exit "Failed to create backup directory: $BACKUP_DIR"
    mkdir -p "$LOG_DIR" || error_exit "Failed to create log directory: $LOG_DIR"
    success "Directories created successfully"
}

# Verify database exists and is accessible
verify_database() {
    info "Verifying database accessibility..."
    
    if [ ! -f "$DB_PATH" ]; then
        error_exit "Database file not found: $DB_PATH"
    fi
    
    # Test database connection
    if ! sqlite3 "$DB_PATH" "SELECT 1;" >/dev/null 2>&1; then
        error_exit "Database is not accessible or corrupted"
    fi
    
    success "Database verification passed"
}

# Check database integrity
check_integrity() {
    if [ "$VERIFY_INTEGRITY" = true ]; then
        info "Checking database integrity..."
        
        local integrity_result
        integrity_result=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>&1)
        
        if [ "$integrity_result" = "ok" ]; then
            success "Database integrity check passed"
        else
            error_exit "Database integrity check failed: $integrity_result"
        fi
    else
        info "Skipping integrity check (disabled)"
    fi
}

# Create backup
create_backup() {
    info "Creating database backup..."
    
    # Copy database file
    if cp "$DB_PATH" "$BACKUP_PATH"; then
        success "Database backup created: $BACKUP_PATH"
    else
        error_exit "Failed to create database backup"
    fi
    
    # Set proper permissions
    chmod 660 "$BACKUP_PATH" || warning "Failed to set backup permissions"
}

# Compress backup if enabled
compress_backup() {
    if [ "$COMPRESSION" = true ]; then
        info "Compressing backup..."
        
        if gzip "$BACKUP_PATH"; then
            BACKUP_PATH="${BACKUP_PATH}.gz"
            success "Backup compressed: $BACKUP_PATH"
        else
            warning "Failed to compress backup, keeping uncompressed"
        fi
    else
        info "Compression disabled, keeping uncompressed backup"
    fi
}

# Verify backup integrity
verify_backup() {
    info "Verifying backup integrity..."
    
    local backup_to_verify="$BACKUP_PATH"
    
    # If compressed, we need to decompress for verification
    if [[ "$backup_to_verify" == *.gz ]]; then
        local temp_db="/tmp/verify_${DATE}.db"
        if gunzip -c "$backup_to_verify" > "$temp_db"; then
            backup_to_verify="$temp_db"
        else
            error_exit "Failed to decompress backup for verification"
        fi
    fi
    
    # Check backup integrity
    local backup_integrity
    backup_integrity=$(sqlite3 "$backup_to_verify" "PRAGMA integrity_check;" 2>&1)
    
    if [ "$backup_integrity" = "ok" ]; then
        success "Backup integrity verification passed"
    else
        error_exit "Backup integrity verification failed: $backup_integrity"
    fi
    
    # Clean up temporary file if created
    if [ -f "/tmp/verify_${DATE}.db" ]; then
        rm -f "/tmp/verify_${DATE}.db"
    fi
}

# Manage backup retention
manage_retention() {
    info "Managing backup retention (keeping $RETENTION_DAYS days)..."
    
    local deleted_count=0
    local total_size_freed=0
    
    # Find and delete old backups
    while IFS= read -r -d '' backup_file; do
        local file_age_days
        file_age_days=$(($(($(date +%s) - $(stat -c %Y "$backup_file"))) / 86400))
        
        if [ "$file_age_days" -gt "$RETENTION_DAYS" ]; then
            local file_size
            file_size=$(stat -c %s "$backup_file")
            total_size_freed=$((total_size_freed + file_size))
            
            if rm -f "$backup_file"; then
                deleted_count=$((deleted_count + 1))
                info "Deleted old backup: $(basename "$backup_file") (age: ${file_age_days} days)"
            else
                warning "Failed to delete old backup: $backup_file"
            fi
        fi
    done < <(find "$BACKUP_DIR" -name "pos_*.db*" -type f -print0)
    
    if [ "$deleted_count" -gt 0 ]; then
        success "Retention cleanup completed: $deleted_count files deleted, $((total_size_freed / 1024 / 1024)) MB freed"
    else
        info "No old backups to clean up"
    fi
}

# Generate backup report
generate_report() {
    info "Generating backup report..."
    
    local backup_size
    backup_size=$(stat -c %s "$BACKUP_PATH" 2>/dev/null || echo "0")
    local backup_size_mb=$((backup_size / 1024 / 1024))
    
    local total_backups
    total_backups=$(find "$BACKUP_DIR" -name "pos_*.db*" -type f | wc -l)
    
    local total_backup_size
    total_backup_size=$(find "$BACKUP_DIR" -name "pos_*.db*" -type f -exec stat -c %s {} \; | awk '{sum+=$1} END {print sum+0}')
    local total_backup_size_mb=$((total_backup_size / 1024 / 1024))
    
    local available_space
    available_space=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    local available_space_mb=$((available_space * 1024))
    
    cat >> "$LOG_FILE" << EOF

=== BACKUP REPORT ===
Backup Name: $BACKUP_NAME
Backup Size: ${backup_size_mb} MB
Backup Path: $BACKUP_PATH
Compression: $COMPRESSION
Integrity Check: $VERIFY_INTEGRITY
Retention Days: $RETENTION_DAYS

=== STORAGE SUMMARY ===
Total Backups: $total_backups
Total Backup Size: ${total_backup_size_mb} MB
Available Space: ${available_space_mb} MB
Backup Directory: $BACKUP_DIR

=== BACKUP LIST ===
EOF

    # List all backups with details
    find "$BACKUP_DIR" -name "pos_*.db*" -type f -exec ls -lh {} \; >> "$LOG_FILE"
    
    success "Backup report generated: $LOG_FILE"
}

# Verify latest backup (for external verification)
verify_latest() {
    info "Verifying latest backup..."
    
    local latest_backup
    latest_backup=$(ls -t "$BACKUP_DIR"/pos_*.db* 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        error_exit "No backups found in $BACKUP_DIR"
    fi
    
    info "Latest backup: $latest_backup"
    
    # Check backup age
    local backup_age_hours
    backup_age_hours=$(($(($(date +%s) - $(stat -c %Y "$latest_backup"))) / 3600))
    
    if [ "$backup_age_hours" -gt 24 ]; then
        warning "Latest backup is older than 24 hours (age: ${backup_age_hours}h)"
    else
        success "Latest backup is within 24 hours (age: ${backup_age_hours}h)"
    fi
    
    # Verify backup integrity
    verify_backup
    
    success "Latest backup verification completed"
}

# Main backup function
main() {
    local start_time=$(date +%s)
    
    info "Starting backup process..."
    info "Configuration:"
    info "  Backup Directory: $BACKUP_DIR"
    info "  Database Path: $DB_PATH"
    info "  Retention Days: $RETENTION_DAYS"
    info "  Compression: $COMPRESSION"
    info "  Integrity Check: $VERIFY_INTEGRITY"
    
    # Execute backup steps
    create_directories
    verify_database
    check_integrity
    create_backup
    compress_backup
    verify_backup
    manage_retention
    generate_report
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    success "Backup process completed successfully in ${duration} seconds"
    success "Backup file: $BACKUP_PATH"
    
    # Show summary
    echo -e "${GREEN}✓ Backup completed successfully${NC}"
    echo -e "  File: $BACKUP_PATH"
    echo -e "  Size: $(stat -c %s "$BACKUP_PATH" 2>/dev/null | numfmt --to=iec || echo 'Unknown')"
    echo -e "  Duration: ${duration}s"
    echo -e "  Log: $LOG_FILE"
}

# Handle command line arguments
case "${1:-}" in
    --verify)
        verify_latest
        ;;
    --help)
        echo "Usage: $0 [--verify|--help]"
        echo "  --verify  Verify the latest backup"
        echo "  --help    Show this help message"
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