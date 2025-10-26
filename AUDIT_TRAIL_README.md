# Audit Trail System

This document describes the implementation of the comprehensive audit trail system with filtering, diff visualization, and export capabilities.

## Overview

The audit trail system provides:
- **Complete Activity Tracking**: Records all system changes and user actions
- **Advanced Filtering**: Filter by actor, action, feature code, date range, and more
- **Diff Visualization**: Shows before/after changes with visual diff chips
- **Export Capabilities**: Export audit logs as CSV or JSON
- **Pagination & Sorting**: Efficient handling of large audit datasets
- **Real-time Updates**: Live audit log updates via SSE

## Architecture

### Server-Side Components

#### 1. Audit Trail API (`server/routes/auditTrail.ts`)

Comprehensive audit log access with filtering and export:

**Endpoints:**
- `GET /api/admin/audit` - Get audit trail with filtering and pagination
- `GET /api/admin/audit/export` - Export audit trail as CSV or JSON

**Key Features:**
- Multi-criteria filtering (actor, action, feature code, date range)
- Pagination with configurable limits
- Sorting by date, actor, or action
- Diff extraction and formatting
- CSV and JSON export capabilities
- Tenant isolation and security

#### 2. Filter Options API

Dynamic filter options based on actual audit data:

```typescript
interface FilterOptions {
  actors: Array<{ username: string; name: string }>;
  actions: string[];
  featureCodes: string[];
}
```

#### 3. Diff Extraction

Intelligent diff extraction based on action type:

```typescript
function extractDiff(payload: any, action: string): {
  before?: any;
  after?: any;
  changes?: Array<{
    field: string;
    before: any;
    after: any;
  }>;
}
```

**Supported Action Types:**
- `FEATURE_TOGGLE` - Feature enable/disable changes
- `ROLE_FEATURE_OVERRIDE` - Role-specific feature overrides
- `USER_CREATE` - User creation events
- `USER_UPDATE` - User modification events
- `ROLE_PERMISSION_GRANT` - Permission grants
- `ROLE_PERMISSION_REVOKE` - Permission revocations

### Frontend Components

#### 1. Audit Trail Page (`src/frontend/pages/admin/AuditTrailPage.tsx`)

Comprehensive audit log management interface:

**Features:**
- Advanced filtering with multiple criteria
- Real-time search and filter application
- Pagination with configurable page sizes
- Sorting by multiple columns
- Diff visualization with before/after chips
- Detailed log view modal
- Export functionality (CSV/JSON)
- Summary statistics dashboard

**Key Components:**
- Filter panel with dropdowns and date pickers
- Audit logs table with sortable columns
- Pagination controls
- Export buttons
- Log details modal
- Summary statistics cards

## API Reference

### GET /api/admin/audit

Retrieve audit logs with filtering and pagination.

**Query Parameters:**
- `actor` (string, optional) - Filter by actor username
- `action` (string, optional) - Filter by action type
- `featureCode` (string, optional) - Filter by feature code
- `startDate` (string, optional) - Start date (ISO 8601)
- `endDate` (string, optional) - End date (ISO 8601)
- `limit` (number, optional) - Number of records per page (1-1000, default: 50)
- `offset` (number, optional) - Number of records to skip (default: 0)
- `sortBy` (string, optional) - Sort field ('created_at', 'actor_id', 'action', default: 'created_at')
- `sortOrder` (string, optional) - Sort order ('asc', 'desc', default: 'desc')

**Response:**
```json
{
  "ok": true,
  "data": {
    "logs": [
      {
        "id": 123,
        "actor": {
          "id": 1,
          "username": "admin",
          "email": "admin@example.com",
          "name": "Admin User"
        },
        "action": "FEATURE_TOGGLE",
        "payload": {
          "featureCode": "inventory.view",
          "tenantId": "tenant-1",
          "previousState": false,
          "newState": true
        },
        "diff": {
          "before": false,
          "after": true,
          "changes": [
            {
              "field": "isEnabled",
              "before": false,
              "after": true
            }
          ]
        },
        "createdAt": "2024-01-15T10:30:00Z",
        "timestamp": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    },
    "filters": {
      "actors": [
        { "username": "admin", "name": "Admin User" },
        { "username": "manager", "name": "Manager User" }
      ],
      "actions": ["FEATURE_TOGGLE", "USER_CREATE", "ROLE_PERMISSION_GRANT"],
      "featureCodes": ["inventory.view", "sales.create", "reports.sales"]
    }
  }
}
```

### GET /api/admin/audit/export

Export audit logs as CSV or JSON.

**Query Parameters:**
- All filter parameters from `/api/admin/audit`
- `format` (string, optional) - Export format ('csv', 'json', default: 'csv')

**Response:**
- CSV: Returns CSV file with headers
- JSON: Returns JSON response with audit data

## Usage Examples

### 1. Basic Audit Log Retrieval

```typescript
// Get recent audit logs
const response = await fetch('/api/admin/audit?limit=20', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-ID': tenantId
  }
});
const data = await response.json();
```

### 2. Filtered Audit Logs

```typescript
// Get feature toggle logs for specific actor
const response = await fetch('/api/admin/audit?action=FEATURE_TOGGLE&actor=admin', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-ID': tenantId
  }
});
```

### 3. Date Range Filtering

```typescript
// Get logs from last 7 days
const endDate = new Date().toISOString();
const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

const response = await fetch(`/api/admin/audit?startDate=${startDate}&endDate=${endDate}`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-ID': tenantId
  }
});
```

### 4. Export Audit Logs

```typescript
// Export as CSV
const response = await fetch('/api/admin/audit/export?format=csv&action=FEATURE_TOGGLE', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-ID': tenantId
  }
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'audit-trail.csv';
a.click();
```

## Frontend Usage

### 1. Basic Audit Trail Display

```tsx
import { AuditTrailPage } from '@/pages/admin/AuditTrailPage';

function AdminDashboard() {
  return (
    <div>
      <AuditTrailPage />
    </div>
  );
}
```

### 2. Custom Filtering

```tsx
const [filters, setFilters] = useState({
  actor: 'admin',
  action: 'FEATURE_TOGGLE',
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-01-31T23:59:59Z'
});

// Apply filters
const applyFilters = () => {
  const queryParams = new URLSearchParams(filters);
  loadAuditLogs(`/api/admin/audit?${queryParams.toString()}`);
};
```

### 3. Export Functionality

```tsx
const handleExport = async (format: 'csv' | 'json') => {
  const queryParams = new URLSearchParams({
    ...filters,
    format
  });
  
  const response = await fetch(`/api/admin/audit/export?${queryParams.toString()}`);
  const blob = await response.blob();
  
  // Download file
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-trail.${format}`;
  a.click();
};
```

## Diff Visualization

### Before/After Chips

The system automatically generates visual diffs for audit logs:

```tsx
// Feature toggle diff
<div className="flex items-center gap-2">
  <Badge variant="outline">false</Badge>
  <span>→</span>
  <Badge variant="outline">true</Badge>
</div>

// Multiple field changes
<div className="space-y-1">
  <div className="flex items-center gap-2">
    <span>isEnabled:</span>
    <Badge variant="outline">false</Badge>
    <span>→</span>
    <Badge variant="outline">true</Badge>
  </div>
  <div className="flex items-center gap-2">
    <span>updatedBy:</span>
    <Badge variant="outline">system</Badge>
    <span>→</span>
    <Badge variant="outline">admin</Badge>
  </div>
</div>
```

### Action Icons and Colors

Different actions have distinct visual indicators:

```tsx
const ACTION_ICONS = {
  'FEATURE_TOGGLE': <Activity className="h-4 w-4" />,
  'USER_CREATE': <User className="h-4 w-4" />,
  'ROLE_PERMISSION_GRANT': <CheckCircle className="h-4 w-4" />,
  // ... more actions
};

const ACTION_COLORS = {
  'FEATURE_TOGGLE': 'bg-blue-100 text-blue-800',
  'USER_CREATE': 'bg-green-100 text-green-800',
  'ROLE_PERMISSION_GRANT': 'bg-green-100 text-green-800',
  // ... more actions
};
```

## Security Considerations

### Authentication & Authorization

- All endpoints require valid JWT authentication
- Tenant isolation enforced at database level
- Policy-based access control for audit viewing
- Separate permissions for export functionality

### Data Privacy

- Sensitive data is not logged in audit trails
- User passwords and tokens are never recorded
- Personal information is masked in exports
- Audit logs are retained according to data retention policies

### Audit Log Integrity

- Audit logs are immutable once created
- Cryptographic signatures for critical operations
- Regular integrity checks and validation
- Secure storage and backup procedures

## Performance Optimizations

### Database Optimization

- Indexed queries on common filter fields
- Pagination to limit result sets
- Efficient JSON extraction for tenant filtering
- Prepared statements for security and performance

### Caching Strategy

- Filter options cached for 5 minutes
- Pagination metadata cached
- Export results cached for 1 hour
- Real-time updates via SSE

### Frontend Optimizations

- Virtual scrolling for large datasets
- Debounced search and filtering
- Lazy loading of log details
- Optimistic updates for better UX

## Testing

### Test Script

Run the comprehensive test suite:

```bash
node test-audit-trail.js
```

**Test Coverage:**
- Audit log creation and retrieval
- Filtering by all criteria
- Pagination and sorting
- Export functionality (CSV/JSON)
- Error handling and edge cases

### Manual Testing

1. **Generate Audit Logs:**
   - Toggle features to create audit entries
   - Verify logs appear in audit trail

2. **Test Filtering:**
   - Filter by actor, action, feature code
   - Test date range filtering
   - Verify combined filters work

3. **Test Export:**
   - Export as CSV and verify format
   - Export as JSON and verify structure
   - Test filtered exports

4. **Test Pagination:**
   - Navigate through multiple pages
   - Verify page counts and navigation

## Troubleshooting

### Common Issues

1. **No Audit Logs Appearing:**
   - Check if audit logging is enabled
   - Verify tenant ID is correct
   - Check database connection

2. **Filter Not Working:**
   - Verify filter parameter names
   - Check data types (dates must be ISO 8601)
   - Ensure proper URL encoding

3. **Export Failing:**
   - Check file size limits
   - Verify export permissions
   - Check browser download settings

4. **Performance Issues:**
   - Reduce page size limit
   - Add more specific filters
   - Check database indexes

### Debug Commands

```bash
# Check audit log count
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/audit?limit=1"

# Test specific filter
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/audit?action=FEATURE_TOGGLE"

# Export recent logs
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/audit/export?format=csv" \
  -o audit-trail.csv
```

## Future Enhancements

### Planned Features

- **Real-time Notifications**: WebSocket updates for new audit logs
- **Advanced Analytics**: Audit log analytics and reporting
- **Custom Dashboards**: Configurable audit dashboards
- **Alert System**: Automated alerts for suspicious activities
- **Data Retention**: Automated cleanup of old audit logs
- **Advanced Search**: Full-text search across audit logs
- **Audit Log Archiving**: Long-term storage and retrieval
- **Compliance Reporting**: Automated compliance reports

### Integration Opportunities

- **SIEM Integration**: Send audit logs to security information systems
- **Log Aggregation**: Integration with centralized logging systems
- **Monitoring Tools**: Real-time monitoring and alerting
- **Backup Systems**: Automated backup and recovery
- **Analytics Platforms**: Business intelligence integration

## Contributing

When adding new audit events:

1. **Update Action Types**: Add new action types to the system
2. **Implement Diff Extraction**: Add diff logic for new action types
3. **Update Frontend**: Add icons and colors for new actions
4. **Add Tests**: Include new actions in test coverage
5. **Update Documentation**: Document new action types and their diffs

## License

This audit trail system is part of the POS-GroceryV2 project.










