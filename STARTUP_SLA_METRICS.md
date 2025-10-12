# Startup SLA & Metrics Documentation

## Overview

This document defines the Service Level Agreement (SLA) for POS Grocery System startup performance and provides comprehensive monitoring and alerting guidance.

## 🎯 Startup SLA Requirements

### Primary SLA: Cold Start Performance
- **Target**: <300ms from process start to "listening" log
- **Measurement**: Time from `process.hrtime.bigint()` start to `app.listen()` callback
- **Acceptance**: 99% of cold starts must meet this threshold

### Secondary SLAs: Component Performance
- **Database Initialization**: <500ms (production mode)
- **Hardware Checks**: <1000ms (production mode)
- **Memory Usage**: <80% heap utilization during startup
- **Error Rate**: <1% startup failures

## 📊 Startup Metrics

### Core Metrics Tracked

#### 1. Total Startup Time
```json
{
  "startTime": 1704825600000,
  "listeningTime": 1704825600250,
  "totalStartupTime": 250
}
```

#### 2. Component Breakdown
```json
{
  "databaseInitTime": 45,
  "hardwareCheckTime": 120,
  "memoryUsage": {
    "heapUsed": 25165824,
    "heapTotal": 33554432,
    "external": 1024000
  }
}
```

#### 3. SLA Compliance
```json
{
  "meetsSLA": true,
  "violations": [],
  "thresholds": {
    "listening": "300ms",
    "databaseInit": "500ms", 
    "hardwareCheck": "1000ms"
  }
}
```

### Performance Scoring

#### Score Calculation
- **Excellent (90-100)**: <100ms startup
- **Good (75-89)**: 100-200ms startup
- **Warning (60-74)**: 200-300ms startup
- **Critical (0-59)**: >300ms startup

#### Performance Factors
- **Startup Time**: Primary factor (40% weight)
- **Database Init**: Secondary factor (25% weight)
- **Hardware Checks**: Secondary factor (20% weight)
- **Memory Usage**: Tertiary factor (15% weight)

## 🔍 Monitoring Endpoints

### Health Check Endpoints

#### 1. Basic Health (`/health`)
```bash
curl http://localhost:8250/health
```
**Response**: Basic service status
**Use Case**: Load balancer health checks

#### 2. Detailed Health (`/api/health`)
```bash
curl http://localhost:8250/api/health
```
**Response**: Service status with database and memory info
**Use Case**: Service monitoring dashboards

#### 3. Readiness Check (`/api/health/ready`)
```bash
curl http://localhost:8250/api/health/ready
```
**Response**: Readiness status (503 if not ready)
**Use Case**: Kubernetes readiness probes

#### 4. Liveness Check (`/api/health/live`)
```bash
curl http://localhost:8250/api/health/live
```
**Response**: Liveness status (always 200 if running)
**Use Case**: Kubernetes liveness probes

#### 5. Startup Metrics (`/api/health/startup`)
```bash
curl http://localhost:8250/api/health/startup
```
**Response**: Detailed startup performance data
**Use Case**: Performance monitoring and SLA tracking

### Startup Metrics Response Format

```json
{
  "ok": true,
  "timestamp": "2025-10-09T16:00:00.000Z",
  "service": "pos-grocery",
  "metrics": {
    "startup": {
      "startTime": 1704825600000,
      "listeningTime": 1704825600250,
      "totalStartupTime": 250,
      "databaseInitTime": 45,
      "hardwareCheckTime": 120,
      "memoryUsage": {
        "heapUsed": 25165824,
        "heapTotal": 33554432,
        "external": 1024000
      },
      "environment": "production",
      "fastDev": false
    },
    "sla": {
      "meetsSLA": true,
      "violations": []
    },
    "performance": {
      "status": "excellent",
      "score": 95,
      "recommendations": []
    }
  },
  "thresholds": {
    "listening": "300ms",
    "databaseInit": "500ms",
    "hardwareCheck": "1000ms"
  },
  "status": "healthy"
}
```

## 🚨 Alerting Guidelines

### Alert Thresholds

#### 1. Critical Alerts (Immediate Action Required)

##### Startup Time Exceeds SLA
- **Condition**: `totalStartupTime > 300ms`
- **Severity**: Critical
- **Action**: Immediate investigation required
- **Response Time**: <5 minutes

##### Readiness Probe Failing
- **Condition**: `/api/health/ready` returns 503
- **Severity**: Critical
- **Action**: Service is not ready to serve traffic
- **Response Time**: <2 minutes

##### 5xx Error Spike
- **Condition**: >5% 5xx errors in 5-minute window
- **Severity**: Critical
- **Action**: Service degradation detected
- **Response Time**: <3 minutes

#### 2. Warning Alerts (Investigation Required)

##### Slow Startup (Approaching SLA)
- **Condition**: `totalStartupTime > 200ms` and `totalStartupTime <= 300ms`
- **Severity**: Warning
- **Action**: Monitor closely, investigate performance
- **Response Time**: <15 minutes

##### High Memory Usage
- **Condition**: `memoryUsage.heapUsed / memoryUsage.heapTotal > 0.8`
- **Severity**: Warning
- **Action**: Check for memory leaks
- **Response Time**: <30 minutes

##### Database Slow Init
- **Condition**: `databaseInitTime > 300ms`
- **Severity**: Warning
- **Action**: Check database connection pool
- **Response Time**: <30 minutes

#### 3. Info Alerts (Monitoring)

##### Startup Performance Degradation
- **Condition**: Performance score drops below 75
- **Severity**: Info
- **Action**: Review performance trends
- **Response Time**: <1 hour

### Alert Response Procedures

#### Critical Alert Response
1. **Immediate Assessment** (0-2 minutes)
   - Check service status: `curl http://localhost:8250/api/health/startup`
   - Review recent logs for errors
   - Check system resources (CPU, memory, disk)

2. **Quick Mitigation** (2-5 minutes)
   - Restart service if startup time >500ms
   - Check database connectivity if readiness failing
   - Scale resources if 5xx spike detected

3. **Root Cause Analysis** (5-30 minutes)
   - Analyze startup metrics trends
   - Check for recent deployments or changes
   - Review system logs for errors

4. **Resolution** (30-60 minutes)
   - Implement fix based on root cause
   - Verify SLA compliance
   - Update monitoring if needed

#### Warning Alert Response
1. **Investigation** (0-15 minutes)
   - Review performance metrics
   - Check system resources
   - Analyze recent changes

2. **Analysis** (15-30 minutes)
   - Identify performance bottlenecks
   - Check for resource constraints
   - Review configuration changes

3. **Action** (30-60 minutes)
   - Optimize performance if needed
   - Adjust resource allocation
   - Update monitoring thresholds

## 📈 Monitoring Setup

### Prometheus Metrics

#### Custom Metrics to Track
```yaml
# Startup time histogram
pos_grocery_startup_duration_seconds{quantile="0.5"} 0.25
pos_grocery_startup_duration_seconds{quantile="0.95"} 0.28
pos_grocery_startup_duration_seconds{quantile="0.99"} 0.30

# SLA compliance
pos_grocery_sla_compliance{type="startup"} 1
pos_grocery_sla_compliance{type="database"} 1
pos_grocery_sla_compliance{type="hardware"} 1

# Performance score
pos_grocery_startup_performance_score 95

# Component timings
pos_grocery_database_init_duration_seconds 0.045
pos_grocery_hardware_check_duration_seconds 0.120
```

#### Alert Rules
```yaml
groups:
- name: pos-grocery-startup
  rules:
  - alert: StartupTimeExceedsSLA
    expr: pos_grocery_startup_duration_seconds{quantile="0.95"} > 0.3
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "POS Grocery startup time exceeds SLA"
      description: "95th percentile startup time is {{ $value }}s, exceeding 300ms SLA"
      
  - alert: ReadinessProbeFailing
    expr: up{job="pos-grocery-readiness"} == 0
    for: 30s
    labels:
      severity: critical
    annotations:
      summary: "POS Grocery readiness probe failing"
      description: "Readiness probe has been failing for {{ $for }}"
      
  - alert: High5xxErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High 5xx error rate detected"
      description: "5xx error rate is {{ $value }} requests/second"
```

### Grafana Dashboard

#### Key Panels
1. **Startup Time Trend**
   - Line chart showing startup time over time
   - SLA threshold line at 300ms
   - 95th percentile overlay

2. **SLA Compliance**
   - Single stat showing current SLA status
   - Color coding: Green (compliant), Red (violation)

3. **Component Breakdown**
   - Stacked bar chart showing database init, hardware checks, other
   - Time series of each component

4. **Performance Score**
   - Gauge showing current performance score
   - Historical trend line

5. **Error Rate**
   - Line chart showing 5xx error rate
   - Alert threshold line at 5%

## 🔧 Troubleshooting Guide

### Common Issues and Solutions

#### 1. Startup Time > 300ms

**Possible Causes:**
- Database connection slow
- Large dependency loading
- System resource constraints
- Cold start penalty

**Solutions:**
- Optimize database connection pool
- Use lazy loading for non-critical modules
- Increase system resources
- Implement connection warming

#### 2. Readiness Probe Failing

**Possible Causes:**
- Database not accessible
- Service not fully initialized
- Resource exhaustion
- Configuration errors

**Solutions:**
- Check database connectivity
- Verify service initialization
- Monitor resource usage
- Review configuration

#### 3. High 5xx Error Rate

**Possible Causes:**
- Database connection issues
- Memory exhaustion
- CPU overload
- Network problems

**Solutions:**
- Check database health
- Monitor memory usage
- Scale resources
- Check network connectivity

### Performance Optimization

#### 1. Database Optimization
```javascript
// Optimize connection pool
const poolConfig = {
  min: 2,
  max: 10,
  acquireTimeoutMillis: 30000,
  idleTimeoutMillis: 30000
};
```

#### 2. Lazy Loading
```javascript
// Load heavy modules only when needed
const heavyModule = await import('./heavy-module');
```

#### 3. Memory Management
```javascript
// Monitor memory usage
const memUsage = process.memoryUsage();
if (memUsage.heapUsed / memUsage.heapTotal > 0.8) {
  // Trigger garbage collection or alert
}
```

## 📋 Operational Procedures

### Daily Monitoring
1. Check startup metrics dashboard
2. Review SLA compliance status
3. Monitor error rates and trends
4. Verify alert configurations

### Weekly Review
1. Analyze startup performance trends
2. Review alert response times
3. Update performance baselines
4. Plan optimization improvements

### Monthly Assessment
1. Review SLA compliance statistics
2. Analyze performance improvements
3. Update monitoring thresholds
4. Plan capacity adjustments

This comprehensive SLA and metrics system ensures measurable readiness performance with clear operational thresholds and response procedures!




