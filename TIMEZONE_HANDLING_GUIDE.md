# Timezone Handling Guide

## Overview

This document describes the timezone handling implementation in the POS Grocery system. All timestamps are stored as UTC in the database and converted to local timezone for display in the UI.

## Architecture

### Backend (UTC Storage)
- All timestamps stored as UTC ISO strings in database
- API responses include timezone information in headers
- Middleware handles timezone conversion and headers

### Frontend (Local Display)
- Browser timezone detection and conversion
- Date/time pickers handle UTC conversion automatically
- API calls include timezone headers

## Implementation

### Backend Components

#### 1. Date Utilities (`server/utils/dateUtils.ts`)
```typescript
// Get timezone from request headers
const timezone = getTimezoneFromRequest(req);

// Convert UTC to local time
const localTime = toLocalTime(utcTimestamp, timezone.timezone);

// Convert local time to UTC
const utcTime = toUTC(localTimestamp, timezone.timezone);

// Format for display
const formatted = formatLocalTime(utcTimestamp, timezone.timezone);
```

#### 2. Timezone Middleware (`server/middleware/timezone.ts`)
```typescript
// Parse timezone from headers
app.use(timezoneMiddleware);

// Add timezone info to responses
app.use(addTimezoneToResponse);
```

#### 3. API Headers
- `X-Timezone`: Browser timezone (e.g., "Asia/Colombo")
- `X-Timezone-Offset`: UTC offset (e.g., "+05:30")

### Frontend Components

#### 1. Date Utilities (`src/utils/dateUtils.ts`)
```typescript
// Convert UTC to local time
const localTime = utcToLocal(utcTimestamp);

// Convert local time to UTC
const utcTime = localToUTC(localTimestamp);

// Format for display
const formatted = formatLocalTime(utcTimestamp);
```

#### 2. Timezone Hook (`src/hooks/useTimezone.ts`)
```typescript
const { timezone, formatTime, formatDate, toUTC, toLocal } = useTimezone();
```

#### 3. API Service (`src/services/apiService.ts`)
```typescript
// Automatically includes timezone headers
const response = await apiService.get('/sales', { startDate, endDate });
```

## Usage Examples

### Backend API Endpoints

#### 1. Sales Endpoint
```typescript
// Store UTC timestamp
const sale = {
  id: 1,
  total: 100.00,
  created_at: getCurrentUTC() // "2024-01-15T10:30:00.000Z"
};

// Return with timezone info
res.json({
  success: true,
  data: addTimezoneInfo(sale, req.timezone),
  _timezone: {
    timezone: "Asia/Colombo",
    offset: 330,
    offsetString: "+05:30"
  }
});
```

#### 2. Date Range Queries
```typescript
// Convert local date range to UTC
const { startUTC, endUTC } = formatDateRange(startDate, endDate, timezone.timezone);

// Query with UTC timestamps
const sales = db.prepare(`
  SELECT * FROM invoices 
  WHERE created_at >= ? AND created_at <= ?
`).all(startUTC, endUTC);
```

### Frontend Components

#### 1. DateTimePicker
```tsx
<DateTimePicker
  value={sale.created_at} // UTC ISO string
  onChange={(utcValue) => setSale({ ...sale, created_at: utcValue })}
  type="datetime"
  label="Sale Date"
/>
```

#### 2. DateRangePicker
```tsx
<DateRangePicker
  startValue={startDate} // UTC ISO string
  endValue={endDate}     // UTC ISO string
  onChange={(startUTC, endUTC) => {
    setStartDate(startUTC);
    setEndDate(endUTC);
  }}
  showPresets={true}
/>
```

#### 3. API Calls
```typescript
// Date range automatically converted to UTC
const response = await apiService.get('/sales', {
  startDate: '2024-01-01', // Local date
  endDate: '2024-01-31'    // Local date
});

// Response timestamps converted to local time
console.log(response.data[0].created_at_local); // "2024-01-15 4:00 PM"
```

## Database Schema

### Timestamp Columns
All timestamp columns use UTC ISO format:
```sql
CREATE TABLE invoices (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
```

### Indexes
```sql
-- Index for date range queries
CREATE INDEX idx_invoices_created_at ON invoices(created_at);

-- Composite index for product and date
CREATE INDEX idx_stock_movements_product_created_at ON stock_movements(product_id, created_at);
```

## Migration Strategy

### 1. Existing Data
```sql
-- Convert existing timestamps to UTC
UPDATE invoices 
SET created_at = datetime(created_at, 'utc')
WHERE created_at NOT LIKE '%Z' AND created_at NOT LIKE '%+%' AND created_at NOT LIKE '%-%';
```

### 2. New Data
```typescript
// Always use UTC for new records
const timestamp = getCurrentUTC(); // "2024-01-15T10:30:00.000Z"
```

## Testing

### 1. Backend Tests
```typescript
// Test timezone conversion
const timezone = { timezone: 'Asia/Colombo', offset: 330, offsetString: '+05:30' };
const localTime = toLocalTime('2024-01-15T10:30:00.000Z', timezone.timezone);
expect(localTime.getHours()).toBe(16); // 10:30 UTC + 5:30 = 16:00 local
```

### 2. Frontend Tests
```typescript
// Test UTC conversion
const utcTime = localToUTC('2024-01-15T16:00:00');
expect(utcTime).toBe('2024-01-15T10:30:00.000Z');
```

## Best Practices

### 1. Backend
- Always store timestamps as UTC
- Use `getCurrentUTC()` for new timestamps
- Include timezone info in API responses
- Handle timezone headers gracefully

### 2. Frontend
- Convert UTC to local time for display
- Convert local time to UTC for API calls
- Use timezone-aware components
- Handle timezone changes gracefully

### 3. Database
- Use UTC for all timestamp columns
- Create indexes on timestamp columns
- Use consistent timestamp format

## Common Issues

### 1. Timezone Detection
```typescript
// Browser timezone detection
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Fallback for unsupported timezones
const timezone = timezone || 'UTC';
```

### 2. DST Handling
```typescript
// Update timezone info periodically
useEffect(() => {
  const interval = setInterval(() => {
    setTimezone(getBrowserTimezone());
  }, 60 * 60 * 1000); // Every hour
  
  return () => clearInterval(interval);
}, []);
```

### 3. Date Range Queries
```typescript
// Always use UTC for database queries
const { startUTC, endUTC } = parseDateRange(startDate, endDate);
const sales = await db.query('SELECT * FROM sales WHERE created_at BETWEEN ? AND ?', [startUTC, endUTC]);
```

## Performance Considerations

### 1. Index Usage
- Timestamp columns should be indexed
- Use composite indexes for common query patterns
- Consider partial indexes for active records

### 2. Caching
- Cache timezone conversions
- Use memoization for expensive operations
- Consider timezone-aware caching strategies

### 3. API Optimization
- Include timezone info in response headers
- Use efficient date range queries
- Consider pagination for large datasets

## Security Considerations

### 1. Input Validation
- Validate timezone headers
- Sanitize date inputs
- Handle malformed timestamps gracefully

### 2. Timezone Spoofing
- Validate timezone headers
- Use server-side timezone detection as fallback
- Log suspicious timezone changes

## Monitoring

### 1. Metrics
- Track timezone conversion performance
- Monitor API response times
- Log timezone-related errors

### 2. Alerts
- Alert on timezone conversion failures
- Monitor for timezone header anomalies
- Track DST transition issues

## Conclusion

The timezone handling implementation provides:
- Consistent UTC storage in database
- Automatic timezone conversion in UI
- Robust error handling and fallbacks
- Performance optimizations
- Security considerations

This ensures accurate time handling across different timezones while maintaining system performance and reliability.










