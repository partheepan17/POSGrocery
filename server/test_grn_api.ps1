# GRN API Test Suite
# This script tests the GRN API endpoints with various scenarios

$baseUrl = "http://localhost:8250"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "=== GRN API Test Suite ===" -ForegroundColor Green

# Test 1: Happy GRN Creation
Write-Host "`n1. Testing Happy GRN Creation..." -ForegroundColor Yellow
$grnPayload = @{
    supplier_id = 1
    lines = @(
        @{
            product_id = 1
            quantity_received = 5
            unit_cost = 10.50
            batch_number = "BATCH001"
            notes = "Test batch"
        }
    )
    freight_cost = 5.00
    duty_cost = 2.50
    misc_cost = 1.00
    notes = "Test GRN creation"
    idempotency_key = "test-grn-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
} | ConvertTo-Json -Depth 3

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/purchasing/grn" -Method POST -Body $grnPayload -Headers $headers
    Write-Host "✓ GRN Created Successfully" -ForegroundColor Green
    Write-Host "  GRN ID: $($response.grn.id)" -ForegroundColor Cyan
    Write-Host "  GRN Number: $($response.grn.grn_number)" -ForegroundColor Cyan
    Write-Host "  Status: $($response.grn.status)" -ForegroundColor Cyan
    $grnId = $response.grn.id
} catch {
    Write-Host "✗ GRN Creation Failed: $($_.Exception.Message)" -ForegroundColor Red
    $grnId = $null
}

# Test 2: Invalid Product ID
Write-Host "`n2. Testing Invalid Product ID..." -ForegroundColor Yellow
$invalidProductPayload = @{
    supplier_id = 1
    lines = @(
        @{
            product_id = 99999
            quantity_received = 1
            unit_cost = 10.00
        }
    )
} | ConvertTo-Json -Depth 3

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/purchasing/grn" -Method POST -Body $invalidProductPayload -Headers $headers
    Write-Host "✗ Should have failed but succeeded" -ForegroundColor Red
} catch {
    Write-Host "✓ Correctly rejected invalid product ID" -ForegroundColor Green
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Cyan
}

# Test 3: Missing Required Fields
Write-Host "`n3. Testing Missing Required Fields..." -ForegroundColor Yellow
$missingFieldsPayload = @{
    supplier_id = 1
    lines = @()
} | ConvertTo-Json -Depth 3

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/purchasing/grn" -Method POST -Body $missingFieldsPayload -Headers $headers
    Write-Host "✗ Should have failed but succeeded" -ForegroundColor Red
} catch {
    Write-Host "✓ Correctly rejected missing lines" -ForegroundColor Green
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Cyan
}

# Test 4: Duplicate Idempotency Key
Write-Host "`n4. Testing Duplicate Idempotency Key..." -ForegroundColor Yellow
$duplicateKey = "duplicate-test-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$duplicatePayload = @{
    supplier_id = 1
    lines = @(
        @{
            product_id = 1
            quantity_received = 2
            unit_cost = 15.00
        }
    )
    idempotency_key = $duplicateKey
} | ConvertTo-Json -Depth 3

try {
    # First request
    $response1 = Invoke-RestMethod -Uri "$baseUrl/api/purchasing/grn" -Method POST -Body $duplicatePayload -Headers $headers
    Write-Host "✓ First request succeeded" -ForegroundColor Green
    
    # Second request with same key
    $response2 = Invoke-RestMethod -Uri "$baseUrl/api/purchasing/grn" -Method POST -Body $duplicatePayload -Headers $headers
    if ($response2.grn.duplicate) {
        Write-Host "✓ Duplicate correctly detected and prevented" -ForegroundColor Green
    } else {
        Write-Host "✗ Duplicate not detected" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Duplicate test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Get GRN Details (if we have a valid GRN ID)
if ($grnId) {
    Write-Host "`n5. Testing Get GRN Details..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/purchasing/grn/$grnId" -Method GET
        Write-Host "✓ GRN Details Retrieved" -ForegroundColor Green
        Write-Host "  GRN Number: $($response.grn.grn_number)" -ForegroundColor Cyan
        Write-Host "  Line Count: $($response.grn.lines.Count)" -ForegroundColor Cyan
    } catch {
        Write-Host "✗ Failed to get GRN details: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 6: List GRNs
Write-Host "`n6. Testing List GRNs..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/purchasing/grn" -Method GET
    Write-Host "✓ GRN List Retrieved" -ForegroundColor Green
    Write-Host "  Total GRNs: $($response.grns.Count)" -ForegroundColor Cyan
    Write-Host "  Pagination: Page $($response.pagination.page) of $($response.pagination.totalPages)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Failed to list GRNs: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== GRN API Test Suite Complete ===" -ForegroundColor Green
