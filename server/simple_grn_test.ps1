# Simple GRN API Test
$baseUrl = "http://localhost:8250"

Write-Host "Testing GRN API..." -ForegroundColor Green

# Test 1: Create GRN
$grnPayload = @{
    supplier_id = 1
    lines = @(
        @{
            product_id = 1
            quantity_received = 5
            unit_cost = 10.50
        }
    )
    notes = "Test GRN"
} | ConvertTo-Json -Depth 3

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/purchasing/grn" -Method POST -Body $grnPayload -ContentType "application/json"
    Write-Host "GRN Created: $($response.grn.grn_number)" -ForegroundColor Green
} catch {
    Write-Host "GRN Creation Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Test Complete" -ForegroundColor Green