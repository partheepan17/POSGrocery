# Shadow Recount System Implementation Summary

## Overview
Implemented a comprehensive nightly shadow recount job to detect inventory drift by comparing computed on-hand quantities (SUM(in) - SUM(out) ± adjustments) with cached values in the `product_stock` table. The system generates detailed reports and suggests adjustment drafts without automatically applying them.

## Key Features

### 1. Shadow Recount Service (`server/jobs/recount.ts`)
- **Computed Quantity Calculation**: Recalculates on-hand from `stock_movements` table
- **Drift Detection**: Compares computed vs cached quantities with configurable tolerance
- **Batch Processing**: Handles large inventories efficiently with configurable batch sizes
- **Movement Analysis**: Tracks movement types and counts for audit purposes
- **Adjustment Drafts**: Generates suggested adjustments with detailed reasoning

### 2. Movement Type Handling
```typescript
// Incoming movements (positive quantity)
case 'purchase':
case 'grn':
case 'return':
case 'adjustment_in':
  quantityChange = Math.abs(movement.quantity);

// Outgoing movements (negative quantity)
case 'sale':
case 'adjustment_out':
case 'waste':
case 'transfer_out':
  quantityChange = -Math.abs(movement.quantity);

// Generic adjustments (can be positive or negative)
case 'adjustment':
  quantityChange = movement.quantity;
```

### 3. Drift Detection Logic
- **Tolerance Threshold**: Configurable minimum difference to trigger alerts
- **Smart Filtering**: Only reports products exceeding tolerance threshold
- **Categorization**: Separates high drift, zero stock, and negative stock products
- **Value Calculation**: Tracks total drift value for impact assessment

### 4. API Endpoints (`server/routes/inventoryRecount.ts`)
- **POST /api/inventory/recount**: Manual full recount with custom configuration
- **POST /api/inventory/recount/products**: Recount specific products by ID
- **GET /api/inventory/recount/history**: Retrieve recount history
- **GET /api/inventory/recount/config**: Get current configuration
- **PUT /api/inventory/recount/config**: Update recount settings

### 5. Scheduled Execution
- **Nightly Job**: Runs every night at 1 AM (`0 1 * * *`)
- **Automatic Alerts**: Sends notifications for significant drifts
- **Performance Monitoring**: Tracks processing time and batch efficiency
- **Error Handling**: Graceful failure handling with detailed logging

## Technical Implementation

### Database Schema Integration
```sql
-- Uses existing stock_movements table
SELECT 
  quantity,
  movement_type,
  created_at,
  reference_type,
  reference_id
FROM stock_movements 
WHERE product_id = ?
ORDER BY created_at ASC

-- Compares with product_stock table
SELECT current_quantity 
FROM product_stock 
WHERE product_id = ?
```

### Recount Process Flow
1. **Product Retrieval**: Get all active products (or include inactive if configured)
2. **Batch Processing**: Process products in configurable batches for performance
3. **Quantity Computation**: Calculate running balance from stock movements
4. **Drift Detection**: Compare computed vs cached quantities
5. **Report Generation**: Create comprehensive report with adjustments
6. **Alert Dispatch**: Send notifications for significant drifts

### Configuration Options
```typescript
interface RecountConfig {
  tolerance_threshold: number;        // Minimum difference to report (default: 1)
  enable_alerts: boolean;            // Send alerts for drifts (default: true)
  alert_threshold: number;           // Minimum difference for alerts (default: 5)
  include_inactive_products: boolean; // Include inactive products (default: false)
  max_products_per_batch: number;    // Batch size for processing (default: 1000)
}
```

## Sample Report Structure

### Summary Section
```json
{
  "summary": {
    "total_products": 1250,
    "products_with_drift": 23,
    "total_drift_value": 45,
    "tolerance_threshold": 1,
    "recount_date": "2024-01-15T01:30:45.123Z",
    "processing_time_ms": 2847
  }
}
```

### Individual Drift Records
```json
{
  "product_id": 101,
  "sku": "MILK-001",
  "name_en": "Fresh Milk 1L",
  "name_si": "තැනුම් කිරි 1L",
  "name_ta": "புதிய பால் 1L",
  "unit": "pcs",
  "category_name": "Dairy",
  "cached_quantity": 15,
  "computed_quantity": 12,
  "difference": -3,
  "tolerance_exceeded": true,
  "last_movement_date": "2024-01-14T16:30:00.000Z",
  "movement_count": 8,
  "suggested_adjustment": {
    "quantity": -3,
    "reason": "Stock Missing - Negative Adjustment",
    "notes": "Missing stock detected during recount. Cached: 15, Computed: 12. Product: Fresh Milk 1L (MILK-001)"
  }
}
```

### Alert Categories
```json
{
  "alerts": {
    "high_drift_products": [...],    // Products with drift ≥ alert_threshold
    "zero_stock_products": [...],    // Products with computed quantity = 0
    "negative_stock_products": [...] // Products with computed quantity < 0
  }
}
```

## Environment Configuration

### New Environment Variables
```bash
# Shadow Recount Configuration
RECOUNT_TOLERANCE_THRESHOLD=1        # Minimum difference to report
RECOUNT_ENABLE_ALERTS=true           # Enable drift alerts
RECOUNT_ALERT_THRESHOLD=5            # Minimum difference for alerts
RECOUNT_INCLUDE_INACTIVE=false       # Include inactive products
RECOUNT_BATCH_SIZE=1000              # Batch processing size
```

## API Usage Examples

### Manual Full Recount
```bash
curl -X POST http://localhost:8250/api/inventory/recount \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tolerance_threshold": 2,
    "enable_alerts": true,
    "alert_threshold": 10,
    "include_inactive_products": false,
    "max_products_per_batch": 500
  }'
```

### Recount Specific Products
```bash
curl -X POST http://localhost:8250/api/inventory/recount/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_ids": [101, 205, 342, 456, 789]
  }'
```

### Get Recount Configuration
```bash
curl -X GET http://localhost:8250/api/inventory/recount/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Configuration
```bash
curl -X PUT http://localhost:8250/api/inventory/recount/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tolerance_threshold": 2,
    "enable_alerts": true,
    "alert_threshold": 8
  }'
```

## Integration with Existing Systems

### Scheduler Integration
- **Nightly Execution**: Added to `server/scheduler/index.ts`
- **Cron Schedule**: `0 1 * * *` (1 AM daily)
- **Error Handling**: Integrated with existing error handling
- **Logging**: Uses existing logging infrastructure

### Alert System Integration
- **Reuses Alert Channels**: Leverages existing Slack, Telegram, Email channels
- **Drift Notifications**: Sends formatted drift alerts
- **Alert Thresholds**: Configurable alert thresholds for different drift levels

### Database Integration
- **Stock Movements**: Uses existing `stock_movements` table
- **Product Stock**: Compares with `product_stock` table
- **Product Information**: Joins with `products` and `categories` tables
- **Performance**: Optimized queries with proper indexing

## Performance Optimizations

### Batch Processing
- **Configurable Batch Size**: Default 1000 products per batch
- **Concurrent Processing**: Parallel processing within batches
- **Memory Management**: Efficient memory usage for large inventories
- **Progress Tracking**: Real-time progress logging

### Database Efficiency
- **Indexed Queries**: Uses existing indexes on product_id and created_at
- **Prepared Statements**: Reusable query preparation
- **Minimal Data Transfer**: Only retrieves necessary fields
- **Connection Pooling**: Efficient database connection management

### Error Handling
- **Graceful Degradation**: Individual product failures don't stop the process
- **Detailed Logging**: Comprehensive error logging with context
- **Retry Logic**: Built-in retry mechanisms for transient failures
- **Alert Suppression**: Prevents alert spam during system issues

## Security Features

### Authentication & Authorization
- **JWT Token Validation**: All endpoints require authentication
- **Role-based Access**: Admin role required for configuration changes
- **Request ID Tracking**: Unique request identification for audit trails

### Data Protection
- **Input Validation**: Zod schema validation for all inputs
- **SQL Injection Protection**: Parameterized queries only
- **Sensitive Data Masking**: Credentials masked in logs
- **Rate Limiting**: API endpoint rate limiting

## Monitoring and Maintenance

### Performance Metrics
- **Processing Time**: Tracks total recount duration
- **Batch Performance**: Monitors batch processing efficiency
- **Memory Usage**: Tracks memory consumption during processing
- **Database Performance**: Monitors query execution times

### Audit Trail
- **Complete Logging**: All operations logged with context
- **Request Tracking**: Unique request IDs for traceability
- **Error Tracking**: Detailed error information with stack traces
- **Performance Tracking**: Timing information for all operations

## Benefits

1. **Drift Detection**: Identifies inventory discrepancies before they become major issues
2. **Automated Monitoring**: 24/7 automated inventory monitoring
3. **Detailed Reporting**: Comprehensive reports with suggested adjustments
4. **Flexible Configuration**: Customizable thresholds and processing options
5. **API Integration**: Full REST API for manual recounts and configuration
6. **Alert Integration**: Seamless integration with existing alert systems
7. **Performance Optimized**: Efficient processing for large inventories
8. **Audit Trail**: Complete logging and tracking of all operations
9. **Error Resilience**: Graceful handling of failures and edge cases
10. **Scalable Architecture**: Designed to handle growing inventory volumes

## Future Enhancements

1. **Historical Analysis**: Track drift patterns over time
2. **Predictive Alerts**: Machine learning-based drift prediction
3. **Custom Rules**: User-defined drift detection rules
4. **Integration APIs**: Webhook integration for external systems
5. **Dashboard Visualization**: Real-time drift monitoring dashboard
6. **Automated Corrections**: Optional automatic adjustment application
7. **Category-specific Rules**: Different thresholds per product category
8. **Supplier Analysis**: Drift analysis by supplier
9. **Cost Impact**: Financial impact calculation for drifts
10. **Mobile Notifications**: Mobile app integration for alerts

The shadow recount system provides a robust, automated solution for inventory drift detection with comprehensive reporting, flexible configuration, and seamless integration with existing POS systems.










