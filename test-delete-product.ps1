# Test Delete Product API functionality
# This script tests the DELETE /api/products/:id endpoint

Write-Host "🧪 Testing Delete Product API..." -ForegroundColor Green

$baseUrl = "http://localhost:8250"

# Test 1: Delete non-existent product -> 404
Write-Host "`n1️⃣ Testing delete non-existent product (should return 404)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products/999999" -Method DELETE -ErrorAction Stop
    Write-Host "❌ Expected 404 but got: $($response.StatusCode)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✅ Correctly returned 404 for non-existent product" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 2: Delete with invalid product ID -> 400
Write-Host "`n2️⃣ Testing delete with invalid product ID (should return 400)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products/invalid" -Method DELETE -ErrorAction Stop
    Write-Host "❌ Expected 400 but got: $($response.StatusCode)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ Correctly returned 400 for invalid product ID" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 3: Create a test product first
Write-Host "`n3️⃣ Creating test product for deletion tests..." -ForegroundColor Yellow
try {
    $createResponse = Invoke-WebRequest -Uri "$baseUrl/api/products" -Method POST -ContentType "application/json" -Body '{
        "name_en": "Test Delete Product",
        "sku": "TEST-DELETE-001",
        "barcode": "1234567890124",
        "price_retail": 100.00,
        "category_id": 1,
        "unit": "pc",
        "is_active": true
    }'
    
    $createData = $createResponse.Content | ConvertFrom-Json
    $testProductId = $createData.product.id
    Write-Host "✅ Test product created with ID: $testProductId" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create test product: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 4: Delete product with no references (hard delete)
Write-Host "`n4️⃣ Testing hard delete (product with no references)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products/$testProductId" -Method DELETE
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Response: $($data.message)" -ForegroundColor Green
    Write-Host "✅ Soft Delete: $($data.softDelete)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Verify product is actually deleted
Write-Host "`n5️⃣ Verifying product is deleted..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products/$testProductId" -Method GET -ErrorAction Stop
    Write-Host "❌ Product still exists after deletion" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✅ Product successfully deleted (404 on GET)" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 6: Create another test product for soft delete test
Write-Host "`n6️⃣ Creating another test product for soft delete test..." -ForegroundColor Yellow
try {
    $createResponse = Invoke-WebRequest -Uri "$baseUrl/api/products" -Method POST -ContentType "application/json" -Body '{
        "name_en": "Test Soft Delete Product",
        "sku": "TEST-SOFT-DELETE-001",
        "barcode": "1234567890125",
        "price_retail": 150.00,
        "category_id": 1,
        "unit": "pc",
        "is_active": true
    }'
    
    $createData = $createResponse.Content | ConvertFrom-Json
    $softDeleteProductId = $createData.product.id
    Write-Host "✅ Test product created with ID: $softDeleteProductId" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create test product: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 7: Create a quick sales line to reference the product
Write-Host "`n7️⃣ Creating quick sales line to reference product..." -ForegroundColor Yellow
try {
    # First ensure a quick sales session is open
    $sessionResponse = Invoke-WebRequest -Uri "$baseUrl/api/quick-sales/ensure-open" -Method POST
    $sessionData = $sessionResponse.Content | ConvertFrom-Json
    $sessionId = $sessionData.session.id
    
    # Add a line to the session
    $lineResponse = Invoke-WebRequest -Uri "$baseUrl/api/quick-sales/$sessionId/lines" -Method POST -ContentType "application/json" -Body "{
        `"product_id`": $softDeleteProductId,
        `"qty`": 1,
        `"unit_price`": 150.00
    }"
    
    Write-Host "✅ Quick sales line created" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not create quick sales line (this is OK for testing): $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 8: Try to delete product with references (should soft delete)
Write-Host "`n8️⃣ Testing soft delete (product with references)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products/$softDeleteProductId" -Method DELETE
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Response: $($data.message)" -ForegroundColor Green
    Write-Host "✅ Soft Delete: $($data.softDelete)" -ForegroundColor Green
    if ($data.references) {
        Write-Host "✅ References: $($data.references -join ', ')" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 9: Verify product is soft deleted (still exists but inactive)
Write-Host "`n9️⃣ Verifying product is soft deleted..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products/$softDeleteProductId" -Method GET
    $data = $response.Content | ConvertFrom-Json
    if ($data.product.is_active -eq $false) {
        Write-Host "✅ Product is soft deleted (is_active = false)" -ForegroundColor Green
    } else {
        Write-Host "❌ Product is still active after soft delete" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Delete Product API testing completed!" -ForegroundColor Green
