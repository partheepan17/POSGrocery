# Backdated GRN Policy

## Overview

The system implements a sophisticated backdated GRN (Goods Received Note) policy that prevents historical COGS recalculation while maintaining data integrity and audit trails.

## Key Features

### 1. Backdated GRN Detection
- **Automatic Detection**: System automatically detects when a GRN is created with a date earlier than the current date
- **Historical Impact Analysis**: Checks if the backdated GRN would affect any existing sales or historical COGS calculations
- **Warning System**: Provides clear warnings about potential historical impact

### 2. Cost Freeze Configuration
- **Configurable Freeze Period**: Set `inventory.cost_freeze_after_days` in system configuration
  - `0` = Never freeze (default)
  - `7` = Freeze after 7 days
  - `30` = Freeze after 30 days
- **Product-Level Freeze**: Individual products can be manually frozen at specific dates
- **Automatic Freeze**: Products are automatically frozen based on sales activity

### 3. Historical COGS Protection
- **No Recalculation**: Backdated GRNs do not trigger recalculation of historical COGS
- **Future-Only Impact**: Only affects future cost consumption and stock movements
- **Audit Trail**: Complete audit trail of all backdated operations

## Policy Rules

### Rule 1: Backdated GRN Creation
When a GRN is created with a date earlier than today:

1. **Check Historical Impact**: Verify if any sales occurred after the GRN date
2. **Create Stock Lots**: Insert stock lots with the backdated date
3. **No COGS Recalculation**: Do not recalculate historical COGS
4. **Future Consumption**: Only affect future stock consumption

### Rule 2: Cost Freeze Application
When cost freeze is configured:

1. **Check Freeze Status**: Determine if product cost is frozen
2. **Apply Warnings**: Notify about frozen cost implications
3. **Maintain Integrity**: Ensure historical data remains unchanged

### Rule 3: Stock Movement Handling
For backdated GRNs:

1. **Create Stock Lots**: Insert with backdated received_date
2. **Update Current Stock**: Update current stock quantities
3. **Preserve History**: Do not modify existing stock movements
4. **Future Availability**: Make stock available for future sales

## API Endpoints

### Create GRN with Backdated Support
```http
POST /api/grn
Content-Type: application/json

{
  "supplier_id": 1,
  "invoice_number": "INV-001",
  "grn_date": "2023-01-15",  // Backdated date
  "notes": "Backdated GRN",
  "lines": [
    {
      "product_id": 1,
      "quantity": 100,
      "unit_cost": 10.50,
      "total_cost": 1050.00
    }
  ]
}
```

**Response for Backdated GRN:**
```json
{
  "success": true,
  "grn_id": 123,
  "grn_number": "GRN20240118001",
  "total_quantity": 100,
  "total_value": 1050.00,
  "message": "GRN created successfully (Backdated GRN - see warnings)",
  "is_backdated": true,
  "cost_freeze_applied": false,
  "warnings": [
    "Product 1 has sales after GRN date - historical COGS will not be recalculated"
  ]
}
```

### Get Cost Freeze Status
```http
GET /api/grn/cost-freeze-status/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "productId": 1,
    "productName": "Sample Product",
    "sku": "SKU001",
    "lastGrnDate": "2023-01-15",
    "lastFreezeDate": null,
    "lastSaleDate": "2023-01-20",
    "effectiveFreezeDate": "2023-01-20",
    "freezeStatus": "SALE_LOCKED",
    "freezeDays": 7,
    "isFrozen": false
  }
}
```

### Freeze Product Cost
```http
POST /api/grn/freeze-cost/1
Content-Type: application/json

{
  "freezeDate": "2023-01-15"
}
```

## Configuration

### System Configuration
```sql
-- Set cost freeze period (days)
UPDATE system_config 
SET value = '7' 
WHERE key = 'inventory.cost_freeze_after_days';

-- Check current configuration
SELECT * FROM system_config 
WHERE key = 'inventory.cost_freeze_after_days';
```

### Cost Freeze Status View
The system provides a `cost_freeze_status` view that shows:
- Last GRN date for each product
- Last freeze date (if any)
- Last sale date
- Effective freeze date
- Current freeze status

## Database Schema Changes

### New Columns
- `stock_lots.cost_freeze_date`: Tracks when cost was frozen
- `stock_ledger.cost_freeze_date`: Audit trail for cost freeze

### New View
- `cost_freeze_status`: Provides comprehensive freeze status for all products

## Best Practices

### 1. Backdated GRN Usage
- Use sparingly and only for legitimate corrections
- Always review warnings before proceeding
- Document the reason for backdating

### 2. Cost Freeze Management
- Set appropriate freeze periods based on business needs
- Regularly review freeze status
- Use manual freeze for critical products

### 3. Audit Trail
- Monitor backdated GRN creation
- Review cost freeze applications
- Track historical impact warnings

## Error Handling

### Common Scenarios
1. **Historical Sales Detected**: Warning about COGS impact
2. **Cost Frozen**: Warning about limited impact
3. **Invalid Dates**: Validation errors for future dates
4. **Missing Products**: Product not found errors

### Warning Types
- `HISTORICAL_IMPACT`: Sales exist after GRN date
- `COST_FROZEN`: Product cost is frozen
- `FUTURE_DATE`: GRN date is in the future
- `INVALID_PRODUCT`: Product does not exist

## Monitoring

### Logs to Monitor
- Backdated GRN creation attempts
- Cost freeze applications
- Historical impact warnings
- Stock lot creation with backdated dates

### Metrics to Track
- Number of backdated GRNs per month
- Products with frozen costs
- Historical impact warnings
- Stock lot creation patterns

## Migration Notes

The backdated GRN policy is implemented through:
1. Database migration `034_config_cost_freeze.sql`
2. Enhanced GRN routes with backdated support
3. Valuation engine with cost freeze logic
4. New API endpoints for freeze management

All existing GRNs and stock movements remain unchanged. The policy only affects new GRN creation and future stock consumption.











