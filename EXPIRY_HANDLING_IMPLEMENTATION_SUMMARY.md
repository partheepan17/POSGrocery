# Expiry Handling Implementation Summary

## Overview
Implemented comprehensive expiry handling with FEFO (First Expiry, First Out) logic, expiry alerts, and reporting. The system includes database enhancements, UI components, and automated monitoring for products with expiry dates.

## Key Features

### 1. Database Enhancements (`server/db/migrations/039_expiry_handling_enhancements.sql`)
- **Expiry Date Support**: Enhanced existing `grn_lines` and `stock_lots` tables with proper expiry date handling
- **Database Views**: Created comprehensive views for expiry tracking and FEFO lot selection
- **Indexes**: Optimized queries with proper indexing on expiry dates
- **Alert System**: Built-in expiry alert configuration and history tracking

### 2. FEFO (First Expiry, First Out) Logic (`server/utils/fefoManager.ts`)
- **Lot Selection**: Prioritizes lots by expiry date for sales
- **Smart Ordering**: Non-expiring items last, earliest expiry first
- **Expiry Information**: Comprehensive expiry status tracking and reporting
- **Integration**: Seamless integration with existing stock management

### 3. Expiry Alert System (`server/alerts/expiryAlerts.ts`)
- **Multi-channel Alerts**: Slack, Telegram, and Email notifications
- **Configurable Thresholds**: Separate thresholds for critical and near-expiry alerts
- **Rich Reporting**: Detailed expiry information with value calculations
- **Automated Monitoring**: Daily expiry checks at 8 AM

### 4. Near-Expiry Reports (`server/routes/expiryReports.ts`)
- **Comprehensive Reports**: Detailed near-expiry product reports
- **CSV Export**: Export functionality for expiry reports
- **Dashboard Integration**: Summary statistics for dashboard
- **Product-specific Reports**: Individual product expiry tracking

### 5. UI Components
- **Expiry Badge**: Visual indicators for product expiry status
- **GRN Form**: Enhanced GRN line form with expiry date support
- **Expiry Indicators**: Status indicators for product cards

## Technical Implementation

### Database Schema Enhancements
```sql
-- Enhanced GRN lines with expiry date
ALTER TABLE grn_lines ADD COLUMN expiry_date DATE;

-- Enhanced stock lots with expiry date
ALTER TABLE stock_lots ADD COLUMN expiry_date TEXT;

-- FEFO lot selection view
CREATE VIEW vw_fefo_lots AS
SELECT 
    product_id,
    lot_id,
    lot_number,
    quantity_remaining,
    expiry_date,
    unit_cost_cents,
    received_date,
    ROW_NUMBER() OVER (
        PARTITION BY product_id 
        ORDER BY 
            CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END,
            expiry_date ASC,
            received_date ASC
    ) as fefo_priority
FROM stock_lots
WHERE quantity_remaining > 0;
```

### FEFO Logic Implementation
```typescript
// FEFO lot selection for sales
export function getFEFOLots(productId: number, requiredQuantity: number): FIFOLot[] {
  const lots = db.prepare(`
    SELECT 
      sl.id as lot_id,
      sl.lot_number,
      sl.quantity_remaining as quantity_available,
      sl.unit_cost,
      sl.received_date,
      sl.expiry_date
    FROM stock_lots sl
    WHERE sl.product_id = ? AND sl.quantity_remaining > 0
    ORDER BY 
      CASE WHEN sl.expiry_date IS NULL THEN 1 ELSE 0 END,
      sl.expiry_date ASC,
      sl.received_date ASC
  `).all(productId);
  
  // Select lots in FEFO order
  return selectLotsInOrder(lots, requiredQuantity);
}
```

### Expiry Alert Configuration
```typescript
interface ExpiryAlertConfig {
  expiry_days_threshold: number;        // Default: 30 days
  critical_days_threshold: number;      // Default: 7 days
  channels: {
    slack: { enabled: boolean; webhook_url?: string; };
    telegram: { enabled: boolean; bot_token?: string; chat_id?: string; };
    email: { enabled: boolean; smtp_config: EmailConfig; };
  };
}
```

## API Endpoints

### Near-Expiry Reports
- **GET /api/reports/near-expiry**: Get near-expiry products report
- **GET /api/reports/expiry-summary**: Get expiry summary for dashboard
- **GET /api/reports/product-expiry/:productId**: Get expiry info for specific product
- **POST /api/reports/expiry-test**: Test expiry alert configuration
- **GET /api/reports/expiry-config**: Get expiry alert configuration

### Query Parameters
```typescript
{
  days_threshold?: number;        // Days threshold (default: 30)
  status?: 'all' | 'expired' | 'critical' | 'near_expiry';
  category_id?: number;           // Filter by category
  export_format?: 'json' | 'csv'; // Export format
}
```

## UI Components

### Expiry Badge Component
```tsx
<ExpiryBadge
  expiryInfo={{
    days_to_expiry: 5,
    expiry_status: 'Critical',
    expiry_date: '2024-01-20'
  }}
  showIcon={true}
  size="md"
/>
```

### GRN Line Form with Expiry
```tsx
<GRNLineForm
  lineItem={lineItem}
  onSave={handleSave}
  onCancel={handleCancel}
  products={products}
  isEditing={false}
/>
```

### Expiry Badge List
```tsx
<ExpiryBadgeList
  lots={productLots}
  maxDisplay={3}
  showQuantity={true}
/>
```

## Environment Configuration

### New Environment Variables
```bash
# Expiry Alert Configuration
ALERTS_EXPIRY_DAYS_THRESHOLD=30        # Near expiry threshold
ALERTS_CRITICAL_EXPIRY_DAYS=7          # Critical expiry threshold
```

## Sample Report JSON

### Near-Expiry Report Response
```json
{
  "ok": true,
  "data": {
    "summary": {
      "total_lots": 15,
      "expired_lots": 2,
      "critical_lots": 3,
      "near_expiry_lots": 10,
      "total_value_at_risk": 250000,
      "threshold_days": 30
    },
    "products": [
      {
        "product_id": 101,
        "sku": "MILK-001",
        "name_en": "Fresh Milk 1L",
        "name_si": "තැනුම් කිරි 1L",
        "name_ta": "புதிய பால் 1L",
        "unit": "pcs",
        "category_name": "Dairy",
        "lot_id": 501,
        "lot_number": "LOT-2024-001",
        "quantity_remaining": 25,
        "expiry_date": "2024-01-20",
        "days_to_expiry": 5,
        "expiry_status": "Critical",
        "unit_cost_cents": 12000,
        "total_value_cents": 300000
      }
    ],
    "generated_at": "2024-01-15T08:30:45.123Z",
    "filters": {
      "days_threshold": 30,
      "status": "all",
      "category_id": null
    }
  }
}
```

## Scheduler Integration

### Automated Jobs
```typescript
// Expiry alerts - every day at 8 AM
this.scheduleJob('expiry-alerts', '0 8 * * *', async () => {
  try {
    this.logger.info('Running expiry alerts check');
    await expiryAlertService.checkAndAlert();
  } catch (error) {
    this.logger.error('Expiry alerts job failed', { error: error.message });
  }
});
```

## FEFO Sales Logic

### Sales Processing with FEFO
```typescript
// Updated stock ledger to use FEFO instead of FIFO
if (costMethod === 'FIFO') {
  // Use FEFO (First Expiry, First Out) method instead of FIFO
  lots = getFEFOLots(productId, quantity);
  
  for (const lot of lots) {
    const actualQuantity = Math.min(lot.quantity_available, quantity);
    // Process lot with expiry priority
    processLotWithExpiry(lot, actualQuantity);
  }
}
```

## Alert Message Format

### Expiry Alert Example
```
⏰ EXPIRY ALERT - 2024-01-15 08:30:00

Found 15 lot(s) with expiry issues:

🔴 EXPIRED ITEMS (2):
1. Fresh Milk 1L (MILK-001)
   Lot: LOT-2024-001
   Quantity: 10 pcs
   Expired: 3 days ago
   Value: LKR 120.00

🟠 CRITICAL EXPIRY (3):
1. Bread White (BREAD-001)
   Lot: LOT-2024-002
   Quantity: 15 pcs
   Expires in: 2 days
   Value: LKR 67.50

📊 Summary:
• Total Lots: 15
• Expired: 2
• Critical: 3
• Near Expiry: 10
• Total Value at Risk: LKR 2,500.00
```

## Benefits

1. **FEFO Compliance**: Ensures products are sold in expiry order
2. **Waste Reduction**: Minimizes expired product waste
3. **Automated Monitoring**: 24/7 expiry monitoring with alerts
4. **Comprehensive Reporting**: Detailed expiry reports and analytics
5. **Multi-channel Alerts**: Slack, Telegram, and Email notifications
6. **UI Integration**: Visual expiry indicators and forms
7. **CSV Export**: Easy data export for external analysis
8. **Dashboard Integration**: Summary statistics for quick overview
9. **Configurable Thresholds**: Flexible alert thresholds
10. **Audit Trail**: Complete expiry tracking and history

## Usage Examples

### Get Near-Expiry Report
```bash
curl -X GET "http://localhost:8250/api/reports/near-expiry?days_threshold=30&status=critical" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Export CSV Report
```bash
curl -X GET "http://localhost:8250/api/reports/near-expiry?export_format=csv" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o near-expiry-report.csv
```

### Get Product Expiry Info
```bash
curl -X GET "http://localhost:8250/api/reports/product-expiry/101" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Expiry Alerts
```bash
curl -X POST "http://localhost:8250/api/reports/expiry-test" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Future Enhancements

1. **Bulk Expiry Updates**: Batch update expiry dates
2. **Expiry Analytics**: Historical expiry trend analysis
3. **Supplier Expiry Reports**: Expiry analysis by supplier
4. **Mobile Notifications**: Push notifications for critical expiry
5. **Expiry Workflows**: Automated expiry handling workflows
6. **Integration APIs**: Webhook integration for external systems
7. **Expiry Forecasting**: Predictive expiry analysis
8. **Custom Expiry Rules**: Product-specific expiry rules
9. **Expiry Cost Analysis**: Financial impact of expiry
10. **Expiry Dashboard**: Real-time expiry monitoring dashboard

The expiry handling system provides a comprehensive solution for managing product expiry dates with FEFO logic, automated monitoring, and detailed reporting capabilities. The system ensures products are sold in the correct order while providing early warning for near-expiry items.










