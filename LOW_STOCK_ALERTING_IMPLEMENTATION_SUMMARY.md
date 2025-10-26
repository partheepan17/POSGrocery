# Low Stock Alerting System Implementation Summary

## Overview
Implemented a comprehensive low stock alerting system with configurable thresholds, multiple notification channels (Slack, Telegram, Email), and automated cron job scheduling using node-cron.

## Key Features

### 1. Low Stock Alert Service
- **Configurable Threshold**: `ALERTS_LOW_STOCK_THRESHOLD` environment variable
- **Database Integration**: Queries `product_stock` table for current stock levels
- **Smart Filtering**: Only alerts for active products below threshold or reorder level
- **Rich Data**: Includes product details, stock values, last movement dates

### 2. Multiple Notification Channels

#### Slack Integration
- **Webhook Support**: Uses Slack incoming webhooks
- **Rich Formatting**: Markdown formatting with attachments
- **Status Indicators**: Color-coded alerts with system information
- **Test Functionality**: Connection testing and validation

#### Telegram Integration
- **Bot API**: Uses Telegram Bot API for sending messages
- **Interactive Messages**: Inline keyboards with action buttons
- **Markdown Support**: Rich text formatting
- **Bot Information**: Get bot details and connection status

#### Email Integration
- **SMTP Support**: Configurable SMTP settings
- **HTML Emails**: Styled HTML emails with CSS
- **Multiple Recipients**: Support for multiple email addresses
- **Priority Headers**: High priority email headers

### 3. Cron Job Scheduler
- **Hourly Checks**: Low stock alerts every hour (`0 * * * *`)
- **Daily Snapshots**: Stock snapshots at 2 AM (`0 2 * * *`)
- **Weekly Cleanup**: Database cleanup on Sundays (`0 3 * * 0`)
- **Health Checks**: System health checks every 15 minutes (`*/15 * * * *`)

### 4. API Endpoints
- **GET /api/alerts/low-stock**: Get current low stock products
- **POST /api/alerts/test**: Test alert configuration
- **POST /api/alerts/check**: Manually trigger low stock check
- **PUT /api/alerts/threshold**: Update low stock threshold
- **GET /api/alerts/status**: Get alert system status
- **POST /api/alerts/jobs/:jobName/run**: Run specific job immediately

## Files Created

### Core Alert System
- **`server/alerts/lowStock.ts`**: Main low stock alert service
- **`server/scheduler/index.ts`**: Cron job scheduler service

### Notification Channels
- **`server/alerts/channels/slack.ts`**: Slack webhook integration
- **`server/alerts/channels/telegram.ts`**: Telegram bot integration
- **`server/alerts/channels/email.ts`**: SMTP email integration

### API Routes
- **`server/routes/alerts.ts`**: Alert management API endpoints

### Configuration
- **`env.example`**: Updated with alert configuration variables

## Technical Implementation

### Database Integration
```sql
-- Query for low stock products
SELECT 
  p.id as product_id,
  p.sku,
  p.name_en,
  p.name_si,
  p.name_ta,
  p.unit,
  COALESCE(ps.current_quantity, 0) as current_stock,
  COALESCE(p.reorder_level, 0) as reorder_level,
  ? as threshold,
  c.name as category_name,
  ps.last_movement_date,
  COALESCE(ps.total_value, 0) as stock_value,
  COALESCE(ps.average_cost, 0) as unit_cost
FROM products p
LEFT JOIN product_stock ps ON p.id = ps.product_id
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = 1
  AND COALESCE(ps.current_quantity, 0) <= ?
  AND (p.reorder_level IS NULL OR COALESCE(ps.current_quantity, 0) <= p.reorder_level)
ORDER BY COALESCE(ps.current_quantity, 0) ASC, p.name_en ASC
```

### Alert Message Format
```
🚨 LOW STOCK ALERT - 2024-01-15 14:30:00

Found 3 product(s) below threshold:

1. **Milk 1L** (MILK-001)
   🔴 OUT OF STOCK: 0 pcs
   Reorder Level: 10 pcs
   Category: Dairy
   Unit Cost: LKR 120.00
   Stock Value: LKR 0.00
   Last Movement: 2024-01-10

2. **Bread White** (BREAD-001)
   🟡 BELOW REORDER: 5 pcs
   Reorder Level: 20 pcs
   Category: Bakery
   Unit Cost: LKR 45.00
   Stock Value: LKR 225.00
   Last Movement: 2024-01-14

📊 Summary:
• Total Products: 3
• Out of Stock: 1
• Below Reorder: 2
• Low Stock: 0
```

### Cron Job Configuration
```typescript
// Low stock alert - every hour
this.scheduleJob('low-stock-alert', '0 * * * *', async () => {
  await lowStockAlertService.checkAndAlert();
});

// Daily stock snapshot - every day at 2 AM
this.scheduleJob('daily-stock-snapshot', '0 2 * * *', async () => {
  await this.createDailyStockSnapshot();
});

// Database cleanup - every Sunday at 3 AM
this.scheduleJob('database-cleanup', '0 3 * * 0', async () => {
  await this.cleanupOldData();
});

// Health check - every 15 minutes
this.scheduleJob('health-check', '*/15 * * * *', async () => {
  await this.performHealthCheck();
});
```

## Environment Configuration

### Alert Settings
```bash
# Alert Configuration
ALERTS_LOW_STOCK_THRESHOLD=10

# Slack Alert Configuration
ALERTS_SLACK_ENABLED=false
ALERTS_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Telegram Alert Configuration
ALERTS_TELEGRAM_ENABLED=false
ALERTS_TELEGRAM_BOT_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ
ALERTS_TELEGRAM_CHAT_ID=-1001234567890

# Email Alert Configuration
ALERTS_EMAIL_ENABLED=false
ALERTS_EMAIL_SMTP_HOST=smtp.gmail.com
ALERTS_EMAIL_SMTP_PORT=587
ALERTS_EMAIL_SMTP_USER=your-email@gmail.com
ALERTS_EMAIL_SMTP_PASS=your-app-password
ALERTS_EMAIL_FROM=alerts@yourstore.com
ALERTS_EMAIL_TO=manager@yourstore.com,admin@yourstore.com

# Application Configuration
APP_BASE_URL=http://localhost:3000
TZ=UTC
```

## Usage Examples

### Manual Alert Check
```bash
curl -X POST http://localhost:8250/api/alerts/check \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Alert Configuration
```bash
curl -X POST http://localhost:8250/api/alerts/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channels": ["slack", "telegram", "email"]}'
```

### Update Threshold
```bash
curl -X PUT http://localhost:8250/api/alerts/threshold \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threshold": 15}'
```

### Get Alert Status
```bash
curl -X GET http://localhost:8250/api/alerts/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Channel-Specific Features

### Slack Features
- **Rich Attachments**: Color-coded alerts with fields
- **Username/Icon**: Custom bot name and emoji
- **Channel Targeting**: Specific channel routing
- **Footer Information**: System identification

### Telegram Features
- **Interactive Buttons**: Action buttons for dashboard access
- **Markdown Support**: Bold, italic, and emoji formatting
- **Callback Handling**: Support for button interactions
- **Bot Information**: Get bot details and status

### Email Features
- **HTML Styling**: Professional email templates
- **Priority Headers**: High priority email marking
- **Multiple Recipients**: Comma-separated email lists
- **SMTP Security**: TLS/SSL support with authentication

## Error Handling

### Graceful Degradation
- **Channel Failures**: Individual channel failures don't stop other channels
- **Database Errors**: Proper error logging and recovery
- **Network Timeouts**: 10-second timeouts for all external calls
- **Configuration Validation**: Environment variable validation

### Logging
- **Structured Logging**: JSON-formatted logs with context
- **Error Tracking**: Detailed error information with stack traces
- **Performance Metrics**: Timing information for all operations
- **Audit Trail**: Complete audit trail for all alert activities

## Performance Optimizations

### Database Efficiency
- **Indexed Queries**: Proper indexes on stock-related columns
- **Prepared Statements**: Reusable query preparation
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Minimal data transfer and processing

### Scheduler Efficiency
- **Non-blocking Jobs**: Asynchronous job execution
- **Error Isolation**: Job failures don't affect other jobs
- **Resource Management**: Proper cleanup and memory management
- **Timezone Support**: Configurable timezone handling

## Security Features

### Authentication
- **JWT Token Validation**: All API endpoints require authentication
- **Role-based Access**: Admin/Manager role requirements
- **Request ID Tracking**: Unique request identification

### Data Protection
- **Sensitive Data Masking**: Credentials masked in logs
- **Input Validation**: Zod schema validation for all inputs
- **SQL Injection Protection**: Parameterized queries only
- **Rate Limiting**: API endpoint rate limiting

## Monitoring and Maintenance

### Health Checks
- **Database Connectivity**: Regular database health checks
- **Job Status Monitoring**: Real-time job status tracking
- **Channel Connectivity**: Periodic channel connection tests
- **System Metrics**: Memory usage and performance monitoring

### Maintenance Tasks
- **Log Cleanup**: Automatic cleanup of old audit logs
- **Snapshot Management**: Daily stock snapshots with retention
- **Data Archival**: Old data archival and cleanup
- **Performance Optimization**: Regular performance monitoring

## Benefits

1. **Proactive Management**: Early warning system for low stock
2. **Multi-channel Alerts**: Redundant notification channels
3. **Automated Monitoring**: 24/7 automated stock monitoring
4. **Rich Information**: Detailed product and stock information
5. **Flexible Configuration**: Easy threshold and channel configuration
6. **API Integration**: Full API for alert management
7. **Scalable Architecture**: Designed for high-volume operations
8. **Error Resilience**: Graceful handling of failures
9. **Audit Trail**: Complete logging and tracking
10. **Easy Maintenance**: Self-managing with minimal intervention

## Future Enhancements

1. **Advanced Filtering**: Category-specific or supplier-specific alerts
2. **Escalation Rules**: Multi-level alert escalation
3. **Custom Templates**: User-defined alert message templates
4. **Analytics Dashboard**: Alert frequency and pattern analysis
5. **Mobile Push Notifications**: Mobile app integration
6. **Webhook Integration**: Custom webhook endpoints
7. **Alert Suppression**: Temporary alert suppression
8. **Batch Processing**: Bulk alert processing for large inventories

The low stock alerting system provides a robust, scalable solution for inventory management with comprehensive monitoring, multiple notification channels, and automated scheduling capabilities.










