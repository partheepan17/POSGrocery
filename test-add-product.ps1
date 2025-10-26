# PowerShell script to test Add Product functionality
Write-Host "🧪 Testing Add Product API..." -ForegroundColor Green

$baseUrl = "http://localhost:8250"

# Test 1: Happy Path - Create Product
Write-Host "`n1️⃣ Testing happy path..." -ForegroundColor Yellow
$happyPayload = @{
    name_en = "Test Product"
    sku = "TEST001"
    barcode = "1234567890"
    category_id = 1
    preferred_supplier_id = 1
    cost = 10.50
    price_retail = 15.00
    price_wholesale = 12.00
    price_credit = 13.00
    price_other = 14.00
    unit = "pc"
    is_scale_item = $false
    reorder_level = 5
    tax_code = "VAT"
    is_active = $true
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products" -Method POST -Body $happyPayload -ContentType "application/json"
    Write-Host "✅ Happy path test passed: $($response.StatusCode)" -ForegroundColor Green
    $responseData = $response.Content | ConvertFrom-Json
    Write-Host "   Product ID: $($responseData.product.id)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Happy path test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Duplicate SKU - Expect 409
Write-Host "`n2️⃣ Testing duplicate SKU..." -ForegroundColor Yellow
$duplicatePayload = @{
    name_en = "Duplicate Product"
    sku = "TEST001"
    price_retail = 20.00
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products" -Method POST -Body $duplicatePayload -ContentType "application/json"
    Write-Host "❌ Duplicate test failed - should have returned 409" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "✅ Duplicate SKU test passed: 409 Conflict" -ForegroundColor Green
    } else {
        Write-Host "❌ Duplicate test failed with wrong status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# Test 3: Missing Required Fields - Expect 400
Write-Host "`n3️⃣ Testing missing required fields..." -ForegroundColor Yellow
$missingPayload = @{
    price_retail = 15.00
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products" -Method POST -Body $missingPayload -ContentType "application/json"
    Write-Host "❌ Missing fields test failed - should have returned 400" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ Missing fields test passed: 400 Bad Request" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing fields test failed with wrong status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# Test 4: Health Check
Write-Host "`n4️⃣ Testing health check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method GET
    Write-Host "✅ Health check passed: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Legacy API Names - Test backward compatibility
Write-Host "`n5️⃣ Testing legacy API names..." -ForegroundColor Yellow
$legacyPayload = @{
    name = "Legacy Product"
    sku = "LEGACY001"
    cost_price = 8.50
    selling_price = 12.00
    unit = "kg"
    is_active = $true
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products" -Method POST -Body $legacyPayload -ContentType "application/json"
    Write-Host "✅ Legacy API test passed: $($response.StatusCode)" -ForegroundColor Green
    $responseData = $response.Content | ConvertFrom-Json
    Write-Host "   Product ID: $($responseData.product.id)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Legacy API test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Add Product API testing completed!" -ForegroundColor Green














