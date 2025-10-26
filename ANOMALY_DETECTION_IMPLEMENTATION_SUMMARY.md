# Anomaly Detection Implementation Summary

## Overview
Implemented a comprehensive anomaly detection system with configurable rules for detecting unusual patterns in sales data. The system includes real-time detection algorithms, API endpoints, UI components, and rule management capabilities.

## Key Features

### 1. Anomaly Detection Engine (`server/utils/anomalyDetector.ts`)
- **Rule-Based Detection**: Configurable rules for different types of anomalies
- **Real-Time Analysis**: Detects anomalies based on historical data patterns
- **Severity Classification**: Critical, High, Medium, and Low severity levels
- **Category-Based Organization**: Sales volume, margin, voids, discounts, and timing

### 2. Detection Rules
- **Sales Volume Spike**: Detects sudden spikes (>3x rolling 7-day average)
- **Zero/Negative Margin**: Identifies sales with zero or negative profit margins
- **Frequent Voids**: Detects cashiers with unusually high void frequency (>20%)
- **Excessive Discounts**: Identifies transactions with high discount percentages (>50%)
- **Off-Hours Sales**: Detects sales outside normal business hours (before 6 AM or after 10 PM)
- **Large Transactions**: Identifies unusually large transactions (>LKR 50,000)

### 3. API Endpoints (`server/routes/anomalies.ts`)
- **GET /api/reports/anomalies**: Get anomalies report with filtering
- **GET /api/reports/anomalies/summary**: Get anomalies summary for dashboard
- **GET /api/reports/anomalies/rules**: Get anomaly detection rules
- **PUT /api/reports/anomalies/rules/:ruleId**: Update anomaly rule configuration
- **POST /api/reports/anomalies/detect**: Manually trigger anomaly detection
- **GET /api/reports/anomalies/export**: Export anomalies as CSV

### 4. UI Components
- **AnomaliesReport**: Main report component with filtering and display
- **AnomalyRulesConfig**: Rule configuration and management interface
- **Anomalies Page**: Combined page with tabs for reports and configuration

## Technical Implementation

### Anomaly Detection Algorithms

#### Sales Volume Spike Detection
```typescript
// Calculate rolling average for each day
for (let i = rule.window_days; i < dailySales.length; i++) {
  const currentDay = dailySales[i];
  const previousDays = dailySales.slice(i - rule.window_days, i);
  const rollingAverage = previousDays.reduce((sum, day) => sum + day.daily_total, 0) / rule.window_days;
  
  const spikeRatio = currentDay.daily_total / rollingAverage;
  
  if (spikeRatio >= rule.threshold) {
    // Create anomaly record
  }
}
```

#### Zero/Negative Margin Detection
```typescript
// Get sales with margin calculations
const salesWithMargin = db.prepare(`
  SELECT 
    i.id as invoice_id,
    SUM(il.total) as total_sales,
    SUM(il.qty * COALESCE(p.cost, 0)) as total_cost,
    SUM(il.total) - SUM(il.qty * COALESCE(p.cost, 0)) as margin
  FROM invoices i
  JOIN invoice_lines il ON i.id = il.invoice_id
  JOIN products p ON il.product_id = p.id
  WHERE i.created_at >= ? AND i.created_at <= ?
  GROUP BY i.id
  HAVING margin <= ?
`).all(startDate, endDate, rule.threshold);
```

#### Frequent Voids Detection
```typescript
// Get void statistics by cashier
const voidStats = db.prepare(`
  SELECT 
    i.cashier_id,
    u.name as cashier_name,
    COUNT(*) as total_transactions,
    SUM(CASE WHEN i.net < 0 THEN 1 ELSE 0 END) as void_count,
    CAST(SUM(CASE WHEN i.net < 0 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) as void_ratio
  FROM invoices i
  LEFT JOIN users u ON i.cashier_id = u.id
  WHERE i.created_at >= ? AND i.created_at <= ?
  GROUP BY i.cashier_id, u.name
  HAVING void_ratio >= ?
`).all(startDate, endDate, rule.threshold);
```

### API Request/Response Format

#### Get Anomalies Request
```bash
GET /api/reports/anomalies?start=2024-01-01&end=2024-01-31&severity=critical&category=margin&limit=100&offset=0
```

#### Anomalies Response
```json
{
  "ok": true,
  "data": {
    "anomalies": [
      {
        "id": "zero_margin_12345",
        "rule_id": "zero_margin",
        "rule_name": "Zero/Negative Margin Sale",
        "severity": "critical",
        "description": "Zero/negative margin sale detected: LKR -250.00",
        "detected_at": "2024-01-15T14:30:22Z",
        "value": -250,
        "threshold": 0,
        "deviation": -250,
        "context": {
          "invoice_id": 12345,
          "receipt_no": "RCP-2024-001234",
          "cashier_id": 5,
          "cashier_name": "John Doe",
          "terminal_name": "Terminal-01",
          "customer_id": 101,
          "customer_name": "ABC Company"
        },
        "metadata": {
          "total_sales": 5000,
          "total_cost": 5250,
          "margin_percentage": -5.0
        }
      }
    ],
    "summary": {
      "total_anomalies": 6,
      "by_severity": {
        "critical": 1,
        "high": 1,
        "medium": 3,
        "low": 1
      },
      "by_category": {
        "sales_volume": 2,
        "margin": 1,
        "voids": 1,
        "discounts": 1,
        "timing": 1
      }
    }
  }
}
```

### UI Components

#### Anomalies Report Component
```tsx
<AnomaliesReport className="space-y-6">
  {/* Filters */}
  <Card>
    <CardHeader>
      <CardTitle>Filters</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Date Range, Severity, Category, Rule Filters */}
      </div>
    </CardContent>
  </Card>

  {/* Summary Cards */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {/* Total Anomalies, Critical, High, Medium Cards */}
  </div>

  {/* Anomalies Table */}
  <Card>
    <CardContent>
      <Table>
        {/* Anomalies data table */}
      </Table>
    </CardContent>
  </Card>
</AnomaliesReport>
```

#### Rule Configuration Component
```tsx
<AnomalyRulesConfig>
  <Card>
    <CardHeader>
      <CardTitle>Detection Rules</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rule</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Threshold</TableHead>
            <TableHead>Window</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        {/* Rules data table with inline editing */}
      </Table>
    </CardContent>
  </Card>
</AnomalyRulesConfig>
```

## Rule Configuration

### Default Rules Configuration
```json
{
  "anomaly_detection_rules": {
    "rules": [
      {
        "id": "sales_spike",
        "name": "Sales Volume Spike",
        "description": "Detects sudden spikes in sales volume (>3x rolling 7-day average)",
        "enabled": true,
        "severity": "high",
        "threshold": 3.0,
        "window_days": 7,
        "category": "sales_volume"
      },
      {
        "id": "zero_margin",
        "name": "Zero/Negative Margin Sale",
        "description": "Detects sales with zero or negative profit margins",
        "enabled": true,
        "severity": "critical",
        "threshold": 0.0,
        "window_days": 1,
        "category": "margin"
      },
      {
        "id": "frequent_voids",
        "name": "Frequent Voids",
        "description": "Detects cashiers with unusually high void frequency (>20% of transactions)",
        "enabled": true,
        "severity": "medium",
        "threshold": 0.2,
        "window_days": 7,
        "category": "voids"
      }
    ]
  }
}
```

### Rule Categories
- **Sales Volume**: Detects unusual patterns in sales volume and transaction amounts
- **Margin**: Detects margin-related issues and profit concerns
- **Voids**: Detects unusual void patterns and potential fraud
- **Discounts**: Detects excessive discount usage and potential abuse
- **Timing**: Detects unusual timing patterns in transactions

### Severity Levels
- **Critical**: Requires immediate action (escalation in 15 minutes)
- **High**: High priority (escalation in 1 hour)
- **Medium**: Medium priority (escalation in 4 hours)
- **Low**: Low priority (escalation in 24 hours)

## API Usage Examples

### Get Anomalies with Filters
```bash
# Get critical anomalies for last 7 days
curl -X GET "http://localhost:8250/api/reports/anomalies?start=2024-01-08&end=2024-01-15&severity=critical" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get margin-related anomalies
curl -X GET "http://localhost:8250/api/reports/anomalies?category=margin&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get anomalies for specific rule
curl -X GET "http://localhost:8250/api/reports/anomalies?rule_id=sales_spike" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Rule Configuration
```bash
# Disable a rule
curl -X PUT "http://localhost:8250/api/reports/anomalies/rules/sales_spike" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"enabled": false}'

# Update threshold
curl -X PUT "http://localhost:8250/api/reports/anomalies/rules/large_transaction" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"threshold": 75000}'
```

### Export Anomalies
```bash
# Export anomalies as CSV
curl -X GET "http://localhost:8250/api/reports/anomalies/export?start=2024-01-01&end=2024-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o anomalies-report.csv
```

### Manual Detection
```bash
# Trigger manual anomaly detection
curl -X POST "http://localhost:8250/api/reports/anomalies/detect" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"start": "2024-01-01", "end": "2024-01-31"}'
```

## UI Features

### Anomalies Report Tab
- **Date Range Picker**: Select custom date ranges
- **Filter Controls**: Filter by severity, category, and rule
- **Summary Cards**: Overview of anomaly counts by severity
- **Data Table**: Detailed anomaly information with context
- **Export Functionality**: CSV export with current filters
- **Real-time Updates**: Refresh data with current filters

### Rules Configuration Tab
- **Rule Management**: Enable/disable rules and update thresholds
- **Inline Editing**: Edit rule parameters directly in the table
- **Category Organization**: Group rules by category
- **Severity Indicators**: Visual severity level indicators
- **Status Management**: Enable/disable individual rules

## Sample Anomaly Scenarios

### 1. Sales Volume Spike
```
Rule: Sales Volume Spike
Severity: High
Description: Sales spike detected: 3.5x normal volume
Value: LKR 125,000
Threshold: LKR 35,714 (3x rolling average)
Context: Daily sales for 2024-01-15
Metadata: Rolling average: LKR 35,714, Transaction count: 45
```

### 2. Zero Margin Sale
```
Rule: Zero/Negative Margin Sale
Severity: Critical
Description: Zero/negative margin sale detected: LKR -250.00
Value: -250
Threshold: 0
Context: Receipt RCP-2024-001234, Cashier: John Doe
Metadata: Total sales: LKR 5,000, Total cost: LKR 5,250, Margin: -5%
```

### 3. Frequent Voids
```
Rule: Frequent Voids
Severity: Medium
Description: High void frequency: 25.5% of transactions
Value: 0.255 (25.5%)
Threshold: 0.2 (20%)
Context: Cashier: John Doe
Metadata: Total transactions: 200, Void count: 51
```

### 4. Excessive Discounts
```
Rule: Excessive Discounts
Severity: Medium
Description: Excessive discount: 75.0% off
Value: 0.75 (75%)
Threshold: 0.5 (50%)
Context: Receipt RCP-2024-001235, Cashier: Jane Smith
Metadata: Gross: LKR 2,000, Discount: LKR 1,500, Net: LKR 500
```

### 5. Off-Hours Sales
```
Rule: Off-Hours Sales
Severity: Low
Description: Off-hours sale at 23:00 - LKR 1,250.00
Value: 23 (hour)
Threshold: 0
Context: Receipt RCP-2024-001236, Cashier: Mike Johnson
Metadata: Sale amount: LKR 1,250, Hour: 23, Late night: true
```

### 6. Large Transaction
```
Rule: Large Transaction
Severity: Medium
Description: Large transaction: LKR 75,000.00
Value: 75000
Threshold: 50000
Context: Receipt RCP-2024-001237, Cashier: Sarah Wilson
Metadata: Transaction amount: LKR 75,000, Excess: LKR 25,000
```

## Benefits

1. **Fraud Detection**: Identifies potential fraudulent activities
2. **Operational Insights**: Provides insights into unusual business patterns
3. **Risk Management**: Early warning system for business risks
4. **Performance Monitoring**: Tracks cashier and system performance
5. **Compliance**: Helps maintain business compliance and audit trails
6. **Cost Control**: Identifies margin issues and excessive discounts
7. **Real-time Alerts**: Immediate notification of critical anomalies
8. **Configurable Rules**: Flexible rule system for different business needs
9. **Historical Analysis**: Trend analysis and pattern recognition
10. **Export Capabilities**: Easy data export for external analysis

## Future Enhancements

1. **Machine Learning**: AI-powered anomaly detection
2. **Predictive Analytics**: Forecast potential anomalies
3. **Real-time Streaming**: Live anomaly detection
4. **Mobile Alerts**: Push notifications for critical anomalies
5. **Dashboard Integration**: Real-time anomaly dashboard
6. **Custom Rules**: User-defined detection rules
7. **Anomaly Scoring**: Risk scoring system
8. **Integration APIs**: Webhook integration for external systems
9. **Advanced Filtering**: More sophisticated filtering options
10. **Anomaly Trends**: Historical trend analysis and reporting

The anomaly detection system provides a comprehensive solution for identifying unusual patterns in sales data, helping businesses maintain operational integrity and detect potential issues early. The system is highly configurable, user-friendly, and provides both real-time detection and historical analysis capabilities.










