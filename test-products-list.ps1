# Test Products List API functionality
# This script tests the GET /api/products endpoint with various filters and pagination

Write-Host "🧪 Testing Products List API..." -ForegroundColor Green

$baseUrl = "http://localhost:8250"

# Test 1: Basic list (no filters)
Write-Host "`n1️⃣ Testing basic products list..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products" -Method GET
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Products count: $($data.products.Count)" -ForegroundColor Green
    Write-Host "✅ Total: $($data.pagination.total)" -ForegroundColor Green
    Write-Host "✅ Page: $($data.pagination.page) of $($data.pagination.totalPages)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Pagination
Write-Host "`n2️⃣ Testing pagination..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products?page=1&pageSize=5" -Method GET
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Products count: $($data.products.Count)" -ForegroundColor Green
    Write-Host "✅ Page size: $($data.pagination.pageSize)" -ForegroundColor Green
    Write-Host "✅ Has next: $($data.pagination.hasNext)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Search filter
Write-Host "`n3️⃣ Testing search filter..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products?search=test" -Method GET
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Search results: $($data.products.Count)" -ForegroundColor Green
    Write-Host "✅ Search term: $($data.filters.search)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Status filter (active only)
Write-Host "`n4️⃣ Testing status filter (active only)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products?status=active" -Method GET
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Active products: $($data.products.Count)" -ForegroundColor Green
    Write-Host "✅ Status filter: $($data.filters.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Category filter
Write-Host "`n5️⃣ Testing category filter..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products?category_id=1" -Method GET
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Category 1 products: $($data.products.Count)" -ForegroundColor Green
    Write-Host "✅ Category filter: $($data.filters.categoryId)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Scale items filter
Write-Host "`n6️⃣ Testing scale items filter..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products?scale_items_only=true" -Method GET
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Scale items: $($data.products.Count)" -ForegroundColor Green
    Write-Host "✅ Scale items filter: $($data.filters.scaleItemsOnly)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Sorting
Write-Host "`n7️⃣ Testing sorting..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products?sortBy=price_retail&sortOrder=desc" -Method GET
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Sorted products: $($data.products.Count)" -ForegroundColor Green
    Write-Host "✅ Sort by: $($data.filters.sortBy)" -ForegroundColor Green
    Write-Host "✅ Sort order: $($data.filters.sortOrder)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Combined filters
Write-Host "`n8️⃣ Testing combined filters..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products?search=test&status=active&page=1&pageSize=10&sortBy=name_en&sortOrder=asc" -Method GET
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Combined filter results: $($data.products.Count)" -ForegroundColor Green
    Write-Host "✅ Search: $($data.filters.search)" -ForegroundColor Green
    Write-Host "✅ Status: $($data.filters.status)" -ForegroundColor Green
    Write-Host "✅ Sort: $($data.filters.sortBy) $($data.filters.sortOrder)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 9: Invalid sort field (should return 400)
Write-Host "`n9️⃣ Testing invalid sort field (should return 400)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products?sortBy=invalid_field" -Method GET -ErrorAction Stop
    Write-Host "❌ Expected 400 but got: $($response.StatusCode)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ Correctly returned 400 for invalid sort field" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 10: Invalid sort order (should return 400)
Write-Host "`n🔟 Testing invalid sort order (should return 400)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products?sortOrder=invalid" -Method GET -ErrorAction Stop
    Write-Host "❌ Expected 400 but got: $($response.StatusCode)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ Correctly returned 400 for invalid sort order" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Products List API testing completed!" -ForegroundColor Green














