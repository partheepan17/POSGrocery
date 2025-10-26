# Feature Toggle and Cascade Disable System

This document describes the implementation of the feature toggle system with cascade disable functionality, per-role control, and optimistic updates with rollback.

## Overview

The system provides:
- **Feature Toggle with Dependency Validation**: Prevents disabling features that have enabled dependents
- **Cascade Disable**: Allows disabling a feature and all its dependents in one transaction
- **Per-Role Control**: Manage feature access and permissions per role
- **Optimistic Updates**: Immediate UI updates with rollback on failure
- **Impact Preview**: Shows users what will be affected before making changes

## Architecture

### Server-Side Components

#### 1. Dependency Management (`src/lib/access/dependency.ts`)

Enhanced with cascade disable functionality:

```typescript
// Compute all enabled features that require this feature (transitively)
async computeEffectiveDependents(tenantId: string, featureCode: string): Promise<string[]>

// Validate disable with cascade option
async validateDisableWithCascade(tenantId: string, featureCode: string): Promise<CascadeDisableResult>
```

**Key Features:**
- Transitive dependency resolution
- Cascade target identification
- Blocking dependent detection

#### 2. Feature Toggle Service (`server/services/featureToggleService.ts`)

Updated to support cascade disable:

```typescript
interface ToggleFeatureRequest {
  tenantId: string;
  featureCode: string;
  isEnabled: boolean;
  updatedBy: string;
  cascade?: boolean; // New parameter
}

interface FeatureToggleResult {
  success: boolean;
  featureCode: string;
  isEnabled: boolean;
  updatedBy: string;
  updatedAt: string;
  message?: string;
  error?: string;
  blockingDependents?: string[];
  cascadeTargets?: string[];
}
```

**Key Features:**
- Dependency validation before disable
- Cascade disable with transaction safety
- Comprehensive error handling
- Audit logging

#### 3. Admin Features Routes (`server/routes/adminFeatures.ts`)

API endpoints for feature management:

- `POST /api/admin/features/toggle` - Toggle feature with cascade support
- `POST /api/admin/features/override` - Override feature for specific role
- `GET /api/admin/features/dependencies/:featureCode` - Get dependency information

**Request/Response Examples:**

```json
// Toggle with cascade
POST /api/admin/features/toggle
{
  "featureCode": "sales.view",
  "isEnabled": false,
  "cascade": true
}

// Response on success
{
  "ok": true,
  "message": "Feature 'sales.view' and 2 dependent features disabled for tenant 'tenant-1'",
  "data": {
    "featureCode": "sales.view",
    "isEnabled": false,
    "cascadeTargets": ["sales.create", "reports.sales"]
  }
}

// Response on dependency conflict
{
  "ok": false,
  "error": "DEPENDENTS",
  "message": "Cannot disable feature 'sales.view': has enabled dependents",
  "blockingDependents": ["sales.create", "reports.sales"]
}
```

### Frontend Components

#### 1. Impact Preview Modal (`src/frontend/components/features/ImpactPreviewModal.tsx`)

Shows users the impact of their feature toggle actions:

**Features:**
- Dependency visualization
- Blocking dependent warnings
- Cascade target preview
- Confirmation checkbox for cascade disable
- Clear impact messaging

**Props:**
```typescript
interface ImpactPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cascade: boolean) => void;
  featureCode: string;
  featureName: string;
  isEnabling: boolean;
  blockingDependents?: string[];
  cascadeTargets?: string[];
  isLoading?: boolean;
}
```

#### 2. Access Matrix (`src/frontend/components/features/AccessMatrix.tsx`)

Per-role control interface:

**Features:**
- Role × Permission matrix
- Feature availability by role
- Real-time updates
- Summary statistics

**Props:**
```typescript
interface AccessMatrixProps {
  selectedFeature: string;
  roles: Role[];
  permissions: Permission[];
  rolePermissions: RolePermission[];
  roleFeatureOverrides: RoleFeatureOverride[];
  onPermissionChange: (roleId: number, permissionId: number, granted: boolean) => void;
  onFeatureOverrideChange: (roleId: number, featureCode: string, isEnabled: boolean) => void;
  isLoading?: boolean;
}
```

#### 3. Features Access Page (`src/frontend/pages/admin/FeaturesAccessPage.tsx`)

Main admin interface for feature management:

**Features:**
- Feature list with categories
- Search and filtering
- Toggle switches with dependency validation
- Access matrix integration
- Optimistic updates with rollback

## Usage Examples

### 1. Basic Feature Toggle

```typescript
// Enable a feature
const result = await toggleFeature('inventory.view', true);

// Disable a feature (will check dependencies)
const result = await toggleFeature('inventory.view', false);
```

### 2. Cascade Disable

```typescript
// Disable with cascade (disables all dependents)
const result = await toggleFeature('sales.view', false, true);
console.log('Cascade targets:', result.cascadeTargets);
```

### 3. Dependency Validation

```typescript
// Check if a feature can be disabled
const validation = await dependencyManager.validateDisable(tenantId, 'sales.view');
if (!validation.canDisable) {
  console.log('Blocking dependents:', validation.blockingDependents);
}

// Get cascade information
const cascadeInfo = await dependencyManager.validateDisableWithCascade(tenantId, 'sales.view');
console.log('Cascade targets:', cascadeInfo.cascadeTargets);
```

### 4. Role Feature Override

```typescript
// Override feature for specific role
const result = await axios.post('/api/admin/features/override', {
  roleId: 2,
  featureCode: 'sales.view',
  isEnabled: false
});
```

## Testing

### Test Script

Run the comprehensive test suite:

```bash
node test-cascade-disable.js
```

**Test Coverage:**
- Feature enable/disable
- Dependency validation
- Cascade disable functionality
- Role feature overrides
- Error handling

### Manual Testing

1. **Enable Features with Dependencies:**
   - Enable `sales.view`
   - Enable `sales.create` (depends on `sales.view`)

2. **Test Dependency Blocking:**
   - Try to disable `sales.view` without cascade
   - Should get DEPENDENTS error

3. **Test Cascade Disable:**
   - Disable `sales.view` with cascade=true
   - Should disable both `sales.view` and `sales.create`

4. **Test Role Overrides:**
   - Override feature for specific role
   - Verify role-specific behavior

## Error Handling

### Server-Side Errors

- **DEPENDENTS**: Feature has enabled dependents
- **FEATURE_NOT_FOUND**: Feature doesn't exist
- **CORE_FEATURE**: Cannot disable core features
- **VALIDATION_ERROR**: Invalid request data

### Client-Side Error Handling

- Optimistic updates with rollback
- Toast notifications for errors
- Loading states during operations
- Impact preview for destructive actions

## Security Considerations

- All endpoints require authentication
- Policy-based authorization
- Tenant isolation
- Audit logging for all changes
- Transaction safety for cascade operations

## Performance Optimizations

- In-memory caching with TTL
- Efficient dependency resolution
- Batch operations for cascade disable
- Optimistic UI updates
- Lazy loading of access matrix

## Future Enhancements

- Bulk feature operations
- Feature usage analytics
- A/B testing integration
- Feature flag scheduling
- Advanced dependency visualization
- Role-based feature recommendations

## Troubleshooting

### Common Issues

1. **Cascade Disable Not Working:**
   - Check if feature has dependents
   - Verify cascade parameter is true
   - Check transaction logs

2. **Dependencies Not Detected:**
   - Verify feature catalog is up to date
   - Check cache invalidation
   - Review dependency configuration

3. **Role Overrides Not Applied:**
   - Verify role exists
   - Check permission policies
   - Review audit logs

### Debug Commands

```bash
# Check feature dependencies
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/features/dependencies/sales.view"

# Get all features
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/meta/features"

# Check cache status
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/cache/status"
```

## API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/features/toggle` | Toggle feature with cascade support |
| POST | `/api/admin/features/override` | Override feature for role |
| GET | `/api/admin/features/dependencies/:code` | Get feature dependencies |
| GET | `/api/meta/features` | Get user features and permissions |

### Request/Response Schemas

See individual component documentation for detailed schemas.

## Contributing

When adding new features:

1. Update dependency management
2. Add appropriate tests
3. Update API documentation
4. Consider security implications
5. Add audit logging
6. Update frontend components

## License

This feature toggle system is part of the POS-GroceryV2 project.










