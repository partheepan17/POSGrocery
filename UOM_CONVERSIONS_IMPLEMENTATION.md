# UOM Conversions Implementation

## Overview

This document describes the implementation of Unit of Measure (UOM) conversions in the POS system, allowing goods to be received in alternative units and automatically converted to base units for inventory tracking.

## Features

- **Alternative Unit Receiving**: Receive goods in cartons, boxes, kilograms, etc.
- **Automatic Conversion**: Convert alternative units to base units for inventory
- **Base Unit Sales**: Sales only accept base units for consistency
- **Conversion Management**: Create, update, and manage UOM conversions
- **Validation**: Comprehensive validation of conversion data

## Database Schema

### product_uom Table

```sql
CREATE TABLE product_uom (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    base_unit TEXT NOT NULL,           -- Base unit (e.g., 'pc', 'kg', 'g')
    alt_unit TEXT NOT NULL,            -- Alternative unit (e.g., 'carton', 'box', 'lb')
    multiplier REAL NOT NULL,          -- Conversion factor
    is_active BOOLEAN DEFAULT 1,       -- Whether this conversion is active
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(product_id, base_unit, alt_unit)
);
```

### Enhanced Tables

- **stock_lots**: Added `received_unit`, `received_quantity`, `conversion_multiplier`
- **grn_lines**: Added `received_unit`, `received_quantity`, `conversion_multiplier`

## API Endpoints

### UOM Conversion Management

#### Get UOM Conversions for Product
```http
GET /api/grn/uom-conversions/:productId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "productId": 1,
    "baseUnit": "pc",
    "conversions": [
      {
        "id": 1,
        "productId": 1,
        "baseUnit": "pc",
        "altUnit": "carton",
        "multiplier": 12.0,
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "alternativeUnits": ["carton", "box", "dozen"]
  }
}
```

#### Get All UOM Conversions
```http
GET /api/grn/uom-conversions
```

#### Create UOM Conversion
```http
POST /api/grn/uom-conversions
Content-Type: application/json

{
  "productId": 1,
  "baseUnit": "pc",
  "altUnit": "carton",
  "multiplier": 12.0
}
```

#### Update UOM Conversion
```http
PUT /api/grn/uom-conversions/:conversionId
Content-Type: application/json

{
  "baseUnit": "pc",
  "altUnit": "carton",
  "multiplier": 12.0
}
```

#### Deactivate UOM Conversion
```http
DELETE /api/grn/uom-conversions/:conversionId
```

#### Get Conversion Suggestions
```http
GET /api/grn/uom-conversions/:productId/suggestions
```

### GRN with UOM Support

#### Create GRN with Alternative Units
```http
POST /api/grn
Content-Type: application/json

{
  "supplier_id": 1,
  "invoice_number": "INV-001",
  "grn_date": "2024-01-01",
  "notes": "Received in cartons",
  "lines": [
    {
      "product_id": 1,
      "quantity": 120,              // Base unit quantity (will be calculated)
      "unit_cost": 2.50,
      "total_cost": 300.00,
      "received_unit": "carton",    // Alternative unit
      "received_quantity": 10       // Alternative unit quantity
    }
  ]
}
```

## Usage Examples

### 1. Creating UOM Conversions

```typescript
import { uomService } from '../services/uomService';

// Create a conversion: 1 carton = 12 pieces
const conversion = uomService.createConversion(1, 'pc', 'carton', 12.0);

// Create a conversion: 1 kg = 1000 grams
const conversion2 = uomService.createConversion(2, 'g', 'kg', 1000.0);
```

### 2. Converting Quantities

```typescript
// Convert 5 cartons to pieces
const result = uomService.convertToBase(1, 5, 'carton');
console.log(result);
// Output: { baseQuantity: 60, conversionUsed: {...}, originalQuantity: 5, originalUnit: 'carton' }

// Convert 2.5 kg to grams
const result2 = uomService.convertToBase(2, 2.5, 'kg');
console.log(result2);
// Output: { baseQuantity: 2500, conversionUsed: {...}, originalQuantity: 2.5, originalUnit: 'kg' }
```

### 3. GRN Processing with UOM

```typescript
// GRN line with alternative unit
const grnLine = {
  product_id: 1,
  quantity: 120,              // Will be calculated from received_quantity
  unit_cost: 2.50,
  total_cost: 300.00,
  received_unit: 'carton',    // Alternative unit
  received_quantity: 10       // 10 cartons
};

// The system automatically:
// 1. Converts 10 cartons to 120 pieces (10 * 12)
// 2. Stores both original and converted quantities
// 3. Uses base unit (pieces) for inventory tracking
```

## Common UOM Conversions

### Piece-based Products
- **Carton**: 1 carton = 12 pieces
- **Box**: 1 box = 24 pieces
- **Dozen**: 1 dozen = 12 pieces
- **Gross**: 1 gross = 144 pieces

### Weight-based Products
- **Kilogram to Gram**: 1 kg = 1000 g
- **Kilogram to Pound**: 1 kg = 2.20462 lb
- **Gram to Kilogram**: 1 g = 0.001 kg
- **Gram to Ounce**: 1 g = 0.035274 oz

### Volume-based Products
- **Liter to Milliliter**: 1 L = 1000 ml
- **Liter to Gallon**: 1 L = 0.264172 gal

### Length-based Products
- **Meter to Centimeter**: 1 m = 100 cm
- **Meter to Foot**: 1 m = 3.28084 ft
- **Meter to Yard**: 1 m = 1.09361 yd

## Validation Rules

1. **Product Exists**: Product must exist in the system
2. **Base Unit Match**: Base unit must match product's unit
3. **Different Units**: Base unit and alternative unit must be different
4. **Positive Multiplier**: Multiplier must be greater than 0
5. **Unique Conversion**: No duplicate conversions for same product and units

## Error Handling

### Common Errors

```json
{
  "success": false,
  "error": "Invalid conversion data",
  "details": [
    "Base unit must match product unit (pc)",
    "Multiplier must be greater than 0"
  ]
}
```

### Validation Errors

- **Product not found**: Product ID doesn't exist
- **Base unit mismatch**: Base unit doesn't match product unit
- **Duplicate conversion**: Conversion already exists
- **Invalid multiplier**: Multiplier is not positive

## Frontend Integration

### GRN Form Enhancement

```typescript
// GRN line form with UOM support
const GRNLineForm = ({ productId, onUOMChange }) => {
  const [conversions, setConversions] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('pc');
  const [receivedQuantity, setReceivedQuantity] = useState(0);
  
  // Load UOM conversions for product
  useEffect(() => {
    fetchConversions(productId).then(setConversions);
  }, [productId]);
  
  // Calculate base quantity when unit or quantity changes
  useEffect(() => {
    const result = uomService.convertToBase(productId, receivedQuantity, selectedUnit);
    onUOMChange({
      quantity: result.baseQuantity,
      receivedUnit: selectedUnit,
      receivedQuantity: receivedQuantity,
      conversionMultiplier: result.conversionUsed?.multiplier || 1.0
    });
  }, [selectedUnit, receivedQuantity, productId]);
  
  return (
    <div>
      <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)}>
        <option value="pc">Pieces (pc)</option>
        {conversions.map(conv => (
          <option key={conv.altUnit} value={conv.altUnit}>
            {conv.altUnit} (1 {conv.altUnit} = {conv.multiplier} {conv.baseUnit})
          </option>
        ))}
      </select>
      
      <input
        type="number"
        value={receivedQuantity}
        onChange={(e) => setReceivedQuantity(Number(e.target.value))}
        placeholder="Quantity"
      />
      
      {selectedUnit !== 'pc' && (
        <div className="conversion-info">
          {receivedQuantity} {selectedUnit} = {baseQuantity} pieces
        </div>
      )}
    </div>
  );
};
```

### Sales UI Enhancement

```typescript
// Show available conversions in product display
const ProductDisplay = ({ product }) => {
  const [conversions, setConversions] = useState([]);
  
  useEffect(() => {
    if (product.id) {
      fetchConversions(product.id).then(setConversions);
    }
  }, [product.id]);
  
  return (
    <div className="product-info">
      <h3>{product.name}</h3>
      <p>Base Unit: {product.unit}</p>
      
      {conversions.length > 0 && (
        <div className="uom-info">
          <p>Available in:</p>
          <ul>
            {conversions.map(conv => (
              <li key={conv.altUnit}>
                1 {conv.altUnit} = {conv.multiplier} {conv.baseUnit}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
```

## Testing

### Unit Tests

```typescript
describe('UOM Service', () => {
  test('should convert cartons to pieces', () => {
    const result = uomService.convertToBase(1, 5, 'carton');
    expect(result.baseQuantity).toBe(60);
    expect(result.originalQuantity).toBe(5);
    expect(result.originalUnit).toBe('carton');
  });
  
  test('should handle unknown units gracefully', () => {
    const result = uomService.convertToBase(1, 10, 'unknown');
    expect(result.baseQuantity).toBe(10);
    expect(result.conversionUsed).toBeNull();
  });
  
  test('should validate conversion data', () => {
    const validation = uomService.validateConversion(1, 'pc', 'carton', 12.0);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});
```

### Integration Tests

```typescript
describe('GRN with UOM', () => {
  test('should create GRN with alternative units', async () => {
    const grnData = {
      supplier_id: 1,
      invoice_number: 'TEST-001',
      grn_date: '2024-01-01',
      lines: [{
        product_id: 1,
        quantity: 120,
        unit_cost: 2.50,
        total_cost: 300.00,
        received_unit: 'carton',
        received_quantity: 10
      }]
    };
    
    const response = await request(app)
      .post('/api/grn')
      .send(grnData)
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.lines[0].quantity).toBe(120);
    expect(response.body.data.lines[0].received_unit).toBe('carton');
    expect(response.body.data.lines[0].received_quantity).toBe(10);
  });
});
```

## Migration and Seeding

### Database Migration

```bash
# Run the migration
npm run migrate

# Or manually
sqlite3 database.db < server/db/migrations/035_add_uom_conversions.sql
```

### Seed UOM Conversions

```bash
# Run the seed script
npm run seed:uom

# Or manually
npx tsx scripts/seed-uom-conversions.ts
```

## Benefits

1. **Flexibility**: Receive goods in any unit (cartons, boxes, kg, etc.)
2. **Consistency**: All inventory tracking uses base units
3. **Accuracy**: Automatic conversion prevents calculation errors
4. **Traceability**: Original receiving units are preserved
5. **User-Friendly**: Intuitive unit selection in GRN forms
6. **Scalable**: Easy to add new unit conversions

## Future Enhancements

1. **Bulk UOM Management**: Import/export UOM conversions
2. **Unit Categories**: Group units by type (weight, volume, length)
3. **Conversion History**: Track changes to UOM conversions
4. **Advanced Validation**: Check for circular conversions
5. **Unit Display**: Custom display names for units
6. **Multi-level Conversions**: Support for complex conversion chains

This implementation provides a robust foundation for handling unit conversions in the POS system while maintaining data integrity and user experience.











