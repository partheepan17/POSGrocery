#!/bin/bash

# Startup Monitoring Script
# Monitors startup SLA compliance and performance metrics

set -euo pipefail

# Configuration
SERVICE_URL="http://localhost:8250"
STARTUP_ENDPOINT="$SERVICE_URL/api/health/startup"
READY_ENDPOINT="$SERVICE_URL/api/health/ready"
HEALTH_ENDPOINT="$SERVICE_URL/api/health"
SLA_THRESHOLD_MS=300
WARNING_THRESHOLD_MS=200
CHECK_INTERVAL=5
LOG_FILE="/tmp/startup-monitor.log"

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
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
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

# Check if service is running
check_service_running() {
    if ! curl -s "$HEALTH_ENDPOINT" >/dev/null 2>&1; then
        error_exit "Service is not running at $SERVICE_URL"
    fi
}

# Get startup metrics
get_startup_metrics() {
    local response
    response=$(curl -s "$STARTUP_ENDPOINT" 2>/dev/null || echo "{}")
    
    if [ "$response" = "{}" ]; then
        error_exit "Failed to get startup metrics from $STARTUP_ENDPOINT"
    fi
    
    echo "$response"
}

# Check SLA compliance
check_sla_compliance() {
    local metrics="$1"
    local startup_time
    local meets_sla
    local violations
    
    startup_time=$(echo "$metrics" | jq -r '.metrics.startup.totalStartupTime // 0')
    meets_sla=$(echo "$metrics" | jq -r '.metrics.sla.meetsSLA // false')
    violations=$(echo "$metrics" | jq -r '.metrics.sla.violations // []')
    
    echo "Startup Time: ${startup_time}ms"
    echo "SLA Threshold: ${SLA_THRESHOLD_MS}ms"
    echo "Meets SLA: $meets_sla"
    
    if [ "$meets_sla" = "true" ]; then
        success "Startup meets SLA requirements"
        return 0
    else
        warning "Startup SLA violation detected"
        echo "Violations: $violations"
        return 1
    fi
}

# Check readiness
check_readiness() {
    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$READY_ENDPOINT" 2>/dev/null || echo "000")
    
    if [ "$status_code" = "200" ]; then
        success "Service is ready"
        return 0
    elif [ "$status_code" = "503" ]; then
        warning "Service is not ready (503)"
        return 1
    else
        error_exit "Readiness check failed with status code: $status_code"
    fi
}

# Check performance score
check_performance() {
    local metrics="$1"
    local score
    local status
    local recommendations
    
    score=$(echo "$metrics" | jq -r '.metrics.performance.score // 0')
    status=$(echo "$metrics" | jq -r '.metrics.performance.status // "unknown"')
    recommendations=$(echo "$metrics" | jq -r '.metrics.performance.recommendations // []')
    
    echo "Performance Score: $score/100"
    echo "Performance Status: $status"
    
    if [ "$score" -ge 90 ]; then
        success "Excellent performance"
    elif [ "$score" -ge 75 ]; then
        info "Good performance"
    elif [ "$score" -ge 60 ]; then
        warning "Performance warning"
    else
        warning "Performance critical"
    fi
    
    if [ "$recommendations" != "[]" ]; then
        echo "Recommendations: $recommendations"
    fi
}

# Monitor startup metrics continuously
monitor_continuous() {
    info "Starting continuous startup monitoring (interval: ${CHECK_INTERVAL}s)"
    info "Press Ctrl+C to stop"
    echo
    
    while true; do
        local timestamp=$(date '+%H:%M:%S')
        echo -n "[$timestamp] "
        
        if check_service_running; then
            local metrics
            metrics=$(get_startup_metrics)
            
            local startup_time
            startup_time=$(echo "$metrics" | jq -r '.metrics.startup.totalStartupTime // 0')
            local meets_sla
            meets_sla=$(echo "$metrics" | jq -r '.metrics.sla.meetsSLA // false')
            
            if [ "$meets_sla" = "true" ]; then
                echo -e "${GREEN}✓${NC} Startup: ${startup_time}ms (SLA: ✓)"
            else
                echo -e "${RED}✗${NC} Startup: ${startup_time}ms (SLA: ✗)"
            fi
        else
            echo -e "${RED}✗${NC} Service not running"
        fi
        
        sleep "$CHECK_INTERVAL"
    done
}

# Single check
single_check() {
    info "Performing single startup check..."
    echo
    
    if ! check_service_running; then
        exit 1
    fi
    
    local metrics
    metrics=$(get_startup_metrics)
    
    echo "=== Startup Metrics ==="
    echo "$metrics" | jq '.'
    echo
    
    echo "=== SLA Compliance ==="
    check_sla_compliance "$metrics"
    local sla_result=$?
    echo
    
    echo "=== Readiness Check ==="
    check_readiness
    local readiness_result=$?
    echo
    
    echo "=== Performance Analysis ==="
    check_performance "$metrics"
    echo
    
    # Overall status
    if [ $sla_result -eq 0 ] && [ $readiness_result -eq 0 ]; then
        success "All checks passed - Service is healthy"
        exit 0
    else
        warning "Some checks failed - Service may be degraded"
        exit 1
    fi
}

# Performance test
performance_test() {
    info "Running startup performance test..."
    echo
    
    local iterations=10
    local total_time=0
    local max_time=0
    local min_time=999999
    local sla_violations=0
    
    for i in $(seq 1 $iterations); do
        echo -n "Test $i/$iterations: "
        
        # Restart service for cold start test
        if command -v pm2 >/dev/null 2>&1; then
            pm2 restart pos-server >/dev/null 2>&1
        elif command -v systemctl >/dev/null 2>&1; then
            sudo systemctl restart pos-grocery >/dev/null 2>&1
        else
            warning "Cannot restart service - PM2 or systemctl not available"
            break
        fi
        
        # Wait for service to be ready
        local attempts=0
        while [ $attempts -lt 30 ]; do
            if curl -s "$HEALTH_ENDPOINT" >/dev/null 2>&1; then
                break
            fi
            sleep 1
            attempts=$((attempts + 1))
        done
        
        if [ $attempts -eq 30 ]; then
            warning "Service did not start within 30 seconds"
            continue
        fi
        
        # Get startup metrics
        local metrics
        metrics=$(get_startup_metrics)
        local startup_time
        startup_time=$(echo "$metrics" | jq -r '.metrics.startup.totalStartupTime // 0')
        local meets_sla
        meets_sla=$(echo "$metrics" | jq -r '.metrics.sla.meetsSLA // false')
        
        total_time=$((total_time + startup_time))
        max_time=$((startup_time > max_time ? startup_time : max_time))
        min_time=$((startup_time < min_time ? startup_time : min_time))
        
        if [ "$meets_sla" = "false" ]; then
            sla_violations=$((sla_violations + 1))
            echo -e "${RED}${startup_time}ms (SLA ✗)${NC}"
        else
            echo -e "${GREEN}${startup_time}ms (SLA ✓)${NC}"
        fi
        
        sleep 2
    done
    
    local avg_time=$((total_time / iterations))
    local sla_compliance=$(( (iterations - sla_violations) * 100 / iterations ))
    
    echo
    echo "=== Performance Test Results ==="
    echo "Iterations: $iterations"
    echo "Average Time: ${avg_time}ms"
    echo "Min Time: ${min_time}ms"
    echo "Max Time: ${max_time}ms"
    echo "SLA Compliance: ${sla_compliance}%"
    echo "SLA Violations: $sla_violations"
    
    if [ $sla_compliance -ge 95 ]; then
        success "Excellent SLA compliance"
    elif [ $sla_compliance -ge 90 ]; then
        info "Good SLA compliance"
    elif [ $sla_compliance -ge 80 ]; then
        warning "Poor SLA compliance"
    else
        warning "Critical SLA compliance issues"
    fi
}

# Help message
show_help() {
    echo "Usage: $0 [OPTION]"
    echo "Monitor POS Grocery startup performance and SLA compliance."
    echo ""
    echo "Options:"
    echo "  --check       Perform single startup check"
    echo "  --monitor     Monitor continuously (default)"
    echo "  --test        Run performance test (10 iterations)"
    echo "  --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Start continuous monitoring"
    echo "  $0 --check           # Single check"
    echo "  $0 --test            # Performance test"
    echo "  $0 --monitor         # Continuous monitoring"
}

# Main function
main() {
    case "${1:-}" in
        --help)
            show_help
            exit 0
            ;;
        --check)
            single_check
            ;;
        --test)
            performance_test
            ;;
        --monitor|"")
            monitor_continuous
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"




