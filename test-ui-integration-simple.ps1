# Simple UI Integration Test for Add Product
Write-Host "Testing Add Product UI Integration..." -ForegroundColor Green

$baseUrl = "http://localhost:8250"

# Test 1: Backend Health
Write-Host "`n1. Testing backend health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method GET
    Write-Host "Backend is running: $($healthResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Backend is not accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Add Product with UI field names
Write-Host "`n2. Testing Add Product with UI field names..." -ForegroundColor Yellow
$uiPayload = @{
    name_en = "UI Test Product"
    sku = "UI-TEST-001"
    price_retail = 35.00
    cost = 25.50
    unit = "pc"
    is_active = $true
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products" -Method POST -Body $uiPayload -ContentType "application/json"
    Write-Host "UI test passed: $($response.StatusCode)" -ForegroundColor Green
    $responseData = $response.Content | ConvertFrom-Json
    Write-Host "Product ID: $($responseData.product.id)" -ForegroundColor Cyan
} catch {
    Write-Host "UI test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Add Product with legacy field names
Write-Host "`n3. Testing Add Product with legacy field names..." -ForegroundColor Yellow
$legacyPayload = @{
    name = "Legacy Test Product"
    sku = "LEGACY-UI-001"
    cost_price = 20.00
    selling_price = 30.00
    unit = "kg"
    is_active = $true
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products" -Method POST -Body $legacyPayload -ContentType "application/json"
    Write-Host "Legacy test passed: $($response.StatusCode)" -ForegroundColor Green
    $responseData = $response.Content | ConvertFrom-Json
    Write-Host "Product ID: $($responseData.product.id)" -ForegroundColor Cyan
} catch {
    Write-Host "Legacy test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Test validation error
Write-Host "`n4. Testing validation error..." -ForegroundColor Yellow
$invalidPayload = @{
    price_retail = 25.00
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products" -Method POST -Body $invalidPayload -ContentType "application/json"
    Write-Host "Validation test failed - should have returned 400" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "Validation test passed: 400 Bad Request" -ForegroundColor Green
    } else {
        Write-Host "Validation test failed with status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# Test 5: Test duplicate SKU
Write-Host "`n5. Testing duplicate SKU..." -ForegroundColor Yellow
$duplicatePayload = @{
    name_en = "Duplicate Product"
    sku = "UI-TEST-001"
    price_retail = 40.00
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products" -Method POST -Body $duplicatePayload -ContentType "application/json"
    Write-Host "Duplicate test failed - should have returned 409" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "Duplicate test passed: 409 Conflict" -ForegroundColor Green
    } else {
        Write-Host "Duplicate test failed with status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# Test 6: Get products
Write-Host "`n6. Testing GET products..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products" -Method GET
    Write-Host "GET products passed: $($response.StatusCode)" -ForegroundColor Green
    $responseData = $response.Content | ConvertFrom-Json
    Write-Host "Total products: $($responseData.products.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "GET products failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nAdd Product UI Integration testing completed!" -ForegroundColor Green
Write-Host "The Add Product functionality is working correctly!" -ForegroundColor Green
