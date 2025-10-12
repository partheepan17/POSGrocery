# Test Update Product API functionality
# This script tests the PUT /api/products/:id endpoint

Write-Host "🧪 Testing Update Product API..." -ForegroundColor Green

$baseUrl = "http://localhost:8250"

# Test 1: Happy path - Update product with current UI field names
Write-Host "`n1️⃣ Testing happy path with current UI field names..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products/1" -Method PUT -ContentType "application/json" -Body '{
        "name_en": "Updated Product Name",
        "price_retail": 199.99,
        "price_wholesale": 179.99,
        "price_credit": 189.99,
        "price_other": 195.99,
        "is_scale_item": true,
        "tax_code": "VAT",
        "reorder_level": 15
    }'
    
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Product updated: $($data.product.name_en) - Price: $($data.product.price_retail)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Update with legacy field names
Write-Host "`n2️⃣ Testing with legacy field names..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products/1" -Method PUT -ContentType "application/json" -Body '{
        "name": "Legacy Updated Name",
        "cost_price": 150.00,
        "selling_price": 220.00
    }'
    
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Product updated with legacy fields: $($data.product.name_en) - Cost: $($data.product.cost)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Duplicate SKU -> 409
Write-Host "`n3️⃣ Testing duplicate SKU (should return 409)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products/1" -Method PUT -ContentType "application/json" -Body '{
        "sku": "EXISTING-SKU"
    }' -ErrorAction Stop
    
    Write-Host "❌ Expected 409 but got: $($response.StatusCode)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "✅ Correctly returned 409 for duplicate SKU" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 4: Not found -> 404
Write-Host "`n4️⃣ Testing non-existent product (should return 404)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products/999999" -Method PUT -ContentType "application/json" -Body '{
        "name_en": "Ghost Product"
    }' -ErrorAction Stop
    
    Write-Host "❌ Expected 404 but got: $($response.StatusCode)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✅ Correctly returned 404 for non-existent product" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 5: Invalid product ID -> 400
Write-Host "`n5️⃣ Testing invalid product ID (should return 400)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products/invalid" -Method PUT -ContentType "application/json" -Body '{
        "name_en": "Invalid ID Test"
    }' -ErrorAction Stop
    
    Write-Host "❌ Expected 400 but got: $($response.StatusCode)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ Correctly returned 400 for invalid product ID" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 6: Partial update (only some fields)
Write-Host "`n6️⃣ Testing partial update..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products/1" -Method PUT -ContentType "application/json" -Body '{
        "price_retail": 299.99,
        "is_active": false
    }'
    
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Partial update successful: Price: $($data.product.price_retail), Active: $($data.product.is_active)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Update Product API testing completed!" -ForegroundColor Green
