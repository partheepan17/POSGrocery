# Foreign Key Constraints Implementation

## Overview

This document describes the implementation of foreign key constraints and deletion guards to prevent deletion of products that have dependencies (sales, movements, GRN, returns, quick sales) while allowing soft delete functionality.

## Implementation

### Files Created/Modified:

#### 1. Database Migration (`server/db/migrations/038_fk_constraints.sql`)
- Adds `ON DELETE RESTRICT` constraints to prevent product deletion with dependencies
- Implements soft delete support with `deleted_at` and `deleted_by` columns
- Creates triggers to prevent hard deletion of products with dependencies
- Adds views for deletion status and dependency tracking

#### 2. Product Deletion Service (`server/services/productDeletionService.ts`)
- Service layer for handling product deletion logic
- Checks deletion status and dependencies
- Handles soft delete and restore operations
- Provides detailed dependency information

#### 3. API Routes (`server/routes/productDeletion.ts`)
- RESTful endpoints for product deletion operations
- Proper error handling with 409 Conflict responses
- RBAC guards for admin/manager roles
- Comprehensive validation and logging

#### 4. Test Suite (`server/tests/productDeletion.test.ts`)
- Comprehensive negative tests for deletion prevention
- Tests for all dependency types (sales, movements, GRN, returns, quick sales)
- Soft delete and restore functionality tests
- Error handling and permission tests

#### 5. Test Script (`test_product_deletion.js`)
- Standalone test script for manual verification
- Tests FK constraints and triggers
- Validates soft delete functionality

## Database Schema Changes

### Foreign Key Constraints Added

```sql
-- invoice_lines table
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT

-- stock_movements table  
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT

-- grn_lines table
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT

-- return_lines table
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT

-- quick_sales_lines table
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
```

### Soft Delete Support

```sql
-- Add soft delete columns to products table
ALTER TABLE products ADD COLUMN deleted_at TEXT;
ALTER TABLE products ADD COLUMN deleted_by INTEGER;

-- Create indexes for soft delete queries
CREATE INDEX idx_products_deleted_at ON products(deleted_at);
CREATE INDEX idx_products_active_not_deleted ON products(is_active, deleted_at) WHERE deleted_at IS NULL;
```

### Views and Triggers

```sql
-- Deletion status view
CREATE VIEW v_product_deletion_status AS
SELECT 
    p.id, p.name_en, p.sku, p.deleted_at,
    CASE 
        WHEN p.deleted_at IS NOT NULL THEN 'already_deleted'
        WHEN EXISTS (SELECT 1 FROM invoice_lines WHERE product_id = p.id) THEN 'has_sales'
        WHEN EXISTS (SELECT 1 FROM stock_movements WHERE product_id = p.id) THEN 'has_movements'
        WHEN EXISTS (SELECT 1 FROM grn_lines WHERE product_id = p.id) THEN 'has_grn'
        WHEN EXISTS (SELECT 1 FROM return_lines WHERE product_id = p.id) THEN 'has_returns'
        WHEN EXISTS (SELECT 1 FROM quick_sales_lines WHERE product_id = p.id) THEN 'has_quick_sales'
        ELSE 'can_delete'
    END as deletion_status,
    -- ... dependency counts
FROM products p;

-- Prevention triggers
CREATE TRIGGER prevent_product_deletion_with_sales
    BEFORE DELETE ON products
    FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN EXISTS (SELECT 1 FROM invoice_lines WHERE product_id = OLD.id)
        THEN RAISE(ABORT, 'Cannot delete product: has sales records')
    END;
END;
```

## API Endpoints

### Product Deletion Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/products/:id/deletion-status` | Check deletion status | Admin/Manager |
| GET | `/api/products/:id/can-delete` | Simple deletion check | Admin/Manager |
| POST | `/api/products/:id/soft-delete` | Soft delete product | Admin/Manager |
| POST | `/api/products/:id/restore` | Restore soft deleted product | Admin/Manager |
| DELETE | `/api/products/:id/hard-delete` | Hard delete product | Admin |
| GET | `/api/products/deletable` | Get deletable products | Admin/Manager |
| GET | `/api/products/with-dependencies` | Get products with dependencies | Admin/Manager |
| GET | `/api/products/deleted` | Get soft deleted products | Admin/Manager |
| GET | `/api/products/:id/dependencies` | Get detailed dependencies | Admin/Manager |

### Response Examples

#### Deletion Status Check
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name_en": "Test Product",
    "sku": "TEST-001",
    "deleted_at": null,
    "deletion_status": "has_sales",
    "sales_count": 5,
    "movements_count": 0,
    "grn_count": 0,
    "returns_count": 0,
    "quick_sales_count": 0
  }
}
```

#### Deletion Prevention (409 Conflict)
```json
{
  "success": false,
  "error": "Cannot delete product: has sales records",
  "code": "CONFLICT"
}
```

## Usage Examples

### 1. Check if Product Can Be Deleted

```typescript
// Check deletion status
const response = await fetch('/api/products/123/deletion-status', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const status = await response.json();

if (status.data.deletion_status === 'can_delete') {
  // Safe to delete
} else {
  // Has dependencies
  console.log(`Cannot delete: ${status.data.deletion_status}`);
}
```

### 2. Soft Delete Product

```typescript
// Soft delete product
const response = await fetch('/api/products/123/soft-delete', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ reason: 'Product discontinued' })
});

if (response.status === 409) {
  console.log('Cannot delete: product has dependencies');
} else if (response.ok) {
  console.log('Product soft deleted successfully');
}
```

### 3. Restore Soft Deleted Product

```typescript
// Restore product
const response = await fetch('/api/products/123/restore', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

if (response.ok) {
  console.log('Product restored successfully');
}
```

## Testing

### Running Tests

```bash
# Run Jest tests
npm test -- productDeletion.test.ts

# Run manual test script
node test_product_deletion.js
```

### Test Coverage

- ✅ FK constraint prevention for all dependency types
- ✅ Soft delete functionality
- ✅ Restore functionality
- ✅ Deletion status checking
- ✅ Error handling and responses
- ✅ RBAC permission checks
- ✅ Service layer functionality

## Error Handling

### HTTP Status Codes

- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Product not found
- `409` - Conflict (cannot delete due to dependencies)
- `500` - Internal server error

### Error Messages

- "Cannot delete product: has sales records"
- "Cannot delete product: has stock movements"
- "Cannot delete product: has GRN records"
- "Cannot delete product: has return records"
- "Cannot delete product: has quick sales records"
- "Product is already deleted"
- "Product not found"

## Performance Considerations

### Indexes
- `idx_products_deleted_at` - For soft delete queries
- `idx_products_active_not_deleted` - For active product queries
- Existing product_id indexes on dependent tables

### Query Optimization
- Views use efficient EXISTS subqueries
- Triggers prevent unnecessary cascade operations
- Soft delete allows for data recovery

## Security

### RBAC Guards
- Soft delete: Admin/Manager only
- Hard delete: Admin only
- Status checks: Admin/Manager only

### Audit Logging
- All deletion attempts are logged
- Soft delete operations are tracked
- User attribution for all operations

## Migration Strategy

### 1. Apply Migration
```bash
# Run the migration
node -e "require('./server/db/migrate').runMigrations()"
```

### 2. Verify Constraints
```bash
# Test the constraints
node test_product_deletion.js
```

### 3. Update Application Code
- Replace hard delete calls with soft delete
- Add deletion status checks before operations
- Handle 409 Conflict responses appropriately

## Maintenance

### Monitoring
- Track deletion attempts and failures
- Monitor soft deleted product counts
- Alert on constraint violations

### Cleanup
- Periodic cleanup of old soft deleted products
- Archive deleted product data
- Maintain referential integrity

## Conclusion

The FK constraints implementation provides:
- ✅ Complete protection against accidental product deletion
- ✅ Soft delete functionality for data recovery
- ✅ Comprehensive dependency tracking
- ✅ Proper error handling and user feedback
- ✅ Audit trail and security controls
- ✅ Performance optimization
- ✅ Extensive testing coverage

This ensures data integrity while providing flexibility for product lifecycle management.










